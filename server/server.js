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

const adapter = new PrismaMariaDb({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "",
  database: "be_interior_finance",
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

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

// GET SINGLE PROJECT
app.get("/api/projects/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const project = await prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        transactions: true,
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Get Project Error:", error);

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

    const finalPaidAmount =
      Number(paidAmount) || 0;

    if (finalPaidAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Paid amount cannot be negative",
      });
    }

    if (finalPaidAmount > grandTotal) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot be greater than grand total",
      });
    }

    const dueAmount =
      grandTotal - finalPaidAmount;

    let finalPaymentStatus =
      paymentStatus || "UNPAID";

    if (finalPaidAmount === 0) {
      finalPaymentStatus = "UNPAID";
    } else if (
      finalPaidAmount >= grandTotal
    ) {
      finalPaymentStatus = "PAID";
    } else {
      finalPaymentStatus = "PARTIAL";
    }

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

              paymentStatus:
                finalPaymentStatus,

              paidAmount:
                finalPaidAmount,

              dueAmount:
                dueAmount,

              notes:
                notes?.trim() || null,
            },
          });

        // CREATE ITEMS + STOCK MOVEMENTS
        for (
          const item of preparedItems
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

          await tx.stockMovement.create({
            data: {
              materialId:
                item.materialId,

              movementType:
                "PURCHASE",

              quantity:
                item.quantity,

              unit:
                item.unit,

              referenceType:
                "PURCHASE",

              referenceId:
                purchase.id,

              projectId:
                projectId
                  ? Number(projectId)
                  : null,

              unitCost:
                item.unitPrice,

              notes:
                `Purchase ${purchase.purchaseNo}`,
            },
          });
        }

        return purchase;
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
          // ADJUSTMENT is treated according to quantity sign
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

    let currentStock = 0;

    for (const movement of movements) {
      const movementQty =
        Number(movement.quantity) || 0;

      switch (movement.movementType) {
        case "PURCHASE":
        case "RETURN":
          currentStock += movementQty;
          break;

        case "PROJECT_USAGE":
        case "DAMAGE":
          currentStock -= movementQty;
          break;

        case "ADJUSTMENT":
          currentStock += movementQty;
          break;

        default:
          break;
      }
    }

    // Prevent negative stock
    if (quantityNumber > currentStock) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available stock: ${currentStock} ${material.unit}`,
      });
    }

    // Optional project verification
    if (projectId) {
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

          projectId:
            projectId
              ? Number(projectId)
              : null,

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
        },
      });

    // Expenses for current page
    const expenses =
      await prisma.transaction.findMany({
        where: {
          type: "EXPENSE",
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