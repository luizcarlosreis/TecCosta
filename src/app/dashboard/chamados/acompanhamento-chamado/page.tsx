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

  // Apenas ADMINISTRADOR, TECCOSTA_GESTAO e TECNICO têm acesso
  if (
    sessionUser.role !== 'ADMINISTRADOR' &&
    sessionUser.role !== 'TECCOSTA_GESTAO' &&
    sessionUser.role !== 'TECNICO'
  ) {
    redirect('/dashboard');
  }

  // Buscar chamados conforme o perfil
  let requests;
  if (sessionUser.role === 'TECNICO') {
    // Técnico vê apenas chamados destinados a ele
    requests = await prisma.maintenanceRequest.findMany({
      where: {
        technicianId: sessionUser.id
      },
      include: { client: true, technician: true },
      orderBy: { createdAt: 'asc' }
    });
  } else {
    // Admins e Gestão veem tudo
    requests = await prisma.maintenanceRequest.findMany({
      include: { client: true, technician: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  return (
    <AcompanhamentoChamadoClient
      initialRequests={JSON.parse(JSON.stringify(requests))}
      sessionUser={sessionUser}
    />
  );
}
