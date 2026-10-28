import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { pool, query } from './postgres'
import { products as catalog } from './data'

export const OrderStatus = { PENDING: 'PENDING', PAID: 'PAID', PROCESSING: 'PROCESSING', SHIPPED: 'SHIPPED', DELIVERED: 'DELIVERED', CANCELLED: 'CANCELLED' } as const
const id = () => crypto.randomUUID().replace(/-/g, '').slice(0, 25)
const dates = (x: any) => x ? { ...x, createdAt: x.createdAt ? new Date(x.createdAt) : x.createdAt, ...(x.updatedAt ? { updatedAt: new Date(x.updatedAt) } : {}) } : x

let seedPromise: Promise<void> | null = null
async function ensureSeeded() {
  if (seedPromise) return seedPromise
  seedPromise = (async () => {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_MISSING')
    // Product defaults are inserted only when missing. Existing stock and prices are not reset.
    for (const p of catalog) {
      await query(
        `INSERT INTO products (id, name, slug, description, price, "compareAt", stock, image, category, featured, active, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,NOW(),NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [id(), p.name, p.slug, p.description, p.price, p.compareAt ?? null, p.stock, p.image, p.category, p.featured ?? false]
      )
    }
    // Keep role values compatible with the current schema and add support for owner/manager roles.
    await query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check')
    await query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('CUSTOMER','MANAGER','ADMIN','OWNER'))")
    const ownerEmails = (process.env.OWNER_EMAIL || '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
    if (ownerEmails.length) {
      await query("UPDATE users SET role='OWNER' WHERE LOWER(email)=ANY($1::text[]) AND role <> 'OWNER'", [ownerEmails])
    }
    const email = (process.env.ADMIN_EMAIL || 'admin@lunababy.fr').toLowerCase()
    const existing = await query('SELECT id FROM users WHERE email=$1 LIMIT 1', [email])
    if (!existing.rows.length) {
      const password = process.env.ADMIN_PASSWORD
      if (!password) throw new Error('ADMIN_PASSWORD_MISSING')
      await query(
        `INSERT INTO users (id,name,email,"passwordHash",role,"createdAt") VALUES ($1,$2,$3,$4,'ADMIN',NOW()) ON CONFLICT (email) DO NOTHING`,
        [id(), 'Administrateur', email, await bcrypt.hash(password, 12)]
      )
    }
  })().catch(err => { seedPromise = null; throw err })
  return seedPromise
}

type Table = 'users' | 'products' | 'orders' | 'contact_messages'
const fields: Record<Table, Set<string>> = {
  users: new Set(['id','name','email','passwordHash','role','createdAt','emailVerified']),
  products: new Set(['id','name','slug','description','price','compareAt','stock','image','category','featured','active','createdAt','updatedAt']),
  orders: new Set(['id','userId','email','customerName','subtotal','shipping','tax','total','invoiceNumber','shippingAddress','status','stripeSessionId','accessToken','paymentIntentId','createdAt','updatedAt']),
  contact_messages: new Set(['id','name','email','subject','message','read','createdAt']),
}
const jsonFields = new Set(['shippingAddress','customization'])
const col = (key: string) => `"${key.replace(/"/g, '""')}"`
function buildWhere(table: Table, where: any, values: any[]) {
  const clauses: string[] = []
  if (!where) return ''
  for (const [key, value] of Object.entries(where)) {
    if (!fields[table].has(key)) throw new Error(`Unsupported filter field: ${key}`)
    if (value === undefined) continue
    if (value === null) { clauses.push(`${col(key)} IS NULL`); continue }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('in' in value) {
        const arr = (value as any).in as any[]
        if (!arr.length) { clauses.push('FALSE'); continue }
        values.push(arr)
        clauses.push(`${col(key)} = ANY($${values.length})`)
      } else if ('equals' in value) {
        values.push((value as any).equals); clauses.push(`${col(key)} = $${values.length}`)
      } else if ('contains' in value) {
        values.push(`%${String((value as any).contains).replace(/[\\%_]/g, '\\$&')}%`)
        clauses.push(`${col(key)} ILIKE $${values.length} ESCAPE '\\'`)
      } else {
        values.push(value); clauses.push(`${col(key)} = $${values.length}`)
      }
    } else {
      values.push(value); clauses.push(`${col(key)} = $${values.length}`)
    }
  }
  return clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''
}
function sortSql(table: Table, orderBy: any) {
  if (!orderBy) return ''
  const [key, dir] = Object.entries(orderBy)[0] as [string, any]
  if (!fields[table].has(key)) throw new Error(`Unsupported sort field: ${key}`)
  return ` ORDER BY ${col(key)} ${dir === 'desc' ? 'DESC' : 'ASC'}`
}
function limitSql(take: any, values: any[]) {
  if (!take) return ''
  const n = Number(take)
  if (!Number.isInteger(n) || n < 0) throw new Error('Invalid query limit')
  values.push(n)
  return ` LIMIT $${values.length}`
}
function normalizeRow(row: any) {
  if (!row) return null
  const out = { ...row }
  for (const key of ['shippingAddress']) if (typeof out[key] === 'string') { try { out[key] = JSON.parse(out[key]) } catch {} }
  return dates(out)
}
async function rows(table: Table, where?: any, orderBy?: any, take?: any, selected?: string[]) {
  const allowed = fields[table]
  const selection = selected?.length ? selected.filter(k => allowed.has(k)) : [...allowed]
  const values: any[] = []
  let sql = `SELECT ${selection.map(col).join(',')} FROM ${table}` + buildWhere(table, where, values) + sortSql(table, orderBy) + limitSql(take, values)
  const result = await query(sql, values)
  return result.rows.map(normalizeRow)
}
function encodeValue(key: string, value: any) { return jsonFields.has(key) && value != null ? JSON.stringify(value) : value }
async function updateRow(table: Table, where: any, data: any) {
  const values: any[] = []
  const sets: string[] = []
  for (const [key, raw] of Object.entries(data || {})) {
    if (!fields[table].has(key)) continue
    if (raw === undefined) continue
    if (key === 'stock' && raw && typeof raw === 'object' && 'decrement' in (raw as any)) {
      values.push(Number((raw as any).decrement)); sets.push(`${col(key)} = ${col(key)} - $${values.length}`)
    } else {
      values.push(encodeValue(key, raw)); sets.push(`${col(key)} = $${values.length}${jsonFields.has(key) && raw != null ? '::jsonb' : ''}`)
    }
  }
  if (table === 'products' || table === 'orders') {
    if (table === 'products' && !('updatedAt' in (data || {}))) sets.push(`"updatedAt" = NOW()`)
    if (table === 'orders' && !('updatedAt' in (data || {}))) sets.push(`"updatedAt" = NOW()`)
  }
  if (!sets.length) return (await rows(table, where, undefined, 1))[0] ?? null
  const whereSql = buildWhere(table, where, values)
  const result = await query(`UPDATE ${table} SET ${sets.join(', ')}${whereSql} RETURNING *`, values)
  if (!result.rows[0]) throw new Error(`${table} record not found`)
  return normalizeRow(result.rows[0])
}
async function insertRow(table: Table, data: any) {
  const record = { id: id(), ...data }
  if (table === 'users') { record.role ||= 'CUSTOMER'; record.createdAt ||= new Date(); record.emailVerified ??= null }
  if (table === 'orders') { record.status ||= 'PENDING'; record.createdAt ||= new Date(); record.updatedAt ||= new Date() }
  if (table === 'contact_messages') { record.read ??= false; record.createdAt ||= new Date() }
  if (table === 'products') { record.createdAt ||= new Date(); record.updatedAt ||= new Date() }
  const entries = Object.entries(record).filter(([k,v]) => fields[table].has(k) && v !== undefined)
  const values = entries.map(([k,v]) => encodeValue(k,v))
  const placeholders = entries.map(([k], i) => `$${i+1}${jsonFields.has(k) && record[k] != null ? '::jsonb' : ''}`)
  const result = await query(`INSERT INTO ${table} (${entries.map(([k])=>col(k)).join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values)
  return normalizeRow(result.rows[0])
}
async function countRows(table: Table, where?: any) {
  const values: any[] = []
  const result = await query(`SELECT COUNT(*)::int AS count FROM ${table}${buildWhere(table, where, values)}`, values)
  return result.rows[0].count as number
}
async function includeOrderItems(order: any, include: any) {
  if (!order || !include?.items) return order
  const result = await query('SELECT id,"productId",name,"unitPrice",quantity,customization FROM order_items WHERE "orderId"=$1 ORDER BY "position" ASC', [order.id])
  return { ...order, items: result.rows.map((r: any) => ({ ...r, customization: r.customization })) }
}

export const db: any = {
  user: {
    findUnique: async ({where, include, select}: any) => { await ensureSeeded(); const u = (await rows('users', where, undefined, 1, select?.passwordHash ? undefined : ['id','name','email','role','createdAt']))[0] ?? null; if (u && include?._count?.select?.orders) u._count = { orders: await countRows('orders', {userId:u.id}) }; return u },
    findMany: async ({where,orderBy,include,take}: any = {}) => { await ensureSeeded(); const us = await rows('users',where,orderBy,take,['id','name','email','role','createdAt']); return Promise.all(us.map(async (u:any)=>{if(include?._count?.select?.orders)u._count={orders:await countRows('orders',{userId:u.id})};return u})) },
    count: async ({where}: any = {}) => { await ensureSeeded(); return countRows('users',where) },
    create: async ({data}: any) => { await ensureSeeded(); return insertRow('users',data) },
    update: async ({where,data}: any) => { await ensureSeeded(); return updateRow('users',where,data) },
    upsert: async ({where,update,create}: any) => { await ensureSeeded(); const existing=(await rows('users',where,undefined,1))[0]; return existing ? updateRow('users',where,update) : insertRow('users',create) },
  },
  product: {
    findUnique: async ({where}: any) => { await ensureSeeded(); return (await rows('products',where,undefined,1))[0] ?? null },
    findMany: async ({where,orderBy,take}: any = {}) => { await ensureSeeded(); return rows('products',where,orderBy,take) },
    count: async ({where}: any = {}) => { await ensureSeeded(); return countRows('products',where) },
    update: async ({where,data}: any) => { await ensureSeeded(); return updateRow('products',where,data) },
    upsert: async ({where,update,create}: any) => { await ensureSeeded(); const existing=(await rows('products',where,undefined,1))[0]; return existing ? updateRow('products',where,{...update,updatedAt:new Date()}) : insertRow('products',create) },
  },
  order: {
    findUnique: async ({where,include}: any) => { await ensureSeeded(); const o=(await rows('orders',where,undefined,1))[0] ?? null; return includeOrderItems(o,include) },
    findMany: async ({where,orderBy,include,take}: any = {}) => { await ensureSeeded(); const os=await rows('orders',where,orderBy,take); return Promise.all(os.map((o:any)=>includeOrderItems(o,include))) },
    count: async ({where}: any = {}) => { await ensureSeeded(); return countRows('orders',where) },
    aggregate: async ({where,_sum}: any) => { await ensureSeeded(); if(!_sum?.total)return {_sum:{total:null}}; const values:any[]=[]; const r=await query(`SELECT SUM(total)::bigint AS total FROM orders${buildWhere('orders',where,values)}`,values); return {_sum:{total:r.rows[0]?.total == null ? null : Number(r.rows[0].total)}} },
    create: async ({data}: any) => {
      await ensureSeeded()
      const nested=data.items?.create || []
      const {items,...rest}=data
      const order=await insertRow('orders',rest)
      const savedItems = []
      for(let i=0;i<nested.length;i++){
        const item=nested[i]
        const itemId = item.id || id()
        await query('INSERT INTO order_items (id,"orderId","productId",name,"unitPrice",quantity,customization,position) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)',
          [itemId,order.id,item.productId,item.name,item.unitPrice,item.quantity,item.customization == null ? null : JSON.stringify(item.customization),i])
        savedItems.push({...item,id:itemId})
      }
      return {...order,items:savedItems}
    },
    update: async ({where,data,include}: any) => { await ensureSeeded(); const o=await updateRow('orders',where,data); return includeOrderItems(o,include) },
  },
  orderItem: {},
  contactMessage: {
    findMany: async ({where,orderBy,take}: any = {}) => { await ensureSeeded(); return rows('contact_messages',where,orderBy,take) },
    count: async ({where}: any = {}) => { await ensureSeeded(); return countRows('contact_messages',where) },
    create: async ({data}: any) => { await ensureSeeded(); return insertRow('contact_messages',data) },
    update: async ({where,data}: any) => { await ensureSeeded(); return updateRow('contact_messages',where,data) },
  },
  $transaction: async (items: any[]) => Promise.all(items),
}
export async function closePostgres() { await pool.end() }