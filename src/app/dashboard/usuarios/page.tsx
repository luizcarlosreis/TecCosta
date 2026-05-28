import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('teccosta-session');
  if (!sessionCookie || !sessionCookie.value) {
    redirect('/');
  }

  let sessionUser: { id: string; name: string; role: string };
  try {
    sessionUser = JSON.parse(sessionCookie.value) as { id: string; name: string; role: string };
  } catch (e) {
    redirect('/');
  }

  if (
    sessionUser.role !== 'ADMINISTRADOR' &&
    sessionUser.role !== 'TECCOSTA_GESTAO'
  ) {
    redirect('/dashboard');
  }
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Converter objetos Date em strings para evitar problemas de serialização no Next.js Server/Client Component boundary
  const serializedUsers = JSON.parse(JSON.stringify(users));

  return <UsersClient initialUsers={serializedUsers} />;
}
