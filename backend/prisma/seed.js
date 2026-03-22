const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const categories = ['Vegetable', 'Fruit', 'Herb', 'Microgreen', 'Sapling', 'Seed'];
  for (const name of categories) {
    await prisma.listingCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }
  console.log('Categories seeded ✅');
}

main().catch(console.error).finally(() => prisma.$disconnect());
