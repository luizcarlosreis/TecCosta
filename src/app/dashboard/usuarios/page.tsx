import { prisma } from '@/app/lib/prisma';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Converter objetos Date em strings para evitar problemas de serialização no Next.js Server/Client Component boundary
  const serializedUsers = JSON.parse(JSON.stringify(users));

  return <UsersClient initialUsers={serializedUsers} />;
}
