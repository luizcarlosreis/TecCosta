import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AcompanhamentoChamadoClient from './AcompanhamentoChamadoClient';

export const dynamic = 'force-dynamic';

export default async function AcompanhamentoChamadoPage() {
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

  // Buscar todos os chamados sem filtros de classificação
  let requests;
  if (sessionUser.role === 'CONDOMINIO_EMPRESA') {
    const managedClients = await prisma.client.findMany({
      where: { managers: { some: { id: sessionUser.id } } },
      select: { id: true }
    });
    const clientIds = managedClients.map((c) => c.id);
    requests = await prisma.maintenanceRequest.findMany({
      where: { clientId: { in: clientIds } },
      include: { client: true, technician: true },
      orderBy: { createdAt: 'desc' }
    });
  } else {
    requests = await prisma.maintenanceRequest.findMany({
      include: { client: true, technician: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  return (
    <AcompanhamentoChamadoClient
      initialRequests={JSON.parse(JSON.stringify(requests))}
      sessionUser={sessionUser}
    />
  );
}
