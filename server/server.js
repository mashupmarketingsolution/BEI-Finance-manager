const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

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
// MIDDLEWARE
// =========================================

app.use(cors());
app.use(express.json());

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
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 50, 100];

    const limit = allowedLimits.includes(
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
      transaction.source !== "PURCHASE_PAYMENT"
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

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
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

    const project = await prisma.project.update({
      where: {
        id,
      },
      data: {
        name: name ? name.trim() : existingProject.name,
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
// DASHBOARD API
// =========================================

app.get("/api/dashboard", async (req, res) => {
  try {
    const totalProjects = await prisma.project.count();

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
        currentBalance: totalIncome - totalExpenses,
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
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 5;

    const allowedLimits = [
      5,
      10,
      20,
      50,
      100,
    ];

    const limit = allowedLimits.includes(
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
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 50, 100];

    const limit = allowedLimits.includes(
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

// =====================================================
// CREATE PURCHASE PAYMENT
// =====================================================

app.post(
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

      const {
        paymentDate,
        amount,
        paymentMethod,
        referenceNo,
        notes,
      } = req.body;

      // -----------------------------------------
      // BASIC VALIDATION
      // -----------------------------------------

      if (!paymentDate) {
        return res.status(400).json({
          success: false,
          message: "Payment date is required",
        });
      }

      const paymentAmount =
        Number(amount);

      if (
        Number.isNaN(paymentAmount) ||
        paymentAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment amount must be greater than 0",
        });
      }

      const allowedPaymentMethods = [
        "CASH",
        "BANK",
        "MOBILE_BANKING",
        "OTHER",
      ];

      const finalPaymentMethod =
        paymentMethod || "CASH";

      if (
        !allowedPaymentMethods.includes(
          finalPaymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment method",
        });
      }

      // -----------------------------------------
      // FIND PURCHASE
      // -----------------------------------------

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

      const grandTotal =
        Number(purchase.grandTotal) || 0;

      // -----------------------------------------
      // GET EXISTING PAYMENTS
      // -----------------------------------------

      const paymentSummary =
        await prisma.purchasePayment.aggregate({
          where: {
            purchaseId,
          },
          _sum: {
            amount: true,
          },
        });

      const alreadyPaid =
        Number(
          paymentSummary._sum.amount
        ) || 0;

      const currentDue =
        grandTotal - alreadyPaid;

      // -----------------------------------------
      // PREVENT OVERPAYMENT
      // -----------------------------------------

      if (paymentAmount > currentDue) {
        return res.status(400).json({
          success: false,
          message:
            `Payment amount cannot be greater than due amount (${currentDue})`,
        });
      }

      // -----------------------------------------
      // CREATE PAYMENT + UPDATE PURCHASE
      // -----------------------------------------

      const result =
        await prisma.$transaction(
          async (tx) => {
            // -------------------------------
            // 1. CREATE PAYMENT
            // -------------------------------

            const payment =
              await tx.purchasePayment.create({
                data: {
                  purchaseId,

                  paymentDate:
                    new Date(paymentDate),

                  amount:
                    paymentAmount,

                  paymentMethod:
                    finalPaymentMethod,

                  referenceNo:
                    referenceNo?.trim() ||
                    null,

                  notes:
                    notes?.trim() ||
                    null,
                },
              });

            // -------------------------------
            // 2. CALCULATE NEW SUMMARY
            // -------------------------------

            const newPaidAmount =
              alreadyPaid +
              paymentAmount;

            const newDueAmount =
              grandTotal -
              newPaidAmount;

            const newPaymentStatus =
              newPaidAmount === 0
                ? "UNPAID"
                : newPaidAmount >=
                  grandTotal
                ? "PAID"
                : "PARTIAL";

            // -------------------------------
            // 3. UPDATE PURCHASE
            // -------------------------------

            const updatedPurchase =
              await tx.purchase.update({
                where: {
                  id: purchaseId,
                },

                data: {
                  paidAmount:
                    newPaidAmount,

                  dueAmount:
                    newDueAmount,

                  paymentStatus:
                    newPaymentStatus,
                },
              });

            // -------------------------------
            // 4. FIND MATERIAL CATEGORY
            // -------------------------------

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

            // -------------------------------
            // 5. CREATE PAYMENT TRANSACTION
            // -------------------------------

            const transaction =
              await tx.transaction.create({
                data: {
                  transactionDate:
                    new Date(paymentDate),

                  type: "EXPENSE",
                  source: "PURCHASE_PAYMENT",

                  amount:
                    paymentAmount,

                  paymentMethod:
                    finalPaymentMethod,

                  description:
                    `Vendor Payment - ${purchase.purchaseNo}`,

                  notes:
                    notes?.trim() ||
                    `Payment for Purchase ${purchase.purchaseNo}`,

                  projectId:
                    purchase.projectId,

                  categoryId:
                    materialCategory.id,

                  vendorId:
                    purchase.vendorId,
                },
              });

            return {
              payment,
              updatedPurchase,
              transaction,
            };
          },
          {
            maxWait: 10000,
            timeout: 20000,
          }
        );

      // -----------------------------------------
      // SUCCESS RESPONSE
      // -----------------------------------------

      res.status(201).json({
        success: true,

        message:
          "Purchase payment created successfully",

        data: result,
      });

    } catch (error) {
      console.error(
        "Create Purchase Payment Error:",
        error
      );

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);
// =====================================================
// RECEIVE PURCHASE MATERIAL
// =====================================================

app.post("/api/purchases/:id/receive", async (req, res) => {
  try {
    const purchaseId = Number(req.params.id);

    if (!purchaseId || purchaseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase ID",
      });
    }

    const { receiveDate, items } = req.body;

    if (!receiveDate) {
      return res.status(400).json({
        success: false,
        message: "Receive date is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one receive item is required",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: {
          id: purchaseId,
        },
        include: {
          items: true,
        },
      });

      if (!purchase) {
        throw new Error("Purchase not found");
      }

      const purchaseItemsById = new Map(
        purchase.items.map((item) => [item.id, item])
      );

      const receiveResults = [];

      for (const receiveItem of items) {
        const purchaseItemId = Number(receiveItem.purchaseItemId);
        const receiveQuantity = Number(receiveItem.quantity);

        if (!purchaseItemId || purchaseItemId <= 0) {
          throw new Error("Invalid purchase item ID");
        }

        if (
          !Number.isFinite(receiveQuantity) ||
          receiveQuantity <= 0
        ) {
          throw new Error(
            `Receive quantity must be greater than 0 for PurchaseItem ${purchaseItemId}`
          );
        }

        const purchaseItem =
          purchaseItemsById.get(purchaseItemId);

        if (!purchaseItem) {
          throw new Error(
            `PurchaseItem ${purchaseItemId} does not belong to Purchase ${purchaseId}`
          );
        }

        const orderedQuantity =
          Number(purchaseItem.quantity) || 0;

        const alreadyReceived =
          Number(purchaseItem.receivedQuantity) || 0;

        const newReceivedQuantity =
          alreadyReceived + receiveQuantity;

        if (newReceivedQuantity > orderedQuantity) {
          throw new Error(
            `Cannot receive ${receiveQuantity} for PurchaseItem ${purchaseItemId}. ` +
              `Ordered: ${orderedQuantity}, already received: ${alreadyReceived}, ` +
              `remaining: ${orderedQuantity - alreadyReceived}`
          );
        }

        const updatedPurchaseItem =
          await tx.purchaseItem.update({
            where: {
              id: purchaseItemId,
            },
            data: {
              receivedQuantity: newReceivedQuantity,
            },
          });

        const stockMovement =
          await tx.stockMovement.create({
            data: {
              materialId: purchaseItem.materialId,
              movementType: "PURCHASE",
              quantity: receiveQuantity,
              unit: purchaseItem.unit,
              referenceType: "PURCHASE_RECEIVE",
              referenceId: purchase.id,
              projectId: purchase.projectId,
              unitCost: purchaseItem.unitPrice,
              notes:
                receiveItem.notes?.trim() ||
                `Material Receive - ${purchase.purchaseNo}`,
              movementDate: new Date(receiveDate),
            },
          });

        receiveResults.push({
          purchaseItem: updatedPurchaseItem,
          stockMovement,
        });
      }

      return {
        purchaseId: purchase.id,
        purchaseNo: purchase.purchaseNo,
        receiveDate: new Date(receiveDate),
        items: receiveResults,
      };
    });

    res.json({
      success: true,
      message: "Purchase material received successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Receive Purchase Material Error:",
      error
    );

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// =====================================================
// GET PROJECT MATERIAL RETURN AVAILABILITY
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

app.post("/api/stock-movements/usage", async (req, res) => {
  try {
    const {
      materialId,
      quantity,
      projectId,
      unit,
      notes,
    } = req.body;

    const materialIdNumber = Number(materialId);
    const quantityNumber = Number(quantity);

    if (!materialIdNumber || materialIdNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Material is required",
      });
    }

    if (
      Number.isNaN(quantityNumber) ||
      quantityNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    // Verify material
    const material = await prisma.material.findUnique({
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

    // Calculate current stock before usage
    const movements = await prisma.stockMovement.findMany({
      where: {
        materialId: materialIdNumber,
      },
    });

       const { currentStock } =
  calculateMaterialStock(movements);

    // Prevent negative stock
    if (quantityNumber > currentStock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available stock: ${currentStock} ${material.unit}`,
      });
    }

// Project is mandatory for stock usage
const projectIdNumber = Number(projectId);

if (!projectIdNumber || projectIdNumber <= 0) {
  return res.status(400).json({
    success: false,
    message: "Project is required",
  });
}

// Verify project
const project = await prisma.project.findUnique({
  where: {
    id: projectIdNumber,
  },
});

if (!project) {
  return res.status(400).json({
    success: false,
    message: "Project not found",
  });
}




    const movement =
      await prisma.stockMovement.create({
        data: {
          materialId: materialIdNumber,

          movementType:
            "PROJECT_USAGE",

          quantity:
            quantityNumber,

          unit:
            unit?.trim() || material.unit,

          referenceType:
            "PROJECT_USAGE",

         projectId: projectIdNumber,

          notes:
            notes?.trim() || null,
        },

        include: {
          material: true,
          project: true,
        },
      });

    res.status(201).json({
      success: true,
      message:
        "Stock usage recorded successfully",
      data: movement,
    });

  } catch (error) {
    console.error(
      "Create Stock Usage Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =====================================================
// CREATE STOCK RETURN / PROJECT RETURN
// =====================================================

app.post("/api/stock-movements/return", async (req, res) => {
  try {
    const {
      materialId,
      quantity,
      unit,
      projectId,
      notes,
    } = req.body;

    const materialIdNumber = Number(materialId);
    const quantityNumber = Number(quantity);
    const projectIdNumber = Number(projectId);

    // -----------------------------------------
    // BASIC VALIDATION
    // -----------------------------------------

    if (!materialIdNumber || materialIdNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Material is required",
      });
    }

    if (
      !Number.isFinite(quantityNumber) ||
      quantityNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    if (!projectIdNumber || projectIdNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Project is required for material return",
      });
    }

    // -----------------------------------------
    // VERIFY MATERIAL
    // -----------------------------------------

    const material = await prisma.material.findUnique({
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

    const project = await prisma.project.findUnique({
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
        in: ["PROJECT_USAGE", "RETURN"],
      },
    },
    select: {
      movementType: true,
      quantity: true,
    },
  });

// -----------------------------------------
// CALCULATE PROJECT RETURN AVAILABILITY
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
    // PREVENT INVALID RETURN
    // -----------------------------------------

    if (quantityNumber > availableReturn) {
      return res.status(400).json({
        success: false,
        message:
          `Return quantity cannot exceed available project material. ` +
          `Available return: ${availableReturn} ${material.unit}`,
      });
    }

    // -----------------------------------------
    // CREATE PROJECT RETURN
    // -----------------------------------------

    const movement =
      await prisma.stockMovement.create({
        data: {
          materialId: materialIdNumber,

          movementType: "RETURN",

          quantity: quantityNumber,

          unit:
            unit?.trim() || material.unit,

          referenceType: "STOCK_RETURN",

          projectId: projectIdNumber,

          notes:
            notes?.trim() || null,
        },

        include: {
          material: true,
          project: true,
        },
      });

    // -----------------------------------------
    // RESPONSE
    // -----------------------------------------

    res.status(201).json({
      success: true,
      message:
        "Project material return recorded successfully",

      data: movement,

      summary: {
        totalUsed,
        totalReturned:
          totalReturned + quantityNumber,
        availableReturn:
          availableReturn - quantityNumber,
      },
    });

  } catch (error) {
    console.error(
      "Create Project Return Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// =====================================================
// CREATE STOCK DAMAGE
// =====================================================

app.post("/api/stock-movements/damage", async (req, res) => {
  try {
    const {
      materialId,
      quantity,
      unit,
      notes,
    } = req.body;

    const materialIdNumber = Number(materialId);
    const quantityNumber = Number(quantity);

    if (!materialIdNumber || materialIdNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Material is required",
      });
    }

    if (
      Number.isNaN(quantityNumber) ||
      quantityNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

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

    // Check current stock
    const stockMovements =
      await prisma.stockMovement.findMany({
        where: {
          materialId: materialIdNumber,
        },
        select: {
          movementType: true,
          quantity: true,
        },
      });

         const { currentStock } =
      calculateMaterialStock(stockMovements);

    if (quantityNumber > currentStock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available stock: ${currentStock}`,
      });
    }

    const movement =
      await prisma.stockMovement.create({
        data: {
          materialId: materialIdNumber,

          movementType: "DAMAGE",

          quantity: quantityNumber,

          unit:
            unit?.trim() || material.unit,

          referenceType: "STOCK_DAMAGE",

          notes:
            notes?.trim() || null,
        },

        include: {
          material: true,
        },
      });

    res.status(201).json({
      success: true,
      message:
        "Stock damage recorded successfully",
      data: movement,
    });

  } catch (error) {
    console.error(
      "Create Stock Damage Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =====================================================
// CREATE STOCK ADJUSTMENT
// =====================================================

app.post("/api/stock-movements/adjustment", async (req, res) => {
  try {
    const {
      materialId,
      quantity,
      unit,
      notes,
    } = req.body;

    const materialIdNumber = Number(materialId);
    const quantityNumber = Number(quantity);

    if (!materialIdNumber || materialIdNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Material is required",
      });
    }

    if (
      Number.isNaN(quantityNumber) ||
      quantityNumber === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Adjustment quantity cannot be 0",
      });
    }

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

    // Calculate current stock
    const stockMovements =
      await prisma.stockMovement.findMany({
        where: {
          materialId: materialIdNumber,
        },
        select: {
          movementType: true,
          quantity: true,
        },
      });
    const { currentStock } =
      calculateMaterialStock(stockMovements);
    // Negative adjustment cannot exceed stock
    if (
      quantityNumber < 0 &&
      Math.abs(quantityNumber) > currentStock
    ) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available stock: ${currentStock}`,
      });
    }

    const movement =
      await prisma.stockMovement.create({
        data: {
          materialId: materialIdNumber,

          movementType: "ADJUSTMENT",

          // IMPORTANT:
          // Positive = increase
          // Negative = decrease
          quantity: quantityNumber,

          unit:
            unit?.trim() || material.unit,

          referenceType: "STOCK_ADJUSTMENT",

          notes:
            notes?.trim() || null,
        },

        include: {
          material: true,
        },
      });

    res.status(201).json({
      success: true,
      message:
        "Stock adjustment recorded successfully",
      data: movement,
    });

  } catch (error) {
    console.error(
      "Create Stock Adjustment Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


// =========================================
// VENDOR MATERIAL PRICE API
// =========================================

// GET ALL PRICES FOR A MATERIAL
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
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 50, 100];

    const limit = allowedLimits.includes(
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
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 50, 100];

    const limit = allowedLimits.includes(
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
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 50, 100];

    const limit = allowedLimits.includes(
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
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 50, 100];

    const limit = allowedLimits.includes(
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

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 50, 100];

    const limit = allowedLimits.includes(
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
            mode: "insensitive",
          },
        },

        {
          project: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },

        {
          category: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },

        {
          worker: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },

        {
          vendor: {
            name: {
              contains: search,
              mode: "insensitive",
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

        where,

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
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limitValue =
      Number(req.query.limit) || 10;

    const allowedLimits = [10, 20, 50, 100];

    const limit = allowedLimits.includes(
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

app.listen(PORT, () => {
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


