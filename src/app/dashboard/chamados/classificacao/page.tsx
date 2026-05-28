import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ClassificacaoClient from './ClassificacaoClient';

export const dynamic = 'force-dynamic';

export default async function ClassificacaoPage() {
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

  // Admins e TecCosta Gestão veem todos os pendentes sem classificação
  const pendingRequests = await prisma.maintenanceRequest.findMany({
    where: {
      status: 'PENDENTE',
      nivelCriticidade: null
    },
    include: { client: true, technician: true },
    orderBy: { createdAt: 'asc' } // Mais antigos primeiro (prioridade)
  });

  const serializedRequests = JSON.parse(JSON.stringify(pendingRequests));

  return (
    <ClassificacaoClient
      pendingRequests={serializedRequests}
      sessionUser={sessionUser}
    />
  );
}
