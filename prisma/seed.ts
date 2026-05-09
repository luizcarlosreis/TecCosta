const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { cpfCnpj: '000.000.000-00' },
    update: {},
    create: {
      cpfCnpj: '000.000.000-00',
      name: 'Administrador TecCosta',
      password: 'admin123', // Em produção, usar hash!
      role: 'ADMINISTRADOR',
    },
  });

  console.log({ admin });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
