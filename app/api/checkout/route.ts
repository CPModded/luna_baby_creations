import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import Stripe from 'stripe'
import { z } from 'zod'
import { db } from '@/lib/db'
import { products as catalog } from '@/lib/data'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

const schema = z.object({
  cart: z.array(z.object({
    id: z.string().trim().min(1).max(200),
    quantity: z.number().int().positive().max(100),
    customization: z.unknown().optional(),
  }).strict()).min(1).max(50),
  customer: z.object({
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(254),
    address: z.string().trim().min(3).max(300),
    city: z.string().trim().min(2).max(120),
    postal: z.string().trim().min(3).max(32),
    country: z.string().trim().min(2).max(80),
  }).strict(),
  promo: z.string().trim().max(64).optional(),
}).strict()

type CheckoutLine = { product: any; quantity: number; customization: unknown }

export async function POST(request: Request) {
  let orderId: string | undefined
  try {
    let payload: unknown
    try {
      payload = await request.json()
    } catch {
      return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 })
    }
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Commande invalide.' }, { status: 400 })
    }
    if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_SITE_URL) {
      return NextResponse.json({ error: 'Le paiement n’est pas configuré.' }, { status: 503 })
    }

    const body = parsed.data
    const user = await getCurrentUser()
    const lines: CheckoutLine[] = []
    for (const line of body.cart) {
      const modelSlug = line.customization && typeof line.customization === 'object'
        ? (line.customization as { model?: unknown }).model
        : undefined
      const base = catalog.find(item => item.id === line.id)
        || catalog.find(item => item.slug === line.id)
        || (typeof modelSlug === 'string' ? catalog.find(item => item.slug === modelSlug) : undefined)
      if (!base) return NextResponse.json({ error: 'Produit introuvable dans le catalogue.' }, { status: 400 })

      const product = await db.product.findUnique({ where: { slug: base.slug } })
      if (!product || !product.active) {
        return NextResponse.json({ error: `Produit indisponible : ${base.name}` }, { status: 400 })
      }
      lines.push({ product, quantity: line.quantity, customization: line.customization ?? null })
    }

    const totalQuantities = new Map<string, number>()
    for (const line of lines) {
      totalQuantities.set(line.product.id, (totalQuantities.get(line.product.id) || 0) + line.quantity)
    }
    for (const line of lines) {
      if ((totalQuantities.get(line.product.id) || 0) > line.product.stock) {
        return NextResponse.json({ error: `Stock insuffisant pour ${line.product.name}.` }, { status: 409 })
      }
    }

    const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
    let promo: any = null
    let discount = 0
    if (body.promo) {
      promo = await db.promoCode.findUnique({ where: { code: body.promo.toUpperCase() } })
      if (!promo || !promo.active || (promo.max_uses != null && promo.used_count >= promo.max_uses)
        || (promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now())) {
        return NextResponse.json({ error: 'Code promotionnel invalide ou expiré.' }, { status: 400 })
      }
      discount = promo.type === 'PERCENT'
        ? Math.floor(subtotal * promo.value / 100)
        : Math.min(subtotal, promo.value)
    }

    const shipping = subtotal - discount >= 5_000 ? 0 : 490
    const total = subtotal - discount + shipping
    const accessToken = randomBytes(32).toString('hex')
    const invoiceNumber = `LB-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`
    const order = await db.order.create({
      data: {
        userId: user?.id,
        email: body.customer.email,
        customerName: body.customer.name,
        subtotal,
        shipping,
        tax: 0,
        total,
        invoiceNumber,
        shippingAddress: body.customer,
        accessToken,
        status: 'PENDING',
        items: { create: lines.map(line => ({
          productId: line.product.id,
          name: line.product.name,
          unitPrice: line.product.price,
          quantity: line.quantity,
          customization: line.customization,
        })) },
      },
    })
    orderId = order.id

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
    if (discount > 0) {
      if (promo?.stripe_coupon_id) {
        discounts = [{ coupon: promo.stripe_coupon_id }]
      } else {
        const couponParams: Stripe.CouponCreateParams = promo.type === 'PERCENT'
          ? { duration: 'once', name: promo.code, percent_off: promo.value }
          : { duration: 'once', name: promo.code, amount_off: discount, currency: 'eur' }
        const coupon = await stripe.coupons.create(couponParams)
        discounts = [{ coupon: coupon.id }]
      }
    }

    const site = new URL(process.env.NEXT_PUBLIC_SITE_URL).origin.replace(/\/$/, '')
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: body.customer.email,
      line_items: lines.map(line => ({
        price_data: {
          currency: 'eur',
          product_data: { name: line.product.name },
          unit_amount: line.product.price,
        },
        quantity: line.quantity,
      })),
      ...(discounts ? { discounts } : {}),
      ...(shipping ? { shipping_options: [{ shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: shipping, currency: 'eur' },
        display_name: 'Livraison',
      } }] } : {}),
      shipping_address_collection: { allowed_countries: ['FR', 'BE', 'LU', 'CH'] },
      metadata: { orderId: order.id, promoCodeId: promo?.id || '' },
      success_url: `${site}/commande?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(accessToken)}&success=1`,
      cancel_url: `${site}/checkout?cancel=1`,
    })
    if (!session.url) throw new Error('Stripe n’a pas retourné d’adresse de paiement.')

    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } })
    return NextResponse.json({ url: session.url, orderId: order.id }, { status: 201 })
  } catch (error) {
    console.error('Création du checkout impossible.', error)
    if (orderId) {
      try {
        await db.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
      } catch (cleanupError) {
        console.error('Annulation de la commande échouée.', cleanupError)
      }
    }
    return NextResponse.json({ error: 'Impossible de créer la session de paiement.' }, { status: 502 })
  }
}
