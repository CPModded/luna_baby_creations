import {NextResponse} from 'next/server';import {stripe} from '@/lib/stripe';import {db} from '@/lib/db';import {query} from '@/lib/postgres';import Stripe from 'stripe';import {makeInvoice} from '@/lib/invoice';import {Resend} from 'resend'

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const sig = req.headers.get('stripe-signature')

  // 1) Refuser si la configuration ou l'en-tête manquent (réponse 400 explicite).
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is missing.')
    return NextResponse.json({ error: 'Webhook non configuré.' }, { status: 400 })
  }
  if (!sig) {
    return NextResponse.json({ error: 'En-tête stripe-signature manquant.' }, { status: 400 })
  }

  const raw = await req.text()

  // 2) Vérification de la signature Stripe.
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret)
  } catch (e: any) {
    console.error('[stripe-webhook] Signature invalide:', e?.message || e)
    return NextResponse.json({ error: 'Signature webhook invalide.' }, { status: 400 })
  }

  // 3) Idempotence : table processed_events avec INSERT ... ON CONFLICT DO NOTHING.
  try {
    const inserted = await db.$queryRaw<{ id: string }[]>(
      `INSERT INTO processed_events (id, "receivedAt") VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING RETURNING id`,
      [event.id]
    )
    if (!inserted || inserted.length === 0) {
      // Cet événement a déjà été traité : on acquitte sans rejouer la logique métier.
      return NextResponse.json({ received: true, duplicate: true })
    }
  } catch (e: any) {
    console.error('[stripe-webhook] processed_events insert failed:', e?.message || e)
    return NextResponse.json({ error: 'Idempotence indisponible.' }, { status: 500 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session
      const orderId = s.metadata?.orderId
      if (orderId) {
        const order = await db.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            paymentIntentId: typeof s.payment_intent === 'string' ? s.payment_intent : undefined,
          },
          include: { items: true },
        })
        await db.$transaction(
          order.items.map((i: { productId: string; quantity: number }) =>
            db.product.update({
              where: { id: i.productId },
              data: { stock: { decrement: i.quantity } },
            })
          )
        )
        if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
          const resend = new Resend(process.env.RESEND_API_KEY)
          const pdf = await makeInvoice(order)
          await resend.emails.send({
            from: process.env.MAIL_FROM,
            to: order.email,
            subject: `Luna Baby · Confirmation ${order.invoiceNumber}`,
            html: `<p>Merci ${order.customerName || ''} ♡</p><p>Votre commande <b>${order.invoiceNumber}</b> a bien été payée.</p><p>Votre facture est jointe à cet email.</p>`,
            attachments: [
              {
                filename: `facture-${order.invoiceNumber}.pdf`,
                content: Buffer.from(pdf).toString('base64'),
              },
            ],
          })
        }
      }
    }
    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('[stripe-webhook] handler error:', e?.message || e)
    return NextResponse.json({ error: 'Traitement du webhook échoué.' }, { status: 500 })
  }
}
