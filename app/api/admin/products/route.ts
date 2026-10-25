import {NextResponse} from 'next/server';import {db} from '@/lib/db';import {requireAdmin} from '@/lib/auth'
export async function PATCH(req:Request){try{await requireAdmin();const {id,active}=await req.json();const p=await db.product.update({where:{id},data:{active}});return NextResponse.json(p)}catch(e:any){return NextResponse.json({error:e.message},{status:403})}}
