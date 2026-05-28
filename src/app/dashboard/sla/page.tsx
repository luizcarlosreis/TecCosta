import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SlaClient from './SlaClient';

export const dynamic = 'force-dynamic';

export default async function SlaPage() {
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

  const configs = await prisma.slaConfig.findMany({
    orderBy: {
      nivel: 'asc',
    },
  });

  const serializedConfigs = JSON.parse(JSON.stringify(configs));

  return <SlaClient initialConfigs={serializedConfigs} />;
}
