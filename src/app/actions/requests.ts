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

export async function createRequestAction(formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: 'Não autorizado. Por favor, realize o login novamente.' };
  }

  const description = formData.get('description') as string;
  const tipoChamado = formData.get('tipoChamado') as string;
  const categoria = formData.get('categoria') as string;
  const subItem = formData.get('subItem') as string;
  const observacao = formData.get('observacao') as string;
  
  let clientId = formData.get('clientId') as string;

  if (!description || !tipoChamado || !categoria) {
    return { error: 'Por favor, preencha todos os campos obrigatórios.' };
  }

  try {
    // 1. Resolver o cliente (Empresa/Condomínio)
    if (sessionUser.role === 'CONDOMINIO_EMPRESA') {
      // Usuário gestor: busca as empresas/condomínios a ele associados
      const managedClients = await prisma.client.findMany({
        where: { managers: { some: { id: sessionUser.id } } },
        select: { id: true }
      });

      if (managedClients.length === 0) {
        return { error: 'Seu usuário de gestor não está associado a nenhum Condomínio ou Empresa cliente.' };
      }
      
      // Associa ao primeiro cliente gerenciado
      clientId = managedClients[0].id;
    } else {
      // Administradores ou equipe de gestão: selecionam o cliente no dropdown
      if (!clientId) {
        return { error: 'Por favor, selecione um Cliente (Condomínio/Empresa).' };
      }
    }

    // 2. Criar a solicitação de chamado no banco de dados
    const request = await prisma.maintenanceRequest.create({
      data: {
        description,
        tipoChamado,
        categoria,
        subItem: subItem || null,
        observacao: observacao || null,
        openedBy: sessionUser.name,
        createdById: sessionUser.id,
        clientId,
        status: 'PENDENTE'
      }
    });

    console.log('Chamado criado com sucesso:', request.id);
    revalidatePath('/dashboard/chamados/solicitacao');
    return { success: true, id: request.id };

  } catch (error) {
    console.error('Error creating maintenance request:', error);
    return { error: 'Ocorreu um erro ao registrar a solicitação de chamado.' };
  }
}

export async function updateRequestAction(id: number, formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: 'Não autorizado. Por favor, realize o login novamente.' };
  }

  const description = formData.get('description') as string;
  const tipoChamado = formData.get('tipoChamado') as string;
  const categoria = formData.get('categoria') as string;
  const subItem = formData.get('subItem') as string;
  const observacao = formData.get('observacao') as string;
  
  let clientId = formData.get('clientId') as string;

  if (!description || !tipoChamado || !categoria) {
    return { error: 'Por favor, preencha todos os campos obrigatórios.' };
  }

  try {
    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id }
    });

    if (!existing) {
      return { error: 'Chamado não encontrado.' };
    }

    // Permitir edição apenas se o status for PENDENTE (não classificado/atendido ainda)
    if (existing.status !== 'PENDENTE') {
      return { error: 'Este chamado já foi classificado/atendido e não pode mais ser editado.' };
    }

    // Validar quem é o solicitante (se não for admin, deve ser quem abriu o chamado!)
    if (sessionUser.role === 'CONDOMINIO_EMPRESA') {
      const managedClients = await prisma.client.findMany({
        where: { managers: { some: { id: sessionUser.id } } },
        select: { id: true }
      });
      const clientIds = managedClients.map(c => c.id);

      const isAuthorized = existing.createdById === sessionUser.id || 
                           (existing.createdById === null && clientIds.includes(existing.clientId));

      if (!isAuthorized) {
        return { error: 'Você não tem permissão para editar este chamado.' };
      }
      clientId = existing.clientId;
    } else {
      if (!clientId) {
        return { error: 'Por favor, selecione um Cliente (Condomínio/Empresa).' };
      }
    }

    // Atualizar no banco
    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        description,
        tipoChamado,
        categoria,
        subItem: subItem || null,
        observacao: observacao || null,
        clientId
      }
    });

    console.log('Chamado atualizado com sucesso:', updated.id);
    revalidatePath('/dashboard/chamados/solicitacao');
    return { success: true };

  } catch (error) {
    console.error('Error updating maintenance request:', error);
    return { error: 'Ocorreu um erro ao atualizar a solicitação de chamado.' };
  }
}

export async function getRequestsAction() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: 'Não autorizado.' };
  }

  try {
    let requests;

    if (sessionUser.role === 'CONDOMINIO_EMPRESA') {
      // Filtrar chamados exclusivamente do(s) cliente(s) que este gestor gerencia
      const managedClients = await prisma.client.findMany({
        where: { managers: { some: { id: sessionUser.id } } },
        select: { id: true }
      });
      const clientIds = managedClients.map(c => c.id);

      requests = await prisma.maintenanceRequest.findMany({
        where: { clientId: { in: clientIds } },
        include: { client: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Admins e TecCosta Gestão visualizam todos os chamados
      requests = await prisma.maintenanceRequest.findMany({
        include: { client: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Serializar datas para evitar problemas com Server Components
    const serializedRequests = JSON.parse(JSON.stringify(requests));

    return { requests: serializedRequests };
  } catch (error) {
    console.error('Error fetching requests:', error);
    return { error: 'Ocorreu um erro ao obter a lista de solicitações.' };
  }
}

export async function deleteRequestAction(id: number) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: 'Não autorizado.' };
  }

  try {
    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id }
    });

    if (!existing) {
      return { error: 'Chamado não encontrado.' };
    }

    // Permitir exclusão apenas se for PENDENTE (não classificado/atendido ainda)
    if (existing.status !== 'PENDENTE') {
      return { error: 'Este chamado já foi classificado/atendido e não pode mais ser excluído.' };
    }

    // Validar quem é o solicitante (se for gestor, deve ser quem abriu o chamado ou ter acesso ao cliente!)
    if (sessionUser.role === 'CONDOMINIO_EMPRESA') {
      const managedClients = await prisma.client.findMany({
        where: { managers: { some: { id: sessionUser.id } } },
        select: { id: true }
      });
      const clientIds = managedClients.map(c => c.id);

      const isAuthorized = existing.createdById === sessionUser.id || 
                           (existing.createdById === null && clientIds.includes(existing.clientId));

      if (!isAuthorized) {
        return { error: 'Você não tem permissão para excluir este chamado.' };
      }
    }

    await prisma.maintenanceRequest.delete({
      where: { id }
    });
    revalidatePath('/dashboard/chamados/solicitacao');
    return { success: true };
  } catch (error) {
    console.error('Error deleting request:', error);
    return { error: 'Erro ao tentar excluir a solicitação.' };
  }
}
