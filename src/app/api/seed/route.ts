import { prisma } from '@/app/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const defaultSlaRules = [
      { nivel: 1, horasSla: 4, horasSomadas: 5 },
      { nivel: 2, horasSla: 24, horasSomadas: 10 },
      { nivel: 3, horasSla: 72, horasSomadas: 30 }
    ];

    const results = [];
    for (const rule of defaultSlaRules) {
      const config = await prisma.slaConfig.upsert({
        where: { nivel: rule.nivel },
        update: {
          horasSla: rule.horasSla,
          horasSomadas: rule.horasSomadas
        },
        create: {
          nivel: rule.nivel,
          horasSla: rule.horasSla,
          horasSomadas: rule.horasSomadas
        }
      });
      results.push(config);
    }

    return NextResponse.json({
      success: true,
      message: 'Regras padrão de SLA inicializadas/atualizadas com sucesso!',
      configs: results
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error seeding SLA rules:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro ao inicializar as regras de SLA no banco de dados.'
    }, { status: 500 });
  }
}
