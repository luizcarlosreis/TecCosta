import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AcompanhamentoClient from './AcompanhamentoClient';

export const dynamic = 'force-dynamic';

export default async function AcompanhamentoPage() {
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

  // Buscar todos os chamados classificados (filtrado por cliente se for gestor)
  let requests;
  if (sessionUser.role === 'CONDOMINIO_EMPRESA') {
    const managedClients = await prisma.client.findMany({
      where: { managers: { some: { id: sessionUser.id } } },
      select: { id: true }
    });
    const clientIds = managedClients.map((c) => c.id);
    requests = await prisma.maintenanceRequest.findMany({
      where: {
        clientId: { in: clientIds },
        nivelCriticidade: { not: null }
      },
      include: { client: true, technician: true },
      orderBy: { createdAt: 'desc' }
    });
  } else {
    requests = await prisma.maintenanceRequest.findMany({
      where: {
        nivelCriticidade: { not: null }
      },
      include: { client: true, technician: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Buscar técnicos disponíveis para o dropdown
  const technicians = await prisma.user.findMany({
    where: { role: 'TECNICO' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return (
    <AcompanhamentoClient
      initialRequests={JSON.parse(JSON.stringify(requests))}
      technicians={JSON.parse(JSON.stringify(technicians))}
      sessionUser={sessionUser}
    />
  );
}
