import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { db } from './db'
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'development-secret-change-me')
export async function createSession(userId:string){
 const token=await new SignJWT({userId}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(secret)
 const c=await cookies(); c.set('luna_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*7})
}
export async function clearSession(){const c=await cookies();c.delete('luna_session')}
export async function getCurrentUser(){
 try{const c=await cookies();const token=c.get('luna_session')?.value;if(!token)return null;const {payload}=await jwtVerify(token,secret);if(typeof payload.userId!=='string')return null;return db.user.findUnique({where:{id:payload.userId}})}catch{return null}
}
export async function requireAdmin(){const u=await getCurrentUser();if(!u||u.role!=='ADMIN')throw new Error('UNAUTHORIZED');return u}
