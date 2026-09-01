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
      "DATABASE_URL or MYSQL_URL is required"
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
    console.log("PURCHASE RECEIVED QUANTITY BACKFILL DRY-RUN");
    console.log("==============================================");
    console.log("NO DATABASE UPDATE WILL BE PERFORMED.\n");

    // -------------------------------------------------
    // 1. Read ONLY historical PURCHASE stock movements
    // -------------------------------------------------
    const legacyMovements = await prisma.stockMovement.findMany({
      where: {
        movementType: "PURCHASE",
        referenceType: "PURCHASE",
        referenceId: { not: null },
      },
      select: {
        id: true,
        materialId: true,
        quantity: true,
        referenceId: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    console.log(
      `Historical PURCHASE movements found: ${legacyMovements.length}\n`
    );

    // -------------------------------------------------
    // 2. Aggregate historical stock by Purchase + Material
    // -------------------------------------------------
    const stockByKey = new Map();

    for (const movement of legacyMovements) {
      if (movement.referenceId == null) continue;

      const key = `${movement.referenceId}:${movement.materialId}`;

      const current = stockByKey.get(key) || 0;

      stockByKey.set(
        key,
        current + (Number(movement.quantity) || 0)
      );
    }

    // -------------------------------------------------
    // 3. Read all PurchaseItems
    // -------------------------------------------------
    const purchaseItems = await prisma.purchaseItem.findMany({
      select: {
        id: true,
        purchaseId: true,
        materialId: true,
        quantity: true,
        receivedQuantity: true,
        unit: true,
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

    console.log(
      `PurchaseItems found: ${purchaseItems.length}\n`
    );

    // -------------------------------------------------
    // 4. Detect duplicate Purchase + Material keys
    // -------------------------------------------------
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

    // -------------------------------------------------
    // 5. Build proposed updates ONLY
    // -------------------------------------------------
    const proposedUpdates = [];

    for (const item of purchaseItems) {
      const key = `${item.purchaseId}:${item.materialId}`;

      const historicalReceived =
        stockByKey.get(key) || 0;

      const currentReceived =
        Number(item.receivedQuantity) || 0;

      const orderedQuantity =
        Number(item.quantity) || 0;

      // No historical PURCHASE stock found.
      if (historicalReceived === 0) {
        console.log(
          `[NO STOCK] PurchaseItem ${item.id} | ${item.purchase?.purchaseNo} | ${item.material?.code} | ordered=${orderedQuantity} | received=${currentReceived}`
        );
        continue;
      }

      // Historical stock cannot exceed ordered quantity.
      if (historicalReceived > orderedQuantity) {
        throw new Error(
          `Unsafe data: PurchaseItem ${item.id} has historical PURCHASE stock ${historicalReceived}, greater than ordered quantity ${orderedQuantity}`
        );
      }

      if (currentReceived !== historicalReceived) {
        proposedUpdates.push({
          id: item.id,
          purchaseId: item.purchaseId,
          purchaseNo: item.purchase?.purchaseNo || null,
          materialId: item.materialId,
          materialCode: item.material?.code || null,
          materialName: item.material?.name || null,
          orderedQuantity,
          currentReceived,
          historicalReceived,
          difference:
            historicalReceived - currentReceived,
        });
      }
    }

    // -------------------------------------------------
    // 6. Print summary
    // -------------------------------------------------
    console.log("\n==============================================");
    console.log("DRY-RUN RESULT");
    console.log("==============================================");

    console.log(
      `PurchaseItems requiring backfill: ${proposedUpdates.length}`
    );

    if (proposedUpdates.length === 0) {
      console.log("\nNo updates would be required.");
      console.log("DATABASE WAS NOT MODIFIED.");
      return;
    }

    console.log("\nProposed updates:\n");

    for (const update of proposedUpdates) {
      console.log(
        [
          `PurchaseItem: ${update.id}`,
          `Purchase: ${update.purchaseNo}`,
          `Material: ${update.materialCode} - ${update.materialName}`,
          `Ordered: ${update.orderedQuantity}`,
          `Current Received: ${update.currentReceived}`,
          `Proposed Received: ${update.historicalReceived}`,
          `Difference: ${update.difference}`,
        ].join(" | ")
      );
    }

    console.log("\n==============================================");
    console.log("DRY-RUN COMPLETE");
    console.log("==============================================");
    console.log("NO DATABASE UPDATE WAS PERFORMED.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("\nDry-run failed:");
  console.error(error);
  process.exitCode = 1;
});