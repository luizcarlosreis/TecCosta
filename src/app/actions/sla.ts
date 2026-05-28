'use server';

import { prisma } from '@/app/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Helper para buscar a sessão do usuário logado
async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('teccosta-session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }
  try {
    return JSON.parse(sessionCookie.value) as { id: string; name: string; role: string };
  } catch (e) {
    return null;
  }
}

// Buscar todas as configurações
export async function getSlaConfigsAction() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || (sessionUser.role !== 'ADMINISTRADOR' && sessionUser.role !== 'TECCOSTA_GESTAO')) {
    return { error: 'Não autorizado.' };
  }

  try {
    const configs = await prisma.slaConfig.findMany({
      orderBy: {
        nivel: 'asc',
      },
    });
    return { configs };
  } catch (error) {
    console.error('Error fetching SLA configs:', error);
    return { error: 'Erro ao buscar regras de SLA.' };
  }
}

// Criar nova regra SLA
export async function createSlaConfigAction(formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || (sessionUser.role !== 'ADMINISTRADOR' && sessionUser.role !== 'TECCOSTA_GESTAO')) {
    return { error: 'Não autorizado.' };
  }

  const nivelStr = formData.get('nivel') as string;
  const horasSlaStr = formData.get('horasSla') as string;
  const horasSomadasStr = formData.get('horasSomadas') as string;

  if (!nivelStr || !horasSlaStr || !horasSomadasStr) {
    return { error: 'Todos os campos são obrigatórios.' };
  }

  const nivel = parseInt(nivelStr, 10);
  const horasSla = parseInt(horasSlaStr, 10);
  const horasSomadas = parseInt(horasSomadasStr, 10);

  if (isNaN(nivel) || isNaN(horasSla) || isNaN(horasSomadas)) {
    return { error: 'Os valores informados devem ser numéricos.' };
  }

  try {
    // Verificar se já existe configuração para este nível
    const existing = await prisma.slaConfig.findUnique({
      where: { nivel },
    });

    if (existing) {
      return { error: `Já existe uma regra cadastrada para o Nível ${nivel}.` };
    }

    await prisma.slaConfig.create({
      data: {
        nivel,
        horasSla,
        horasSomadas,
      },
    });

    revalidatePath('/dashboard/sla');
    return { success: true };
  } catch (error) {
    console.error('Error creating SLA config:', error);
    return { error: 'Erro ao criar regra de SLA.' };
  }
}

// Atualizar regra SLA existente
export async function updateSlaConfigAction(id: string, formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || (sessionUser.role !== 'ADMINISTRADOR' && sessionUser.role !== 'TECCOSTA_GESTAO')) {
    return { error: 'Não autorizado.' };
  }

  const nivelStr = formData.get('nivel') as string;
  const horasSlaStr = formData.get('horasSla') as string;
  const horasSomadasStr = formData.get('horasSomadas') as string;

  if (!id || !nivelStr || !horasSlaStr || !horasSomadasStr) {
    return { error: 'Todos os campos são obrigatórios.' };
  }

  const nivel = parseInt(nivelStr, 10);
  const horasSla = parseInt(horasSlaStr, 10);
  const horasSomadas = parseInt(horasSomadasStr, 10);

  if (isNaN(nivel) || isNaN(horasSla) || isNaN(horasSomadas)) {
    return { error: 'Os valores informados devem ser numéricos.' };
  }

  try {
    // Verificar se o nível conflita com outro ID
    const existing = await prisma.slaConfig.findFirst({
      where: {
        nivel,
        NOT: { id },
      },
    });

    if (existing) {
      return { error: `Outra regra já está cadastrada para o Nível ${nivel}.` };
    }

    await prisma.slaConfig.update({
      where: { id },
      data: {
        nivel,
        horasSla,
        horasSomadas,
      },
    });

    revalidatePath('/dashboard/sla');
    return { success: true };
  } catch (error) {
    console.error('Error updating SLA config:', error);
    return { error: 'Erro ao atualizar regra de SLA.' };
  }
}

// Excluir regra SLA
export async function deleteSlaConfigAction(id: string) {
  const sessionUser = await getSessionUser();
  if (!sessionUser || (sessionUser.role !== 'ADMINISTRADOR' && sessionUser.role !== 'TECCOSTA_GESTAO')) {
    return { error: 'Não autorizado.' };
  }

  if (!id) return { error: 'ID não fornecido.' };

  try {
    await prisma.slaConfig.delete({
      where: { id },
    });

    revalidatePath('/dashboard/sla');
    return { success: true };
  } catch (error) {
    console.error('Error deleting SLA config:', error);
    return { error: 'Erro ao tentar excluir regra de SLA.' };
  }
}
