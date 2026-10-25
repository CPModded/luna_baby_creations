import mongoose, { Schema, Model } from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.warn('MONGODB_URI is not configured. Add it to .env before starting Luna Baby.')
}

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
declare global { var __lunaMongoose: MongooseCache | undefined }
const cache: MongooseCache = global.__lunaMongoose ?? { conn: null, promise: null }
global.__lunaMongoose = cache

export async function connectMongo() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI_MISSING')
  if (cache.conn) return cache.conn
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5,
      minPoolSize: 0,
      autoIndex: process.env.NODE_ENV !== 'production',
    })
  }
  cache.conn = await cache.promise
  return cache.conn
}

export type UserDoc = { id: string; name: string; email: string; passwordHash: string; role: 'CUSTOMER'|'ADMIN'; createdAt: Date }
export type ProductDoc = { id: string; name: string; slug: string; description: string; price: number; compareAt?: number; stock: number; image: string; category: string; featured: boolean; active: boolean; createdAt: Date; updatedAt: Date }
export type OrderItemDoc = { id: string; productId: string; name: string; unitPrice: number; quantity: number; customization?: unknown }
export type OrderDoc = { id: string; userId?: string; email: string; customerName?: string; subtotal: number; shipping: number; tax: number; total: number; invoiceNumber: string; shippingAddress?: unknown; status: string; stripeSessionId?: string; accessToken: string; paymentIntentId?: string; items: OrderItemDoc[]; createdAt: Date; updatedAt: Date }
export type ContactDoc = { id: string; name: string; email: string; subject: string; message: string; read: boolean; createdAt: Date }

const UserSchema = new Schema<UserDoc>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['CUSTOMER','ADMIN'], default: 'CUSTOMER' },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false })

const ProductSchema = new Schema<ProductDoc>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, maxlength: 160 },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true, maxlength: 2000 },
  price: { type: Number, required: true, min: 0 },
  compareAt: { type: Number, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  image: { type: String, required: true },
  category: { type: String, required: true, maxlength: 100 },
  featured: { type: Boolean, default: false },
  active: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false })

const OrderItemSchema = new Schema<OrderItemDoc>({
  id: { type: String, required: true },
  productId: { type: String, required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1 },
  customization: { type: Schema.Types.Mixed },
}, { _id: false, versionKey: false })

const OrderSchema = new Schema<OrderDoc>({
  id: { type: String, required: true, unique: true, index: true },
  userId: { type: String, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  customerName: { type: String, trim: true, maxlength: 160 },
  subtotal: { type: Number, required: true, min: 0 },
  shipping: { type: Number, required: true, min: 0 },
  tax: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  shippingAddress: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED'], default: 'PENDING', index: true },
  stripeSessionId: { type: String, index: true, sparse: true },
  accessToken: { type: String, required: true, unique: true, index: true, select: false },
  paymentIntentId: { type: String, index: true, sparse: true },
  items: { type: [OrderItemSchema], default: [] },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
}, { versionKey: false })

const ContactSchema = new Schema<ContactDoc>({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 5000 },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false })

export const User = (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>('User', UserSchema)
export const Product = (mongoose.models.Product as Model<ProductDoc>) || mongoose.model<ProductDoc>('Product', ProductSchema)
export const Order = (mongoose.models.Order as Model<OrderDoc>) || mongoose.model<OrderDoc>('Order', OrderSchema)
export const ContactMessage = (mongoose.models.ContactMessage as Model<ContactDoc>) || mongoose.model<ContactDoc>('ContactMessage', ContactSchema)
