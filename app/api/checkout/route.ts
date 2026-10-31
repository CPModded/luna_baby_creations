import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { products as catalog } from '@/lib/data'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

const schema = z.object({
  cart: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    price: z.number().optional(), // Client price is ignored; the database price is authoritative.
    quantity: z.number().int().positive(),
    image: z.string().optional(),
    customization: z.any().optional(),
  })).min(1),
  customer: z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().email(),
    address: z.string().trim().min(3),
    city: z.string().trim().min(2),
    postal: z.string().trim().min(3),
    country: z.string().trim().min(2),
  }),
  promo: z.string().optional(),
})

export async function POST(req: Request) {
  let orderId: string | undefined
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Le paiement Stripe est indisponible.' }, { status: 503 })
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) return NextResponse.json({ error: 'NEXT_PUBLIC_SITE_URL_MISSING' }, { status: 503 })

    const body = schema.parse(await req.json())
    const user = await getCurrentUser()
    const items: Array<{ product: any; quantity: number; customization?: unknown }> = []

    for (const line of body.cart) {
      const base = catalog.find(p => p.id === line.id)
        || catalog.find(p => p.slug === line.id)
        || catalog.find(p => p.slug === (line.customization as any)?.model)
      if (!base) throw new Error('Produit introuvable dans le panier.')
      const product = await db.product.findUnique({ where: { slug: base.slug } })
      if (!product || !product.active) throw new Error(`Produit indisponible : ${base.name}`)
      items.push({ product, quantity: line.quantity, customization: line.customization })
    }

    // Aggregate repeated cart lines before validating available stock.
    const quantities = new Map<string, number>()
    for (const line of items) quantities.set(line.product.id, (quantities.get(line.product.id) || 0) + line.quantity)
    for (const [productId, quantity] of quantities) {
      const product = items.find(line => line.product.id === productId)!.product
      if (quantity > product.stock) throw new Error(`Stock insuffisant pour ${product.name}`)
    }

    const subtotal = items.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
    const promo = (body.promo || '').trim().toUpperCase()
    let discount = promo === 'LUNA10' ? Math.round(subtotal * 0.10) : promo === 'BIENVENUE5' ? 500 : 0
    discount = Math.min(discount, subtotal)
    const shipping = Math.max(0, subtotal - discount) >= 5000 ? 0 : 490
    const total = subtotal - discount + shipping
    const invoiceNumber = `LB-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`
    const accessToken = randomBytes(32).toString('hex')

    // Persist the order as PENDING before creating a Stripe session; only a verified webhook may mark it PAID.
    const order = await db.order.create({ data: {
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
      items: { create: items.map(line => ({
        productId: line.product.id,
        name: line.product.name,
        unitPrice: line.product.price,
        quantity: line.quantity,
        customization: line.customization ?? null,
      })) },
    } })
    orderId = order.id

    const lineItems = items.map(line => ({
      price_data: {
        currency: 'eur' as const,
        product_data: { name: line.product.name },
        unit_amount: line.product.price,
      },
      quantity: line.quantity,
    }))
    const discounts = discount > 0 ? [{
      coupon: (await stripe.coupons.create({
        amount_off: discount,
        currency: 'eur',
        duration: 'once',
        name: promo,
      })).id,
    }] : undefined

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: body.customer.email,
      line_items: lineItems,
      discounts,
      shipping_address_collection: { allowed_countries: ['FR', 'BE', 'LU', 'CH'] },
      ...(shipping > 0 ? { shipping_options: [{
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: shipping, currency: 'eur' },
          display_name: 'Livraison',
        },
      }] } : {}),
      metadata: { orderId: order.id, promo },
      success_url: `${siteUrl}/commande?order=${encodeURIComponent(order.id)}&token=${encodeURIComponent(accessToken)}&success=1`,
      cancel_url: `${siteUrl}/checkout?cancel=1`,
    })
    if (!session.url) throw new Error('Stripe n’a pas retourné d’URL de paiement.')
    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } })
    return NextResponse.json({ url: session.url, orderId: order.id })
  } catch (error: any) {
    console.error('Checkout creation failed:', error)
    // An order whose Stripe session could not be created must never be treated as paid.
    if (orderId) {
      try { await db.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } }) }
      catch (cleanupError) { console.error('Could not cancel failed checkout order:', cleanupError) }
    }
    const status = error instanceof z.ZodError ? 400 : 400
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status })
  }
}
