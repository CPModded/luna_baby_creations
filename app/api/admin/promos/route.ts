import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

const createSchema = z.object({
  code: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Le code promo ne peut contenir que des lettres, chiffres, tirets et tirets bas.').transform(value => value.toUpperCase()),
  type: z.enum(['PERCENT', 'AMOUNT']),
  value: z.number().int().positive(),
  max_uses: z.number().int().positive().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  active: z.boolean().optional(),
}).strict().superRefine((promo, ctx) => {
  if (promo.type === 'PERCENT' && promo.value > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Le pourcentage ne peut dépasser 100 %.', path: ['value'] })
  }
  if (promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La date d’expiration doit être dans le futur.', path: ['expires_at'] })
  }
})
const patchSchema = z.object({ id: z.string().trim().min(1).max(200), active: z.boolean() }).strict()
const deleteSchema = z.object({ id: z.string().trim().min(1).max(200) }).strict()

async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin()
    return true
  } catch {
    return false
  }
}
function stripeClient(): Stripe | null {
  return process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
}
function unauthorized() {
  return NextResponse.json({ error: 'Accès réservé à l’administration.' }, { status: 403 })
}

export async function GET() {
  if (!await isAdmin()) return unauthorized()
  try {
    const promos = await db.promoCode.findMany({ orderBy: { created_at: 'desc' } })
    return NextResponse.json({ promos })
  } catch (error) {
    console.error('Lecture des promotions impossible.', error)
    return NextResponse.json({ error: 'Impossible de charger les promotions.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!await isAdmin()) return unauthorized()
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 })
  }
  const parsed = createSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Code promo invalide.' }, { status: 400 })
  }
  const input = parsed.data

  // Éviter de créer des objets Stripe si le code existe déjà localement.
  try {
    const existing = await db.promoCode.findUnique({ where: { code: input.code } })
    if (existing) return NextResponse.json({ error: 'Ce code promotionnel existe déjà.' }, { status: 409 })
  } catch (error) {
    console.error('Vérification du code promo impossible.', error)
    return NextResponse.json({ error: 'Impossible de vérifier le code promotionnel.' }, { status: 500 })
  }

  let stripeCouponId: string | null = null
  let stripePromotionCodeId: string | null = null
  const stripe = stripeClient()
  if (stripe) {
    try {
      const expiresAt = input.expires_at ? Math.floor(new Date(input.expires_at).getTime() / 1000) : undefined
      const coupon = await stripe.coupons.create({
        duration: 'once',
        name: input.code,
        ...(input.type === 'PERCENT'
          ? { percent_off: input.value }
          : { amount_off: input.value, currency: 'eur' }),
        ...(input.max_uses ? { max_redemptions: input.max_uses } : {}),
        ...(expiresAt ? { redeem_by: expiresAt } : {}),
      })
      stripeCouponId = coupon.id
      const promotionCode = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon: coupon.id },
        code: input.code,
        ...(input.max_uses ? { max_redemptions: input.max_uses } : {}),
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      })
      stripePromotionCodeId = promotionCode.id
      if (input.active === false) {
        await stripe.promotionCodes.update(promotionCode.id, { active: false })
      }
    } catch (error) {
      console.error('Synchronisation Stripe du code promo échouée.', error)
      return NextResponse.json({ error: 'La création Stripe du code promotionnel a échoué.' }, { status: 502 })
    }
  }

  try {
    const promo = await db.promoCode.create({
      data: {
        code: input.code,
        type: input.type,
        value: input.value,
        max_uses: input.max_uses ?? null,
        used_count: 0,
        expires_at: input.expires_at ? new Date(input.expires_at) : null,
        active: input.active ?? true,
        stripe_coupon_id: stripeCouponId,
        stripe_promotion_code_id: stripePromotionCodeId,
      },
    })
    return NextResponse.json({ promo }, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json({ error: 'Ce code promotionnel existe déjà.' }, { status: 409 })
    }
    console.error('Création locale du code promo échouée.', error)
    return NextResponse.json({ error: 'Impossible d’enregistrer le code promotionnel.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return unauthorized()
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Identifiant ou état invalide.' }, { status: 400 })
  }

  try {
    const current = await db.promoCode.findUnique({ where: { id: parsed.data.id } })
    if (!current) return NextResponse.json({ error: 'Promotion introuvable.' }, { status: 404 })
    if (current.stripe_promotion_code_id && process.env.STRIPE_SECRET_KEY) {
      try {
        await stripeClient()!.promotionCodes.update(current.stripe_promotion_code_id, { active: parsed.data.active })
      } catch (error) {
        console.error('Synchronisation Stripe du code promo échouée.', error)
        return NextResponse.json({ error: 'La modification Stripe de la promotion a échoué.' }, { status: 502 })
      }
    }
    const promo = await db.promoCode.update({ where: { id: parsed.data.id }, data: { active: parsed.data.active } })
    return NextResponse.json({ promo })
  } catch (error) {
    console.error('Modification du code promo impossible.', error)
    return NextResponse.json({ error: 'Impossible de modifier la promotion.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!await isAdmin()) return unauthorized()
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête JSON invalide.' }, { status: 400 })
  }
  const parsed = deleteSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Identifiant invalide.' }, { status: 400 })
  }

  try {
    const current = await db.promoCode.findUnique({ where: { id: parsed.data.id } })
    if (!current) return NextResponse.json({ error: 'Promotion introuvable.' }, { status: 404 })
    if (current.stripe_promotion_code_id && process.env.STRIPE_SECRET_KEY) {
      try {
        await stripeClient()!.promotionCodes.update(current.stripe_promotion_code_id, { active: false })
      } catch (error) {
        console.error('Désactivation Stripe du code promo échouée.', error)
        return NextResponse.json({ error: 'La désactivation Stripe de la promotion a échoué.' }, { status: 502 })
      }
    }
    await db.promoCode.delete({ where: { id: parsed.data.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Suppression du code promo impossible.', error)
    return NextResponse.json({ error: 'Impossible de supprimer la promotion.' }, { status: 500 })
  }
}
