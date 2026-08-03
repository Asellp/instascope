const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "test_",
      },
    },
  });
  console.log(result.count + " adet test kullanicisi silindi.");
  await prisma.$disconnect();
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
