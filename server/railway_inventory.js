const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const dbUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || 3306),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\/+/, ""),
  connectionLimit: 2,
});

const prisma = new PrismaClient({ adapter });

const models = [
  "customer",
  "user",
  "lead",
  "project",
  "worker",
  "vendor",
  "category",
  "transaction",
  "materialCategory",
  "material",
  "purchase",
  "purchasePayment",
  "purchaseItem",
  "stockMovement",
  "bOQ",
  "bOQItem",
  "quotation",
  "quotationItem",
  "quotationPaymentMilestone",
  "vendorMaterialPrice",
  "purchaseRequest",
  "purchaseRequestItem",
  "rFQ",
  "rFQVendor",
  "rFQItem",
  "purchaseOrder",
  "purchaseOrderItem",
];

async function main() {
  console.log("\nRAILWAY PRODUCTION — READ ONLY INVENTORY\n");

  let total = 0;

  for (const model of models) {
    const count = await prisma[model].count();
    total += count;
    console.log(`${model.padEnd(28)} ${count}`);
  }

  console.log("-----------------------------------");
  console.log(`TOTAL BUSINESS ROWS          ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
