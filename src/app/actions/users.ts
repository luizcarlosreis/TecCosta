'use server';

import { prisma } from '@/app/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getUsersAction() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return { users };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { error: 'Erro ao buscar usuários do banco de dados.' };
  }
}

export async function createUserAction(formData: FormData) {
  const name = formData.get('name') as string;
  const cpfCnpj = formData.get('cpfCnpj') as string;
  const birthDate = formData.get('birthDate') as string;
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;
  const subRole = formData.get('subRole') as string;

  if (!name || !cpfCnpj || !password || !role) {
    return { error: 'Por favor, preencha todos os campos obrigatórios (Nome, CPF, Senha e Perfil).' };
  }

  try {
    // Verificar se já existe CPF cadastrado
    const existingUser = await prisma.user.findUnique({
      where: { cpfCnpj },
    });

    if (existingUser) {
      return { error: 'Um usuário com este CPF/CNPJ já está cadastrado.' };
    }

    // Criar o usuário
    await prisma.user.create({
      data: {
        name,
        cpfCnpj,
        password,
        role: role as Role,
        birthDate: birthDate || null,
        phone: phone || null,
        subRole: role === 'CONDOMINIO_EMPRESA' ? (subRole || null) : null,
      },
    });

    revalidatePath('/dashboard/usuarios');
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { error: 'Ocorreu um erro ao cadastrar o usuário no banco de dados.' };
  }
}

export async function deleteUserAction(id: string) {
  if (!id) return { error: 'ID do usuário não fornecido.' };

  try {
    await prisma.user.delete({
      where: { id },
    });

    revalidatePath('/dashboard/usuarios');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { error: 'Erro ao tentar excluir o usuário.' };
  }
}
