import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';

const schema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(120),
  email: z.string().trim().email('Adresse email invalide.').max(254),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères.').max(128),
});

export async function POST(req: Request) {
  try {
    let payload: unknown;
    try { payload = await req.json(); }
    catch { return NextResponse.json({ error: 'La requête envoyée est invalide.' }, { status: 400 }); }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Vérifie les informations saisies.' }, { status: 400 });
    }
    const data = { ...parsed.data, email: parsed.data.email.toLowerCase() };
    const exists = await db.user.findUnique({ where: { email: data.email } });
    if (exists) return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 409 });
    // Public registration can only create a customer; role assignment is never accepted from the browser.
    const ownerEmails = (process.env.OWNER_EMAIL || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    const user = await db.user.create({ data: { name: data.name, email: data.email, passwordHash: await bcrypt.hash(data.password, 12), role: ownerEmails.includes(data.email) ? 'OWNER' : 'CUSTOMER' } });
    // If this email is configured as the site owner, ensureSeeded promotes it before it is returned.
    const refreshed = await db.user.findUnique({ where: { id: user.id } });
    await createSession(user.id);
    return NextResponse.json({ ok: true, role: refreshed?.role || 'CUSTOMER' }, { status: 201 });
  } catch (error) {
    console.error('[auth/register] Account creation failed:', error);
    return NextResponse.json({ error: 'Impossible de créer le compte pour le moment. Vérifie les logs du serveur si le problème persiste.' }, { status: 500 });
  }
}
