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

// Helper para calcular o SLA considerando o horário comercial das 08:00 às 18:00.
// Se ultrapassar 18:00, as horas restantes continuam a contar a partir das 08:00 do próximo dia comercial.
function calculateBusinessSla(startDate: Date, hoursToAdd: number): Date {
  const date = new Date(startDate);

  // Se a hora inicial estiver fora do horário comercial:
  // Se for antes das 08:00, ajusta para 08:00 do mesmo dia.
  // Se for a partir das 18:00, ajusta para 08:00 do dia seguinte.
  if (date.getHours() < 8) {
    date.setHours(8, 0, 0, 0);
  } else if (date.getHours() >= 18) {
    date.setDate(date.getDate() + 1);
    date.setHours(8, 0, 0, 0);
  }

  let remainingHours = hoursToAdd;
  while (remainingHours > 0) {
    const currentHour = date.getHours();
    const availableHoursToday = 18 - currentHour;

    if (availableHoursToday <= 0) {
      date.setDate(date.getDate() + 1);
      date.setHours(8, 0, 0, 0);
      continue;
    }

    if (remainingHours <= availableHoursToday) {
      date.setHours(currentHour + remainingHours);
      remainingHours = 0;
    } else {
      remainingHours -= availableHoursToday;
      date.setDate(date.getDate() + 1);
      date.setHours(8, 0, 0, 0);
    }
  }
  return date;
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
        include: { client: true, technician: true, schedulings: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // Admins e TecCosta Gestão visualizam todos os chamados
      requests = await prisma.maintenanceRequest.findMany({
        include: { client: true, technician: true, schedulings: { orderBy: { createdAt: 'desc' } } },
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

export async function classifyRequestAction(id: number, formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: 'Não autorizado. Por favor, realize o login novamente.' };
  }

  // Apenas Administradores e TecCosta Gestão podem classificar chamados
  if (sessionUser.role !== 'ADMINISTRADOR' && sessionUser.role !== 'TECCOSTA_GESTAO') {
    return { error: 'Você não tem permissão para classificar chamados. Apenas Administradores e a equipe TecCosta Gestão podem realizar esta ação.' };
  }

  const nivelCriticidade = formData.get('nivelCriticidade') as string;
  const prazoSlaStr = formData.get('prazoSla') as string;

  if (!nivelCriticidade || !['1', '2', '3', '4'].includes(nivelCriticidade)) {
    return { error: 'Por favor, selecione um nível de criticidade válido.' };
  }

  try {
    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id }
    });

    if (!existing) {
      return { error: 'Chamado não encontrado.' };
    }

    if (existing.status !== 'PENDENTE') {
      return { error: 'Este chamado já foi classificado e não pode ser reclassificado.' };
    }

    const now = new Date();

    let prazoSla: Date;
    if (nivelCriticidade === '4') {
      if (!prazoSlaStr) {
        return { error: 'Para o Nível 4 (Agendado), informe o prazo limite do chamado (SLA).' };
      }
      prazoSla = new Date(prazoSlaStr);
      if (isNaN(prazoSla.getTime())) {
        return { error: 'Prazo limite (SLA) informado é inválido.' };
      }

      // Validar horário comercial diretamente a partir do texto do input (das 08:00 às 18:00)
      const hourPart = prazoSlaStr.split('T')[1];
      if (hourPart) {
        const hour = parseInt(hourPart.split(':')[0], 10);
        if (hour < 8 || hour >= 18) {
          return { error: 'O prazo limite (SLA) deve ser em horário comercial, das 08:00 às 18:00.' };
        }
      }
    } else {
      const horasMap: Record<string, number> = { '1': 4, '2': 24, '3': 72 };
      const horas = horasMap[nivelCriticidade];
      prazoSla = calculateBusinessSla(now, horas);
    }

    await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        nivelCriticidade,
        classifiedBy: sessionUser.name,
        classifiedById: sessionUser.id,
        classifiedAt: now,
        prazoSla,
        status: 'EM_ANDAMENTO'
      }
    });

    console.log(`Chamado #${id} classificado com Nível ${nivelCriticidade} por ${sessionUser.name}`);
    revalidatePath('/dashboard/chamados/classificacao');
    revalidatePath('/dashboard/chamados/solicitacao');
    return { success: true };

  } catch (error) {
    console.error('Error classifying request:', error);
    return { error: 'Ocorreu um erro ao classificar o chamado.' };
  }
}

// Buscar TODOS os chamados (para a tela de Acompanhamento)
export async function getAllRequestsAction() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: 'Não autorizado.' };
  }

  try {
    let requests;

    if (sessionUser.role === 'CONDOMINIO_EMPRESA') {
      const managedClients = await prisma.client.findMany({
        where: { managers: { some: { id: sessionUser.id } } },
        select: { id: true }
      });
      const clientIds = managedClients.map(c => c.id);

      requests = await prisma.maintenanceRequest.findMany({
        where: { clientId: { in: clientIds } },
        include: { client: true, technician: true, schedulings: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      requests = await prisma.maintenanceRequest.findMany({
        include: { client: true, technician: true, schedulings: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' }
      });
    }

    return { requests: JSON.parse(JSON.stringify(requests)) };
  } catch (error) {
    console.error('Error fetching all requests:', error);
    return { error: 'Ocorreu um erro ao obter os chamados.' };
  }
}

// Atualizar status, data de atendimento e técnico de um chamado (Acompanhamento)
export async function updateRequestStatusAction(id: number, formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: 'Não autorizado.' };
  }

  if (sessionUser.role !== 'ADMINISTRADOR' && sessionUser.role !== 'TECCOSTA_GESTAO') {
    return { error: 'Você não tem permissão para atualizar o status do chamado.' };
  }

  const status = formData.get('status') as string;
  const dataAtendimentoStr = formData.get('dataAtendimento') as string;
  const technicianId = formData.get('technicianId') as string;

  if (!status) {
    return { error: 'Status é obrigatório.' };
  }

  // Técnico e Data/Hora de agendamento são obrigatórios para agendar/reagendar (qualquer status exceto cancelamento)
  if (status !== 'CANCELADO') {
    if (!technicianId) {
      return { error: 'Por favor, selecione um técnico responsável. O técnico é obrigatório.' };
    }
    if (!dataAtendimentoStr) {
      return { error: 'Por favor, informe a data e hora do agendamento.' };
    }
  }

  try {
    const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!existing) {
      return { error: 'Chamado não encontrado.' };
    }

    if (existing.status === 'CONCLUIDO' || existing.status === 'CANCELADO') {
      return { error: 'Não é possível reagendar ou atualizar um chamado com status fechado.' };
    }

    const updateData: Record<string, unknown> = { status };

    let parsedDate: Date | null = null;
    if (dataAtendimentoStr) {
      parsedDate = new Date(dataAtendimentoStr);
      if (isNaN(parsedDate.getTime())) {
        return { error: 'Data e hora de agendamento inválidas.' };
      }

      // Validar horário comercial diretamente a partir do texto do input (evita discrepâncias de fuso horário do servidor)
      const hourPart = dataAtendimentoStr.split('T')[1];
      if (hourPart) {
        const hour = parseInt(hourPart.split(':')[0], 10);
        if (hour < 8 || hour >= 18) {
          return { error: 'O horário do agendamento deve ser comercial, das 08:00 às 18:00.' };
        }
      }

      updateData.dataAtendimento = parsedDate;
    }

    let techName = '';
    if (technicianId) {
      const tech = await prisma.user.findUnique({ where: { id: technicianId } });
      if (!tech) {
        return { error: 'Técnico responsável não encontrado.' };
      }
      techName = tech.name;
      updateData.technicianId = technicianId;
    } else {
      updateData.technicianId = null;
    }

    await prisma.maintenanceRequest.update({
      where: { id },
      data: updateData
    });

    // Se agendado/reagendado com sucesso (possui data e técnico), grava um registro de histórico
    if (status !== 'CANCELADO' && parsedDate && technicianId) {
      // 1. Se já existia agendamento anterior no chamado, mas nenhum histórico foi gravado ainda (chamados legados),
      // registramos primeiro o agendamento original no histórico para preservar a data inicial.
      if (existing.dataAtendimento && existing.technicianId) {
        const historyCount = await prisma.schedulingHistory.count({
          where: { requestId: id }
        });

        if (historyCount === 0) {
          const originalTech = await prisma.user.findUnique({
            where: { id: existing.technicianId }
          });
          const originalTechName = originalTech?.name || 'Técnico Anterior';

          await prisma.schedulingHistory.create({
            data: {
              requestId: id,
              scheduledDate: existing.dataAtendimento,
              technicianId: existing.technicianId,
              technicianName: originalTechName,
              changedBy: existing.classifiedBy || 'Sistema (Legado)'
            }
          });
        }
      }

      // 2. Grava o novo agendamento/reagendamento no histórico
      await prisma.schedulingHistory.create({
        data: {
          requestId: id,
          scheduledDate: parsedDate,
          technicianId,
          technicianName: techName,
          changedBy: sessionUser.name
        }
      });
    }

    revalidatePath('/dashboard/chamados/acompanhamento');
    revalidatePath('/dashboard/chamados/solicitacao');
    return { success: true };
  } catch (error) {
    console.error('Error updating request status:', error);
    return { error: 'Erro ao atualizar o chamado.' };
  }
}

export async function finalizeRequestAction(id: number, formData: FormData) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: 'Não autorizado. Por favor, realize o login novamente.' };
  }

  // Apenas Administradores, TecCosta Gestão e Técnicos podem finalizar chamados
  if (sessionUser.role !== 'ADMINISTRADOR' && sessionUser.role !== 'TECCOSTA_GESTAO' && sessionUser.role !== 'TECNICO') {
    return { error: 'Você não tem permissão para finalizar chamados.' };
  }

  const finishedAtStr = formData.get('finishedAt') as string;
  const finalObservacao = formData.get('finalObservacao') as string;

  if (!finishedAtStr) {
    return { error: 'A data e hora do atendimento real é obrigatória.' };
  }

  try {
    const existing = await prisma.maintenanceRequest.findUnique({
      where: { id }
    });

    if (!existing) {
      return { error: 'Chamado não encontrado.' };
    }

    const finishedAt = new Date(finishedAtStr);
    if (isNaN(finishedAt.getTime())) {
      return { error: 'Data/hora de atendimento real inválida.' };
    }

    await prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'CONCLUIDO',
        finishedAt,
        finishedBy: sessionUser.name,
        finalObservacao: finalObservacao || null
      }
    });

    console.log(`Chamado #${id} finalizado por ${sessionUser.name}`);
    revalidatePath('/dashboard/chamados/acompanhamento-chamado');
    revalidatePath('/dashboard/chamados/solicitacao');
    return { success: true };

  } catch (error) {
    console.error('Error finalizing request:', error);
    return { error: 'Ocorreu um erro ao finalizar o chamado.' };
  }
}

export async function getDashboardStatsAction() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: 'Não autorizado.' };
  }

  try {
    let whereClause: any = {};

    if (sessionUser.role === 'CONDOMINIO_EMPRESA' || sessionUser.role === 'ADMINISTRADORA_CONDOMINIO') {
      const managedClients = await prisma.client.findMany({
        where: { managers: { some: { id: sessionUser.id } } },
        select: { id: true }
      });
      const clientIds = managedClients.map(c => c.id);
      whereClause.clientId = { in: clientIds };
    } else if (sessionUser.role === 'TECNICO') {
      whereClause.technicianId = sessionUser.id;
    }

    // 1. Solicitados (PENDENTE)
    const solicitados = await prisma.maintenanceRequest.count({
      where: {
        ...whereClause,
        status: 'PENDENTE'
      }
    });

    // 2. Classificados (nivelCriticidade não é nulo)
    const classificados = await prisma.maintenanceRequest.count({
      where: {
        ...whereClause,
        nivelCriticidade: { not: null }
      }
    });

    // 3. Para serem agendados (nivelCriticidade não nulo, mas sem dataAtendimento e não fechado)
    const paraAgendar = await prisma.maintenanceRequest.count({
      where: {
        ...whereClause,
        nivelCriticidade: { not: null },
        dataAtendimento: null,
        status: 'EM_ANDAMENTO'
      }
    });

    // 4. Finalizados (CONCLUIDO ou CANCELADO)
    const finalizados = await prisma.maintenanceRequest.count({
      where: {
        ...whereClause,
        status: { in: ['CONCLUIDO', 'CANCELADO'] }
      }
    });

    // 5. Últimas 5 solicitações recentes (abertas, ou seja, ordenadas por data de criação decrescente)
    const recentRequests = await prisma.maintenanceRequest.findMany({
      where: whereClause,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: true }
    });

    // Serializar datas para evitar problemas com Server Components
    const serializedRecent = JSON.parse(JSON.stringify(recentRequests));

    return {
      stats: {
        solicitados,
        classificados,
        paraAgendar,
        finalizados
      },
      recentRequests: serializedRecent
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { error: 'Erro ao carregar estatísticas do painel.' };
  }
}
