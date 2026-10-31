# `lib/db.ts` database changes

The complete uploaded Postgres helper is included as `lib/db.ts`; the transaction-safe `processPaidCheckout` helper and `db.stripe.processPaidCheckout` export described below have been integrated into that file. Keep the existing CRUD helpers and apply `database/migrations/20260101000000_processed_events.sql` before deploying this webhook.

## 1. Add the atomic Stripe confirmation method

Add this helper after `includeOrderItems` (or another location before `export const db`):

```ts
async function processPaidCheckout(input: {
  eventId: string
  orderId: string
  sessionId: string
  paymentIntentId: string | null
  amountTotal: number
  currency: string
}) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const seen = await client.query(
      `INSERT INTO processed_events (id, "receivedAt") VALUES ($1, NOW())
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [input.eventId],
    )
    if (!seen.rowCount) {
      await client.query('COMMIT')
      return { newlyPaid: false, duplicateEvent: true, order: null }
    }

    const found = await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [input.orderId])
    const order = found.rows[0]
    if (!order) throw new Error(`Order not found: ${input.orderId}`)
    if (order['stripeSessionId'] !== input.sessionId) throw new Error('Stripe session does not match the order')
    if (input.currency !== 'eur' || Number(order.total) !== input.amountTotal) {
      throw new Error('Stripe amount/currency does not match the stored order')
    }
    if (order.status === 'PAID' || ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
      // A different Stripe event may refer to an already fulfilled Checkout Session.
      await client.query('COMMIT')
      return { newlyPaid: false, duplicateEvent: false, order }
    }
    if (order.status !== 'PENDING') throw new Error(`Order is not payable (status ${order.status})`)

    const itemResult = await client.query(
      `SELECT "productId", SUM(quantity)::int AS quantity
       FROM order_items WHERE "orderId"=$1 GROUP BY "productId"`,
      [order.id],
    )
    for (const item of itemResult.rows) {
      const stock = await client.query(
        `UPDATE products SET stock=stock-$2, "updatedAt"=NOW()
         WHERE id=$1 AND stock >= $2 RETURNING id`,
        [item.productId, item.quantity],
      )
      if (!stock.rowCount) throw new Error(`Insufficient stock for product ${item.productId}`)
    }

    const updated = await client.query(
      `UPDATE orders SET status='PAID', "paymentIntentId"=$2, "updatedAt"=NOW()
       WHERE id=$1 AND status='PENDING' RETURNING *`,
      [order.id, input.paymentIntentId],
    )
    if (!updated.rowCount) throw new Error(`Could not transition order ${order.id} to PAID`)
    const items = await client.query(
      `SELECT id,"productId",name,"unitPrice",quantity,customization
       FROM order_items WHERE "orderId"=$1 ORDER BY position ASC`,
      [order.id],
    )
    await client.query('COMMIT')
    return {
      newlyPaid: true,
      duplicateEvent: false,
      order: { ...normalizeRow(updated.rows[0]), items: items.rows },
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

Expose it on the DB client inside `export const db`:

```ts
stripe: { processPaidCheckout },
```

`processed_events` insertion, order state change, stored PaymentIntent ID, and stock decrements share one Postgres transaction. Duplicate Stripe event IDs do not decrement stock twice; a repeated event with a different ID also cannot re-transition a non-PENDING order. Amount, currency, Checkout Session ID, and paid status are verified before fulfillment. The `processed_events` migration must be applied first or the webhook intentionally returns 500 and Stripe will retry.

## 2. Make admin order lists/counts explicitly paid-only

Do **not** globally hide pending orders from `order.findMany`, as the customer account/order-status flow may need to show a pending payment. Filter admin-only queries using the supported `in` filter:

```ts
const paidOrderStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']
// app/admin/commandes/page.tsx
const os = await db.order.findMany({
  where: { status: { in: paidOrderStatuses } },
  include: { items: true },
  orderBy: { createdAt: 'desc' },
})
```

Apply that same filter to the admin dashboard's recent-order query and count:

```ts
const paidOrderCount = await db.order.count({ where: { status: { in: paidOrderStatuses } } })
const recentPaidOrders = await db.order.findMany({
  where: { status: { in: paidOrderStatuses } },
  take: 8,
  orderBy: { createdAt: 'desc' },
})
```

The admin dashboard currently calls `db.order.count()` and its recent `findMany` without a filter. For the admin clients page, the `_count.orders` subqueries in both `user.findMany` and `user.findUnique` also count all statuses; change both occurrences from `countRows('orders', {userId:u.id})` to `countRows('orders', {userId:u.id, status:{in:['PAID','PROCESSING','SHIPPED','DELIVERED']}})` if that admin-facing count is meant to represent paid orders. The archived invoice page currently queries the legacy Mongo model (`Order.find({})`), not this Postgres `db` helper. Migrate that page to `db.order.findMany({ where: { status: { in: paidOrderStatuses } }, ... })` before it can apply the paid-only filter and show only invoices for confirmed payments.

The uploaded DB helper already supports `status: { in: [...] }`. Do not globally hide PENDING orders from generic/customer `order.findMany` or `order.count`; scope these paid-only filters to admin views and admin `_count` calls to avoid breaking a customer's pending-order status page. The admin orders page currently calls `findMany` without a filter, so that caller filter is necessary; no safe database-wide default can distinguish an admin list from a customer's own order history.

## 3. Existing DB helper defects noted

- `$transaction: async (items) => Promise.all(items)` is **not a database transaction**. It runs already-started operations concurrently, so the former webhook's stock decrements were not atomic. The replacement webhook no longer calls this method; its purpose-built `processPaidCheckout` uses a real `pool.connect()` transaction.
- `order.create` and nested `order_items` inserts are also not enclosed in one transaction: if an item insert fails, the order can remain incomplete. Consider transaction-wrapping that helper separately; it does not make an order paid, but is a database consistency issue.
- Inventory is checked at checkout and decremented only upon verified payment, as requested. Two customers can still race between that check and payment; the webhook's conditional decrement prevents negative stock and returns 500 (Stripe retries), but an already-paid Stripe session may need manual resolution/refund if inventory remains unavailable.

No changes are needed to the CRUD helpers for users, products, or contact messages for this Stripe confirmation flow.
