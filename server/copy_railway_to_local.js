require("dotenv").config();

const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

function makeClient(urlString) {
  const dbUrl = new URL(urlString);

  const adapter = new PrismaMariaDb({
    host: dbUrl.hostname,
    port: Number(dbUrl.port || 3306),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace(/^\/+/, ""),
    connectionLimit: 2,
    connectTimeout: 30000,
  });

  return new PrismaClient({ adapter });
}

function getEnvUrl(file) {
  const content = fs.readFileSync(file, "utf8");

  const line = content
    .split(/\r?\n/)
    .find((x) => x.trim().startsWith("DATABASE_URL="));

  if (!line) {
    throw new Error(`DATABASE_URL not found in ${file}`);
  }

  return line
    .split("=")
    .slice(1)
    .join("=")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(label, fn, attempts = 5) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      console.log(
        `RETRY ${label} attempt ${attempt}/${attempts} failed`
      );

      if (attempt < attempts) {
        await sleep(5000);
      }
    }
  }

  throw lastError;
}

const railwayUrl = process.env.RAILWAY_SOURCE_URL;
const localUrl = getEnvUrl(".env.local-backup");

if (!railwayUrl) {
  throw new Error("RAILWAY_SOURCE_URL is not set.");
}

const source = makeClient(railwayUrl);
const target = makeClient(localUrl);

const copyOrder = [
  "customer",
  "user",
  "worker",
  "vendor",
  "category",
  "materialCategory",

  "project",
  "lead",
  "material",

  "transaction",

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

async function getSourceCounts() {
  const result = {};

  for (const model of copyOrder) {
    result[model] = await retry(
      `COUNT ${model}`,
      () => source[model].count()
    );
  }

  return result;
}

async function getTargetCounts() {
  const result = {};

  for (const model of copyOrder) {
    result[model] = await target[model].count();
  }

  return result;
}

function totalCounts(counts) {
  return Object.values(counts).reduce((sum, value) => sum + value, 0);
}

async function main() {
  console.log("\n==========================================");
  console.log(" BEI RAILWAY -> LOCAL DATA MIGRATION");
  console.log("==========================================\n");

  // STEP 1 — PRECHECK
  const sourceCounts = await getSourceCounts();
  const targetCountsBefore = await getTargetCounts();

  const sourceTotal = totalCounts(sourceCounts);
  const targetTotalBefore = totalCounts(targetCountsBefore);

  console.log(`Railway source rows : ${sourceTotal}`);
  console.log(`Local target rows   : ${targetTotalBefore}`);

  if (sourceTotal === 0) {
    throw new Error("Railway source is empty. STOP.");
  }

  if (targetTotalBefore !== 0) {
    throw new Error(
      "Local business tables are not empty. STOP."
    );
  }

  if (!process.argv.includes("--copy")) {
    console.log("\nPRECHECK PASSED.");
    console.log("No data copied.");
    return;
  }

  // STEP 2 — READ RAILWAY
  console.log("\nReading Railway data...\n");

  const data = {};

  for (const model of copyOrder) {
    data[model] = await retry(
      `READ ${model}`,
      () =>
        source[model].findMany({
          orderBy: { id: "asc" },
        })
    );

    console.log(
      `READ   ${model.padEnd(28)} ${data[model].length}`
    );
  }

  const loadedTotal = Object.values(data).reduce(
    (sum, rows) => sum + rows.length,
    0
  );

  if (loadedTotal !== sourceTotal) {
    throw new Error(
      `Source count mismatch. Expected ${sourceTotal}, loaded ${loadedTotal}.`
    );
  }

  // STEP 3 — WRITE LOCAL ONLY
  console.log("\nWriting to Local XAMPP...\n");

  await target.$transaction(
    async (tx) => {
      for (const model of copyOrder) {
        const rows = data[model];

        if (rows.length === 0) {
          console.log(`SKIP   ${model.padEnd(28)} 0`);
          continue;
        }

        const result = await tx[model].createMany({
          data: rows,
        });

        if (result.count !== rows.length) {
          throw new Error(
            `${model}: expected ${rows.length}, inserted ${result.count}`
          );
        }

        console.log(
          `WRITE  ${model.padEnd(28)} ${result.count}`
        );
      }
    },
    {
      maxWait: 30000,
      timeout: 120000,
    }
  );

  // STEP 4 — VERIFY LOCAL AGAINST SOURCE SNAPSHOT
  console.log("\nVerifying Local database...\n");

  const targetCountsAfter = await getTargetCounts();

  let mismatch = false;

  for (const model of copyOrder) {
    const expected = sourceCounts[model];
    const actual = targetCountsAfter[model];
    const ok = expected === actual;

    if (!ok) mismatch = true;

    console.log(
      `${ok ? "OK  " : "FAIL"} ${model.padEnd(28)} Expected=${String(expected).padEnd(4)} Local=${actual}`
    );
  }

  const finalLocalTotal = totalCounts(targetCountsAfter);

  console.log("\n------------------------------------------");
  console.log(`Expected total : ${sourceTotal}`);
  console.log(`Local total    : ${finalLocalTotal}`);
  console.log("------------------------------------------");

  if (mismatch || sourceTotal !== finalLocalTotal) {
    throw new Error("Local verification failed.");
  }

  console.log("\n==========================================");
  console.log(" MIGRATION SUCCESS");
  console.log(" Railway remained READ ONLY.");
  console.log(" Local database verified.");
  console.log("==========================================\n");
}

main()
  .catch((error) => {
    console.error("\n==========================================");
    console.error(" MIGRATION FAILED");
    console.error("==========================================");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
