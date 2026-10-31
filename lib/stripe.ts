import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY_MISSING: STRIPE_SECRET_KEY must be defined for Stripe to be initialised.')
}

export const stripe = new Stripe(secretKey)
