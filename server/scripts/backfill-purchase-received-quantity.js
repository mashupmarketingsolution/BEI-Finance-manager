require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

function createPrismaClient() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.MYSQL_PUBLIC_URL ||
    process.env.MYSQL_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL, MYSQL_PUBLIC_URL or MYSQL_URL is required"
    );
  }

  const dbUrl = new URL(databaseUrl);

  const adapter = new PrismaMariaDb({
    host: dbUrl.hostname,
    port: Number(dbUrl.port || 3306),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace(/^\/+/, ""),
    connectionLimit: 5,
  });

  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClient();

  try {
    console.log("==============================================");
    console.log("PURCHASE RECEIVED QUANTITY BACKFILL");
    console.log("==============================================");
    console.log("PRODUCTION DATABASE UPDATE APPROVED.");
    console.log("Only PurchaseItem.receivedQuantity will be updated.\n");

    // 1. Read ONLY legacy Purchase stock movements.
    const legacyMovements = await prisma.stockMovement.findMany({
      where: {
        movementType: "PURCHASE",
        referenceType: "PURCHASE",
        referenceId: { not: null },
      },
      select: {
        materialId: true,
        quantity: true,
        referenceId: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    console.log(
      `Historical PURCHASE movements found: ${legacyMovements.length}`
    );

    // 2. Aggregate historical received quantity by Purchase + Material.
    const historicalByKey = new Map();

    for (const movement of legacyMovements) {
      if (movement.referenceId == null) continue;

      const key = `${movement.referenceId}:${movement.materialId}`;
      const current = historicalByKey.get(key) || 0;

      historicalByKey.set(
        key,
        current + (Number(movement.quantity) || 0)
      );
    }

    // 3. Read all PurchaseItems.
    const purchaseItems = await prisma.purchaseItem.findMany({
      select: {
        id: true,
        purchaseId: true,
        materialId: true,
        quantity: true,
        receivedQuantity: true,
        purchase: {
          select: {
            purchaseNo: true,
          },
        },
        material: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    console.log(`PurchaseItems found: ${purchaseItems.length}`);

    // 4. Duplicate protection.
    const seenKeys = new Set();
    const duplicateKeys = new Set();

    for (const item of purchaseItems) {
      const key = `${item.purchaseId}:${item.materialId}`;

      if (seenKeys.has(key)) {
        duplicateKeys.add(key);
      }

      seenKeys.add(key);
    }

    if (duplicateKeys.size > 0) {
      throw new Error(
        `Unsafe duplicate PurchaseItem keys detected: ${[
          ...duplicateKeys,
        ].join(", ")}`
      );
    }

    // 5. Build SAFE updates.
    const updates = [];

    for (const item of purchaseItems) {
      const key = `${item.purchaseId}:${item.materialId}`;

      const historicalReceived =
        historicalByKey.get(key) || 0;

      const currentReceived =
        Number(item.receivedQuantity) || 0;

      const orderedQuantity =
        Number(item.quantity) || 0;

      if (historicalReceived === 0) {
        continue;
      }

      if (historicalReceived > orderedQuantity) {
        throw new Error(
          `Unsafe data: PurchaseItem ${item.id} has historical received quantity ${historicalReceived}, greater than ordered quantity ${orderedQuantity}`
        );
      }

      // Safe re-run rule:
      // - 0 -> historical value = allowed
      // - already equal = skip
      // - any other current value = abort
      if (
        currentReceived !== 0 &&
        currentReceived !== historicalReceived
      ) {
        throw new Error(
          `Unsafe existing value: PurchaseItem ${item.id} has current receivedQuantity ${currentReceived}, but historical value is ${historicalReceived}`
        );
      }

      if (currentReceived === 0) {
        updates.push({
          id: item.id,
          purchaseNo: item.purchase?.purchaseNo || null,
          materialCode: item.material?.code || null,
          materialName: item.material?.name || null,
          orderedQuantity,
          currentReceived,
          historicalReceived,
        });
      }
    }

    console.log("\n==============================================");
    console.log("APPROVED BACKFILL PLAN");
    console.log("==============================================");
    console.log(`Rows to update: ${updates.length}\n`);

    for (const update of updates) {
      console.log(
        [
          `PurchaseItem: ${update.id}`,
          `Purchase: ${update.purchaseNo}`,
          `Material: ${update.materialCode} - ${update.materialName}`,
          `Ordered: ${update.orderedQuantity}`,
          `Received: ${update.currentReceived} -> ${update.historicalReceived}`,
        ].join(" | ")
      );
    }

    if (updates.length === 0) {
      console.log("\nNo backfill required.");
      return;
    }

    // 6. Apply ONLY receivedQuantity updates.
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const result = await tx.purchaseItem.updateMany({
          where: {
            id: update.id,
            receivedQuantity: 0,
          },
          data: {
            receivedQuantity: update.historicalReceived,
          },
        });

        if (result.count !== 1) {
          throw new Error(
            `Safety check failed while updating PurchaseItem ${update.id}. Transaction will roll back.`
          );
        }
      }
    });

    console.log("\n==============================================");
    console.log("BACKFILL COMPLETED SUCCESSFULLY");
    console.log("==============================================");
    console.log(`Rows updated: ${updates.length}`);
    console.log("No stock movements were created or deleted.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nPurchase receivedQuantity backfill failed:");
  console.error(error);
  process.exitCode = 1;
});