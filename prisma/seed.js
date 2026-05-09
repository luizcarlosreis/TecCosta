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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
