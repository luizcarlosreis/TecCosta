'use server';

import { prisma } from '@/app/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getClientsAction() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        managers: true,
      },
      orderBy: {
        clientCode: 'asc',
      },
    });
    return { clients };
  } catch (error) {
    console.error('Error fetching clients:', error);
    return { error: 'Erro ao buscar clientes no banco de dados.' };
  }
}

export async function getEligibleManagersAction() {
  try {
    const managers = await prisma.user.findMany({
      where: {
        role: {
          in: ['CONDOMINIO_EMPRESA', 'ADMINISTRADORA_CONDOMINIO'],
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    return { managers };
  } catch (error) {
    console.error('Error fetching eligible managers:', error);
    return { error: 'Erro ao buscar responsáveis qualificados no banco de dados.' };
  }
}

export async function createClientAction(formData: FormData) {
  const name = formData.get('name') as string;
  const cnpj = formData.get('cnpj') as string;
  const phone = formData.get('phone') as string;
  const cep = formData.get('cep') as string;
  const rua = formData.get('rua') as string;
  const numero = formData.get('numero') as string;
  const bairro = formData.get('bairro') as string;
  const managerIdsJson = formData.get('managerIds') as string;

  if (!name || !cnpj) {
    return { error: 'Por favor, preencha todos os campos obrigatórios (Nome e CNPJ).' };
  }

  let managerIds: string[] = [];
  if (managerIdsJson) {
    try {
      managerIds = JSON.parse(managerIdsJson);
    } catch (e) {
      console.error('Error parsing managerIds:', e);
    }
  }

  try {
    // Verificar se CNPJ já existe
    const existingClient = await prisma.client.findUnique({
      where: { cnpj },
    });

    if (existingClient) {
      return { error: 'Um cliente com este CNPJ já está cadastrado.' };
    }

    await prisma.client.create({
      data: {
        name,
        cnpj,
        phone: phone || null,
        cep: cep || null,
        rua: rua || null,
        numero: numero || null,
        bairro: bairro || null,
        managers: {
          connect: managerIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath('/dashboard/clientes');
    return { success: true };
  } catch (error) {
    console.error('Error creating client:', error);
    return { error: 'Ocorreu um erro ao cadastrar o cliente no banco de dados.' };
  }
}

export async function updateClientAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const cnpj = formData.get('cnpj') as string;
  const phone = formData.get('phone') as string;
  const cep = formData.get('cep') as string;
  const rua = formData.get('rua') as string;
  const numero = formData.get('numero') as string;
  const bairro = formData.get('bairro') as string;
  const managerIdsJson = formData.get('managerIds') as string;

  if (!id || !name || !cnpj) {
    return { error: 'Por favor, preencha todos os campos obrigatórios.' };
  }

  let managerIds: string[] = [];
  if (managerIdsJson) {
    try {
      managerIds = JSON.parse(managerIdsJson);
    } catch (e) {
      console.error('Error parsing managerIds:', e);
    }
  }

  try {
    // Verificar se CNPJ já pertence a outro cliente
    const existingClient = await prisma.client.findFirst({
      where: {
        cnpj,
        NOT: { id },
      },
    });

    if (existingClient) {
      return { error: 'Um outro cliente com este CNPJ já está cadastrado.' };
    }

    await prisma.client.update({
      where: { id },
      data: {
        name,
        cnpj,
        phone: phone || null,
        cep: cep || null,
        rua: rua || null,
        numero: numero || null,
        bairro: bairro || null,
        managers: {
          set: managerIds.map((id) => ({ id })),
        },
      },
    });

    revalidatePath('/dashboard/clientes');
    return { success: true };
  } catch (error) {
    console.error('Error updating client:', error);
    return { error: 'Ocorreu um erro ao atualizar o cliente no banco de dados.' };
  }
}

export async function deleteClientAction(id: string) {
  if (!id) return { error: 'ID do cliente não fornecido.' };

  try {
    await prisma.client.delete({
      where: { id },
    });

    revalidatePath('/dashboard/clientes');
    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { error: 'Erro ao tentar excluir o cliente.' };
  }
}
