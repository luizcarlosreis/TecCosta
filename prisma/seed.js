const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { cpfCnpj: '000.000.000-00' },
    update: {},
    create: {
      cpfCnpj: '000.000.000-00',
      name: 'Administrador TecCosta',
      password: 'admin123',
      role: 'ADMINISTRADOR',
    },
  });

  console.log('Usuário admin criado/verificado:', admin.name);

  // Seed default SlaConfigs
  const defaultSlaRules = [
    { nivel: 1, horasSla: 4, horasSomadas: 5 },
    { nivel: 2, horasSla: 24, horasSomadas: 10 },
    { nivel: 3, horasSla: 72, horasSomadas: 30 }
  ];

  for (const rule of defaultSlaRules) {
    const config = await prisma.slaConfig.upsert({
      where: { nivel: rule.nivel },
      update: {},
      create: {
        nivel: rule.nivel,
        horasSla: rule.horasSla,
        horasSomadas: rule.horasSomadas
      }
    });
    console.log(`Configuração SLA para Nível ${config.nivel} criada/verificada: ${config.horasSla}h (SLA), +${config.horasSomadas}h (Cálculo)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
