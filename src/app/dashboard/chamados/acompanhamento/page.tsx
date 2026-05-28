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

  // Apenas ADMINISTRADOR e TECCOSTA_GESTAO têm acesso
  if (
    sessionUser.role !== 'ADMINISTRADOR' &&
    sessionUser.role !== 'TECCOSTA_GESTAO'
  ) {
    redirect('/dashboard');
  }

  // Buscar todos os chamados classificados (todos os chamados para admins/gestão)
  const requests = await prisma.maintenanceRequest.findMany({
    where: {
      nivelCriticidade: { not: null }
    },
    include: { client: true, technician: true, schedulings: { orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' }
  });

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
