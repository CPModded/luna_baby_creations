/**
 * One-time migration MongoDB -> PostgreSQL.
 * Run from a trusted machine with network access to BOTH databases:
 *   MONGODB_URI="..." DATABASE_URL="..." node scripts/migrate-mongo-to-postgres.mjs
 * Create the PostgreSQL schema first using database/schema.sql.
 * The script refuses to run if the PostgreSQL target contains application rows.
 */
import mongoose from 'mongoose'
import pg from 'pg'

const { Pool } = pg
const mongoUri = process.env.MONGODB_URI
const databaseUrl = process.env.DATABASE_URL
if (!mongoUri || !databaseUrl) {
  console.error('Required environment variables: MONGODB_URI and DATABASE_URL')
  process.exit(1)
}
const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 10000 })
const json = value => value == null ? null : JSON.stringify(value)
const date = value => value ? new Date(value) : new Date()

async function main() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 2 })
  const source = mongoose.connection.db
  if (!source) throw new Error('MongoDB database connection not initialized')
  const client = await pool.connect()
  try {
    const check = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM order_items) AS order_items,
        (SELECT COUNT(*) FROM contact_messages) AS contact_messages
    `)
    const existing = Object.values(check.rows[0]).some(v => Number(v) > 0)
    if (existing) throw new Error('Target PostgreSQL is not empty. Migration stopped to avoid overwriting data.')

    const users = await source.collection('users').find({}).toArray()
    const products = await source.collection('products').find({}).toArray()
    const orders = await source.collection('orders').find({}).toArray()
    const messages = await source.collection('contactmessages').find({}).toArray()

    await client.query('BEGIN')
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id,name,email,"passwordHash",role,"createdAt") VALUES ($1,$2,$3,$4,$5,$6)`,
        [String(u.id), u.name, String(u.email).toLowerCase(), u.passwordHash, u.role || 'CUSTOMER', date(u.createdAt)]
      )
    }
    for (const p of products) {
      await client.query(
        `INSERT INTO products (id,name,slug,description,price,"compareAt",stock,image,category,featured,active,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [String(p.id),p.name,p.slug,p.description,p.price,p.compareAt ?? null,p.stock,p.image,p.category,Boolean(p.featured),p.active !== false,date(p.createdAt),date(p.updatedAt)]
      )
    }
    let itemCount = 0
    for (const o of orders) {
      await client.query(
        `INSERT INTO orders (id,"userId",email,"customerName",subtotal,shipping,tax,total,"invoiceNumber","shippingAddress",status,"stripeSessionId","accessToken","paymentIntentId","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16)`,
        [String(o.id),o.userId ? String(o.userId) : null,String(o.email).toLowerCase(),o.customerName ?? null,o.subtotal,o.shipping,o.tax,o.total,o.invoiceNumber,json(o.shippingAddress),o.status || 'PENDING',o.stripeSessionId ?? null,o.accessToken,o.paymentIntentId ?? null,date(o.createdAt),date(o.updatedAt)]
      )
      for (let i=0; i<(o.items || []).length; i++) {
        const item=o.items[i]
        await client.query(
          `INSERT INTO order_items (id,"orderId","productId",name,"unitPrice",quantity,customization,position) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
          [String(item.id),String(o.id),String(item.productId),item.name,item.unitPrice,item.quantity,json(item.customization),i]
        )
        itemCount++
      }
    }
    for (const m of messages) {
      await client.query(
        `INSERT INTO contact_messages (id,name,email,subject,message,read,"createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [String(m.id),m.name,String(m.email).toLowerCase(),m.subject,m.message,Boolean(m.read),date(m.createdAt)]
      )
    }
    await client.query('COMMIT')

    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM products) AS products,
        (SELECT COUNT(*)::int FROM orders) AS orders,
        (SELECT COUNT(*)::int FROM order_items) AS order_items,
        (SELECT COUNT(*)::int FROM contact_messages) AS contact_messages
    `)
    const actual = counts.rows[0]
    const expected = { users: users.length, products: products.length, orders: orders.length, order_items: itemCount, contact_messages: messages.length }
    console.log('Migration complete. Compare expected and actual counts:')
    console.log(JSON.stringify({ expected, actual }, null, 2))
    if (Object.keys(expected).some(k => expected[k] !== actual[k])) {
      throw new Error('Count mismatch after migration. Keep MongoDB unchanged and investigate before switching production.')
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

main()
  .catch(error => { console.error('Migration failed:', error.message || error); process.exitCode = 1 })
  .finally(async () => { await mongoose.disconnect().catch(() => {}); await pool.end().catch(() => {}) })