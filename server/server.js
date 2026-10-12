const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const { validateContact, customerFinancials } = require("./crm");
const { categories: quotationCategories, validateFinalization, registerQuotationWorkflow } = require("./quotation-workflow");
const app = express();
const PORT = process.env.PORT || 5000;

// =========================================
// PRISMA + MARIADB CONNECTION
// =========================================

//  const adapter = new PrismaMariaDb({
 // host: "localhost",
  //port: 3306,
 // user: "root",
 // password: "",
 // database: "be_interior_finance",
 // connectionLimit: 5,
//});


//const dbUrl = new URL(process.env.DATABASE_URL);

//const adapter = new PrismaMariaDb({
  //host: dbUrl.hostname,
  //port: Number(dbUrl.port || 3306),
  //user: decodeURIComponent(dbUrl.username),
  //password: decodeURIComponent(dbUrl.password),
  //database: dbUrl.pathname.replace("/", ""),
  //connectionLimit: 5,
//});

//const prisma = new PrismaClient({ adapter });



const dbUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || 3306),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\/+/, ""),

  connectionLimit: 5,
  connectTimeout: 5000,
  acquireTimeout: 15000,
  idleTimeout: 300,
});

const prisma = new PrismaClient({ adapter });


// =========================================
// AUTHENTICATION CONFIGURATION
// =========================================

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}




// =========================================
// STOCK CALCULATION HELPER
// =========================================

function calculateMaterialStock(movements) {
  let currentStock = 0;
  let totalStockIn = 0;
  let totalStockOut = 0;

  for (const movement of movements) {
    const quantity = Number(movement.quantity) || 0;

    switch (movement.movementType) {
      case "PURCHASE":
      case "RETURN":
        currentStock += quantity;
        totalStockIn += quantity;
        break;

      case "PROJECT_USAGE":
      case "DAMAGE":
        currentStock -= quantity;
        totalStockOut += quantity;
        break;

      case "ADJUSTMENT":
        currentStock += quantity;

        if (quantity >= 0) {
          totalStockIn += quantity;
        } else {
          totalStockOut += Math.abs(quantity);
        }

        break;

      default:
        break;
    }
  }

  return {
    currentStock,
    totalStockIn,
    totalStockOut,
  };
}

// =========================================
// PROJECT RETURN AVAILABILITY HELPER
// =========================================

function calculateProjectReturnAvailability(
  movements
) {
  let totalUsed = 0;
  let totalReturned = 0;

  for (const movement of movements) {
    const quantity =
      Number(movement.quantity) || 0;

    if (
      movement.movementType ===
      "PROJECT_USAGE"
    ) {
      totalUsed += quantity;
    }

    if (
      movement.movementType ===
      "RETURN"
    ) {
      totalReturned += quantity;
    }
  }

  return {
    totalUsed,
    totalReturned,
    availableReturn:
      totalUsed - totalReturned,
  };
}
// =========================================
// QUOTATION CALCULATION HELPER
// =========================================

function calculateQuotationTotals(items, {
  discountType = null,
  discountValue = 0,
  taxType = null,
  taxRate = 0,
} = {}) {
  let subtotal = 0;

  for (const item of items) {
    const lineTotal =
      Number(item.lineTotal) || 0;

    if (lineTotal < 0) {
      throw new Error(
        "Quotation item total cannot be negative"
      );
    }

    subtotal += lineTotal;
  }

  subtotal =
    Math.round(subtotal * 100) / 100;

  const cleanDiscountValue =
    Number(discountValue) || 0;

  if (cleanDiscountValue < 0) {
    throw new Error(
      "Discount value cannot be negative"
    );
  }

  let discountAmount = 0;

  if (discountType === "PERCENT") {
    if (cleanDiscountValue > 100) {
      throw new Error(
        "Discount percentage cannot exceed 100"
      );
    }

    discountAmount =
      (subtotal * cleanDiscountValue) / 100;
  } else if (discountType === "FIXED") {
    discountAmount = cleanDiscountValue;
  } else if (discountType !== null) {
    throw new Error(
      "Invalid discount type"
    );
  }

  discountAmount =
    Math.round(discountAmount * 100) / 100;

  if (discountAmount > subtotal) {
    throw new Error(
      "Discount cannot be greater than subtotal"
    );
  }

  const taxableAmount =
    subtotal - discountAmount;

  const cleanTaxRate =
    Number(taxRate) || 0;

  if (cleanTaxRate < 0) {
    throw new Error(
      "Tax rate cannot be negative"
    );
  }

  let taxAmount = 0;

  if (taxType === "PERCENT") {
    if (cleanTaxRate > 100) {
      throw new Error(
        "Tax percentage cannot exceed 100"
      );
    }

    taxAmount =
      (taxableAmount * cleanTaxRate) / 100;
  } else if (taxType === "FIXED") {
    taxAmount = cleanTaxRate;
  } else if (taxType !== null) {
    throw new Error(
      "Invalid tax type"
    );
  }

  taxAmount =
    Math.round(taxAmount * 100) / 100;

  const grandTotal =
    Math.round(
      (subtotal -
        discountAmount +
        taxAmount) *
        100
    ) / 100;

  if (grandTotal < 0) {
    throw new Error(
      "Grand total cannot be negative"
    );
  }

  return {
    subtotal,
    discountAmount,
    taxAmount,
    grandTotal,
  };
}
// =========================================
// REFRESH QUOTATION TOTALS HELPER
// =========================================

async function refreshQuotationTotals(
  quotationId
) {
  const quotation =
    await prisma.quotation.findUnique({
      where: {
        id: quotationId,
      },
      include: {
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

  if (!quotation) {
    throw new Error(
      "Quotation not found"
    );
  }

  const totals =
    calculateQuotationTotals(
      quotation.items,
      {
        discountType:
          quotation.discountType,
        discountValue:
          quotation.discountValue,
        taxType:
          quotation.taxType,
        taxRate:
          quotation.taxRate,
      }
    );

  const updatedQuotation =
    await prisma.quotation.update({
      where: {
        id: quotationId,
      },
      data: {
        subtotal:
          totals.subtotal,

        discountAmount:
          totals.discountAmount,

        taxAmount:
          totals.taxAmount,

        grandTotal:
          totals.grandTotal,
      },
      include: {
        customer: true,
        project: true,
        items: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            material: true,
            boqItem: true,
          },
        },
        paymentMilestones: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

  return updatedQuotation;
}

// =========================================
// MIDDLEWARE
// =========================================

app.use(cors());
app.use(express.json());
// All business endpoints require an active login.
app.use("/api", (req,res,next) => {
  if ((req.method === "POST" && req.path === "/auth/login") || (req.method === "GET" && req.path === "/health")) return next();
  return authMiddleware(req,res,next);
});
require("./stock-safe").registerStock(app, prisma);
require("./billing").registerBilling(app, prisma, authMiddleware);
require("./payables").registerPayables(app, prisma, authMiddleware);
require("./project-profit").registerProjectProfit(app, prisma, authMiddleware);
require("./worker-advances").registerWorkerAdvances(app, prisma);
require("./job-costing").registerJobCosting(app, prisma);
require("./labour").registerLabour(app, prisma);
app.use(["/api/quotations", "/api/quotation-items", "/api/quotation-payment-milestones"], authMiddleware);
// =========================================
// AUTHENTICATION ROUTES
// =========================================

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        username: username.trim(),
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    const passwordMatched = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          status: user.status,
        },
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

// CURRENT AUTHENTICATED USER
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  return res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});
// =========================================
// AUTHENTICATION MIDDLEWARE
// =========================================

async function authMiddleware(req, res, next) {
  if (req.user) return next();
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User account is inactive",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    console.error("Authentication Middleware Error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
}
// =========================================
// HOME ROUTE
// =========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "BE Interior Finance Manager API is running!",
  });
});

// =========================================
// HEALTH CHECK
// =========================================

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      status: "OK",
      database: "Connected",
      message: "Server and database are healthy",
    });
  } catch (error) {
    console.error("Health Check Error:", error);

    res.status(500).json({
      success: false,
      status: "ERROR",
      database: "Disconnected",
      message: error.message,
    });
  }
});

// =========================================
// PROJECT ROUTES
// =========================================

// GET ALL PROJECTS
// GET ALL PROJECTS WITH PAGINATION
app.get("/api/projects", async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.project.count()) : allowedLimits.includes(
      limitValue
    )
      ? limitValue
      : 10;

    const skip = (page - 1) * limit;

    // Total projects
    const totalProjects =
      await prisma.project.count();

    // Projects for current page
    const projects =
      await prisma.project.findMany({
        include: {
          customer: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      });

    const totalPages = Math.max(
      Math.ceil(
        totalProjects / limit
      ),
      1
    );

    res.json({
      success: true,

      count: projects.length,

      data: projects,

      pagination: {
        page,
        limit,
        totalProjects,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Get Projects Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =========================================
// GET SINGLE PROJECT WITH SUMMARY
// =========================================

app.get("/api/projects/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await prisma.project.findUnique({
      where: {
        id,
      },

      include: {
        customer: true,
        // -----------------------------
        // TRANSACTIONS
        // -----------------------------
        transactions: {
          orderBy: {
            transactionDate: "desc",
          },
        },

        // -----------------------------
        // BOQ
        // -----------------------------
        boqs: {
          include: {
            items: true,
          },
        },

        // -----------------------------
        // PURCHASE REQUESTS
        // -----------------------------
        purchaseRequests: {
          include: {
            items: {
              include: {
                material: true,
              },
            },
          },
          orderBy: {
            id: "desc",
          },
        },

        // -----------------------------
        // RFQs
        // -----------------------------
        rfqs: {
          include: {
            items: {
              include: {
                material: true,
              },
            },

            vendors: {
              include: {
                vendor: true,
              },
            },

            awardedVendor: true,
          },

          orderBy: {
            id: "desc",
          },
        },

        // -----------------------------
        // PURCHASE ORDERS
        // -----------------------------
        purchaseOrders: {
          include: {
            vendor: true,

            rfq: true,

            items: {
              include: {
                material: true,
              },
            },

            purchase: true,
          },

          orderBy: {
            id: "desc",
          },
        },

        // -----------------------------
        // ACTUAL PURCHASES
        // -----------------------------
        purchases: {
          include: {
            vendor: true,

            items: {
              include: {
                material: true,
              },
            },
          },

          orderBy: {
            purchaseDate: "desc",
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // =========================================
    // FINANCIAL SUMMARY
    // =========================================

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const transaction of project.transactions) {
      const amount =
        Number(transaction.amount) || 0;

      if (transaction.type === "INCOME") {
        totalIncome += amount;
      }

     if (
      transaction.type === "EXPENSE" &&
      !["PURCHASE_PAYMENT", "WORKER_ADVANCE"].includes(transaction.source)
          ) {
            totalExpenses += amount;
          }


    }

    const balance =
      totalIncome - totalExpenses;

    // =========================================
    // PURCHASE SUMMARY
    // =========================================

    const totalPurchaseOrders =
      project.purchaseOrders.length;

    const totalPurchases =
      project.purchases.length;

    const totalPurchaseOrderValue =
      project.purchaseOrders.reduce(
        (sum, po) =>
          sum +
          (Number(po.grandTotal) || 0),
        0
      );

    const totalPurchaseValue =
      project.purchases.reduce(
        (sum, purchase) =>
          sum +
          (Number(purchase.grandTotal) || 0),
        0
      );

    // =========================================
    // RESPONSE
    // =========================================

    res.json({
      success: true,

      data: {
        ...project,

        summary: {
          totalIncome,
          totalExpenses,
          balance,

          totalBOQs:
            project.boqs.length,

          totalPurchaseRequests:
            project.purchaseRequests.length,

          totalRFQs:
            project.rfqs.length,

          totalPurchaseOrders,

          totalPurchases,

          totalPurchaseOrderValue,

          totalPurchaseValue,

          totalTransactions:
            project.transactions.length,
        },
      },
    });

  } catch (error) {
    console.error(
      "Get Project Details Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE PROJECT
app.post("/api/projects", async (req, res) => {
  try {
    const {
      name,
      customerId,
      contractValue,
      notes,
      status,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    let projectCustomerId = null;

if (
  customerId !== undefined &&
  customerId !== null &&
  customerId !== ""
) {
  projectCustomerId = Number(customerId);

  if (
    !Number.isInteger(projectCustomerId) ||
    projectCustomerId <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer ID",
    });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: projectCustomerId },
  });

  if (!customer) {
    return res.status(400).json({
      success: false,
      message: "Customer not found",
    });
  }
}
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        customerId: projectCustomerId,
        contractValue: contractValue
          ? Number(contractValue)
          : 0,
        notes: notes || null,
        status: status || "ONGOING",
      },
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    console.error("Create Project Error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A project with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE PROJECT
app.put("/api/projects/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      name,
      customerId,
      contractValue,
      notes,
      status,
    } = req.body;

    const existingProject = await prisma.project.findUnique({
      where: {
        id,
      },
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }
      let projectCustomerId = customerId === undefined ? existingProject.customerId : null;

      if (
        customerId !== undefined &&
        customerId !== null &&
        customerId !== ""
      ) {
        projectCustomerId = Number(customerId);

        if (
          !Number.isInteger(projectCustomerId) ||
          projectCustomerId <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid customer ID",
          });
        }

        const customer = await prisma.customer.findUnique({
          where: { id: projectCustomerId },
        });

        if (!customer) {
          return res.status(400).json({
            success: false,
            message: "Customer not found",
          });
        }
      }
    const project = await prisma.project.update({
      where: {
        id,
      },
      data: {
        name: name ? name.trim() : existingProject.name,
        customerId: projectCustomerId,
        contractValue:
          contractValue !== undefined
            ? Number(contractValue)
            : existingProject.contractValue,
        notes:
          notes !== undefined
            ? notes
            : existingProject.notes,
        status:
          status || existingProject.status,
      },
    });

    res.json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Update Project Error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A project with this name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE PROJECT
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existingProject = await prisma.project.findUnique({
      where: {
        id,
      },
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    await prisma.project.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete Project Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =========================================
// USER API
// =========================================

// GET ACTIVE USERS
// Used for assigning leads to office staff
app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        status: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =========================================
// LEAD API
// =========================================

// GET ALL LEADS WITH PAGINATION
app.get("/api/leads", authMiddleware, async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(1, Math.floor(Number(req.query.page) || 1));
    if (!Number.isSafeInteger(page)) return res.status(400).json({success:false,message:"Invalid page"});

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.lead.count()) : allowedLimits.includes(limitValue)
      ? limitValue
      : 10;

    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.search) where.OR = ['name','phone','email','companyName'].map(field => ({[field]: {contains: String(req.query.search)}}));
    const statuses = ['NEW','CONTACTED','QUALIFIED','MEETING','SITE_VISIT','QUOTATION','NEGOTIATION','WON','LOST','CONVERTED'];
    if (req.query.status) {
      if (!statuses.includes(req.query.status)) return res.status(400).json({success:false,message:'Invalid lead status'});
      where.status = req.query.status;
    }
    const totalLeads = await prisma.lead.count({where});

    const leads =
      await prisma.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          convertedCustomer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      });

    const totalPages =
      Math.max(1, Math.ceil(totalLeads / limit));

    res.json({
      success: true,
      count: leads.length,
      data: leads,
      pagination: {
        page,
        limit,
        totalLeads,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get Leads Error:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET SINGLE LEAD
app.get("/api/leads/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead =
      await prisma.lead.findUnique({
        where: {
          id,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          convertedCustomer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              companyName: true,
            },
          },
        },
      });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Get Lead Error:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE LEAD
app.post("/api/leads", authMiddleware, async (req, res) => {
  try {
    const invalid = validateContact(req.body);
    if (invalid) return res.status(400).json({success:false,message:invalid});
    const {
      name,
      phone,
      email,
      companyName,
      address,
      source,
      status,
      notes,
      assignedToId,
    } = req.body;

    // Required field
    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Lead name is required",
      });
    }

    // Validate source
    const allowedSources = [
      "FACEBOOK",
      "WEBSITE",
      "REFERRAL",
      "PHONE",
      "WALK_IN",
      "OTHER",
    ];

    if (
      source !== undefined &&
      source !== null &&
      !allowedSources.includes(source)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead source",
      });
    }

    // Validate status
    const allowedStatuses = [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "MEETING", "SITE_VISIT", "QUOTATION", "NEGOTIATION", "WON",
      "LOST",
      "CONVERTED",
    ];

    if (
      status !== undefined &&
      status !== null &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead status",
      });
    }

    // Converted lead must not be manually created
    if (status === "CONVERTED") {
      return res.status(400).json({
        success: false,
        message:
          "A lead can only become CONVERTED through the conversion process.",
      });
    }

    // Validate assigned user
    let validatedAssignedToId = null;

    if (
      assignedToId !== undefined &&
      assignedToId !== null &&
      assignedToId !== ""
    ) {
      const parsedAssignedToId =
        Number(assignedToId);

      if (
        !Number.isInteger(parsedAssignedToId) ||
        parsedAssignedToId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID",
        });
      }

      const assignedUser =
        await prisma.user.findUnique({
          where: {
            id: parsedAssignedToId,
          },
          select: {
            id: true,
            status: true,
          },
        });

      if (!assignedUser) {
        return res.status(400).json({
          success: false,
          message: "Assigned user not found",
        });
      }

      if (assignedUser.status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message:
            "Cannot assign lead to an inactive user",
        });
      }

      validatedAssignedToId =
        parsedAssignedToId;
    }

    const lead =
      await prisma.lead.create({
        data: {
          name: name.trim(),
          phone:
            typeof phone === "string" &&
            phone.trim()
              ? phone.trim()
              : null,
          email:
            typeof email === "string" &&
            email.trim()
              ? email.trim()
              : null,
          companyName:
            typeof companyName === "string" &&
            companyName.trim()
              ? companyName.trim()
              : null,
          address:
            typeof address === "string" &&
            address.trim()
              ? address.trim()
              : null,
          source: source || "OTHER",
          status: status || "NEW",
          notes:
            typeof notes === "string" &&
            notes.trim()
              ? notes.trim()
              : null,
          assignedToId:
            validatedAssignedToId,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });

    res.status(201).json({
      success: true,
      message: "Lead created successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Create Lead Error:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE LEAD
app.put("/api/leads/:id", authMiddleware, async (req, res) => {
  try {
    const invalid = validateContact(req.body);
    if (invalid) return res.status(400).json({success:false,message:invalid});
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const existingLead =
      await prisma.lead.findUnique({
        where: {
          id,
        },
      });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    // Converted leads should remain historical records
    if (existingLead.status === "CONVERTED") {
      return res.status(400).json({
        success: false,
        message:
          "Converted lead cannot be edited.",
      });
    }

    const {
      name,
      phone,
      email,
      companyName,
      address,
      source,
      status,
      notes,
      assignedToId,
    } = req.body;

    if (
      name !== undefined &&
      (
        typeof name !== "string" ||
        !name.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Lead name is required",
      });
    }

    const allowedSources = [
      "FACEBOOK",
      "WEBSITE",
      "REFERRAL",
      "PHONE",
      "WALK_IN",
      "OTHER",
    ];

    if (
      source !== undefined &&
      !allowedSources.includes(source)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead source",
      });
    }

    const allowedStatuses = [
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "MEETING", "SITE_VISIT", "QUOTATION", "NEGOTIATION", "WON",
      "LOST",
    ];

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid lead status for manual update",
      });
    }

    // Validate assigned user
    let validatedAssignedToId =
      existingLead.assignedToId;

    if (
      assignedToId !== undefined
    ) {
      if (
        assignedToId === null ||
        assignedToId === ""
      ) {
        validatedAssignedToId = null;
      } else {
        const parsedAssignedToId =
          Number(assignedToId);

        if (
          !Number.isInteger(parsedAssignedToId) ||
          parsedAssignedToId <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid assigned user ID",
          });
        }

        const assignedUser =
          await prisma.user.findUnique({
            where: {
              id: parsedAssignedToId,
            },
            select: {
              id: true,
              status: true,
            },
          });

        if (!assignedUser) {
          return res.status(400).json({
            success: false,
            message:
              "Assigned user not found",
          });
        }

        if (
          assignedUser.status !== "ACTIVE"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Cannot assign lead to an inactive user",
          });
        }

        validatedAssignedToId =
          parsedAssignedToId;
      }
    }

    const lead =
      await prisma.lead.update({
        where: {
          id,
        },
        data: {
          ...(name !== undefined && {
            name: name.trim(),
          }),
          ...(phone !== undefined && {
            phone:
              typeof phone === "string" &&
              phone.trim()
                ? phone.trim()
                : null,
          }),
          ...(email !== undefined && {
            email:
              typeof email === "string" &&
              email.trim()
                ? email.trim()
                : null,
          }),
          ...(companyName !== undefined && {
            companyName:
              typeof companyName === "string" &&
              companyName.trim()
                ? companyName.trim()
                : null,
          }),
          ...(address !== undefined && {
            address:
              typeof address === "string" &&
              address.trim()
                ? address.trim()
                : null,
          }),
          ...(source !== undefined && {
            source,
          }),
          ...(status !== undefined && {
            status,
          }),
          ...(notes !== undefined && {
            notes:
              typeof notes === "string" &&
              notes.trim()
                ? notes.trim()
                : null,
          }),
          assignedToId:
            validatedAssignedToId,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });

    res.json({
      success: true,
      message: "Lead updated successfully",
      data: lead,
    });
  } catch (error) {
    console.error("Update Lead Error:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE LEAD
app.delete("/api/leads/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const existingLead =
      await prisma.lead.findUnique({
        where: {
          id,
        },
      });

    if (!existingLead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    if (existingLead.status === "CONVERTED") {
      return res.status(400).json({
        success: false,
        message:
          "Converted lead cannot be deleted.",
      });
    }

    await prisma.lead.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Delete Lead Error:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// CONVERT LEAD TO CUSTOMER
app.post(
  "/api/leads/:id/convert",
  authMiddleware,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid lead ID",
        });
      }

      const existingLead =
        await prisma.lead.findUnique({
          where: {
            id,
          },
        });

      if (!existingLead) {
        return res.status(404).json({
          success: false,
          message: "Lead not found",
        });
      }

      if (
        existingLead.status === "CONVERTED" ||
        existingLead.convertedCustomerId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This lead has already been converted.",
        });
      }

      if (existingLead.status === "LOST") {
        return res.status(400).json({
          success: false,
          message:
            "A lost lead cannot be converted.",
        });
      }

      const customerType =
        existingLead.companyName &&
        existingLead.companyName.trim()
          ? "COMPANY"
          : "INDIVIDUAL";

      const result =
        await prisma.$transaction(
          async (tx) => {
            const claimed = await tx.lead.updateMany({where:{id, status:existingLead.status, updatedAt:existingLead.updatedAt, convertedCustomerId:null}, data:{status:'CONVERTED'}});
            if (claimed.count !== 1) throw Object.assign(new Error('Lead changed or was already converted. Refresh and retry.'), {status:409});
            const customer =
              await tx.customer.create({
                data: {
                  name: existingLead.name,
                  phone: existingLead.phone,
                  email: existingLead.email,
                  companyName:
                    existingLead.companyName,
                  address: existingLead.address,
                  source: existingLead.source,
                  customerType,
                  status: "ACTIVE",
                  notes: existingLead.notes,
                },
              });

            const updatedLead =
              await tx.lead.update({
                where: {
                  id,
                },
                data: {
                  status: "CONVERTED",
                  convertedCustomerId:
                    customer.id,
                  convertedAt: new Date(),
                },
                include: {
                  assignedTo: {
                    select: {
                      id: true,
                      name: true,
                      username: true,
                    },
                  },
                  convertedCustomer: {
                    select: {
                      id: true,
                      name: true,
                      phone: true,
                      email: true,
                      companyName: true,
                    },
                  },
                },
              });

            return {
              customer,
              lead: updatedLead,
            };
          }
        );

      res.json({
        success: true,
        message:
          "Lead converted to customer successfully",
        data: result,
      });
    } catch (error) {
      console.error(
        "Convert Lead Error:",
        error
      );

      res.status(error.status || 500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// =========================================
// CUSTOMER API
// =========================================

// GET ALL CUSTOMERS WITH PAGINATION
app.get("/api/customers", authMiddleware, async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(1, Math.floor(Number(req.query.page) || 1));
    if (!Number.isSafeInteger(page)) return res.status(400).json({success:false,message:"Invalid page"});

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.customer.count()) : allowedLimits.includes(limitValue)
      ? limitValue
      : 10;

    const skip = (page - 1) * limit;

    const totalCustomers =
      await prisma.customer.count();

    const customers =
      await prisma.customer.findMany({
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      });

    const totalPages = Math.max(
      Math.ceil(totalCustomers / limit),
      1
    );

    res.json({
      success: true,
      count: customers.length,
      data: customers,
      pagination: {
        page,
        limit,
        totalCustomers,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get Customers Error:", error);

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});


// GET SINGLE CUSTOMER WITH PROJECTS
app.get("/api/customers/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer =
      await prisma.customer.findUnique({
        where: {
          id,
        },
        include: {
          quotations: {orderBy:{createdAt:"desc"}},
          convertedLeads: {select:{id:true, source:true, status:true}},
          invoices: {include:{payments:true},orderBy:{id:"desc"}},
          projects: {
            include: {transactions:{where:{type:"INCOME"}, orderBy:{transactionDate:"desc"}}},
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      data: {...customer, invoices: customer.invoices.map(require("./billing").present), financials: customerFinancials(customer.projects)},
    });
  } catch (error) {
    console.error(
      "Get Customer Details Error:",
      error
    );

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE CUSTOMER
app.post("/api/customers", authMiddleware, async (req, res) => {
  try {
    const invalid = validateContact(req.body);
    if (invalid) return res.status(400).json({success:false,message:invalid});
    const {
      name,
      phone,
      email,
      companyName,
      address,
      customerType,
      source,
      status,
      notes,
    } = req.body;

    // Name is required
    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    // Validate customer type
    const validCustomerTypes = [
      "INDIVIDUAL",
      "COMPANY",
    ];

    if (
      customerType !== undefined &&
      !validCustomerTypes.includes(customerType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer type. Use INDIVIDUAL or COMPANY",
      });
    }

    // Validate status
    const validStatuses = [
      "ACTIVE",
      "INACTIVE",
    ];

    if (
      status !== undefined &&
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer status. Use ACTIVE or INACTIVE",
      });
    }

    const customer =
      await prisma.customer.create({
        data: {
          name: name.trim(),
          ...(source !== undefined && {source}),

          phone:
            phone?.trim() || null,

          email:
            email?.trim() || null,

          companyName:
            companyName?.trim() || null,

          address:
            address?.trim() || null,

          customerType:
            customerType || "INDIVIDUAL",

          status:
            status || "ACTIVE",

          notes:
            notes?.trim() || null,
        },
      });

    res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error(
      "Create Customer Error:",
      error
    );

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});


// UPDATE CUSTOMER
app.put("/api/customers/:id", authMiddleware, async (req, res) => {
  try {
    const invalid = validateContact(req.body);
    if (invalid) return res.status(400).json({success:false,message:invalid});
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const {
      name,
      phone,
      email,
      companyName,
      address,
      customerType,
      source,
      status,
      notes,
    } = req.body;

    const existingCustomer =
      await prisma.customer.findUnique({
        where: {
          id,
        },
      });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const validCustomerTypes = [
      "INDIVIDUAL",
      "COMPANY",
    ];

    if (
      customerType !== undefined &&
      !validCustomerTypes.includes(customerType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer type. Use INDIVIDUAL or COMPANY",
      });
    }

    const validStatuses = [
      "ACTIVE",
      "INACTIVE",
    ];

    if (
      status !== undefined &&
      !validStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid customer status. Use ACTIVE or INACTIVE",
      });
    }

    const customer =
      await prisma.customer.update({
        where: {
          id,
        },
        data: {
          name: name.trim(),
          ...(source !== undefined && {source}),

          phone:
            phone?.trim() || null,

          email:
            email?.trim() || null,

          companyName:
            companyName?.trim() || null,

          address:
            address?.trim() || null,

          customerType:
            customerType ||
            existingCustomer.customerType,

          status:
            status ||
            existingCustomer.status,

          notes:
            notes?.trim() || null,
        },
      });

    res.json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error(
      "Update Customer Error:",
      error
    );

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});


// DELETE CUSTOMER
app.delete("/api/customers/:id", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const existingCustomer =
      await prisma.customer.findUnique({
        where: {
          id,
        },
        include: {
          quotations: {select:{id:true}},
          convertedLeads: {select:{id:true}},
          projects: {
            select: {
              id: true,
            },
          },
        },
      });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Do not delete a customer with linked projects
    if (existingCustomer.projects.length || existingCustomer.quotations.length || existingCustomer.convertedLeads.length) {
      return res.status(400).json({
        success: false,
        message:
          "This customer has linked projects, quotations or lead history. Mark it inactive instead.",
      });
    }

    await prisma.customer.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Customer Error:",
      error
    );

    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
});
// =========================================
// DASHBOARD API
// =========================================

app.get("/api/dashboard", async (req, res) => {
  try {
    const totalProjects = await prisma.project.count();
    const totalCustomers = await prisma.customer.count();

const activeCustomers = await prisma.customer.count({
  where: {
    status: "ACTIVE",
  },
});

const inactiveCustomers = await prisma.customer.count({
  where: {
    status: "INACTIVE",
  },
});

const customersWithProjects = await prisma.customer.count({
  where: {
    projects: {
      some: {},
    },
  },
});

const customersWithoutProjects =
  totalCustomers - customersWithProjects;

    const incomeResult = await prisma.transaction.aggregate({
      where: {
        type: "INCOME",
      },
      _sum: {
        amount: true,
      },
    });

      const expenseResult = await prisma.transaction.aggregate({
        where: {
          type: "EXPENSE",
          source: {
            in: ["MANUAL", "PURCHASE"],
          },
        },
        _sum: {
          amount: true,
        },
      });

    const totalIncome = Number(
      incomeResult._sum.amount || 0
    );

    const totalExpenses = Number(
      expenseResult._sum.amount || 0
    );

    const cashExpenses = await prisma.transaction.aggregate({where:{type:"EXPENSE",source:{notIn:["PURCHASE","PURCHASE_PAYMENT"]}},_sum:{amount:true}});
    const vendorPayments = await prisma.purchasePayment.aggregate({_sum:{amount:true}});
    const totalCashPaid = Number(cashExpenses._sum.amount || 0) + Number(vendorPayments._sum.amount || 0);

    const recentProjects = await prisma.project.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    res.json({
      success: true,
     data: {
        totalProjects,
        totalIncome,
        totalExpenses,
        currentBalance: totalIncome - totalCashPaid,
        totalCashPaid,

        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        customersWithProjects,
        customersWithoutProjects,

        recentProjects,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});






// =========================================
// CATEGORY API
// =========================================



// GET ALL ACTIVE CATEGORIES
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error(
      "Get Categories Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// ADD CATEGORY
app.post("/api/categories", async (req, res) => {
  try {
    const {
      name,
      type,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    if (!["INCOME", "EXPENSE"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Category type must be INCOME or EXPENSE",
      });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        type,
        status: "ACTIVE",
      },
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create Category Error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "This category already exists for this type",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =========================================
// UPDATE CATEGORY
// =========================================

app.put("/api/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      name,
      type,
      status,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    if (!["INCOME", "EXPENSE"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Category type must be INCOME or EXPENSE",
      });
    }

    const existingCategory =
      await prisma.category.findUnique({
        where: {
          id,
        },
      });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const category =
      await prisma.category.update({
        where: {
          id,
        },
        data: {
          name: name.trim(),
          type,
          status: status || existingCategory.status,
        },
      });

    res.json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error(
      "Update Category Error:",
      error
    );

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message:
          "This category already exists for this type",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =========================================
// DELETE CATEGORY
// =========================================

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existingCategory =
      await prisma.category.findUnique({
        where: {
          id,
        },
      });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await prisma.category.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Category Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});



// GET ALL ACTIVE EXPENSE CATEGORIES
app.get("/api/categories/expense", async (req, res) => {
  try {
    const categories =
      await prisma.category.findMany({
        where: {
          type: "EXPENSE",
          status: "ACTIVE",
        },

        orderBy: {
          name: "asc",
        },
      });

    res.json({
      success: true,
      data: categories,
    });

  } catch (error) {
    console.error(
      "Get Expense Categories Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});





// =========================================
// MATERIAL CATEGORIES
// =========================================


// GET ACTIVE MATERIAL CATEGORIES WITH PAGINATION
app.get("/api/material-categories", async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 5;

    const allowedLimits = [5, 10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.materialCategory.count()) : allowedLimits.includes(
      limitValue
    )
      ? limitValue
      : 5;

    const skip = (page - 1) * limit;

    const totalRecords =
      await prisma.materialCategory.count({
        where: {
          status: "ACTIVE",
        },
      });

    const categories =
      await prisma.materialCategory.findMany({
        where: {
          status: "ACTIVE",
        },

        orderBy: {
          name: "asc",
        },

        skip,
        take: limit,
      });

    const totalPages = Math.max(
      Math.ceil(totalRecords / limit),
      1
    );

    res.json({
      success: true,

      data: categories,

      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
    });

  } catch (error) {
    console.error(
      "Get Material Categories Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});




// ADD MATERIAL CATEGORY
app.post("/api/material-categories", async (req, res) => {
  try {
    const {
      name,
      description,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message:
          "Material category name is required",
      });
    }

    const category =
      await prisma.materialCategory.create({
        data: {
          name: name.trim(),
          description:
            description?.trim() || null,
          status: "ACTIVE",
        },
      });

    res.status(201).json({
      success: true,
      message:
        "Material category created successfully",
      data: category,
    });

  } catch (error) {
    console.error(
      "Create Material Category Error:",
      error
    );

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message:
          "This material category already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// UPDATE MATERIAL CATEGORY
app.put(
  "/api/material-categories/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const {
        name,
        description,
        status,
      } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({
          success: false,
          message:
            "Material category name is required",
        });
      }

      const existingCategory =
        await prisma.materialCategory.findUnique({
          where: {
            id,
          },
        });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message:
            "Material category not found",
        });
      }

      const category =
        await prisma.materialCategory.update({
          where: {
            id,
          },
          data: {
            name: name.trim(),
            description:
              description?.trim() || null,
            status:
              status || existingCategory.status,
          },
        });

      res.json({
        success: true,
        message:
          "Material category updated successfully",
        data: category,
      });

    } catch (error) {
      console.error(
        "Update Material Category Error:",
        error
      );

      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message:
            "This material category already exists",
        });
      }

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// DELETE MATERIAL CATEGORY
app.delete(
  "/api/material-categories/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const existingCategory =
        await prisma.materialCategory.findUnique({
          where: {
            id,
          },
        });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message:
            "Material category not found",
        });
      }

      await prisma.materialCategory.delete({
        where: {
          id,
        },
      });

      res.json({
        success: true,
        message:
          "Material category deleted successfully",
      });

    } catch (error) {
      console.error(
        "Delete Material Category Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);








// =========================================
// MATERIAL API
// =========================================





// GET ALL ACTIVE MATERIALS WITH PAGINATION
app.get("/api/materials", async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.material.count()) : allowedLimits.includes(
      limitValue
    )
      ? limitValue
      : 10;

    const skip = (page - 1) * limit;

    const totalMaterials =
      await prisma.material.count({
        where: {
          status: "ACTIVE",
        },
      });

const materials =
  await prisma.material.findMany({
    where: {
      status: "ACTIVE",
    },

    include: {
      category: true,

      stockMovements: {
        select: {
          movementType: true,
          quantity: true,
        },
      },
    },

    orderBy: {
      name: "asc",
    },

    skip,
    take: limit,
  });

const materialsWithStock = materials.map(
  (material) => {
    let currentStock = 0;

    for (const movement of material.stockMovements) {
      const quantity =
        Number(movement.quantity) || 0;

      switch (movement.movementType) {
        case "PURCHASE":
        case "RETURN":
          currentStock += quantity;
          break;

        case "PROJECT_USAGE":
        case "DAMAGE":
          currentStock -= quantity;
          break;

        case "ADJUSTMENT":
          currentStock += quantity;
          break;

        default:
          break;
      }
    }

    const {
      stockMovements,
      ...materialData
    } = material;

    return {
      ...materialData,
      currentStock,
    };
  }
);


    const totalPages = Math.max(
      Math.ceil(
        totalMaterials / limit
      ),
      1
    );

    res.json({
      success: true,

      data: materialsWithStock,

      pagination: {
        page,
        limit,
        totalMaterials,
        totalPages,
      },
    });

  } catch (error) {
    console.error(
      "Get Materials Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// GET SINGLE MATERIAL
app.get("/api/materials/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const material =
      await prisma.material.findUnique({
        where: {
          id,
        },

        include: {
          category: true,

          vendorPrices: {
            include: {
              vendor: true,
            },

            orderBy: {
              unitPrice: "asc",
            },
          },
        },
      });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    res.json({
      success: true,
      data: material,
    });

  } catch (error) {
    console.error(
      "Get Material Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// CREATE MATERIAL
app.post("/api/materials", async (req, res) => {
  try {
    const {
      code,
      name,
      categoryId,
      subCategory,
      brand,
      modelCode,
      specification,
      color,
      size,
      unit,
      description,
    } = req.body;

    if (!code || code.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Material code is required",
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Material name is required",
      });
    }

    if (!unit || unit.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Material unit is required",
      });
    }

    if (categoryId) {
      const category =
        await prisma.materialCategory.findUnique({
          where: {
            id: Number(categoryId),
          },
        });

      if (!category) {
        return res.status(400).json({
          success: false,
          message:
            "Material category not found",
        });
      }
    }

    const material =
      await prisma.material.create({
        data: {
          code: code.trim(),
          name: name.trim(),

          categoryId: categoryId
            ? Number(categoryId)
            : null,

          subCategory:
            subCategory?.trim() || null,

          brand:
            brand?.trim() || null,

          modelCode:
            modelCode?.trim() || null,

          specification:
            specification?.trim() || null,

          color:
            color?.trim() || null,

          size:
            size?.trim() || null,

          unit: unit.trim(),

          description:
            description?.trim() || null,

          status: "ACTIVE",
        },

        include: {
          category: true,
        },
      });

    res.status(201).json({
      success: true,
      message: "Material created successfully",
      data: material,
    });

  } catch (error) {
    console.error(
      "Create Material Error:",
      error
    );

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message:
          "Material code already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// UPDATE MATERIAL
app.put("/api/materials/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      code,
      name,
      categoryId,
      subCategory,
      brand,
      modelCode,
      specification,
      color,
      size,
      unit,
      description,
      status,
    } = req.body;

    const existingMaterial =
      await prisma.material.findUnique({
        where: {
          id,
        },
      });

    if (!existingMaterial) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    if (!code || code.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Material code is required",
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Material name is required",
      });
    }

    if (!unit || unit.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Material unit is required",
      });
    }

    if (categoryId) {
      const category =
        await prisma.materialCategory.findUnique({
          where: {
            id: Number(categoryId),
          },
        });

      if (!category) {
        return res.status(400).json({
          success: false,
          message:
            "Material category not found",
        });
      }
    }

    const material =
      await prisma.material.update({
        where: {
          id,
        },

        data: {
          code: code.trim(),
          name: name.trim(),

          categoryId: categoryId
            ? Number(categoryId)
            : null,

          subCategory:
            subCategory?.trim() || null,

          brand:
            brand?.trim() || null,

          modelCode:
            modelCode?.trim() || null,

          specification:
            specification?.trim() || null,

          color:
            color?.trim() || null,

          size:
            size?.trim() || null,

          unit: unit.trim(),

          description:
            description?.trim() || null,

          status:
            status || existingMaterial.status,
        },

        include: {
          category: true,
        },
      });

    res.json({
      success: true,
      message: "Material updated successfully",
      data: material,
    });

  } catch (error) {
    console.error(
      "Update Material Error:",
      error
    );

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message:
          "Material code already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// DELETE MATERIAL
app.delete(
  "/api/materials/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const existingMaterial =
        await prisma.material.findUnique({
          where: {
            id,
          },
        });

      if (!existingMaterial) {
        return res.status(404).json({
          success: false,
          message: "Material not found",
        });
      }

      await prisma.material.delete({
        where: {
          id,
        },
      });

      res.json({
        success: true,
        message:
          "Material deleted successfully",
      });

    } catch (error) {
      console.error(
        "Delete Material Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// =========================================
// BOQ API
// =========================================

// GET ALL BOQS
app.get("/api/boqs", async (req, res) => {
  try {
    const boqs = await prisma.bOQ.findMany({
      include: {
        project: true,
        items: {
          include: {
            material: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: boqs,
    });
  } catch (error) {
    console.error("Get BOQs Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET SINGLE BOQ
app.get("/api/boqs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BOQ ID",
      });
    }

    const boq = await prisma.bOQ.findUnique({
      where: {
        id,
      },
      include: {
        project: true,
        items: {
          include: {
            material: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!boq) {
      return res.status(404).json({
        success: false,
        message: "BOQ not found",
      });
    }

    res.json({
      success: true,
      data: boq,
    });
  } catch (error) {
    console.error("Get BOQ Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE BOQ
app.post("/api/boqs", async (req, res) => {
  try {
    const {
      boqNo,
      name,
      projectId,
      status,
      notes,
    } = req.body;

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------

    if (!boqNo || boqNo.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "BOQ number is required",
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "BOQ name is required",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project is required",
      });
    }

    // -----------------------------
    // VERIFY PROJECT
    // -----------------------------

    const project = await prisma.project.findUnique({
      where: {
        id: Number(projectId),
      },
    });

    if (!project) {
      return res.status(400).json({
        success: false,
        message: "Project not found",
      });
    }



const allowedBOQStatuses = [
  "DRAFT",
  "FINAL",
  "APPROVED",
  "CANCELLED",
];

const boqStatus = status || "DRAFT";

if (!allowedBOQStatuses.includes(boqStatus)) {
  return res.status(400).json({
    success: false,
    message: "Invalid BOQ status",
  });
}

    // -----------------------------
    // CREATE BOQ
    // -----------------------------

    const boq = await prisma.bOQ.create({
      data: {
        boqNo: boqNo.trim(),
        name: name.trim(),
        projectId: Number(projectId),
       // status: status || "DRAFT",//
        status: boqStatus,

        notes: notes || null,
      },
      include: {
        project: true,
        items: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "BOQ created successfully",
      data: boq,
    });
  } catch (error) {
    console.error("Create BOQ Error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A BOQ with this number already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =========================================
// UPDATE BOQ
// =========================================

app.put("/api/boqs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      boqNo,
      name,
      projectId,
      status,
      notes,
    } = req.body;

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid BOQ ID",
      });
    }

    if (!boqNo || !boqNo.trim()) {
      return res.status(400).json({
        success: false,
        message: "BOQ number is required",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "BOQ name is required",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project is required",
      });
    }

    // -----------------------------
    // VALIDATE STATUS
    // -----------------------------

    const allowedBOQStatuses = [
      "DRAFT",
      "FINAL",
      "APPROVED",
      "CANCELLED",
    ];

    const boqStatus = status || "DRAFT";

    if (!allowedBOQStatuses.includes(boqStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BOQ status",
      });
    }

    // -----------------------------
    // FIND EXISTING BOQ
    // -----------------------------

    const existingBOQ =
      await prisma.bOQ.findUnique({
        where: {
          id,
        },
      });

    if (!existingBOQ) {
      return res.status(404).json({
        success: false,
        message: "BOQ not found",
      });
    }

    // -----------------------------
    // CHECK PROJECT
    // -----------------------------

    const project =
      await prisma.project.findUnique({
        where: {
          id: Number(projectId),
        },
      });

    if (!project) {
      return res.status(400).json({
        success: false,
        message: "Project not found",
      });
    }

    // -----------------------------
    // DUPLICATE BOQ NUMBER
    // -----------------------------

    const duplicateBOQ =
      await prisma.bOQ.findFirst({
        where: {
          boqNo: boqNo.trim(),

          NOT: {
            id,
          },
        },
      });

    if (duplicateBOQ) {
      return res.status(400).json({
        success: false,
        message:
          "A BOQ with this number already exists",
      });
    }

    // -----------------------------
    // UPDATE BOQ
    // -----------------------------

    const updatedBOQ =
      await prisma.bOQ.update({
        where: {
          id,
        },

        data: {
          boqNo: boqNo.trim(),

          name: name.trim(),

          projectId:
            Number(projectId),

          status:
            boqStatus,

          notes:
            notes?.trim() || null,
        },

        include: {
          project: true,

          items: {
            include: {
              material: true,
            },

            orderBy: {
              id: "asc",
            },
          },
        },
      });

    res.json({
      success: true,

      message:
        "BOQ updated successfully",

      data: updatedBOQ,
    });

 } catch (error) {
  console.error("Update BOQ Error FULL:");
  console.error("message:", error.message);
  console.error("code:", error.code);
  console.error("meta:", error.meta);
  console.error("stack:", error.stack);

  res.status(500).json({
    success: false,
    message:
      error.message || "BOQ update করা যায়নি!",
    code: error.code || null,
    meta: error.meta || null,
  });
}
});

// DELETE BOQ
app.delete("/api/boqs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BOQ ID",
      });
    }

    const existingBOQ = await prisma.bOQ.findUnique({
      where: {
        id,
      },
    });

    if (!existingBOQ) {
      return res.status(404).json({
        success: false,
        message: "BOQ not found",
      });
    }

    await prisma.bOQ.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "BOQ deleted successfully",
    });
  } catch (error) {
    console.error("Delete BOQ Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =========================================
// BOQ ITEM API
// =========================================

// GET ALL ITEMS OF A BOQ
app.get("/api/boqs/:id/items", async (req, res) => {
  try {
    const boqId = Number(req.params.id);

    if (!Number.isInteger(boqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BOQ ID",
      });
    }

    const boq = await prisma.bOQ.findUnique({
      where: {
        id: boqId,
      },
    });

    if (!boq) {
      return res.status(404).json({
        success: false,
        message: "BOQ not found",
      });
    }

    const items = await prisma.bOQItem.findMany({
      where: {
        boqId,
      },
      include: {
        material: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Get BOQ Items Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// CREATE BOQ ITEM
app.post("/api/boqs/:id/items", async (req, res) => {
  try {
    const boqId = Number(req.params.id);

    const {
      materialId,
      description,
      quantity,
      unit,
      estimatedUnitPrice,
      notes,
    } = req.body;

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------

    if (!Number.isInteger(boqId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BOQ ID",
      });
    }

    if (!materialId) {
      return res.status(400).json({
        success: false,
        message: "Material is required",
      });
    }

    if (
      quantity === undefined ||
      quantity === null ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!unit || unit.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Unit is required",
      });
    }

    if (
      estimatedUnitPrice === undefined ||
      estimatedUnitPrice === null ||
      Number(estimatedUnitPrice) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Estimated unit price cannot be negative",
      });
    }

    // -----------------------------
    // VERIFY BOQ
    // -----------------------------

    const boq = await prisma.bOQ.findUnique({
      where: {
        id: boqId,
      },
    });

    if (!boq) {
      return res.status(404).json({
        success: false,
        message: "BOQ not found",
      });
    }

    // -----------------------------
    // VERIFY MATERIAL
    // -----------------------------

    const material = await prisma.material.findUnique({
      where: {
        id: Number(materialId),
      },
    });

    if (!material) {
      return res.status(400).json({
        success: false,
        message: "Material not found",
      });
    }

    // -----------------------------
    // CALCULATE TOTAL
    // -----------------------------

    const cleanQuantity = Number(quantity);
    const cleanUnitPrice = Number(estimatedUnitPrice);

    const estimatedTotal =
      Math.round(
        cleanQuantity * cleanUnitPrice * 100
      ) / 100;

    // -----------------------------
    // CREATE ITEM
    // -----------------------------

    const item = await prisma.bOQItem.create({
      data: {
        boqId,
        materialId: Number(materialId),

        description:
          description && description.trim() !== ""
            ? description.trim()
            : null,

        quantity: cleanQuantity,
        unit: unit.trim(),

        estimatedUnitPrice: cleanUnitPrice,
        estimatedTotal,

        notes:
          notes && notes.trim() !== ""
            ? notes.trim()
            : null,
      },

      include: {
        material: true,
        boq: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "BOQ item created successfully",
      data: item,
    });
  } catch (error) {
    console.error("Create BOQ Item Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// UPDATE BOQ ITEM
app.put("/api/boq-items/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      materialId,
      description,
      quantity,
      unit,
      estimatedUnitPrice,
      notes,
    } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BOQ item ID",
      });
    }

    // -----------------------------
    // FIND ITEM
    // -----------------------------

    const existingItem = await prisma.bOQItem.findUnique({
      where: {
        id,
      },
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "BOQ item not found",
      });
    }

    // -----------------------------
    // VALIDATE MATERIAL
    // -----------------------------

    if (!materialId) {
      return res.status(400).json({
        success: false,
        message: "Material is required",
      });
    }

    const material = await prisma.material.findUnique({
      where: {
        id: Number(materialId),
      },
    });

    if (!material) {
      return res.status(400).json({
        success: false,
        message: "Material not found",
      });
    }

    // -----------------------------
    // VALIDATE QUANTITY
    // -----------------------------

    if (
      quantity === undefined ||
      quantity === null ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    // -----------------------------
    // VALIDATE UNIT
    // -----------------------------

    if (!unit || unit.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Unit is required",
      });
    }

    // -----------------------------
    // VALIDATE PRICE
    // -----------------------------

    if (
      estimatedUnitPrice === undefined ||
      estimatedUnitPrice === null ||
      Number(estimatedUnitPrice) < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Estimated unit price cannot be negative",
      });
    }

    // -----------------------------
    // CALCULATE TOTAL
    // -----------------------------

    const cleanQuantity = Number(quantity);
    const cleanUnitPrice = Number(estimatedUnitPrice);

    const estimatedTotal =
      Math.round(
        cleanQuantity * cleanUnitPrice * 100
      ) / 100;

    // -----------------------------
    // UPDATE ITEM
    // -----------------------------

    const updatedItem =
      await prisma.bOQItem.update({
        where: {
          id,
        },

        data: {
          materialId: Number(materialId),

          description:
            description &&
            description.trim() !== ""
              ? description.trim()
              : null,

          quantity: cleanQuantity,
          unit: unit.trim(),

          estimatedUnitPrice: cleanUnitPrice,
          estimatedTotal,

          notes:
            notes && notes.trim() !== ""
              ? notes.trim()
              : null,
        },

        include: {
          material: true,
          boq: true,
        },
      });

    res.json({
      success: true,
      message: "BOQ item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Update BOQ Item Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// DELETE BOQ ITEM
app.delete("/api/boq-items/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid BOQ item ID",
      });
    }

    const existingItem =
      await prisma.bOQItem.findUnique({
        where: {
          id,
        },
      });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "BOQ item not found",
      });
    }

    await prisma.bOQItem.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "BOQ item deleted successfully",
    });
  } catch (error) {
    console.error("Delete BOQ Item Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =========================================
// QUOTATION API
// =========================================

// GET ALL QUOTATIONS
// Create a project once an accepted quotation is ready for delivery.
app.post("/api/quotations/:id/project", authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = req.body?.name;
    if (!Number.isSafeInteger(id) || id <= 0 || typeof name !== "string" || !name.trim() || name.trim().length > 150) {
      return res.status(400).json({success:false,message:"Valid quotation ID and project name (up to 150 characters) are required"});
    }
    const project = await prisma.$transaction(async tx => {
      const quotation = await tx.quotation.findUnique({where:{id}, include:{customer:true}});
      if (!quotation) throw Object.assign(new Error("Quotation not found"), {status:404});
      if (quotation.projectId) throw Object.assign(new Error("Quotation already has a linked project"), {status:409});
      const rootId = quotation.originalQuotationId || quotation.id;
      const family = await tx.quotation.findMany({where:{OR:[{id:rootId},{originalQuotationId:rootId}]}});
      if (family.some(q => q.revisionNo > quotation.revisionNo || q.projectId)) {
        throw Object.assign(new Error("Use the latest accepted revision; this quotation family may already have a project"), {status:409});
      }
      if (quotation.status !== "ACCEPTED" || quotation.customer.status !== "ACTIVE") {
        throw Object.assign(new Error("An accepted quotation and active customer are required"), {status:400});
      }
      const created = await tx.project.create({data:{name:name.trim(), customerId:quotation.customerId, contractValue:quotation.grandTotal, notes:`Created from quotation ${quotation.quotationNo}`}});
      const linked = await tx.quotation.updateMany({where:{id, projectId:null, status:"ACCEPTED", updatedAt:quotation.updatedAt}, data:{projectId:created.id}});
      if (linked.count !== 1) throw Object.assign(new Error("Quotation changed. Refresh and retry."), {status:409});
      return created;
    });
    res.status(201).json({success:true,data:project});
  } catch (error) {
    res.status(error.code === "P2002" ? 409 : error.status || 500).json({success:false,message:error.code === "P2002" ? "Project name already exists" : error.message});
  }
});

app.get("/api/quotations", async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        customer: true,
        project: true,
        items: {
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            material: true,
            boqItem: true,
          },
        },
        paymentMilestones: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: quotations,
    });
  } catch (error) {
    console.error("Get Quotations Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// GET SINGLE QUOTATION
app.get("/api/quotations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const quotation =
      await prisma.quotation.findUnique({
        where: {
          id,
        },
        include: {
          customer: true,
          project: true,
          items: {
            orderBy: {
              sortOrder: "asc",
            },
            include: {
              material: true,
              boqItem: true,
            },
          },
          paymentMilestones: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // ==============================
    // REVISION HISTORY
    // ==============================

    const rootId =
      quotation.originalQuotationId ||
      quotation.id;

    const revisionHistory =
      await prisma.quotation.findMany({
        where: {
          OR: [
            {
              id: rootId,
            },
            {
              originalQuotationId: rootId,
            },
          ],
        },
        orderBy: {
          revisionNo: "asc",
        },
        select: {
          id: true,
          quotationNo: true,
          revisionNo: true,
          status: true,
          quotationDate: true,
          validUntil: true,
          originalQuotationId: true,
          grandTotal: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    const latestRevision =
      revisionHistory[
        revisionHistory.length - 1
      ];

    res.json({
      success: true,
      data: {
        ...quotation,
        revisionHistory,
        isLatestRevision:
          latestRevision?.id === quotation.id,
      },
    });
  } catch (error) {
    console.error(
      "Get Quotation Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET ALL ITEMS OF A QUOTATION
app.get("/api/quotations/:id/items", async (req, res) => {
  try {
    const quotationId = Number(req.params.id);

    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const quotation =
      await prisma.quotation.findUnique({
        where: {
          id: quotationId,
        },
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const items =
      await prisma.quotationItem.findMany({
        where: {
          quotationId,
        },
        include: {
          material: true,
          boqItem: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      });

    res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error(
      "Get Quotation Items Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
registerQuotationWorkflow(app, prisma, authMiddleware, calculateQuotationTotals);

// CREATE QUOTATION ITEM
app.post("/api/quotations/:id/items", async (req, res) => {
  try {
    const quotationId = Number(req.params.id);

    const {
      description,
      category,
      specification,
      pricingType,
      quantity,
      unit,
      unitPrice,
      materialId,
      boqItemId,
      notes,
      sortOrder,
    } = req.body;

    // ==============================
    // BASIC VALIDATION
    // ==============================

    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    if (category !== undefined && !quotationCategories.includes(category)) return res.status(400).json({success:false,message:"Invalid quotation item category"});
    if (typeof description !== "string" || !description.trim() || description.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    const allowedPricingTypes = [
      "UNIT_PRICE",
      "FIXED_AMOUNT",
    ];

    const cleanPricingType =
      pricingType || "UNIT_PRICE";

    if (!allowedPricingTypes.includes(cleanPricingType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation pricing type",
      });
    }

    // ==============================
    // VERIFY QUOTATION
    // ==============================

    const quotation =
      await prisma.quotation.findUnique({
        where: {
          id: quotationId,
        },
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // ==============================
    // PREVENT EDITING LOCKED QUOTES
    // ==============================

    if (
      quotation.status !== "DRAFT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only DRAFT quotations can be modified",
      });
    }

    // ==============================
    // VALIDATE MATERIAL
    // ==============================

    let cleanMaterialId = null;

    if (
      materialId !== undefined &&
      materialId !== null &&
      materialId !== ""
    ) {
      cleanMaterialId = Number(materialId);

      if (
        !Number.isInteger(cleanMaterialId) ||
        cleanMaterialId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid material ID",
        });
      }

      const material =
        await prisma.material.findUnique({
          where: {
            id: cleanMaterialId,
          },
        });

      if (!material) {
        return res.status(400).json({
          success: false,
          message: "Material not found",
        });
      }
    }

    // ==============================
    // VALIDATE BOQ ITEM
    // ==============================

    let cleanBoqItemId = null;

    if (
      boqItemId !== undefined &&
      boqItemId !== null &&
      boqItemId !== ""
    ) {
      cleanBoqItemId = Number(boqItemId);

      if (
        !Number.isInteger(cleanBoqItemId) ||
        cleanBoqItemId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid BOQ item ID",
        });
      }

      const boqItem =
        await prisma.bOQItem.findUnique({
          where: {
            id: cleanBoqItemId,
          },
        });

      if (!boqItem) {
        return res.status(400).json({
          success: false,
          message: "BOQ item not found",
        });
      }

      // BOQ item must belong to the
      // same project's quotation
      if (boqItem.boqId) {
        const boq =
          await prisma.bOQ.findUnique({
            where: {
              id: boqItem.boqId,
            },
          });

        if (
          !boq ||
          boq.projectId !== quotation.projectId
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Selected BOQ item does not belong to the quotation project",
          });
        }
      }
    }

    // ==============================
    // PRICING VALIDATION
    // ==============================

    let cleanQuantity = null;
    let cleanUnit = null;
    let cleanUnitPrice = null;
    let lineTotal = 0;

    if (cleanPricingType === "UNIT_PRICE") {
      if (
        quantity === undefined ||
        quantity === null ||
        quantity === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity is required for unit-price items",
        });
      }

      cleanQuantity = Number(quantity);

      if (
        !Number.isFinite(cleanQuantity) ||
        cleanQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than 0",
        });
      }

      if (!unit || unit.trim() === "") {
        return res.status(400).json({
          success: false,
          message:
            "Unit is required for unit-price items",
        });
      }

      cleanUnit = unit.trim();

      if (
        unitPrice === undefined ||
        unitPrice === null ||
        unitPrice === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unit price is required for unit-price items",
        });
      }

      cleanUnitPrice = Number(unitPrice);

      if (
        !Number.isFinite(cleanUnitPrice) ||
        cleanUnitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unit price cannot be negative",
        });
      }

      lineTotal =
        Math.round(
          cleanQuantity *
            cleanUnitPrice *
            100
        ) / 100;
    }

    if (cleanPricingType === "FIXED_AMOUNT") {
      if (
        unitPrice !== undefined &&
        unitPrice !== null &&
        unitPrice !== "" &&
        Number(unitPrice) !== 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unit price is not allowed for fixed-amount items",
        });
      }

      const fixedAmount =
        req.body.lineTotal !== undefined &&
        req.body.lineTotal !== null &&
        req.body.lineTotal !== ""
          ? Number(req.body.lineTotal)
          : NaN;

      if (
        !Number.isFinite(fixedAmount) ||
        fixedAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Line total is required for fixed-amount items",
        });
      }

      lineTotal =
        Math.round(
          fixedAmount * 100
        ) / 100;
    }

    // ==============================
    // SORT ORDER
    // ==============================

    const cleanSortOrder =
      sortOrder === undefined ||
      sortOrder === null ||
      sortOrder === ""
        ? 0
        : Number(sortOrder);

    if (
      !Number.isInteger(cleanSortOrder) ||
      cleanSortOrder < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Sort order must be a non-negative integer",
      });
    }

    // ==============================
    // CREATE ITEM
    // ==============================

    const item =
      await prisma.quotationItem.create({
        data: {
          quotationId,

          ...(category !== undefined && {category}),
          description:
            description.trim(),

          specification:
            specification?.trim() ||
            null,

          pricingType:
            cleanPricingType,

          quantity:
            cleanQuantity,

          unit:
            cleanUnit,

          unitPrice:
            cleanUnitPrice,

          lineTotal,

          materialId:
            cleanMaterialId,

          boqItemId:
            cleanBoqItemId,

          notes:
            notes?.trim() ||
            null,

          sortOrder:
            cleanSortOrder,
        },

        include: {
          material: true,
          boqItem: true,
        },
      });

     const updatedQuotation =
      await refreshQuotationTotals(
        quotationId
      );

      res.status(201).json({
        success: true,
        message:
          "Quotation item created successfully",
        data: item,
        quotationTotals: {
          subtotal:
            updatedQuotation.subtotal,
          discountAmount:
            updatedQuotation.discountAmount,
          taxAmount:
            updatedQuotation.taxAmount,
          grandTotal:
            updatedQuotation.grandTotal,
        },
      });

  } catch (error) {
    console.error(
      "Create Quotation Item Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// UPDATE QUOTATION ITEM
app.put("/api/quotation-items/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      description,
      category,
      specification,
      pricingType,
      quantity,
      unit,
      unitPrice,
      lineTotal,
      materialId,
      boqItemId,
      notes,
      sortOrder,
    } = req.body;

    // ==============================
    // BASIC VALIDATION
    // ==============================

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation item ID",
      });
    }

    if (category !== undefined && !quotationCategories.includes(category)) return res.status(400).json({success:false,message:"Invalid quotation item category"});
    if (typeof description !== "string" || !description.trim() || description.trim().length > 255) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    const allowedPricingTypes = [
      "UNIT_PRICE",
      "FIXED_AMOUNT",
    ];

    const cleanPricingType =
      pricingType || "UNIT_PRICE";

    if (!allowedPricingTypes.includes(cleanPricingType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation pricing type",
      });
    }

    // ==============================
    // FIND EXISTING ITEM
    // ==============================

    const existingItem =
      await prisma.quotationItem.findUnique({
        where: {
          id,
        },
        include: {
          quotation: true,
        },
      });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Quotation item not found",
      });
    }

    // ==============================
    // PREVENT EDITING LOCKED QUOTES
    // ==============================

    if (
      existingItem.quotation.status !== "DRAFT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only DRAFT quotations can be modified",
      });
    }

    // ==============================
    // VALIDATE MATERIAL
    // ==============================

    let cleanMaterialId = null;

    if (
      materialId !== undefined &&
      materialId !== null &&
      materialId !== ""
    ) {
      cleanMaterialId = Number(materialId);

      if (
        !Number.isInteger(cleanMaterialId) ||
        cleanMaterialId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid material ID",
        });
      }

      const material =
        await prisma.material.findUnique({
          where: {
            id: cleanMaterialId,
          },
        });

      if (!material) {
        return res.status(400).json({
          success: false,
          message: "Material not found",
        });
      }
    }

    // ==============================
    // VALIDATE BOQ ITEM
    // ==============================

    let cleanBoqItemId = null;

    if (
      boqItemId !== undefined &&
      boqItemId !== null &&
      boqItemId !== ""
    ) {
      cleanBoqItemId = Number(boqItemId);

      if (
        !Number.isInteger(cleanBoqItemId) ||
        cleanBoqItemId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid BOQ item ID",
        });
      }

      const boqItem =
        await prisma.bOQItem.findUnique({
          where: {
            id: cleanBoqItemId,
          },
        });

      if (!boqItem) {
        return res.status(400).json({
          success: false,
          message: "BOQ item not found",
        });
      }

      const boq =
        await prisma.bOQ.findUnique({
          where: {
            id: boqItem.boqId,
          },
        });

      if (
        !boq ||
        boq.projectId !==
          existingItem.quotation.projectId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected BOQ item does not belong to the quotation project",
        });
      }
    }

    // ==============================
    // PRICING
    // ==============================

    let cleanQuantity = null;
    let cleanUnit = null;
    let cleanUnitPrice = null;
    let cleanLineTotal = 0;

    if (cleanPricingType === "UNIT_PRICE") {
      if (
        quantity === undefined ||
        quantity === null ||
        quantity === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity is required for unit-price items",
        });
      }

      cleanQuantity = Number(quantity);

      if (
        !Number.isFinite(cleanQuantity) ||
        cleanQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than 0",
        });
      }

      if (!unit || unit.trim() === "") {
        return res.status(400).json({
          success: false,
          message:
            "Unit is required for unit-price items",
        });
      }

      cleanUnit = unit.trim();

      if (
        unitPrice === undefined ||
        unitPrice === null ||
        unitPrice === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unit price is required for unit-price items",
        });
      }

      cleanUnitPrice = Number(unitPrice);

      if (
        !Number.isFinite(cleanUnitPrice) ||
        cleanUnitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unit price cannot be negative",
        });
      }

      cleanLineTotal =
        Math.round(
          cleanQuantity *
            cleanUnitPrice *
            100
        ) / 100;
    }

    if (cleanPricingType === "FIXED_AMOUNT") {
      const fixedAmount =
        lineTotal === undefined ||
        lineTotal === null ||
        lineTotal === ""
          ? NaN
          : Number(lineTotal);

      if (
        !Number.isFinite(fixedAmount) ||
        fixedAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Line total is required for fixed-amount items",
        });
      }

      cleanLineTotal =
        Math.round(
          fixedAmount * 100
        ) / 100;
    }

    // ==============================
    // SORT ORDER
    // ==============================

    const cleanSortOrder =
      sortOrder === undefined ||
      sortOrder === null ||
      sortOrder === ""
        ? existingItem.sortOrder
        : Number(sortOrder);

    if (
      !Number.isInteger(cleanSortOrder) ||
      cleanSortOrder < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Sort order must be a non-negative integer",
      });
    }

    // ==============================
    // UPDATE ITEM
    // ==============================

    const updatedItem =
      await prisma.quotationItem.update({
        where: {
          id,
        },
        data: {
          ...(category !== undefined && {category}),
          description:
            description.trim(),

          specification:
            specification?.trim() ||
            null,

          pricingType:
            cleanPricingType,

          quantity:
            cleanQuantity,

          unit:
            cleanUnit,

          unitPrice:
            cleanUnitPrice,

          lineTotal:
            cleanLineTotal,

          materialId:
            cleanMaterialId,

          boqItemId:
            cleanBoqItemId,

          notes:
            notes?.trim() ||
            null,

          sortOrder:
            cleanSortOrder,
        },

        include: {
          material: true,
          boqItem: true,
        },
      });

    // ==============================
    // REFRESH QUOTATION TOTALS
    // ==============================

    const updatedQuotation =
      await refreshQuotationTotals(
        existingItem.quotationId
      );

    res.json({
      success: true,
      message:
        "Quotation item updated successfully",
      data: updatedItem,
      quotationTotals: {
        subtotal:
          updatedQuotation.subtotal,
        discountAmount:
          updatedQuotation.discountAmount,
        taxAmount:
          updatedQuotation.taxAmount,
        grandTotal:
          updatedQuotation.grandTotal,
      },
    });
  } catch (error) {
    console.error(
      "Update Quotation Item Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// DELETE QUOTATION ITEM
app.delete("/api/quotation-items/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation item ID",
      });
    }

    const existingItem =
      await prisma.quotationItem.findUnique({
        where: {
          id,
        },
        include: {
          quotation: true,
        },
      });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Quotation item not found",
      });
    }

    // ==============================
    // PREVENT EDITING LOCKED QUOTES
    // ==============================

    if (
      existingItem.quotation.status !== "DRAFT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only DRAFT quotations can be modified",
      });
    }

    // ==============================
    // DELETE ITEM
    // ==============================

    await prisma.quotationItem.delete({
      where: {
        id,
      },
    });

    // ==============================
    // REFRESH QUOTATION TOTALS
    // ==============================

    const updatedQuotation =
      await refreshQuotationTotals(
        existingItem.quotationId
      );

    res.json({
      success: true,
      message:
        "Quotation item deleted successfully",
      quotationTotals: {
        subtotal:
          updatedQuotation.subtotal,
        discountAmount:
          updatedQuotation.discountAmount,
        taxAmount:
          updatedQuotation.taxAmount,
        grandTotal:
          updatedQuotation.grandTotal,
      },
    });
  } catch (error) {
    console.error(
      "Delete Quotation Item Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// CREATE QUOTATION
app.post("/api/quotations", async (req, res) => {
  try {
    const {
      quotationNo,
      customerId,
      projectId,
      quotationDate,
      validUntil,
      status,
      discountType,
      discountValue,
      taxType,
      taxRate,
      paymentTerms,
      termsAndConditions,
      notes,
    } = req.body;

    // ==============================
    // BASIC VALIDATION
    // ==============================

    if (!quotationNo || quotationNo.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Quotation number is required",
      });
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }



    // ==============================
    // VALIDATE IDS
    // ==============================

    const cleanCustomerId = Number(customerId);
    const cleanProjectId = projectId == null || projectId === "" ? null : Number(projectId);

    if (
      !Number.isInteger(cleanCustomerId) ||
      cleanCustomerId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    if (
      cleanProjectId !== null && (!Number.isInteger(cleanProjectId) ||
      cleanProjectId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // ==============================
    // VERIFY CUSTOMER
    // ==============================

    const customer =
      await prisma.customer.findUnique({
        where: {
          id: cleanCustomerId,
        },
      });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Customer not found",
      });
    }

    // ==============================
    // VERIFY PROJECT
    // ==============================

    const project = cleanProjectId === null ? null : await prisma.project.findUnique({where:{id:cleanProjectId}});

    if (cleanProjectId !== null && !project) {
      return res.status(400).json({
        success: false,
        message: "Project not found",
      });
    }

    // ==============================
    // CUSTOMER ↔ PROJECT CONSISTENCY
    // ==============================

    if (
      project && project.customerId !== cleanCustomerId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected project does not belong to the selected customer",
      });
    }

    // ==============================
    // DUPLICATE QUOTATION NUMBER
    // ==============================

    const existingQuotation =
      await prisma.quotation.findUnique({
        where: {
          quotationNo: quotationNo.trim(),
        },
      });

    if (existingQuotation) {
      return res.status(400).json({
        success: false,
        message:
          "A quotation with this number already exists",
      });
    }

    // ==============================
    // VALIDATE STATUS
    // ==============================

    const allowedStatuses = [
      "DRAFT",
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CANCELLED",
    ];

    const quotationStatus = status || "DRAFT";
    if (quotationStatus !== "DRAFT") return res.status(400).json({success:false,message:"Create as DRAFT, add items and milestones, then send or accept the quotation"});

    if (
      !allowedStatuses.includes(
        quotationStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation status",
      });
    }

    // ==============================
    // VALIDATE DISCOUNT
    // ==============================

    const allowedDiscountTypes = [
      "PERCENT",
      "FIXED",
    ];

    let cleanDiscountType =
      discountType || null;

    let cleanDiscountValue = 0;

    if (cleanDiscountType !== null) {
      if (
        !allowedDiscountTypes.includes(
          cleanDiscountType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid discount type",
        });
      }

      cleanDiscountValue =
        discountValue === undefined ||
        discountValue === null ||
        discountValue === ""
          ? 0
          : Number(discountValue);

      if (
        !Number.isFinite(cleanDiscountValue) ||
        cleanDiscountValue < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Discount value cannot be negative",
        });
      }
    }

    // ==============================
    // VALIDATE TAX
    // ==============================

    const allowedTaxTypes = [
      "PERCENT",
      "FIXED",
    ];

    let cleanTaxType = taxType || null;

    let cleanTaxRate = 0;

    if (cleanTaxType !== null) {
      if (
        !allowedTaxTypes.includes(
          cleanTaxType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax type",
        });
      }

      cleanTaxRate =
        taxRate === undefined ||
        taxRate === null ||
        taxRate === ""
          ? 0
          : Number(taxRate);

      if (
        !Number.isFinite(cleanTaxRate) ||
        cleanTaxRate < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Tax rate cannot be negative",
        });
      }
    }

    // ==============================
    // CREATE QUOTATION
    // ==============================

    const quotation =
      await prisma.quotation.create({
        data: {
          quotationNo:
            quotationNo.trim(),

          customerId:
            cleanCustomerId,

          projectId:
            cleanProjectId,

          quotationDate:
            quotationDate
              ? new Date(quotationDate)
              : new Date(),

          validUntil:
            validUntil
              ? new Date(validUntil)
              : null,

          status:
            quotationStatus,

          revisionNo:
            1,

          discountType:
            cleanDiscountType,

          discountValue:
            cleanDiscountValue,

          taxType:
            cleanTaxType,

          taxRate:
            cleanTaxRate,

          paymentTerms:
            paymentTerms?.trim() ||
            null,

          termsAndConditions:
            termsAndConditions?.trim() ||
            null,

          notes:
            notes?.trim() ||
            null,
        },

        include: {
          customer: true,
          project: true,
          items: true,
          paymentMilestones: true,
        },
      });

    res.status(201).json({
      success: true,
      message:
        "Quotation created successfully",
      data: quotation,
    });
  } catch (error) {
    console.error(
      "Create Quotation Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// UPDATE QUOTATION
app.put("/api/quotations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      customerId,
      projectId,
      quotationDate,
      validUntil,
      status,
      discountType,
      discountValue,
      taxType,
      taxRate,
      paymentTerms,
      termsAndConditions,
      notes,
    } = req.body;

    // ==============================
    // BASIC VALIDATION
    // ==============================

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const existingQuotation =
      await prisma.quotation.findUnique({
        where: {
          id,
        },
      });

    if (!existingQuotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // ==============================
    // STATUS / EDIT LOCK
    // ==============================

    if (
      existingQuotation.status !== "DRAFT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only DRAFT quotations can be modified",
      });
    }

    // ==============================
    // CUSTOMER + PROJECT
    // ==============================

    const cleanCustomerId =
      customerId === undefined ||
      customerId === null ||
      customerId === ""
        ? existingQuotation.customerId
        : Number(customerId);

    const cleanProjectId =
      projectId === undefined ? existingQuotation.projectId : projectId === null || projectId === "" ? null : Number(projectId);

    if (
      !Number.isInteger(cleanCustomerId) ||
      cleanCustomerId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    if (
      cleanProjectId !== null && (!Number.isInteger(cleanProjectId) ||
      cleanProjectId <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const customer =
      await prisma.customer.findUnique({
        where: {
          id: cleanCustomerId,
        },
      });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Customer not found",
      });
    }

    const project = cleanProjectId === null ? null : await prisma.project.findUnique({where:{id:cleanProjectId}});

    if (cleanProjectId !== null && !project) {
      return res.status(400).json({
        success: false,
        message: "Project not found",
      });
    }

    if (
      project && project.customerId !== cleanCustomerId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected project does not belong to the selected customer",
      });
    }

    // ==============================
    // VALIDATE STATUS
    // ==============================

    const allowedStatuses = [
      "DRAFT",
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CANCELLED",
    ];

    const cleanStatus =
      status || existingQuotation.status;

    if (
      !allowedStatuses.includes(cleanStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation status",
      });
    }
    // ==============================
    // VALIDATE DISCOUNT
    // ==============================

    const cleanDiscountType =
      discountType === undefined
        ? existingQuotation.discountType
        : discountType || null;

    const cleanDiscountValue =
      discountValue === undefined
        ? Number(existingQuotation.discountValue)
        : Number(discountValue);

    if (
      cleanDiscountValue < 0 ||
      !Number.isFinite(cleanDiscountValue)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount value cannot be negative",
      });
    }

    // ==============================
    // VALIDATE TAX
    // ==============================

    const cleanTaxType =
      taxType === undefined
        ? existingQuotation.taxType
        : taxType || null;

    const cleanTaxRate =
      taxRate === undefined
        ? Number(existingQuotation.taxRate)
        : Number(taxRate);

    if (
      cleanTaxRate < 0 ||
      !Number.isFinite(cleanTaxRate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tax rate cannot be negative",
      });
    }
    // ==============================
    // FINALIZATION VALIDATION
    // ==============================
    const currentItems = await prisma.quotationItem.findMany({where:{quotationId:id}});
    let validatedTotals;
    try { validatedTotals = calculateQuotationTotals(currentItems, {discountType:cleanDiscountType,discountValue:cleanDiscountValue,taxType:cleanTaxType,taxRate:cleanTaxRate}); }
    catch(error) { return res.status(400).json({success:false,message:error.message}); }
    if (
      cleanStatus === "SENT" ||
      cleanStatus === "ACCEPTED"
    ) {
      const milestones =
        await prisma.quotationPaymentMilestone.findMany({
          where: {
            quotationId: id,
          },
        });

      const invalid = validateFinalization(currentItems, milestones, validatedTotals.grandTotal);
      if (invalid) return res.status(400).json({success:false,message:invalid});
      const totalPercentage =
        milestones.reduce(
          (sum, milestone) =>
            sum +
            (Number(milestone.percentage) || 0),
          0
        );

      const totalMilestoneAmount =
        milestones.reduce(
          (sum, milestone) =>
            sum +
            (Number(milestone.amount) || 0),
          0
        );

      const totals =
        calculateQuotationTotals(
          await prisma.quotationItem.findMany({
            where: {
              quotationId: id,
            },
          }),
          {
            discountType:
              cleanDiscountType,
            discountValue:
              cleanDiscountValue,
            taxType:
              cleanTaxType,
            taxRate:
              cleanTaxRate,
          }
        );

      if (
        Math.abs(
          totalPercentage - 100
        ) > 0.001
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quotation cannot be finalized until payment milestone percentage totals 100%",
          totalPercentage,
        });
      }

      if (
        Math.abs(
          totalMilestoneAmount -
            totals.grandTotal
        ) > 0.01
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment milestone total amount must equal quotation grand total",
          totalMilestoneAmount,
          grandTotal:
            totals.grandTotal,
        });
      }
    }
    // ==============================
    // UPDATE HEADER
    // ==============================

    const updatedQuotation =
      await prisma.quotation.update({
        where: {
          id,
        },
        data: {
          customerId:
            cleanCustomerId,

          projectId:
            cleanProjectId,

          quotationDate:
            quotationDate !== undefined
              ? new Date(quotationDate)
              : existingQuotation.quotationDate,

          validUntil:
            validUntil === undefined
              ? existingQuotation.validUntil
              : validUntil
              ? new Date(validUntil)
              : null,

          status:
            cleanStatus,


          discountType:
            cleanDiscountType,

          discountValue:
            cleanDiscountValue,

          taxType:
            cleanTaxType,

          taxRate:
            cleanTaxRate,

          paymentTerms:
            paymentTerms === undefined
              ? existingQuotation.paymentTerms
              : paymentTerms?.trim() || null,

          termsAndConditions:
            termsAndConditions === undefined
              ? existingQuotation.termsAndConditions
              : termsAndConditions?.trim() || null,

          notes:
            notes === undefined
              ? existingQuotation.notes
              : notes?.trim() || null,
        },
      });

    // ==============================
    // REFRESH TOTALS
    // ==============================

    const quotationWithTotals =
      await refreshQuotationTotals(
        id
      );

    res.json({
      success: true,
      message:
        "Quotation updated successfully",
      data: quotationWithTotals,
    });
  } catch (error) {
    console.error(
      "Update Quotation Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// CREATE NEW QUOTATION REVISION
app.post("/api/quotations/:id/revisions", async (req, res) => {
  try {
    const sourceId = Number(req.params.id);

    if (
      !Number.isInteger(sourceId) ||
      sourceId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    // ---------------------------------
    // LOAD SOURCE SNAPSHOT
    // ---------------------------------

    const sourceQuotation =
      await prisma.quotation.findUnique({
        where: {
          id: sourceId,
        },
        include: {
          items: {
            orderBy: {
              sortOrder: "asc",
            },
          },
          paymentMilestones: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      });

    if (!sourceQuotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // DRAFT can be edited directly.
    if (sourceQuotation.status === "DRAFT") {
      return res.status(400).json({
        success: false,
        message:
          "DRAFT quotations can be edited directly and do not require a new revision",
      });
    }

    // ---------------------------------
    // DETERMINE REVISION FAMILY ROOT
    // ---------------------------------

    const rootId =
      sourceQuotation.originalQuotationId ||
      sourceQuotation.id;

    const rootQuotation =
      rootId === sourceQuotation.id
        ? sourceQuotation
        : await prisma.quotation.findUnique({
            where: {
              id: rootId,
            },
          });

    if (!rootQuotation) {
      return res.status(500).json({
        success: false,
        message:
          "Quotation revision root could not be found",
      });
    }

    // ---------------------------------
    // LOAD WHOLE FAMILY
    // ---------------------------------

    const family =
      await prisma.quotation.findMany({
        where: {
          OR: [
            {
              id: rootId,
            },
            {
              originalQuotationId: rootId,
            },
          ],
        },
        orderBy: {
          revisionNo: "asc",
        },
      });

    if (family.length === 0) {
      return res.status(500).json({
        success: false,
        message:
          "Quotation revision family could not be loaded",
      });
    }

    const latestRevision =
      family[family.length - 1];

    // Prevent branching from an older revision.
    if (latestRevision.id !== sourceQuotation.id) {
      return res.status(400).json({
        success: false,
        message:
          "A new revision can only be created from the latest quotation revision",
        latestRevisionId:
          latestRevision.id,
        latestRevisionNo:
          latestRevision.revisionNo,
      });
    }

    const nextRevisionNo =
      latestRevision.revisionNo + 1;

    // ---------------------------------
    // GENERATE REVISION NUMBER
    // ---------------------------------

    const rootQuotationNo =
      rootQuotation.quotationNo;

    const nextQuotationNo =
      `${rootQuotationNo}-R${nextRevisionNo}`;

    const duplicateNumber =
      await prisma.quotation.findUnique({
        where: {
          quotationNo:
            nextQuotationNo,
        },
      });

    if (duplicateNumber) {
      return res.status(409).json({
        success: false,
        message:
          "Generated quotation revision number already exists",
      });
    }

    // ---------------------------------
    // CREATE FULL SNAPSHOT TRANSACTION
    // ---------------------------------

    const newRevision =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.quotation.create({
              data: {
                quotationNo:
                  nextQuotationNo,

                customerId:
                  sourceQuotation.customerId,

                projectId:
                  sourceQuotation.projectId,

                quotationDate:
                  new Date(),

                validUntil:
                  sourceQuotation.validUntil,

                status:
                  "DRAFT",

                revisionNo:
                  nextRevisionNo,

                originalQuotationId:
                  rootId,

                subtotal:
                  sourceQuotation.subtotal,

                discountType:
                  sourceQuotation.discountType,

                discountValue:
                  sourceQuotation.discountValue,

                discountAmount:
                  sourceQuotation.discountAmount,

                taxType:
                  sourceQuotation.taxType,

                taxRate:
                  sourceQuotation.taxRate,

                taxAmount:
                  sourceQuotation.taxAmount,

                grandTotal:
                  sourceQuotation.grandTotal,

                paymentTerms:
                  sourceQuotation.paymentTerms,

                termsAndConditions:
                  sourceQuotation.termsAndConditions,

                notes:
                  sourceQuotation.notes,
              },
            });

          if (
            sourceQuotation.items.length > 0
          ) {
            await tx.quotationItem.createMany({
              data:
                sourceQuotation.items.map(
                  (item) => ({
                    quotationId:
                      created.id,

                    category: item.category,
                    description:
                      item.description,

                    specification:
                      item.specification,

                    pricingType:
                      item.pricingType,

                    quantity:
                      item.quantity,

                    unit:
                      item.unit,

                    unitPrice:
                      item.unitPrice,

                    lineTotal:
                      item.lineTotal,

                    materialId:
                      item.materialId,

                    boqItemId:
                      item.boqItemId,

                    notes:
                      item.notes,

                    sortOrder:
                      item.sortOrder,
                  })
                ),
            });
          }

          if (
            sourceQuotation.paymentMilestones
              .length > 0
          ) {
            await tx.quotationPaymentMilestone.createMany({
              data:
                sourceQuotation.paymentMilestones.map(
                  (milestone) => ({
                    quotationId:
                      created.id,

                    milestoneNo:
                      milestone.milestoneNo,

                    title:
                      milestone.title,

                    percentage:
                      milestone.percentage,

                    amount:
                      milestone.amount,

                    dueTrigger:
                      milestone.dueTrigger,

                    notes:
                      milestone.notes,

                    sortOrder:
                      milestone.sortOrder,
                  })
                ),
            });
          }

          return tx.quotation.findUnique({
            where: {
              id: created.id,
            },
            include: {
              customer: true,
              project: true,

              items: {
                orderBy: {
                  sortOrder: "asc",
                },
                include: {
                  material: true,
                  boqItem: true,
                },
              },

              paymentMilestones: {
                orderBy: {
                  sortOrder: "asc",
                },
              },

              originalQuotation: true,

              revisions: {
                orderBy: {
                  revisionNo: "asc",
                },
              },
            },
          });
        }
      );

    res.status(201).json({
      success: true,
      message:
        `Quotation revision ${nextRevisionNo} created successfully`,
      data: newRevision,
    });
  } catch (error) {
    console.error(
      "Create Quotation Revision Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// GET ALL PAYMENT MILESTONES OF A QUOTATION
app.get("/api/quotations/:id/payment-milestones", async (req, res) => {
  try {
    const quotationId = Number(req.params.id);

    if (
      !Number.isInteger(quotationId) ||
      quotationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID",
      });
    }

    const quotation =
      await prisma.quotation.findUnique({
        where: {
          id: quotationId,
        },
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const milestones =
      await prisma.quotationPaymentMilestone.findMany({
        where: {
          quotationId,
        },
        orderBy: {
          sortOrder: "asc",
        },
      });

    res.json({
      success: true,
      data: milestones,
    });
  } catch (error) {
    console.error(
      "Get Quotation Payment Milestones Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// CREATE PAYMENT MILESTONE
app.post(
  "/api/quotations/:id/payment-milestones",
  async (req, res) => {
    try {
      const quotationId =
        Number(req.params.id);

      const {
        milestoneNo,
        title,
        percentage,
        amount,
        dueTrigger,
        notes,
        sortOrder,
      } = req.body;

      // ==============================
      // BASIC VALIDATION
      // ==============================

      if (
        !Number.isInteger(quotationId) ||
        quotationId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid quotation ID",
        });
      }

      if (
        milestoneNo === undefined ||
        milestoneNo === null ||
        milestoneNo === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Milestone number is required",
        });
      }

      const cleanMilestoneNo =
        Number(milestoneNo);

      if (
        !Number.isInteger(cleanMilestoneNo) ||
        cleanMilestoneNo <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Milestone number must be a positive integer",
        });
      }

      if (
        !title ||
        title.trim() === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Milestone title is required",
        });
      }

      // ==============================
      // VERIFY QUOTATION
      // ==============================

      const quotation =
        await prisma.quotation.findUnique({
          where: {
            id: quotationId,
          },
        });

      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: "Quotation not found",
        });
      }

      if (
        quotation.status !== "DRAFT"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only DRAFT quotations can be modified",
        });
      }

      // ==============================
      // VALIDATE PERCENTAGE
      // ==============================

      const cleanPercentage =
        percentage === undefined ||
        percentage === null ||
        percentage === ""
          ? null
          : Number(percentage);

      if (
        cleanPercentage !== null &&
        (
          !Number.isFinite(
            cleanPercentage
          ) ||
          cleanPercentage < 0 ||
          cleanPercentage > 100
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Percentage must be between 0 and 100",
        });
      }

      // ==============================
      // VALIDATE AMOUNT
      // ==============================

      if (
        amount === undefined ||
        amount === null ||
        amount === ""
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Milestone amount is required",
        });
      }

      const cleanAmount =
        Number(amount);

      if (
        !Number.isFinite(cleanAmount) ||
        cleanAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Milestone amount cannot be negative",
        });
      }

      // ==============================
      // CHECK EXISTING MILESTONE NUMBER
      // ==============================

      const existingMilestone =
        await prisma.quotationPaymentMilestone.findFirst({
          where: {
            quotationId,
            milestoneNo:
              cleanMilestoneNo,
          },
        });

      if (existingMilestone) {
        return res.status(400).json({
          success: false,
          message:
            "A milestone with this number already exists",
        });
      }

      // ==============================
      // CHECK TOTAL PERCENTAGE
      // ==============================

      if (cleanPercentage !== null) {
        const existingPercentage =
          await prisma.quotationPaymentMilestone.aggregate({
            where: {
              quotationId,
            },
            _sum: {
              percentage: true,
            },
          });

        const currentPercentage =
          Number(
            existingPercentage._sum
              .percentage
          ) || 0;

        const newPercentage =
          currentPercentage +
          cleanPercentage;

        if (
          newPercentage > 100
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Total payment milestone percentage cannot exceed 100",
          });
        }
      }

      // ==============================
      // SORT ORDER
      // ==============================

      const cleanSortOrder =
        sortOrder === undefined ||
        sortOrder === null ||
        sortOrder === ""
          ? cleanMilestoneNo
          : Number(sortOrder);

      if (
        !Number.isInteger(
          cleanSortOrder
        ) ||
        cleanSortOrder < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sort order must be a non-negative integer",
        });
      }

      // ==============================
      // CREATE MILESTONE
      // ==============================

      const milestone =
        await prisma.quotationPaymentMilestone.create({
          data: {
            quotationId,

            milestoneNo:
              cleanMilestoneNo,

            title:
              title.trim(),

            percentage:
              cleanPercentage,

            amount:
              cleanAmount,

            dueTrigger:
              dueTrigger?.trim() ||
              null,

            notes:
              notes?.trim() ||
              null,

            sortOrder:
              cleanSortOrder,
          },
        });

      res.status(201).json({
        success: true,
        message:
          "Payment milestone created successfully",
        data: milestone,
      });
    } catch (error) {
      console.error(
        "Create Quotation Payment Milestone Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);
// UPDATE PAYMENT MILESTONE
app.put(
  "/api/quotation-payment-milestones/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const {
        milestoneNo,
        title,
        percentage,
        amount,
        dueTrigger,
        notes,
        sortOrder,
      } = req.body;

      // ==============================
      // BASIC VALIDATION
      // ==============================

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment milestone ID",
        });
      }

      const existingMilestone =
        await prisma.quotationPaymentMilestone.findUnique({
          where: {
            id,
          },
          include: {
            quotation: true,
          },
        });

      if (!existingMilestone) {
        return res.status(404).json({
          success: false,
          message: "Payment milestone not found",
        });
      }

      // ==============================
      // DRAFT ONLY
      // ==============================

      if (
        existingMilestone.quotation.status !== "DRAFT"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only DRAFT quotations can be modified",
        });
      }

      // ==============================
      // MILESTONE NUMBER
      // ==============================

      const cleanMilestoneNo =
        milestoneNo === undefined ||
        milestoneNo === null ||
        milestoneNo === ""
          ? existingMilestone.milestoneNo
          : Number(milestoneNo);

      if (
        !Number.isInteger(cleanMilestoneNo) ||
        cleanMilestoneNo <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Milestone number must be a positive integer",
        });
      }

      // ==============================
      // TITLE
      // ==============================

      const cleanTitle =
        title === undefined
          ? existingMilestone.title
          : title?.trim();

      if (!cleanTitle) {
        return res.status(400).json({
          success: false,
          message: "Milestone title is required",
        });
      }

      // ==============================
      // DUPLICATE MILESTONE NUMBER
      // ==============================

      const duplicateMilestone =
        await prisma.quotationPaymentMilestone.findFirst({
          where: {
            quotationId:
              existingMilestone.quotationId,
            milestoneNo:
              cleanMilestoneNo,
            NOT: {
              id,
            },
          },
        });

      if (duplicateMilestone) {
        return res.status(400).json({
          success: false,
          message:
            "A milestone with this number already exists",
        });
      }

      // ==============================
      // PERCENTAGE
      // ==============================

      const cleanPercentage =
        percentage === undefined
          ? existingMilestone.percentage === null
            ? null
            : Number(existingMilestone.percentage)
          : percentage === null ||
            percentage === ""
          ? null
          : Number(percentage);

      if (
        cleanPercentage !== null &&
        (
          !Number.isFinite(cleanPercentage) ||
          cleanPercentage < 0 ||
          cleanPercentage > 100
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Percentage must be between 0 and 100",
        });
      }

      // ==============================
      // TOTAL PERCENTAGE CHECK
      // ==============================

      if (cleanPercentage !== null) {
        const existingPercentage =
          await prisma.quotationPaymentMilestone.aggregate({
            where: {
              quotationId:
                existingMilestone.quotationId,
              NOT: {
                id,
              },
            },
            _sum: {
              percentage: true,
            },
          });

        const otherPercentage =
          Number(
            existingPercentage._sum
              .percentage
          ) || 0;

        const newPercentage =
          otherPercentage +
          cleanPercentage;

        if (newPercentage > 100) {
          return res.status(400).json({
            success: false,
            message:
              "Total payment milestone percentage cannot exceed 100",
          });
        }
      }

      // ==============================
      // AMOUNT
      // ==============================

      const cleanAmount =
        amount === undefined ||
        amount === null ||
        amount === ""
          ? Number(existingMilestone.amount)
          : Number(amount);

      if (
        !Number.isFinite(cleanAmount) ||
        cleanAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Milestone amount cannot be negative",
        });
      }

      // ==============================
      // SORT ORDER
      // ==============================

      const cleanSortOrder =
        sortOrder === undefined ||
        sortOrder === null ||
        sortOrder === ""
          ? existingMilestone.sortOrder
          : Number(sortOrder);

      if (
        !Number.isInteger(cleanSortOrder) ||
        cleanSortOrder < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Sort order must be a non-negative integer",
        });
      }

      // ==============================
      // UPDATE
      // ==============================

      const updatedMilestone =
        await prisma.quotationPaymentMilestone.update({
          where: {
            id,
          },
          data: {
            milestoneNo:
              cleanMilestoneNo,

            title:
              cleanTitle,

            percentage:
              cleanPercentage,

            amount:
              cleanAmount,

            dueTrigger:
              dueTrigger === undefined
                ? existingMilestone.dueTrigger
                : dueTrigger?.trim() || null,

            notes:
              notes === undefined
                ? existingMilestone.notes
                : notes?.trim() || null,

            sortOrder:
              cleanSortOrder,
          },
        });

      res.json({
        success: true,
        message:
          "Payment milestone updated successfully",
        data: updatedMilestone,
      });
    } catch (error) {
      console.error(
        "Update Quotation Payment Milestone Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);
// DELETE PAYMENT MILESTONE
app.delete(
  "/api/quotation-payment-milestones/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment milestone ID",
        });
      }

      const existingMilestone =
        await prisma.quotationPaymentMilestone.findUnique({
          where: {
            id,
          },
          include: {
            quotation: true,
          },
        });

      if (!existingMilestone) {
        return res.status(404).json({
          success: false,
          message: "Payment milestone not found",
        });
      }

      // Only draft quotations can be modified
      if (
        existingMilestone.quotation.status !== "DRAFT"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only DRAFT quotations can be modified",
        });
      }

      await prisma.quotationPaymentMilestone.delete({
        where: {
          id,
        },
      });

      const remainingMilestones =
        await prisma.quotationPaymentMilestone.findMany({
          where: {
            quotationId:
              existingMilestone.quotationId,
          },
          orderBy: {
            sortOrder: "asc",
          },
        });

      const totalPercentage =
        remainingMilestones.reduce(
          (sum, milestone) =>
            sum +
            (Number(milestone.percentage) || 0),
          0
        );

      const totalAmount =
        remainingMilestones.reduce(
          (sum, milestone) =>
            sum +
            (Number(milestone.amount) || 0),
          0
        );

      res.json({
        success: true,
        message:
          "Payment milestone deleted successfully",
        data: {
          deletedMilestoneId: id,
          remainingMilestones,
          totalPercentage,
          totalAmount,
        },
      });
    } catch (error) {
      console.error(
        "Delete Quotation Payment Milestone Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// =========================================
// PURCHASE REQUEST API
// =========================================

// GET ALL PURCHASE REQUESTS
app.get("/api/purchase-requests", async (req, res) => {
  try {
    const requests = await prisma.purchaseRequest.findMany({
      include: {
        project: true,
        items: {
          include: {
            material: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error(
      "Get Purchase Requests Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Purchase requests load করা যায়নি!",
    });
  }
});

// CREATE PURCHASE REQUEST
app.post("/api/purchase-requests", async (req, res) => {
  try {
    const {
      requestNo,
      requestDate,
      projectId,
      status,
      priority,
      notes,
    } = req.body;

    // ==============================
    // VALIDATION
    // ==============================

    if (!requestNo || !requestNo.trim()) {
      return res.status(400).json({
        success: false,
        message: "Purchase request number is required",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project is required",
      });
    }

    const allowedStatuses = [
      "DRAFT",
      "PENDING",
      "APPROVED",
      "REJECTED",
      "CONVERTED",
      "CANCELLED",
    ];

    const allowedPriorities = [
      "LOW",
      "NORMAL",
      "HIGH",
      "URGENT",
    ];

    const requestStatus =
      status || "DRAFT";

    const requestPriority =
      priority || "NORMAL";

    if (
      !allowedStatuses.includes(
        requestStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase request status",
      });
    }

    if (
      !allowedPriorities.includes(
        requestPriority
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid purchase request priority",
      });
    }

    // ==============================
    // CHECK DUPLICATE REQUEST NO
    // ==============================

    const existingRequest =
      await prisma.purchaseRequest.findUnique({
        where: {
          requestNo: requestNo.trim(),
        },
      });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message:
          "A purchase request with this number already exists",
      });
    }

    // ==============================
    // CHECK PROJECT
    // ==============================

    const project =
      await prisma.project.findUnique({
        where: {
          id: Number(projectId),
        },
      });

    if (!project) {
      return res.status(400).json({
        success: false,
        message: "Project not found",
      });
    }

    // ==============================
    // CREATE PURCHASE REQUEST
    // ==============================

    const purchaseRequest =
      await prisma.purchaseRequest.create({
        data: {
          requestNo:
            requestNo.trim(),

          requestDate:
            requestDate
              ? new Date(requestDate)
              : new Date(),

          projectId:
            Number(projectId),

          status:
            requestStatus,

          priority:
            requestPriority,

          notes:
            notes?.trim() || null,
        },

        include: {
          project: true,
          items: {
            include: {
              material: true,
            },
          },
        },
      });

    res.status(201).json({
      success: true,
      message:
        "Purchase request created successfully",
      data: purchaseRequest,
    });

  } catch (error) {
    console.error(
      "Create Purchase Request Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Purchase request create করা যায়নি!",
    });
  }
});
// =========================================
// CREATE PURCHASE REQUEST ITEM
// =========================================
// =========================================
// UPDATE PURCHASE REQUEST ITEM
// =========================================


app.post(
  "/api/purchase-requests/:id/items",
  async (req, res) => {
    try {
      const purchaseRequestId =
        Number(req.params.id);

      const {
        materialId,
        quantity,
        unit,
        requiredDate,
        notes,
      } = req.body;

      // ==============================
      // VALIDATION
      // ==============================

      if (!purchaseRequestId) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase request ID is required",
        });
      }

      if (!materialId) {
        return res.status(400).json({
          success: false,
          message: "Material is required",
        });
      }

      const qty = Number(quantity);

      if (
        Number.isNaN(qty) ||
        qty <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than 0",
        });
      }

      if (!unit || !unit.trim()) {
        return res.status(400).json({
          success: false,
          message: "Unit is required",
        });
      }

      // ==============================
      // CHECK PURCHASE REQUEST
      // ==============================

      const purchaseRequest =
        await prisma.purchaseRequest.findUnique({
          where: {
            id: purchaseRequestId,
          },
        });

      if (!purchaseRequest) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase request not found",
        });
      }

      // ==============================
      // CHECK MATERIAL
      // ==============================

      const material =
        await prisma.material.findUnique({
          where: {
            id: Number(materialId),
          },
        });

      if (!material) {
        return res.status(400).json({
          success: false,
          message: "Material not found",
        });
      }

      // ==============================
      // CREATE ITEM
      // ==============================

      const item =
        await prisma.purchaseRequestItem.create({
          data: {
            purchaseRequestId,
            materialId: Number(materialId),
            quantity: qty,
            unit: unit.trim(),

            requiredDate: requiredDate
              ? new Date(requiredDate)
              : null,

            notes:
              notes?.trim() || null,
          },

          include: {
            material: true,
            purchaseRequest: {
              include: {
                project: true,
              },
            },
          },
        });

      res.status(201).json({
        success: true,
        message:
          "Purchase request item created successfully",
        data: item,
      });
    } catch (error) {
      console.error(
        "Create Purchase Request Item Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase request item create করা যায়নি!",
      });
    }
  }
);

app.put(
  "/api/purchase-request-items/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const {
        materialId,
        quantity,
        unit,
        requiredDate,
        notes,
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Purchase request item ID is required",
        });
      }

      if (!materialId) {
        return res.status(400).json({
          success: false,
          message: "Material is required",
        });
      }

      const qty = Number(quantity);

      if (Number.isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than 0",
        });
      }

      if (!unit || !unit.trim()) {
        return res.status(400).json({
          success: false,
          message: "Unit is required",
        });
      }

      const existingItem =
        await prisma.purchaseRequestItem.findUnique({
          where: { id },
        });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "Purchase request item not found",
        });
      }

      const material =
        await prisma.material.findUnique({
          where: {
            id: Number(materialId),
          },
        });

      if (!material) {
        return res.status(400).json({
          success: false,
          message: "Material not found",
        });
      }

      const item =
        await prisma.purchaseRequestItem.update({
          where: { id },

          data: {
            materialId: Number(materialId),
            quantity: qty,
            unit: unit.trim(),
            requiredDate: requiredDate
              ? new Date(requiredDate)
              : null,
            notes: notes?.trim() || null,
          },

          include: {
            material: true,
            purchaseRequest: {
              include: {
                project: true,
              },
            },
          },
        });

      res.json({
        success: true,
        message:
          "Purchase request item updated successfully",
        data: item,
      });
    } catch (error) {
      console.error(
        "Update Purchase Request Item Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase request item update করা যায়নি!",
      });
    }
  }
);

// =========================================
// DELETE PURCHASE REQUEST ITEM
// =========================================

app.delete(
  "/api/purchase-request-items/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase request item ID is required",
        });
      }

      const existingItem =
        await prisma.purchaseRequestItem.findUnique({
          where: { id },
        });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase request item not found",
        });
      }

      await prisma.purchaseRequestItem.delete({
        where: { id },
      });

      res.json({
        success: true,
        message:
          "Purchase request item deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete Purchase Request Item Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase request item delete করা যায়নি!",
      });
    }
  }
);



// =========================================
// UPDATE PURCHASE REQUEST
// =========================================

app.put(
  "/api/purchase-requests/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const {
        requestNo,
        requestDate,
        projectId,
        status,
        priority,
        notes,
      } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase request ID is required",
        });
      }

      // ==============================
      // REQUIRED VALIDATION
      // ==============================

      if (!requestNo || !requestNo.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase request number is required",
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project is required",
        });
      }

      const allowedStatuses = [
        "DRAFT",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CONVERTED",
        "CANCELLED",
      ];

      const allowedPriorities = [
        "LOW",
        "NORMAL",
        "HIGH",
        "URGENT",
      ];

      const requestStatus =
        status || "DRAFT";

      const requestPriority =
        priority || "NORMAL";

      if (
        !allowedStatuses.includes(
          requestStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid purchase request status",
        });
      }

      if (
        !allowedPriorities.includes(
          requestPriority
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid purchase request priority",
        });
      }

      // ==============================
      // FIND EXISTING REQUEST
      // ==============================

      const existingRequest =
        await prisma.purchaseRequest.findUnique({
          where: {
            id,
          },
        });

      if (!existingRequest) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase request not found",
        });
      }

      // ==============================
      // DUPLICATE REQUEST NO CHECK
      // ==============================

      const duplicateRequest =
        await prisma.purchaseRequest.findFirst({
          where: {
            requestNo: requestNo.trim(),
            NOT: {
              id,
            },
          },
        });

      if (duplicateRequest) {
        return res.status(400).json({
          success: false,
          message:
            "A purchase request with this number already exists",
        });
      }

      // ==============================
      // CHECK PROJECT
      // ==============================

      const project =
        await prisma.project.findUnique({
          where: {
            id: Number(projectId),
          },
        });

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found",
        });
      }

      // ==============================
      // UPDATE REQUEST
      // ==============================

      const updatedRequest =
        await prisma.purchaseRequest.update({
          where: {
            id,
          },

          data: {
            requestNo:
              requestNo.trim(),

            requestDate:
              requestDate
                ? new Date(requestDate)
                : existingRequest.requestDate,

            projectId:
              Number(projectId),

            status:
              requestStatus,

            priority:
              requestPriority,

            notes:
              notes?.trim() || null,
          },

          include: {
            project: true,

            items: {
              include: {
                material: true,
              },

              orderBy: {
                id: "asc",
              },
            },
          },
        });

      res.json({
        success: true,
        message:
          "Purchase request updated successfully",
        data: updatedRequest,
      });
    } catch (error) {
      console.error(
        "Update Purchase Request Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase request update করা যায়নি!",
      });
    }
  }
);

// =========================================
// DELETE PURCHASE REQUEST
// =========================================

app.delete(
  "/api/purchase-requests/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase request ID is required",
        });
      }

      const existingRequest =
        await prisma.purchaseRequest.findUnique({
          where: {
            id,
          },

          include: {
            items: true,
          },
        });

      if (!existingRequest) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase request not found",
        });
      }

      await prisma.purchaseRequest.delete({
        where: {
          id,
        },
      });

      res.json({
        success: true,
        message:
          "Purchase request deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete Purchase Request Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase request delete করা যায়নি!",
      });
    }
  }
);
// =========================================
// GET SINGLE PURCHASE REQUEST
// =========================================

app.get(
  "/api/purchase-requests/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase request ID is required",
        });
      }

      const purchaseRequest =
        await prisma.purchaseRequest.findUnique({
          where: {
            id,
          },

          include: {
            project: true,

            items: {
              include: {
                material: true,
              },

              orderBy: {
                id: "asc",
              },
            },
          },
        });

      if (!purchaseRequest) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase request not found",
        });
      }

      res.json({
        success: true,
        data: purchaseRequest,
      });
    } catch (error) {
      console.error(
        "Get Purchase Request Details Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase request details load করা যায়নি!",
      });
    }
  }
);
// =========================================
// RFQ API
// =========================================

// GET ALL RFQs
app.get("/api/rfqs", async (req, res) => {
  try {
    const rfqs = await prisma.rFQ.findMany({
      include: {
        project: true,

        vendors: {
          include: {
            vendor: true,
          },
        },

        items: {
          include: {
            material: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },

      orderBy: {
        id: "desc",
      },
    });

    res.json({
      success: true,
      data: rfqs,
    });
  } catch (error) {
    console.error(
      "Get RFQs Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "RFQs load করা যায়নি!",
    });
  }
});

// CREATE RFQ
app.post("/api/rfqs", async (req, res) => {
  try {
    const {
      rfqNo,
      rfqDate,
      projectId,
      status,
      notes,
    } = req.body;

    // ==============================
    // VALIDATION
    // ==============================

    if (!rfqNo || !rfqNo.trim()) {
      return res.status(400).json({
        success: false,
        message: "RFQ number is required",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project is required",
      });
    }

    const allowedStatuses = [
      "DRAFT",
      "SENT",
      "QUOTED",
      "EVALUATED",
      "AWARDED",
      "CANCELLED",
    ];

    const rfqStatus = status || "DRAFT";

    if (!allowedStatuses.includes(rfqStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid RFQ status",
      });
    }

    // ==============================
    // DUPLICATE RFQ NO
    // ==============================

    const existingRFQ =
      await prisma.rFQ.findUnique({
        where: {
          rfqNo: rfqNo.trim(),
        },
      });

    if (existingRFQ) {
      return res.status(400).json({
        success: false,
        message: "An RFQ with this number already exists",
      });
    }

    // ==============================
    // CHECK PROJECT
    // ==============================

    const project =
      await prisma.project.findUnique({
        where: {
          id: Number(projectId),
        },
      });

    if (!project) {
      return res.status(400).json({
        success: false,
        message: "Project not found",
      });
    }

    // ==============================
    // CREATE RFQ
    // ==============================

    const rfq =
      await prisma.rFQ.create({
        data: {
          rfqNo: rfqNo.trim(),

          rfqDate: rfqDate
            ? new Date(rfqDate)
            : new Date(),

          projectId: Number(projectId),

          status: rfqStatus,

          notes:
            notes?.trim() || null,
        },

        include: {
          project: true,

          vendors: {
            include: {
              vendor: true,
            },
          },

          items: {
            include: {
              material: true,
            },
          },
        },
      });

    res.status(201).json({
      success: true,
      message: "RFQ created successfully",
      data: rfq,
    });

  } catch (error) {
    console.error(
      "Create RFQ Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "RFQ create করা যায়নি!",
    });
  }
});
// =========================================
// CONVERT PURCHASE REQUEST TO RFQ
// =========================================

app.post(
  "/api/purchase-requests/:id/convert-to-rfq",
  async (req, res) => {
    try {
      const purchaseRequestId =
        Number(req.params.id);

      const {
        rfqNo,
        rfqDate,
        status,
        notes,
      } = req.body;

      // ==============================
      // VALIDATION
      // ==============================

      if (
        !Number.isInteger(
          purchaseRequestId
        ) ||
        purchaseRequestId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid purchase request ID",
        });
      }

      if (!rfqNo || !rfqNo.trim()) {
        return res.status(400).json({
          success: false,
          message:
            "RFQ number is required",
        });
      }

      const allowedStatuses = [
        "DRAFT",
        "SENT",
        "QUOTED",
        "EVALUATED",
        "AWARDED",
        "CANCELLED",
      ];

      const rfqStatus =
        status || "DRAFT";

      if (
        !allowedStatuses.includes(
          rfqStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid RFQ status",
        });
      }

      // ==============================
      // CHECK PURCHASE REQUEST
      // ==============================

      const purchaseRequest =
        await prisma.purchaseRequest.findUnique({
          where: {
            id: purchaseRequestId,
          },

          include: {
            project: true,

            items: {
              include: {
                material: true,
              },

              orderBy: {
                id: "asc",
              },
            },
          },
        });

      if (!purchaseRequest) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase request not found",
        });
      }

      // ==============================
      // CHECK ITEMS
      // ==============================

      if (
        !purchaseRequest.items ||
        purchaseRequest.items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot create RFQ because this purchase request has no items",
        });
      }

      // ==============================
      // CHECK DUPLICATE RFQ NO
      // ==============================

      const existingRFQ =
        await prisma.rFQ.findUnique({
          where: {
            rfqNo: rfqNo.trim(),
          },
        });

      if (existingRFQ) {
        return res.status(400).json({
          success: false,
          message:
            "An RFQ with this number already exists",
        });
      }

      // ==============================
      // CREATE RFQ + ITEMS
      // ==============================

      const rfq =
        await prisma.$transaction(
          async (tx) => {

            const createdRFQ =
              await tx.rFQ.create({
                data: {
                  rfqNo:
                    rfqNo.trim(),

                  rfqDate:
                    rfqDate
                      ? new Date(
                          rfqDate
                        )
                      : new Date(),

                  projectId:
                    purchaseRequest.projectId,

                  status:
                    rfqStatus,

                  notes:
                    notes?.trim() ||
                    `Created from Purchase Request ${purchaseRequest.requestNo}`,
                },
              });


            // ==========================
            // COPY PR ITEMS TO RFQ
            // ==========================

            for (
              const item
              of purchaseRequest.items
            ) {

              await tx.rFQItem.create({
                data: {
                  rfqId:
                    createdRFQ.id,

                  materialId:
                    item.materialId,

                  quantity:
                    Number(
                      item.quantity
                    ),

                  unit:
                    item.unit,

                  notes:
                    item.notes ||
                    null,
                },
              });
            }


            // ==========================
            // MARK PR AS CONVERTED
            // ==========================

            await tx.purchaseRequest.update({
              where: {
                id:
                  purchaseRequestId,
              },

              data: {
                status:
                  "CONVERTED",
              },
            });


            return createdRFQ;
          }
        );


      // ==============================
      // GET COMPLETE RFQ
      // ==============================

      const completeRFQ =
        await prisma.rFQ.findUnique({
          where: {
            id: rfq.id,
          },

          include: {
            project: true,

            items: {
              include: {
                material: true,
              },

              orderBy: {
                id: "asc",
              },
            },

            vendors: {
              include: {
                vendor: true,
              },
            },
          },
        });


      // ==============================
      // SUCCESS
      // ==============================

      res.status(201).json({
        success: true,

        message:
          "Purchase request converted to RFQ successfully",

        data: completeRFQ,
      });

    } catch (error) {

      console.error(
        "Convert Purchase Request To RFQ Error:",
        error
      );

      if (
        error.code === "P2002"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "An RFQ with this number already exists",
        });
      }

      res.status(500).json({
        success: false,
        message:
          "Purchase request to RFQ conversion failed!",
      });
    }
  }
);

// =========================================
// UPDATE RFQ
// =========================================

app.put(
  "/api/rfqs/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const {
        rfqNo,
        rfqDate,
        projectId,
        status,
        notes,
      } = req.body;

      // ==============================
      // BASIC VALIDATION
      // ==============================

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ ID",
        });
      }

      if (!rfqNo || !rfqNo.trim()) {
        return res.status(400).json({
          success: false,
          message: "RFQ number is required",
        });
      }

      if (!rfqDate) {
        return res.status(400).json({
          success: false,
          message: "RFQ date is required",
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project is required",
        });
      }

      const allowedStatuses = [
        "DRAFT",
        "SENT",
        "CLOSED",
        "AWARDED",
        "CANCELLED",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ status",
        });
      }

      // ==============================
      // FIND EXISTING RFQ
      // ==============================

      const existingRFQ =
        await prisma.rFQ.findUnique({
          where: {
            id,
          },
        });

      if (!existingRFQ) {
        return res.status(404).json({
          success: false,
          message: "RFQ not found",
        });
      }

      // ==============================
      // DUPLICATE RFQ NUMBER
      // ==============================

      const duplicateRFQ =
        await prisma.rFQ.findFirst({
          where: {
            rfqNo: rfqNo.trim(),
            NOT: {
              id,
            },
          },
        });

      if (duplicateRFQ) {
        return res.status(400).json({
          success: false,
          message:
            "An RFQ with this number already exists",
        });
      }

      // ==============================
      // CHECK PROJECT
      // ==============================

      const project =
        await prisma.project.findUnique({
          where: {
            id: Number(projectId),
          },
        });

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found",
        });
      }

      // ==============================
      // UPDATE RFQ
      // ==============================

      const updatedRFQ =
        await prisma.rFQ.update({
          where: {
            id,
          },

          data: {
            rfqNo:
              rfqNo.trim(),

            rfqDate:
              new Date(rfqDate),

            projectId:
              Number(projectId),

            status,

            notes:
              notes?.trim() || null,
          },

          include: {
            project: true,

            items: {
              include: {
                material: true,
              },

              orderBy: {
                id: "asc",
              },
            },

            vendors: {
              include: {
                vendor: true,
              },

              orderBy: {
                id: "asc",
              },
            },

            awardedVendor: true,
          },
        });

      res.json({
        success: true,
        message:
          "RFQ updated successfully",
        data: updatedRFQ,
      });

    } catch (error) {
      console.error(
        "Update RFQ Error:",
        error
      );

      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message:
            "An RFQ with this number already exists",
        });
      }

      res.status(500).json({
        success: false,
        message:
          "RFQ update করা যায়নি!",
      });
    }
  }
);

// =========================================
// DELETE RFQ
// =========================================

app.delete(
  "/api/rfqs/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ ID",
        });
      }

      // ==============================
      // FIND RFQ
      // ==============================

      const existingRFQ =
        await prisma.rFQ.findUnique({
          where: {
            id,
          },

          include: {
            items: true,
            vendors: true,
            purchaseOrders: true,
          },
        });

      if (!existingRFQ) {
        return res.status(404).json({
          success: false,
          message: "RFQ not found",
        });
      }

      // ==============================
      // BLOCK DELETE IF PO EXISTS
      // ==============================

      if (
        existingRFQ.purchaseOrders &&
        existingRFQ.purchaseOrders.length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot delete RFQ because purchase orders are linked to it",
        });
      }

      // ==============================
      // DELETE RFQ
      // ==============================

      await prisma.rFQ.delete({
        where: {
          id,
        },
      });

      res.json({
        success: true,
        message:
          "RFQ deleted successfully",
      });

    } catch (error) {
      console.error(
        "Delete RFQ Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "RFQ delete করা যায়নি!",
      });
    }
  }
);
// =========================================
// RFQ ITEM API
// =========================================

// CREATE RFQ ITEM
app.post(
  "/api/rfqs/:id/items",
  async (req, res) => {
    try {
      const rfqId = Number(req.params.id);

      const {
        materialId,
        quantity,
        unit,
        notes,
      } = req.body;

      // ==============================
      // BASIC VALIDATION
      // ==============================

      if (!Number.isInteger(rfqId) || rfqId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ ID",
        });
      }

      if (!materialId) {
        return res.status(400).json({
          success: false,
          message: "Material is required",
        });
      }

      const qty = Number(quantity);

      if (
        Number.isNaN(qty) ||
        qty <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than 0",
        });
      }

      if (!unit || !unit.trim()) {
        return res.status(400).json({
          success: false,
          message: "Unit is required",
        });
      }

      // ==============================
      // CHECK RFQ
      // ==============================

      const rfq =
        await prisma.rFQ.findUnique({
          where: {
            id: rfqId,
          },
        });

      if (!rfq) {
        return res.status(404).json({
          success: false,
          message: "RFQ not found",
        });
      }

      // ==============================
      // CHECK MATERIAL
      // ==============================

      const material =
        await prisma.material.findUnique({
          where: {
            id: Number(materialId),
          },
        });

      if (!material) {
        return res.status(400).json({
          success: false,
          message: "Material not found",
        });
      }

      // ==============================
      // CREATE RFQ ITEM
      // ==============================

      const item =
        await prisma.rFQItem.create({
          data: {
            rfqId,

            materialId:
              Number(materialId),

            quantity: qty,

            unit:
              unit.trim(),

            notes:
              notes?.trim() || null,
          },

          include: {
            material: true,

            rfq: {
              include: {
                project: true,
              },
            },
          },
        });

      res.status(201).json({
        success: true,
        message:
          "RFQ item created successfully",
        data: item,
      });

    } catch (error) {
      console.error(
        "Create RFQ Item Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "RFQ item create করা যায়নি!",
      });
    }
  }
);


// =========================================
// UPDATE RFQ ITEM
// =========================================

app.put(
  "/api/rfq-items/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const {
        materialId,
        quantity,
        unit,
        notes,
      } = req.body;

      // ==============================
      // VALIDATION
      // ==============================

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ item ID",
        });
      }

      if (!materialId) {
        return res.status(400).json({
          success: false,
          message: "Material is required",
        });
      }

      const qty = Number(quantity);

      if (
        Number.isNaN(qty) ||
        qty <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than 0",
        });
      }

      if (!unit || !unit.trim()) {
        return res.status(400).json({
          success: false,
          message: "Unit is required",
        });
      }

      // ==============================
      // FIND EXISTING ITEM
      // ==============================

      const existingItem =
        await prisma.rFQItem.findUnique({
          where: {
            id,
          },
        });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "RFQ item not found",
        });
      }

      // ==============================
      // CHECK MATERIAL
      // ==============================

      const material =
        await prisma.material.findUnique({
          where: {
            id: Number(materialId),
          },
        });

      if (!material) {
        return res.status(400).json({
          success: false,
          message: "Material not found",
        });
      }

      // ==============================
      // UPDATE ITEM
      // ==============================

      const updatedItem =
        await prisma.rFQItem.update({
          where: {
            id,
          },

          data: {
            materialId:
              Number(materialId),

            quantity:
              qty,

            unit:
              unit.trim(),

            notes:
              notes?.trim() || null,
          },

          include: {
            material: true,

            rfq: {
              include: {
                project: true,
              },
            },
          },
        });

      res.json({
        success: true,
        message:
          "RFQ item updated successfully",
        data: updatedItem,
      });

    } catch (error) {
      console.error(
        "Update RFQ Item Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "RFQ item update করা যায়নি!",
      });
    }
  }
);


// =========================================
// DELETE RFQ ITEM
// =========================================

app.delete(
  "/api/rfq-items/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ item ID",
        });
      }

      const existingItem =
        await prisma.rFQItem.findUnique({
          where: {
            id,
          },
        });

      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: "RFQ item not found",
        });
      }

      await prisma.rFQItem.delete({
        where: {
          id,
        },
      });

      res.json({
        success: true,
        message: "RFQ item deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete RFQ Item Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "RFQ item delete করা যায়নি!",
      });
    }
  }
);

// =========================================
// RFQ VENDOR API
// =========================================

// ADD VENDOR TO RFQ
app.post(
  "/api/rfqs/:id/vendors",
  async (req, res) => {
    try {
      const rfqId = Number(req.params.id);

      const {
        vendorId,
        quotedTotal,
        notes,
      } = req.body;

      // ==============================
      // BASIC VALIDATION
      // ==============================

      if (!Number.isInteger(rfqId) || rfqId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ ID",
        });
      }

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor is required",
        });
      }

      const cleanVendorId = Number(vendorId);

      if (
        Number.isNaN(cleanVendorId) ||
        cleanVendorId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor ID",
        });
      }

      const cleanQuotedTotal =
        quotedTotal === undefined ||
        quotedTotal === null ||
        quotedTotal === ""
          ? null
          : Number(quotedTotal);

      if (
        cleanQuotedTotal !== null &&
        (Number.isNaN(cleanQuotedTotal) ||
          cleanQuotedTotal < 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quoted total cannot be negative",
        });
      }

      // ==============================
      // CHECK RFQ
      // ==============================

      const rfq =
        await prisma.rFQ.findUnique({
          where: {
            id: rfqId,
          },
        });

      if (!rfq) {
        return res.status(404).json({
          success: false,
          message: "RFQ not found",
        });
      }

      // ==============================
      // CHECK VENDOR
      // ==============================

      const vendor =
        await prisma.vendor.findUnique({
          where: {
            id: cleanVendorId,
          },
        });

      if (!vendor) {
        return res.status(400).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // ==============================
      // DUPLICATE VENDOR CHECK
      // ==============================

      const existingRFQVendor =
        await prisma.rFQVendor.findFirst({
          where: {
            rfqId,
            vendorId: cleanVendorId,
          },
        });

      if (existingRFQVendor) {
        return res.status(400).json({
          success: false,
          message:
            "This vendor is already added to this RFQ",
        });
      }

      // ==============================
      // CREATE RFQ VENDOR
      // ==============================

      const rfqVendor =
        await prisma.rFQVendor.create({
          data: {
            rfqId,

            vendorId:
              cleanVendorId,

            quotedTotal:
              cleanQuotedTotal,

            notes:
              notes?.trim() || null,
          },

          include: {
            vendor: true,

            rfq: {
              include: {
                project: true,
                items: {
                  include: {
                    material: true,
                  },
                },
              },
            },
          },
        });

      res.status(201).json({
        success: true,
        message:
          "Vendor added to RFQ successfully",
        data: rfqVendor,
      });

    } catch (error) {
      console.error(
        "Add RFQ Vendor Error:",
        error
      );

      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message:
            "This vendor is already added to this RFQ",
        });
      }

      res.status(500).json({
        success: false,
        message:
          "Vendor add করা যায়নি!",
      });
    }
  }
);

// =========================================
// UPDATE RFQ VENDOR
// =========================================

app.put(
  "/api/rfq-vendors/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const {
        vendorId,
        quotedTotal,
        notes,
      } = req.body;

      // ==============================
      // BASIC VALIDATION
      // ==============================

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ vendor ID",
        });
      }

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor is required",
        });
      }

      const cleanVendorId = Number(vendorId);

      if (
        Number.isNaN(cleanVendorId) ||
        cleanVendorId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor ID",
        });
      }

      const cleanQuotedTotal =
        quotedTotal === undefined ||
        quotedTotal === null ||
        quotedTotal === ""
          ? null
          : Number(quotedTotal);

      if (
        cleanQuotedTotal !== null &&
        (
          Number.isNaN(cleanQuotedTotal) ||
          cleanQuotedTotal < 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quoted total cannot be negative",
        });
      }

      // ==============================
      // FIND EXISTING RFQ VENDOR
      // ==============================

      const existingRFQVendor =
        await prisma.rFQVendor.findUnique({
          where: {
            id,
          },
        });

      if (!existingRFQVendor) {
        return res.status(404).json({
          success: false,
          message:
            "RFQ vendor not found",
        });
      }

      // ==============================
      // CHECK VENDOR
      // ==============================

      const vendor =
        await prisma.vendor.findUnique({
          where: {
            id: cleanVendorId,
          },
        });

      if (!vendor) {
        return res.status(400).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // ==============================
      // DUPLICATE VENDOR CHECK
      // ==============================

      const duplicateVendor =
        await prisma.rFQVendor.findFirst({
          where: {
            rfqId:
              existingRFQVendor.rfqId,

            vendorId:
              cleanVendorId,

            NOT: {
              id,
            },
          },
        });

      if (duplicateVendor) {
        return res.status(400).json({
          success: false,
          message:
            "This vendor is already added to this RFQ",
        });
      }

      // ==============================
      // UPDATE RFQ VENDOR
      // ==============================

      const updatedRFQVendor =
        await prisma.rFQVendor.update({
          where: {
            id,
          },

          data: {
            vendorId:
              cleanVendorId,

            quotedTotal:
              cleanQuotedTotal,

            notes:
              notes?.trim() || null,
          },

          include: {
            vendor: true,

            rfq: {
              include: {
                project: true,

                items: {
                  include: {
                    material: true,
                  },
                },

                vendors: {
                  include: {
                    vendor: true,
                  },
                },
              },
            },
          },
        });

      res.json({
        success: true,
        message:
          "RFQ vendor updated successfully",
        data: updatedRFQVendor,
      });

    } catch (error) {
      console.error(
        "Update RFQ Vendor Error:",
        error
      );

      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message:
            "This vendor is already added to this RFQ",
        });
      }

      res.status(500).json({
        success: false,
        message:
          "RFQ vendor update করা যায়নি!",
      });
    }
  }
);


// =========================================
// DELETE RFQ VENDOR
// =========================================

app.delete(
  "/api/rfq-vendors/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ vendor ID",
        });
      }

      const existingRFQVendor =
        await prisma.rFQVendor.findUnique({
          where: {
            id,
          },
        });

      if (!existingRFQVendor) {
        return res.status(404).json({
          success: false,
          message: "RFQ vendor not found",
        });
      }

      await prisma.rFQVendor.delete({
        where: {
          id,
        },
      });

      res.json({
        success: true,
        message: "RFQ vendor deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete RFQ Vendor Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "RFQ vendor delete করা যায়নি!",
      });
    }
  }
);

// =========================================
// RFQ PRICE COMPARISON
// =========================================

app.get(
  "/api/rfqs/:id/price-comparison",
  async (req, res) => {
    try {
      const rfqId = Number(req.params.id);

      if (!Number.isInteger(rfqId) || rfqId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ ID",
        });
      }

      const rfq = await prisma.rFQ.findUnique({
        where: {
          id: rfqId,
        },

        include: {
          project: true,

          items: {
            include: {
              material: true,
            },
            orderBy: {
              id: "asc",
            },
          },

          vendors: {
            include: {
              vendor: true,
            },
            orderBy: {
              quotedTotal: "asc",
            },
          },
        },
      });

      if (!rfq) {
        return res.status(404).json({
          success: false,
          message: "RFQ not found",
        });
      }

      // =================================
      // ONLY VENDORS WITH QUOTES
      // =================================

      const quotedVendors =
        rfq.vendors.filter(
          (item) =>
            item.quotedTotal !== null
        );

      if (quotedVendors.length === 0) {
        return res.json({
          success: true,
          data: {
            rfqId: rfq.id,
            rfqNo: rfq.rfqNo,
            project: rfq.project,

            items: rfq.items,

            vendors: [],

            lowestQuote: null,
            highestQuote: null,
            savingAmount: null,
            bestVendor: null,
          },
        });
      }

      // =================================
      // SORT BY LOWEST QUOTE
      // =================================

      const sortedVendors =
        [...quotedVendors].sort(
          (a, b) =>
            Number(a.quotedTotal) -
            Number(b.quotedTotal)
        );

      const lowestQuote =
        Number(
          sortedVendors[0].quotedTotal
        );

      const highestQuote =
        Number(
          sortedVendors[
            sortedVendors.length - 1
          ].quotedTotal
        );

      const savingAmount =
        highestQuote - lowestQuote;

      const bestVendor =
        sortedVendors[0];

      // =================================
      // RESPONSE
      // =================================

      res.json({
        success: true,

        data: {
          rfqId: rfq.id,
          rfqNo: rfq.rfqNo,

          project: rfq.project,

          items: rfq.items,

          vendors: sortedVendors.map(
            (item, index) => ({
              id: item.id,

              vendorId:
                item.vendorId,

              vendorName:
                item.vendor?.name || "-",

              companyName:
                item.vendor?.companyName ||
                "-",

              quotedTotal:
                Number(
                  item.quotedTotal
                ),

              notes:
                item.notes,

              rank: index + 1,
            })
          ),

          lowestQuote,

          highestQuote,

          savingAmount,

          bestVendor: {
            rfqVendorId:
              bestVendor.id,

            vendorId:
              bestVendor.vendorId,

            vendorName:
              bestVendor.vendor?.name ||
              "-",

            companyName:
              bestVendor.vendor
                ?.companyName || "-",

            quotedTotal:
              Number(
                bestVendor.quotedTotal
              ),
          },
        },
      });
    } catch (error) {
      console.error(
        "RFQ Price Comparison Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "RFQ price comparison করা যায়নি!",
      });
    }
  }
);

// =========================================
// AWARD RFQ
// =========================================

app.post(
  "/api/rfqs/:id/award",
  async (req, res) => {
    try {
      const rfqId = Number(req.params.id);

      const {
        rfqVendorId,
      } = req.body;

      // ==============================
      // VALIDATION
      // ==============================

      if (!Number.isInteger(rfqId) || rfqId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid RFQ ID",
        });
      }

      if (!rfqVendorId) {
        return res.status(400).json({
          success: false,
          message:
            "RFQ vendor is required",
        });
      }

      const cleanRFQVendorId =
        Number(rfqVendorId);

      // ==============================
      // CHECK RFQ
      // ==============================

      const rfq =
        await prisma.rFQ.findUnique({
          where: {
            id: rfqId,
          },
        });

      if (!rfq) {
        return res.status(404).json({
          success: false,
          message: "RFQ not found",
        });
      }

      // ==============================
      // CHECK RFQ VENDOR
      // ==============================

      const rfqVendor =
        await prisma.rFQVendor.findUnique({
          where: {
            id: cleanRFQVendorId,
          },

          include: {
            vendor: true,
          },
        });

      if (!rfqVendor) {
        return res.status(404).json({
          success: false,
          message:
            "RFQ vendor not found",
        });
      }

      if (rfqVendor.rfqId !== rfqId) {
        return res.status(400).json({
          success: false,
          message:
            "This vendor does not belong to this RFQ",
        });
      }

      if (
        rfqVendor.quotedTotal === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot award a vendor without a quotation",
        });
      }

      // ==============================
      // AWARD RFQ
      // ==============================

      const awardedRFQ =
        await prisma.rFQ.update({
          where: {
            id: rfqId,
          },

          data: {
            status: "AWARDED",

            awardedVendorId:
              rfqVendor.vendorId,
          },

          include: {
            project: true,

            awardedVendor: true,

            vendors: {
              include: {
                vendor: true,
              },

              orderBy: {
                quotedTotal: "asc",
              },
            },

            items: {
              include: {
                material: true,
              },

              orderBy: {
                id: "asc",
              },
            },
          },
        });

      res.json({
        success: true,
        message:
          "RFQ awarded successfully",
        data: awardedRFQ,
      });

    } catch (error) {
      console.error(
        "Award RFQ Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "RFQ award করা যায়নি!",
      });
    }
  }
);

// =========================================
// GET SINGLE RFQ
// =========================================

app.get("/api/rfqs/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid RFQ ID",
      });
    }

    const rfq = await prisma.rFQ.findUnique({
      where: {
        id,
      },

      include: {
        project: true,

        items: {
          include: {
            material: true,
          },

          orderBy: {
            id: "asc",
          },
        },

        vendors: {
          include: {
            vendor: true,
          },

          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!rfq) {
      return res.status(404).json({
        success: false,
        message: "RFQ not found",
      });
    }

    res.json({
      success: true,
      data: rfq,
    });
  } catch (error) {
    console.error(
      "Get RFQ Details Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "RFQ details load করা যায়নি!",
    });
  }
});



// =========================================
// PURCHASE ORDER API
// =========================================

// CREATE PURCHASE ORDER
app.post("/api/purchase-orders", async (req, res) => {
  try {
    const {
      poNo,
      poDate,
      vendorId,
      projectId,
      rfqId,
      discount,
      transportCost,
      notes,
      items,
    } = req.body;

    // ==============================
    // BASIC VALIDATION
    // ==============================

    if (!poNo || !poNo.trim()) {
      return res.status(400).json({
        success: false,
        message: "PO number is required",
      });
    }

    if (!poDate) {
      return res.status(400).json({
        success: false,
        message: "PO date is required",
      });
    }

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one purchase order item is required",
      });
    }

    // ==============================
    // CHECK VENDOR
    // ==============================

    const vendor =
      await prisma.vendor.findUnique({
        where: {
          id: Number(vendorId),
        },
      });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // ==============================
    // CHECK PROJECT
    // ==============================

    if (projectId) {
      const project =
        await prisma.project.findUnique({
          where: {
            id: Number(projectId),
          },
        });

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found",
        });
      }
    }

    // ==============================
    // CHECK RFQ
    // ==============================

    let rfq = null;

    if (rfqId) {
      rfq =
        await prisma.rFQ.findUnique({
          where: {
            id: Number(rfqId),
          },
        });

      if (!rfq) {
        return res.status(400).json({
          success: false,
          message: "RFQ not found",
        });
      }

      if (rfq.status !== "AWARDED") {
        return res.status(400).json({
          success: false,
          message:
            "Only an awarded RFQ can be converted to a purchase order",
        });
      }

      if (
        rfq.awardedVendorId !==
        Number(vendorId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "PO vendor must match the awarded RFQ vendor",
        });
      }
    }


    // ==============================
    // DUPLICATE PO NUMBER
    // ==============================

    const existingPO =
      await prisma.purchaseOrder.findUnique({
        where: {
          poNo: poNo.trim(),
        },
      });

    if (existingPO) {
      return res.status(400).json({
        success: false,
        message:
          "A purchase order with this number already exists",
      });
    }

    // ==============================
    // PREPARE ITEMS
    // ==============================

    let subtotal = 0;

    const preparedItems = [];

    for (const item of items) {
      const materialId =
        Number(item.materialId);

      const quantity =
        Number(item.quantity);

      const unitPrice =
        Number(item.unitPrice);

      if (!materialId) {
        return res.status(400).json({
          success: false,
          message:
            "Material is required for every PO item",
        });
      }

      if (
        Number.isNaN(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than 0",
        });
      }

      if (
        Number.isNaN(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unit price cannot be negative",
        });
      }

      const material =
        await prisma.material.findUnique({
          where: {
            id: materialId,
          },
        });

      if (!material) {
        return res.status(400).json({
          success: false,
          message:
            `Material ID ${materialId} not found`,
        });
      }

      const total =
        quantity * unitPrice;

      subtotal += total;

      preparedItems.push({
        materialId,
        quantity,
        unit:
          item.unit?.trim() ||
          material.unit,
        unitPrice,
        total,
        notes:
          item.notes?.trim() || null,
      });
    }

    // ==============================
    // CALCULATE TOTALS
    // ==============================

    const discountAmount =
      Number(discount) || 0;

    const transportAmount =
      Number(transportCost) || 0;

    if (discountAmount < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot be negative",
      });
    }

    if (transportAmount < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Transport cost cannot be negative",
      });
    }

    if (discountAmount > subtotal) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot be greater than subtotal",
      });
    }

    const grandTotal =
      subtotal -
      discountAmount +
      transportAmount;

    // ==============================
    // CREATE PO
    // ==============================

    const purchaseOrder =
      await prisma.purchaseOrder.create({
        data: {
          poNo:
            poNo.trim(),

          poDate:
            new Date(poDate),

          vendorId:
            Number(vendorId),

          projectId:
            projectId
              ? Number(projectId)
              : null,

          rfqId:
            rfqId
              ? Number(rfqId)
              : null,

          status:
            "DRAFT",

          subtotal,

          discount:
            discountAmount,

          transportCost:
            transportAmount,

          grandTotal,

          notes:
            notes?.trim() || null,

          items: {
            create: preparedItems.map(
              (item) => ({
                materialId:
                  item.materialId,

                quantity:
                  item.quantity,

                unit:
                  item.unit,

                unitPrice:
                  item.unitPrice,

                total:
                  item.total,

                notes:
                  item.notes,
              })
            ),
          },
        },

        include: {
          vendor: true,
          project: true,
          rfq: true,

          items: {
            include: {
              material: true,
            },
          },
        },
      });

    res.status(201).json({
      success: true,
      message:
        "Purchase order created successfully",
      data: purchaseOrder,
    });

  } catch (error) {
    console.error(
      "Create Purchase Order Error:",
      error
    );

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message:
          "Purchase order number already exists",
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Purchase order create করা যায়নি!",
    });
  }
});

// =========================================
// GET ALL PURCHASE ORDERS
// =========================================

app.get("/api/purchase-orders", async (req, res) => {
  try {
    const purchaseOrders =
      await prisma.purchaseOrder.findMany({
        include: {
          vendor: true,
          project: true,
          rfq: true,
          purchase: true,
          items: {
            include: {
              material: true,
            },
          },
        },
        orderBy: {
          id: "desc",
        },
      });

    res.json({
      success: true,
      data: purchaseOrders,
    });
  } catch (error) {
    console.error(
      "Get Purchase Orders Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Purchase orders load করা যায়নি!",
    });
  }
});


// =========================================
// GET SINGLE PURCHASE ORDER
// =========================================

app.get(
  "/api/purchase-orders/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      const purchaseOrder =
        await prisma.purchaseOrder.findUnique({
          where: {
            id,
          },

          include: {
            vendor: true,
            project: true,
            rfq: true,

            items: {
              include: {
                material: true,
              },

              orderBy: {
                id: "asc",
              },
            },
          },
        });

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      res.json({
        success: true,
        data: purchaseOrder,
      });
    } catch (error) {
      console.error(
        "Get Single Purchase Order Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase order details load করা যায়নি!",
      });
    }
  }
);



// =========================================
// UPDATE PURCHASE ORDER
// =========================================

app.put(
  "/api/purchase-orders/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      const {
        poNo,
        poDate,
        vendorId,
        projectId,
        rfqId,
        discount,
        transportCost,
        notes,
        items,
      } = req.body;

      // ==============================
      // BASIC VALIDATION
      // ==============================

      if (!poNo || !poNo.trim()) {
        return res.status(400).json({
          success: false,
          message: "PO number is required",
        });
      }

      if (!poDate) {
        return res.status(400).json({
          success: false,
          message: "PO date is required",
        });
      }

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor is required",
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "At least one purchase order item is required",
        });
      }

      // ==============================
      // FIND EXISTING PO
      // ==============================

      const existingPO =
        await prisma.purchaseOrder.findUnique({
          where: {
            id,
          },
        });

      if (!existingPO) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      // ==============================
      // DUPLICATE PO NUMBER
      // ==============================

      const duplicatePO =
        await prisma.purchaseOrder.findFirst({
          where: {
            poNo: poNo.trim(),
            NOT: {
              id,
            },
          },
        });

      if (duplicatePO) {
        return res.status(400).json({
          success: false,
          message:
            "A purchase order with this number already exists",
        });
      }

      // ==============================
      // CHECK VENDOR
      // ==============================

      const vendor =
        await prisma.vendor.findUnique({
          where: {
            id: Number(vendorId),
          },
        });

      if (!vendor) {
        return res.status(400).json({
          success: false,
          message: "Vendor not found",
        });
      }

      // ==============================
      // CHECK PROJECT
      // ==============================

      if (projectId) {
        const project =
          await prisma.project.findUnique({
            where: {
              id: Number(projectId),
            },
          });

        if (!project) {
          return res.status(400).json({
            success: false,
            message: "Project not found",
          });
        }
      }

      // ==============================
      // CHECK RFQ
      // ==============================

      if (rfqId) {
        const rfq =
          await prisma.rFQ.findUnique({
            where: {
              id: Number(rfqId),
            },
          });

        if (!rfq) {
          return res.status(400).json({
            success: false,
            message: "RFQ not found",
          });
        }

        if (rfq.status !== "AWARDED") {
          return res.status(400).json({
            success: false,
            message:
              "RFQ must be awarded before using it in a PO",
          });
        }

        if (
          rfq.awardedVendorId !==
          Number(vendorId)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "PO vendor must match the awarded RFQ vendor",
          });
        }
      }

      // ==============================
      // PREPARE ITEMS
      // ==============================

      let subtotal = 0;

      const preparedItems = [];

      for (const item of items) {
        const materialId =
          Number(item.materialId);

        const quantity =
          Number(item.quantity);

        const unitPrice =
          Number(item.unitPrice);

        if (!materialId) {
          return res.status(400).json({
            success: false,
            message:
              "Material is required for every PO item",
          });
        }

        if (
          Number.isNaN(quantity) ||
          quantity <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Quantity must be greater than 0",
          });
        }

        if (
          Number.isNaN(unitPrice) ||
          unitPrice < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Unit price cannot be negative",
          });
        }

        const material =
          await prisma.material.findUnique({
            where: {
              id: materialId,
            },
          });

        if (!material) {
          return res.status(400).json({
            success: false,
            message:
              `Material ID ${materialId} not found`,
          });
        }

        const total =
          quantity * unitPrice;

        subtotal += total;

        preparedItems.push({
          materialId,
          quantity,
          unit:
            item.unit?.trim() ||
            material.unit,
          unitPrice,
          total,
          notes:
            item.notes?.trim() || null,
        });
      }

      // ==============================
      // CALCULATE TOTALS
      // ==============================

      const discountAmount =
        Number(discount) || 0;

      const transportAmount =
        Number(transportCost) || 0;

      if (discountAmount < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Discount cannot be negative",
        });
      }

      if (transportAmount < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Transport cost cannot be negative",
        });
      }

      if (discountAmount > subtotal) {
        return res.status(400).json({
          success: false,
          message:
            "Discount cannot be greater than subtotal",
        });
      }

      const grandTotal =
        subtotal -
        discountAmount +
        transportAmount;

      // ==============================
      // UPDATE PO + ITEMS
      // ==============================

      const updatedPO =
        await prisma.$transaction(
          async (tx) => {
            await tx.purchaseOrder.update({
              where: {
                id,
              },

              data: {
                poNo: poNo.trim(),

                poDate:
                  new Date(poDate),

                vendor: {
                  connect: {
                    id: Number(vendorId),
                  },
                },

                project: projectId
                  ? {
                      connect: {
                        id: Number(projectId),
                      },
                    }
                  : {
                      disconnect: true,
                    },

                rfq: rfqId
                  ? {
                      connect: {
                        id: Number(rfqId),
                      },
                    }
                  : {
                      disconnect: true,
                    },

                subtotal,

                discount:
                  discountAmount,

                transportCost:
                  transportAmount,

                grandTotal,

                notes:
                  notes?.trim() || null,
              },
            });

            // ------------------------------
            // DELETE OLD PO ITEMS
            // ------------------------------

            await tx.purchaseOrderItem.deleteMany({
              where: {
                purchaseOrderId: id,
              },
            });

            // ------------------------------
            // CREATE UPDATED PO ITEMS
            // ------------------------------

            for (const item of preparedItems) {
              await tx.purchaseOrderItem.create({
                data: {
                  purchaseOrderId: id,

                  materialId:
                    item.materialId,

                  quantity:
                    item.quantity,

                  unit:
                    item.unit,

                  unitPrice:
                    item.unitPrice,

                  total:
                    item.total,

                  notes:
                    item.notes,
                },
              });
            }

            // ------------------------------
            // RETURN COMPLETE UPDATED PO
            // ------------------------------

            return tx.purchaseOrder.findUnique({
              where: {
                id,
              },

              include: {
                vendor: true,
                project: true,
                rfq: true,

                items: {
                  include: {
                    material: true,
                  },
                },
              },
            });
          }
        );

      res.json({
        success: true,
        message:
          "Purchase order updated successfully",
        data: updatedPO,
      });

    } catch (error) {
      console.error(
        "Update Purchase Order Error:",
        error
      );

      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message:
            "Purchase order number already exists",
        });
      }

      res.status(500).json({
        success: false,
        message:
          "Purchase order update করা যায়নি!",
      });
    }
  }
);


// =========================================
// DELETE PURCHASE ORDER
// =========================================

app.delete(
  "/api/purchase-orders/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      const existingPO =
        await prisma.purchaseOrder.findUnique({
          where: {
            id,
          },
        });

      if (!existingPO) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      await prisma.purchaseOrder.delete({
        where: {
          id,
        },
      });

      res.json({
        success: true,
        message:
          "Purchase order deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete Purchase Order Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase order delete করা যায়নি!",
      });
    }
  }
);

// =========================================
// UPDATE PURCHASE ORDER STATUS
// =========================================

app.patch(
  "/api/purchase-orders/:id/status",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const { status } = req.body;

      // ==============================
      // VALIDATE PO ID
      // ==============================

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order ID",
        });
      }

      // ==============================
      // VALIDATE STATUS
      // ==============================

      const allowedStatuses = [
        "DRAFT",
        "CONFIRMED",
        "SENT",
        "PARTIAL",
        "COMPLETED",
        "CANCELLED",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase order status",
        });
      }

      // ==============================
      // FIND PO
      // ==============================

      const purchaseOrder =
        await prisma.purchaseOrder.findUnique({
          where: {
            id,
          },
        });

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: "Purchase order not found",
        });
      }

      const currentStatus =
        purchaseOrder.status;

      // ==============================
      // ALREADY SAME STATUS
      // ==============================

      if (currentStatus === status) {
        return res.status(400).json({
          success: false,
          message:
            `Purchase order is already ${status}`,
        });
      }

      // ==============================
      // STATUS WORKFLOW
      // ==============================

      const allowedTransitions = {
        DRAFT: [
          "CONFIRMED",
          "CANCELLED",
        ],

        CONFIRMED: [
          "SENT",
          "CANCELLED",
        ],

        SENT: [
          "PARTIAL",
          "COMPLETED",
          "CANCELLED",
        ],

        PARTIAL: [
          "COMPLETED",
          "CANCELLED",
        ],

        COMPLETED: [],

        CANCELLED: [],
      };

      const nextStatuses =
        allowedTransitions[
          currentStatus
        ] || [];

      if (
        !nextStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Cannot change purchase order status from ${currentStatus} to ${status}`,
        });
      }

      // ==============================
      // UPDATE STATUS
      // ==============================

      const updatedPurchaseOrder =
        await prisma.purchaseOrder.update({
          where: {
            id,
          },

          data: {
            status,
          },

          include: {
            vendor: true,
            project: true,
            rfq: true,

            items: {
              include: {
                material: true,
              },
            },
          },
        });

      res.json({
        success: true,
        message:
          "Purchase order status updated successfully",
        data: updatedPurchaseOrder,
      });

    } catch (error) {
      console.error(
        "Update Purchase Order Status Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase order status update করা যায়নি!",
      });
    }
  }
);




// =========================================
// CONVERT PURCHASE ORDER TO PURCHASE
// =========================================

app.post(
  "/api/purchase-orders/:id/convert-to-purchase",
  async (req, res) => {
    try {
      const purchaseOrderId =
        Number(req.params.id);

      if (
        !Number.isInteger(purchaseOrderId) ||
        purchaseOrderId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid purchase order ID",
        });
      }

      // ==============================
      // GET PURCHASE ORDER
      // ==============================

      const purchaseOrder =
        await prisma.purchaseOrder.findUnique({
          where: {
            id: purchaseOrderId,
          },

          include: {
            vendor: true,
            project: true,
            rfq: true,
            purchase: true,   // ✅ এইটা নতুন
            items: {
              include: {
                material: true,
              },

              orderBy: {
                id: "asc",
              },
            },
          },
        });

      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message:
            "Purchase order not found",
        });
      }

      // ==============================
      // CHECK STATUS
      // ==============================

      if (
        purchaseOrder.status !==
        "COMPLETED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only a completed purchase order can be converted to purchase",
        });
      }

      // ==============================
      // CHECK ALREADY CONVERTED
      // ==============================

      if (purchaseOrder.purchaseId) {
        return res.status(400).json({
          success: false,
          message:
            "This purchase order has already been converted to a purchase",
          data: {
            purchaseId:
              purchaseOrder.purchaseId,
          },
        });
      }

      // ==============================
      // CHECK ITEMS
      // ==============================

      if (
        !Array.isArray(
          purchaseOrder.items
        ) ||
        purchaseOrder.items.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Purchase order has no items",
        });
      }

      // ==============================
      // CREATE PURCHASE
      // ==============================

      const result =
        await prisma.$transaction(
          async (tx) => {
            // ---------------------------------
            // CREATE PURCHASE
            // ---------------------------------

            const purchase =
              await tx.purchase.create({
                data: {
                  purchaseNo:
                    purchaseOrder.poNo,

                  purchaseDate:
                    purchaseOrder.poDate,

                  vendorId:
                    purchaseOrder.vendorId,

                  projectId:
                    purchaseOrder.projectId,

                  subtotal:
                    purchaseOrder.subtotal,

                  discount:
                    purchaseOrder.discount,

                  transportCost:
                    purchaseOrder.transportCost,

                  grandTotal:
                    purchaseOrder.grandTotal,

                 paymentStatus: "UNPAID",

                  paidAmount: 0,

                  dueAmount:
                    purchaseOrder.grandTotal,

                  notes:
                    purchaseOrder.notes ||
                    `Converted from ${purchaseOrder.poNo}`,
                },
              });

            // ---------------------------------
            // CREATE PURCHASE ITEMS
            // ---------------------------------

            for (
              const item of
                purchaseOrder.items
            ) {
              await tx.purchaseItem.create({
                data: {
                  purchaseId:
                    purchase.id,

                  materialId:
                    item.materialId,

                  quantity:
                    item.quantity,

                  unit:
                    item.unit,

                  unitPrice:
                    item.unitPrice,

                  total:
                    item.total,

                  notes:
                    item.notes,
                },
              });


            }

            // ---------------------------------
            // MATERIAL EXPENSE CATEGORY
            // ---------------------------------

            let materialCategory =
              await tx.category.findFirst({
                where: {
                  name: "Materials",
                  type: "EXPENSE",
                  status: "ACTIVE",
                },
              });

            if (!materialCategory) {
              materialCategory =
                await tx.category.create({
                  data: {
                    name: "Materials",
                    type: "EXPENSE",
                    status: "ACTIVE",
                  },
                });
            }

            // ---------------------------------
            // CREATE EXPENSE TRANSACTION
            // ---------------------------------

            await tx.transaction.create({
              data: {
                transactionDate:
                  purchaseOrder.poDate,

                type:
                  "EXPENSE",

                source: "PURCHASE",

                amount:
                  purchaseOrder.grandTotal,

                paymentMethod:
                  "OTHER",

                description:
                  `Material Purchase - ${purchase.purchaseNo}`,

                notes:
                  purchaseOrder.notes ||
                  `Purchase ${purchase.purchaseNo}`,

                projectId:
                  purchaseOrder.projectId,

                categoryId:
                  materialCategory.id,

                vendorId:
                  purchaseOrder.vendorId,
              },
            });

            // ---------------------------------
            // LINK PURCHASE TO PO
            // ---------------------------------

            await tx.purchaseOrder.update({
              where: {
                id: purchaseOrderId,
              },

              data: {
                purchaseId:
                  purchase.id,
              },
            });

                      return purchase;
          },
          {
            maxWait: 10000,
            timeout: 20000,
          }
        );

      // ==============================
      // GET COMPLETE PURCHASE
      // ==============================

      const savedPurchase =
        await prisma.purchase.findUnique({
          where: {
            id: result.id,
          },

          include: {
            vendor: true,
            project: true,

            items: {
              include: {
                material: true,
              },
            },
          },
        });

      // ==============================
      // SUCCESS
      // ==============================

      res.status(201).json({
        success: true,

        message:
          "Purchase order converted to purchase successfully",

        data: {
          purchaseOrderId:
            purchaseOrderId,

          purchaseId:
            result.id,

          purchase:
            savedPurchase,
        },
      });

    } catch (error) {
      console.error(
        "Convert Purchase Order Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Purchase order conversion করা যায়নি!",
      });
    }
  }
);



// =========================================
// PURCHASE API
// =========================================

// GET ALL PURCHASES
app.get("/api/purchases", async (req, res) => {
  try {
    const purchases =
      await prisma.purchase.findMany({
        include: {
          vendor: true,
          project: true,
          items: {
            include: {
              material: true,
            },
          },
        },

        orderBy: {
          purchaseDate: "desc",
        },
      });

    res.json({
      success: true,
      data: purchases,
    });

  } catch (error) {
    console.error(
      "Get Purchases Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE PURCHASE
app.post("/api/purchases", async (req, res) => {
  try {
    const {
      purchaseNo,
      purchaseDate,
      vendorId,
      projectId,
      discount,
      transportCost,
      paidAmount,
      paymentStatus,
      notes,
      items,
    } = req.body;

    // -----------------------------
    // BASIC VALIDATION
    // -----------------------------

    if (!purchaseNo || purchaseNo.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Purchase number is required",
      });
    }

    if (!purchaseDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase date is required",
      });
    }

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one purchase item is required",
      });
    }

    // -----------------------------
    // VERIFY VENDOR
    // -----------------------------

    const vendor = await prisma.vendor.findUnique({
      where: {
        id: Number(vendorId),
      },
    });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // -----------------------------
    // VERIFY PROJECT
    // -----------------------------

    let project = null;

    if (projectId) {
      project = await prisma.project.findUnique({
        where: {
          id: Number(projectId),
        },
      });

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found",
        });
      }
    }

    // -----------------------------
    // VERIFY ITEMS + CALCULATE TOTAL
    // -----------------------------

    let subtotal = 0;

    const preparedItems = [];

    for (const item of items) {
      const materialId = Number(item.materialId);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (!materialId) {
        return res.status(400).json({
          success: false,
          message: "Material is required for every item",
        });
      }

      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than 0",
        });
      }

      if (
        Number.isNaN(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid unit price",
        });
      }

      const material =
        await prisma.material.findUnique({
          where: {
            id: materialId,
          },
        });

      if (!material) {
        return res.status(400).json({
          success: false,
          message:
            `Material ID ${materialId} not found`,
        });
      }

      const total = quantity * unitPrice;

      subtotal += total;

      preparedItems.push({
        materialId,
        quantity,
        unit: item.unit?.trim() || material.unit,
        unitPrice,
        total,
        notes: item.notes?.trim() || null,
      });
    }

    // -----------------------------
    // CALCULATE FINAL AMOUNTS
    // -----------------------------

    const discountAmount =
      Number(discount) || 0;

    const transportAmount =
      Number(transportCost) || 0;

    const grandTotal =
      subtotal -
      discountAmount +
      transportAmount;




    // -----------------------------
    // DATABASE TRANSACTION
    // -----------------------------

    const result = await prisma.$transaction(
      async (tx) => {

        // CREATE PURCHASE
        const purchase =
          await tx.purchase.create({
            data: {
              purchaseNo:
                purchaseNo.trim(),

              purchaseDate:
                new Date(purchaseDate),

              vendorId:
                Number(vendorId),

              projectId:
                projectId
                  ? Number(projectId)
                  : null,

              subtotal:
                subtotal,

              discount:
                discountAmount,

              transportCost:
                transportAmount,

              grandTotal:
                grandTotal,

            paymentStatus: "UNPAID",

              paidAmount: 0,

              dueAmount: grandTotal,

              notes:
                notes?.trim() || null,
            },
          });

// CREATE PURCHASE ITEMS
for (const item of preparedItems) {
  await tx.purchaseItem.create({
    data: {
      purchaseId: purchase.id,
      materialId: item.materialId,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      total: item.total,
      notes: item.notes,
    },
  });
}


// -----------------------------------------
// CREATE ONE EXPENSE TRANSACTION
// FOR THE WHOLE PURCHASE
// -----------------------------------------

        let materialCategory =
          await tx.category.findFirst({
            where: {
              name: "Materials",
              type: "EXPENSE",
              status: "ACTIVE",
            },
          });

        if (!materialCategory) {
          materialCategory =
            await tx.category.create({
              data: {
                name: "Materials",
                type: "EXPENSE",
                status: "ACTIVE",
              },
            });
        }


        await tx.transaction.create({
          data: {
            transactionDate:
              new Date(purchaseDate),

            type: "EXPENSE",

            // FULL PURCHASE GRAND TOTAL
            source: "PURCHASE",
            amount: grandTotal,

            paymentMethod: "OTHER",

            description:
              `Material Purchase - ${purchase.purchaseNo}`,

            notes:
              notes?.trim() ||
              `Purchase ${purchase.purchaseNo}`,

            projectId: projectId
              ? Number(projectId)
              : null,

            categoryId:
              materialCategory.id,

            vendorId:
              Number(vendorId),
          },
        });



           return purchase;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );
    // -----------------------------
    // SUCCESS RESPONSE
    // -----------------------------

    const savedPurchase =
      await prisma.purchase.findUnique({
        where: {
          id: result.id,
        },

        include: {
          vendor: true,
          project: true,

          items: {
            include: {
              material: true,
            },
          },
        },
      });

    res.status(201).json({
      success: true,
      message:
        "Purchase created successfully",
      data: savedPurchase,
    });

  } catch (error) {
    console.error(
      "Create Purchase Error:",
      error
    );

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message:
          "Purchase number already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// GET SINGLE PURCHASE
app.get("/api/purchases/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const purchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },

        include: {
          vendor: true,
          project: true,

          items: {
            include: {
              material: true,
            },
          },
        },
      });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.json({
      success: true,
      data: purchase,
    });

  } catch (error) {
    console.error(
      "Get Single Purchase Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =====================================================
// DELETE PURCHASE
// =====================================================

app.delete("/api/purchases/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    // -----------------------------------------
    // FIND PURCHASE
    // -----------------------------------------

    const existingPurchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },
        include: {
          items: true,
          vendor: true,
          project: true,
        },
      });

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    // -----------------------------------------
    // PROTECT RECEIVED PURCHASE
    // -----------------------------------------

    const hasReceivedItems =
      existingPurchase.items.some(
        (item) =>
          Number(item.receivedQuantity) > 0
      );

    if (hasReceivedItems) {
      return res.status(400).json({
        success: false,
        message:
          "This purchase cannot be deleted because material has already been received",
      });
    }




        // -----------------------------------------
    // PROTECT PAID PURCHASE
    // -----------------------------------------

    const paymentCount =
      await prisma.purchasePayment.count({
        where: {
          purchaseId: id,
        },
      });

    if (paymentCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "This purchase cannot be deleted because payment has already been made",
      });
    }
    // -----------------------------------------
    // DELETE EVERYTHING IN ONE TRANSACTION
    // -----------------------------------------

    await prisma.$transaction(
      async (tx) => {

        // -----------------------------------------
        // 1. FIND AUTOMATIC PURCHASE EXPENSE
        // -----------------------------------------

        const automaticExpense =
          await tx.transaction.findFirst({
            where: {
              type: "EXPENSE",
              source: "PURCHASE",
              description:
                `Material Purchase - ${existingPurchase.purchaseNo}`,
              vendorId:
                existingPurchase.vendorId,
              ...(existingPurchase.projectId
                ? {
                    projectId:
                      existingPurchase.projectId,
                  }
                : {
                    projectId: null,
                  }),
            },

            orderBy: {
              id: "asc",
            },
          });

        // -----------------------------------------
        // 2. DELETE AUTOMATIC PURCHASE EXPENSE
        // -----------------------------------------

        if (automaticExpense) {
          await tx.transaction.delete({
            where: {
              id: automaticExpense.id,
            },
          });
        }

        // -----------------------------------------
        // 3. DELETE LEGACY PURCHASE STOCK
        // -----------------------------------------

        await tx.stockMovement.deleteMany({
          where: {
            referenceType: "PURCHASE",
            referenceId: id,
          },
        });

        // -----------------------------------------
        // 4. DELETE PURCHASE ITEMS
        // -----------------------------------------

        await tx.purchaseItem.deleteMany({
          where: {
            purchaseId: id,
          },
        });

        // -----------------------------------------
        // 5. DELETE PURCHASE
        // -----------------------------------------

        await tx.purchase.delete({
          where: {
            id,
          },
        });
      }
    );

    res.json({
      success: true,
      message: "Purchase deleted successfully",
    });

  } catch (error) {
    console.error(
      "Delete Purchase Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// =====================================================
// UPDATE PURCHASE
// =====================================================

app.put("/api/purchases/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    const {
      purchaseNo,
      purchaseDate,
      vendorId,
      projectId,
      discount,
      transportCost,
      notes,
      items,
    } = req.body;

    // -----------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------

    if (!purchaseNo?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Purchase number is required",
      });
    }

    if (!purchaseDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase date is required",
      });
    }

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one purchase item is required",
      });
    }

    // -----------------------------------------
    // FIND EXISTING PURCHASE
    // -----------------------------------------

    const existingPurchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },
        include: {
          items: true,
        },
      });

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    // -----------------------------------------
    // PROTECT RECEIVED PURCHASE
    // -----------------------------------------

    const hasReceivedItems =
      existingPurchase.items.some(
        (item) =>
          Number(item.receivedQuantity) > 0
      );

    if (hasReceivedItems) {
      return res.status(400).json({
        success: false,
        message:
          "This purchase cannot be updated because material has already been received",
      });
    }

    // -----------------------------------------
    // VERIFY VENDOR
    // -----------------------------------------

    const vendor =
      await prisma.vendor.findUnique({
        where: {
          id: Number(vendorId),
        },
      });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // -----------------------------------------
    // VERIFY PROJECT
    // -----------------------------------------

    if (projectId) {
      const project =
        await prisma.project.findUnique({
          where: {
            id: Number(projectId),
          },
        });

      if (!project) {
        return res.status(400).json({
          success: false,
          message: "Project not found",
        });
      }
    }

    // -----------------------------------------
    // PREPARE ITEMS + TOTAL
    // -----------------------------------------

    let subtotal = 0;
    const preparedItems = [];

    for (const item of items) {
      const materialId = Number(item.materialId);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (!materialId) {
        return res.status(400).json({
          success: false,
          message: "Material is required",
        });
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be greater than 0",
        });
      }

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid unit price",
        });
      }

      const material =
        await prisma.material.findUnique({
          where: {
            id: materialId,
          },
        });

      if (!material) {
        return res.status(400).json({
          success: false,
          message:
            `Material ID ${materialId} not found`,
        });
      }

      const total =
        quantity * unitPrice;

      subtotal += total;

      preparedItems.push({
        materialId,
        quantity,
        unit:
          item.unit?.trim() ||
          material.unit,
        unitPrice,
        total,
        notes:
          item.notes?.trim() || null,
      });
    }

    // -----------------------------------------
    // CALCULATE TOTALS
    // -----------------------------------------

    const discountAmount =
      Number(discount) || 0;

    const transportAmount =
      Number(transportCost) || 0;

    const grandTotal =
      subtotal -
      discountAmount +
      transportAmount;

    if (grandTotal < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Grand total cannot be negative",
      });
    }

    // -----------------------------------------
    // DATABASE TRANSACTION
    // -----------------------------------------

    const result =
      await prisma.$transaction(
        async (tx) => {

          // -----------------------------------------
          // 1. CALCULATE PAYMENT SUMMARY FROM HISTORY
          // -----------------------------------------

          const paymentSummary =
            await tx.purchasePayment.aggregate({
              where: {
                purchaseId: id,
              },
              _sum: {
                amount: true,
              },
            });

          const totalPaid =
            Number(
              paymentSummary._sum.amount
            ) || 0;

          // -----------------------------------------
          // 2. PREVENT TOTAL < ALREADY PAID
          // -----------------------------------------

          if (totalPaid > grandTotal) {
            throw new Error(
              "Purchase total cannot be less than the total amount already paid"
            );
          }

          const dueAmount =
            grandTotal - totalPaid;

          const paymentStatus =
            totalPaid === 0
              ? "UNPAID"
              : totalPaid >= grandTotal
              ? "PAID"
              : "PARTIAL";

          // -----------------------------------------
          // 3. UPDATE PURCHASE
          // -----------------------------------------

          await tx.purchase.update({
            where: {
              id,
            },
            data: {
              purchaseNo:
                purchaseNo.trim(),

              purchaseDate:
                new Date(purchaseDate),

              vendorId:
                Number(vendorId),

              projectId:
                projectId
                  ? Number(projectId)
                  : null,

              subtotal,

              discount:
                discountAmount,

              transportCost:
                transportAmount,

              grandTotal,

              paymentStatus,

              paidAmount:
                totalPaid,

              dueAmount,

              notes:
                notes?.trim() || null,
            },
          });

          // -----------------------------------------
          // 4. REMOVE OLD UNRECEIVED ITEMS
          // -----------------------------------------

          await tx.purchaseItem.deleteMany({
            where: {
              purchaseId: id,
            },
          });

          // -----------------------------------------
          // 5. REMOVE LEGACY AUTO STOCK
          //
          // Safe because receivedQuantity = 0
          // was already verified above.
          // -----------------------------------------

          await tx.stockMovement.deleteMany({
            where: {
              referenceType: "PURCHASE",
              referenceId: id,
            },
          });

          // -----------------------------------------
          // 6. CREATE UPDATED PURCHASE ITEMS
          // -----------------------------------------

          for (const item of preparedItems) {
            await tx.purchaseItem.create({
              data: {
                purchaseId: id,
                materialId:
                  item.materialId,
                quantity:
                  item.quantity,
                unit:
                  item.unit,
                unitPrice:
                  item.unitPrice,
                total:
                  item.total,
                notes:
                  item.notes,
              },
            });
          }

          // -----------------------------------------
          // 7. FIND AUTOMATIC PURCHASE EXPENSE
          // -----------------------------------------

          const purchaseExpenseDescription =
            `Material Purchase - ${purchaseNo.trim()}`;

          const expenses =
            await tx.transaction.findMany({
              where: {
                type: "EXPENSE",

                source: "PURCHASE",

                description:
                  purchaseExpenseDescription,

                vendorId:
                  Number(vendorId),

                ...(projectId
                  ? {
                      projectId:
                        Number(projectId),
                    }
                  : {
                      projectId: null,
                    }),
              },

              orderBy: {
                id: "asc",
              },
            });

          const expense =
            expenses[0] || null;

          // -----------------------------------------
          // 8. REMOVE DUPLICATE PURCHASE EXPENSES
          // -----------------------------------------

          if (expenses.length > 1) {
            await tx.transaction.deleteMany({
              where: {
                id: {
                  in: expenses
                    .slice(1)
                    .map((item) => item.id),
                },
              },
            });
          }

          // -----------------------------------------
          // 9. FIND / CREATE MATERIAL CATEGORY
          // -----------------------------------------

          let materialCategory =
            await tx.category.findFirst({
              where: {
                name: "Materials",
                type: "EXPENSE",
                status: "ACTIVE",
              },
            });

          if (!materialCategory) {
            materialCategory =
              await tx.category.create({
                data: {
                  name: "Materials",
                  type: "EXPENSE",
                  status: "ACTIVE",
                },
              });
          }

          // -----------------------------------------
          // 10. UPDATE OR CREATE PURCHASE EXPENSE
          // -----------------------------------------

          if (expense) {
            await tx.transaction.update({
              where: {
                id: expense.id,
              },

              data: {
                transactionDate:
                  new Date(purchaseDate),

                amount:
                  grandTotal,

                paymentMethod:
                  "OTHER",

                description:
                  `Material Purchase - ${purchaseNo.trim()}`,

                notes:
                  notes?.trim() ||
                  `Purchase ${purchaseNo.trim()}`,

                projectId:
                  projectId
                    ? Number(projectId)
                    : null,

                categoryId:
                  materialCategory.id,

                vendorId:
                  Number(vendorId),

                source: "PURCHASE",
              },
            });
          } else {
            await tx.transaction.create({
              data: {
                transactionDate:
                  new Date(purchaseDate),

                type: "EXPENSE",

                source: "PURCHASE",

                amount:
                  grandTotal,

                paymentMethod:
                  "OTHER",

                description:
                  `Material Purchase - ${purchaseNo.trim()}`,

                notes:
                  notes?.trim() ||
                  `Purchase ${purchaseNo.trim()}`,

                projectId:
                  projectId
                    ? Number(projectId)
                    : null,

                categoryId:
                  materialCategory.id,

                vendorId:
                  Number(vendorId),
              },
            });
          }

          return {
            totalPaid,
            dueAmount,
            paymentStatus,
          };
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );

    // -----------------------------------------
    // GET UPDATED PURCHASE
    // -----------------------------------------

    const updatedPurchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },

        include: {
          vendor: true,
          project: true,

          items: {
            include: {
              material: true,
            },
          },
        },
      });

    res.json({
      success: true,
      message: "Purchase updated successfully",
      data: {
        ...updatedPurchase,
        paymentSummary: result,
      },
    });

  } catch (error) {
    console.error(
      "Update Purchase Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// =====================================================
// GET PURCHASE PAYMENT HISTORY
// =====================================================

app.get(
  "/api/purchases/:id/payments",
  async (req, res) => {
    try {
      const purchaseId =
        Number(req.params.id);

      if (
        !Number.isInteger(purchaseId) ||
        purchaseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid purchase ID",
        });
      }

      const purchase =
        await prisma.purchase.findUnique({
          where: {
            id: purchaseId,
          },
        });

      if (!purchase) {
        return res.status(404).json({
          success: false,
          message: "Purchase not found",
        });
      }

      const payments =
        await prisma.purchasePayment.findMany({
          where: {
            purchaseId,
          },

          orderBy: {
            paymentDate: "desc",
          },
        });

      const totalPaid =
        payments.reduce(
          (sum, payment) =>
            sum +
            (Number(payment.amount) || 0),
          0
        );

      const dueAmount =
        Math.max(
          Number(purchase.grandTotal) -
            totalPaid,
          0
        );

      const paymentStatus =
        totalPaid === 0
          ? "UNPAID"
          : totalPaid >=
            Number(purchase.grandTotal)
          ? "PAID"
          : "PARTIAL";

      res.json({
        success: true,

        data: {
          purchaseId:
            purchase.id,

          grandTotal:
            Number(purchase.grandTotal),

          totalPaid,

          dueAmount,

          paymentStatus,

          payments,
        },
      });
    } catch (error) {
      console.error(
        "Get Purchase Payments Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Purchase payments are registered by payables.js.

// =====================================================
// RECEIVE PURCHASE MATERIAL
// =====================================================

app.get(
  "/api/stock-movements/return-availability",
  async (req, res) => {
    try {
      const materialIdNumber =
        Number(req.query.materialId);

      const projectIdNumber =
        Number(req.query.projectId);

      // -----------------------------------------
      // BASIC VALIDATION
      // -----------------------------------------

      if (
        !materialIdNumber ||
        materialIdNumber <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Material is required",
        });
      }

      if (
        !projectIdNumber ||
        projectIdNumber <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Project is required",
        });
      }

      // -----------------------------------------
      // VERIFY MATERIAL
      // -----------------------------------------

      const material =
        await prisma.material.findUnique({
          where: {
            id: materialIdNumber,
          },
        });

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "Material not found",
        });
      }

      // -----------------------------------------
      // VERIFY PROJECT
      // -----------------------------------------

      const project =
        await prisma.project.findUnique({
          where: {
            id: projectIdNumber,
          },
        });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // -----------------------------------------
      // GET PROJECT MATERIAL MOVEMENTS
      // -----------------------------------------

      const projectMovements =
        await prisma.stockMovement.findMany({
          where: {
            materialId: materialIdNumber,
            projectId: projectIdNumber,
            movementType: {
              in: [
                "PROJECT_USAGE",
                "RETURN",
              ],
            },
          },
          select: {
            movementType: true,
            quantity: true,
          },
        });

      // -----------------------------------------
      // CALCULATE RETURN AVAILABILITY
      // -----------------------------------------

      const {
        totalUsed,
        totalReturned,
        availableReturn,
      } =
        calculateProjectReturnAvailability(
          projectMovements
        );

      // -----------------------------------------
      // RESPONSE
      // -----------------------------------------

      res.json({
        success: true,

        data: {
          materialId: material.id,
          projectId: project.id,
          totalUsed,
          totalReturned,
          availableReturn,
          unit: material.unit,
        },
      });
    } catch (error) {
      console.error(
        "Get Project Return Availability Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// GET STOCK MOVEMENTS
app.get("/api/stock-movements", async (req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        material: true,
        project: true,
      },
      orderBy: {
        movementDate: "desc",
      },
    });

    res.json({
      success: true,
      data: movements,
    });
  } catch (error) {
    console.error(
      "Get Stock Movements Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =====================================================
// GET MATERIAL STOCK SUMMARY
// =====================================================

app.get("/api/materials/:id/stock", async (req, res) => {
  try {
    const materialId = Number(req.params.id);

    if (!materialId || materialId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid material ID",
      });
    }

    // Verify material exists
    const material = await prisma.material.findUnique({
      where: {
        id: materialId,
      },
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    // Get all movements for this material
    const movements = await prisma.stockMovement.findMany({
      where: {
        materialId,
      },
      orderBy: {
        movementDate: "asc",
      },
    });


    const {
      currentStock,
      totalStockIn,
      totalStockOut,
    } = calculateMaterialStock(movements);


    res.json({
  success: true,

  data: {
    materialId: material.id,
    materialCode: material.code,
    materialName: material.name,
    unit: material.unit,

    currentStock,
    totalStockIn,
    totalStockOut,

    movementCount: movements.length,

    movements: movements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      quantity: Number(movement.quantity) || 0,
      unit: movement.unit,
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      projectId: movement.projectId,
      unitCost: movement.unitCost
        ? Number(movement.unitCost)
        : null,
      notes: movement.notes,
      movementDate: movement.movementDate,
    })),
  },
});





  } catch (error) {
    console.error(
      "Get Material Stock Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});




// =====================================================
// CREATE STOCK OUT / PROJECT USAGE
// =====================================================

app.get(
  "/api/materials/:id/prices",
  async (req, res) => {
    try {
      const materialId =
        Number(req.params.id);

      if (!Number.isInteger(materialId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid material ID",
        });
      }

      const material =
        await prisma.material.findUnique({
          where: {
            id: materialId,
          },
        });

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "Material not found",
        });
      }

      const prices =
        await prisma.vendorMaterialPrice.findMany({
          where: {
            materialId,
          },

          include: {
            vendor: true,
          },

          orderBy: [
            {
              unitPrice: "asc",
            },
            {
              effectiveDate: "desc",
            },
          ],
        });

      const priceValues = prices.map(
        (item) =>
          Number(item.unitPrice) || 0
      );

      const lowestPrice =
        priceValues.length > 0
          ? Math.min(...priceValues)
          : 0;

      const highestPrice =
        priceValues.length > 0
          ? Math.max(...priceValues)
          : 0;

      const averagePrice =
        priceValues.length > 0
          ? priceValues.reduce(
              (sum, price) =>
                sum + price,
              0
            ) / priceValues.length
          : 0;

      const bestVendor =
        prices.length > 0
          ? prices[0].vendor
          : null;

      res.json({
        success: true,

        data: prices,

        summary: {
          lowestPrice,
          highestPrice,
          averagePrice,
          bestVendor,
        },
      });

    } catch (error) {
      console.error(
        "Get Material Prices Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// ADD PRICE FOR A MATERIAL
app.post(
  "/api/materials/:id/prices",
  async (req, res) => {
    try {
      const materialId =
        Number(req.params.id);

      const {
        vendorId,
        unitPrice,
        unit,
        minimumQty,
        leadTimeDays,
        effectiveDate,
        notes,
      } = req.body;

      if (!Number.isInteger(materialId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid material ID",
        });
      }

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor is required",
        });
      }

      if (
        unitPrice === undefined ||
        unitPrice === null ||
        Number(unitPrice) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unit price must be greater than 0",
        });
      }

      if (!unit || unit.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Unit is required",
        });
      }

      const material =
        await prisma.material.findUnique({
          where: {
            id: materialId,
          },
        });

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "Material not found",
        });
      }

      const vendor =
        await prisma.vendor.findUnique({
          where: {
            id: Number(vendorId),
          },
        });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      const price =
        await prisma.vendorMaterialPrice.create({
          data: {
            materialId,

            vendorId:
              Number(vendorId),

            unitPrice:
              Number(unitPrice),

            unit:
              unit.trim(),

            minimumQty:
              minimumQty !== undefined &&
              minimumQty !== null &&
              minimumQty !== ""
                ? Number(minimumQty)
                : null,

            leadTimeDays:
              leadTimeDays !== undefined &&
              leadTimeDays !== null &&
              leadTimeDays !== ""
                ? Number(leadTimeDays)
                : null,

            effectiveDate:
              effectiveDate
                ? new Date(effectiveDate)
                : new Date(),

            notes:
              notes?.trim() || null,
          },

          include: {
            vendor: true,
            material: true,
          },
        });

      res.status(201).json({
        success: true,
        message:
          "Vendor material price added successfully",
        data: price,
      });

    } catch (error) {
      console.error(
        "Create Material Price Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// UPDATE MATERIAL PRICE
app.put(
  "/api/material-prices/:id",
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const {
        vendorId,
        unitPrice,
        unit,
        minimumQty,
        leadTimeDays,
        effectiveDate,
        notes,
      } = req.body;

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid price ID",
        });
      }

      const existingPrice =
        await prisma.vendorMaterialPrice.findUnique({
          where: {
            id,
          },
        });

      if (!existingPrice) {
        return res.status(404).json({
          success: false,
          message:
            "Material price not found",
        });
      }

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor is required",
        });
      }

      if (
        unitPrice === undefined ||
        unitPrice === null ||
        Number(unitPrice) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unit price must be greater than 0",
        });
      }

      if (!unit || unit.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Unit is required",
        });
      }

      const vendor =
        await prisma.vendor.findUnique({
          where: {
            id: Number(vendorId),
          },
        });

      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      const price =
        await prisma.vendorMaterialPrice.update({
          where: {
            id,
          },

          data: {
            vendorId:
              Number(vendorId),

            unitPrice:
              Number(unitPrice),

            unit:
              unit.trim(),

            minimumQty:
              minimumQty !== undefined &&
              minimumQty !== null &&
              minimumQty !== ""
                ? Number(minimumQty)
                : null,

            leadTimeDays:
              leadTimeDays !== undefined &&
              leadTimeDays !== null &&
              leadTimeDays !== ""
                ? Number(leadTimeDays)
                : null,

            effectiveDate:
              effectiveDate
                ? new Date(effectiveDate)
                : existingPrice.effectiveDate,

            notes:
              notes?.trim() || null,
          },

          include: {
            vendor: true,
            material: true,
          },
        });

      res.json({
        success: true,
        message:
          "Vendor material price updated successfully",
        data: price,
      });

    } catch (error) {
      console.error(
        "Update Material Price Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// DELETE MATERIAL PRICE
app.delete(
  "/api/material-prices/:id",
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid price ID",
        });
      }

      const existingPrice =
        await prisma.vendorMaterialPrice.findUnique({
          where: {
            id,
          },
        });

      if (!existingPrice) {
        return res.status(404).json({
          success: false,
          message:
            "Material price not found",
        });
      }

      await prisma.vendorMaterialPrice.delete({
        where: {
          id,
        },
      });

      res.json({
        success: true,
        message:
          "Vendor material price deleted successfully",
      });

    } catch (error) {
      console.error(
        "Delete Material Price Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);









// =========================================
// INCOME API
// =========================================


// GET ALL INCOME WITH PAGINATION
app.get("/api/income", async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.transaction.count()) : allowedLimits.includes(
      limitValue
    )
      ? limitValue
      : 10;

    const skip = (page - 1) * limit;

    // Total income records
    const totalIncomeRecords =
      await prisma.transaction.count({
        where: {
          type: "INCOME",
        },
      });

    // Income records for current page
    const income =
      await prisma.transaction.findMany({
        where: {
          type: "INCOME",
        },
        include: {
          project: true,
          category: true,
          worker: true,
          vendor: true,
        },
        orderBy: {
          transactionDate: "desc",
        },
        skip,
        take: limit,
      });

    // Total income amount
    const incomeTotal =
      await prisma.transaction.aggregate({
        where: {
          type: "INCOME",
        },
        _sum: {
          amount: true,
        },
      });

    const totalAmount =
      Number(incomeTotal._sum.amount) || 0;

    const totalPages = Math.max(
      Math.ceil(
        totalIncomeRecords / limit
      ),
      1
    );

    res.json({
      success: true,

      data: income,

      pagination: {
        page,
        limit,
        totalRecords:
          totalIncomeRecords,
        totalPages,
      },

      summary: {
        totalIncome: totalAmount,
      },
    });
  } catch (error) {
    console.error(
      "Get Income Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});




// ADD NEW INCOME
app.post("/api/income", async (req, res) => {
  try {
    const {
      transactionDate,
      amount,
      paymentMethod,
      description,
      notes,
      projectId,
      categoryId,
      workerId,
      vendorId,
    } = req.body;

    if (!transactionDate) {
      return res.status(400).json({
        success: false,
        message: "Transaction date is required",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid income amount is required",
      });
    }

    const income = await prisma.transaction.create({
      data: {
        transactionDate: new Date(transactionDate),

        type: "INCOME",

        amount: Number(amount),

        paymentMethod:
          paymentMethod || "CASH",

        description:
          description || null,

        notes:
          notes || null,

        projectId:
          projectId
            ? Number(projectId)
            : null,

        categoryId:
          categoryId
            ? Number(categoryId)
            : null,

        workerId:
          workerId
            ? Number(workerId)
            : null,

        vendorId:
          vendorId
            ? Number(vendorId)
            : null,
      },

      include: {
        project: true,
        category: true,
        worker: true,
        vendor: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Income added successfully",
      data: income,
    });
  } catch (error) {
    console.error("Add Income Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET TOTAL INCOME
app.get("/api/income/total", async (req, res) => {
  try {
    const result =
      await prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: "INCOME",
        },
      });

    const totalIncome =
      result._sum.amount || 0;

    res.json({
      success: true,
      data: {
        totalIncome: Number(totalIncome),
      },
    });
  } catch (error) {
    console.error(
      "Total Income Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});





// =========================================
// UPDATE INCOME
// =========================================

app.put("/api/income/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      transactionDate,
      amount,
      paymentMethod,
      description,
      notes,
      projectId,
      categoryId,
      workerId,
      vendorId,
    } = req.body;

    if (!transactionDate) {
      return res.status(400).json({
        success: false,
        message: "Transaction date is required",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid income amount is required",
      });
    }

    const existingIncome =
      await prisma.transaction.findUnique({
        where: {
          id,
        },
      });

    if (!existingIncome) {
      return res.status(404).json({
        success: false,
        message: "Income transaction not found",
      });
    }

    if (existingIncome.type !== "INCOME") {
      return res.status(400).json({
        success: false,
        message: "This transaction is not an income transaction",
      });
    }

    const income = await prisma.transaction.update({
      where: {
        id,
      },

      data: {
        transactionDate: new Date(transactionDate),

        amount: Number(amount),

        paymentMethod:
          paymentMethod || "CASH",

        description:
          description || null,

        notes:
          notes || null,

        projectId:
          projectId
            ? Number(projectId)
            : null,

        categoryId:
          categoryId
            ? Number(categoryId)
            : null,

        workerId:
          workerId
            ? Number(workerId)
            : null,

        vendorId:
          vendorId
            ? Number(vendorId)
            : null,
      },

      include: {
        project: true,
        category: true,
        worker: true,
        vendor: true,
      },
    });

    res.json({
      success: true,
      message: "Income updated successfully",
      data: income,
    });
  } catch (error) {
    console.error("Update Income Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =========================================
// DELETE INCOME
// =========================================

app.delete("/api/income/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existingIncome =
      await prisma.transaction.findUnique({
        where: {
          id,
        },
      });

    if (!existingIncome) {
      return res.status(404).json({
        success: false,
        message: "Income transaction not found",
      });
    }

    if (existingIncome.type !== "INCOME") {
      return res.status(400).json({
        success: false,
        message: "This transaction is not an income transaction",
      });
    }

    await prisma.transaction.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Income deleted successfully",
    });
  } catch (error) {
    console.error("Delete Income Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});



// =========================================
// EXPENSE API
// =========================================

// GET ALL EXPENSES
// GET ALL EXPENSES WITH PAGINATION
app.get("/api/expenses", async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.transaction.count()) : allowedLimits.includes(
      limitValue
    )
      ? limitValue
      : 10;

    const skip = (page - 1) * limit;

    // Total expense records
    const totalExpenseRecords =
      await prisma.transaction.count({
        where: {
          type: "EXPENSE",
            source: {
            in: ["MANUAL", "PURCHASE"],
          },
        },
      });

    // Expenses for current page
    const expenses =
      await prisma.transaction.findMany({
        where: {
          type: "EXPENSE",
          source: {
            in: ["MANUAL", "PURCHASE"],
          },
        },
        include: {
          project: true,
          category: true,
          worker: true,
          vendor: true,
        },
        orderBy: {
          transactionDate: "desc",
        },
        skip,
        take: limit,
      });

    // Total expense amount
    const expenseTotal =
      await prisma.transaction.aggregate({
        where: {
          type: "EXPENSE",
            source: {
              in: ["MANUAL", "PURCHASE"],
            },

        },
        _sum: {
          amount: true,
        },
      });

    const totalAmount =
      Number(expenseTotal._sum.amount) || 0;

    const totalPages = Math.max(
      Math.ceil(
        totalExpenseRecords / limit
      ),
      1
    );

    res.json({
      success: true,

      data: expenses,

      pagination: {
        page,
        limit,
        totalRecords:
          totalExpenseRecords,
        totalPages,
      },

      summary: {
        totalExpenses: totalAmount,
      },
    });
  } catch (error) {
    console.error(
      "Get Expenses Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ADD NEW EXPENSE
app.post("/api/expenses", async (req, res) => {
  try {
    const {
      transactionDate,
      amount,
      paymentMethod,
      description,
      notes,
      projectId,
      categoryId,
      workerId,
      vendorId,
    } = req.body;

    if (!transactionDate) {
      return res.status(400).json({
        success: false,
        message: "Transaction date is required",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid expense amount is required",
      });
    }

    const expense = await prisma.transaction.create({
      data: {
        transactionDate: new Date(transactionDate),

        type: "EXPENSE",

        amount: Number(amount),

        paymentMethod:
          paymentMethod || "CASH",

        description:
          description || null,

        notes:
          notes || null,

        projectId:
          projectId
            ? Number(projectId)
            : null,

        categoryId:
          categoryId
            ? Number(categoryId)
            : null,

        workerId:
          workerId
            ? Number(workerId)
            : null,

        vendorId:
          vendorId
            ? Number(vendorId)
            : null,
      },

      include: {
        project: true,
        category: true,
        worker: true,
        vendor: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Expense added successfully",
      data: expense,
    });
  } catch (error) {
    console.error("Add Expense Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// GET TOTAL EXPENSES
app.get("/api/expenses/total", async (req, res) => {
  try {
    const result =
      await prisma.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          type: "EXPENSE",
          source: {
          in: ["MANUAL", "PURCHASE"],
        },
        },
      });

    const totalExpenses =
      result._sum.amount || 0;

    res.json({
      success: true,
      data: {
        totalExpenses: Number(totalExpenses),
      },
    });
  } catch (error) {
    console.error(
      "Total Expenses Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =========================================
// UPDATE EXPENSE
// =========================================

app.put("/api/expenses/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      transactionDate,
      amount,
      paymentMethod,
      description,
      notes,
      projectId,
      categoryId,
      workerId,
      vendorId,
    } = req.body;

    if (!transactionDate) {
      return res.status(400).json({
        success: false,
        message: "Transaction date is required",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid expense amount is required",
      });
    }

    const existingExpense =
      await prisma.transaction.findUnique({
        where: {
          id,
        },
      });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense transaction not found",
      });
    }

    if (existingExpense.type !== "EXPENSE") {
      return res.status(400).json({
        success: false,
        message: "This transaction is not an expense transaction",
      });
    }

    const expense =
      await prisma.transaction.update({
        where: {
          id,
        },

        data: {
          transactionDate:
            new Date(transactionDate),

          amount:
            Number(amount),

          paymentMethod:
            paymentMethod || "CASH",

          description:
            description || null,

          notes:
            notes || null,

          projectId:
            projectId
              ? Number(projectId)
              : null,

          categoryId:
            categoryId
              ? Number(categoryId)
              : null,

          workerId:
            workerId
              ? Number(workerId)
              : null,

          vendorId:
            vendorId
              ? Number(vendorId)
              : null,
        },

        include: {
          project: true,
          category: true,
          worker: true,
          vendor: true,
        },
      });

    res.json({
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Update Expense Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =========================================
// DELETE EXPENSE
// =========================================

app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existingExpense =
      await prisma.transaction.findUnique({
        where: {
          id,
        },
      });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        message: "Expense transaction not found",
      });
    }

    if (existingExpense.type !== "EXPENSE") {
      return res.status(400).json({
        success: false,
        message: "This transaction is not an expense transaction",
      });
    }

    await prisma.transaction.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Expense Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});



// =========================================
// WORKER API
// =========================================

// GET ALL ACTIVE WORKERS
// GET ALL ACTIVE WORKERS WITH PAGINATION
app.get("/api/workers", async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.worker.count()) : allowedLimits.includes(
      limitValue
    )
      ? limitValue
      : 10;

    const skip = (page - 1) * limit;

    // Total active workers
    const totalWorkers =
      await prisma.worker.count({
        where: {
          status: "ACTIVE",
        },
      });

    // Current page workers
    const workers =
      await prisma.worker.findMany({
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          name: "asc",
        },
        skip,
        take: limit,
      });

    const totalPages = Math.max(
      Math.ceil(
        totalWorkers / limit
      ),
      1
    );

    res.json({
      success: true,

      data: workers,

      pagination: {
        page,
        limit,
        totalWorkers,
        totalPages,
      },
    });

  } catch (error) {
    console.error(
      "Get Workers Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE WORKER
app.post("/api/workers", async (req, res) => {
  try {
    const {
      name,
      phone,
      role,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Worker name is required",
      });
    }

    const worker = await prisma.worker.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        role: role?.trim() || null,
        status: "ACTIVE",
      },
    });

    res.status(201).json({
      success: true,
      message: "Worker created successfully",
      data: worker,
    });
  } catch (error) {
    console.error("Create Worker Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// UPDATE WORKER
app.put("/api/workers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      name,
      phone,
      role,
      status,
    } = req.body;

    const existingWorker =
      await prisma.worker.findUnique({
        where: {
          id,
        },
      });

    if (!existingWorker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Worker name is required",
      });
    }

    const worker =
      await prisma.worker.update({
        where: {
          id,
        },
        data: {
          name: name.trim(),
          phone:
            phone?.trim() || null,
          role:
            role?.trim() || null,
          status:
            status || existingWorker.status,
        },
      });

    res.json({
      success: true,
      message: "Worker updated successfully",
      data: worker,
    });
  } catch (error) {
    console.error(
      "Update Worker Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// DELETE WORKER
app.delete("/api/workers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existingWorker =
      await prisma.worker.findUnique({
        where: {
          id,
        },
      });

    if (!existingWorker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    await prisma.worker.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Worker deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Worker Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =========================================
// VENDOR API
// =========================================

// GET ALL ACTIVE VENDORS
// GET ALL ACTIVE VENDORS WITH PAGINATION
app.get("/api/vendors", async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.vendor.count()) : allowedLimits.includes(
      limitValue
    )
      ? limitValue
      : 10;

    const skip = (page - 1) * limit;

    // Total active vendors
    const totalVendors =
      await prisma.vendor.count({
        where: {
          status: "ACTIVE",
        },
      });

    // Vendors for current page
    const vendors =
      await prisma.vendor.findMany({
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          name: "asc",
        },
        skip,
        take: limit,
      });

    const totalPages = Math.max(
      Math.ceil(
        totalVendors / limit
      ),
      1
    );

    res.json({
      success: true,

      data: vendors,

      pagination: {
        page,
        limit,
        totalVendors,
        totalPages,
      },
    });
  } catch (error) {
    console.error(
      "Get Vendors Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE VENDOR
app.post("/api/vendors", async (req, res) => {
  try {
    const {
      name,
      companyName,
      phone,
      address,
    } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Vendor name is required",
      });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name: name.trim(),
        companyName:
          companyName?.trim() || null,
        phone:
          phone?.trim() || null,
        address:
          address?.trim() || null,
        status: "ACTIVE",
      },
    });

    res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      data: vendor,
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// UPDATE VENDOR
app.put("/api/vendors/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const {
      name,
      companyName,
      phone,
      address,
      status,
    } = req.body;

    const existingVendor =
      await prisma.vendor.findUnique({
        where: {
          id,
        },
      });

    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Vendor name is required",
      });
    }

    const vendor =
      await prisma.vendor.update({
        where: {
          id,
        },
        data: {
          name: name.trim(),
          companyName:
            companyName?.trim() || null,
          phone:
            phone?.trim() || null,
          address:
            address?.trim() || null,
          status:
            status || existingVendor.status,
        },
      });

    res.json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });
  } catch (error) {
    console.error(
      "Update Vendor Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// DELETE VENDOR
app.delete("/api/vendors/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existingVendor =
      await prisma.vendor.findUnique({
        where: {
          id,
        },
      });

    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    await prisma.vendor.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Vendor Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});














// =========================================
// TRANSACTIONS API
// =========================================


// =========================================
// GET TRANSACTIONS WITH SERVER-SIDE FILTER + PAGINATION
// =========================================


app.get("/api/transactions", async (req, res) => {
  try {
    // -----------------------------------------
    // PAGINATION
    // -----------------------------------------

    const page = Number(req.query.limit) === -1 ? 1 : Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.transaction.count()) : allowedLimits.includes(
      limitValue
    )
      ? limitValue
      : 10;

    const skip = (page - 1) * limit;


    // -----------------------------------------
    // FILTER VALUES
    // -----------------------------------------

    const search =
      String(req.query.search || "")
        .trim();

    const type =
      String(req.query.type || "ALL")
        .trim()
        .toUpperCase();

    const projectId =
      String(req.query.projectId || "ALL")
        .trim();

    const categoryId =
      String(req.query.categoryId || "ALL")
        .trim();


    // -----------------------------------------
    // BUILD WHERE
    // -----------------------------------------

    const where = {};


    // Type filter
    if (
      type &&
      type !== "ALL"
    ) {
      if (
        type === "INCOME" ||
        type === "EXPENSE"
      ) {
        where.type = type;
      }
    }


    // Project filter
    if (
      projectId &&
      projectId !== "ALL"
    ) {
      const parsedProjectId =
        Number(projectId);

      if (
        Number.isInteger(
          parsedProjectId
        )
      ) {
        where.projectId =
          parsedProjectId;
      }
    }


    // Category filter
    if (
      categoryId &&
      categoryId !== "ALL"
    ) {
      const parsedCategoryId =
        Number(categoryId);

      if (
        Number.isInteger(
          parsedCategoryId
        )
      ) {
        where.categoryId =
          parsedCategoryId;
      }
    }


    // Search filter
    if (search) {
      where.OR = [
        {
          description: {
            contains: search,
          },
        },

        {
          project: {
            name: {
              contains: search,
            },
          },
        },

        {
          category: {
            name: {
              contains: search,
            },
          },
        },

        {
          worker: {
            name: {
              contains: search,
            },
          },
        },

        {
          vendor: {
            name: {
              contains: search,
            },
          },
        },
      ];
    }


    // -----------------------------------------
    // TOTAL FILTERED TRANSACTIONS
    // -----------------------------------------

    const totalTransactions =
      await prisma.transaction.count({
        where,
      });


    // -----------------------------------------
    // CURRENT PAGE DATA
    // -----------------------------------------

    const transactions =
      await prisma.transaction.findMany({
        where,

        include: {
          project: true,
          category: true,
          worker: true,
          vendor: true,
        },

        orderBy: {
          transactionDate: "desc",
        },

        skip,
        take: limit,
      });


    // -----------------------------------------
    // FILTERED CREDIT / DEBIT
    // -----------------------------------------

    const totals =
      await prisma.transaction.groupBy({
        by: ["type"],
        where: { AND: [where, { source: { not: "PURCHASE" } }] },

        _sum: {
          amount: true,
        },
      });


    let totalIncome = 0;
    let totalExpenses = 0;


    totals.forEach((item) => {
      const amount =
        Number(item._sum.amount) || 0;

      if (
        item.type === "INCOME"
      ) {
        totalIncome = amount;
      }

      if (
        item.type === "EXPENSE"
      ) {
        totalExpenses = amount;
      }
    });


    const currentBalance =
      totalIncome -
      totalExpenses;


    // -----------------------------------------
    // PAGINATION INFO
    // -----------------------------------------

    const totalPages = Math.max(
      Math.ceil(
        totalTransactions / limit
      ),
      1
    );


    // -----------------------------------------
    // RESPONSE
    // -----------------------------------------

    res.json({
      success: true,

      data: transactions,

      pagination: {
        page,
        limit,
        totalTransactions,
        totalPages,
      },

      summary: {
        totalIncome,
        totalExpenses,
        currentBalance,
      },
    });

  } catch (error) {
    console.error(
      "Get Transactions Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET SINGLE TRANSACTION
app.get(
  "/api/transactions/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const transaction =
        await prisma.transaction.findUnique({
          where: {
            id,
          },
          include: {
            project: true,
            category: true,
            worker: true,
            vendor: true,
          },
        });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error(
        "Get Transaction Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// UPDATE TRANSACTION
app.put(
  "/api/transactions/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const {
        transactionDate,
        type,
        amount,
        paymentMethod,
        description,
        notes,
        projectId,
        categoryId,
        workerId,
        vendorId,
      } = req.body;

      if (!transactionDate) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction date is required",
        });
      }

      if (!["INCOME", "EXPENSE"].includes(type)) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction type must be INCOME or EXPENSE",
        });
      }

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Valid transaction amount is required",
        });
      }

      const existingTransaction =
        await prisma.transaction.findUnique({
          where: {
            id,
          },
        });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message:
            "Transaction not found",
        });
      }

      const transaction =
        await prisma.transaction.update({
          where: {
            id,
          },

          data: {
            transactionDate:
              new Date(transactionDate),

            type,

            amount: Number(amount),

            paymentMethod:
              paymentMethod || "CASH",

            description:
              description || null,

            notes:
              notes || null,

            projectId:
              projectId
                ? Number(projectId)
                : null,

            categoryId:
              categoryId
                ? Number(categoryId)
                : null,

            workerId:
              workerId
                ? Number(workerId)
                : null,

            vendorId:
              vendorId
                ? Number(vendorId)
                : null,
          },

          include: {
            project: true,
            category: true,
            worker: true,
            vendor: true,
          },
        });

      res.json({
        success: true,
        message:
          "Transaction updated successfully",
        data: transaction,
      });
    } catch (error) {
      console.error(
        "Update Transaction Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);


// DELETE TRANSACTION
app.delete(
  "/api/transactions/:id",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const existingTransaction =
        await prisma.transaction.findUnique({
          where: {
            id,
          },
        });

      if (!existingTransaction) {
        return res.status(404).json({
          success: false,
          message:
            "Transaction not found",
        });
      }

      await prisma.transaction.delete({
        where: {
          id,
        },
      });

      res.json({
        success: true,
        message:
          "Transaction deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete Transaction Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// GET CATEGORIES WITH PAGINATION
app.get("/api/categories/paginated", async (req, res) => {
  try {
    const page = Number(req.query.limit) === -1 ? 1 : Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [5, 10, 20, 25, 50, 100];

    const limit = limitValue === -1 ? Math.max(1, await prisma.category.count()) : allowedLimits.includes(
      limitValue
    )
      ? limitValue
      : 10;

    // -----------------------------------------
    // INCOME CATEGORIES
    // -----------------------------------------

    const totalIncomeCategories =
      await prisma.category.count({
        where: {
          status: "ACTIVE",
          type: "INCOME",
        },
      });

    const incomeTotalPages = Math.max(
      Math.ceil(
        totalIncomeCategories / limit
      ),
      1
    );

    const incomePage = Math.min(
      page,
      incomeTotalPages
    );

    const incomeCategories =
      await prisma.category.findMany({
        where: {
          status: "ACTIVE",
          type: "INCOME",
        },
        orderBy: {
          name: "asc",
        },
        skip:
          (incomePage - 1) * limit,
        take: limit,
      });

    // -----------------------------------------
    // EXPENSE CATEGORIES
    // -----------------------------------------

    const totalExpenseCategories =
      await prisma.category.count({
        where: {
          status: "ACTIVE",
          type: "EXPENSE",
        },
      });

    const expenseTotalPages = Math.max(
      Math.ceil(
        totalExpenseCategories / limit
      ),
      1
    );

    const expensePage = Math.min(
      page,
      expenseTotalPages
    );

    const expenseCategories =
      await prisma.category.findMany({
        where: {
          status: "ACTIVE",
          type: "EXPENSE",
        },
        orderBy: {
          name: "asc",
        },
        skip:
          (expensePage - 1) * limit,
        take: limit,
      });

    res.json({
      success: true,

      data: {
        income: incomeCategories,
        expense: expenseCategories,
      },

      pagination: {
        income: {
          page: incomePage,
          limit,
          totalRecords:
            totalIncomeCategories,
          totalPages:
            incomeTotalPages,
        },

        expense: {
          page: expensePage,
          limit,
          totalRecords:
            totalExpenseCategories,
          totalPages:
            expenseTotalPages,
        },
      },
    });
  } catch (error) {
    console.error(
      "Get Paginated Categories Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});






// =========================================
// 404 ROUTE
// =========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});



// =========================================
// START SERVER
// =========================================

if (require.main === module) app.listen(PORT, () => {
  console.log("=================================");
  console.log(
    "BE Interior Finance Manager API"
  );
  console.log(
    `Server running on port ${PORT}`
  );
  console.log(
    `http://localhost:${PORT}`
  );
  console.log("=================================");
});

module.exports = {app, prisma};
