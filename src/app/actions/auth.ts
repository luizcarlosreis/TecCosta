'use server';

import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const identifier = formData.get('identifier') as string;
  const password = formData.get('password') as string;

  if (!identifier || !password) {
    return { error: 'Por favor, preencha todos os campos.' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { cpfCnpj: identifier },
    });

    if (!user) {
      return { error: 'Usuário não encontrado.' };
    }

    if (user.password !== password) {
      return { error: 'Senha incorreta.' };
    }

    // Em um sistema real, aqui criaríamos um JWT ou sessão segura.
    // Para este portal, vamos usar um cookie simples para simular a sessão.
    const cookieStore = await cookies();
    cookieStore.set('teccosta-session', JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 dia
      path: '/'
    });

  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Ocorreu um erro ao tentar realizar o login.' };
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('teccosta-session');
  redirect('/');
}
