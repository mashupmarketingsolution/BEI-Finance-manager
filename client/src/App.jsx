import { Fragment, useEffect, useState } from "react";

import axios from "axios";
import {
  LayoutDashboard,
  FolderKanban,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Building2,
  Tags,
  Boxes,
  ShoppingCart,
  Wallet,
  Menu,
  X,
  ClipboardList,
  FileText,
  FileCheck,
  Plus,
  RefreshCw,
  LoaderCircle,
  Save,

} from "lucide-react";
import "./App.css";

const API_URL = "http://localhost:5000";

const RefreshButton = ({ onRefresh }) => {
  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      await onRefresh();
    } catch (error) {
      console.error(
        "Refresh Error:",
        error
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      type="button"
      className="refresh-button"
      onClick={handleRefresh}
      disabled={isRefreshing}
    >
      <RefreshCw
        size={18}
        className={
          isRefreshing ? "spin" : ""
        }
      />

      {isRefreshing
        ? "Refreshing..."
        : "Refresh"}
    </button>
  );
};


function App() {
  const [projects, setProjects] = useState([]);
  const [projectPage, setProjectPage] = useState(1);

  const [projectLimit, setProjectLimit] = useState(10);

  const [projectPagination, setProjectPagination] = useState({
    page: 1,
    limit: 10,
    totalProjects: 0,
    totalPages: 1,
  });

  const [dashboardData, setDashboardData] = useState({
    totalProjects: 0,
    totalIncome: 0,
    totalExpenses: 0,
    currentBalance: 0,
  });

  const [activePage, setActivePage] = useState("dashboard");

  const [income, setIncome] = useState([]);
  const [incomePage, setIncomePage] = useState(1);

  const [incomeLimit, setIncomeLimit] = useState(10);

  const [incomePagination, setIncomePagination] = useState({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 1,
  });

  const [incomeSummary, setIncomeSummary] = useState({
    totalIncome: 0,
  });
  const [showIncomeDetailsModal, setShowIncomeDetailsModal] =
    useState(false);

  const [selectedIncome, setSelectedIncome] =
    useState(null);






  const [transactions, setTransactions] = useState([]);
  const [transactionPage, setTransactionPage] =
    useState(1);

  const [transactionLimit, setTransactionLimit] =
    useState(10);

  const [
    transactionPagination,
    setTransactionPagination,
  ] = useState({
    page: 1,
    limit: 10,
    totalTransactions: 0,
    totalPages: 1,
  });

  const [
    transactionSummary,
    setTransactionSummary,
  ] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    currentBalance: 0,
  });

  const [editingTransactionId, setEditingTransactionId] = useState(null);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);

  const [showTransactionDetailsModal, setShowTransactionDetailsModal] =
    useState(false);

  const [selectedTransaction, setSelectedTransaction] =
    useState(null);

  const [transactionForm, setTransactionForm] = useState({
    transactionDate: new Date()
      .toISOString()
      .split("T")[0],

    type: "INCOME",
    amount: "",
    paymentMethod: "CASH",
    description: "",
    notes: "",
    projectId: "",
    categoryId: "",
    workerId: "",
    vendorId: "",
  });


  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("ALL");
  const [transactionProjectFilter, setTransactionProjectFilter] = useState("ALL");
  const [transactionCategoryFilter, setTransactionCategoryFilter] = useState("ALL");



  const [workers, setWorkers] = useState([]);
  const [workerPage, setWorkerPage] = useState(1);

  const [workerLimit, setWorkerLimit] = useState(10);

  const [workerPagination, setWorkerPagination] = useState({
    page: 1,
    limit: 10,
    totalWorkers: 0,
    totalPages: 1,
  });


  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [savingWorker, setSavingWorker] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState(null);
  const [showWorkerDetailsModal, setShowWorkerDetailsModal] =
    useState(false);

  const [selectedWorker, setSelectedWorker] =
    useState(null);



  const [workerForm, setWorkerForm] = useState({
    name: "",
    phone: "",
    role: "",
  });


  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  const [purchasePage, setPurchasePage] =
    useState(1);

  const [purchaseLimit, setPurchaseLimit] =
    useState(10);

  const [showPurchaseModal, setShowPurchaseModal] =
    useState(false);

  const [showPurchaseDetailsModal, setShowPurchaseDetailsModal] =
    useState(false);


  const [savingPurchase, setSavingPurchase] =
    useState(false);
// =========================================
// PURCHASE ORDER STATES
// =========================================

const [purchaseOrders, setPurchaseOrders] = useState([]);

const [purchaseOrderLoading, setPurchaseOrderLoading] =
  useState(false);

const [purchaseOrderMessage, setPurchaseOrderMessage] =
  useState("");

const [savingPurchaseOrder, setSavingPurchaseOrder] =
  useState(false);

const [editingPurchaseOrderId, setEditingPurchaseOrderId] =
  useState(null);

const [showPurchaseOrderModal, setShowPurchaseOrderModal] =
  useState(false);

const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
const [showPurchaseOrderViewModal, setShowPurchaseOrderViewModal] = useState(false);

const [editingPurchaseId, setEditingPurchaseId] =
  useState(null);

  const [purchaseForm, setPurchaseForm] =
    useState({
      purchaseNo: "",
      purchaseDate: new Date()
        .toISOString()
        .split("T")[0],
      vendorId: "",
      projectId: "",
      discount: "",
      transportCost: "",
      paidAmount: "",
      notes: "",
    });

  const [purchaseItems, setPurchaseItems] =
    useState([
      {
        materialId: "",
        quantity: "",
        unit: "",
        unitPrice: "",
        total: 0,
        notes: "",
      },
    ]);

  const [selectedPurchase, setSelectedPurchase] =
    useState(null);


const [purchaseOrderForm, setPurchaseOrderForm] =
  useState({
    poNo: "",
    poDate: new Date()
      .toISOString()
      .split("T")[0],
    vendorId: "",
    projectId: "",
    rfqId: "",
    discount: 0,
    transportCost: 0,
    paidAmount: 0,
    notes: "",
  });

const [purchaseOrderItems, setPurchaseOrderItems] =
  useState([]);


// purchaseRequests State //

const [purchaseRequests, setPurchaseRequests] = useState([]);
const [editingPurchaseRequestId, setEditingPurchaseRequestId] = useState(null);
const [purchaseRequestItems, setPurchaseRequestItems] = useState([]);

const [purchaseRequestItemForm, setPurchaseRequestItemForm] = useState({
  materialId: "",
  quantity: "",
  unit: "",
  requiredDate: "",
  notes: "",
});

const [editingPurchaseRequestItemId, setEditingPurchaseRequestItemId] =
  useState(null);

const [savingPurchaseRequestItem, setSavingPurchaseRequestItem] =
  useState(false);

const [showPurchaseRequestEditModal, setShowPurchaseRequestEditModal] = useState(false);

const [purchaseRequestEditForm, setPurchaseRequestEditForm] = useState({
  requestNo: "",
  requestDate: "",
  projectId: "",
  status: "DRAFT",
  priority: "NORMAL",
  notes: "",
});
const [purchaseRequestEditItems, setPurchaseRequestEditItems] =
  useState([]);

const [originalPurchaseRequestItemIds, setOriginalPurchaseRequestItemIds] =
  useState([]);
const [savingPurchaseRequestEdit, setSavingPurchaseRequestEdit] = useState(false);
const [purchaseRequestLoading, setPurchaseRequestLoading] = useState(false);
const [purchaseRequestMessage, setPurchaseRequestMessage] = useState("");

const [rfqs, setRfqs] = useState([]);
const [rfqLoading, setRfqLoading] = useState(false);
const [rfqMessage, setRfqMessage] = useState("");

const [rfqPriceComparison, setRfqPriceComparison] =
  useState(null);
const [loadingRFQPriceComparison, setLoadingRFQPriceComparison] =
  useState(false);

const [rfqItems, setRfqItems] = useState([]);
const [rfqVendors, setRfqVendors] = useState([]);

const [rfqVendorForm, setRfqVendorForm] = useState({
  vendorId: "",
  quotedTotal: "",
  notes: "",
});

const [savingRFQVendor, setSavingRFQVendor] =
  useState(false);
const [rfqItemForm, setRfqItemForm] = useState({
  materialId: "",
  quantity: "",
  unit: "",
  notes: "",
});

const [editingRFQItemId, setEditingRFQItemId] = useState(null);

const [savingRFQItem, setSavingRFQItem] = useState(false);


const [showRFQModal, setShowRFQModal] = useState(false);

const [rfqForm, setRfqForm] = useState({
  rfqNo: "",
  rfqDate: new Date().toISOString().split("T")[0],
  projectId: "",
  status: "DRAFT",
  notes: "",
});

const [savingRFQ, setSavingRFQ] = useState(false);
const [editingRFQId, setEditingRFQId] = useState(null);

const [showRFQEditModal, setShowRFQEditModal] = useState(false);

const [rfqEditForm, setRfqEditForm] = useState({
  rfqNo: "",
  rfqDate: "",
  projectId: "",
  status: "DRAFT",
  notes: "",
});

const [savingRFQEdit, setSavingRFQEdit] = useState(false);
const [selectedRFQ, setSelectedRFQ] = useState(null);
const [showRFQViewModal, setShowRFQViewModal] = useState(false);
const [selectedProject, setSelectedProject] = useState(null);
const [showProjectViewModal, setShowProjectViewModal] = useState(false);


const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState(null);
const [showPurchaseRequestViewModal, setShowPurchaseRequestViewModal] = useState(false);
const [showPurchaseRequestModal, setShowPurchaseRequestModal] = useState(false);

const [purchaseRequestForm, setPurchaseRequestForm] = useState({
  requestNo: "PR-0001",
  requestDate: new Date().toISOString().split("T")[0],
  projectId: "",
  status: "DRAFT",
  priority: "NORMAL",
  notes: "",
});

const [savingPurchaseRequest, setSavingPurchaseRequest] = useState(false);

const loadPurchaseRequests = async () => {
  try {
    setPurchaseRequestLoading(true);
    setPurchaseRequestMessage("");

    const response = await axios.get(
      `${API_URL}/api/purchase-requests`
    );

    if (response.data.success) {
      setPurchaseRequests(
        response.data.data || []
      );
    }
  } catch (error) {
    console.error(
      "Load Purchase Requests Error:",
      error
    );

    setPurchaseRequestMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase requests load করা যায়নি!"
      }`
    );
  } finally {
    setPurchaseRequestLoading(false);
  }
};

const loadPurchaseOrders = async () => {
  try {
    setPurchaseOrderLoading(true);

    const response = await axios.get(
      `${API_URL}/api/purchase-orders`
    );

    if (response.data.success) {
      setPurchaseOrders(
        response.data.data || []
      );
    } else {
      setPurchaseOrderMessage(
        response.data.message ||
          "Purchase orders load করা যায়নি!"
      );
    }
  } catch (error) {
    console.error(
      "Load Purchase Orders Error:",
      error
    );

    setPurchaseOrderMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase orders load করা যায়নি!"
      }`
    );
  } finally {
    setPurchaseOrderLoading(false);
  }
};
// =========================================
// CREATE PURCHASE ORDER FROM AWARDED RFQ
// =========================================

const createPurchaseOrderFromRFQ = (rfq) => {
  try {
    if (!rfq) {
      setRfqMessage(
        "❌ RFQ data পাওয়া যায়নি"
      );
      return;
    }

    if (rfq.status !== "AWARDED") {
      setRfqMessage(
        "❌ Only awarded RFQ can be converted to Purchase Order"
      );
      return;
    }

    if (
      !rfq.items ||
      rfq.items.length === 0
    ) {
      setRfqMessage(
        "❌ This RFQ has no items"
      );
      return;
    }

    // Find awarded vendor from RFQ vendors
    const awardedVendor = rfq.vendors?.find(
      (vendor) =>
        Number(vendor.vendorId) ===
        Number(rfq.awardedVendorId)
    );

    if (!awardedVendor) {
      setRfqMessage(
        "❌ Awarded vendor পাওয়া যায়নি"
      );
      return;
    }

    // Generate PO number
    const poNo =
      `PO-${String(Date.now()).slice(-6)}`;

    // --------------------------------
    // Prepare PO items
    // --------------------------------
    const totalQuoted =
      Number(
        awardedVendor.quotedTotal || 0
      );

    const preparedItems =
      rfq.items.map((item) => {

        let unitPrice = 0;

        // Current RFQ quotation is a total quote.
        // For a single-item RFQ we can safely
        // calculate unit price.
        if (
          rfq.items.length === 1 &&
          Number(item.quantity) > 0
        ) {
          unitPrice =
            totalQuoted /
            Number(item.quantity);
        }

     return {
        materialId: String(
          item.materialId ||
          item.material?.id ||
          ""
        ),
        material:
          item.material || null,
        
        quantity:
          Number(item.quantity || 0),

        unit:
          item.unit ||
          item.material?.unit ||
          "",

        unitPrice,

        notes:
          item.notes || "",
      };


      });

    // --------------------------------
    // Fill PO form
    // --------------------------------
    setPurchaseOrderForm({
      poNo,

      poDate:
        new Date()
          .toISOString()
          .split("T")[0],

      vendorId:
        String(awardedVendor.vendorId),

      projectId:
        String(rfq.projectId),

      rfqId:
        String(rfq.id),

      discount: 0,

      transportCost: 0,

      notes:
        `Created from ${rfq.rfqNo}`,
    });

    setPurchaseOrderItems(
      preparedItems
    );

    setEditingPurchaseOrderId(null);

    setPurchaseOrderMessage("");

    // Close RFQ view
    setShowRFQViewModal(false);

    // Open PO modal
    setShowPurchaseOrderModal(true);

  } catch (error) {
    console.error(
      "Create PO From RFQ Error:",
      error
    );

    setRfqMessage(
      "❌ Purchase Order form load করা যায়নি!"
    );
  }
};

const savePurchaseOrder = async () => {
  if (savingPurchaseOrder) {
    return;
  }

  setPurchaseOrderMessage("");

  const poNo = purchaseOrderForm.poNo.trim();
  const poDate = purchaseOrderForm.poDate;
  const vendorId = Number(
    purchaseOrderForm.vendorId
  );

  const projectId = purchaseOrderForm.projectId
    ? Number(purchaseOrderForm.projectId)
    : null;

  const rfqId = purchaseOrderForm.rfqId
    ? Number(purchaseOrderForm.rfqId)
    : null;

  const discount = Number(
    purchaseOrderForm.discount || 0
  );

  const transportCost = Number(
    purchaseOrderForm.transportCost || 0
  );

  // ==============================
  // VALIDATION
  // ==============================

  if (!poNo) {
    setPurchaseOrderMessage(
      "❌ PO number is required"
    );
    return;
  }

  if (!poDate) {
    setPurchaseOrderMessage(
      "❌ PO date is required"
    );
    return;
  }

  if (!vendorId) {
    setPurchaseOrderMessage(
      "❌ Vendor is required"
    );
    return;
  }

  if (
    !Array.isArray(purchaseOrderItems) ||
    purchaseOrderItems.length === 0
  ) {
    setPurchaseOrderMessage(
      "❌ At least one purchase order item is required"
    );
    return;
  }

  for (const item of purchaseOrderItems) {
    if (!Number(item.materialId)) {
      setPurchaseOrderMessage(
        "❌ Material is required for every item"
      );
      return;
    }

    if (
      Number(item.quantity) <= 0 ||
      Number.isNaN(Number(item.quantity))
    ) {
      setPurchaseOrderMessage(
        "❌ Quantity must be greater than 0"
      );
      return;
    }

    if (
      Number(item.unitPrice) < 0 ||
      Number.isNaN(Number(item.unitPrice))
    ) {
      setPurchaseOrderMessage(
        "❌ Unit price cannot be negative"
      );
      return;
    }
  }

  if (discount < 0) {
    setPurchaseOrderMessage(
      "❌ Discount cannot be negative"
    );
    return;
  }

  if (transportCost < 0) {
    setPurchaseOrderMessage(
      "❌ Transport cost cannot be negative"
    );
    return;
  }

  setSavingPurchaseOrder(true);

  try {
    const payload = {
      poNo,
      poDate,
      vendorId,
      projectId,
      rfqId,
      discount,
      transportCost,
      paidAmount:
      Number(purchaseOrderForm.paidAmount || 0),
      notes:
        purchaseOrderForm.notes.trim() || null,

      items: purchaseOrderItems.map((item) => ({
        materialId: Number(item.materialId),
        quantity: Number(item.quantity),
        unit: item.unit?.trim() || "",
        unitPrice: Number(item.unitPrice),
        notes: item.notes?.trim() || null,
      })),
    };

    const response = editingPurchaseOrderId
      ? await axios.put(
          `${API_URL}/api/purchase-orders/${editingPurchaseOrderId}`,
          payload
        )
      : await axios.post(
          `${API_URL}/api/purchase-orders`,
          payload
        );

    if (response.data.success) {
      setPurchaseOrderMessage(
        editingPurchaseOrderId
          ? "✅ Purchase Order updated successfully"
          : "✅ Purchase Order created successfully"
      );

      await loadPurchaseOrders();

      setPurchaseOrderForm({
        poNo: "",
        poDate: new Date()
          .toISOString()
          .split("T")[0],
        vendorId: "",
        projectId: "",
        rfqId: "",
        discount: 0,
        transportCost: 0,
        notes: "",
      });

      setPurchaseOrderItems([]);
      setEditingPurchaseOrderId(null);

      setTimeout(() => {
        setShowPurchaseOrderModal(false);
        setPurchaseOrderMessage("");
      }, 800);
    }
  } catch (error) {
    console.error(
      "Save Purchase Order Error:",
      error
    );

    setPurchaseOrderMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase order save করা যায়নি!"
      }`
    );
  } finally {
    setSavingPurchaseOrder(false);
  }
};



const handleDeletePurchaseOrder = async (poId) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this Purchase Order?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setPurchaseOrderMessage("");

    const response = await axios.delete(
      `${API_URL}/api/purchase-orders/${poId}`
    );

    if (response.data.success) {
      setPurchaseOrderMessage(
        "✅ Purchase Order deleted successfully"
      );

      await loadPurchaseOrders();

      setTimeout(() => {
        setPurchaseOrderMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Delete Purchase Order Error:",
      error
    );

    setPurchaseOrderMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase Order delete করা যায়নি!"
      }`
    );
  }
};
const handlePurchaseOrderStatusUpdate = async (
  poId,
  newStatus
) => {
  if (!poId || !newStatus) {
    return;
  }

  try {
    setPurchaseOrderMessage("");

    const response = await axios.patch(
      `${API_URL}/api/purchase-orders/${poId}/status`,
      {
        status: newStatus,
      }
    );

    if (response.data.success) {
      setPurchaseOrderMessage(
        "✅ Purchase order status updated successfully"
      );

      await loadPurchaseOrders();

      setTimeout(() => {
        setPurchaseOrderMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Purchase Order Status Update Error:",
      error
    );

    setPurchaseOrderMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase order status update করা যায়নি!"
      }`
    );
  }
};
const handleConvertPurchaseOrder = async (poId) => {
  const confirmed = window.confirm(
    "Are you sure you want to convert this Purchase Order into a Purchase?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setPurchaseOrderMessage("");

    const response = await axios.post(
      `${API_URL}/api/purchase-orders/${poId}/convert-to-purchase`
    );

    if (response.data.success) {
      setPurchaseOrderMessage(
        "✅ Purchase Order converted to Purchase successfully"
      );

      await loadPurchaseOrders();

      setTimeout(() => {
        setPurchaseOrderMessage("");
      }, 2500);
    }
  } catch (error) {
    console.error(
      "Convert Purchase Order Error:",
      error
    );

    setPurchaseOrderMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase Order convert করা যায়নি!"
      }`
    );
  }
};
const getNextPurchaseOrderStatuses = (currentStatus) => {
  const transitions = {
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

  return transitions[currentStatus] || [];
};
const loadRFQs = async () => {
  try {
    setRfqLoading(true);
    setRfqMessage("");

    const response = await axios.get(
      `${API_URL}/api/rfqs`
    );

    if (response.data.success) {
      setRfqs(
        response.data.data || []
      );
    }
  } catch (error) {
    console.error(
      "Load RFQs Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQs load করা যায়নি!"
      }`
    );
  } finally {
    setRfqLoading(false);
  }
};
const saveRFQ = async () => {
  try {
    const {
      rfqNo,
      rfqDate,
      projectId,
      status,
      notes,
    } = rfqForm;

    if (!rfqNo.trim()) {
      setRfqMessage(
        "❌ RFQ number is required"
      );
      return;
    }

    if (!projectId) {
      setRfqMessage(
        "❌ Project is required"
      );
      return;
    }

    setSavingRFQ(true);
    setRfqMessage("");

    const response = await axios.post(
      `${API_URL}/api/rfqs`,
      {
        rfqNo: rfqNo.trim(),
        rfqDate,
        projectId: Number(projectId),
        status,
        notes: notes.trim() || null,
      }
    );

    if (response.data.success) {
      await loadRFQs();

      setShowRFQModal(false);

      setRfqForm({
        rfqNo: "",
        rfqDate: new Date()
          .toISOString()
          .split("T")[0],
        projectId: "",
        status: "DRAFT",
        notes: "",
      });

      setRfqMessage(
        "✅ RFQ created successfully"
      );

      setTimeout(() => {
        setRfqMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Save RFQ Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ save করা যায়নি!"
      }`
    );
  } finally {
    setSavingRFQ(false);
  }
};
const editRFQ = async (id) => {
  try {
  await loadMaterials();
  await loadVendors();
    const response = await axios.get(
      `${API_URL}/api/rfqs/${id}`
    );

    if (response.data.success) {
      const rfq = response.data.data;

      setEditingRFQId(rfq.id);

      setRfqEditForm({
        rfqNo: rfq.rfqNo || "",
        rfqDate: rfq.rfqDate
          ? new Date(rfq.rfqDate)
              .toISOString()
              .split("T")[0]
          : "",
        projectId: rfq.projectId
          ? String(rfq.projectId)
          : "",
        status: rfq.status || "DRAFT",
        notes: rfq.notes || "",
      });
      setRfqItems(
        (rfq.items || []).map((item) => ({
          id: item.id,
          materialId: String(item.materialId || ""),
          quantity: item.quantity ?? "",
          unit: item.unit || "",
          notes: item.notes || "",
        }))
      );

      setRfqVendors(
        (rfq.vendors || []).map((item) => ({
          id: item.id,
          vendorId: String(item.vendorId || ""),
          quotedTotal: item.quotedTotal ?? "",
          notes: item.notes || "",
        }))
      );

      setRfqVendorForm({
        vendorId: "",
        quotedTotal: "",
        notes: "",
      });

      setEditingRFQItemId(null);

      setRfqItemForm({
        materialId: "",
        quantity: "",
        unit: "",
        notes: "",
      });


      setRfqMessage("");
      setShowRFQEditModal(true);
    }
  } catch (error) {
    console.error(
      "Edit RFQ Load Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ details load করা যায়নি!"
      }`
    );
  }
};
const deleteRFQ = async (id) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this RFQ?"
  );

  if (!confirmed) return;

  try {
    setRfqMessage("");

    const response = await axios.delete(
      `${API_URL}/api/rfqs/${id}`
    );

    if (response.data.success) {
      await loadRFQs();

      setRfqMessage(
        "✅ RFQ deleted successfully"
      );

      setTimeout(() => {
        setRfqMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Delete RFQ Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ delete করা যায়নি!"
      }`
    );
  }
};

// =========================================
// LOAD RFQ PRICE COMPARISON
// =========================================

const loadRFQPriceComparison = async (rfqId) => {
  try {
    if (!rfqId) {
      return;
    }

    setLoadingRFQPriceComparison(true);

    const response = await axios.get(
      `${API_URL}/api/rfqs/${rfqId}/price-comparison`
    );

    if (response.data.success) {
     
      setRfqPriceComparison(
      response.data.data || null
    );

    } else {
      setRfqPriceComparison(null);
    }
  } catch (error) {
    console.error(
      "Load RFQ Price Comparison Error:",
      error
    );
    setRfqPriceComparison(null);
   
  } finally {
    setLoadingRFQPriceComparison(false);
  }
};

// =========================================
// AWARD RFQ TO VENDOR
// =========================================

const awardRFQ = async (rfqId, rfqVendorId) => {
  try {
    if (!rfqId || !rfqVendorId) {
      setRfqMessage("❌ RFQ এবং Vendor নির্বাচন করুন");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to award this RFQ to this vendor?"
    );

    if (!confirmed) {
      return;
    }

    setRfqMessage("");

    const response = await axios.post(
      `${API_URL}/api/rfqs/${rfqId}/award`,
      {
        rfqVendorId: Number(rfqVendorId),
      }
    );

    if (response.data.success) {
      setRfqMessage(
        "✅ RFQ awarded successfully"
      );

      await loadRFQs();

      await loadRFQPriceComparison(rfqId);
    }
  } catch (error) {
    console.error(
      "Award RFQ Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ award করা যায়নি!"
      }`
    );
  }
};
// =========================================
// ADD RFQ VENDOR
// =========================================

const addRFQVendor = async () => {
  try {
    if (!editingRFQId) {
      setRfqMessage("❌ RFQ select করা হয়নি!");
      return;
    }

    if (!rfqVendorForm.vendorId) {
      setRfqMessage("❌ Vendor is required");
      return;
    }

    if (
      rfqVendorForm.quotedTotal !== "" &&
      Number(rfqVendorForm.quotedTotal) < 0
    ) {
      setRfqMessage(
        "❌ Quoted total cannot be negative"
      );
      return;
    }

    setSavingRFQVendor(true);
    setRfqMessage("");

    const response = await axios.post(
      `${API_URL}/api/rfqs/${editingRFQId}/vendors`,
      {
        vendorId: Number(
          rfqVendorForm.vendorId
        ),

        quotedTotal:
          rfqVendorForm.quotedTotal === ""
            ? null
            : Number(
                rfqVendorForm.quotedTotal
              ),

        notes:
          rfqVendorForm.notes?.trim() || null,
      }
    );

    if (response.data.success) {
      setRfqVendors((prev) => [
        ...prev,
        response.data.data,
      ]);

      setRfqVendorForm({
        vendorId: "",
        quotedTotal: "",
        notes: "",
      });

      setRfqMessage(
        "✅ Vendor added to RFQ successfully"
      );
    }
  } catch (error) {
    console.error(
      "Add RFQ Vendor Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "Vendor add করা যায়নি!"
      }`
    );
  } finally {
    setSavingRFQVendor(false);
  }
};

const editRFQVendor = (item) => {
  setEditingRFQVendorId(item.id);

  setRfqVendorForm({
    vendorId: String(item.vendorId || ""),
    quotedTotal:
      item.quotedTotal ?? "",
    notes: item.notes || "",
  });
};
const updateRFQVendor = async () => {
  try {
    if (!editingRFQVendorId) {
      return;
    }

    if (!rfqVendorForm.vendorId) {
      setRfqMessage("❌ Vendor is required");
      return;
    }

    if (
      rfqVendorForm.quotedTotal !== "" &&
      Number(rfqVendorForm.quotedTotal) < 0
    ) {
      setRfqMessage(
        "❌ Quoted total cannot be negative"
      );
      return;
    }

    setSavingRFQVendor(true);
    setRfqMessage("");

    const response = await axios.put(
      `${API_URL}/api/rfq-vendors/${editingRFQVendorId}`,
      {
        vendorId: Number(
          rfqVendorForm.vendorId
        ),

        quotedTotal:
          rfqVendorForm.quotedTotal === ""
            ? null
            : Number(
                rfqVendorForm.quotedTotal
              ),

        notes:
          rfqVendorForm.notes?.trim() || null,
      }
    );

    if (response.data.success) {
      setRfqVendors((prev) =>
        prev.map((item) =>
          item.id === editingRFQVendorId
            ? response.data.data
            : item
        )
      );

      setEditingRFQVendorId(null);

      setRfqVendorForm({
        vendorId: "",
        quotedTotal: "",
        notes: "",
      });

      setRfqMessage(
        "✅ RFQ vendor updated successfully"
      );
    }
  } catch (error) {
    console.error(
      "Update RFQ Vendor Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ vendor update করা যায়নি!"
      }`
    );
  } finally {
    setSavingRFQVendor(false);
  }
};
const handleDeleteRFQVendor = async (vendorItemId) => {
  const confirmed = window.confirm(
    "Are you sure you want to remove this vendor from the RFQ?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setRfqMessage("");

    const response = await axios.delete(
      `${API_URL}/api/rfq-vendors/${vendorItemId}`
    );

    if (response.data.success) {
      setRfqVendors((prev) =>
        prev.filter(
          (item) => item.id !== vendorItemId
        )
      );

      setRfqMessage(
        "✅ Vendor removed from RFQ successfully"
      );

      await loadRFQs();

      setTimeout(() => {
        setRfqMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Delete RFQ Vendor Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "Vendor delete করা যায়নি!"
      }`
    );
  }
};
const [editingRFQVendorId, setEditingRFQVendorId] =
  useState(null);

// =========================================
// ADD RFQ ITEM
// =========================================




const addRFQItem = async () => {
  try {
    if (!editingRFQId) {
      setRfqMessage("❌ RFQ select করা হয়নি!");
      return;
    }

    if (!rfqItemForm.materialId) {
      setRfqMessage("❌ Material is required");
      return;
    }

    if (
      !rfqItemForm.quantity ||
      Number(rfqItemForm.quantity) <= 0
    ) {
      setRfqMessage(
        "❌ Quantity must be greater than 0"
      );
      return;
    }

    if (!rfqItemForm.unit?.trim()) {
      setRfqMessage("❌ Unit is required");
      return;
    }

    setSavingRFQItem(true);
    setRfqMessage("");

    const response = await axios.post(
      `${API_URL}/api/rfqs/${editingRFQId}/items`,
      {
        materialId: Number(
          rfqItemForm.materialId
        ),

        quantity: Number(
          rfqItemForm.quantity
        ),

        unit:
          rfqItemForm.unit.trim(),

        notes:
          rfqItemForm.notes?.trim() || null,
      }
    );

    if (response.data.success) {
      setRfqItems((prev) => [
        ...prev,
        response.data.data,
      ]);

      setRfqItemForm({
        materialId: "",
        quantity: "",
        unit: "",
        notes: "",
      });

      setRfqMessage(
        "✅ RFQ item added successfully"
      );
    }
  } catch (error) {
    console.error(
      "Add RFQ Item Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ item add করা যায়নি!"
      }`
    );
  } finally {
    setSavingRFQItem(false);
  }
};
const editRFQItem = (item) => {
  setEditingRFQItemId(item.id);

  setRfqItemForm({
    materialId: String(item.materialId || ""),
    quantity: item.quantity ?? "",
    unit: item.unit || "",
    notes: item.notes || "",
  });
};
const updateRFQItem = async () => {
  try {
    if (!editingRFQItemId) {
      return;
    }

    if (!rfqItemForm.materialId) {
      setRfqMessage("❌ Material is required");
      return;
    }

    if (
      !rfqItemForm.quantity ||
      Number(rfqItemForm.quantity) <= 0
    ) {
      setRfqMessage(
        "❌ Quantity must be greater than 0"
      );
      return;
    }

    if (!rfqItemForm.unit?.trim()) {
      setRfqMessage("❌ Unit is required");
      return;
    }

    setSavingRFQItem(true);
    setRfqMessage("");

    const response = await axios.put(
      `${API_URL}/api/rfq-items/${editingRFQItemId}`,
      {
        materialId: Number(
          rfqItemForm.materialId
        ),
        quantity: Number(
          rfqItemForm.quantity
        ),
        unit:
          rfqItemForm.unit.trim(),
        notes:
          rfqItemForm.notes?.trim() || null,
      }
    );

    if (response.data.success) {
      setRfqItems((prev) =>
        prev.map((item) =>
          item.id === editingRFQItemId
            ? response.data.data
            : item
        )
      );

      setEditingRFQItemId(null);

      setRfqItemForm({
        materialId: "",
        quantity: "",
        unit: "",
        notes: "",
      });

      setRfqMessage(
        "✅ RFQ item updated successfully"
      );
    }
  } catch (error) {
    console.error(
      "Update RFQ Item Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ item update করা যায়নি!"
      }`
    );
  } finally {
    setSavingRFQItem(false);
  }
};


const handleDeleteRFQItem = async (itemId) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this RFQ item?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setRfqMessage("");

    const response = await axios.delete(
      `${API_URL}/api/rfq-items/${itemId}`
    );

    if (response.data.success) {
      setRfqItems((prev) =>
        prev.filter((item) => item.id !== itemId)
      );

      setRfqMessage(
        "✅ RFQ item deleted successfully"
      );

      await loadRFQs();

      setTimeout(() => {
        setRfqMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Delete RFQ Item Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ item delete করা যায়নি!"
      }`
    );
  }
};

const saveRFQEdit = async () => {
  try {
    const {
      rfqNo,
      rfqDate,
      projectId,
      status,
      notes,
    } = rfqEditForm;

    if (!rfqNo.trim()) {
      setRfqMessage(
        "❌ RFQ number is required"
      );
      return;
    }

    if (!projectId) {
      setRfqMessage(
        "❌ Project is required"
      );
      return;
    }

    setSavingRFQEdit(true);
    setRfqMessage("");

    const response = await axios.put(
      `${API_URL}/api/rfqs/${editingRFQId}`,
      {
        rfqNo: rfqNo.trim(),
        rfqDate,
        projectId: Number(projectId),
        status,
        notes: notes.trim() || null,
      }
    );

    if (response.data.success) {
      await loadRFQs();

      setShowRFQEditModal(false);
      setEditingRFQId(null);

      setRfqMessage(
        "✅ RFQ updated successfully"
      );

      setTimeout(() => {
        setRfqMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Save RFQ Edit Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ update করা যায়নি!"
      }`
    );
  } finally {
    setSavingRFQEdit(false);
  }
};


const viewRFQ = async (id) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/rfqs/${id}`
    );

    if (response.data.success) {
      const rfq = response.data.data;

      setSelectedRFQ(rfq);
    // ✅ Price comparison load
      await loadRFQPriceComparison(id);
      setShowRFQViewModal(true);
    }
  } catch (error) {
    console.error(
      "View RFQ Error:",
      error
    );

    setRfqMessage(
      `❌ ${
        error.response?.data?.message ||
        "RFQ details load করা যায়নি!"
      }`
    );
  }
};

useEffect(() => {
  if (activePage === "purchase-requests") {
    loadPurchaseRequests();
  }
}, [activePage]);

useEffect(() => {
  if (activePage === "rfqs") {
    loadRFQs();
  }
  if (activePage === "purchase-orders") {
  loadPurchaseOrders();
}
}, [activePage]);


const viewPurchaseRequest = async (id) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/purchase-requests/${id}`
    );

    if (response.data.success) {
      const request = response.data.data;

    setSelectedPurchaseRequest(request);
    setShowPurchaseRequestViewModal(true);
    }
  } catch (error) {
    console.error(
      "View Purchase Request Error:",
      error
    );

    setPurchaseRequestMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase request details load করা যায়নি!"
      }`
    );
  }
};

// =========================================
// PURCHASE REQUEST EDIT ITEMS
// =========================================

const addPurchaseRequestEditItem = () => {
  setPurchaseRequestEditItems((previous) => [
    ...previous,
    {
      id: null,
      materialId: "",
      quantity: "",
      unit: "",
      requiredDate: "",
      notes: "",
    },
  ]);
};

const removePurchaseRequestEditItem = (index) => {
  setPurchaseRequestEditItems((previous) =>
    previous.filter(
      (_, itemIndex) =>
        itemIndex !== index
    )
  );
};

const handlePurchaseRequestEditItemChange = (
  index,
  field,
  value
) => {
  setPurchaseRequestEditItems((previous) =>
    previous.map((item, itemIndex) => {

      if (itemIndex !== index) {
        return item;
      }

      const updatedItem = {
        ...item,
        [field]: value,
      };

      // Auto-fill unit from material
      if (
        field === "materialId" &&
        value
      ) {
        const material =
          materials.find(
            (material) =>
              Number(material.id) ===
              Number(value)
          );

        if (material) {
          updatedItem.unit =
            material.unit || "";
        }
      }

      return updatedItem;
    })
  );
};

const editPurchaseRequest = async (id) => {
  try {

    // Load materials for edit dropdown
    await loadMaterials(
      1,
      materialLimit
    );

    const response = await axios.get(
      `${API_URL}/api/purchase-requests/${id}`
    );

    if (!response.data.success) {
      setPurchaseRequestMessage(
        "❌ Purchase request details load করা যায়নি!"
      );
      return;
    }

    const request =
      response.data.data;

    setEditingPurchaseRequestId(
      request.id
    );

    // ==============================
    // HEADER
    // ==============================

    setPurchaseRequestEditForm({
      requestNo:
        request.requestNo || "",

      requestDate:
        request.requestDate
          ? new Date(
              request.requestDate
            )
              .toISOString()
              .split("T")[0]
          : "",

      projectId:
        request.projectId
          ? String(request.projectId)
          : "",

      status:
        request.status || "DRAFT",

      priority:
        request.priority || "NORMAL",

      notes:
        request.notes || "",
    });


    // ==============================
    // ITEMS
    // ==============================

    const editItems =
      (request.items || []).map(
        (item) => ({
          id: item.id,

          materialId:
            String(item.materialId),

          quantity:
            item.quantity ?? "",

          unit:
            item.unit || "",

          requiredDate:
            item.requiredDate
              ? new Date(
                  item.requiredDate
                )
                  .toISOString()
                  .split("T")[0]
              : "",

          notes:
            item.notes || "",
        })
      );


    setPurchaseRequestEditItems(
      editItems
    );


    setOriginalPurchaseRequestItemIds(
      editItems
        .filter(
          (item) => item.id
        )
        .map(
          (item) => item.id
        )
    );


    setPurchaseRequestMessage("");

    setShowPurchaseRequestEditModal(
      true
    );

  } catch (error) {

    console.error(
      "Edit Purchase Request Load Error:",
      error
    );

    setPurchaseRequestMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase request details load করা যায়নি!"
      }`
    );
  }
};


const deletePurchaseRequest = async (id) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this purchase request?"
  );

  if (!confirmed) return;

  try {
    setPurchaseRequestMessage("");

    const response = await axios.delete(
      `${API_URL}/api/purchase-requests/${id}`
    );

    if (response.data.success) {
      await loadPurchaseRequests();

      setPurchaseRequestMessage(
        "✅ Purchase request deleted successfully"
      );

      setTimeout(() => {
        setPurchaseRequestMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Delete Purchase Request Error:",
      error
    );

    setPurchaseRequestMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase request delete করা যায়নি!"
      }`
    );
  }
};

const savePurchaseRequestItem = async () => {
  if (savingPurchaseRequestItem) {
    return;
  }

  if (!editingPurchaseRequestId) {
    setPurchaseRequestMessage(
      "❌ Purchase request not selected"
    );
    return;
  }

  const materialId = Number(
    purchaseRequestItemForm.materialId
  );

  const quantity = Number(
    purchaseRequestItemForm.quantity
  );

  const unit =
    purchaseRequestItemForm.unit.trim();

  if (!materialId) {
    setPurchaseRequestMessage(
      "❌ Material is required"
    );
    return;
  }

  if (!quantity || quantity <= 0) {
    setPurchaseRequestMessage(
      "❌ Quantity must be greater than 0"
    );
    return;
  }

  if (!unit) {
    setPurchaseRequestMessage(
      "❌ Unit is required"
    );
    return;
  }

  try {
    setSavingPurchaseRequestItem(true);
    setPurchaseRequestMessage("");

    const payload = {
      materialId,
      quantity,
      unit,
      requiredDate:
        purchaseRequestItemForm.requiredDate || null,
      notes:
        purchaseRequestItemForm.notes.trim() || null,
    };

    let response;

    if (editingPurchaseRequestItemId) {
      response = await axios.put(
        `${API_URL}/api/purchase-request-items/${editingPurchaseRequestItemId}`,
        payload
      );
    } else {
      response = await axios.post(
        `${API_URL}/api/purchase-requests/${editingPurchaseRequestId}/items`,
        payload
      );
    }

    if (response.data.success) {
      const savedItem = response.data.data;

      setPurchaseRequestItems((prev) => {
        if (editingPurchaseRequestItemId) {
          return prev.map((item) =>
            item.id === editingPurchaseRequestItemId
              ? {
                  ...item,
                  ...savedItem,
                  materialId: String(
                    savedItem.materialId
                  ),
                  quantity:
                    savedItem.quantity,
                  unit:
                    savedItem.unit,
                  requiredDate:
                    savedItem.requiredDate
                      ? new Date(
                          savedItem.requiredDate
                        )
                          .toISOString()
                          .split("T")[0]
                      : "",
                  notes:
                    savedItem.notes || "",
                }
              : item
          );
        }

        return [
          ...prev,
          {
            id: savedItem.id,
            materialId: String(
              savedItem.materialId
            ),
            quantity:
              savedItem.quantity,
            unit:
              savedItem.unit,
            requiredDate:
              savedItem.requiredDate
                ? new Date(
                    savedItem.requiredDate
                  )
                    .toISOString()
                    .split("T")[0]
                : "",
            notes:
              savedItem.notes || "",
          },
        ];
      });

      setPurchaseRequestItemForm({
        materialId: "",
        quantity: "",
        unit: "",
        requiredDate: "",
        notes: "",
      });

      const wasEditing =
        Boolean(
          editingPurchaseRequestItemId
        );

      setEditingPurchaseRequestItemId(null);

      setPurchaseRequestMessage(
        wasEditing
          ? "✅ Purchase request item updated successfully"
          : "✅ Purchase request item added successfully"
      );

      await loadPurchaseRequests();

      setTimeout(() => {
        setPurchaseRequestMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Save Purchase Request Item Error:",
      error
    );

    setPurchaseRequestMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase request item save করা যায়নি!"
      }`
    );
  } finally {
    setSavingPurchaseRequestItem(false);
  }
};

const handleDeletePurchaseRequestItem = async (itemId) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this purchase request item?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setPurchaseRequestMessage("");

    const response = await axios.delete(
      `${API_URL}/api/purchase-request-items/${itemId}`
    );

    if (response.data.success) {
      setPurchaseRequestItems((prev) =>
        prev.filter((item) => item.id !== itemId)
      );

      setPurchaseRequestMessage(
        "✅ Purchase request item deleted successfully"
      );

      await loadPurchaseRequests();

      setTimeout(() => {
        setPurchaseRequestMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Delete Purchase Request Item Error:",
      error
    );

    setPurchaseRequestMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase request item delete করা যায়নি!"
      }`
    );
  }
};


const savePurchaseRequestEdit = async () => {
  try {

    const {
      requestNo,
      requestDate,
      projectId,
      status,
      priority,
      notes,
    } = purchaseRequestEditForm;


    // ==============================
    // HEADER VALIDATION
    // ==============================

    if (!requestNo.trim()) {
      setPurchaseRequestMessage(
        "❌ Purchase request number is required"
      );
      return;
    }


    if (!requestDate) {
      setPurchaseRequestMessage(
        "❌ Request date is required"
      );
      return;
    }


    if (!projectId) {
      setPurchaseRequestMessage(
        "❌ Project is required"
      );
      return;
    }


    // ==============================
    // ITEM VALIDATION
    // ==============================

    if (
      purchaseRequestEditItems.length === 0
    ) {
      setPurchaseRequestMessage(
        "❌ Add at least one request item"
      );
      return;
    }


    const invalidItem =
      purchaseRequestEditItems.find(
        (item) =>
          !item.materialId ||
          Number(item.quantity) <= 0 ||
          !item.unit?.trim()
      );


    if (invalidItem) {
      setPurchaseRequestMessage(
        "❌ Please complete all request item fields"
      );
      return;
    }


    setSavingPurchaseRequestEdit(
      true
    );

    setPurchaseRequestMessage("");


    // ==============================
    // UPDATE REQUEST HEADER
    // ==============================

    const response =
      await axios.put(
        `${API_URL}/api/purchase-requests/${editingPurchaseRequestId}`,
        {
          requestNo:
            requestNo.trim(),

          requestDate,

          projectId:
            Number(projectId),

          status,

          priority,

          notes:
            notes?.trim() || null,
        }
      );


    if (!response.data.success) {
      throw new Error(
        response.data.message ||
        "Purchase request update failed"
      );
    }


    // ==============================
    // EXISTING + NEW ITEMS
    // ==============================

    for (
      const item of purchaseRequestEditItems
    ) {

      const payload = {
        materialId:
          Number(item.materialId),

        quantity:
          Number(item.quantity),

        unit:
          item.unit.trim(),

        requiredDate:
          item.requiredDate ||
          null,

        notes:
          item.notes?.trim() ||
          null,
      };


      // EXISTING ITEM → UPDATE
      if (item.id) {

        const itemResponse =
          await axios.put(
            `${API_URL}/api/purchase-request-items/${item.id}`,
            payload
          );


        if (
          !itemResponse.data.success
        ) {
          throw new Error(
            itemResponse.data.message ||
            "Purchase request item update failed"
          );
        }

      }

      // NEW ITEM → CREATE
      else {

        const itemResponse =
          await axios.post(
            `${API_URL}/api/purchase-requests/${editingPurchaseRequestId}/items`,
            payload
          );


        if (
          !itemResponse.data.success
        ) {
          throw new Error(
            itemResponse.data.message ||
            "Purchase request item create failed"
          );
        }
      }
    }


    // ==============================
    // DELETE REMOVED ITEMS
    // ==============================

    const currentItemIds =
      purchaseRequestEditItems
        .filter(
          (item) => item.id
        )
        .map(
          (item) => item.id
        );


    const deletedItemIds =
      originalPurchaseRequestItemIds
        .filter(
          (id) =>
            !currentItemIds.includes(id)
        );


    for (
      const itemId of deletedItemIds
    ) {

      const deleteResponse =
        await axios.delete(
          `${API_URL}/api/purchase-request-items/${itemId}`
        );


      if (
        !deleteResponse.data.success
      ) {
        throw new Error(
          deleteResponse.data.message ||
          "Purchase request item delete failed"
        );
      }
    }


    // ==============================
    // SUCCESS
    // ==============================

    await loadPurchaseRequests();


    setEditingPurchaseRequestId(
      null
    );

    setShowPurchaseRequestEditModal(
      false
    );


    setPurchaseRequestEditItems(
      []
    );

    setOriginalPurchaseRequestItemIds(
      []
    );


    setPurchaseRequestMessage(
      "✅ Purchase request updated successfully"
    );


    setTimeout(() => {
      setPurchaseRequestMessage("");
    }, 2000);


  } catch (error) {

    console.error(
      "Save Purchase Request Edit Error:",
      error
    );

    setPurchaseRequestMessage(
      `❌ ${
        error.response?.data?.message ||
        error.message ||
        "Purchase request update করা যায়নি!"
      }`
    );

  } finally {

    setSavingPurchaseRequestEdit(
      false
    );
  }
};

const savePurchaseRequest = async () => {
  try {
    const {
      requestNo,
      requestDate,
      projectId,
      status,
      priority,
      notes,
    } = purchaseRequestForm;

    if (!requestNo.trim()) {
      setPurchaseRequestMessage(
        "❌ Purchase request number is required"
      );
      return;
    }

    if (!projectId) {
      setPurchaseRequestMessage(
        "❌ Project is required"
      );
      return;
    }

    setSavingPurchaseRequest(true);
    setPurchaseRequestMessage("");

    const response = await axios.post(
      `${API_URL}/api/purchase-requests`,
      {
        requestNo: requestNo.trim(),
        requestDate,
        projectId: Number(projectId),
        status,
        priority,
        notes: notes.trim(),
      }
    );

if (response.data.success) {
  const successMessage =
    "✅ Purchase request created successfully";

  setShowPurchaseRequestModal(false);

  setPurchaseRequestForm({
    requestNo: "",
    requestDate: new Date()
      .toISOString()
      .split("T")[0],
    projectId: "",
    status: "DRAFT",
    priority: "NORMAL",
    notes: "",
  });

  await loadPurchaseRequests();

  setPurchaseRequestMessage(successMessage);

  setTimeout(() => {
    setPurchaseRequestMessage("");
  }, 2000);
}



  } catch (error) {
    console.error(
      "Save Purchase Request Error:",
      error
    );

    setPurchaseRequestMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase request save করা যায়নি!"
      }`
    );
  } finally {
    setSavingPurchaseRequest(false);
  }
};


  const [loadingPurchaseDetails, setLoadingPurchaseDetails] =
    useState(false);

  const openPurchaseDetails = async (purchaseId) => {
    try {
      console.log(
        "Opening purchase:",
        purchaseId
      );

      setLoadingPurchaseDetails(true);

      // আগে modal open হবে
      setShowPurchaseDetailsModal(true);

      const response = await axios.get(
        `${API_URL}/api/purchases/${purchaseId}`
      );

      console.log(
        "Purchase Details API Response:",
        response.data
      );

      if (response.data.success) {
        console.log(
          "Setting selected purchase..."
        );

        setSelectedPurchase(
          response.data.data
        );

        console.log(
          "Purchase details loaded successfully"
        );
      } else {
        setMessage(
          "❌ Purchase details পাওয়া যায়নি!"
        );

        setShowPurchaseDetailsModal(false);
      }

    } catch (error) {
      console.error(
        "Load Purchase Details Error:",
        error
      );

      setMessage(
        "❌ Purchase details load করা যায়নি!"
      );

      setShowPurchaseDetailsModal(false);

    } finally {
      setLoadingPurchaseDetails(false);
    }
  };

const openEditPurchaseModal = async (purchaseId) => {
  try {
    setSavingPurchase(false);

    await loadPurchaseMaterials();

    const response = await axios.get(
      `${API_URL}/api/purchases/${purchaseId}`
    );

    if (!response.data.success) {
      setMessage(
        "❌ Purchase details পাওয়া যায়নি!"
      );
      return;
    }

    const purchase =
      response.data.data;

    setEditingPurchaseId(purchase.id);

    setPurchaseForm({
      purchaseNo:
        purchase.purchaseNo || "",

      purchaseDate:
        purchase.purchaseDate
          ? new Date(purchase.purchaseDate)
              .toISOString()
              .split("T")[0]
          : "",

      vendorId:
        purchase.vendorId
          ? String(purchase.vendorId)
          : "",

      projectId:
        purchase.projectId
          ? String(purchase.projectId)
          : "",

      discount:
        purchase.discount ?? "",

      transportCost:
        purchase.transportCost ?? "",

      paidAmount:
        purchase.paidAmount ?? "",

      notes:
        purchase.notes || "",
    });

    setPurchaseItems(
      (purchase.items || []).map(
        (item) => ({
          materialId:
            String(item.materialId),

          quantity:
            item.quantity ?? "",

          unit:
            item.unit || "",

          unitPrice:
            item.unitPrice ?? "",

          total:
            Number(item.total) || 0,

          notes:
            item.notes || "",
        })
      )
    );

    setShowPurchaseModal(true);

  } catch (error) {
    console.error(
      "Open Edit Purchase Error:",
      error
    );

    setMessage(
      error.response?.data?.message ||
      "❌ Purchase edit data load করা যায়নি!"
    );
  }
};

const handleDeletePurchase = async (purchase) => {
  const confirmed = window.confirm(
    `Are you sure you want to delete purchase "${purchase.purchaseNo}"?\n\n` +
    `This will also remove its automatic expense and purchase stock entries.`
  );

  if (!confirmed) return;

  try {
    const response = await axios.delete(
      `${API_URL}/api/purchases/${purchase.id}`
    );

    if (response.data.success) {
      setMessage(
        "✅ Purchase deleted successfully"
      );

      await loadPurchases();
    }
  } catch (error) {
    console.error(
      "Delete Purchase Error:",
      error
    );

    setMessage(
      error.response?.data?.message ||
      "❌ Purchase delete করা যায়নি!"
    );
  }

  setTimeout(() => {
    setMessage("");
  }, 3000);
};





  // =========================================
  // MATERIALS
  // =========================================

  const [materials, setMaterials] = useState([]);
  const [materialPage, setMaterialPage] = useState(1);
  const [materialLimit, setMaterialLimit] = useState(10);

  const [materialFormError, setMaterialFormError] =
  useState("");



  const [
    materialPagination,
    setMaterialPagination
  ] = useState({
    page: 1,
    limit: 10,
    totalMaterials: 0,
    totalPages: 1,
  });

  const [
    materialCategories,
    setMaterialCategories
  ] = useState([]);
  const [
    showMaterialCategoryModal,
    setShowMaterialCategoryModal
  ] = useState(false);

  const [
    editingMaterialCategory,
    setEditingMaterialCategory
  ] = useState(null);

  const [
    materialCategoryForm,
    setMaterialCategoryForm
  ] = useState({
    name: "",
    description: "",
    status: "ACTIVE",
  });

  const [materialCategoryPage, setMaterialCategoryPage] =
    useState(1);

  const [materialCategoryLimit, setMaterialCategoryLimit] =
    useState(5);

  const [
    materialCategoryPagination,
    setMaterialCategoryPagination
  ] = useState({
    page: 1,
    limit: 5,
    totalRecords: 0,
    totalPages: 1,
  });










  const [vendors, setVendors] = useState([]);
  const [vendorPage, setVendorPage] = useState(1);

  const [vendorLimit, setVendorLimit] = useState(10);

  const [vendorPagination, setVendorPagination] = useState({
    page: 1,
    limit: 10,
    totalVendors: 0,
    totalPages: 1,
  });

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);

  const [showVendorDetailsModal, setShowVendorDetailsModal] =
    useState(false);

  const [selectedVendor, setSelectedVendor] =
    useState(null);


  const [vendorForm, setVendorForm] = useState({
    name: "",
    companyName: "",
    phone: "",
    address: "",
  });





  const [expenses, setExpenses] = useState([]);
  const [expensePage, setExpensePage] = useState(1);

  const [expenseLimit, setExpenseLimit] = useState(10);

  const [expensePagination, setExpensePagination] = useState({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 1,
  });

  const [expenseSummary, setExpenseSummary] = useState({
    totalExpenses: 0,
  });


  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showExpenseDetailsModal, setShowExpenseDetailsModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const [expenseForm, setExpenseForm] = useState({
    transactionDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "CASH",
    description: "",
    notes: "",
    projectId: "",
    categoryId: "",
    workerId: "",
    vendorId: "",
  });



  const [categories, setCategories] = useState([]);
  const [incomeCategoryPage, setIncomeCategoryPage] = useState(1);
  const [incomeCategoryLimit, setIncomeCategoryLimit] = useState(5);

  const [incomeCategoryPagination, setIncomeCategoryPagination] = useState({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 1,
  });
  const [paginatedIncomeCategories, setPaginatedIncomeCategories] = useState([]);

  const [expenseCategoryPage, setExpenseCategoryPage] = useState(1);
  const [expenseCategoryLimit, setExpenseCategoryLimit] = useState(5);

  const [expenseCategoryPagination, setExpenseCategoryPagination] = useState({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 1,
  });
  const [paginatedExpenseCategories, setPaginatedExpenseCategories] = useState([]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "INCOME",
    status: "ACTIVE",
  });









  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState(null);


  const [incomeForm, setIncomeForm] = useState({
    transactionDate: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "CASH",
    description: "",
    notes: "",
    projectId: "",
  });

  const [totalIncome, setTotalIncome] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingMaterials, setRefreshingMaterials] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showMaterialPriceModal, setShowMaterialPriceModal] = useState(false);

  const [materialPriceForm, setMaterialPriceForm] = useState({
    vendorId: "",
    price: "",
    minimumQuantity: "",
    leadTime: "",
    notes: "",
  });

const [
  materialPriceFormMessage,
  setMaterialPriceFormMessage
] = useState("");



  const [
    editingMaterialPriceId,
    setEditingMaterialPriceId
  ] = useState(null);



  const [materialPrices, setMaterialPrices] = useState([]);

  const [materialPriceSummary, setMaterialPriceSummary] = useState({
    lowestPrice: 0,
    highestPrice: 0,
    averagePrice: 0,
    bestVendor: null,
  });

  const [loadingMaterialPrices, setLoadingMaterialPrices] = useState(false);









  const [savingProject, setSavingProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);


  const [message, setMessage] = useState("");

  const [incomeMessage, setIncomeMessage] = useState("");
  const [expenseMessage, setExpenseMessage] = useState("");

  const [projectForm, setProjectForm] = useState({
    name: "",
    contractValue: "",
    status: "ONGOING",
    notes: "",
  });

// =========================================
// BOQ STATE
// =========================================

const [boqs, setBoqs] = useState([]);

const [boqLoading, setBoqLoading] = useState(false);

const [boqMessage, setBoqMessage] = useState("");

const [boqForm, setBoqForm] = useState({
  boqNo: "",
  name: "",
  projectId: "",
  status: "DRAFT",
  notes: "",
});

const [
  showBOQModal,
  setShowBOQModal
] = useState(false);

const [
  savingBOQ,
  setSavingBOQ
] = useState(false);

const [
  editingBOQId,
  setEditingBOQId
] = useState(null);

const [selectedBOQ, setSelectedBOQ] = useState(null);

const [boqItems, setBoqItems] = useState([]);

const [boqDetailsLoading, setBoqDetailsLoading] =
  useState(false);

const [showBOQDetailsModal, setShowBOQDetailsModal] =
  useState(false);

// =========================================
// BOQ ITEM STATE
// =========================================

const [showBOQItemModal, setShowBOQItemModal] =
  useState(false);

const [savingBOQItem, setSavingBOQItem] =
  useState(false);

const [boqItemMessage, setBoqItemMessage] =
  useState("");

const [boqItemForm, setBoqItemForm] =
  useState({
    materialId: "",
    description: "",
    quantity: "",
    unit: "",
    estimatedUnitPrice: "",
    notes: "",
  });
const [editingBOQItemId, setEditingBOQItemId] =
  useState(null);


const [selectedBOQItem, setSelectedBOQItem] = useState(null);

const [showBOQItemViewModal, setShowBOQItemViewModal] =
  useState(false);






  // =========================================
  // MATERIAL MODAL STATE
  // =========================================

  const [
    showMaterialModal,
    setShowMaterialModal
  ] = useState(false);

  const [
    savingMaterial,
    setSavingMaterial
  ] = useState(false);

  const [
    showMaterialDetailsModal,
    setShowMaterialDetailsModal
  ] = useState(false);

  const [selectedMaterial, setSelectedMaterial] = useState(null);


  // STOCK USAGE STATE

  const [showStockUsageModal, setShowStockUsageModal] = useState(false);
  const [stockUsageMaterial, setStockUsageMaterial] = useState(null);

// STOCK RETURN STATE
const [
  showStockReturnModal,
  setShowStockReturnModal,
] = useState(false);

const [
  stockReturnMaterial,
  setStockReturnMaterial,
] = useState(null);

const [
  stockReturnForm,
  setStockReturnForm,
] = useState({
  quantity: "",
  notes: "",
});


// STOCK DAMAGE STATE
const [
  showStockDamageModal,
  setShowStockDamageModal,
] = useState(false);

const [
  stockDamageMaterial,
  setStockDamageMaterial,
] = useState(null);

const [
  stockDamageForm,
  setStockDamageForm,
] = useState({
  quantity: "",
  notes: "",
});

// STOCK ADJUSTMENT STATE
const [
  showStockAdjustmentModal,
  setShowStockAdjustmentModal,
] = useState(false);

const [
  stockAdjustmentMaterial,
  setStockAdjustmentMaterial,
] = useState(null);

const [
  stockAdjustmentForm,
  setStockAdjustmentForm,
] = useState({
  type: "INCREASE",
  quantity: "",
  notes: "",
});








  const [stockUsageForm, setStockUsageForm] = useState({
    quantity: "",
    projectId: "",
    notes: "",
  });




  const [
    editingMaterialId,
    setEditingMaterialId
  ] = useState(null);

  const [
    materialForm,
    setMaterialForm
  ] = useState({
    code: "",
    name: "",
    categoryId: "",
    subCategory: "",
    brand: "",
    modelCode: "",
    specification: "",
    color: "",
    size: "",
    unit: "",
    description: "",
  });

  // Company Condition

  const ongoingProjectsCount = projects.filter(
    (project) => project.status === "ONGOING"
  ).length;

  const completedProjectsCount = projects.filter(
    (project) => project.status === "COMPLETED"
  ).length;

  const onHoldProjectsCount = projects.filter(
    (project) => project.status === "ON_HOLD"
  ).length;

  const recentTransactionCount = Math.min(
    transactions.length,
    5
  );

  // =========================================
  // LOAD PROJECTS
  // =========================================

  const loadProjects = async (
    page = projectPage,
    limit = projectLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/projects`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (response.data.success) {
        setProjects(response.data.data);

        setProjectPagination(
          response.data.pagination
        );
      }
    } catch (error) {
      console.error(
        "Load Projects Error:",
        error
      );

      setMessage(
        "❌ Server থেকে Project data load করা যায়নি!"
      );
    }
  };


  const loadBOQs = async () => {
  try {
    setBoqLoading(true);

    const response = await axios.get(
      `${API_URL}/api/boqs`
    );

    if (response.data.success) {
      setBoqs(response.data.data || []);
    }
  } catch (error) {
    console.error("Load BOQs Error:", error);

    setBoqMessage(
      `❌ ${
        error.response?.data?.message ||
        "BOQ data load করা যায়নি!"
      }`
    );
  } finally {
    setBoqLoading(false);
  }
};

const openBOQDetails = async (boqId) => {
  try {
    setBoqDetailsLoading(true);

    const response = await axios.get(
      `${API_URL}/api/boqs/${boqId}`
    );

    if (response.data.success) {
      const boq = response.data.data;

      setSelectedBOQ(boq);

      setBoqItems(
        boq.items || []
      );

      setShowBOQDetailsModal(true);
    }
  } catch (error) {
    console.error(
      "Load BOQ Details Error:",
      error
    );

    setBoqMessage(
      `❌ ${
        error.response?.data?.message ||
        "BOQ details load করা যায়নি!"
      }`
    );
  } finally {
    setBoqDetailsLoading(false);
  }
};

const openBOQItemModal = async () => {
  setBoqItemMessage("");

  setBoqItemForm({
    materialId: "",
    description: "",
    quantity: "",
    unit: "",
    estimatedUnitPrice: "",
    notes: "",
  });
setEditingBOQItemId(null);
  // Load materials before opening BOQ item modal
  await loadMaterials(1, 100);

  setShowBOQItemModal(true);
};

const openEditBOQItemModal = (item) => {
  setBoqItemMessage("");

  setEditingBOQItemId(item.id);

  setBoqItemForm({
    materialId: String(
      item.materialId || ""
    ),
    description:
      item.description || "",
    quantity:
      item.quantity != null
        ? String(item.quantity)
        : "",
    unit:
      item.unit || "",
    estimatedUnitPrice:
      item.estimatedUnitPrice != null
        ? String(
            item.estimatedUnitPrice
          )
        : "",
    notes:
      item.notes || "",
  });

  setShowBOQItemModal(true);
};


const openBOQItemViewModal = (item) => {
  setSelectedBOQItem(item);
  setShowBOQItemViewModal(true);
};

const handleBOQItemMaterialChange = (materialId) => {
  const material = materials.find(
    (item) => Number(item.id) === Number(materialId)
  );

  setBoqItemForm((prev) => ({
    ...prev,
    materialId,
    unit: material?.unit || "",
    estimatedUnitPrice:
      prev.estimatedUnitPrice ||
      "",
  }));
};

const saveBOQItem = async () => {
  if (savingBOQItem) {
    return;
  }

  setBoqItemMessage("");

  if (!selectedBOQ) {
    setBoqItemMessage(
      "❌ No BOQ selected"
    );
    return;
  }

  const materialId =
    Number(boqItemForm.materialId);

  const quantity =
    Number(boqItemForm.quantity);

  const estimatedUnitPrice =
    Number(
      boqItemForm.estimatedUnitPrice
    );

  const unit =
    boqItemForm.unit.trim();

  // ==============================
  // VALIDATION
  // ==============================

  if (!materialId) {
    setBoqItemMessage(
      "❌ Material is required"
    );
    return;
  }

  if (
    !quantity ||
    quantity <= 0
  ) {
    setBoqItemMessage(
      "❌ Quantity must be greater than 0"
    );
    return;
  }

  if (!unit) {
    setBoqItemMessage(
      "❌ Unit is required"
    );
    return;
  }

  if (
    Number.isNaN(
      estimatedUnitPrice
    ) ||
    estimatedUnitPrice < 0
  ) {
    setBoqItemMessage(
      "❌ Estimated unit price cannot be negative"
    );
    return;
  }

  setSavingBOQItem(true);

  try {
    const payload = {
      materialId,
      description:
        boqItemForm.description.trim() ||
        null,
      quantity,
      unit,
      estimatedUnitPrice,
      notes:
        boqItemForm.notes.trim() ||
        null,
    };

      let response;

      if (editingBOQItemId) {
        response = await axios.put(
          `${API_URL}/api/boq-items/${editingBOQItemId}`,
          payload
        );
      } else {
        response = await axios.post(
          `${API_URL}/api/boqs/${selectedBOQ.id}/items`,
          payload
        );
      }

    if (response.data.success) {
        setBoqItemMessage(
            editingBOQItemId
              ? "✅ BOQ item updated successfully"
              : "✅ BOQ item added successfully"
          );
            // Refresh BOQ details
      const boqResponse =
        await axios.get(
          `${API_URL}/api/boqs/${selectedBOQ.id}`
        );

      if (
        boqResponse.data.success
      ) {
        const updatedBOQ =
          boqResponse.data.data;

        setSelectedBOQ(
          updatedBOQ
        );

        setBoqItems(
          updatedBOQ.items || []
        );
      }

      setBoqItemForm({
        materialId: "",
        description: "",
        quantity: "",
        unit: "",
        estimatedUnitPrice: "",
        notes: "",
      });

      setTimeout(() => {
        setShowBOQItemModal(false);
        setBoqItemMessage("");
      }, 700);
    }
  } catch (error) {
    console.error(
      "Save BOQ Item Error:",
      error
    );

    setBoqItemMessage(
      `❌ ${
        error.response?.data?.message ||
        "BOQ item save করা যায়নি!"
      }`
    );
  } finally {
    setSavingBOQItem(false);
  }
};


const handleDeleteBOQItem = async (itemId) => {
  if (!selectedBOQ) {
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to delete this BOQ item?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setBoqItemMessage("");

    const response = await axios.delete(
      `${API_URL}/api/boq-items/${itemId}`
    );

    if (response.data.success) {
      setBoqItemMessage(
        "✅ BOQ item deleted successfully"
      );

      // Refresh BOQ details
      const boqResponse = await axios.get(
        `${API_URL}/api/boqs/${selectedBOQ.id}`
      );

      if (boqResponse.data.success) {
        const updatedBOQ =
          boqResponse.data.data;

        setSelectedBOQ(updatedBOQ);

        setBoqItems(
          updatedBOQ.items || []
        );
      }

      setTimeout(() => {
        setBoqItemMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Delete BOQ Item Error:",
      error
    );

    setBoqItemMessage(
      `❌ ${
        error.response?.data?.message ||
        "BOQ item delete করা যায়নি!"
      }`
    );
  }
};

const handleDeleteBOQ = async (boqId) => {
  const confirmed = window.confirm(
    "Are you sure you want to delete this BOQ?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setBoqMessage("");

    const response = await axios.delete(
      `${API_URL}/api/boqs/${boqId}`
    );

    if (response.data.success) {
      setBoqMessage(
        "✅ BOQ deleted successfully"
      );

      await loadBOQs();

      setTimeout(() => {
        setBoqMessage("");
      }, 2000);
    }
  } catch (error) {
    console.error(
      "Delete BOQ Error:",
      error
    );

    setBoqMessage(
      `❌ ${
        error.response?.data?.message ||
        "BOQ delete করা যায়নি!"
      }`
    );
  }
};
  const handleProjectPageChange = (newPage) => {
    setProjectPage(newPage);

    loadProjects(
      newPage,
      projectLimit
    );
  };


  // =========================================
  //Load Prchases
  // =========================================


  const loadPurchases = async () => {
    try {
      setLoadingPurchases(true);

      const response = await axios.get(
        `${API_URL}/api/purchases`
      );

      if (response.data.success) {
        setPurchases(
          response.data.data || []
        );
      }
    } catch (error) {
      console.error(
        "Load Purchases Error:",
        error
      );

      setMessage(
        "❌ Purchase data load করা যায়নি!"
      );
    } finally {
      setLoadingPurchases(false);
    }
  };
useEffect(() => {
  if (activePage === "purchases") {
    loadPurchases();
  }
}, [activePage]);

  const resetPurchaseForm = () => {
    setPurchaseForm({
      purchaseNo: "",
      purchaseDate: new Date()
        .toISOString()
        .split("T")[0],
      vendorId: "",
      projectId: "",
      discount: "",
      transportCost: "",
      paidAmount: "",
      notes: "",
    });

    setPurchaseItems([
      {
        materialId: "",
        quantity: "",
        unit: "",
        unitPrice: "",
        total: 0,
        notes: "",
      },
    ]);
  };



const openPurchaseModal = async () => {
  setEditingPurchaseId(null);

  resetPurchaseForm();

  await loadPurchaseMaterials();

  setShowPurchaseModal(true);
};

  const addPurchaseItem = () => {
    setPurchaseItems((prev) => [
      ...prev,
      {
        materialId: "",
        quantity: "",
        unit: "",
        unitPrice: "",
        total: 0,
        notes: "",
      },
    ]);
  };

  const removePurchaseItem = (index) => {
    setPurchaseItems((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );
    });
  };

  const handlePurchaseItemChange = (
    index,
    field,
    value
  ) => {
    setPurchaseItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const updatedItem = {
          ...item,
          [field]: value,
        };

        if (
          field === "materialId" &&
          value
        ) {
          const material =
            materials.find(
              (material) =>
                Number(material.id) ===
                Number(value)
            );

          if (material) {
            updatedItem.unit =
              material.unit || "";
          }
        }

        const quantity =
          Number(updatedItem.quantity) || 0;

        const unitPrice =
          Number(updatedItem.unitPrice) || 0;

        updatedItem.total =
          quantity * unitPrice;

        return updatedItem;
      })
    );
  };
  const closePurchaseModal = () => {
    if (savingPurchase) return;

    setShowPurchaseModal(false);
    resetPurchaseForm();
  };

  const purchaseSubtotal =
    purchaseItems.reduce(
      (sum, item) =>
        sum +
        (Number(item.total) || 0),
      0
    );

  const purchaseDiscount =
    Number(purchaseForm.discount) || 0;

  const purchaseTransport =
    Number(
      purchaseForm.transportCost
    ) || 0;

  const purchaseGrandTotal =
    purchaseSubtotal -
    purchaseDiscount +
    purchaseTransport;

  const purchasePaidAmount =
    Number(
      purchaseForm.paidAmount
    ) || 0;

  const purchaseDueAmount =
    Math.max(
      purchaseGrandTotal -
      purchasePaidAmount,
      0
    );


  const savePurchase = async () => {
    try {
      if (
        !purchaseForm.purchaseNo.trim()
      ) {
        setMessage(
          "❌ Purchase number is required"
        );
        return;
      }

      if (!purchaseForm.purchaseDate) {
        setMessage(
          "❌ Purchase date is required"
        );
        return;
      }

      if (!purchaseForm.vendorId) {
        setMessage(
          "❌ Please select a vendor"
        );
        return;
      }

      const validItems =
        purchaseItems.filter(
          (item) =>
            item.materialId &&
            Number(item.quantity) > 0 &&
            Number(item.unitPrice) >= 0
        );

      if (validItems.length === 0) {
        setMessage(
          "❌ Add at least one valid material item"
        );
        return;
      }

      if (
        purchasePaidAmount >
        purchaseGrandTotal
      ) {
        setMessage(
          "❌ Paid amount cannot be greater than grand total"
        );
        return;
      }

      setSavingPurchase(true);

      const payload = {
        purchaseNo:
          purchaseForm.purchaseNo.trim(),

        purchaseDate:
          purchaseForm.purchaseDate,

        vendorId:
          Number(purchaseForm.vendorId),

        projectId:
          purchaseForm.projectId
            ? Number(
              purchaseForm.projectId
            )
            : null,

        discount:
          purchaseDiscount,

        transportCost:
          purchaseTransport,

        paidAmount:
          purchasePaidAmount,

        notes:
          purchaseForm.notes.trim() || null,

        items: validItems.map(
          (item) => ({
            materialId:
              Number(item.materialId),

            quantity:
              Number(item.quantity),

            unit:
              item.unit || "",

            unitPrice:
              Number(item.unitPrice),

            notes:
              item.notes?.trim() || null,
          })
        ),
      };


         const response = editingPurchaseId
           ? await axios.put(
              `${API_URL}/api/purchases/${editingPurchaseId}`,
                  payload
               )
              : await axios.post(
                  `${API_URL}/api/purchases`,
                  payload
                );
                

      if (response.data.success) {
        setMessage(
            editingPurchaseId
              ? "✅ Purchase updated successfully"
              : "✅ Purchase created successfully"
          );

        setShowPurchaseModal(false);

        setEditingPurchaseId(null);

        resetPurchaseForm();

        await loadPurchases();
      }

    } catch (error) {
      console.error(
        "Save Purchase Error:",
        error
      );

      setMessage(
        error.response?.data?.message ||
        "❌ Purchase save করা যায়নি!"
      );

    } finally {
      setSavingPurchase(false);
    }
  };

const viewPurchaseOrder = async (id) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/purchase-orders/${id}`
    );

    if (response.data.success) {
      const po = response.data.data;

      setSelectedPurchaseOrder(po);
      setShowPurchaseOrderViewModal(true);
    }
  } catch (error) {
    console.error(
      "View Purchase Order Error:",
      error
    );

    setMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase order details load করা যায়নি!"
      }`
    );
  }
};
const editPurchaseOrder = async (poId) => {
  try {
    setPurchaseOrderMessage("");

    const response = await axios.get(
      `${API_URL}/api/purchase-orders/${poId}`
    );

    if (!response.data.success) {
      setPurchaseOrderMessage(
        response.data.message ||
          "Purchase Order load করা যায়নি!"
      );
      return;
    }

    const po = response.data.data;

    setEditingPurchaseOrderId(po.id);

    setPurchaseOrderForm({
      poNo: po.poNo || "",

      poDate: po.poDate
        ? new Date(po.poDate)
            .toISOString()
            .split("T")[0]
        : new Date()
            .toISOString()
            .split("T")[0],

      vendorId: po.vendorId
        ? String(po.vendorId)
        : "",

      projectId: po.projectId
        ? String(po.projectId)
        : "",

      rfqId: po.rfqId
        ? String(po.rfqId)
        : "",

      discount: po.discount ?? 0,

      transportCost:
        po.transportCost ?? 0,

      notes: po.notes || "",
    });

    setPurchaseOrderItems(
      (po.items || []).map((item) => ({
        id: item.id,

        materialId: item.materialId
          ? String(item.materialId)
          : "",
        material: item.material || null,
        quantity:
          item.quantity ?? "",

        unit: item.unit || "",

        unitPrice:
          item.unitPrice ?? "",

        notes: item.notes || "",
      }))
    );

    // Ensure dropdown data is available
    await Promise.all([
      loadRFQs(),
      loadMaterials(),
    ]);

    setShowPurchaseOrderModal(true);

  } catch (error) {
    console.error(
      "Edit Purchase Order Load Error:",
      error
    );

    setPurchaseOrderMessage(
      `❌ ${
        error.response?.data?.message ||
        "Purchase Order details load করা যায়নি!"
      }`
    );
  }
};



  // =========================================
  // LOAD DASHBOARD
  // =========================================

  const loadDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard`);

      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Dashboard data load করা যায়নি!");
    }
  };


  // =========================================
  // LOAD ALL DATA
  // =========================================

  const loadAllData = async () => {
    try {
      setLoading(true);

      await Promise.all([
        loadProjects(),
        loadDashboard(),
        loadIncome(),
        loadExpenses(),
        loadCategories(),
        loadWorkers(),
        loadVendors(),
        loadTransactions(),
        loadPaginatedCategories(),

      ]);
    } finally {
      setLoading(false);
    }
  };
  const loadPurchaseMaterials = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/materials`,
        {
          params: {
            page: 1,
            limit: 100,
          },
        }
      );

      if (response.data.success) {
        setMaterials(response.data.data);
      }

    } catch (error) {
      console.error(
        "Load Purchase Materials Error:",
        error
      );

      setMessage(
        "❌ Material data load করা যায়নি!"
      );
    }
  };


  const loadIncome = async (
    page = incomePage,
    limit = incomeLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/income`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (response.data.success) {
        setIncome(response.data.data);

        setIncomePagination(
          response.data.pagination
        );

        setIncomeSummary(
          response.data.summary
        );
      }
    } catch (error) {
      console.error(
        "Income load error:",
        error
      );

      setIncomeMessage(
        "❌ Income data load করা যায়নি!"
      );
    }
  };

  const handleIncomePageChange = (newPage) => {
    setIncomePage(newPage);

    loadIncome(
      newPage,
      incomeLimit
    );
  };





  const loadExpenses = async (
    page = expensePage,
    limit = expenseLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/expenses`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (response.data.success) {
        setExpenses(response.data.data);

        setExpensePagination(
          response.data.pagination
        );

        setExpenseSummary(
          response.data.summary
        );
      }
    } catch (error) {
      console.error(
        "Expenses load error:",
        error
      );

      setMessage(
        "❌ Expenses data load করা যায়নি!"
      );
    }
  };

  const handleExpensePageChange = (newPage) => {
    setExpensePage(newPage);

    loadExpenses(
      newPage,
      expenseLimit
    );
  };




  const loadCategories = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/categories`
      );

      console.log("Categories API:", response.data);

      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error("Load Categories Error:", error);
      setMessage("❌ Category data load করা যায়নি!");
    }
  };

  const loadMaterialCategories = async (
    page = materialCategoryPage,
    limit = materialCategoryLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/material-categories`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (response.data.success) {
        setMaterialCategories(
          response.data.data || []
        );

        setMaterialCategoryPagination(
          response.data.pagination || {
            page,
            limit,
            totalRecords: 0,
            totalPages: 1,
          }
        );
      }
    } catch (error) {
      console.error(
        "Load Material Categories Error:",
        error
      );
    }
  };

  const handleMaterialCategoryPageChange = (
    newPage
  ) => {
    if (
      newPage < 1 ||
      newPage >
      materialCategoryPagination.totalPages
    ) {
      return;
    }

    setMaterialCategoryPage(newPage);

    loadMaterialCategories(
      newPage,
      materialCategoryLimit
    );
  };





  const loadIncomePaginatedCategories = async (
    page = incomeCategoryPage,
    limit = incomeCategoryLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/categories/paginated`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (response.data.success) {
        setPaginatedIncomeCategories(
          response.data.data.income
        );

        setIncomeCategoryPagination(
          response.data.pagination.income
        );
      }
    } catch (error) {
      console.error(
        "Load Income Categories Error:",
        error
      );
    }
  };


  const loadExpensePaginatedCategories = async (
    page = expenseCategoryPage,
    limit = expenseCategoryLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/categories/paginated`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (response.data.success) {
        setPaginatedExpenseCategories(
          response.data.data.expense
        );

        setExpenseCategoryPagination(
          response.data.pagination.expense
        );
      }
    } catch (error) {
      console.error(
        "Load Expense Categories Error:",
        error
      );
    }
  };


  // 👇 এখানে এইটা ADD করবে
  const loadPaginatedCategories = async () => {
    await Promise.all([
      loadIncomePaginatedCategories(
        incomeCategoryPage,
        incomeCategoryLimit
      ),

      loadExpensePaginatedCategories(
        expenseCategoryPage,
        expenseCategoryLimit
      ),
    ]);
  };






  const handleIncomeCategoryPageChange = (newPage) => {
    setIncomeCategoryPage(newPage);

    loadIncomePaginatedCategories(
      newPage,
      incomeCategoryLimit
    );
  };




  const handleExpenseCategoryPageChange = (newPage) => {
    setExpenseCategoryPage(newPage);

    loadExpensePaginatedCategories(
      newPage,
      expenseCategoryLimit
    );
  };









  // =========================================
  // CATEGORY FORM
  // =========================================

  const handleCategoryChange = (e) => {
    const { name, value } = e.target;

    setCategoryForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  // =========================================
  // OPEN CATEGORY MODAL
  // =========================================

  const openCategoryModal = () => {
    setEditingCategoryId(null);

    setCategoryForm({
      name: "",
      type: "INCOME",
      status: "ACTIVE",
    });

    setMessage("");
    setShowCategoryModal(true);
  };


  // =========================================
  // CLOSE CATEGORY MODAL
  // =========================================

  const closeCategoryModal = () => {
    if (!savingCategory) {
      setShowCategoryModal(false);
      setEditingCategoryId(null);
    }
  };


  // =========================================
  // CREATE / UPDATE CATEGORY
  // =========================================

  const handleSaveCategory = async (e) => {
    e.preventDefault();

    if (!categoryForm.name.trim()) {
      setMessage(
        "❌ Category name দেওয়া বাধ্যতামূলক!"
      );
      return;
    }

    try {
      setSavingCategory(true);
      setMessage("");

      const payload = {
        name: categoryForm.name.trim(),
        type: categoryForm.type,
        status: categoryForm.status,
      };

      let response;

      if (editingCategoryId) {
        response = await axios.put(
          `${API_URL}/api/categories/${editingCategoryId}`,
          payload
        );
      } else {
        response = await axios.post(
          `${API_URL}/api/categories`,
          payload
        );
      }

      if (response.data.success) {
        await loadCategories();

        setShowCategoryModal(false);
        setEditingCategoryId(null);

        setCategoryForm({
          name: "",
          type: "INCOME",
          status: "ACTIVE",
        });

        setMessage(
          editingCategoryId
            ? "✅ Category successfully updated!"
            : "✅ Category successfully added!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Save Category Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Category save করা যায়নি!"
        }`
      );
    } finally {
      setSavingCategory(false);
    }
  };


  // =========================================
  // EDIT CATEGORY
  // =========================================

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);

    setCategoryForm({
      name: category.name || "",
      type: category.type || "INCOME",
      status: category.status || "ACTIVE",
    });

    setMessage("");
    setShowCategoryModal(true);
  };


  // =========================================
  // DELETE CATEGORY
  // =========================================

  const handleDeleteCategory = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this category?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/api/categories/${id}`
      );

      if (response.data.success) {
        await loadCategories();

        setMessage(
          "✅ Category successfully deleted!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Delete Category Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Category delete করা যায়নি!"
        }`
      );
    }
  };




  const loadWorkers = async (
    page = workerPage,
    limit = workerLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/workers`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (response.data.success) {
        setWorkers(response.data.data);

        setWorkerPagination(
          response.data.pagination
        );
      }
    } catch (error) {
      console.error(
        "Load Workers Error:",
        error
      );

      setMessage(
        "❌ Worker data load করা যায়নি!"
      );
    }
  };


  const handleWorkerPageChange = (newPage) => {
    setWorkerPage(newPage);

    loadWorkers(
      newPage,
      workerLimit
    );
  };



  const loadMaterials = async (
    page = materialPage,
    limit = materialLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/materials`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (response.data.success) {

        setMaterials(
          response.data.data
        );

        setMaterialPagination(
          response.data.pagination
        );

      }

    } catch (error) {

      console.error(
        "Load Materials Error:",
        error
      );

      setMessage(
        "❌ Material data load করা যায়নি!"
      );
    }
  };



  const handleMaterialPageChange = (
    newPage
  ) => {

    setMaterialPage(newPage);

    loadMaterials(
      newPage,
      materialLimit
    );
  };


  const handleDeleteMaterial = async (id, materialName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${materialName}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/materials/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete material");
      }

      setMessage("Material deleted successfully!");

      await loadMaterials(materialPage, materialLimit);
    } catch (error) {
      console.error("Delete material error:", error);
      alert(error.message || "Failed to delete material");
    }
  };

  // =========================================
  // MATERIAL MODAL FUNCTIONS
  // =========================================

  // OPEN MATERIAL MODAL
  const openMaterialModal = () => {
    setEditingMaterialId(null);
    setMaterialFormError("");

    setMaterialForm({
      code: "",
      name: "",
      categoryId: "",
      subCategory: "",
      brand: "",
      modelCode: "",
      specification: "",
      color: "",
      size: "",
      unit: "",
      description: "",
    });

    setShowMaterialModal(true);
  };


  const openMaterialCategoryModal = () => {
    setEditingMaterialCategory(null);

    setMaterialCategoryForm({
      name: "",
      description: "",
      status: "ACTIVE",
    });

    setShowMaterialCategoryModal(true);
  };
  const handleEditMaterialCategory = (category) => {
    setEditingMaterialCategory(category);

    setMaterialCategoryForm({
      name: category.name || "",
      description: category.description || "",
      status: category.status || "ACTIVE",
    });

    setShowMaterialCategoryModal(true);
  };



  const saveMaterialCategory = async () => {
    try {
      const name = materialCategoryForm.name.trim();

      if (!name) {
        setMessage("❌ Material category name is required");
        return;
      }

      const payload = {
        name,
        description:
          materialCategoryForm.description.trim() || null,
        status:
          materialCategoryForm.status || "ACTIVE",
      };

      let response;

      if (editingMaterialCategory) {
        // UPDATE
        response = await axios.put(
          `${API_URL}/api/material-categories/${editingMaterialCategory.id}`,
          payload
        );
      } else {
        // CREATE
        response = await axios.post(
          `${API_URL}/api/material-categories`,
          payload
        );
      }

      if (response.data.success) {
        setMessage(
          editingMaterialCategory
            ? "✅ Material category updated successfully"
            : "✅ Material category created successfully"
        );

        setMaterialCategoryForm({
          name: "",
          description: "",
          status: "ACTIVE",
        });

        setEditingMaterialCategory(null);
        setShowMaterialCategoryModal(false);

        await loadMaterialCategories();
      }
    } catch (error) {
      console.error(
        "Save Material Category Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Material category save করা যায়নি!"
        }`
      );
    }
  };


  const openEditMaterial = (material) => {
    setEditingMaterialId(material.id);

    setMaterialForm({
      code: material.code || "",
      name: material.name || "",
      categoryId: material.categoryId
        ? String(material.categoryId)
        : "",
      subCategory: material.subCategory || "",
      brand: material.brand || "",
      modelCode: material.modelCode || "",
      specification: material.specification || "",
      color: material.color || "",
      size: material.size || "",
      unit: material.unit || "",
      description: material.description || "",
    });

    setShowMaterialModal(true);
  };

  // =========================================
  // VIEW MATERIAL DETAILS
  // =========================================

  const openMaterialDetails = async (material) => {
    try {
      // First show the material details
      setSelectedMaterial(material);
      setShowMaterialDetailsModal(true);

      // Load stock summary
      const response = await axios.get(
        `${API_URL}/api/materials/${material.id}/stock`
      );

      if (response.data.success) {
        const stockData = response.data.data;

        setSelectedMaterial((previous) => ({
          ...previous,
          currentStock: stockData.currentStock,
          totalStockIn: stockData.totalStockIn,
          totalStockOut: stockData.totalStockOut,
          movementCount: stockData.movementCount,
          movements: stockData.movements || [],
        }));
      }
    } catch (error) {
      console.error(
        "Failed to load material stock:",
        error
      );
    }
  };


  const openStockUsageModal = (material) => {
    setStockUsageMaterial(material);

    setStockUsageForm({
      quantity: "",
      projectId: "",
      notes: "",
    });

    setShowStockUsageModal(true);
  };

  const closeStockUsageModal = () => {
    setShowStockUsageModal(false);
    setStockUsageMaterial(null);

    setStockUsageForm({
      quantity: "",
      projectId: "",
      notes: "",
    });
  };

const openStockReturnModal = (material) => {
  setStockReturnMaterial(material);

  setStockReturnForm({
    quantity: "",
    notes: "",
  });

  setShowStockReturnModal(true);
};

const closeStockReturnModal = () => {
  setShowStockReturnModal(false);

  setStockReturnMaterial(null);

  setStockReturnForm({
    quantity: "",
    notes: "",
  });
};
const openStockDamageModal = (material) => {
  setStockDamageMaterial(material);

  setStockDamageForm({
    quantity: "",
    notes: "",
  });

  setShowStockDamageModal(true);
};

const closeStockDamageModal = () => {
  setShowStockDamageModal(false);

  setStockDamageMaterial(null);

  setStockDamageForm({
    quantity: "",
    notes: "",
  });
};

const openStockAdjustmentModal = (material) => {
  setStockAdjustmentMaterial(material);

  setStockAdjustmentForm({
    type: "INCREASE",
    quantity: "",
    notes: "",
  });

  setShowStockAdjustmentModal(true);
};

const closeStockAdjustmentModal = () => {
  setShowStockAdjustmentModal(false);

  setStockAdjustmentMaterial(null);

  setStockAdjustmentForm({
    type: "INCREASE",
    quantity: "",
    notes: "",
  });
};







  const handleStockUsageSubmit = async (e) => {
    e.preventDefault();

    if (!stockUsageMaterial) {
      return;
    }

    const quantity = Number(
      stockUsageForm.quantity
    );

    if (!quantity || quantity <= 0) {
      alert("Quantity must be greater than 0.");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/stock-movements/usage`,
        {
          materialId: stockUsageMaterial.id,
          quantity,
          unit: stockUsageMaterial.unit,
          projectId:
            stockUsageForm.projectId
              ? Number(stockUsageForm.projectId)
              : null,
          notes:
            stockUsageForm.notes?.trim() || null,
        }
      );

      if (response.data.success) {
        alert(
          "Stock usage recorded successfully."
        );

        closeStockUsageModal();

        await loadMaterials();
      } else {
        alert(
          response.data.message ||
          "Failed to record stock usage."
        );
      }
    } catch (error) {
      console.error(
        "Stock usage error:",
        error
      );

      alert(
        error.response?.data?.message ||
        "Failed to record stock usage."
      );
    }
  };


const handleStockReturnSubmit = async (e) => {
  e.preventDefault();

  if (!stockReturnMaterial) return;

  const quantity = Number(
    stockReturnForm.quantity
  );

  if (!quantity || quantity <= 0) {
    setMessage(
      "❌ Return quantity must be greater than 0"
    );
    return;
  }

  try {
    const response = await axios.post(
      `${API_URL}/api/stock-movements/return`,
      {
        materialId: stockReturnMaterial.id,
        quantity,
        unit: stockReturnMaterial.unit,
        notes:
          stockReturnForm.notes?.trim() || null,
      }
    );

    if (response.data.success) {
      setMessage(
        "✅ Stock return recorded successfully!"
      );

      closeStockReturnModal();

      await loadMaterials(
        materialPage,
        materialLimit
      );
    }
  } catch (error) {
    console.error(
      "Stock Return Error:",
      error
    );

    setMessage(
      `❌ ${
        error.response?.data?.message ||
        "Stock return failed"
      }`
    );
  }

  setTimeout(() => {
    setMessage("");
  }, 3000);
};


const handleStockDamageSubmit = async (e) => {
  e.preventDefault();

  if (!stockDamageMaterial) return;

  const quantity = Number(
    stockDamageForm.quantity
  );

  if (!quantity || quantity <= 0) {
    setMessage(
      "❌ Damage quantity must be greater than 0"
    );
    return;
  }

  const currentStock = Number(
    stockDamageMaterial.currentStock || 0
  );

  if (quantity > currentStock) {
    setMessage(
      `❌ Insufficient stock. Available stock: ${currentStock}`
    );
    return;
  }

  try {
    const response = await axios.post(
      `${API_URL}/api/stock-movements/damage`,
      {
        materialId: stockDamageMaterial.id,
        quantity,
        unit: stockDamageMaterial.unit,
        notes:
          stockDamageForm.notes?.trim() || null,
      }
    );

    if (response.data.success) {
      setMessage(
        "✅ Stock damage recorded successfully!"
      );

      closeStockDamageModal();

      await loadMaterials(
        materialPage,
        materialLimit
      );
    }
  } catch (error) {
    console.error(
      "Stock Damage Error:",
      error
    );

    setMessage(
      `❌ ${
        error.response?.data?.message ||
        "Stock damage failed"
      }`
    );
  }

  setTimeout(() => {
    setMessage("");
  }, 3000);
};

const handleStockAdjustmentSubmit = async (e) => {
  e.preventDefault();

  if (!stockAdjustmentMaterial) return;

  const quantity = Number(
    stockAdjustmentForm.quantity
  );

  if (!quantity || quantity <= 0) {
    setMessage(
      "❌ Adjustment quantity must be greater than 0"
    );
    return;
  }

  const isIncrease =
    stockAdjustmentForm.type === "INCREASE";

  const adjustedQuantity = isIncrease
    ? quantity
    : -quantity;

  const currentStock = Number(
    stockAdjustmentMaterial.currentStock || 0
  );

  if (
    !isIncrease &&
    quantity > currentStock
  ) {
    setMessage(
      `❌ Insufficient stock. Available stock: ${currentStock}`
    );
    return;
  }

  try {
    const response = await axios.post(
      `${API_URL}/api/stock-movements/adjustment`,
      {
        materialId:
          stockAdjustmentMaterial.id,

        quantity: adjustedQuantity,

        unit:
          stockAdjustmentMaterial.unit,

        notes:
          stockAdjustmentForm.notes?.trim() ||
          null,
      }
    );

    if (response.data.success) {
      setMessage(
        isIncrease
          ? "✅ Stock increased successfully!"
          : "✅ Stock decreased successfully!"
      );

      closeStockAdjustmentModal();

      await loadMaterials(
        materialPage,
        materialLimit
      );
    }
  } catch (error) {
    console.error(
      "Stock Adjustment Error:",
      error
    );

    setMessage(
      `❌ ${
        error.response?.data?.message ||
        "Stock adjustment failed"
      }`
    );
  }

  setTimeout(() => {
    setMessage("");
  }, 3000);
};


  const closeMaterialDetails = () => {
    setShowMaterialDetailsModal(false);
    setSelectedMaterial(null);
  };



  const handleDeleteMaterialCategory = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this material category?"
    );

    if (!confirmed) return;

    try {
      const response = await axios.delete(
        `${API_URL}/api/material-categories/${id}`
      );

      if (response.data.success) {
        setMessage(
          "✅ Material category deleted successfully"
        );

        await loadMaterialCategories();
      }
    } catch (error) {
      console.error(
        "Delete Material Category Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Material category delete করা যায়নি!"
        }`
      );
    }
  };


  const openMaterialPrices = async (material) => {
    setSelectedMaterial(material);

    setMaterialPrices([]);

    setMaterialPriceSummary({
      lowestPrice: 0,
      highestPrice: 0,
      averagePrice: 0,
      bestVendor: null,
    });

    setShowMaterialPriceModal(true);

    await loadMaterialPrices(
      material.id
    );
  };


  const loadMaterialPrices = async (materialId) => {
    if (!materialId) {
      return;
    }

    setLoadingMaterialPrices(true);

    try {
      const response = await axios.get(
        `${API_URL}/api/materials/${materialId}/prices`
      );

      if (response.data.success) {
        setMaterialPrices(
          response.data.data || []
        );

        setMaterialPriceSummary(
          response.data.summary || {
            lowestPrice: 0,
            highestPrice: 0,
            averagePrice: 0,
            bestVendor: null,
          }
        );
      }

    } catch (error) {

      console.error(
        "Load Material Prices Error:",
        error
      );

      setMaterialPrices([]);

      setMaterialPriceSummary({
        lowestPrice: 0,
        highestPrice: 0,
        averagePrice: 0,
        bestVendor: null,
      });

      setMessage(
        "❌ Material price load করা যায়নি!"
      );

    } finally {

      setLoadingMaterialPrices(false);

    }
  };


  const saveMaterialPrice = async () => {
    if (!selectedMaterial) {
      return;
    }

setMaterialPriceFormMessage("");

    try {
      if (!materialPriceForm.vendorId) {
        setMaterialPriceFormMessage("❌ Vendor নির্বাচন করুন");
        return;
      }

      if (
        !materialPriceForm.price ||
        Number(materialPriceForm.price) <= 0
      ) {
        setMaterialPriceFormMessage(
          "❌ Unit Price 0-এর বেশি হতে হবে"
        );
        return;
      }

      const payload = {
        vendorId: Number(
          materialPriceForm.vendorId
        ),

        unitPrice: Number(
          materialPriceForm.price
        ),

        unit: selectedMaterial.unit,

        minimumQty:
          materialPriceForm.minimumQuantity
            ? Number(
              materialPriceForm.minimumQuantity
            )
            : null,

        leadTimeDays:
          materialPriceForm.leadTime
            ? Number(
              materialPriceForm.leadTime
            )
            : null,

        notes:
          materialPriceForm.notes.trim() || null,
      };

      let response;

      if (editingMaterialPriceId) {

        // UPDATE
        response = await axios.put(
          `${API_URL}/api/material-prices/${editingMaterialPriceId}`,
          payload
        );

      } else {

        // CREATE
        response = await axios.post(
          `${API_URL}/api/materials/${selectedMaterial.id}/prices`,
          payload
        );

      }

      if (response.data.success) {

        setMaterialPriceFormMessage(
          editingMaterialPriceId
            ? "✅ Vendor price updated successfully"
            : "✅ Vendor price added successfully"
        );

        setMaterialPriceForm({
          vendorId: "",
          price: "",
          minimumQuantity: "",
          leadTime: "",
          notes: "",
        });

        setEditingMaterialPriceId(null);

        await loadMaterialPrices(
          selectedMaterial.id
        );
      }

    } catch (error) {

      console.error(
        "Save Material Price Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Vendor price save করা যায়নি!"
        }`
      );
    }
  };

  const openEditMaterialPrice = (price) => {
    setEditingMaterialPriceId(price.id);

    setMaterialPriceForm({
      vendorId: price.vendorId
        ? String(price.vendorId)
        : "",

      price:
        price.unitPrice !== null &&
          price.unitPrice !== undefined
          ? String(price.unitPrice)
          : "",

      minimumQuantity:
        price.minimumQty !== null &&
          price.minimumQty !== undefined
          ? String(price.minimumQty)
          : "",

      leadTime:
        price.leadTimeDays !== null &&
          price.leadTimeDays !== undefined
          ? String(price.leadTimeDays)
          : "",

      notes: price.notes || "",
    });
  };

  const handleDeleteMaterialPrice = async (
    price
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this price from "${price.vendor?.name || "this vendor"}"?`
    );

    if (!confirmed) {
      return;
    }

    try {

      const response = await axios.delete(
        `${API_URL}/api/material-prices/${price.id}`
      );

      if (response.data.success) {

        setMaterialPriceFormMessage(
          "✅ Vendor price deleted successfully"
        );

        await loadMaterialPrices(
          selectedMaterial.id
        );
      }

    } catch (error) {

      console.error(
        "Delete Material Price Error:",
        error
      );

      setMaterialPriceFormMessage(
        `❌ ${error.response?.data?.message ||
        "Vendor price delete করা যায়নি!"
        }`
      );
    }
  };




  // CLOSE MATERIAL MODAL
  const closeMaterialModal = () => {
    if (savingMaterial) {
      return;
    }

    setShowMaterialModal(false);
    setEditingMaterialId(null);
  };


  // HANDLE MATERIAL FORM CHANGE
  const handleMaterialChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setMaterialForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  // SAVE MATERIAL
  const saveMaterial = async (e) => {
    e.preventDefault();

    setMaterialFormError("");

    if (savingMaterial) {
      return;
    }

    setSavingMaterial(true);

    try {
      const payload = {
        code: materialForm.code.trim(),
        name: materialForm.name.trim(),
        categoryId:
          materialForm.categoryId
            ? Number(materialForm.categoryId)
            : null,

        subCategory:
          materialForm.subCategory.trim(),

        brand:
          materialForm.brand.trim(),

        modelCode:
          materialForm.modelCode.trim(),

        specification:
          materialForm.specification.trim(),

        color:
          materialForm.color.trim(),

        size:
          materialForm.size.trim(),

        unit:
          materialForm.unit.trim(),

        description:
          materialForm.description.trim(),
      };

      const response =
        editingMaterialId
          ? await axios.put(
            `${API_URL}/api/materials/${editingMaterialId}`,
            payload
          )
          : await axios.post(
            `${API_URL}/api/materials`,
            payload
          );

      if (response.data.success) {

        setMessage(
          editingMaterialId
            ? "✅ Material updated successfully"
            : "✅ Material created successfully"
        );

        closeMaterialModal();

        await loadMaterials(
          materialPage,
          materialLimit
        );

      }

    } catch (error) {
        console.error(
          "Save Material Error:",
          error
        );

        setMaterialFormError(
          error.response?.data?.message ||
          "Material save করা যায়নি!"
        );

      } finally {
        setSavingMaterial(false);
      }
  };







  const loadVendors = async (
    page = vendorPage,
    limit = vendorLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/vendors`,
        {
          params: {
            page,
            limit,
          },
        }
      );

      if (response.data.success) {
        setVendors(response.data.data);

        setVendorPagination(
          response.data.pagination
        );
      }
    } catch (error) {
      console.error(
        "Load Vendors Error:",
        error
      );

      setMessage(
        "❌ Vendor data load করা যায়নি!"
      );
    }
  };

  const handleVendorPageChange = (newPage) => {
    setVendorPage(newPage);

    loadVendors(
      newPage,
      vendorLimit
    );
  };


  const loadTransactions = async (
    page = transactionPage,
    limit = transactionLimit
  ) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/transactions`,
        {
          params: {
            page,
            limit,

            search: transactionSearch,
            type: transactionTypeFilter,
            projectId: transactionProjectFilter,
            categoryId: transactionCategoryFilter,
          },
        }
      );

      if (response.data.success) {
        setTransactions(
          response.data.data
        );

        setTransactionPagination(
          response.data.pagination
        );

        setTransactionSummary(
          response.data.summary
        );
      }
    } catch (error) {
      console.error(
        "Load Transactions Error:",
        error
      );

      setMessage(
        "❌ Transaction data load করা যায়নি!"
      );
    }
  };



  // =========================================
  // TRANSACTION PAGE CHANGE 
  // =========================================

  const handleTransactionPageChange = (
    newPage
  ) => {
    setTransactionPage(newPage);

    loadTransactions(
      newPage,
      transactionLimit
    );
  };


  // =========================================
  // TRANSACTION FORM
  // =========================================

  const handleTransactionChange = (e) => {
    const { name, value } = e.target;

    setTransactionForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  // =========================================
  // CLOSE TRANSACTION MODAL
  // =========================================

  const closeTransactionModal = () => {
    if (!savingTransaction) {
      setShowTransactionModal(false);
      setEditingTransactionId(null);
    }
  };


  // =========================================
  // EDIT TRANSACTION
  // =========================================

  const handleEditTransaction = (item) => {
    setEditingTransactionId(item.id);

    setTransactionForm({
      transactionDate: new Date(
        item.transactionDate
      )
        .toISOString()
        .split("T")[0],

      type:
        item.type || "INCOME",

      amount:
        item.amount
          ? Number(item.amount)
          : "",

      paymentMethod:
        item.paymentMethod || "CASH",

      description:
        item.description || "",

      notes:
        item.notes || "",

      projectId:
        item.projectId
          ? String(item.projectId)
          : "",

      categoryId:
        item.categoryId
          ? String(item.categoryId)
          : "",

      workerId:
        item.workerId
          ? String(item.workerId)
          : "",

      vendorId:
        item.vendorId
          ? String(item.vendorId)
          : "",
    });

    setMessage("");
    setShowTransactionModal(true);
  };

  const openTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetailsModal(true);
  };

  const closeTransactionDetails = () => {
    setShowTransactionDetailsModal(false);
    setSelectedTransaction(null);
  };
  // =========================================
  // UPDATE TRANSACTION
  // =========================================

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();

    if (!editingTransactionId) {
      return;
    }

    if (!transactionForm.transactionDate) {
      setMessage(
        "❌ Transaction date দেওয়া বাধ্যতামূলক!"
      );
      return;
    }

    if (
      !transactionForm.amount ||
      Number(transactionForm.amount) <= 0
    ) {
      setMessage(
        "❌ সঠিক amount দিন!"
      );
      return;
    }

    try {
      setSavingTransaction(true);
      setMessage("");

      const payload = {
        transactionDate:
          transactionForm.transactionDate,

        type:
          transactionForm.type,

        amount:
          Number(transactionForm.amount),

        paymentMethod:
          transactionForm.paymentMethod,

        description:
          transactionForm.description.trim(),

        notes:
          transactionForm.notes.trim(),

        projectId:
          transactionForm.projectId
            ? Number(transactionForm.projectId)
            : null,

        categoryId:
          transactionForm.categoryId
            ? Number(transactionForm.categoryId)
            : null,

        workerId:
          transactionForm.workerId
            ? Number(transactionForm.workerId)
            : null,

        vendorId:
          transactionForm.vendorId
            ? Number(transactionForm.vendorId)
            : null,
      };

      const response = await axios.put(
        `${API_URL}/api/transactions/${editingTransactionId}`,
        payload
      );

      if (response.data.success) {
        await Promise.all([
          loadTransactions(),
          loadIncome(),
          loadExpenses(),
          loadDashboard(),
        ]);

        setShowTransactionModal(false);
        setEditingTransactionId(null);

        setMessage(
          "✅ Transaction successfully updated!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Update Transaction Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Transaction update করা যায়নি!"
        }`
      );
    } finally {
      setSavingTransaction(false);
    }
  };


  // =========================================
  // DELETE TRANSACTION
  // =========================================

  const handleDeleteTransaction = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/api/transactions/${id}`
      );

      if (response.data.success) {
        await Promise.all([
          loadTransactions(),
          loadIncome(),
          loadExpenses(),
          loadDashboard(),
        ]);

        setMessage(
          "✅ Transaction successfully deleted!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Delete Transaction Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Transaction delete করা যায়নি!"
        }`
      );
    }
  };




  // =========================================
  // LOAD WHEN APP STARTS
  // =========================================

  useEffect(() => {
    loadAllData();
  }, []);


  useEffect(() => {
    if (activePage === "categories") {
      setMaterialCategoryPage(1);

      loadMaterialCategories(
        1,
        materialCategoryLimit
      );
    }
  }, [
    activePage,
    materialCategoryLimit,
  ]);

  // =========================================
  // REFRESH
  // =========================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await loadAllData();

      setMessage("✅ Data refreshed successfully!");

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } finally {
      setRefreshing(false);
    }
  };
  // =========================================
  // FORM CHANGE
  // =========================================

  const handleProjectChange = (e) => {
    const { name, value } = e.target;

    setProjectForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================
  // OPEN PROJECT MODAL
  // =========================================

  const openProjectModal = () => {
    setEditingProjectId(null);

    setProjectForm({
      name: "",
      contractValue: "",
      status: "ONGOING",
      notes: "",
    });

    setMessage("");
    setShowProjectModal(true);
  };

  // =========================================
  // CLOSE PROJECT MODAL
  // =========================================

  const closeProjectModal = () => {
    if (!savingProject) {
      setShowProjectModal(false);
      setEditingProjectId(null);
    }
  };


  // =========================================
  // CREATE / UPDATE PROJECT
  // =========================================

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!projectForm.name.trim()) {
      setMessage(
        "❌ Project name দেওয়া বাধ্যতামূলক!"
      );
      return;
    }

    try {
      setSavingProject(true);
      setMessage("");

      const payload = {
        name: projectForm.name.trim(),
        contractValue:
          projectForm.contractValue || 0,
        status: projectForm.status,
        notes: projectForm.notes.trim(),
      };

      let response;

      // EDIT
      if (editingProjectId) {
        response = await axios.put(
          `${API_URL}/api/projects/${editingProjectId}`,
          payload
        );
      }

      // ADD
      else {
        response = await axios.post(
          `${API_URL}/api/projects`,
          payload
        );
      }

      if (response.data.success) {
        await Promise.all([
          loadProjects(),
          loadDashboard(),
        ]);

        setShowProjectModal(false);
        setEditingProjectId(null);

        setProjectForm({
          name: "",
          contractValue: "",
          status: "ONGOING",
          notes: "",
        });

        setMessage(
          editingProjectId
            ? "✅ Project successfully updated!"
            : "✅ Project successfully added!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }

    } catch (error) {
      console.error(
        "Save Project Error:",
        error
      );

      const errorMessage =
        error.response?.data?.message ||
        "Project save করা যায়নি!";

      setMessage(`❌ ${errorMessage}`);

    } finally {
      setSavingProject(false);
    }
  };







// =========================================
  // View PROJECT
  // =========================================


const viewProject = async (id) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/projects/${id}`
    );

    if (response.data.success) {
      const project = response.data.data;

      setSelectedProject(project);
      setShowProjectViewModal(true);
    }
  } catch (error) {
    console.error(
      "View Project Error:",
      error
    );

    setMessage(
      `❌ ${
        error.response?.data?.message ||
        "Project details load করা যায়নি!"
      }`
    );
  }
};

  // =========================================
  // EDIT PROJECT
  // =========================================

  const handleEditProject = (project) => {
    setEditingProjectId(project.id);

    setProjectForm({
      name: project.name || "",
      contractValue: project.contractValue
        ? Number(project.contractValue)
        : "",
      status: project.status || "ONGOING",
      notes: project.notes || "",
    });

    setMessage("");
    setShowProjectModal(true);
  };

  // =========================================
  // DELETE PROJECT
  // =========================================

  const handleDeleteProject = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/api/projects/${id}`
      );

      if (response.data.success) {
        await Promise.all([
          loadProjects(),
          loadDashboard(),
        ]);

        setMessage(
          "✅ Project successfully deleted!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Delete Project Error:",
        error
      );

      const errorMessage =
        error.response?.data?.message ||
        "Project delete করা যায়নি!";

      setMessage(`❌ ${errorMessage}`);
    }
  };




  // =========================================
  // INCOME FORM CHANGE
  // =========================================

  const handleIncomeChange = (e) => {
    const { name, value } = e.target;

    setIncomeForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  // =========================================
  // OPEN INCOME MODAL
  // =========================================

  const openIncomeModal = () => {
    setIncomeForm({
      transactionDate: new Date()
        .toISOString()
        .split("T")[0],
      amount: "",
      paymentMethod: "CASH",
      description: "",
      notes: "",
      projectId: "",
      categoryId: "",
    });

    setMessage("");
    setShowIncomeModal(true);
  };


  // =========================================
  // CLOSE INCOME MODAL
  // =========================================

  const closeIncomeModal = () => {
    if (!savingIncome) {
      setShowIncomeModal(false);
    }
  };


  // =========================================
  // CREATE INCOME
  // =========================================

  const handleCreateIncome = async (e) => {
    e.preventDefault();

    if (!incomeForm.transactionDate) {
      setMessage(
        "❌ Income date দেওয়া বাধ্যতামূলক!"
      );
      return;
    }

    if (
      !incomeForm.amount ||
      Number(incomeForm.amount) <= 0
    ) {
      setMessage(
        "❌ সঠিক Income amount দিন!"
      );
      return;
    }

    try {
      setSavingIncome(true);
      setMessage("");

      const payload = {
        transactionDate:
          incomeForm.transactionDate,

        amount:
          Number(incomeForm.amount),

        paymentMethod:
          incomeForm.paymentMethod,

        description:
          incomeForm.description.trim(),

        notes:
          incomeForm.notes.trim(),

        projectId:
          incomeForm.projectId
            ? Number(incomeForm.projectId)
            : null,

        categoryId:
          incomeForm.categoryId
            ? Number(incomeForm.categoryId)
            : null,
      };

      let response;

      // EDIT
      if (editingIncomeId) {
        response = await axios.put(
          `${API_URL}/api/income/${editingIncomeId}`,
          payload
        );
      }

      // ADD
      else {
        response = await axios.post(
          `${API_URL}/api/income`,
          payload
        );
      }

      if (response.data.success) {
        await Promise.all([
          loadIncome(),
          loadDashboard(),
        ]);

        setShowIncomeModal(false);
        setEditingIncomeId(null);

        setIncomeForm({
          transactionDate: new Date()
            .toISOString()
            .split("T")[0],
          amount: "",
          paymentMethod: "CASH",
          description: "",
          notes: "",
          projectId: "",
          categoryId: "",
        });

       setIncomeMessage(
        editingIncomeId
          ? "✅ Income successfully updated!"
          : "✅ Income successfully added!"
      );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Save Income Error:",
        error
      );

      const errorMessage =
        error.response?.data?.message ||
        "Income save করা যায়নি!";

      setIncomeMessage(
        `❌ ${errorMessage}`
      );
      
    } finally {
      setSavingIncome(false);
    }
  };


  const handleEditIncome = (item) => {
    setEditingIncomeId(item.id);

    setIncomeForm({
      transactionDate: new Date(
        item.transactionDate
      )
        .toISOString()
        .split("T")[0],

      amount: item.amount
        ? Number(item.amount)
        : "",

      paymentMethod:
        item.paymentMethod || "CASH",

      description:
        item.description || "",

      notes:
        item.notes || "",

      projectId:
        item.projectId
          ? String(item.projectId)
          : "",

      categoryId:
        item.categoryId
          ? String(item.categoryId)
          : "",
    });

    setMessage("");
    setShowIncomeModal(true);
  };

  const openIncomeDetails = (income) => {
    setSelectedIncome(income);
    setShowIncomeDetailsModal(true);
  };

  const closeIncomeDetails = () => {
    setShowIncomeDetailsModal(false);
    setSelectedIncome(null);
  };



  const handleDeleteIncome = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this income transaction?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setMessage("");

      const response = await axios.delete(
        `${API_URL}/api/income/${id}`
      );

      if (response.data.success) {
        await Promise.all([
          loadIncome(),
          loadDashboard(),
        ]);

        setIncomeMessage(
          "✅ Income successfully deleted!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Delete Income Error:",
        error
      );

      const errorMessage =
        error.response?.data?.message ||
        "Income delete করা যায়নি!";

      setIncomeMessage(
        `❌ ${errorMessage}`
      );
    }
  };


  // =========================================
  // EXPENSE FORM CHANGE
  // =========================================

  const handleExpenseChange = (e) => {
    const { name, value } = e.target;

    setExpenseForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  // =========================================
  // OPEN EXPENSE MODAL
  // =========================================

  const openExpenseModal = () => {
    setEditingExpenseId(null);

    setExpenseForm({
      transactionDate: new Date()
        .toISOString()
        .split("T")[0],
      amount: "",
      paymentMethod: "CASH",
      description: "",
      notes: "",
      projectId: "",
      categoryId: "",
      workerId: "",
      vendorId: "",
    });

    setMessage("");
    setShowExpenseModal(true);
  };


  // =========================================
  // CLOSE EXPENSE MODAL
  // =========================================

  const closeExpenseModal = () => {
    if (!savingExpense) {
      setShowExpenseModal(false);
    }
  };


  // =========================================
  // CREATE / UPDATE EXPENSE
  // =========================================

  const handleCreateExpense = async (e) => {
    e.preventDefault();

    if (!expenseForm.transactionDate) {
      setMessage(
        "❌ Expense date দেওয়া বাধ্যতামূলক!"
      );
      return;
    }

    if (
      !expenseForm.amount ||
      Number(expenseForm.amount) <= 0
    ) {
      setMessage(
        "❌ সঠিক Expense amount দিন!"
      );
      return;
    }

    try {
      setSavingExpense(true);
      setMessage("");

      const payload = {
        transactionDate:
          expenseForm.transactionDate,

        amount:
          Number(expenseForm.amount),

        paymentMethod:
          expenseForm.paymentMethod,

        description:
          expenseForm.description.trim(),

        notes:
          expenseForm.notes.trim(),

        projectId:
          expenseForm.projectId
            ? Number(expenseForm.projectId)
            : null,

        categoryId:
          expenseForm.categoryId
            ? Number(expenseForm.categoryId)
            : null,

        workerId:
          expenseForm.workerId
            ? Number(expenseForm.workerId)
            : null,

        vendorId:
          expenseForm.vendorId
            ? Number(expenseForm.vendorId)
            : null,
      };

      let response;

      if (editingExpenseId) {
        response = await axios.put(
          `${API_URL}/api/expenses/${editingExpenseId}`,
          payload
        );
      } else {
        response = await axios.post(
          `${API_URL}/api/expenses`,
          payload
        );
      }

      if (response.data.success) {
        await Promise.all([
          loadExpenses(),
          loadDashboard(),
        ]);

        setShowExpenseModal(false);
        setEditingExpenseId(null);

        setMessage(
          editingExpenseId
            ? "✅ Expense successfully updated!"
            : "✅ Expense successfully added!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Save Expense Error:",
        error
      );

      const errorMessage =
        error.response?.data?.message ||
        "Expense save করা যায়নি!";

      setMessage(
        `❌ ${errorMessage}`
      );
    } finally {
      setSavingExpense(false);
    }
  };


  // =========================================
  // EDIT EXPENSE
  // =========================================


  const handleEditExpense = (item) => {
    setEditingExpenseId(item.id);

    setExpenseForm({
      transactionDate: new Date(
        item.transactionDate
      )
        .toISOString()
        .split("T")[0],

      amount: Number(item.amount),

      paymentMethod:
        item.paymentMethod || "CASH",

      description:
        item.description || "",

      notes:
        item.notes || "",

      projectId:
        item.projectId
          ? String(item.projectId)
          : "",

      categoryId:
        item.categoryId
          ? String(item.categoryId)
          : "",

      workerId:
        item.workerId
          ? String(item.workerId)
          : "",

      vendorId:
        item.vendorId
          ? String(item.vendorId)
          : "",
    });

    setMessage("");
    setShowExpenseModal(true);
  };
  // =========================================
  // VIEW EXPENSE DETAILS
  // =========================================

  const openExpenseDetails = (expense) => {
    setSelectedExpense(expense);
    setShowExpenseDetailsModal(true);
  };

  const closeExpenseDetails = () => {
    setShowExpenseDetailsModal(false);
    setSelectedExpense(null);
  };

  // =========================================
  // DELETE EXPENSE
  // =========================================

  const handleDeleteExpense = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense transaction?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/api/expenses/${id}`
      );

      if (response.data.success) {
        await Promise.all([
          loadExpenses(),
          loadDashboard(),
        ]);

        setMessage(
          "✅ Expense successfully deleted!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Delete Expense Error:",
        error
      );

      const errorMessage =
        error.response?.data?.message ||
        "Expense delete করা যায়নি!";

      setMessage(
        `❌ ${errorMessage}`
      );
    }
  };

  // =========================================
  // WORKER FORM
  // =========================================

  const handleWorkerChange = (e) => {
    const { name, value } = e.target;

    setWorkerForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const openWorkerModal = () => {
    setEditingWorkerId(null);

    setWorkerForm({
      name: "",
      phone: "",
      role: "",
    });

    setMessage("");
    setShowWorkerModal(true);
  };


  const closeWorkerModal = () => {
    if (!savingWorker) {
      setShowWorkerModal(false);
    }
  };


  const handleSaveWorker = async (e) => {
    e.preventDefault();

    if (!workerForm.name.trim()) {
      setMessage(
        "❌ Worker name দেওয়া বাধ্যতামূলক!"
      );
      return;
    }

    try {
      setSavingWorker(true);
      setMessage("");

      const payload = {
        name: workerForm.name.trim(),
        phone: workerForm.phone.trim(),
        role: workerForm.role.trim(),
      };

      let response;

      if (editingWorkerId) {
        response = await axios.put(
          `${API_URL}/api/workers/${editingWorkerId}`,
          payload
        );
      } else {
        response = await axios.post(
          `${API_URL}/api/workers`,
          payload
        );
      }

      if (response.data.success) {
        await loadWorkers();

        setShowWorkerModal(false);
        setEditingWorkerId(null);

        setWorkerForm({
          name: "",
          phone: "",
          role: "",
        });

        setMessage(
          editingWorkerId
            ? "✅ Worker successfully updated!"
            : "✅ Worker successfully added!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Save Worker Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Worker save করা যায়নি!"
        }`
      );
    } finally {
      setSavingWorker(false);
    }
  };


  const handleEditWorker = (worker) => {
    setEditingWorkerId(worker.id);

    setWorkerForm({
      name: worker.name || "",
      phone: worker.phone || "",
      role: worker.role || "",
    });

    setMessage("");
    setShowWorkerModal(true);
  };

  // =========================================
  // VIEW WORKER DETAILS
  // =========================================

  const openWorkerDetails = (worker) => {
    setSelectedWorker(worker);
    setShowWorkerDetailsModal(true);
  };

  const closeWorkerDetails = () => {
    setShowWorkerDetailsModal(false);
    setSelectedWorker(null);
  };

  const handleDeleteWorker = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this worker?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/api/workers/${id}`
      );

      if (response.data.success) {
        await loadWorkers();

        setMessage(
          "✅ Worker successfully deleted!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Delete Worker Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Worker delete করা যায়নি!"
        }`
      );
    }
  };


  // =========================================
  // VENDOR FORM
  // =========================================

  const handleVendorChange = (e) => {
    const { name, value } = e.target;

    setVendorForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const openVendorModal = () => {
    setEditingVendorId(null);

    setVendorForm({
      name: "",
      companyName: "",
      phone: "",
      address: "",
    });

    setMessage("");
    setShowVendorModal(true);
  };


  const closeVendorModal = () => {
    if (!savingVendor) {
      setShowVendorModal(false);
    }
  };


  const handleSaveVendor = async (e) => {
    e.preventDefault();

    if (!vendorForm.name.trim()) {
      setMessage(
        "❌ Vendor name দেওয়া বাধ্যতামূলক!"
      );
      return;
    }

    try {
      setSavingVendor(true);
      setMessage("");

      const payload = {
        name: vendorForm.name.trim(),
        companyName:
          vendorForm.companyName.trim(),
        phone:
          vendorForm.phone.trim(),
        address:
          vendorForm.address.trim(),
      };

      let response;

      if (editingVendorId) {
        response = await axios.put(
          `${API_URL}/api/vendors/${editingVendorId}`,
          payload
        );
      } else {
        response = await axios.post(
          `${API_URL}/api/vendors`,
          payload
        );
      }

      if (response.data.success) {
        await loadVendors();

        setShowVendorModal(false);
        setEditingVendorId(null);

        setVendorForm({
          name: "",
          companyName: "",
          phone: "",
          address: "",
        });

        setMessage(
          editingVendorId
            ? "✅ Vendor successfully updated!"
            : "✅ Vendor successfully added!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Save Vendor Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Vendor save করা যায়নি!"
        }`
      );
    } finally {
      setSavingVendor(false);
    }
  };


  const handleEditVendor = (vendor) => {
    setEditingVendorId(vendor.id);

    setVendorForm({
      name: vendor.name || "",
      companyName:
        vendor.companyName || "",
      phone: vendor.phone || "",
      address:
        vendor.address || "",
    });

    setMessage("");
    setShowVendorModal(true);
  };

  // =========================================
  // VIEW VENDOR DETAILS
  // =========================================

  const openVendorDetails = (vendor) => {
    setSelectedVendor(vendor);
    setShowVendorDetailsModal(true);
  };

  const closeVendorDetails = () => {
    setShowVendorDetailsModal(false);
    setSelectedVendor(null);
  };


  const handleDeleteVendor = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this vendor?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/api/vendors/${id}`
      );

      if (response.data.success) {
        await loadVendors();

        setMessage(
          "✅ Vendor successfully deleted!"
        );

        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      console.error(
        "Delete Vendor Error:",
        error
      );

      setMessage(
        `❌ ${error.response?.data?.message ||
        "Vendor delete করা যায়নি!"
        }`
      );
    }
  };







  // =========================================
  // FORMAT MONEY
  // =========================================

  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

























  // =========================================
  // STATUS CLASS
  // =========================================

  const getStatusClass = (status) => {
    if (status === "COMPLETED") {
      return "status completed";
    }

    if (status === "ON_HOLD") {
      return "status on-hold";
    }

    return "status ongoing";
  };





  // =========================================
  // RENDER PROJECTS
  // =========================================

  const renderProjects = () => {
    return (
      <section className="dashboard">

        {message && (
          <div
            className={`message-box ${message.includes("❌")
                ? "message-error"
                : "message-success"
              }`}
          >
            {message}
          </div>
        )}

        <div className="content-card">

          <div className="card-header">

            <div>
              <h2>Projects</h2>

              <p>
                Manage all BE Interior projects
              </p>
            </div>

            <div className="header-actions">



              <RefreshButton
                onRefresh={loadProjects}
              />

              <button
                className="add-button"
                onClick={openProjectModal}
              >
                <Plus size={18} />
                Add Project
              </button>

            </div>

          </div>


          <div className="project-page-size">

            <label>
              Show:
            </label>

            <select
              value={projectLimit}
              onChange={(e) => {
                const newLimit =
                  Number(e.target.value);

                setProjectLimit(newLimit);
                setProjectPage(1);

                loadProjects(
                  1,
                  newLimit
                );
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>
              projects per page
            </span>

          </div>


          {projects.length === 0 ? (

            <div className="empty-state">

              <FolderKanban size={50} />

              <h3>No Projects Found</h3>

              <p>
                Your project list is currently empty.
              </p>

              <button
                className="empty-add-button"
                onClick={openProjectModal}
              >
                <Plus size={18} />
                Add Your First Project
              </button>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Project Name</th>
                    <th>Contract Value</th>
                    <th>Status</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {projects.map((project) => (

                    <tr key={project.id}>

                      <td>
                        #{project.id}
                      </td>

                      <td>
                        <strong>
                          {project.name}
                        </strong>

                        {project.notes && (
                          <small className="project-notes">
                            {project.notes}
                          </small>
                        )}
                      </td>

                      <td className="money">
                        ৳{" "}
                        {formatMoney(
                          project.contractValue
                        )}
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            project.status
                          )}
                        >
                          {project.status === "ON_HOLD"
                            ? "ON HOLD"
                            : project.status}
                        </span>
                      </td>

                      <td>
                        {new Date(
                          project.createdAt
                        ).toLocaleDateString(
                          "en-GB"
                        )}
                      </td>

                      <td>
                        <div className="income-actions">

                        <button
                            type="button"
                            className="view-button"
                            onClick={() => {
                              viewProject(project.id);
                            }}
                          >
                            View
                        </button>



                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              handleEditProject(project)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-income-button"
                            onClick={() =>
                              handleDeleteProject(project.id)
                            }
                          >
                            Delete
                          </button>

                        </div>
                      </td>




                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}


          <div className="project-pagination">

            <div className="pagination-info">
              Showing{" "}
              {projectPagination.totalProjects === 0
                ? 0
                : (projectPagination.page - 1) *
                projectPagination.limit +
                1}
              {" - "}
              {Math.min(
                projectPagination.page *
                projectPagination.limit,
                projectPagination.totalProjects
              )}
              {" of "}
              {projectPagination.totalProjects}
              {" projects"}
            </div>

            <div className="pagination-buttons">

              <button
                type="button"
                disabled={
                  projectPagination.page <= 1
                }
                onClick={() =>
                  handleProjectPageChange(
                    projectPagination.page - 1
                  )
                }
              >
                Previous
              </button>

              <span className="pagination-current">
                Page {projectPagination.page} of{" "}
                {projectPagination.totalPages}
              </span>

              <button
                type="button"
                disabled={
                  projectPagination.page >=
                  projectPagination.totalPages
                }
                onClick={() =>
                  handleProjectPageChange(
                    projectPagination.page + 1
                  )
                }
              >
                Next
              </button>

            </div>

          </div>



        </div>

      </section>
    );
  };

const renderProjectViewModal = () => {
  if (
    !showProjectViewModal ||
    !selectedProject
  ) {
    return null;
  }

  const project = selectedProject;
  const summary = project.summary || {};

  return (
    <div
      className="modal-overlay"
      onClick={() =>
        setShowProjectViewModal(false)
      }
    >
      <div
        className="modal-container project-view-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* =========================================
            HEADER
        ========================================= */}
        <div className="modal-header">
          <div>
            <h2>{project.name}</h2>

            <p>
              Project Overview & Financial Summary
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={() =>
              setShowProjectViewModal(false)
            }
          >
            ×
          </button>
        </div>


        {/* =========================================
            BODY
        ========================================= */}
        <div className="modal-body">


          {/* =======================================
              BASIC INFORMATION
          ======================================= */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>Project Information</h3>

                <p>
                  Basic information about this project
                </p>
              </div>
            </div>


            <div className="project-info-grid">

              <div className="project-info-card">
                <span>Project ID</span>

                <strong>
                  #{project.id}
                </strong>
              </div>


              <div className="project-info-card">
                <span>Project Name</span>

                <strong>
                  {project.name || "-"}
                </strong>
              </div>


              <div className="project-info-card">
                <span>Contract Value</span>

                <strong>
                  ৳{" "}
                  {Number(
                    project.contractValue || 0
                  ).toLocaleString("en-BD")}
                </strong>
              </div>


              <div className="project-info-card">
                <span>Status</span>

                <strong>
                  {project.status || "-"}
                </strong>
              </div>


              <div className="project-info-card">
                <span>Created Date</span>

                <strong>
                  {project.createdAt
                    ? new Date(
                        project.createdAt
                      ).toLocaleDateString(
                        "en-GB"
                      )
                    : "-"}
                </strong>
              </div>


              <div className="project-info-card">
                <span>Updated Date</span>

                <strong>
                  {project.updatedAt
                    ? new Date(
                        project.updatedAt
                      ).toLocaleDateString(
                        "en-GB"
                      )
                    : "-"}
                </strong>
              </div>

            </div>

          </div>


          {/* =======================================
              FINANCIAL SUMMARY
          ======================================= */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>Financial Summary</h3>

                <p>
                  Project-wise financial position
                </p>
              </div>
            </div>


            <div className="project-summary-grid">

              <div className="project-summary-card income">
                <span>Total Income</span>

                <strong>
                  ৳{" "}
                  {Number(
                    summary.totalIncome || 0
                  ).toLocaleString(
                    "en-BD"
                  )}
                </strong>
              </div>


              <div className="project-summary-card expense">
                <span>Total Expenses</span>

                <strong>
                  ৳{" "}
                  {Number(
                    summary.totalExpenses || 0
                  ).toLocaleString(
                    "en-BD"
                  )}
                </strong>
              </div>


              <div className="project-summary-card balance">
                <span>Balance</span>

                <strong>
                  ৳{" "}
                  {Number(
                    summary.balance || 0
                  ).toLocaleString(
                    "en-BD"
                  )}
                </strong>
              </div>

            </div>

          </div>


          {/* =======================================
              ACTIVITY SUMMARY
          ======================================= */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>Project Activity</h3>

                <p>
                  Procurement and project activity summary
                </p>
              </div>
            </div>


            <div className="project-activity-grid">

              <div className="project-activity-card">
                <span>BOQs</span>

                <strong>
                  {summary.totalBOQs || 0}
                </strong>
              </div>


              <div className="project-activity-card">
                <span>Purchase Requests</span>

                <strong>
                  {summary.totalPurchaseRequests || 0}
                </strong>
              </div>


              <div className="project-activity-card">
                <span>RFQs</span>

                <strong>
                  {summary.totalRFQs || 0}
                </strong>
              </div>


              <div className="project-activity-card">
                <span>Purchase Orders</span>

                <strong>
                  {summary.totalPurchaseOrders || 0}
                </strong>
              </div>


              <div className="project-activity-card">
                <span>Purchases</span>

                <strong>
                  {summary.totalPurchases || 0}
                </strong>
              </div>


              <div className="project-activity-card">
                <span>Transactions</span>

                <strong>
                  {summary.totalTransactions || 0}
                </strong>
              </div>

            </div>

          </div>


          {/* =======================================
              BOQ SECTION
          ======================================= */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>BOQ</h3>

                <p>
                  Bills of Quantity for this project
                </p>
              </div>
            </div>


            {project.boqs?.length > 0 ? (

              <div className="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>BOQ No</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Items</th>
                    </tr>
                  </thead>

                  <tbody>

                    {project.boqs.map(
                      (boq) => (
                        <tr key={boq.id}>

                          <td>
                            <strong>
                              {boq.boqNo}
                            </strong>
                          </td>

                          <td>
                            {boq.name || "-"}
                          </td>

                          <td>
                            <span className="status-badge">
                              {boq.status}
                            </span>
                          </td>

                          <td>
                            {boq.items?.length || 0}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="project-empty-section">
                No BOQ found for this project.
              </div>

            )}

          </div>

{/* =======================================
    PURCHASE REQUESTS SECTION
======================================= */}
<div className="project-details-section">

  <div className="project-details-section-header">
    <div>
      <h3>Purchase Requests</h3>

      <p>
        Material purchase requests for this project
      </p>
    </div>
  </div>

  {project.purchaseRequests?.length > 0 ? (

    <div className="table-wrapper">

      <table>

        <thead>
          <tr>
            <th>Request No</th>
            <th>Date</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Items</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          {project.purchaseRequests.map(
            (request) => (
              <tr key={request.id}>

                <td>
                  <strong>
                    {request.requestNo}
                  </strong>
                </td>

                <td>
                  {request.requestDate
                    ? new Date(
                        request.requestDate
                      ).toLocaleDateString(
                        "en-GB"
                      )
                    : "-"}
                </td>

                <td>
                  <span className="status-badge">
                    {request.status}
                  </span>
                </td>

                <td>
                  {request.priority || "-"}
                </td>

                <td>
                  {request.items?.length || 0}
                </td>

                <td>
                  <button
                    type="button"
                    className="view-button"
                    onClick={() => {
                      viewPurchaseRequest(
                        request.id
                      );
                    }}
                  >
                    View
                  </button>
                </td>

              </tr>
            )
          )}

        </tbody>

      </table>

    </div>

  ) : (

    <div className="project-empty-section">
      No purchase requests found.
    </div>

  )}

</div>

          {/* =======================================
              RFQ SECTION
          ======================================= */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>RFQs</h3>

                <p>
                  Request for Quotations
                </p>
              </div>
            </div>


            {project.rfqs?.length > 0 ? (

              <div className="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>RFQ No</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Items</th>
                      <th>Vendors</th>
                      <th>Awarded Vendor</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {project.rfqs.map(
                      (rfq) => (
                        <tr key={rfq.id}>

                          <td>
                            <strong>
                              {rfq.rfqNo}
                            </strong>
                          </td>

                          <td>
                            {rfq.rfqDate
                              ? new Date(
                                  rfq.rfqDate
                                ).toLocaleDateString(
                                  "en-GB"
                                )
                              : "-"}
                          </td>

                          <td>
                            <span className="status-badge">
                              {rfq.status}
                            </span>
                          </td>

                          <td>
                            {rfq.items?.length || 0}
                          </td>

                          <td>
                            {rfq.vendors?.length || 0}
                          </td>

                          <td>
                            {rfq.awardedVendor?.companyName ||
                              rfq.awardedVendor?.name ||
                              "-"}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="view-button"
                              onClick={() => {
                                viewRFQ(rfq.id);
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="project-empty-section">
                No RFQ found for this project.
              </div>

            )}

          </div>


          {/* =======================================
              PURCHASE ORDER SECTION
          ======================================= */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>Purchase Orders</h3>

                <p>
                  Purchase orders related to this project
                </p>
              </div>
            </div>


            {project.purchaseOrders?.length > 0 ? (

              <div className="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>PO No</th>
                      <th>Date</th>
                      <th>Vendor</th>
                      <th>Status</th>
                      <th>Grand Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {project.purchaseOrders.map(
                      (po) => (
                        <tr key={po.id}>

                          <td>
                            <strong>
                              {po.poNo}
                            </strong>
                          </td>

                          <td>
                            {po.poDate
                              ? new Date(
                                  po.poDate
                                ).toLocaleDateString(
                                  "en-GB"
                                )
                              : "-"}
                          </td>

                          <td>
                            {po.vendor?.companyName ||
                              po.vendor?.name ||
                              "-"}
                          </td>

                          <td>
                            <span className="status-badge">
                              {po.status}
                            </span>
                          </td>

                          <td>
                            ৳{" "}
                            {Number(
                              po.grandTotal || 0
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="view-button"
                              onClick={() => {
                                viewPurchaseOrder(po.id);
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="project-empty-section">
                No purchase orders found.
              </div>

            )}

          </div>


          {/* =======================================
              PURCHASE SECTION
          ======================================= */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>Purchases</h3>

                <p>
                  Actual purchases for this project
                </p>
              </div>
            </div>


            {project.purchases?.length > 0 ? (

              <div className="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>Purchase No</th>
                      <th>Date</th>
                      <th>Vendor</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th>Due</th>
                    </tr>
                  </thead>

                  <tbody>

                    {project.purchases.map(
                      (purchase) => (
                        <tr key={purchase.id}>

                          <td>
                            <strong>
                              {purchase.purchaseNo}
                            </strong>
                          </td>

                          <td>
                            {purchase.purchaseDate
                              ? new Date(
                                  purchase.purchaseDate
                                ).toLocaleDateString(
                                  "en-GB"
                                )
                              : "-"}
                          </td>

                          <td>
                            {purchase.vendor?.companyName ||
                              purchase.vendor?.name ||
                              "-"}
                          </td>

                          <td>
                            {purchase.paymentStatus ||
                              "-"}
                          </td>

                          <td>
                            ৳{" "}
                            {Number(
                              purchase.grandTotal || 0
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>

                          <td>
                            ৳{" "}
                            {Number(
                              purchase.dueAmount || 0
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="project-empty-section">
                No purchases found.
              </div>

            )}

          </div>


          {/* =======================================
              TRANSACTIONS SECTION
          ======================================= */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>Transactions</h3>

                <p>
                  Financial transactions related to this project
                </p>
              </div>
            </div>


            {project.transactions?.length > 0 ? (

              <div className="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>

                    {project.transactions.map(
                      (transaction) => (
                        <tr key={transaction.id}>

                          <td>
                            {transaction.transactionDate
                              ? new Date(
                                  transaction.transactionDate
                                ).toLocaleDateString(
                                  "en-GB"
                                )
                              : "-"}
                          </td>

                          <td>
                            <span className="status-badge">
                              {transaction.type}
                            </span>
                          </td>

                          <td>
                            {transaction.description ||
                              "-"}
                          </td>

                          <td>
                            ৳{" "}
                            {Number(
                              transaction.amount || 0
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="project-empty-section">
                No transactions found.
              </div>

            )}

          </div>


          {/* =======================================
              NOTES
          ======================================= */}
          <div className="project-notes-section">

            <span>Project Notes</span>

            <div className="project-notes-box">
              {project.notes ||
                "No notes available"}
            </div>

          </div>

        </div>


        {/* =========================================
            FOOTER
        ========================================= */}
        <div className="modal-footer">

          <button
            type="button"
            className="cancel-button"
            onClick={() =>
              setShowProjectViewModal(false)
            }
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
};
const renderPurchaseOrderViewModal = () => {
  if (
    !showPurchaseOrderViewModal ||
    !selectedPurchaseOrder
  ) {
    return null;
  }

  const po = selectedPurchaseOrder;

  const itemsTotal = (po.items || []).reduce(
    (sum, item) =>
      sum + Number(item.total || 0),
    0
  );

  return (
    <div
      className="modal-overlay"
      onClick={() =>
        setShowPurchaseOrderViewModal(false)
      }
    >
      <div
        className="modal-container purchase-order-view-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="modal-header">
          <div>
            <h2>{po.poNo}</h2>
            <p>Purchase Order Details</p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={() =>
              setShowPurchaseOrderViewModal(false)
            }
          >
            ×
          </button>
        </div>

        <div className="modal-body">

          {/* BASIC INFO */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>Purchase Order Information</h3>
                <p>
                  Basic purchase order details
                </p>
              </div>
            </div>

            <div className="project-info-grid">

              <div className="project-info-card">
                <span>PO No</span>
                <strong>
                  {po.poNo || "-"}
                </strong>
              </div>

              <div className="project-info-card">
                <span>PO Date</span>
                <strong>
                  {po.poDate
                    ? new Date(
                        po.poDate
                      ).toLocaleDateString(
                        "en-GB"
                      )
                    : "-"}
                </strong>
              </div>

              <div className="project-info-card">
                <span>Vendor</span>
                <strong>
                  {po.vendor?.companyName ||
                    po.vendor?.name ||
                    "-"}
                </strong>
              </div>

              <div className="project-info-card">
                <span>Project</span>
                <strong>
                  {po.project?.name || "-"}
                </strong>
              </div>

              <div className="project-info-card">
                <span>Status</span>
                <strong>
                  {po.status || "-"}
                </strong>
              </div>

              <div className="project-info-card">
                <span>RFQ</span>
                <strong>
                  {po.rfq?.rfqNo || "-"}
                </strong>
              </div>

            </div>
          </div>

          {/* AMOUNTS */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>Amount Summary</h3>
                <p>
                  Purchase order financial summary
                </p>
              </div>
            </div>

            <div className="project-summary-grid">

              <div className="project-summary-card income">
                <span>Subtotal</span>
                <strong>
                  ৳{" "}
                  {Number(
                    po.subtotal || 0
                  ).toLocaleString("en-BD")}
                </strong>
              </div>

              <div className="project-summary-card expense">
                <span>Discount</span>
                <strong>
                  ৳{" "}
                  {Number(
                    po.discount || 0
                  ).toLocaleString("en-BD")}
                </strong>
              </div>

              <div className="project-summary-card balance">
                <span>Transport Cost</span>
                <strong>
                  ৳{" "}
                  {Number(
                    po.transportCost || 0
                  ).toLocaleString("en-BD")}
                </strong>
              </div>

              <div className="project-summary-card">
                <span>Grand Total</span>
                <strong>
                  ৳{" "}
                  {Number(
                    po.grandTotal || 0
                  ).toLocaleString("en-BD")}
                </strong>
              </div>

            </div>
          </div>

          {/* ITEMS */}
          <div className="project-details-section">

            <div className="project-details-section-header">
              <div>
                <h3>Purchase Order Items</h3>
                <p>
                  Materials included in this purchase order
                </p>
              </div>
            </div>

            {po.items?.length > 0 ? (

              <div className="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      <th>Notes</th>
                    </tr>
                  </thead>

                  <tbody>

                    {po.items.map(
                      (item) => (
                        <tr key={item.id}>

                          <td>
                            <strong>
                              {item.material?.name ||
                                "-"}
                            </strong>

                            <small>
                              {item.material?.code ||
                                ""}
                            </small>
                          </td>

                          <td>
                            {item.quantity}
                          </td>

                          <td>
                            {item.unit}
                          </td>

                          <td>
                            ৳{" "}
                            {Number(
                              item.unitPrice || 0
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>

                          <td>
                            ৳{" "}
                            {Number(
                              item.total || 0
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>

                          <td>
                            {item.notes || "-"}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="project-empty-section">
                No items found.
              </div>

            )}

            <div className="project-notes-box">
              Items Total: ৳{" "}
              {itemsTotal.toLocaleString("en-BD")}
            </div>

          </div>

          {/* NOTES */}
          <div className="project-notes-section">

            <span>Notes</span>

            <div className="project-notes-box">
              {po.notes ||
                "No notes available"}
            </div>

          </div>

        </div>

        <div className="modal-footer">

          <button
            type="button"
            className="cancel-button"
            onClick={() =>
              setShowPurchaseOrderViewModal(false)
            }
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
};

const renderBOQs = () => {
  return (
    <section className="dashboard">

      {boqMessage && (
        <div
          className={`message-box ${
            boqMessage.includes("❌")
              ? "message-error"
              : "message-success"
          }`}
        >
          {boqMessage}
        </div>
      )}

      <div className="content-card">

        <div className="card-header">

          <div>
            <h2>BOQ</h2>

            <p>
              Manage project Bill of Quantities
            </p>
          </div>

          <div className="header-actions">

            <RefreshButton
              onRefresh={loadBOQs}
            />

            <button
              className="add-button"
              onClick={() => {
                setEditingBOQId(null);

                setBoqForm({
                  boqNo: "",
                  name: "",
                  projectId: "",
                  status: "DRAFT",
                  notes: "",
                });

                setBoqMessage("");

                setShowBOQModal(true);
              }}
            >
              <Plus size={18} />
              Add BOQ
            </button>

          </div>

        </div>


        {boqLoading ? (

          <div className="empty-state">
            <p>Loading BOQs...</p>
          </div>

        ) : boqs.length === 0 ? (

          <div className="empty-state">

            <ClipboardList size={50} />

            <h3>No BOQ Found</h3>

            <p>
              Create your first project BOQ.
            </p>

            <button
              className="empty-add-button"
              onClick={() => {
                setEditingBOQId(null);

                setBoqForm({
                  boqNo: "",
                  name: "",
                  projectId: "",
                  status: "DRAFT",
                  notes: "",
                });

                setBoqMessage("");

                setShowBOQModal(true);
              }}
            >
              <Plus size={18} />
              Add Your First BOQ
            </button>

          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>
                  <th>ID</th>
                  <th>BOQ No</th>
                  <th>Name</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>

              </thead>

              <tbody>

                {boqs.map((boq) => (

                  <tr key={boq.id}>

                    <td>
                      #{boq.id}
                    </td>

                    <td>
                      <strong>
                        {boq.boqNo}
                      </strong>
                    </td>

                    <td>
                      {boq.name}
                    </td>

                    <td>
                      {boq.project?.name || "-"}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          boq.status === "DRAFT"
                            ? "status-ongoing"
                            : boq.status === "APPROVED"
                            ? "status-completed"
                            : boq.status === "CANCELLED"
                            ? "status-on-hold"
                            : "status-ongoing"
                        }`}
                      >
                        {boq.status}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        boq.createdAt
                      ).toLocaleDateString("en-GB")}
                    </td>

                    <td>

                      <div className="income-actions">

                       <button
                        type="button"
                        className="edit-income-button"
                        onClick={() =>
                          openBOQDetails(boq.id)
                        }
                      >
                        View
                      </button>
                        <button
                          type="button"
                          className="edit-income-button"
                          onClick={() => {
                            editBOQ(boq.id);
                          }}
                        >
                          Edit
                        </button>
                      <button
                        type="button"
                        className="delete-button"
                        onClick={() => {
                          handleDeleteBOQ(boq.id);
                        }}
                      >
                        Delete
                      </button>
                 

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </section>
  );
};

const saveBOQ = async () => {
  if (savingBOQ) {
    return;
  }

  setBoqMessage("");

  const boqNo = boqForm.boqNo.trim();
  const name = boqForm.name.trim();
  const projectId = Number(boqForm.projectId);

  const allowedBOQStatuses = [
    "DRAFT",
    "FINAL",
    "APPROVED",
    "CANCELLED",
  ];

  const boqStatus =
    boqForm.status || "DRAFT";

  // ==============================
  // VALIDATION
  // ==============================

  if (!boqNo) {
    setBoqMessage(
      "❌ BOQ number is required"
    );
    return;
  }

  if (!name) {
    setBoqMessage(
      "❌ BOQ name is required"
    );
    return;
  }

  if (!projectId) {
    setBoqMessage(
      "❌ Project is required"
    );
    return;
  }

  if (
    !allowedBOQStatuses.includes(
      boqStatus
    )
  ) {
    setBoqMessage(
      "❌ Invalid BOQ status"
    );
    return;
  }

  setSavingBOQ(true);

  try {
    // ==============================
    // PAYLOAD
    // ==============================

    const payload = {
      boqNo,
      name,
      projectId,
      status: boqStatus,
      notes:
        boqForm.notes.trim() || null,
    };

    // ==============================
    // EDIT BOQ
    // ==============================

    const response = editingBOQId
      ? await axios.put(
          `${API_URL}/api/boqs/${editingBOQId}`,
          payload
        )
      : await axios.post(
          `${API_URL}/api/boqs`,
          payload
        );

    // ==============================
    // SUCCESS
    // ==============================

    if (response.data.success) {
      setBoqMessage(
        editingBOQId
          ? "✅ BOQ updated successfully"
          : "✅ BOQ created successfully"
      );

      await loadBOQs();

      setBoqForm({
        boqNo: "",
        name: "",
        projectId: "",
        status: "DRAFT",
        notes: "",
      });

      setEditingBOQId(null);

      setTimeout(() => {
        setShowBOQModal(false);
        setBoqMessage("");
      }, 800);
    }

  } catch (error) {
    console.error(
      "Save BOQ Error:",
      error
    );

    setBoqMessage(
      `❌ ${
        error.response?.data?.message ||
        "BOQ save করা যায়নি!"
      }`
    );
  } finally {
    setSavingBOQ(false);
  }
};

const editBOQ = async (id) => {
  try {
    const response = await axios.get(
      `${API_URL}/api/boqs/${id}`
    );

    if (response.data.success) {
      const boq = response.data.data;

      setEditingBOQId(boq.id);

      setBoqForm({
        boqNo: boq.boqNo || "",
        name: boq.name || "",
        projectId: boq.projectId
          ? String(boq.projectId)
          : "",
        status: boq.status || "DRAFT",
        notes: boq.notes || "",
      });

      setBoqMessage("");

      setShowBOQModal(true);
    }
  } catch (error) {
    console.error(
      "Edit BOQ Load Error:",
      error
    );

    setBoqMessage(
      `❌ ${
        error.response?.data?.message ||
        "BOQ details load করা যায়নি!"
      }`
    );
  }
};

const renderBOQModal = () => {
  if (!showBOQModal) return null;

  return (
    <div
      className="modal-overlay"
      onClick={() => setShowBOQModal(false)}
    >
      <div
        className="boq-modal"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="boq-modal-header">
          <div>
            <h2>
              {editingBOQId
                ? "Edit BOQ"
                : "Add BOQ"}
            </h2>

            <p>
              Create project Bill of Quantities
            </p>
          </div>

          <button
            type="button"
            className="boq-modal-close"
            onClick={() =>
              setShowBOQModal(false)
            }
          >
            ×
          </button>
        </div>


        <div className="boq-modal-body">

          {boqMessage && (
            <div
             className={`boq-modal-message ${
              boqMessage.includes("❌")
                ? "error"
                : "success"
            }`}
            >
              {boqMessage}
            </div>
          )}


          <div className="form-row">

            <div className="boq-form-group">

              <label>
                BOQ Number *
              </label>

              <input
                type="text"
                value={boqForm.boqNo}
                onChange={(e) =>
                  setBoqForm((prev) => ({
                    ...prev,
                    boqNo: e.target.value,
                  }))
                }
                placeholder="BOQ-0002"
              />

            </div>


            <div className="form-group">

              <label>
                BOQ Name *
              </label>

              <input
                type="text"
                value={boqForm.name}
                onChange={(e) =>
                  setBoqForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="1600 sqft Residential Interior"
              />

            </div>

          </div>


          <div className="form-row">

            <div className="form-group">

              <label>
                Project *
              </label>

              <select
                value={boqForm.projectId}
                onChange={(e) =>
                  setBoqForm((prev) => ({
                    ...prev,
                    projectId: e.target.value,
                  }))
                }
              >
                <option value="">
                  Select Project
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.name}
                  </option>
                ))}

              </select>

            </div>


            <div className="form-group">

              <label>
                Status
              </label>

              <select
                value={boqForm.status}
                onChange={(e) =>
                  setBoqForm((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
              >
                <option value="DRAFT">
                  DRAFT
                </option>

                <option value="FINAL">
                  FINAL
                </option>

                <option value="APPROVED">
                  APPROVED
                </option>

                <option value="CANCELLED">
                  CANCELLED
                </option>

              </select>

            </div>

          </div>


          <div className="form-group full-width">

            <label>
              Notes
            </label>

            <textarea
              value={boqForm.notes}
              onChange={(e) =>
                setBoqForm((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
              placeholder="Additional BOQ information..."
              rows={4}
            />

          </div>

        </div>


        <div className="boq-modal-actions">

          <button
            type="button"
           className="boq-cancel-button"
            onClick={() =>
              setShowBOQModal(false)
            }
            disabled={savingBOQ}
          >
            Cancel
          </button>


          <button
            type="button"
            className="boq-save-button"
            onClick={saveBOQ}
            disabled={savingBOQ}
          >
            {savingBOQ
              ? "Saving..."
              : editingBOQId
              ? "Update BOQ"
              : "Save BOQ"}
          </button>

        </div>

      </div>
    </div>
  );
};

const renderBOQDetailsModal = () => {
  if (!showBOQDetailsModal || !selectedBOQ) {
    return null;
  }

  const totalEstimatedCost = boqItems.reduce(
    (sum, item) =>
      sum + Number(item.estimatedTotal || 0),
    0
  );

  return (
    <div
      className="boq-modal-overlay"
      onClick={() =>
        setShowBOQDetailsModal(false)
      }
    >
      <div
        className="boq-details-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="boq-modal-header">

          <div>
            <h2>
              {selectedBOQ.boqNo}
            </h2>

            <p>
              {selectedBOQ.name}
            </p>
          </div>

          <button
            type="button"
            className="boq-modal-close"
            onClick={() =>
              setShowBOQDetailsModal(false)
            }
          >
            ×
          </button>

        </div>


        {/* BOQ INFORMATION */}

        <div className="boq-details-body">

          <div className="boq-info-grid">

            <div className="boq-info-card">
              <span>BOQ No</span>
              <strong>
                {selectedBOQ.boqNo}
              </strong>
            </div>

            <div className="boq-info-card">
              <span>Project</span>
              <strong>
                {selectedBOQ.project?.name || "-"}
              </strong>
            </div>

            <div className="boq-info-card">
              <span>Status</span>
              <strong>
                {selectedBOQ.status}
              </strong>
            </div>

            <div className="boq-info-card">
              <span>Created</span>
              <strong>
                {selectedBOQ.createdAt
                  ? new Date(
                      selectedBOQ.createdAt
                    ).toLocaleDateString(
                      "en-GB"
                    )
                  : "-"}
              </strong>
            </div>

          </div>


          {/* ITEMS */}

          <div className="boq-items-section">
              {boqItemMessage && (
                <div
                  className={`boq-modal-message ${
                    boqItemMessage.includes("❌")
                      ? "error"
                      : "success"
                  }`}
                >
                  {boqItemMessage}
                </div>
              )}

      <div className="boq-items-header">

              <div>
                <h3>
                  BOQ Items
                </h3>

                <p>
                  Material estimation for this BOQ
                </p>
              </div>

              <button
              type="button"
              className="add-button"
              onClick={openBOQItemModal}
            >
              <Plus size={18} />
              Add Material Item
            </button>

            </div>


            {boqDetailsLoading ? (

              <div className="empty-state">
                <p>
                  Loading BOQ details...
                </p>
              </div>

            ) : boqItems.length === 0 ? (

              <div className="boq-empty-items">

                <ClipboardList size={42} />

                <h4>
                  No BOQ Items
                </h4>

                <p>
                  No material has been added
                  to this BOQ yet.
                </p>

              </div>

            ) : (

              <div className="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Material</th>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Rate</th>
                      <th>Total</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {boqItems.map((item) => (

                      <tr key={item.id}>

                        <td>
                          #{item.id}
                        </td>

                        <td>
                          <strong>
                            {item.material?.name ||
                              "-"}
                          </strong>

                          <small>
                            {item.material?.code ||
                              ""}
                          </small>
                        </td>

                        <td>
                          {item.description ||
                            "-"}
                        </td>

                        <td>
                          {item.quantity}
                        </td>

                        <td>
                          {item.unit}
                        </td>

                        <td className="money">
                          ৳{" "}
                          {formatMoney(
                            item.estimatedUnitPrice
                          )}
                        </td>

                        <td className="money">
                          ৳{" "}
                          {formatMoney(
                            item.estimatedTotal
                          )}
                        </td>

                      <td>
                        <div className="boq-item-actions">

                          <button
                            type="button"
                            className="boq-item-view-button"
                          onClick={() =>
                            openBOQItemViewModal(item)
                          }
                      >
                            View
                          </button>

                          <button
                            type="button"
                            className="boq-item-edit-button"
                           onClick={() =>
                              openEditBOQItemModal(item)
                            }
                          >
                            Edit
                          </button>


                          <button
                            type="button"
                            className="boq-item-delete-button"
                            onClick={() =>
                              handleDeleteBOQItem(item.id)
                            }
                          >
                            Delete
                          </button>


                        </div>
                      </td>
                      
                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>


          {/* TOTAL */}

          <div className="boq-total-card">

            <span>
              Total Estimated Cost
            </span>

            <strong>
              ৳{" "}
              {formatMoney(
                totalEstimatedCost
              )}
            </strong>

          </div>

        </div>


        {/* FOOTER */}

        <div className="boq-modal-actions">

          <button
            type="button"
            className="boq-cancel-button"
            onClick={() =>
              setShowBOQDetailsModal(false)
            }
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
};

const renderBOQItemModal = () => {
  if (!showBOQItemModal) {
    return null;
  }

  const quantity =
    Number(boqItemForm.quantity) || 0;

  const unitPrice =
    Number(
      boqItemForm.estimatedUnitPrice
    ) || 0;

  const estimatedTotal =
    quantity * unitPrice;

  return (
    <div
      className="boq-modal-overlay"
      onClick={() =>
        setShowBOQItemModal(false)
      }
    >
      <div
        className="boq-item-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="boq-modal-header">

          <div>
           <h2>
            {editingBOQItemId
              ? "Edit BOQ Item"
              : "Add BOQ Item"}
          </h2>

          <p>
            {editingBOQItemId
              ? `Update material in ${
                  selectedBOQ?.boqNo || "BOQ"
                }`
              : `Add material to ${
                  selectedBOQ?.boqNo || "BOQ"
                }`}
          </p>

          </div>

          <button
            type="button"
            className="boq-modal-close"
            onClick={() =>
              setShowBOQItemModal(false)
            }
          >
            ×
          </button>

        </div>


        {/* BODY */}

        <div className="boq-modal-body">

          {boqItemMessage && (
            <div
              className={`boq-modal-message ${
                boqItemMessage.includes("❌")
                  ? "error"
                  : "success"
              }`}
            >
              {boqItemMessage}
            </div>
          )}


          <div className="boq-form-grid">

            {/* MATERIAL */}

            <div className="boq-form-group full-width">

              <label>
                Material *
              </label>

              <select
                value={
                  boqItemForm.materialId
                }
                onChange={(e) =>
                  handleBOQItemMaterialChange(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select Material
                </option>

                {materials.map(
                  (material) => (
                    <option
                      key={material.id}
                      value={material.id}
                    >
                      {material.code} -{" "}
                      {material.name}
                    </option>
                  )
                )}

              </select>

            </div>


            {/* DESCRIPTION */}

            <div className="boq-form-group full-width">

              <label>
                Description
              </label>

              <input
                type="text"
                value={
                  boqItemForm.description
                }
                onChange={(e) =>
                  setBoqItemForm(
                    (prev) => ({
                      ...prev,
                      description:
                        e.target.value,
                    })
                  )
                }
                placeholder="Optional description"
              />

            </div>


            {/* QUANTITY */}

            <div className="boq-form-group">

              <label>
                Quantity *
              </label>

              <input
                type="number"
                min="0"
                step="0.001"
                value={
                  boqItemForm.quantity
                }
                onChange={(e) =>
                  setBoqItemForm(
                    (prev) => ({
                      ...prev,
                      quantity:
                        e.target.value,
                    })
                  )
                }
                placeholder="20"
              />

            </div>


            {/* UNIT */}

            <div className="boq-form-group">

              <label>
                Unit *
              </label>

              <input
                type="text"
                value={
                  boqItemForm.unit
                }
                onChange={(e) =>
                  setBoqItemForm(
                    (prev) => ({
                      ...prev,
                      unit:
                        e.target.value,
                    })
                  )
                }
                placeholder="Sheet"
              />

            </div>


            {/* UNIT PRICE */}

            <div className="boq-form-group">

              <label>
                Estimated Unit Price *
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  boqItemForm.estimatedUnitPrice
                }
                onChange={(e) =>
                  setBoqItemForm(
                    (prev) => ({
                      ...prev,
                      estimatedUnitPrice:
                        e.target.value,
                    })
                  )
                }
                placeholder="3100"
              />

            </div>


            {/* ESTIMATED TOTAL */}

            <div className="boq-form-group">

              <label>
                Estimated Total
              </label>

              <div className="boq-calculated-total">
                ৳{" "}
                {formatMoney(
                  estimatedTotal
                )}
              </div>

            </div>


            {/* NOTES */}

            <div className="boq-form-group full-width">

              <label>
                Notes
              </label>

              <textarea
                value={
                  boqItemForm.notes
                }
                onChange={(e) =>
                  setBoqItemForm(
                    (prev) => ({
                      ...prev,
                      notes:
                        e.target.value,
                    })
                  )
                }
                rows={3}
                placeholder="Additional item notes..."
              />

            </div>

          </div>

        </div>


        {/* FOOTER */}

        <div className="boq-modal-actions">

          <button
            type="button"
            className="boq-cancel-button"
            onClick={() =>
              setShowBOQItemModal(false)
            }
            disabled={savingBOQItem}
          >
            Cancel
          </button>

          <button
            type="button"
            className="boq-save-button"
            onClick={saveBOQItem}
            disabled={savingBOQItem}
          >
            {savingBOQItem
            ? "Saving..."
            : editingBOQItemId
            ? "Update Item"
            : "Save Item"}

          </button>

        </div>

      </div>
    </div>
  );
};
const renderBOQItemViewModal = () => {
  if (!showBOQItemViewModal || !selectedBOQItem) {
    return null;
  }

  const item = selectedBOQItem;

  return (
    <div
      className="boq-modal-overlay"
      onClick={() =>
        setShowBOQItemViewModal(false)
      }
    >
      <div
        className="boq-item-view-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="boq-modal-header">
          <div>
            <h2>BOQ Item Details</h2>
            <p>
              {item.material?.name || "-"}
            </p>
          </div>

          <button
            type="button"
            className="boq-modal-close"
            onClick={() =>
              setShowBOQItemViewModal(false)
            }
          >
            ×
          </button>
        </div>

        <div className="boq-modal-body">

          <div className="boq-info-grid">

            <div className="boq-info-card">
              <span>Material</span>
              <strong>
                {item.material?.name || "-"}
              </strong>
            </div>

            <div className="boq-info-card">
              <span>Material Code</span>
              <strong>
                {item.material?.code || "-"}
              </strong>
            </div>

            <div className="boq-info-card">
              <span>Quantity</span>
              <strong>
                {item.quantity} {item.unit}
              </strong>
            </div>

            <div className="boq-info-card">
              <span>Estimated Unit Price</span>
              <strong>
                ৳{" "}
                {formatMoney(
                  item.estimatedUnitPrice
                )}
              </strong>
            </div>

          </div>

          <div className="boq-item-view-total">
            <span>
              Estimated Total
            </span>

            <strong>
              ৳{" "}
              {formatMoney(
                item.estimatedTotal
              )}
            </strong>
          </div>

          <div className="boq-item-view-field">
            <label>Description</label>
            <div>
              {item.description || "-"}
            </div>
          </div>

          <div className="boq-item-view-field">
            <label>Notes</label>
            <div>
              {item.notes || "-"}
            </div>
          </div>

        </div>

        <div className="boq-modal-actions">
          <button
            type="button"
            className="boq-cancel-button"
            onClick={() =>
              setShowBOQItemViewModal(false)
            }
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

  const renderIncome = () => {

    return (

      <section className="dashboard">

          {incomeMessage && (
            <div
              className={`message-box ${
                incomeMessage.includes("❌")
                  ? "message-error"
                  : "message-success"
              }`}
            >
              {incomeMessage}
            </div>
          )}


        <div className="content-card">

          <div className="card-header">

            <div>
              <h2>Income</h2>

              <p>
                All income transactions
              </p>
            </div>

            <div className="header-actions">

              <RefreshButton
                onRefresh={loadIncome}
              />

              <button
                className="add-button"
                onClick={openIncomeModal}
              >
                <Plus size={18} />
                Add Income
              </button>

            </div>

          </div>


          <div className="income-page-size">

            <label>
              Show:
            </label>

            <select
              value={incomeLimit}
              onChange={(e) => {
                const newLimit =
                  Number(e.target.value);

                setIncomeLimit(newLimit);
                setIncomePage(1);

                loadIncome(
                  1,
                  newLimit
                );
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>
              transactions per page
            </span>

          </div>


          {income.length === 0 ? (

            <div className="empty-state">

              <ArrowDownCircle size={50} />

              <h3>No Income Found</h3>

              <p>
                Your income list is currently empty.
              </p>

              <button
                className="empty-add-button"
                onClick={openIncomeModal}
              >
                <Plus size={18} />
                Add Your First Income
              </button>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Action</th>

                  </tr>

                </thead>


                <tbody>

                  {income.map((item) => (

                    <tr key={item.id}>

                      <td>
                        #{item.id}
                      </td>

                      <td>
                        {new Date(
                          item.transactionDate
                        ).toLocaleDateString(
                          "en-GB"
                        )}
                      </td>

                      <td>
                        {item.project?.name || "-"}
                      </td>

                      <td>
                        {item.category?.name || "-"}
                      </td>



                      <td>
                        {item.description || "-"}
                      </td>

                      <td>
                        {item.paymentMethod
                          ?.replaceAll(
                            "_",
                            " "
                          ) || "CASH"}
                      </td>

                      <td className="money">
                        ৳{" "}
                        {formatMoney(
                          item.amount
                        )}
                      </td>

                      <td>
                        <div className="income-actions">


                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              openIncomeDetails(item)
                            }
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              handleEditIncome(item)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-income-button"
                            onClick={() =>
                              handleDeleteIncome(item.id)
                            }
                          >
                            Delete
                          </button>

                        </div>
                      </td>


                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

          <div className="income-summary-footer">
            Total Income: ৳{" "}
            {formatMoney(
              incomeSummary.totalIncome
            )}
          </div>

          <div className="income-pagination">

            <div className="pagination-info">
              Showing{" "}
              {incomePagination.totalRecords === 0
                ? 0
                : (incomePagination.page - 1) *
                incomePagination.limit +
                1}
              {" - "}
              {Math.min(
                incomePagination.page *
                incomePagination.limit,
                incomePagination.totalRecords
              )}
              {" of "}
              {incomePagination.totalRecords}
              {" income records"}
            </div>

            <div className="pagination-buttons">

              <button
                type="button"
                disabled={
                  incomePagination.page <= 1
                }
                onClick={() =>
                  handleIncomePageChange(
                    incomePagination.page - 1
                  )
                }
              >
                Previous
              </button>

              <span className="pagination-current">
                Page {incomePagination.page} of{" "}
                {incomePagination.totalPages}
              </span>

              <button
                type="button"
                disabled={
                  incomePagination.page >=
                  incomePagination.totalPages
                }
                onClick={() =>
                  handleIncomePageChange(
                    incomePagination.page + 1
                  )
                }
              >
                Next
              </button>

            </div>

          </div>

        </div>

      </section>
    );
  };
  const renderExpenses = () => {
    const expenseCategories = categories.filter(
      (category) => category.type === "EXPENSE"
    );

    return (
      <section className="dashboard">

        {message && (
          <div
            className={`message-box ${message.includes("❌")
                ? "message-error"
                : "message-success"
              }`}
          >
            {message}
          </div>
        )}

        <div className="content-card">

          <div className="card-header">

            <div>
              <h2>Expenses</h2>

              <p>
                All expense transactions
              </p>
            </div>

            <div className="header-actions">

              <RefreshButton
                onRefresh={loadExpenses}
              />

              <button
                className="add-button"
                onClick={openExpenseModal}
              >
                <Plus size={18} />
                Add Expense
              </button>

            </div>

          </div>


          <div className="expense-page-size">

            <label>
              Show:
            </label>

            <select
              value={expenseLimit}
              onChange={(e) => {
                const newLimit =
                  Number(e.target.value);

                setExpenseLimit(newLimit);
                setExpensePage(1);

                loadExpenses(
                  1,
                  newLimit
                );
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>
              transactions per page
            </span>

          </div>







          {expenses.length === 0 ? (

            <div className="empty-state">

              <ArrowUpCircle size={50} />

              <h3>No Expenses Found</h3>

              <p>
                Your expense list is currently empty.
              </p>

              <button
                className="empty-add-button"
                onClick={openExpenseModal}
              >
                <Plus size={18} />
                Add Your First Expense
              </button>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Worker</th>
                    <th>Vendor</th>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {expenses.map((item) => (

                    <tr key={item.id}>

                      <td>
                        #{item.id}
                      </td>

                      <td>
                        {new Date(
                          item.transactionDate
                        ).toLocaleDateString(
                          "en-GB"
                        )}
                      </td>

                      <td>
                        {item.project?.name || "-"}
                      </td>

                      <td>
                        {item.category?.name || "-"}
                      </td>

                      <td>
                        {item.description || "-"}
                      </td>

                      <td>
                        {item.worker?.name || "-"}
                      </td>

                      <td>
                        {item.vendor?.name || "-"}
                      </td>

                      <td>
                        {item.paymentMethod
                          ?.replaceAll(
                            "_",
                            " "
                          ) || "CASH"}
                      </td>

                      <td className="money">
                        ৳{" "}
                        {formatMoney(
                          item.amount
                        )}
                      </td>

                      <td>
                        <div className="income-actions">
                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              openExpenseDetails(item)
                            }
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              handleEditExpense(item)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-income-button"
                            onClick={() =>
                              handleDeleteExpense(
                                item.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}
          <div className="expense-summary-footer">
            Total Expenses: ৳{" "}
            {formatMoney(
              expenseSummary.totalExpenses
            )}
          </div>

          <div className="expense-pagination">

            <div className="pagination-info">
              Showing{" "}
              {expensePagination.totalRecords === 0
                ? 0
                : (expensePagination.page - 1) *
                expensePagination.limit +
                1}
              {" - "}
              {Math.min(
                expensePagination.page *
                expensePagination.limit,
                expensePagination.totalRecords
              )}
              {" of "}
              {expensePagination.totalRecords}
              {" expense records"}
            </div>

            <div className="pagination-buttons">

              <button
                type="button"
                disabled={
                  expensePagination.page <= 1
                }
                onClick={() =>
                  handleExpensePageChange(
                    expensePagination.page - 1
                  )
                }
              >
                Previous
              </button>

              <span className="pagination-current">
                Page {expensePagination.page} of{" "}
                {expensePagination.totalPages}
              </span>

              <button
                type="button"
                disabled={
                  expensePagination.page >=
                  expensePagination.totalPages
                }
                onClick={() =>
                  handleExpensePageChange(
                    expensePagination.page + 1
                  )
                }
              >
                Next
              </button>

            </div>

          </div>




        </div>
      </section>
    );
  };
  const renderMaterials = () => {
    return (
      <section className="dashboard">


          {message && (
            <div
              className={`message-box ${
                message.includes("❌")
                  ? "message-error"
                  : "message-success"
              }`}
            >
              {message}
            </div>
          )}


        <div className="content-card">

          <div className="card-header">

            <div>
              <h2>Materials</h2>

              <p>
                Manage all BE Interior materials
              </p>
            </div>

            <div className="header-actions">

              <RefreshButton
                onRefresh={() =>
                  loadMaterials(
                    materialPage,
                    materialLimit
                  )
                }
              />


              <button
                className="add-button"
                onClick={openMaterialModal}
              >
                <Plus size={18} />
                Add Material
              </button>

            </div>

          </div>


          <div className="material-page-size">

            <label>
              Show:
            </label>

            <select
              value={materialLimit}
              onChange={(e) => {

                const newLimit =
                  Number(e.target.value);

                setMaterialLimit(
                  newLimit
                );

                setMaterialPage(1);

                loadMaterials(
                  1,
                  newLimit
                );

              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>
              materials per page
            </span>

          </div>


          {materials.length === 0 ? (

            <div className="empty-state">

              <h3>
                No Materials Found
              </h3>

              <p>
                Your material list is currently empty.
              </p>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Material Name</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Unit</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>

                </thead>


                <tbody>

                  {materials.map(
                    (material) => (

                      <tr
                        key={material.id}
                      >

                        <td>
                          #{material.id}
                        </td>

                        <td>
                          <strong>
                            {material.code}
                          </strong>
                        </td>

                        <td>
                          <strong>
                            {material.name}
                          </strong>

                          {material.specification && (
                            <small className="project-notes">
                              {material.specification}
                            </small>
                          )}
                        </td>

                        <td>
                          {material.category?.name ||
                            "-"}
                        </td>

                        <td>
                          {material.brand ||
                            "-"}
                        </td>

                        <td>
                          {material.unit}
                        </td>
                        <td>{material.currentStock ?? "-"}</td>
                        <td>

                          <span className="status ongoing">
                            {material.status}
                          </span>

                        </td>

                        <td>
                          <div className="income-actions">

                            <button
                              type="button"
                              className="edit-income-button"
                              onClick={() =>
                                openStockUsageModal(material)
                              }
                            >
                              Stock Out
                            </button>

                            <button
                              type="button"
                              className="delete-income-button"
                              onClick={() =>
                                openStockDamageModal(material)
                              }
                            >
                              Damage
                            </button>

                            <button
                              type="button"
                              className="edit-income-button"
                              onClick={() =>
                                openStockAdjustmentModal(material)
                              }
                            >
                              Adjust
                            </button>

                            <button
                              type="button"
                              className="edit-income-button"
                              onClick={() =>
                                openStockReturnModal(material)
                              }
                            >
                              Return
                            </button>

                            <button
                              type="button"
                              className="edit-income-button"
                              onClick={() =>
                                openMaterialDetails(material)
                              }
                            >
                              View
                            </button>

                            <button
                              type="button"
                              className="edit-income-button"
                              onClick={() =>
                                openEditMaterial(material)
                              }
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="material-price-button"
                              onClick={() =>
                                openMaterialPrices(material)
                              }
                            >
                              Prices
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() =>
                                handleDeleteMaterial(
                                  material.id,
                                  material.name
                                )
                              }
                            >
                              Delete
                            </button>

                          </div>






                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}


          <div className="material-pagination">

            <div className="pagination-info">

              Showing{" "}

              {materialPagination.totalMaterials === 0
                ? 0
                : (
                  materialPagination.page - 1
                ) *
                materialPagination.limit +
                1}

              {" - "}

              {Math.min(
                materialPagination.page *
                materialPagination.limit,
                materialPagination.totalMaterials
              )}

              {" of "}

              {materialPagination.totalMaterials}

              {" materials"}

            </div>


            <div className="pagination-buttons">

              <button
                type="button"
                disabled={
                  materialPagination.page <=
                  1
                }
                onClick={() =>
                  handleMaterialPageChange(
                    materialPagination.page - 1
                  )
                }
              >
                Previous
              </button>


              <span className="pagination-current">

                Page{" "}
                {materialPagination.page}
                {" of "}
                {materialPagination.totalPages}

              </span>


              <button
                type="button"
                disabled={
                  materialPagination.page >=
                  materialPagination.totalPages
                }
                onClick={() =>
                  handleMaterialPageChange(
                    materialPagination.page + 1
                  )
                }
              >
                Next
              </button>

            </div>

          </div>

        </div>

        {/* =========================================
    ADD / EDIT MATERIAL MODAL
========================================= */}

        {showMaterialModal && (

          <div
            className="modal-overlay"
            onClick={closeMaterialModal}
          >

            <div
              className="material-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <div>
                  <h2>
                    {editingMaterialId
                      ? "Edit Material"
                      : "Add Material"}
                  </h2>

                  <p>
                    Add material information
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={closeMaterialModal}
                  disabled={savingMaterial}
                >
                  ×
                </button>

              </div>


              <form
                onSubmit={saveMaterial}
                className="material-form"
              >

                {/* CODE */}

                <div className="form-group">

                  <label>
                    Material Code *
                  </label>

                  <input
                    type="text"
                    name="code"
                    value={materialForm.code}
                    onChange={handleMaterialChange}
                    placeholder="MAT-0002"
                    required
                  />

                </div>


                {/* NAME */}

                <div className="form-group">

                  <label>
                    Material Name *
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={materialForm.name}
                    onChange={handleMaterialChange}
                    placeholder="MDF Board 18mm"
                    required
                  />

                </div>


                {/* CATEGORY */}

                <div className="form-group">

                  <label>
                    Category
                  </label>

                  <select
                    name="categoryId"
                    value={materialForm.categoryId}
                    onChange={handleMaterialChange}
                  >

                    <option value="">
                      Select Category
                    </option>

                    {materialCategories.map(
                      (category) => (

                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* SUB CATEGORY */}

                <div className="form-group">

                  <label>
                    Sub Category
                  </label>

                  <input
                    type="text"
                    name="subCategory"
                    value={materialForm.subCategory}
                    onChange={handleMaterialChange}
                    placeholder="MDF Board"
                  />

                </div>


                {/* BRAND */}

                <div className="form-group">

                  <label>
                    Brand
                  </label>

                  <input
                    type="text"
                    name="brand"
                    value={materialForm.brand}
                    onChange={handleMaterialChange}
                    placeholder="Akij / Partex / etc."
                  />

                </div>


                {/* MODEL CODE */}

                <div className="form-group">

                  <label>
                    Model / Code
                  </label>

                  <input
                    type="text"
                    name="modelCode"
                    value={materialForm.modelCode}
                    onChange={handleMaterialChange}
                    placeholder="Optional model code"
                  />

                </div>


                {/* SPECIFICATION */}

                <div className="form-group full-width">

                  <label>
                    Specification
                  </label>

                  <textarea
                    name="specification"
                    value={materialForm.specification}
                    onChange={handleMaterialChange}
                    placeholder="18mm MDF Board"
                    rows={3}
                  />

                </div>


                {/* COLOR */}

                <div className="form-group">

                  <label>
                    Color
                  </label>

                  <input
                    type="text"
                    name="color"
                    value={materialForm.color}
                    onChange={handleMaterialChange}
                    placeholder="Walnut"
                  />

                </div>


                {/* SIZE */}

                <div className="form-group">

                  <label>
                    Size
                  </label>

                  <input
                    type="text"
                    name="size"
                    value={materialForm.size}
                    onChange={handleMaterialChange}
                    placeholder="8 x 4 ft"
                  />

                </div>


                {/* UNIT */}

                <div className="form-group">

                  <label>
                    Unit *
                  </label>

                  <select
                    name="unit"
                    value={materialForm.unit}
                    onChange={handleMaterialChange}
                    required
                  >

                    <option value="">
                      Select Unit
                    </option>

                    <option value="Sheet">
                      Sheet
                    </option>

                    <option value="Piece">
                      Piece
                    </option>

                    <option value="Feet">
                      Feet
                    </option>

                    <option value="Meter">
                      Meter
                    </option>

                    <option value="SQFT">
                      SQFT
                    </option>

                    <option value="SQM">
                      SQM
                    </option>

                    <option value="KG">
                      KG
                    </option>

                    <option value="Liter">
                      Liter
                    </option>

                    <option value="Box">
                      Box
                    </option>

                    <option value="Set">
                      Set
                    </option>

                    <option value="Pair">
                      Pair
                    </option>

                    <option value="Roll">
                      Roll
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>

                </div>


                {/* DESCRIPTION */}

                <div className="form-group full-width">

                  <label>
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={materialForm.description}
                    onChange={handleMaterialChange}
                    placeholder="Additional material information..."
                    rows={4}
                  />

                </div>
                
                {/* ERROR */}

                {materialFormError && (
                  <div className="form-error-box">
                    ❌ {materialFormError}
                  </div>
                )}

                {/* ACTIONS */}

                <div className="modal-actions">

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeMaterialModal}
                    disabled={savingMaterial}
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="save-button"
                    disabled={savingMaterial}
                  >

                    {savingMaterial
                      ? "Saving..."
                      : editingMaterialId
                        ? "Update Material"
                        : "Save Material"}

                  </button>

                </div>

              </form>

            </div>

          </div>

        )}

        {/* =========================================
    MATERIAL DETAILS MODAL
========================================= */}

        {showMaterialDetailsModal && (
          <div
            className="modal-overlay"
            onClick={closeMaterialDetails}
          >
            <div
              className="project-modal material-details-modal"
              onClick={(e) => e.stopPropagation()}
            >

              {/* HEADER */}

              <div className="modal-header">

                <div>
                  <h2>
                    Material Details
                  </h2>

                  <p>
                    {selectedMaterial?.code || ""}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={closeMaterialDetails}
                >
                  <X size={22} />
                </button>

              </div>


              {/* CONTENT */}

              {selectedMaterial && (
                <div className="purchase-details-content">

                  {/* BASIC INFORMATION */}

                  <div className="purchase-info-grid">

                    <div>
                      <strong>
                        Material ID
                      </strong>

                      <span>
                        #{selectedMaterial.id}
                      </span>
                    </div>


                    <div>
                      <strong>
                        Material Code
                      </strong>

                      <span>
                        {selectedMaterial.code || "-"}
                      </span>
                    </div>


                    <div>
                      <strong>
                        Material Name
                      </strong>

                      <span>
                        {selectedMaterial.name || "-"}
                      </span>
                    </div>


                    <div>
                      <strong>
                        Category
                      </strong>

                      <span>
                        {selectedMaterial.category?.name || "-"}
                      </span>
                    </div>


                    <div>
                      <strong>
                        Brand
                      </strong>

                      <span>
                        {selectedMaterial.brand || "-"}
                      </span>
                    </div>


                    <div>
                      <strong>
                        Unit
                      </strong>

                      <span>
                        {selectedMaterial.unit || "-"}
                      </span>
                    </div>


                    <div>
                      <strong>
                        Status
                      </strong>

                      <span className="status-badge active">
                        {selectedMaterial.status || "ACTIVE"}
                      </span>
                    </div>

                  </div>


                  {/* SPECIFICATION */}

                  <div
                    className="purchase-notes"
                    style={{
                      marginTop: "24px",
                    }}
                  >

                    <strong>
                      Specification
                    </strong>

                    <p>
                      {selectedMaterial.specification || "-"}
                    </p>

                  </div>


                  {/* DESCRIPTION */}

                  <div
                    className="purchase-notes"
                    style={{
                      marginTop: "16px",
                    }}
                  >

                    <strong>
                      Description
                    </strong>

                    <p>
                      {selectedMaterial.description || "-"}
                    </p>

                  </div>

                  {/* =========================================
    STOCK SUMMARY
========================================= */}

                  <div
                    style={{
                      marginTop: "24px",
                      padding: "20px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 16px",
                        fontSize: "18px",
                      }}
                    >
                      Stock Summary
                    </h3>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(3, 1fr)",
                        gap: "12px",
                      }}
                    >

                      <div>
                        <span
                          style={{
                            display: "block",
                            fontSize: "13px",
                            color: "#64748b",
                            marginBottom: "5px",
                          }}
                        >
                          Current Stock
                        </span>

                        <strong
                          style={{
                            fontSize: "22px",
                          }}
                        >
                          {selectedMaterial?.currentStock ?? 0}
                        </strong>

                        <span
                          style={{
                            marginLeft: "5px",
                            color: "#64748b",
                          }}
                        >
                          {selectedMaterial?.unit || ""}
                        </span>
                      </div>


                      <div>
                        <span
                          style={{
                            display: "block",
                            fontSize: "13px",
                            color: "#64748b",
                            marginBottom: "5px",
                          }}
                        >
                          Total Stock In
                        </span>

                        <strong
                          style={{
                            fontSize: "22px",
                          }}
                        >
                          {selectedMaterial?.totalStockIn ?? 0}
                        </strong>

                        <span
                          style={{
                            marginLeft: "5px",
                            color: "#64748b",
                          }}
                        >
                          {selectedMaterial?.unit || ""}
                        </span>
                      </div>


                      <div>
                        <span
                          style={{
                            display: "block",
                            fontSize: "13px",
                            color: "#64748b",
                            marginBottom: "5px",
                          }}
                        >
                          Total Stock Out
                        </span>

                        <strong
                          style={{
                            fontSize: "22px",
                          }}
                        >
                          {selectedMaterial?.totalStockOut ?? 0}
                        </strong>

                        <span
                          style={{
                            marginLeft: "5px",
                            color: "#64748b",
                          }}
                        >
                          {selectedMaterial?.unit || ""}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* =========================================
    STOCK MOVEMENT HISTORY
========================================= */}

                  <div
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      marginTop: "20px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 12px",
                        fontSize: "18px",
                      }}
                    >
                      Stock Movement History
                    </h3>

                    {selectedMaterial?.movements?.length > 0 ? (
                      <div
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          overflow: "hidden",
                        }}
                      >
                        {selectedMaterial.movements.map(
                          (movement) => {
                            const isIn =
                              movement.movementType === "PURCHASE" ||
                              movement.movementType === "RETURN" ||
                              (
                                movement.movementType ===
                                "ADJUSTMENT" &&
                                Number(movement.quantity) >= 0
                              );

                            return (
                              <div
                                key={movement.id}
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  alignItems: "center",
                                  padding: "14px 16px",
                                  borderBottom:
                                    "1px solid #e2e8f0",
                                }}
                              >
                                <div>
                                  <strong
                                    style={{
                                      display: "block",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {movement.movementType
                                      .replaceAll("_", " ")}
                                  </strong>

                                  <span
                                    style={{
                                      display: "block",
                                      marginTop: "4px",
                                      color: "#64748b",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {movement.movementDate
                                      ? new Date(
                                        movement.movementDate
                                      ).toLocaleDateString(
                                        "en-GB"
                                      )
                                      : "-"}
                                  </span>
                                </div>

                                <strong
                                  style={{
                                    color: isIn
                                      ? "#16a34a"
                                      : "#dc2626",
                                    fontSize: "16px",
                                  }}
                                >
                                  {isIn ? "+" : "-"}
                                  {Math.abs(
                                    Number(movement.quantity)
                                  )}{" "}
                                  {movement.unit}
                                </strong>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          background: "#f8fafc",
                          borderRadius: "12px",
                          color: "#64748b",
                        }}
                      >
                        No stock movements found.
                      </div>
                    )}
                  </div>





                  {/* MATERIAL SUMMARY */}




                  <div
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "20px",
                      marginTop: "24px",
                      marginBottom: "24px",
                    }}
                  >

                    <span
                      style={{
                        display: "block",
                        color: "#64748b",
                        fontSize: "16px",
                        marginBottom: "8px",
                      }}
                    >
                      Material
                    </span>

                    <strong
                      style={{
                        display: "block",
                        fontSize: "28px",
                        lineHeight: "1.2",
                      }}
                    >
                      {selectedMaterial.name || "-"}
                    </strong>

                    {selectedMaterial.code && (
                      <small
                        style={{
                          display: "block",
                          marginTop: "6px",
                          color: "#64748b",
                        }}
                      >
                        {selectedMaterial.code}
                      </small>
                    )}

                  </div>


                  {/* FOOTER */}

                  <div
                    className="modal-actions"
                    style={{
                      marginTop: "24px",
                    }}
                  >

                    <button
                      type="button"
                      className="cancel-button"
                      onClick={closeMaterialDetails}
                    >
                      Close
                    </button>

                  </div>

                </div>
              )}

            </div>
          </div>
        )}

        {/* =========================================
    STOCK USAGE MODAL
========================================= */}

        {showStockUsageModal && (
          <div
            className="modal-overlay"
            onClick={closeStockUsageModal}
          >
            <div
              className="project-modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "620px",
                width: "100%",
              }}
            >

              {/* HEADER */}

              <div className="modal-header">

                <div>
                  <h2>
                    Stock Out / Project Usage
                  </h2>

                  <p>
                    Record material usage
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={closeStockUsageModal}
                >
                  <X size={22} />
                </button>

              </div>


              {/* CONTENT */}

              <form
                onSubmit={handleStockUsageSubmit}
                style={{
                  padding: "24px",
                }}
              >

                {/* MATERIAL */}

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#64748b",
                      marginBottom: "5px",
                    }}
                  >
                    Material
                  </span>

                  <strong
                    style={{
                      fontSize: "20px",
                    }}
                  >
                    {stockUsageMaterial?.name || "-"}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#64748b",
                    }}
                  >
                    {stockUsageMaterial?.code || "-"}
                  </span>

                  <div
                    style={{
                      marginTop: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Available Stock:{" "}
                    {stockUsageMaterial?.currentStock ?? 0}{" "}
                    {stockUsageMaterial?.unit || ""}
                  </div>

                </div>


                {/* PROJECT */}

                <div
                  style={{
                    marginBottom: "18px",
                  }}
                >

                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Project
                  </label>

                  <select
                    value={stockUsageForm.projectId}
                    onChange={(e) =>
                      setStockUsageForm(
                        (previous) => ({
                          ...previous,
                          projectId:
                            e.target.value,
                        })
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "12px",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius: "8px",
                    }}
                  >

                    <option value="">
                      -- Select Project --
                    </option>

                    {projects.map((project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.name}
                      </option>
                    ))}

                  </select>

                </div>


                {/* QUANTITY */}

                <div
                  style={{
                    marginBottom: "18px",
                  }}
                >

                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Quantity *
                  </label>

                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={
                      stockUsageForm.quantity
                    }
                    onChange={(e) =>
                      setStockUsageForm(
                        (previous) => ({
                          ...previous,
                          quantity:
                            e.target.value,
                        })
                      )
                    }
                    placeholder={`Maximum ${stockUsageMaterial?.currentStock ??
                      0
                      }`}
                    required
                    style={{
                      width: "100%",
                      padding: "12px",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius: "8px",
                    }}
                  />

                </div>


                {/* NOTES */}

                <div
                  style={{
                    marginBottom: "24px",
                  }}
                >

                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Notes
                  </label>

                  <textarea
                    value={
                      stockUsageForm.notes
                    }
                    onChange={(e) =>
                      setStockUsageForm(
                        (previous) => ({
                          ...previous,
                          notes:
                            e.target.value,
                        })
                      )
                    }
                    rows={4}
                    placeholder="Optional note"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius: "8px",
                      resize: "vertical",
                    }}
                  />

                </div>


                {/* FOOTER */}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    paddingTop: "18px",
                    borderTop:
                      "1px solid #e2e8f0",
                  }}
                >

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeStockUsageModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                  >
                    Save Stock Out
                  </button>

                </div>

              </form>

            </div>
          </div>
        )}
{/* =========================================
    STOCK RETURN MODAL
========================================= */}

        {showStockReturnModal && (
          <div
            className="modal-overlay"
            onClick={closeStockReturnModal}
          >
            <div
              className="project-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
              style={{
                maxWidth: "620px",
                width: "100%",
              }}
            >

              {/* HEADER */}

              <div className="modal-header">

                <div>
                  <h2>
                    Stock Return
                  </h2>

                  <p>
                    Record returned material
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={closeStockReturnModal}
                >
                  <X size={22} />
                </button>

              </div>


              {/* CONTENT */}

              <form
                onSubmit={handleStockReturnSubmit}
                style={{
                  padding: "24px",
                }}
              >

                {/* MATERIAL */}

                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#64748b",
                      marginBottom: "5px",
                    }}
                  >
                    Material
                  </span>

                  <strong
                    style={{
                      fontSize: "20px",
                    }}
                  >
                    {stockReturnMaterial?.name ||
                      "-"}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#64748b",
                    }}
                  >
                    {stockReturnMaterial?.code ||
                      "-"}
                  </span>

                  <div
                    style={{
                      marginTop: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Current Stock:{" "}
                    {stockReturnMaterial?.currentStock ??
                      0}{" "}
                    {stockReturnMaterial?.unit || ""}
                  </div>

                </div>


                {/* QUANTITY */}

                <div
                  style={{
                    marginBottom: "18px",
                  }}
                >

                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Return Quantity *
                  </label>

                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={
                      stockReturnForm.quantity
                    }
                    onChange={(e) =>
                      setStockReturnForm(
                        (previous) => ({
                          ...previous,
                          quantity:
                            e.target.value,
                        })
                      )
                    }
                    placeholder={`e.g. 1`}
                    required
                    style={{
                      width: "100%",
                      padding: "12px",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius: "8px",
                      boxSizing: "border-box",
                    }}
                  />

                </div>


                {/* NOTES */}

                <div
                  style={{
                    marginBottom: "24px",
                  }}
                >

                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Notes
                  </label>

                  <textarea
                    value={
                      stockReturnForm.notes
                    }
                    onChange={(e) =>
                      setStockReturnForm(
                        (previous) => ({
                          ...previous,
                          notes:
                            e.target.value,
                        })
                      )
                    }
                    rows={4}
                    placeholder="Optional note"
                    style={{
                      width: "100%",
                      padding: "12px",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius: "8px",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />

                </div>


                {/* FOOTER */}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    paddingTop: "18px",
                    borderTop:
                      "1px solid #e2e8f0",
                  }}
                >

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeStockReturnModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                  >
                    Save Return
                  </button>

                </div>

              </form>

            </div>
          </div>
        )}

{/* =========================================
    STOCK DAMAGE MODAL
========================================= */}

        {showStockDamageModal && (
          <div
            className="modal-overlay"
            onClick={closeStockDamageModal}
          >
            <div
              className="project-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
              style={{
                maxWidth: "620px",
                width: "100%",
              }}
            >

              {/* HEADER */}

              <div className="modal-header">

                <div>
                  <h2>
                    Stock Damage
                  </h2>

                  <p>
                    Record damaged material
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={closeStockDamageModal}
                >
                  <X size={22} />
                </button>

              </div>


              {/* CONTENT */}

              <form
                onSubmit={handleStockDamageSubmit}
                style={{
                  padding: "24px",
                }}
              >

                {/* MATERIAL */}

                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      fontSize: "13px",
                      color: "#64748b",
                      marginBottom: "5px",
                    }}
                  >
                    Material
                  </span>

                  <strong
                    style={{
                      fontSize: "20px",
                    }}
                  >
                    {stockDamageMaterial?.name ||
                      "-"}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#64748b",
                    }}
                  >
                    {stockDamageMaterial?.code ||
                      "-"}
                  </span>

                  <div
                    style={{
                      marginTop: "12px",
                      fontWeight: "600",
                    }}
                  >
                    Available Stock:{" "}
                    {stockDamageMaterial?.currentStock ??
                      0}{" "}
                    {stockDamageMaterial?.unit || ""}
                  </div>

                </div>


                {/* QUANTITY */}

                <div
                  style={{
                    marginBottom: "18px",
                  }}
                >

                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Damage Quantity *
                  </label>

                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    max={
                      stockDamageMaterial?.currentStock ??
                      0
                    }
                    value={
                      stockDamageForm.quantity
                    }
                    onChange={(e) =>
                      setStockDamageForm(
                        (previous) => ({
                          ...previous,
                          quantity:
                            e.target.value,
                        })
                      )
                    }
                    placeholder={`Maximum ${
                      stockDamageMaterial?.currentStock ??
                      0
                    }`}
                    required
                    style={{
                      width: "100%",
                      padding: "12px",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius: "8px",
                      boxSizing: "border-box",
                    }}
                  />

                </div>


                {/* NOTES */}

                <div
                  style={{
                    marginBottom: "24px",
                  }}
                >

                  <label
                    style={{
                      display: "block",
                      fontWeight: "600",
                      marginBottom: "8px",
                    }}
                  >
                    Damage Reason / Notes
                  </label>

                  <textarea
                    value={
                      stockDamageForm.notes
                    }
                    onChange={(e) =>
                      setStockDamageForm(
                        (previous) => ({
                          ...previous,
                          notes:
                            e.target.value,
                        })
                      )
                    }
                    rows={4}
                    placeholder="e.g. Broken, scratched, water damaged..."
                    style={{
                      width: "100%",
                      padding: "12px",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius: "8px",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />

                </div>


                {/* FOOTER */}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    paddingTop: "18px",
                    borderTop:
                      "1px solid #e2e8f0",
                  }}
                >

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeStockDamageModal}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="save-button"
                  >
                    Save Damage
                  </button>

                </div>

              </form>

            </div>
          </div>
        )}


{/* =========================================
    STOCK ADJUSTMENT MODAL
========================================= */}

{showStockAdjustmentModal && (
  <div
    className="modal-overlay"
    onClick={closeStockAdjustmentModal}
  >
    <div
      className="project-modal"
      onClick={(e) =>
        e.stopPropagation()
      }
      style={{
        maxWidth: "620px",
        width: "100%",
      }}
    >

      <div className="modal-header">

        <div>
          <h2>
            Stock Adjustment
          </h2>

          <p>
            Correct physical stock quantity
          </p>
        </div>

        <button
          type="button"
          className="modal-close"
          onClick={closeStockAdjustmentModal}
        >
          <X size={22} />
        </button>

      </div>

      <form
        onSubmit={handleStockAdjustmentSubmit}
        style={{
          padding: "24px",
        }}
      >

        {/* MATERIAL */}

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "13px",
              color: "#64748b",
              marginBottom: "5px",
            }}
          >
            Material
          </span>

          <strong
            style={{
              fontSize: "20px",
            }}
          >
            {stockAdjustmentMaterial?.name ||
              "-"}
          </strong>

          <span
            style={{
              display: "block",
              marginTop: "4px",
              color: "#64748b",
            }}
          >
            {stockAdjustmentMaterial?.code ||
              "-"}
          </span>

          <div
            style={{
              marginTop: "12px",
              fontWeight: "600",
            }}
          >
            Current Stock:{" "}
            {stockAdjustmentMaterial?.currentStock ??
              0}{" "}
            {stockAdjustmentMaterial?.unit || ""}
          </div>
        </div>

        {/* TYPE */}

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Adjustment Type *
          </label>

          <select
            value={stockAdjustmentForm.type}
            onChange={(e) =>
              setStockAdjustmentForm(
                (previous) => ({
                  ...previous,
                  type: e.target.value,
                })
              )
            }
            style={{
              width: "100%",
              padding: "12px",
              border:
                "1px solid #cbd5e1",
              borderRadius: "8px",
              boxSizing: "border-box",
            }}
          >
            <option value="INCREASE">
              Increase Stock
            </option>

            <option value="DECREASE">
              Decrease Stock
            </option>
          </select>
        </div>

        {/* QUANTITY */}

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Quantity *
          </label>

          <input
            type="number"
            min="0.001"
            step="0.001"
            max={
              stockAdjustmentForm.type ===
              "DECREASE"
                ? stockAdjustmentMaterial?.currentStock ??
                  0
                : undefined
            }
            value={
              stockAdjustmentForm.quantity
            }
            onChange={(e) =>
              setStockAdjustmentForm(
                (previous) => ({
                  ...previous,
                  quantity:
                    e.target.value,
                })
              )
            }
            placeholder={
              stockAdjustmentForm.type ===
              "DECREASE"
                ? `Maximum ${
                    stockAdjustmentMaterial?.currentStock ??
                    0
                  }`
                : "e.g. 2"
            }
            required
            style={{
              width: "100%",
              padding: "12px",
              border:
                "1px solid #cbd5e1",
              borderRadius: "8px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* NOTES */}

        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <label
            style={{
              display: "block",
              fontWeight: "600",
              marginBottom: "8px",
            }}
          >
            Reason / Notes
          </label>

          <textarea
            value={
              stockAdjustmentForm.notes
            }
            onChange={(e) =>
              setStockAdjustmentForm(
                (previous) => ({
                  ...previous,
                  notes:
                    e.target.value,
                })
              )
            }
            rows={4}
            placeholder="e.g. Physical stock count correction"
            style={{
              width: "100%",
              padding: "12px",
              border:
                "1px solid #cbd5e1",
              borderRadius: "8px",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* FOOTER */}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            paddingTop: "18px",
            borderTop:
              "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            className="cancel-button"
            onClick={closeStockAdjustmentModal}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-button"
          >
            Save Adjustment
          </button>
        </div>

      </form>
    </div>
  </div>
)}







        {showMaterialPriceModal && (
          <div className="modal-overlay">
            <div className="material-price-modal">

              <div className="modal-header">
                <div>
                  <h2>Material Prices</h2>
                  <p>
                    {selectedMaterial?.name || "Selected Material"}
                  </p>
                </div>

                <button
                  className="modal-close"
                  onClick={() => {
                    setShowMaterialPriceModal(false);
                    setSelectedMaterial(null);
                  }}
                >
                  ×
                </button>
              </div>





              <div className="material-price-content">

                {/* MATERIAL INFO */}

                <div className="material-price-title">

                  <div>
                    <h3>
                      {selectedMaterial?.name}
                    </h3>

                    <p>
                      {selectedMaterial?.code || ""}
                      {" • "}
                      {selectedMaterial?.unit || ""}
                    </p>
                  </div>

                </div>


                {/* PRICE SUMMARY */}

                <div className="material-price-summary">

                  <div className="price-summary-card best">
                    <span>Best Price</span>

                    <strong>
                      ৳{" "}
                      {Number(
                        materialPriceSummary.lowestPrice || 0
                      ).toLocaleString("en-BD")}
                    </strong>

                    <small>
                      Lowest vendor price
                    </small>
                  </div>


                  <div className="price-summary-card highest">
                    <span>Highest Price</span>

                    <strong>
                      ৳{" "}
                      {Number(
                        materialPriceSummary.highestPrice || 0
                      ).toLocaleString("en-BD")}
                    </strong>

                    <small>
                      Highest quotation
                    </small>
                  </div>


                  <div className="price-summary-card average">
                    <span>Average Price</span>

                    <strong>
                      ৳{" "}
                      {Number(
                        materialPriceSummary.averagePrice || 0
                      ).toLocaleString(
                        "en-BD",
                        {
                          maximumFractionDigits: 2,
                        }
                      )}
                    </strong>

                    <small>
                      Average vendor price
                    </small>
                  </div>


                  <div className="price-summary-card vendor">
                    <span>Best Vendor</span>

                    <strong>
                      {
                        materialPriceSummary.bestVendor
                          ?.name || "-"
                      }
                    </strong>

                    <small>
                      {
                        materialPriceSummary.bestVendor
                          ?.companyName || ""
                      }
                    </small>
                  </div>

                </div>


                {/* ADD PRICE FORM */}

                <div className="material-price-section">

                  <div className="material-price-section-header">

                    <div>

                      <h4>
                        {editingMaterialPriceId
                          ? "Edit Vendor Price"
                          : "Add Vendor Price"}
                      </h4>

                      <p>
                        {editingMaterialPriceId
                          ? "Update the selected vendor quotation"
                          : "Add a new quotation for this material"}
                      </p>

                    </div>

                  </div>


                  <div className="material-price-form">

                    {/* Vendor */}

                    <div className="form-group">

                      <label>
                        Vendor *
                      </label>

                      <select
                        name="vendorId"
                        value={
                          materialPriceForm.vendorId
                        }
                        onChange={(e) =>
                          setMaterialPriceForm(
                            (prev) => ({
                              ...prev,
                              vendorId:
                                e.target.value,
                            })
                          )
                        }
                        required
                      >

                        <option value="">
                          Select Vendor
                        </option>

                        {vendors
                          .filter(
                            (vendor) =>
                              vendor.status ===
                              "ACTIVE"
                          )
                          .map((vendor) => (

                            <option
                              key={vendor.id}
                              value={vendor.id}
                            >
                              {vendor.name}

                              {vendor.companyName
                                ? ` - ${vendor.companyName}`
                                : ""}
                            </option>

                          ))}

                      </select>

                    </div>


                    {/* Price */}

                    <div className="form-group">

                      <label>
                        Unit Price *
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          materialPriceForm.price
                        }
                        onChange={(e) =>
                          setMaterialPriceForm(
                            (prev) => ({
                              ...prev,
                              price:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="3500"
                        required
                      />

                    </div>


                    {/* Minimum Qty */}

                    <div className="form-group">

                      <label>
                        Minimum Quantity
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          materialPriceForm.minimumQuantity
                        }
                        onChange={(e) =>
                          setMaterialPriceForm(
                            (prev) => ({
                              ...prev,
                              minimumQuantity:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="10"
                      />

                    </div>


                    {/* Lead Time */}

                    <div className="form-group">

                      <label>
                        Lead Time (Days)
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          materialPriceForm.leadTime
                        }
                        onChange={(e) =>
                          setMaterialPriceForm(
                            (prev) => ({
                              ...prev,
                              leadTime:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="3"
                      />

                    </div>


                    {/* Notes */}

                    <div className="form-group full-width">

                      <label>
                        Notes
                      </label>

                      <textarea
                        value={
                          materialPriceForm.notes
                        }
                        onChange={(e) =>
                          setMaterialPriceForm(
                            (prev) => ({
                              ...prev,
                              notes:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="Current vendor quotation..."
                        rows={3}
                      />

                    </div>



                        {/* MESSAGE */}

                        {materialPriceFormMessage && (
                          <div
                            className={
                              materialPriceFormMessage.startsWith("❌")
                                ? "form-error-box"
                                : "form-success-box"
                            }
                          >
                            {materialPriceFormMessage}
                          </div>
                        )}


                      {/* ACTIONS */}

                    <div className="material-price-actions">

                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() => {

                          setMaterialPriceForm({
                            vendorId: "",
                            price: "",
                            minimumQuantity: "",
                            leadTime: "",
                            notes: "",
                          });

                          setEditingMaterialPriceId(null);
                          setMaterialPriceFormMessage("");
                        }}
                      >
                        Clear
                      </button>

                      <button
                        type="button"
                        className="save-button"
                        onClick={saveMaterialPrice}
                      >
                        Save Price
                      </button>

                    </div>

                  </div>

                </div>


                {/* PRICE HISTORY */}

                <div className="material-price-section">

                  <div className="material-price-section-header">

                    <div>
                      <h4>
                        Vendor Price History
                      </h4>

                      <p>
                        All recorded quotations for this material
                      </p>
                    </div>

                    <span>
                      {materialPrices.length} records
                    </span>

                  </div>


                  {loadingMaterialPrices ? (

                    <div className="material-price-loading">
                      Loading prices...
                    </div>

                  ) : materialPrices.length === 0 ? (

                    <div className="material-price-empty">
                      No vendor prices found.
                    </div>

                  ) : (

                    <div className="material-price-table-wrapper">

                      <table className="material-price-table">

                        <thead>
                          <tr>
                            <th>Vendor</th>
                            <th>Unit Price</th>
                            <th>Unit</th>
                            <th>Minimum Qty</th>
                            <th>Lead Time</th>
                            <th>Date</th>
                            <th>Action</th>
                          </tr>
                        </thead>

                        <tbody>

                          {materialPrices.map(
                            (price) => (

                              <tr
                                key={price.id}
                              >

                                <td>

                                  <strong>
                                    {price.vendor?.name ||
                                      "-"}
                                  </strong>

                                  {price.vendor
                                    ?.companyName && (
                                      <small>
                                        {
                                          price.vendor
                                            .companyName
                                        }
                                      </small>
                                    )}

                                </td>


                                <td className="material-price-value">

                                  ৳{" "}
                                  {Number(
                                    price.unitPrice || 0
                                  ).toLocaleString(
                                    "en-BD"
                                  )}

                                </td>


                                <td>
                                  {price.unit}
                                </td>


                                <td>
                                  {price.minimumQty ??
                                    "-"}
                                </td>


                                <td>
                                  {price.leadTimeDays
                                    ? `${price.leadTimeDays} days`
                                    : "-"}
                                </td>


                                <td>
                                  {price.effectiveDate
                                    ? new Date(
                                      price.effectiveDate
                                    ).toLocaleDateString(
                                      "en-GB"
                                    )
                                    : "-"}
                                </td>

                                <td>
                                  <div className="income-actions">

                                    <button
                                      type="button"
                                      className="edit-income-button"
                                      onClick={() =>
                                        openEditMaterialPrice(price)
                                      }
                                    >
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      className="delete-income-button"
                                      onClick={() =>
                                        handleDeleteMaterialPrice(price)
                                      }
                                    >
                                      Delete
                                    </button>

                                  </div>
                                </td>


                              </tr>

                            )
                          )}

                        </tbody>

                      </table>

                    </div>

                  )}

                </div>


                {/* CLOSE */}

                <div className="material-price-footer">

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {

                      setShowMaterialPriceModal(false);
                      setSelectedMaterial(null);

                      setMaterialPrices([]);

                    }}
                  >
                    Close
                  </button>

                </div>

              </div>
            </div>
          </div>


        )}


      </section>
    );
  };
  const renderPurchases = () => {
    return (
      <section className="dashboard">

        {message && (
          <div
            className={`message-box ${message.includes("❌")
                ? "message-error"
                : "message-success"
              }`}
          >
            {message}
          </div>
        )}

        <div className="content-card">

          {/* HEADER */}
          <div className="card-header">

            <div>
              <h2>Purchases</h2>

              <p>
                Manage all material purchases
              </p>
            </div>

            <div className="header-actions">

              <RefreshButton
                onRefresh={loadPurchases}
              />

              <button
                type="button"
                className="add-button"
                onClick={openPurchaseModal}
              >
                <Plus size={16} />
                Add Purchase
              </button>


            </div>

          </div>


          <div className="material-page-size">

            <label>
              Show:
            </label>

            <select
              value={purchaseLimit}
              onChange={(e) => {
                const newLimit =
                  Number(e.target.value);

                setPurchaseLimit(newLimit);
                setPurchasePage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>
              purchases per page
            </span>

          </div>


          {/* PURCHASE TABLE */}
          {loadingPurchases ? (

            <div className="empty-state">
              <h3>
                Loading Purchases...
              </h3>

              <p>
                Please wait while purchase data is loading.
              </p>
            </div>



          ) : purchases.length === 0 ? (

            <div className="empty-state">

              <h3>
                No Purchases Found
              </h3>

              <p>
                Your purchase list is currently empty.
              </p>

              <button
                className="empty-add-button"
                onClick={openPurchaseModal}
              >
                <Plus size={18} />
                Add Your First Purchase
              </button>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>Purchase No</th>
                    <th>Date</th>
                    <th>Vendor</th>
                    <th>Project</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>

                </thead>

                <tbody>

                  {purchases
                    .slice(
                      (purchasePage - 1) *
                      purchaseLimit,
                      purchasePage *
                      purchaseLimit
                    )
                    .map(
                      (purchase) => (
                        <tr
                          key={purchase.id}
                        >

                          <td>
                            <strong>
                              {purchase.purchaseNo}
                            </strong>
                          </td>

                          <td>
                            {new Date(
                              purchase.purchaseDate
                            ).toLocaleDateString(
                              "en-GB"
                            )}
                          </td>

                          <td>
                            {purchase.vendor?.name ||
                              "-"}
                          </td>

                          <td>
                            {purchase.project?.name ||
                              "-"}
                          </td>

                          <td className="money">
                            ৳{" "}
                            {Number(
                              purchase.grandTotal
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>

                          <td className="money">
                            ৳{" "}
                            {Number(
                              purchase.paidAmount
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>

                          <td className="money">
                            ৳{" "}
                            {Number(
                              purchase.dueAmount
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>

                          <td>

                            <span className="status ongoing">
                              {purchase.paymentStatus}
                            </span>

                          </td>

                         

                              <td>

                                <div className="income-actions">

                                  {/* VIEW */}
                                  <button
                                    type="button"
                                    className="edit-income-button"
                                    onClick={() =>
                                      openPurchaseDetails(
                                        purchase.id
                                      )
                                    }
                                  >
                                    View
                                  </button>


                                  {/* EDIT */}
                                  <button
                                    type="button"
                                    className="edit-income-button"
                                    onClick={() =>
                                      openEditPurchaseModal(
                                        purchase.id
                                      )
                                    }
                                  >
                                    Edit
                                  </button>


                                  {/* DELETE */}
                                  <button
                                    type="button"
                                    className="delete-income-button"
                                    onClick={() =>
                                      handleDeletePurchase(
                                        purchase
                                      )
                                    }
                                  >
                                    Delete
                                  </button>

                                </div>

                              </td>


                        </tr>

                      )
                    )}

                </tbody>

              </table>

            </div>

          )}
          {/* FOOTER */}
          <div className="material-pagination">

            <div className="pagination-info">

              Showing{" "}

              {purchases.length === 0
                ? 0
                : (purchasePage - 1) *
                purchaseLimit +
                1}

              {" - "}

              {Math.min(
                purchasePage *
                purchaseLimit,
                purchases.length
              )}

              {" of "}

              {purchases.length}

              {" purchases"}

            </div>


            <div className="pagination-buttons">

              <button
                type="button"
                disabled={
                  purchasePage <= 1
                }
                onClick={() =>
                  setPurchasePage(
                    purchasePage - 1
                  )
                }
              >
                Previous
              </button>


              <span className="pagination-current">

                Page{" "}
                {purchasePage}
                {" of "}

                {Math.max(
                  1,
                  Math.ceil(
                    purchases.length /
                    purchaseLimit
                  )
                )}

              </span>


              <button
                type="button"
                disabled={
                  purchasePage >=
                  Math.ceil(
                    purchases.length /
                    purchaseLimit
                  )
                }
                onClick={() =>
                  setPurchasePage(
                    purchasePage + 1
                  )
                }
              >
                Next
              </button>

            </div>


            {showPurchaseModal && (
              <div
                className="modal-overlay"
                onClick={closePurchaseModal}
              >
                <div
                  className="purchase-modal"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >

                  {/* HEADER */}

                  <div className="modal-header">

                    <div>
                      <h2>
                        Add Purchase
                      </h2>

                      <p>
                        Create a new material purchase
                      </p>
                    </div>

                    <button
                      type="button"
                      className="modal-close"
                      onClick={closePurchaseModal}
                      disabled={savingPurchase}
                    >
                      ×
                    </button>

                  </div>


                  {/* CONTENT */}

                  <div className="purchase-form-content">

                    {/* BASIC INFORMATION */}

                    <div className="purchase-form-section">

                      <div className="purchase-form-section-header">

                        <div>
                          <h3>
                            Purchase Information
                          </h3>

                          <p>
                            Basic purchase details
                          </p>
                        </div>

                      </div>


                      <div className="purchase-form-grid">

                        {/* Purchase No */}

                        <div className="form-group">

                          <label>
                            Purchase No *
                          </label>

                          <input
                            type="text"
                            value={
                              purchaseForm.purchaseNo
                            }
                            onChange={(e) =>
                              setPurchaseForm(
                                (prev) => ({
                                  ...prev,
                                  purchaseNo:
                                    e.target.value,
                                })
                              )
                            }
                            placeholder="PO-0002"
                          />

                        </div>


                        {/* Purchase Date */}

                        <div className="form-group">

                          <label>
                            Purchase Date *
                          </label>

                          <input
                            type="date"
                            value={
                              purchaseForm.purchaseDate
                            }
                            onChange={(e) =>
                              setPurchaseForm(
                                (prev) => ({
                                  ...prev,
                                  purchaseDate:
                                    e.target.value,
                                })
                              )
                            }
                          />

                        </div>


                        {/* Vendor */}

                        <div className="form-group">

                          <label>
                            Vendor *
                          </label>

                          <select
                            value={
                              purchaseForm.vendorId
                            }
                            onChange={(e) =>
                              setPurchaseForm(
                                (prev) => ({
                                  ...prev,
                                  vendorId:
                                    e.target.value,
                                })
                              )
                            }
                          >

                            <option value="">
                              Select Vendor
                            </option>

                            {vendors
                              .filter(
                                (vendor) =>
                                  vendor.status ===
                                  "ACTIVE"
                              )
                              .map(
                                (vendor) => (

                                  <option
                                    key={vendor.id}
                                    value={vendor.id}
                                  >
                                    {vendor.name}

                                    {vendor.companyName
                                      ? ` - ${vendor.companyName}`
                                      : ""}
                                  </option>

                                )
                              )}

                          </select>

                        </div>


                        {/* Project */}

                        <div className="form-group">

                          <label>
                            Project
                          </label>

                          <select
                            value={
                              purchaseForm.projectId
                            }
                            onChange={(e) =>
                              setPurchaseForm(
                                (prev) => ({
                                  ...prev,
                                  projectId:
                                    e.target.value,
                                })
                              )
                            }
                          >

                            <option value="">
                              No Project
                            </option>

                            {projects
                              .filter(
                                (project) =>
                                  project.status !==
                                  "COMPLETED"
                              )
                              .map(
                                (project) => (

                                  <option
                                    key={project.id}
                                    value={project.id}
                                  >
                                    {project.name}
                                  </option>

                                )
                              )}

                          </select>

                        </div>

                      </div>

                    </div>


                    {/* PURCHASE ITEMS */}

                    <div className="purchase-form-section">

                      <div className="purchase-form-section-header">

                        <div>
                          <h3>
                            Purchase Items
                          </h3>

                          <p>
                            Add one or more materials
                          </p>
                        </div>

                        <button
                          type="button"
                          className="add-item-button"
                          onClick={addPurchaseItem}
                        >
                          <Plus size={16} />
                          Add Item
                        </button>

                      </div>


                      <div className="purchase-items-wrapper">

                        {purchaseItems.map(
                          (item, index) => (

                            <div
                              className="purchase-item-row"
                              key={index}
                            >

                              {/* MATERIAL */}

                              <div className="form-group purchase-material-field">

                                <label>
                                  Material *
                                </label>

                                <select
                                  value={
                                    item.materialId
                                  }
                                  onChange={(e) =>
                                    handlePurchaseItemChange(
                                      index,
                                      "materialId",
                                      e.target.value
                                    )
                                  }
                                >

                                  <option value="">
                                    Select Material
                                  </option>

                                  {materials
                                    .filter(
                                      (material) =>
                                        material.status ===
                                        "ACTIVE"
                                    )
                                    .map(
                                      (material) => (

                                        <option
                                          key={
                                            material.id
                                          }
                                          value={
                                            material.id
                                          }
                                        >
                                          {material.name}
                                          {" - "}
                                          {material.code}
                                        </option>

                                      )
                                    )}

                                </select>

                              </div>


                              {/* QUANTITY */}

                              <div className="form-group">

                                <label>
                                  Quantity *
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.quantity
                                  }
                                  onChange={(e) =>
                                    handlePurchaseItemChange(
                                      index,
                                      "quantity",
                                      e.target.value
                                    )
                                  }
                                  placeholder="10"
                                />

                              </div>


                              {/* UNIT */}

                              <div className="form-group">

                                <label>
                                  Unit
                                </label>

                                <input
                                  type="text"
                                  value={
                                    item.unit
                                  }
                                  onChange={(e) =>
                                    handlePurchaseItemChange(
                                      index,
                                      "unit",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Sheet"
                                />

                              </div>


                              {/* UNIT PRICE */}

                              <div className="form-group">

                                <label>
                                  Unit Price *
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    item.unitPrice
                                  }
                                  onChange={(e) =>
                                    handlePurchaseItemChange(
                                      index,
                                      "unitPrice",
                                      e.target.value
                                    )
                                  }
                                  placeholder="3500"
                                />

                              </div>


                              {/* TOTAL */}

                              <div className="form-group">

                                <label>
                                  Total
                                </label>

                                <div className="purchase-item-total">
                                  ৳{" "}
                                  {Number(
                                    item.total || 0
                                  ).toLocaleString(
                                    "en-BD"
                                  )}
                                </div>

                              </div>


                              {/* REMOVE */}

                              <button
                                type="button"
                                className="remove-item-button"
                                onClick={() =>
                                  removePurchaseItem(
                                    index
                                  )
                                }
                                disabled={
                                  purchaseItems.length ===
                                  1
                                }
                                title="Remove item"
                              >
                                ×
                              </button>

                            </div>

                          )
                        )}

                      </div>

                    </div>


                    {/* SUMMARY */}


                    <div className="purchase-form-summary">

                      <div className="purchase-summary-left">

                        <div className="form-group">

                          <label>
                            Discount
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              purchaseForm.discount
                            }
                            onChange={(e) =>
                              setPurchaseForm(
                                (prev) => ({
                                  ...prev,
                                  discount:
                                    e.target.value,
                                })
                              )
                            }
                            placeholder="0"
                          />

                        </div>


                        <div className="form-group">

                          <label>
                            Transport Cost
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              purchaseForm.transportCost
                            }
                            onChange={(e) =>
                              setPurchaseForm(
                                (prev) => ({
                                  ...prev,
                                  transportCost:
                                    e.target.value,
                                })
                              )
                            }
                            placeholder="0"
                          />

                        </div>


                        <div className="form-group">

                          <label>
                            Paid Amount
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              purchaseForm.paidAmount
                            }
                            onChange={(e) =>
                              setPurchaseForm(
                                (prev) => ({
                                  ...prev,
                                  paidAmount:
                                    e.target.value,
                                })
                              )
                            }
                            placeholder="0"
                          />

                        </div>

                      </div>


                      <div className="purchase-form-summary-box">

                        <div>
                          <span>
                            Subtotal
                          </span>

                          <strong>
                            ৳{" "}
                            {purchaseSubtotal.toLocaleString(
                              "en-BD"
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            Discount
                          </span>

                          <strong>
                            ৳{" "}
                            {purchaseDiscount.toLocaleString(
                              "en-BD"
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            Transport
                          </span>

                          <strong>
                            ৳{" "}
                            {purchaseTransport.toLocaleString(
                              "en-BD"
                            )}
                          </strong>
                        </div>


                        <div className="grand-total">
                          <span>
                            Grand Total
                          </span>

                          <strong>
                            ৳{" "}
                            {purchaseGrandTotal.toLocaleString(
                              "en-BD"
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            Paid
                          </span>

                          <strong>
                            ৳{" "}
                            {purchasePaidAmount.toLocaleString(
                              "en-BD"
                            )}
                          </strong>
                        </div>


                        <div>
                          <span>
                            Due
                          </span>

                          <strong>
                            ৳{" "}
                            {purchaseDueAmount.toLocaleString(
                              "en-BD"
                            )}
                          </strong>
                        </div>

                      </div>

                    </div>




                    {/* NOTES */}

                    <div className="form-group">

                      <label>
                        Notes
                      </label>

                      <textarea
                        value={
                          purchaseForm.notes
                        }
                        onChange={(e) =>
                          setPurchaseForm(
                            (prev) => ({
                              ...prev,
                              notes:
                                e.target.value,
                            })
                          )
                        }
                        placeholder="Purchase notes..."
                        rows={3}
                      />

                    </div>


                    {/* ACTIONS */}

                    <div className="purchase-modal-actions">

                      <button
                        type="button"
                        className="cancel-button"
                        onClick={closePurchaseModal}
                        disabled={savingPurchase}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="save-button"
                        onClick={savePurchase}
                        disabled={savingPurchase}
                      >
                        {savingPurchase
                          ? "Saving..."
                          : "Save Purchase"}
                      </button>

                    </div>

                  </div>

                </div>
              </div>
            )}



          </div>

        </div>

      </section>
    );

  };

  const convertPurchaseRequestToRFQ = async (purchaseRequest) => {
  try {
    if (
      !purchaseRequest?.id
    ) {
      setPurchaseRequestMessage(
        "❌ Invalid purchase request"
      );
      return;
    }

    if (
      !purchaseRequest.items ||
      purchaseRequest.items.length === 0
    ) {
      setPurchaseRequestMessage(
        "❌ Cannot convert because this purchase request has no items"
      );
      return;
    }

    const confirmed = window.confirm(
      `Convert "${purchaseRequest.requestNo}" to RFQ?\n\n` +
      `Project: ${
        purchaseRequest.project?.name || "-"
      }\n` +
      `Items: ${
        purchaseRequest.items.length
      }`
    );

    if (!confirmed) {
      return;
    }

    setPurchaseRequestMessage("");

    const rfqNo =
      `RFQ-${String(
        Date.now()
      ).slice(-6)}`;

    const response =
      await axios.post(
        `${API_URL}/api/purchase-requests/${purchaseRequest.id}/convert-to-rfq`,
        {
          rfqNo,

          rfqDate:
            new Date()
              .toISOString()
              .split("T")[0],

          status: "DRAFT",

          notes:
            `Created from Purchase Request ${purchaseRequest.requestNo}`,
        }
      );

    if (!response.data.success) {
      throw new Error(
        response.data.message ||
        "RFQ conversion failed"
      );
    }

    await loadPurchaseRequests();
    await loadRFQs();

    setPurchaseRequestMessage(
      `✅ ${purchaseRequest.requestNo} converted to ${rfqNo} successfully`
    );

    setTimeout(() => {
      setPurchaseRequestMessage("");
    }, 3000);

  } catch (error) {
    console.error(
      "Convert Purchase Request To RFQ Error:",
      error
    );

    setPurchaseRequestMessage(
      `❌ ${
        error.response?.data?.message ||
        error.message ||
        "Purchase request to RFQ conversion failed!"
      }`
    );
  }
};

const renderPurchaseRequests = () => {
  return (
    <section className="dashboard">

      <div className="content-card">

        <div className="card-header">

          <div>
            <h2>Purchase Requests</h2>

            <p>
              Manage material purchase requests
            </p>
          </div>

          <div className="header-actions">

            <RefreshButton
              onRefresh={loadPurchaseRequests}
            />

           <button
              type="button"
              className="add-button"
              onClick={() => {
                setPurchaseRequestForm({
                  requestNo: "",
                  requestDate: new Date()
                    .toISOString()
                    .split("T")[0],
                  projectId: "",
                  status: "DRAFT",
                  priority: "NORMAL",
                  notes: "",
                });

                setPurchaseRequestMessage("");
                setShowPurchaseRequestModal(true);
              }}
            >
              + Add Purchase Request
            </button>

          </div>

        </div>

        {purchaseRequestMessage && (
          <div className="page-message">
            {purchaseRequestMessage}
          </div>
        )}

        {purchaseRequestLoading ? (

          <div className="loading-state">
            Loading purchase requests...
          </div>

        ) : purchaseRequests.length === 0 ? (

          <div className="empty-state">

            <ClipboardList size={50} />

            <h3>No Purchase Requests Found</h3>

            <p>
              Your purchase request list is currently empty.
            </p>

            <button
              className="empty-add-button"
              type="button"
            >
              <Plus size={18} />
              Add Your First Purchase Request
            </button>

          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Request No</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Items</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {purchaseRequests.map(
                  (item) => (
                    <tr key={item.id}>

                      <td>
                        #{item.id}
                      </td>

                      <td>
                        {item.requestNo}
                      </td>

                      <td>
                        {new Date(
                          item.requestDate
                        ).toLocaleDateString(
                          "en-GB"
                        )}
                      </td>

                      <td>
                        {item.project?.name || "-"}
                      </td>

                      <td>
                        {item.status}
                      </td>

                      <td>
                        {item.priority}
                      </td>

                      <td>
                        {item.items?.length || 0}
                      </td>

                      <td>
                        <div className="purchase-request-actions">

                        <button 
                          type="button" 
                          className="view-button" 
                          onClick={() => { 
                            viewPurchaseRequest(item.id); 
                          }} 
                        >
                          View 
                        </button>

                       <button
                        type="button"
                        className="edit-button"
                        onClick={() => {
                          editPurchaseRequest(item.id);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="view-button"
                        onClick={() => {
                          convertPurchaseRequestToRFQ(item);
                        }}
                        disabled={
                          !item.items ||
                          item.items.length === 0 ||
                          item.status === "CONVERTED"
                        }
                      >
                        Convert to RFQ
                      </button>


                          <button
                              type="button"
                              className="delete-button"
                              onClick={() => {
                                deletePurchaseRequest(item.id);
                              }}
                            >
                              Delete
                            </button>

                        </div>
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </section>
  );
};

// =========================================
// RENDER PURCHASE ORDERS
// =========================================

const renderPurchaseOrders = () => {
  return (
    <section className="dashboard">

      {purchaseOrderMessage && (
        <div
          className={`message-box ${
            purchaseOrderMessage.includes("❌")
              ? "message-error"
              : "message-success"
          }`}
        >
          {purchaseOrderMessage}
        </div>
      )}

      <div className="content-card">

        <div className="card-header">

          <div>
            <h2>Purchase Orders</h2>

            <p>
              Manage project purchase orders
            </p>
          </div>

          <div className="header-actions">

            <RefreshButton
              onRefresh={loadPurchaseOrders}
            />

            <button
              type="button"
              className="add-button"
            
             onClick={async () => {
              setEditingPurchaseOrderId(null);

              setPurchaseOrderForm({
                poNo: "",
                poDate: new Date()
                  .toISOString()
                  .split("T")[0],
                vendorId: "",
                projectId: "",
                rfqId: "",
                discount: 0,
                transportCost: 0,
                notes: "",
              });

              setPurchaseOrderItems([]);
              setPurchaseOrderMessage("");

              // Load required dropdown data
              await Promise.all([
                loadRFQs(),
                loadMaterials(),
              ]);

              setShowPurchaseOrderModal(true);
            }}
              
            >
              <Plus size={18} />
              Add Purchase Order
            </button>

          </div>

        </div>


        {purchaseOrderLoading ? (

          <div className="loading-state">
            Loading purchase orders...
          </div>

        ) : purchaseOrders.length === 0 ? (

          <div className="empty-state">

            <ClipboardList size={50} />

            <h3>No Purchase Orders Found</h3>

            <p>
              Your purchase order list is currently empty.
            </p>

            <button
              type="button"
              className="empty-add-button"

              onClick={() => {
                setEditingPurchaseOrderId(null);

                setPurchaseOrderForm({
                  poNo: "",
                  poDate: new Date()
                    .toISOString()
                    .split("T")[0],
                  vendorId: "",
                  projectId: "",
                  rfqId: "",
                  discount: 0,
                  transportCost: 0,
                  notes: "",
                });

                setPurchaseOrderItems([]);

                setPurchaseOrderMessage("");

                setShowPurchaseOrderModal(true);
              }}
              
            >
              <Plus size={18} />
              Add Your First Purchase Order
            </button>

          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>PO No</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Vendor</th>
                  <th>RFQ</th>
                  <th>Status</th>
                  <th>Grand Total</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {purchaseOrders.map(
                  (po) => (
                    <tr key={po.id}>

                      <td>
                        #{po.id}
                      </td>

                      <td>
                        <strong>
                          {po.poNo}
                        </strong>
                      </td>

                      <td>
                        {po.poDate
                          ? new Date(
                              po.poDate
                            ).toLocaleDateString(
                              "en-GB"
                            )
                          : "-"}
                      </td>

                      <td>
                        {po.project?.name || "-"}
                      </td>

                      <td>
                        {po.vendor?.companyName ||
                          po.vendor?.name ||
                          "-"}
                      </td>

                      <td>
                        {po.rfq?.rfqNo || "-"}
                      </td>

                      <td>
                      <div className="purchase-order-status-cell">

                        <span className="status-badge">
                          {po.status || "-"}
                        </span>

                        {getNextPurchaseOrderStatuses(
                          po.status
                        ).length > 0 && (
                          <select
                            value=""
                            onChange={(e) => {
                              const newStatus =
                                e.target.value;

                              if (!newStatus) {
                                return;
                              }

                              handlePurchaseOrderStatusUpdate(
                                po.id,
                                newStatus
                              );
                            }}
                          >
                            <option value="">
                              Change Status
                            </option>

                            {getNextPurchaseOrderStatuses(
                              po.status
                            ).map((status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {status}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>

                      <td className="money">
                        ৳{" "}
                        {Number(
                          po.grandTotal || 0
                        ).toLocaleString(
                          "en-BD"
                        )}
                      </td>

                      <td>

                        <div className="purchase-order-actions">
                          
                          <button
                            type="button"
                            className="view-button"
                            onClick={() => {
                              viewPurchaseOrder(
                                po.id
                              );
                            }}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="edit-button"
                            onClick={() => {
                              editPurchaseOrder(po.id);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => {
                              handleDeletePurchaseOrder(po.id);
                            }}
                          >
                            Delete
                          </button>

                         {po.status === "COMPLETED" && !po.purchaseId && (
                          <button
                            type="button"
                            className="convert-button"
                            onClick={() => {
                              handleConvertPurchaseOrder(po.id);
                            }}
                          >
                            Convert
                          </button>
                        )}


                        </div>

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </section>
  );
};

const renderRFQs = () => {
  return (
    <section className="dashboard">

      <div className="content-card">

        <div className="card-header">

          <div>
            <h2>RFQ</h2>
            <p>Request for Quotation</p>
          </div>

          <div className="header-actions">

            <button
              type="button"
              className="refresh-button"
              onClick={loadRFQs}
            >
              ↻ Refresh
            </button>

            <button
              type="button"
              className="add-button"
              onClick={() => {
                setRfqForm({
                  rfqNo: "",
                  rfqDate: new Date()
                    .toISOString()
                    .split("T")[0],
                  projectId: "",
                  status: "DRAFT",
                  notes: "",
                });

                setRfqMessage("");
                setShowRFQModal(true);
              }}
            >
              + Add RFQ
            </button>

          </div>

        </div>

        {rfqMessage && (
          <div className="page-message">
            {rfqMessage}
          </div>
        )}

        {rfqLoading ? (

          <div className="loading-state">
            Loading RFQs...
          </div>

        ) : rfqs.length === 0 ? (

          <div className="empty-state">
            <h3>No RFQs Found</h3>

            <p>
              There are no RFQs yet.
            </p>
          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>RFQ No</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Vendors</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {rfqs.map((rfq) => (
                  <tr key={rfq.id}>

                    <td>
                      #{rfq.id}
                    </td>

                    <td>
                      <strong>
                        {rfq.rfqNo}
                      </strong>
                    </td>

                    <td>
                      {new Date(
                        rfq.rfqDate
                      ).toLocaleDateString("en-GB")}
                    </td>

                    <td>
                      {rfq.project?.name || "-"}
                    </td>

                    <td>
                      <span className="status-badge">
                        {rfq.status}
                      </span>
                    </td>

                    <td>
                      {rfq.items?.length || 0}
                    </td>

                    <td>
                      {rfq.vendors?.length || 0}
                    </td>

                    <td>
                      <div className="purchase-request-actions">

                      <button
                          type="button"
                          className="view-button"
                          onClick={() => {
                            viewRFQ(rfq.id);
                          }}
                        >
                          View
                        </button>

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => {
                            editRFQ(rfq.id);
                          }}
                        >
                          Edit
                        </button>

                        <button
                        type="button"
                        className="delete-button"
                        onClick={() => {
                          deleteRFQ(rfq.id);
                        }}
                      >
                        Delete
                      </button>

                      </div>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </section>
  );
};
const renderPurchaseRequestViewModal = () => {
  if (
    !showPurchaseRequestViewModal ||
    !selectedPurchaseRequest
  ) {
    return null;
  }

  const request = selectedPurchaseRequest;

  return (
    <div
      className="modal-overlay"
      onClick={() =>
        setShowPurchaseRequestViewModal(false)
      }
    >
      <div
        className="modal-container purchase-request-view-modal"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="modal-header">
          <div>
            <h2>
              {request.requestNo}
            </h2>

            <p>
              Purchase Request Details
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={() =>
              setShowPurchaseRequestViewModal(false)
            }
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">

          {/* INFO GRID */}
          <div className="purchase-request-info-grid">

            <div className="purchase-request-info-card">
              <span>Request No</span>
              <strong>
                {request.requestNo}
              </strong>
            </div>

            <div className="purchase-request-info-card">
              <span>Project</span>
              <strong>
                {request.project?.name || "-"}
              </strong>
            </div>

            <div className="purchase-request-info-card">
              <span>Status</span>
              <strong>
                {request.status}
              </strong>
            </div>

            <div className="purchase-request-info-card">
              <span>Priority</span>
              <strong>
                {request.priority}
              </strong>
            </div>

            <div className="purchase-request-info-card">
              <span>Request Date</span>
              <strong>
                {new Date(
                  request.requestDate
                ).toLocaleDateString("en-GB")}
              </strong>
            </div>

            <div className="purchase-request-info-card">
              <span>Total Items</span>
              <strong>
                {request.items?.length || 0}
              </strong>
            </div>

          </div>

          {/* ITEMS */}
          <div className="purchase-request-items-section">

            <div className="purchase-request-section-header">
              <div>
                <h3>Request Items</h3>
                <p>
                  Materials requested for this purchase request
                </p>
              </div>
            </div>

            {request.items?.length > 0 ? (

              <div className="table-wrapper">
                <table>

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Required Date</th>
                      <th>Notes</th>
                    </tr>
                  </thead>

                  <tbody>
                    {request.items.map(
                      (item) => (
                        <tr key={item.id}>

                          <td>
                            #{item.id}
                          </td>

                          <td>
                            <strong>
                              {item.material?.name ||
                                "-"}
                            </strong>

                            <small>
                              {item.material?.code ||
                                "-"}
                            </small>
                          </td>

                          <td>
                            {item.quantity}
                          </td>

                          <td>
                            {item.unit}
                          </td>

                          <td>
                            {item.requiredDate
                              ? new Date(
                                  item.requiredDate
                                ).toLocaleDateString(
                                  "en-GB"
                                )
                              : "-"}
                          </td>

                          <td>
                            {item.notes || "-"}
                          </td>

                        </tr>
                      )
                    )}
                  </tbody>

                </table>
              </div>

            ) : (

              <div className="purchase-request-empty-items">
                <h4>No items added yet</h4>
                <p>
                  This purchase request does not have
                  any material items.
                </p>
              </div>

            )}

          </div>

          {/* NOTES */}
          <div className="purchase-request-notes-section">

            <span>Notes</span>

            <div className="purchase-request-notes-box">
              {request.notes || "No notes available"}
            </div>

          </div>

        </div>

        {/* FOOTER */}
        <div className="modal-footer">

          <button
            type="button"
            className="cancel-button"
            onClick={() =>
              setShowPurchaseRequestViewModal(false)
            }
          >
            Close
          </button>

        </div>

      </div>
    </div>
  );
};


const renderPurchaseRequestEditModal = () => {
  if (!showPurchaseRequestEditModal) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (!savingPurchaseRequestEdit) {
          setShowPurchaseRequestEditModal(false);
        }
      }}
    >

      <div
        className="modal-container purchase-request-view-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="modal-header">

          <div>
            <h2>
              Edit Purchase Request
            </h2>

            <p>
              Update purchase request information
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={() => {
              if (
                !savingPurchaseRequestEdit
              ) {
                setShowPurchaseRequestEditModal(
                  false
                );
              }
            }}
          >
            ×
          </button>

        </div>


        {/* BODY */}

        <div className="modal-body">

          {purchaseRequestMessage && (
            <div className="page-message">
              {purchaseRequestMessage}
            </div>
          )}


          {/* REQUEST INFORMATION */}

          <div className="form-grid">

            <div className="form-group">

              <label>
                Request No *
              </label>

              <input
                type="text"
                value={
                  purchaseRequestEditForm.requestNo
                }
                onChange={(e) =>
                  setPurchaseRequestEditForm({
                    ...purchaseRequestEditForm,
                    requestNo:
                      e.target.value,
                  })
                }
              />

            </div>


            <div className="form-group">

              <label>
                Request Date *
              </label>

              <input
                type="date"
                value={
                  purchaseRequestEditForm.requestDate
                }
                onChange={(e) =>
                  setPurchaseRequestEditForm({
                    ...purchaseRequestEditForm,
                    requestDate:
                      e.target.value,
                  })
                }
              />

            </div>


            <div className="form-group">

              <label>
                Project *
              </label>

              <select
                value={
                  purchaseRequestEditForm.projectId
                }
                onChange={(e) =>
                  setPurchaseRequestEditForm({
                    ...purchaseRequestEditForm,
                    projectId:
                      e.target.value,
                  })
                }
              >

                <option value="">
                  Select Project
                </option>

                {projects.map(
                  (project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  )
                )}

              </select>

            </div>


            <div className="form-group">

              <label>
                Status
              </label>

              <select
                value={
                  purchaseRequestEditForm.status
                }
                onChange={(e) =>
                  setPurchaseRequestEditForm({
                    ...purchaseRequestEditForm,
                    status:
                      e.target.value,
                  })
                }
              >

                <option value="DRAFT">
                  DRAFT
                </option>

                <option value="PENDING">
                  PENDING
                </option>

                <option value="APPROVED">
                  APPROVED
                </option>

                <option value="REJECTED">
                  REJECTED
                </option>

                <option value="CONVERTED">
                  CONVERTED
                </option>

                <option value="CANCELLED">
                  CANCELLED
                </option>

              </select>

            </div>


            <div className="form-group">

              <label>
                Priority
              </label>

              <select
                value={
                  purchaseRequestEditForm.priority
                }
                onChange={(e) =>
                  setPurchaseRequestEditForm({
                    ...purchaseRequestEditForm,
                    priority:
                      e.target.value,
                  })
                }
              >

                <option value="LOW">
                  LOW
                </option>

                <option value="NORMAL">
                  NORMAL
                </option>

                <option value="HIGH">
                  HIGH
                </option>

                <option value="URGENT">
                  URGENT
                </option>

              </select>

            </div>

          </div>


          {/* NOTES */}

          <div className="form-group">

            <label>
              Notes
            </label>

            <textarea
              rows={4}
              value={
                purchaseRequestEditForm.notes
              }
              onChange={(e) =>
                setPurchaseRequestEditForm({
                  ...purchaseRequestEditForm,
                  notes:
                    e.target.value,
                })
              }
              placeholder="Additional purchase request information..."
            />

          </div>


          {/* REQUEST ITEMS */}

          <div className="purchase-request-items-section">

            <div className="purchase-request-section-header">

              <div>
                <h3>
                  Request Items
                </h3>

                <p>
                  Materials required for this purchase request
                </p>
              </div>

              <button
                type="button"
                className="add-button"
                onClick={
                  addPurchaseRequestEditItem
                }
              >
                + Add Item
              </button>

            </div>


            {purchaseRequestEditItems.length ===
            0 ? (

              <div className="purchase-request-empty-items">
                <h4>
                  No items added yet
                </h4>

                <p>
                  Add at least one material item.
                </p>
              </div>

            ) : (

              purchaseRequestEditItems.map(
                (item, index) => (

                  <div
                    key={
                      item.id ||
                      `new-${index}`
                    }
                    style={{
                      border:
                        "1px solid #e2e8f0",
                      borderRadius:
                        "10px",
                      padding:
                        "16px",
                      marginBottom:
                        "16px",
                    }}
                  >

                    <div className="form-grid">

                      {/* MATERIAL */}

                      <div className="form-group">

                        <label>
                          Material *
                        </label>

                        <select
                          value={
                            item.materialId
                          }
                          onChange={(e) =>
                            handlePurchaseRequestEditItemChange(
                              index,
                              "materialId",
                              e.target.value
                            )
                          }
                        >

                          <option value="">
                            Select Material
                          </option>

                          {materials.map(
                            (material) => (

                              <option
                                key={
                                  material.id
                                }
                                value={
                                  material.id
                                }
                              >
                                {
                                  material.name
                                }{" "}
                                (
                                {
                                  material.code
                                }
                                )
                              </option>

                            )
                          )}

                        </select>

                      </div>


                      {/* QUANTITY */}

                      <div className="form-group">

                        <label>
                          Quantity *
                        </label>

                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={
                            item.quantity
                          }
                          onChange={(e) =>
                            handlePurchaseRequestEditItemChange(
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                          placeholder="Enter quantity"
                        />

                      </div>


                      {/* UNIT */}

                      <div className="form-group">

                        <label>
                          Unit *
                        </label>

                        <input
                          type="text"
                          value={
                            item.unit
                          }
                          onChange={(e) =>
                            handlePurchaseRequestEditItemChange(
                              index,
                              "unit",
                              e.target.value
                            )
                          }
                          placeholder="e.g. Sheet, SQFT, Piece"
                        />

                      </div>


                      {/* REQUIRED DATE */}

                      <div className="form-group">

                        <label>
                          Required Date
                        </label>

                        <input
                          type="date"
                          value={
                            item.requiredDate
                          }
                          onChange={(e) =>
                            handlePurchaseRequestEditItemChange(
                              index,
                              "requiredDate",
                              e.target.value
                            )
                          }
                        />

                      </div>

                    </div>


                    {/* ITEM NOTES */}

                    <div className="form-group">

                      <label>
                        Item Notes
                      </label>

                      <textarea
                        rows={3}
                        value={
                          item.notes
                        }
                        onChange={(e) =>
                          handlePurchaseRequestEditItemChange(
                            index,
                            "notes",
                            e.target.value
                          )
                        }
                        placeholder="Optional item notes..."
                      />

                    </div>


                    {/* DELETE */}

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() =>
                        removePurchaseRequestEditItem(
                          index
                        )
                      }
                    >
                      Delete Item
                    </button>

                  </div>

                )
              )

            )}

          </div>

        </div>


        {/* FOOTER */}

        <div className="modal-footer">

          <button
            type="button"
            className="cancel-button"
            onClick={() => {
              if (
                !savingPurchaseRequestEdit
              ) {
                setShowPurchaseRequestEditModal(
                  false
                );
              }
            }}
            disabled={
              savingPurchaseRequestEdit
            }
          >
            Cancel
          </button>


          <button
            type="button"
            className="save-button"
            onClick={
              savePurchaseRequestEdit
            }
            disabled={
              savingPurchaseRequestEdit
            }
          >
            {savingPurchaseRequestEdit
              ? "Updating..."
              : "Update Purchase Request"}
          </button>

        </div>

      </div>

    </div>
  );
};

const renderPurchaseRequestModal = () => {
  if (!showPurchaseRequestModal) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-container">

        <div className="modal-header">
          <div>
            <h2>Add Purchase Request</h2>
            <p>Create a new material purchase request</p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={() =>
              setShowPurchaseRequestModal(false)
            }
          >
            ×
          </button>
        </div>

        <div className="modal-body">

          {purchaseRequestMessage && (
            <div className="page-message">
              {purchaseRequestMessage}
            </div>
          )}

          <div className="form-grid">

            <div className="form-group">
              <label>
                Request No *
              </label>

              <input
                type="text"
                value={purchaseRequestForm.requestNo}
                onChange={(e) =>
                  setPurchaseRequestForm({
                    ...purchaseRequestForm,
                    requestNo: e.target.value,
                  })
                }
                placeholder="PR-0001"
              />
            </div>

            <div className="form-group">
              <label>
                Request Date *
              </label>

              <input
                type="date"
                value={
                  purchaseRequestForm.requestDate
                }
                onChange={(e) =>
                  setPurchaseRequestForm({
                    ...purchaseRequestForm,
                    requestDate: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>
                Project *
              </label>

              <select
                value={
                  purchaseRequestForm.projectId
                }
                onChange={(e) =>
                  setPurchaseRequestForm({
                    ...purchaseRequestForm,
                    projectId: e.target.value,
                  })
                }
              >
                <option value="">
                  Select Project
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Status
              </label>

              <select
                value={
                  purchaseRequestForm.status
                }
                onChange={(e) =>
                  setPurchaseRequestForm({
                    ...purchaseRequestForm,
                    status: e.target.value,
                  })
                }
              >
                <option value="DRAFT">
                  DRAFT
                </option>

                <option value="PENDING">
                  PENDING
                </option>

                <option value="APPROVED">
                  APPROVED
                </option>

                <option value="REJECTED">
                  REJECTED
                </option>

                <option value="CONVERTED">
                  CONVERTED
                </option>

                <option value="CANCELLED">
                  CANCELLED
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Priority
              </label>

              <select
                value={
                  purchaseRequestForm.priority
                }
                onChange={(e) =>
                  setPurchaseRequestForm({
                    ...purchaseRequestForm,
                    priority: e.target.value,
                  })
                }
              >
                <option value="LOW">
                  LOW
                </option>

                <option value="NORMAL">
                  NORMAL
                </option>

                <option value="HIGH">
                  HIGH
                </option>

                <option value="URGENT">
                  URGENT
                </option>
              </select>
            </div>

          </div>

          <div className="form-group">
            <label>
              Notes
            </label>

            <textarea
              value={
                purchaseRequestForm.notes
              }
              onChange={(e) =>
                setPurchaseRequestForm({
                  ...purchaseRequestForm,
                  notes: e.target.value,
                })
              }
              placeholder="Additional purchase request information..."
              rows={4}
            />
          </div>

        </div>

        <div className="modal-footer">

          <button
            type="button"
            className="cancel-button"
            onClick={() =>
              setShowPurchaseRequestModal(false)
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="save-button"
            onClick={savePurchaseRequest}
            disabled={savingPurchaseRequest}
          >
            {savingPurchaseRequest
              ? "Saving..."
              : "Save Purchase Request"}
          </button>

        </div>

      </div>
    </div>
  );
};
const renderPurchaseOrderModal = () => {
  if (!showPurchaseOrderModal) {
    return null;
  }

  const totalSubtotal =
    purchaseOrderItems.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0) *
        Number(item.unitPrice || 0),
      0
    );

  const discountAmount =
    Number(purchaseOrderForm.discount || 0);

  const transportAmount =
    Number(
      purchaseOrderForm.transportCost || 0
    );

  const grandTotal =
    totalSubtotal -
    discountAmount +
    transportAmount;

  return (
    <div
      className="modal-overlay"
      onClick={() =>
        setShowPurchaseOrderModal(false)
      }
    >
      <div
        className="modal-container purchase-order-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="modal-header">
          <div>
            <h2>
              {editingPurchaseOrderId
                ? "Edit Purchase Order"
                : "Add Purchase Order"}
            </h2>

            <p>
              Create project purchase order
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={() =>
              setShowPurchaseOrderModal(false)
            }
          >
            ×
          </button>
        </div>

        {/* MESSAGE */}

        {purchaseOrderMessage && (
          <div
            className={`modal-message ${
              purchaseOrderMessage.includes("❌")
                ? "error"
                : "success"
            }`}
          >
            {purchaseOrderMessage}
          </div>
        )}

        {/* BODY */}

        <div className="modal-body">

          {/* BASIC INFORMATION */}

          <div className="form-section">

            <div className="form-section-header">
              <h3>Purchase Order Information</h3>
            </div>

            <div className="form-grid">

              {/* PO NO */}

              <div className="form-group">
                <label>
                  PO Number *
                </label>

                <input
                  type="text"
                  value={
                    purchaseOrderForm.poNo
                  }
                  onChange={(e) =>
                    setPurchaseOrderForm(
                      (prev) => ({
                        ...prev,
                        poNo:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="PO-0003"
                />
              </div>

              {/* PO DATE */}

              <div className="form-group">
                <label>
                  PO Date *
                </label>

                <input
                  type="date"
                  value={
                    purchaseOrderForm.poDate
                  }
                  onChange={(e) =>
                    setPurchaseOrderForm(
                      (prev) => ({
                        ...prev,
                        poDate:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              {/* VENDOR */}

              <div className="form-group">
                <label>
                  Vendor *
                </label>

                <select
                  value={
                    purchaseOrderForm.vendorId
                  }
                  onChange={(e) =>
                    setPurchaseOrderForm(
                      (prev) => ({
                        ...prev,
                        vendorId:
                          e.target.value,
                      })
                    )
                  }
                >
                  <option value="">
                    Select Vendor
                  </option>

                  {vendors.map(
                    (vendor) => (
                      <option
                        key={vendor.id}
                        value={vendor.id}
                      >
                        {vendor.companyName ||
                          vendor.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* PROJECT */}

              <div className="form-group">
                <label>
                  Project
                </label>

                <select
                  value={
                    purchaseOrderForm.projectId
                  }
                  onChange={(e) =>
                    setPurchaseOrderForm(
                      (prev) => ({
                        ...prev,
                        projectId:
                          e.target.value,
                      })
                    )
                  }
                >
                  <option value="">
                    Select Project
                  </option>

                  {projects.map(
                    (project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* RFQ */}

              <div className="form-group">
                <label>
                  RFQ
                </label>

                <select
                  value={
                    purchaseOrderForm.rfqId
                  }
                  onChange={(e) =>
                    setPurchaseOrderForm(
                      (prev) => ({
                        ...prev,
                        rfqId:
                          e.target.value,
                      })
                    )
                  }
                >
                  <option value="">
                    Select RFQ
                  </option>

                  {rfqs
                    .filter(
                      (rfq) =>
                        rfq.status ===
                        "AWARDED"
                    )
                    .map(
                      (rfq) => (
                        <option
                          key={rfq.id}
                          value={rfq.id}
                        >
                          {rfq.rfqNo}
                        </option>
                      )
                    )}
                </select>
              </div>

            </div>

          </div>

          {/* ITEMS */}

          <div className="form-section">

            <div className="form-section-header">
              <div>
                <h3>Purchase Order Items</h3>

                <p>
                  Materials included in this PO
                </p>
              </div>

              <button
                type="button"
                className="add-button"
                onClick={() =>
                  setPurchaseOrderItems(
                    (prev) => [
                      ...prev,
                      {
                        materialId: "",
                        quantity: "",
                        unit: "",
                        unitPrice: "",
                        notes: "",
                      },
                    ]
                  )
                }
              >
                <Plus size={18} />
                Add Item
              </button>
            </div>

            {purchaseOrderItems.length ===
            0 ? (

              <div className="empty-state">
                <ClipboardList
                  size={40}
                />

                <h4>
                  No items added
                </h4>

                <p>
                  Add at least one material
                  item to this purchase order.
                </p>
              </div>

            ) : (

              <div className="table-wrapper">

                <table>

                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>

                    {purchaseOrderItems.map(
                      (item, index) => {

                        const itemTotal =
                          Number(
                            item.quantity || 0
                          ) *
                          Number(
                            item.unitPrice || 0
                          );

                        return (
                          <tr
                            key={index}
                          >

                            {/* MATERIAL */}

                            <td>
                              <select
                                value={String(item.materialId || "")}

                                onChange={(e) => {
                                  const materialId =
                                    e.target.value;

                                  const material =
                                    materials.find(
                                      (m) =>
                                        String(
                                          m.id
                                        ) ===
                                        String(
                                          materialId
                                        )
                                    );

                                  setPurchaseOrderItems(
                                    (prev) =>
                                      prev.map(
                                        (
                                          current,
                                          i
                                        ) =>
                                          i === index
                                            ? {
                                                ...current,
                                                materialId,
                                                unit:
                                                  material?.unit ||
                                                  "",
                                              }
                                            : current
                                      )
                                  );
                                }}
                              >

                                <option value="">
                                  Select Material
                                </option>


                                    {[
                                      ...(item.material
                                        ? [item.material]
                                        : []),

                                      ...materials.filter(
                                        (material) =>
                                          String(material.id) !==
                                          String(item.materialId)
                                      ),
                                    ].map((material) => (
                                      <option
                                        key={material.id}
                                        value={String(material.id)}
                                      >
                                        {material.name}
                                      </option>
                                    ))}



                              </select>
                            </td>

                            {/* QUANTITY */}

                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.quantity
                                }
                                onChange={(e) =>
                                  setPurchaseOrderItems(
                                    (prev) =>
                                      prev.map(
                                        (
                                          current,
                                          i
                                        ) =>
                                          i === index
                                            ? {
                                                ...current,
                                                quantity:
                                                  e.target
                                                    .value,
                                              }
                                            : current
                                      )
                                  )
                                }
                              />
                            </td>

                            {/* UNIT */}

                            <td>
                              <input
                                type="text"
                                value={
                                  item.unit
                                }
                                onChange={(e) =>
                                  setPurchaseOrderItems(
                                    (prev) =>
                                      prev.map(
                                        (
                                          current,
                                          i
                                        ) =>
                                          i === index
                                            ? {
                                                ...current,
                                                unit:
                                                  e.target
                                                    .value,
                                              }
                                            : current
                                      )
                                  )
                                }
                              />
                            </td>

                            {/* UNIT PRICE */}

                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.unitPrice
                                }
                                onChange={(e) =>
                                  setPurchaseOrderItems(
                                    (prev) =>
                                      prev.map(
                                        (
                                          current,
                                          i
                                        ) =>
                                          i === index
                                            ? {
                                                ...current,
                                                unitPrice:
                                                  e.target
                                                    .value,
                                              }
                                            : current
                                      )
                                  )
                                }
                              />
                            </td>

                            {/* TOTAL */}

                            <td className="money">
                              ৳{" "}
                              {itemTotal.toLocaleString(
                                "en-BD"
                              )}
                            </td>

                            {/* NOTES */}

                            <td>
                              <input
                                type="text"
                                value={
                                  item.notes
                                }
                                onChange={(e) =>
                                  setPurchaseOrderItems(
                                    (prev) =>
                                      prev.map(
                                        (
                                          current,
                                          i
                                        ) =>
                                          i === index
                                            ? {
                                                ...current,
                                                notes:
                                                  e.target
                                                    .value,
                                              }
                                            : current
                                      )
                                  )
                                }
                              />
                            </td>

                            {/* DELETE */}

                            <td>

                              <button
                                type="button"
                                className="delete-button"
                                onClick={() =>
                                  setPurchaseOrderItems(
                                    (prev) =>
                                      prev.filter(
                                        (
                                          _,
                                          i
                                        ) =>
                                          i !== index
                                      )
                                  )
                                }
                              >
                                Delete
                              </button>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

          {/* FINANCIAL SUMMARY */}

          <div className="form-section">

            <div className="form-grid">

              <div className="form-group">
                <label>
                  Discount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    purchaseOrderForm.discount
                  }
                  onChange={(e) =>
                    setPurchaseOrderForm(
                      (prev) => ({
                        ...prev,
                        discount:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Transport Cost
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    purchaseOrderForm.transportCost
                  }
                  onChange={(e) =>
                    setPurchaseOrderForm(
                      (prev) => ({
                        ...prev,
                        transportCost:
                          e.target.value,
                      })
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Paid Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    purchaseOrderForm.paidAmount
                  }
                  onChange={(e) =>
                    setPurchaseOrderForm(
                      (prev) => ({
                        ...prev,
                        paidAmount:
                          e.target.value,
                      })
                    )
                  }
                  placeholder="0"
                />
              </div>

            </div>

            <div className="purchase-order-total-summary">

              <div>
                <span>Subtotal</span>

                <strong>
                  ৳{" "}
                  {totalSubtotal.toLocaleString(
                    "en-BD"
                  )}
                </strong>
              </div>

              <div>
                <span>Discount</span>

                <strong>
                  ৳{" "}
                  {discountAmount.toLocaleString(
                    "en-BD"
                  )}
                </strong>
              </div>

              <div>
                <span>Transport</span>

                <strong>
                  ৳{" "}
                  {transportAmount.toLocaleString(
                    "en-BD"
                  )}
                </strong>
              </div>

              <div className="grand-total">
                <span>Grand Total</span>

                <strong>
                  ৳{" "}
                  {grandTotal.toLocaleString(
                    "en-BD"
                  )}
                </strong>
              </div>


              <div>
                <span>Paid</span>

                <strong>
                  ৳{" "}
                  {(
                    Number(
                      purchaseOrderForm.paidAmount
                    ) || 0
                  ).toLocaleString("en-BD")}
                </strong>
              </div>

              <div>
                <span>Due</span>

                <strong>
                  ৳{" "}
                  {Math.max(
                    0,
                    grandTotal -
                      (Number(
                        purchaseOrderForm.paidAmount
                      ) || 0)
                  ).toLocaleString("en-BD")}
                </strong>
              </div>



            </div>

          </div>

          {/* NOTES */}

          <div className="form-group">

            <label>
              Notes
            </label>

            <textarea
              rows="3"
              value={
                purchaseOrderForm.notes
              }
              onChange={(e) =>
                setPurchaseOrderForm(
                  (prev) => ({
                    ...prev,
                    notes:
                      e.target.value,
                  })
                )
              }
              placeholder="Optional notes..."
            />

          </div>

        </div>

        {/* FOOTER */}

        <div className="modal-footer">

          <button
            type="button"
            className="cancel-button"
            onClick={() =>
              setShowPurchaseOrderModal(false)
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="add-button"
            disabled={
              savingPurchaseOrder
            }
            onClick={savePurchaseOrder}
          >
            {savingPurchaseOrder
              ? "Saving..."
              : editingPurchaseOrderId
              ? "Update Purchase Order"
              : "Save Purchase Order"}
          </button>

        </div>

      </div>
    </div>
  );
};

const renderRFQModal = () => {
  if (!showRFQModal) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onClick={() =>
        setShowRFQModal(false)
      }
    >
      <div
        className="modal-container"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="modal-header">
          <div>
            <h2>Add RFQ</h2>

            <p>
              Create a new Request for Quotation
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={() =>
              setShowRFQModal(false)
            }
          >
            ×
          </button>
        </div>

        <div className="modal-body">

          {rfqMessage && (
            <div className="page-message">
              {rfqMessage}
            </div>
          )}

          <div className="form-grid">

            <div className="form-group">
              <label>
                RFQ No *
              </label>

              <input
                type="text"
                value={rfqForm.rfqNo}
                onChange={(e) =>
                  setRfqForm({
                    ...rfqForm,
                    rfqNo:
                      e.target.value,
                  })
                }
                placeholder="RFQ-0002"
              />
            </div>

            <div className="form-group">
              <label>
                RFQ Date *
              </label>

              <input
                type="date"
                value={rfqForm.rfqDate}
                onChange={(e) =>
                  setRfqForm({
                    ...rfqForm,
                    rfqDate:
                      e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>
                Project *
              </label>

              <select
                value={rfqForm.projectId}
                onChange={(e) =>
                  setRfqForm({
                    ...rfqForm,
                    projectId:
                      e.target.value,
                  })
                }
              >
                <option value="">
                  Select Project
                </option>

                {projects.map(
                  (project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="form-group">
              <label>
                Status
              </label>

              <select
                value={rfqForm.status}
                onChange={(e) =>
                  setRfqForm({
                    ...rfqForm,
                    status:
                      e.target.value,
                  })
                }
              >
                <option value="DRAFT">
                  DRAFT
                </option>

                <option value="SENT">
                  SENT
                </option>

                <option value="CLOSED">
                  CLOSED
                </option>

                <option value="AWARDED">
                  AWARDED
                </option>

                <option value="CANCELLED">
                  CANCELLED
                </option>
              </select>
            </div>

          </div>

          <div className="form-group">
            <label>
              Notes
            </label>

            <textarea
              rows={4}
              value={rfqForm.notes}
              onChange={(e) =>
                setRfqForm({
                  ...rfqForm,
                  notes:
                    e.target.value,
                })
              }
              placeholder="Additional RFQ information..."
            />
          </div>

        </div>

        <div className="modal-footer">

          <button
            type="button"
            className="cancel-button"
            onClick={() =>
              setShowRFQModal(false)
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="save-button"
            onClick={saveRFQ}
            disabled={savingRFQ}
          >
            {savingRFQ
              ? "Saving..."
              : "Save RFQ"}
          </button>

        </div>

      </div>
    </div>
  );
};

{/* =========================================
    PRICE COMPARISON
========================================= */}

{rfqPriceComparison && (
  <div className="rfq-price-comparison-section">

    <div className="rfq-section-header">
      <div>
        <h3>Price Comparison</h3>
        <p>
          Compare vendor quotations for this RFQ
        </p>
      </div>
    </div>

    {loadingRFQPriceComparison ? (

      <div className="rfq-price-loading">
        Loading price comparison...
      </div>

    ) : (

      <>
        {/* ==============================
            SUMMARY
        ============================== */}

        <div className="rfq-price-summary">

          <div>
            <span>Total Vendors</span>
            <strong>
              {rfqPriceComparison.vendors?.length || 0}
            </strong>
          </div>

          <div>
            <span>Lowest Quote</span>
            <strong>
              ৳
              {Number(
              
                rfqPriceComparison.lowestQuote
              ).toLocaleString("en-BD")}
            </strong>
          </div>

          <div>
            <span>Highest Quote</span>
            <strong>
              ৳
              {Number(
               rfqPriceComparison.highestQuote

              ).toLocaleString("en-BD")}
            </strong>
          </div>

          <div>
            <span>Saving</span>
            <strong>
              ৳
              {Number(
              rfqPriceComparison.savingAmount
              ).toLocaleString("en-BD")}
            </strong>
          </div>

        </div>

        {/* ==============================
            BEST VENDOR
        ============================== */}

        {rfqPriceComparison.bestVendor && (
          <div className="rfq-best-vendor">

            <span>Best Vendor</span>

            <strong>
              {rfqPriceComparison.bestVendor.vendorName}
            </strong>

            <small>
              {rfqPriceComparison.bestVendor.companyName}
            </small>

            <b>
              ৳
              {Number(
                rfqPriceComparison.bestVendor.quotedTotal || 0
              ).toLocaleString("en-BD")}
            </b>

          </div>
        )}

        {/* ==============================
            VENDOR COMPARISON TABLE
        ============================== */}

        {rfqPriceComparison.vendors?.length > 0 && (
          <div className="table-wrapper">

            <table>

              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Vendor</th>
                  <th>Company</th>
                  <th>Quoted Total</th>
                </tr>
              </thead>

              <tbody>

                {rfqPriceComparison.vendors.map(
                  (vendor) => (

                    <tr key={vendor.rfqVendorId}>

                      <td>
                        #{vendor.rank}
                      </td>

                      <td>
                        <strong>
                          {vendor.vendorName}
                        </strong>
                      </td>

                      <td>
                        {vendor.companyName || "-"}
                      </td>

                      <td>
                        ৳
                        {Number(
                          vendor.quotedTotal || 0
                        ).toLocaleString("en-BD")}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </>
    )}

  </div>
)}


const renderRFQViewModal = () => {
  if (
    !showRFQViewModal ||
    !selectedRFQ
  ) {
    return null;
  }

  const rfq = selectedRFQ;

  return (
    <div
      className="modal-overlay"
      onClick={() =>
        setShowRFQViewModal(false)
      }
    >
      <div
        className="modal-container rfq-view-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* HEADER */}
        <div className="modal-header">
          <div>
            <h2>
              {rfq.rfqNo}
            </h2>

            <p>
              RFQ Details
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={() =>
              setShowRFQViewModal(false)
            }
          >
            ×
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">

          {/* RFQ INFO */}
          <div className="rfq-info-grid">

            <div className="rfq-info-card">
              <span>RFQ No</span>
              <strong>
                {rfq.rfqNo}
              </strong>
            </div>

            <div className="rfq-info-card">
              <span>Project</span>
              <strong>
                {rfq.project?.name || "-"}
              </strong>
            </div>

            <div className="rfq-info-card">
              <span>Status</span>
              <strong>
                {rfq.status}
              </strong>
            </div>

            <div className="rfq-info-card">
              <span>RFQ Date</span>
              <strong>
                {new Date(
                  rfq.rfqDate
                ).toLocaleDateString(
                  "en-GB"
                )}
              </strong>
            </div>

            <div className="rfq-info-card">
              <span>Total Items</span>
              <strong>
                {rfq.items?.length || 0}
              </strong>
            </div>

            <div className="rfq-info-card">
              <span>Total Vendors</span>
              <strong>
                {rfq.vendors?.length || 0}
              </strong>
            </div>

          </div>

          {/* ITEMS */}
          <div className="rfq-detail-section">

            <div className="rfq-section-header">
              <h3>
                RFQ Items
              </h3>

              <p>
                Materials requested in this RFQ
              </p>
            </div>

            {rfq.items?.length > 0 ? (

              <div className="table-wrapper">
                <table>

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rfq.items.map(
                      (item) => (
                        <tr key={item.id}>

                          <td>
                            #{item.id}
                          </td>

                          <td>
                            <strong>
                              {item.material?.name ||
                                "-"}
                            </strong>

                            <small>
                              {item.material?.code ||
                                "-"}
                            </small>
                          </td>

                          <td>
                            {item.quantity}
                          </td>

                          <td>
                            {item.unit}
                          </td>

                          <td>
                            {item.notes || "-"}
                          </td>
                 

                        </tr>
                      )
                    )}
                  </tbody>

                </table>
              </div>

            ) : (

              <div className="rfq-empty-section">
                No items added yet
              </div>

            )}

          </div>

          {/* VENDORS */}
          <div className="rfq-detail-section">

            <div className="rfq-section-header">
              <h3>
                Vendors
              </h3>

              <p>
                Vendor quotations for this RFQ
              </p>
            </div>

            {rfq.vendors?.length > 0 ? (

              <div className="table-wrapper">
                <table>

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Vendor</th>
                      <th>Company</th>
                      <th>Quoted Total</th>
                      <th>Notes</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rfq.vendors.map(
                      (item) => (
                        <tr key={item.id}>

                          <td>
                            #{item.id}
                          </td>

                          <td>
                            <strong>
                              {item.vendor?.name ||
                                "-"}
                            </strong>
                          </td>

                          <td>
                            {item.vendor?.companyName ||
                              "-"}
                          </td>

                          <td>
                            ৳{" "}
                            {Number(
                              item.quotedTotal || 0
                            ).toLocaleString(
                              "en-BD"
                            )}
                          </td>

                          <td>
                            {item.notes || "-"}
                          </td>

                        <td>
                          <button
                            type="button"
                            className="save-button"
                            onClick={() =>
                              awardRFQ(
                                rfq.id,
                                item.id
                              )
                            }
                            disabled={
                                rfq.status === "AWARDED" &&
                                rfqPriceComparison?.bestVendor?.rfqVendorId === item.id
                              }
                           >

                           {rfq.status === "AWARDED" &&
                            rfqPriceComparison?.bestVendor?.rfqVendorId === item.id
                              ? "Awarded"
                              : "Award"}

                          </button>
                        </td>

                        </tr>
                      )
                    )}
                  </tbody>

                </table>
              </div>

            ) : (

              <div className="rfq-empty-section">
                No vendors added yet
              </div>

            )}

          </div>

        {/* =========================================
            PRICE COMPARISON
        ========================================= */}

        <div className="rfq-detail-section">

          <div className="rfq-section-header">
            <h3>
              Price Comparison
            </h3>

            <p>
              Compare vendor quotations for this RFQ
            </p>
          </div>

          {loadingRFQPriceComparison ? (

            <div className="rfq-empty-section">
              Loading price comparison...
            </div>

          ) : rfqPriceComparison ? (

            <>

              {/* SUMMARY */}

              <div className="rfq-info-grid">

                <div className="rfq-info-card">
                  <span>Total Vendors</span>
                  <strong>
                    {rfqPriceComparison.vendors?.length || 0}
                  </strong>
                </div>

                <div className="rfq-info-card">
                  <span>Lowest Quote</span>
                  <strong>
                    ৳{" "}
                    {Number(
                      rfqPriceComparison.lowestQuote
                    ).toLocaleString("en-BD")}
                  </strong>
                </div>

                <div className="rfq-info-card">
                  <span>Highest Quote</span>
                  <strong>
                    ৳{" "}
                    {Number(
                     rfqPriceComparison.highestQuote
                    ).toLocaleString("en-BD")}
                  </strong>
                </div>

                <div className="rfq-info-card">
                  <span>Saving</span>
                  <strong>
                    ৳{" "}
                    {Number(
                      rfqPriceComparison.savingAmount || 0
                    ).toLocaleString("en-BD")}
                  </strong>
                </div>

              </div>


              {/* BEST VENDOR */}

              {rfqPriceComparison.bestVendor && (

                <div className="rfq-notes-section">

                  <span>
                    Best Vendor
                  </span>

                  <div className="rfq-notes-box">

                    <strong>
                      {rfqPriceComparison.bestVendor.vendorName}
                    </strong>

                    <br />

                    <span>
                      {rfqPriceComparison.bestVendor.companyName}
                    </span>

                    <br />

                    <strong>
                      ৳{" "}
                      {Number(
                        rfqPriceComparison.bestVendor.quotedTotal || 0
                      ).toLocaleString("en-BD")}
                    </strong>

                  </div>

                </div>

              )}


              {/* VENDOR COMPARISON TABLE */}

              {rfqPriceComparison.vendors?.length > 0 && (

                <div className="table-wrapper">

                  <table>

                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Vendor</th>
                        <th>Company</th>
                        <th>Quoted Total</th>
                      </tr>
                    </thead>

                    <tbody>

                      {rfqPriceComparison.vendors.map(
                        (vendor) => (

                          <tr key={vendor.rfqVendorId}>

                            <td>
                              #{vendor.rank}
                            </td>

                            <td>
                              <strong>
                                {vendor.vendorName}
                              </strong>
                            </td>

                            <td>
                              {vendor.companyName || "-"}
                            </td>

                            <td>
                              ৳{" "}
                              {Number(
                                vendor.quotedTotal || 0
                              ).toLocaleString(
                                "en-BD"
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </>

          ) : (

            <div className="rfq-empty-section">
              No price comparison available
            </div>

          )}

        </div>

          {/* NOTES */}
          <div className="rfq-notes-section">

            <span>
              Notes
            </span>

            <div className="rfq-notes-box">
              {rfq.notes ||
                "No notes available"}
            </div>

          </div>

        </div>

        {/* FOOTER */}
        <div className="modal-footer">

      <div className="modal-footer">

                      {rfq.status === "AWARDED" && (
                        <button
                          type="button"
                          className="save-button"
                          onClick={() => {
                            createPurchaseOrderFromRFQ(rfq);
                          }}
                        >
                          Create Purchase Order
                        </button>
                      )}

                      <button
                        type="button"
                        className="cancel-button"
                        onClick={() =>
                          setShowRFQViewModal(false)
                        }
                      >
                        Close
                      </button>

              </div>

        </div>

      </div>
    </div>
  );
};


const renderRFQEditModal = () => {
  if (!showRFQEditModal) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      onClick={() =>
        setShowRFQEditModal(false)
      }
    >
      <div
        className="modal-container"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="modal-header">
          <div>
            <h2>Edit RFQ</h2>
            <p>
              Update RFQ information
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={() =>
              setShowRFQEditModal(false)
            }
          >
            ×
          </button>
        </div>

        <div className="modal-body">

          {rfqMessage && (
            <div className="page-message">
              {rfqMessage}
            </div>
          )}

          <div className="form-grid">

            <div className="form-group">
              <label>
                RFQ No *
              </label>

              <input
                type="text"
                value={rfqEditForm.rfqNo}
                onChange={(e) =>
                  setRfqEditForm({
                    ...rfqEditForm,
                    rfqNo: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>
                RFQ Date *
              </label>

              <input
                type="date"
                value={rfqEditForm.rfqDate}
                onChange={(e) =>
                  setRfqEditForm({
                    ...rfqEditForm,
                    rfqDate: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>
                Project *
              </label>

              <select
                value={rfqEditForm.projectId}
                onChange={(e) =>
                  setRfqEditForm({
                    ...rfqEditForm,
                    projectId:
                      e.target.value,
                  })
                }
              >
                <option value="">
                  Select Project
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Status
              </label>

              <select
                value={rfqEditForm.status}
                onChange={(e) =>
                  setRfqEditForm({
                    ...rfqEditForm,
                    status: e.target.value,
                  })
                }
              >
                <option value="DRAFT">
                  DRAFT
                </option>

                <option value="SENT">
                  SENT
                </option>

                <option value="CLOSED">
                  CLOSED
                </option>

                <option value="AWARDED">
                  AWARDED
                </option>

                <option value="CANCELLED">
                  CANCELLED
                </option>
              </select>
            </div>

          </div>

          <div className="form-group">
            <label>
              Notes
            </label>

            <textarea
              rows={4}
              value={rfqEditForm.notes}
              onChange={(e) =>
                setRfqEditForm({
                  ...rfqEditForm,
                  notes: e.target.value,
                })
              }
            />
          </div>

            {/* =========================================
                RFQ ITEMS
            ========================================= */}

            <div className="rfq-items-section">

              <div className="rfq-section-header">
                <div>
                  <h3>RFQ Items</h3>
                  <p>
                    Materials requested in this RFQ
                  </p>
                </div>
              </div>

              {/* ==============================
                  ITEM FORM
              ============================== */}

              <div className="rfq-item-form">

                <div className="form-grid">

                  <div className="form-group">
                    <label>Material *</label>

                    <select
                      value={rfqItemForm.materialId}
                      onChange={(e) =>
                        setRfqItemForm({
                          ...rfqItemForm,
                          materialId: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select Material
                      </option>

                      {materials.map((material) => (
                        <option
                          key={material.id}
                          value={material.id}
                        >
                          {material.name} ({material.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Quantity *</label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rfqItemForm.quantity}
                      onChange={(e) =>
                        setRfqItemForm({
                          ...rfqItemForm,
                          quantity: e.target.value,
                        })
                      }
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div className="form-group">
                    <label>Unit *</label>

                    <input
                      type="text"
                      value={rfqItemForm.unit}
                      onChange={(e) =>
                        setRfqItemForm({
                          ...rfqItemForm,
                          unit: e.target.value,
                        })
                      }
                      placeholder="e.g. SQFT, Sheet, Piece"
                    />
                  </div>

                </div>

                <div className="form-group">
                  <label>Item Notes</label>

                  <textarea
                    rows={3}
                    value={rfqItemForm.notes}
                    onChange={(e) =>
                      setRfqItemForm({
                        ...rfqItemForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Optional item notes..."
                  />
                </div>

                <div className="rfq-item-form-actions">

              <button
                type="button"
                className="save-button"
                onClick={
                  editingRFQItemId
                    ? updateRFQItem
                    : addRFQItem
                }
                disabled={savingRFQItem}
              >
                {savingRFQItem
                  ? "Saving..."
                  : editingRFQItemId
                  ? "Update Item"
                  : "Add Item"}
              </button>

                </div>

              </div>

              {/* ==============================
                  ITEM LIST
              ============================== */}

              {rfqItems.length > 0 ? (

                <div className="table-wrapper">

                  <table>

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Material</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Notes</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {rfqItems.map((item) => {

                        const material =
                          materials.find(
                            (m) =>
                              Number(m.id) ===
                              Number(item.materialId)
                          );

                        return (
                          <tr key={item.id}>

                            <td>
                              #{item.id}
                            </td>

                            <td>
                              <strong>
                                {material?.name || "-"}
                              </strong>

                              <small>
                                {material?.code || "-"}
                              </small>
                            </td>

                            <td>
                              {item.quantity}
                            </td>

                            <td>
                              {item.unit}
                            </td>

                            <td>
                              {item.notes || "-"}
                            </td>

                            <td>
                              <button
                                type="button"
                                className="edit-button"
                                onClick={() =>
                                  editRFQItem(item)
                                }
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="delete-button"
                                onClick={() =>
                                  handleDeleteRFQItem(item.id)
                                }
                              >
                                Delete
                              </button>

                            </td>

                          </tr>
                        );
                      })}

                    </tbody>

                  </table>

                </div>

              ) : (

                <div className="rfq-empty-items">
                  <h4>No items added yet</h4>
                  <p>
                    Add material items to this RFQ.
                  </p>
                </div>

              )}

            </div>



            {/* =========================================
                RFQ VENDORS / QUOTATIONS
            ========================================= */}

            <div className="rfq-vendors-section">

              <div className="rfq-section-header">
                <div>
                  <h3>Vendors & Quotations</h3>
                  <p>
                    Vendors invited to this RFQ and their quotations
                  </p>
                </div>
              </div>

              {/* ==============================
                  ADD VENDOR FORM
              ============================== */}

              <div className="rfq-vendor-form">

                <div className="form-grid">

                  <div className="form-group">
                    <label>Vendor *</label>

                    <select
                      value={rfqVendorForm.vendorId}
                      onChange={(e) =>
                        setRfqVendorForm({
                          ...rfqVendorForm,
                          vendorId: e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select Vendor
                      </option>

                      {vendors.map((vendor) => (
                        <option
                          key={vendor.id}
                          value={vendor.id}
                        >
                          {vendor.companyName ||
                            vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Quoted Total</label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rfqVendorForm.quotedTotal}
                      onChange={(e) =>
                        setRfqVendorForm({
                          ...rfqVendorForm,
                          quotedTotal: e.target.value,
                        })
                      }
                      placeholder="Enter quotation amount"
                    />
                  </div>

                </div>

                <div className="form-group">
                  <label>Vendor Notes</label>

                  <textarea
                    rows={3}
                    value={rfqVendorForm.notes}
                    onChange={(e) =>
                      setRfqVendorForm({
                        ...rfqVendorForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Optional vendor notes..."
                  />
                </div>

                <div className="rfq-vendor-form-actions">

                 <button
                      type="button"
                      className="save-button"
                      onClick={
                        editingRFQVendorId
                          ? updateRFQVendor
                          : addRFQVendor
                      }
                      disabled={savingRFQVendor}
                    >
                      {savingRFQVendor
                        ? "Saving..."
                        : editingRFQVendorId
                        ? "Update Vendor"
                        : "Add Vendor"}
                    </button>

              </div>

              </div>

              {/* ==============================
                  VENDOR LIST
              ============================== */}

              {rfqVendors.length > 0 ? (

                <div className="table-wrapper">

                  <table>

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Vendor</th>
                        <th>Company</th>
                        <th>Quoted Total</th>
                        <th>Notes</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {rfqVendors.map((item) => {

                        const vendor =
                          vendors.find(
                            (v) =>
                              Number(v.id) ===
                              Number(item.vendorId)
                          );

                        return (
                          <tr key={item.id}>

                            <td>
                              #{item.id}
                            </td>

                            <td>
                              {vendor?.name || "-"}
                            </td>

                            <td>
                              {vendor?.companyName || "-"}
                            </td>

                            <td className="money">
                              {item.quotedTotal !== null &&
                              item.quotedTotal !== ""
                                ? `৳ ${Number(
                                    item.quotedTotal
                                  ).toLocaleString(
                                    "en-BD"
                                  )}`
                                : "-"}
                            </td>

                            <td>
                              {item.notes || "-"}
                            </td>

                            <td>

                              <div className="purchase-order-actions">
                                    <button
                                      type="button"
                                      className="edit-button"
                                      onClick={() =>
                                        editRFQVendor(item)
                                      }
                                    >
                                      Edit
                                    </button>
                                <button
                                  type="button"
                                  className="delete-button"
                                  onClick={() =>
                                    handleDeleteRFQVendor(
                                      item.id
                                    )
                                  }
                                >
                                  Delete
                                </button>

                              </div>

                            </td>

                          </tr>
                        );
                      })}

                    </tbody>

                  </table>

                </div>

              ) : (

                <div className="rfq-empty-items">
                  <h4>No vendors added yet</h4>
                  <p>
                    Add vendors and their quotations to this RFQ.
                  </p>
                </div>

              )}

            </div>

        </div>

        <div className="modal-footer">

          <button
            type="button"
            className="cancel-button"
            onClick={() =>
              setShowRFQEditModal(false)
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="save-button"
            onClick={saveRFQEdit}
            disabled={savingRFQEdit}
          >
            {savingRFQEdit
              ? "Updating..."
              : "Update RFQ"}
          </button>

        </div>
      </div>
    </div>
  );
};
  const renderWorkers = () => {
    return (
      <section className="dashboard">

        {message && (
          <div
            className={`message-box ${message.includes("❌")
                ? "message-error"
                : "message-success"
              }`}
          >
            {message}
          </div>
        )}

        <div className="content-card">

          <div className="card-header">
            <div>
              <h2>Workers</h2>

              <p>
                Manage all BE Interior workers
              </p>
            </div>

            <div className="header-actions">
              <RefreshButton
                onRefresh={() =>
                  loadWorkers(
                    workerPage,
                    workerLimit
                  )
                }
              />

              <button
                type="button"
                className="add-button"
                onClick={openWorkerModal}
              >
                <Plus size={18} />
                Add Worker
              </button>
            </div>
          </div>

          <div className="worker-page-size">

            <label>
              Show:
            </label>

            <select
              value={workerLimit}
              onChange={(e) => {
                const newLimit =
                  Number(e.target.value);

                setWorkerLimit(newLimit);
                setWorkerPage(1);

                loadWorkers(
                  1,
                  newLimit
                );
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>
              workers per page
            </span>

          </div>



          {workers.length === 0 ? (

            <div className="empty-state">
              <Users size={50} />

              <h3>No Workers Found</h3>

              <p>
                Your worker list is currently empty.
              </p>

              <button
                className="empty-add-button"
                onClick={openWorkerModal}
              >
                <Plus size={18} />
                Add Your First Worker
              </button>
            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {workers.map((worker) => (
                    <tr key={worker.id}>

                      <td>
                        #{worker.id}
                      </td>

                      <td>
                        <strong>
                          {worker.name}
                        </strong>
                      </td>

                      <td>
                        {worker.phone || "-"}
                      </td>

                      <td>
                        {worker.role || "-"}
                      </td>

                      <td>
                        <span className="status ongoing">
                          {worker.status}
                        </span>
                      </td>

                      <td>
                        <div className="income-actions">


                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              openWorkerDetails(worker)
                            }
                          >
                            View
                          </button>





                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              handleEditWorker(
                                worker
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-income-button"
                            onClick={() =>
                              handleDeleteWorker(
                                worker.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>

          )}
          <div className="worker-pagination">

            <div className="pagination-info">
              Showing{" "}
              {workerPagination.totalWorkers === 0
                ? 0
                : (workerPagination.page - 1) *
                workerPagination.limit +
                1}
              {" - "}
              {Math.min(
                workerPagination.page *
                workerPagination.limit,
                workerPagination.totalWorkers
              )}
              {" of "}
              {workerPagination.totalWorkers}
              {" workers"}
            </div>

            <div className="pagination-buttons">

              <button
                type="button"
                disabled={
                  workerPagination.page <= 1
                }
                onClick={() =>
                  handleWorkerPageChange(
                    workerPagination.page - 1
                  )
                }
              >
                Previous
              </button>

              <span className="pagination-current">
                Page {workerPagination.page} of{" "}
                {workerPagination.totalPages}
              </span>

              <button
                type="button"
                disabled={
                  workerPagination.page >=
                  workerPagination.totalPages
                }
                onClick={() =>
                  handleWorkerPageChange(
                    workerPagination.page + 1
                  )
                }
              >
                Next
              </button>

            </div>

          </div>



        </div>





      </section>
    );
  };

  const renderVendors = () => {
    return (
      <section className="dashboard">

        {message && (
          <div
            className={`message-box ${message.includes("❌")
                ? "message-error"
                : "message-success"
              }`}
          >
            {message}
          </div>
        )}

        <div className="content-card">

          <div className="card-header">
            <div>
              <h2>Vendors</h2>

              <p>
                Manage all BE Interior vendors
              </p>
            </div>

            <div className="header-actions">

              <RefreshButton
                onRefresh={() =>
                  loadVendors(
                    vendorPage,
                    vendorLimit
                  )
                }
              />

              <button
                type="button"
                className="add-button"
                onClick={openVendorModal}
              >
                <Plus size={18} />
                Add Vendor
              </button>
            </div>
          </div>


          <div className="vendor-page-size">

            <label>
              Show:
            </label>

            <select
              value={vendorLimit}
              onChange={(e) => {
                const newLimit =
                  Number(e.target.value);

                setVendorLimit(newLimit);
                setVendorPage(1);

                loadVendors(
                  1,
                  newLimit
                );
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>
              vendors per page
            </span>

          </div>


          {vendors.length === 0 ? (

            <div className="empty-state">

              <Building2 size={50} />

              <h3>No Vendors Found</h3>

              <p>
                Your vendor list is currently empty.
              </p>

              <button
                className="empty-add-button"
                onClick={openVendorModal}
              >
                <Plus size={18} />
                Add Your First Vendor
              </button>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {vendors.map((vendor) => (
                    <tr key={vendor.id}>

                      <td>
                        #{vendor.id}
                      </td>

                      <td>
                        <strong>
                          {vendor.name}
                        </strong>
                      </td>

                      <td>
                        {vendor.companyName || "-"}
                      </td>

                      <td>
                        {vendor.phone || "-"}
                      </td>

                      <td>
                        {vendor.address || "-"}
                      </td>

                      <td>
                        <span className="status ongoing">
                          {vendor.status}
                        </span>
                      </td>

                      <td>
                        <div className="income-actions">

                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              openVendorDetails(vendor)
                            }
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              handleEditVendor(
                                vendor
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-income-button"
                            onClick={() =>
                              handleDeleteVendor(
                                vendor.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>

          )}

          <div className="vendor-pagination">

            <div className="pagination-info">
              Showing{" "}
              {vendorPagination.totalVendors === 0
                ? 0
                : (vendorPagination.page - 1) *
                vendorPagination.limit +
                1}
              {" - "}
              {Math.min(
                vendorPagination.page *
                vendorPagination.limit,
                vendorPagination.totalVendors
              )}
              {" of "}
              {vendorPagination.totalVendors}
              {" vendors"}
            </div>

            <div className="pagination-buttons">

              <button
                type="button"
                disabled={
                  vendorPagination.page <= 1
                }
                onClick={() =>
                  handleVendorPageChange(
                    vendorPagination.page - 1
                  )
                }
              >
                Previous
              </button>

              <span className="pagination-current">
                Page {vendorPagination.page} of{" "}
                {vendorPagination.totalPages}
              </span>

              <button
                type="button"
                disabled={
                  vendorPagination.page >=
                  vendorPagination.totalPages
                }
                onClick={() =>
                  handleVendorPageChange(
                    vendorPagination.page + 1
                  )
                }
              >
                Next
              </button>

            </div>

          </div>


        </div>

      </section>
    );
  };

  // =========================================
  // RENDER CATEGORIES
  // =========================================
  const handleRefreshCategories = async () => {
    try {
      await Promise.all([
        loadIncomePaginatedCategories(
          incomeCategoryPage,
          incomeCategoryLimit
        ),

        loadExpensePaginatedCategories(
          expenseCategoryPage,
          expenseCategoryLimit
        ),

        loadMaterialCategories(
          materialCategoryPage,
          materialCategoryLimit
        ),
      ]);
    } catch (error) {
      console.error(
        "Refresh Categories Error:",
        error
      );
    }
  };

  const renderCategories = () => {
    const incomeCategories = categories.filter(
      (category) =>
        category.type === "INCOME"
    );

    const expenseCategories = categories.filter(
      (category) =>
        category.type === "EXPENSE"
    );

    return (
      <section className="dashboard">

        {message && (
          <div
            className={`message-box ${message.includes("❌")
                ? "message-error"
                : "message-success"
              }`}
          >
            {message}
          </div>
        )}

        <div className="content-card">

          <div className="card-header">

            <div>
              <h2>Categories</h2>

              <p>
                Manage income and expense categories
              </p>
            </div>

            <div className="header-actions">

              <RefreshButton
                onRefresh={handleRefreshCategories}
              />

              <button
                type="button"
                className="add-button"
                onClick={openCategoryModal}
              >
                <Plus size={18} />
                Add Category
              </button>

            </div>

          </div>


          <div className="category-sections">

            {/* INCOME CATEGORIES */}

            <div className="category-section">

              <div className="category-section-header">
                <div>
                  <h3>
                    Income Categories
                  </h3>

                  <p>
                    Categories used for income transactions
                  </p>
                </div>
              </div>


              <div className="category-page-size">

                <label>
                  Show:
                </label>

                <select
                  value={incomeCategoryLimit}
                  onChange={(e) => {
                    const newLimit =
                      Number(e.target.value);

                    setIncomeCategoryLimit(newLimit);
                    setIncomeCategoryPage(1);

                    loadIncomePaginatedCategories(
                      1,
                      newLimit
                    );
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <span>
                  income categories per page
                </span>

              </div>

              {incomeCategories.length === 0 ? (

                <div className="category-empty">
                  No income categories found.
                </div>

              ) : (

                <div className="table-wrapper">

                  <table>

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {paginatedIncomeCategories.map(
                        (category) => (
                          <tr key={category.id}>

                            <td>
                              #{category.id}
                            </td>

                            <td>
                              <strong>
                                {category.name}
                              </strong>
                            </td>

                            <td>
                              <span className="status ongoing">
                                {category.status}
                              </span>
                            </td>

                            <td>

                              <div className="income-actions">

                                <button
                                  type="button"
                                  className="edit-income-button"
                                  onClick={() =>
                                    handleEditCategory(
                                      category
                                    )
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="delete-income-button"
                                  onClick={() =>
                                    handleDeleteCategory(
                                      category.id
                                    )
                                  }
                                >
                                  Delete
                                </button>

                              </div>

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}


              <div className="category-pagination-footer">

                <div className="pagination-info">
                  Showing{" "}
                  {incomeCategoryPagination.totalRecords === 0
                    ? 0
                    : (incomeCategoryPagination.page - 1) *
                    incomeCategoryPagination.limit +
                    1}
                  {" - "}
                  {Math.min(
                    incomeCategoryPagination.page *
                    incomeCategoryPagination.limit,
                    incomeCategoryPagination.totalRecords
                  )}
                  {" of "}
                  {incomeCategoryPagination.totalRecords}
                  {" income categories"}
                </div>

                <div className="pagination-buttons">

                  <button
                    type="button"
                    disabled={
                      incomeCategoryPagination.page <= 1
                    }

                    onClick={() =>
                      handleIncomeCategoryPageChange(
                        incomeCategoryPagination.page - 1
                      )
                    }
                  >

                    Previous
                  </button>

                  <span className="pagination-current">
                    Page {incomeCategoryPagination.page} of{" "}
                    {incomeCategoryPagination.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      incomeCategoryPagination.page >=
                      incomeCategoryPagination.totalPages
                    }
                    onClick={() =>
                      handleIncomeCategoryPageChange(
                        incomeCategoryPagination.page + 1
                      )
                    }
                  >
                    Next
                  </button>

                </div>

              </div>


            </div>


            {/* EXPENSE CATEGORIES */}

            <div className="category-section">

              <div className="category-section-header">
                <div>
                  <h3>
                    Expense Categories
                  </h3>

                  <p>
                    Categories used for expense transactions
                  </p>
                </div>
              </div>

              <div className="category-page-size">

                <label>
                  Show:
                </label>

                <select
                  value={expenseCategoryLimit}
                  onChange={(e) => {
                    const newLimit =
                      Number(e.target.value);

                    setExpenseCategoryLimit(newLimit);
                    setExpenseCategoryPage(1);

                    loadExpensePaginatedCategories(
                      1,
                      newLimit
                    );
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <span>
                  expense categories per page
                </span>

              </div>



              {expenseCategories.length === 0 ? (

                <div className="category-empty">
                  No expense categories found.
                </div>

              ) : (

                <div className="table-wrapper">

                  <table>

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {paginatedExpenseCategories.map(
                        (category) => (
                          <tr key={category.id}>

                            <td>
                              #{category.id}
                            </td>

                            <td>
                              <strong>
                                {category.name}
                              </strong>
                            </td>

                            <td>
                              <span className="status ongoing">
                                {category.status}
                              </span>
                            </td>

                            <td>

                              <div className="income-actions">

                                <button
                                  type="button"
                                  className="edit-income-button"
                                  onClick={() =>
                                    handleEditCategory(
                                      category
                                    )
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="delete-income-button"
                                  onClick={() =>
                                    handleDeleteCategory(
                                      category.id
                                    )
                                  }
                                >
                                  Delete
                                </button>

                              </div>

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}


              <div className="category-pagination-footer">

                <div className="pagination-info">
                  Showing{" "}
                  {expenseCategoryPagination.totalRecords === 0
                    ? 0
                    : (expenseCategoryPagination.page - 1) *
                    expenseCategoryPagination.limit +
                    1}
                  {" - "}
                  {Math.min(
                    expenseCategoryPagination.page *
                    expenseCategoryPagination.limit,
                    expenseCategoryPagination.totalRecords
                  )}
                  {" of "}
                  {expenseCategoryPagination.totalRecords}
                  {" expense categories"}
                </div>

                <div className="pagination-buttons">

                  <button
                    type="button"
                    disabled={
                      expenseCategoryPagination.page <= 1
                    }
                    onClick={() =>
                      handleExpenseCategoryPageChange(
                        expenseCategoryPagination.page - 1
                      )
                    }
                  >
                    Previous
                  </button>

                  <span className="pagination-current">
                    Page {expenseCategoryPagination.page} of{" "}
                    {expenseCategoryPagination.totalPages}
                  </span>



                  <button
                    type="button"
                    disabled={
                      expenseCategoryPagination.page >=
                      expenseCategoryPagination.totalPages
                    }


                    onClick={() =>
                      handleExpenseCategoryPageChange(
                        expenseCategoryPagination.page + 1
                      )
                    }
                  >
                    Next
                  </button>

                </div>

              </div>

            </div>

            {/* =========================================
    MATERIAL CATEGORIES
========================================= */}

            <div className="category-section">


              <div
                className="category-section-header"
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  gap: "20px",
                }}
              >
                <div>
                  <h3>
                    Material Categories
                  </h3>

                  <p>
                    Categories used for BE Interior materials
                  </p>
                </div>

                <button
                  type="button"
                  className="add-button"
                  onClick={openMaterialCategoryModal}
                  style={{
                    marginLeft: "auto",
                    flexShrink: 0,
                  }}
                >
                  <Plus size={18} />
                  Add Material Category
                </button>
              </div>
              <div className="category-page-size">

                <label>
                  Show:
                </label>

                <select
                  value={materialCategoryLimit}
                  onChange={(e) => {
                    const newLimit = Number(
                      e.target.value
                    );

                    setMaterialCategoryLimit(
                      newLimit
                    );

                    setMaterialCategoryPage(1);

                    loadMaterialCategories(
                      1,
                      newLimit
                    );
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <span>
                  material categories per page
                </span>

              </div>


              {materialCategories.length === 0 ? (

                <div className="category-empty">
                  No material categories found.
                </div>

              ) : (

                <div className="table-wrapper">

                  <table>

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>

                      {materialCategories.map(
                        (category) => (

                          <tr key={category.id}>

                            <td>
                              #{category.id}
                            </td>

                            <td>
                              <strong>
                                {category.name}
                              </strong>
                            </td>

                            <td>
                              {category.description || "-"}
                            </td>

                            <td>
                              <span className="status ongoing">
                                {category.status}
                              </span>
                            </td>

                            <td>

                              <div className="income-actions">

                                <button
                                  type="button"
                                  className="edit-income-button"
                                  onClick={() =>
                                    handleEditMaterialCategory(
                                      category
                                    )
                                  }
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="delete-income-button"
                                  onClick={() =>
                                    handleDeleteMaterialCategory(
                                      category.id
                                    )
                                  }
                                >
                                  Delete
                                </button>

                              </div>

                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>

              )}

              <div className="category-pagination-footer">

                <div className="pagination-info">

                  Showing{" "}

                  {materialCategoryPagination.totalRecords === 0
                    ? 0
                    : (
                      materialCategoryPagination.page - 1
                    ) *
                    materialCategoryPagination.limit +
                    1}

                  {" - "}

                  {Math.min(
                    materialCategoryPagination.page *
                    materialCategoryPagination.limit,
                    materialCategoryPagination.totalRecords
                  )}

                  {" of "}

                  {materialCategoryPagination.totalRecords}

                  {" material categories"}

                </div>


                <div className="pagination-buttons">

                  <button
                    type="button"
                    disabled={
                      materialCategoryPagination.page <= 1
                    }
                    onClick={() =>
                      handleMaterialCategoryPageChange(
                        materialCategoryPagination.page - 1
                      )
                    }
                  >
                    Previous
                  </button>


                  <span className="pagination-current">

                    Page{" "}
                    {materialCategoryPagination.page}
                    {" of "}
                    {materialCategoryPagination.totalPages}

                  </span>


                  <button
                    type="button"
                    disabled={
                      materialCategoryPagination.page >=
                      materialCategoryPagination.totalPages
                    }
                    onClick={() =>
                      handleMaterialCategoryPageChange(
                        materialCategoryPagination.page + 1
                      )
                    }
                  >
                    Next
                  </button>

                </div>

              </div>


            </div>




          </div>

        </div>

        {/* =========================================
              ADD / EDIT MATERIAL CATEGORY MODAL
          ========================================= */}

        {showMaterialCategoryModal && (
          <div
            className="modal-overlay"
            onClick={() =>
              setShowMaterialCategoryModal(false)
            }
          >

            <div
              className="project-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <div>
                  <h2>
                    {editingMaterialCategory
                      ? "Edit Material Category"
                      : "Add Material Category"}
                  </h2>

                  <p>
                    {editingMaterialCategory
                      ? "Update material category information"
                      : "Create a new material category"}
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() => {
                    setShowMaterialCategoryModal(
                      false
                    );

                    setEditingMaterialCategory(
                      null
                    );
                  }}
                >
                  ×
                </button>

              </div>


              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMaterialCategory();
                }}
                className="material-form"
              >

                {/* CATEGORY NAME */}

                <div className="form-group">

                  <label>
                    Category Name *
                  </label>

                  <input
                    type="text"
                    value={
                      materialCategoryForm.name
                    }
                    onChange={(e) =>
                      setMaterialCategoryForm(
                        (prev) => ({
                          ...prev,
                          name:
                            e.target.value,
                        })
                      )
                    }
                    placeholder="e.g. Hardware"
                    required
                  />

                </div>


                {/* STATUS */}

                <div className="form-group">

                  <label>
                    Status
                  </label>

                  <select
                    value={
                      materialCategoryForm.status
                    }
                    onChange={(e) =>
                      setMaterialCategoryForm(
                        (prev) => ({
                          ...prev,
                          status:
                            e.target.value,
                        })
                      )
                    }
                  >

                    <option value="ACTIVE">
                      ACTIVE
                    </option>

                    <option value="INACTIVE">
                      INACTIVE
                    </option>

                  </select>

                </div>


                {/* DESCRIPTION */}

                <div className="form-group full-width">

                  <label>
                    Description
                  </label>

                  <textarea
                    value={
                      materialCategoryForm.description
                    }
                    onChange={(e) =>
                      setMaterialCategoryForm(
                        (prev) => ({
                          ...prev,
                          description:
                            e.target.value,
                        })
                      )
                    }
                    placeholder="Describe what type of materials belong to this category..."
                    rows={4}
                  />

                </div>


                {/* ACTIONS */}

                <div className="modal-actions">

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {

                      setShowMaterialCategoryModal(
                        false
                      );

                      setEditingMaterialCategory(
                        null
                      );

                      setMaterialCategoryForm({
                        name: "",
                        description: "",
                        status: "ACTIVE",
                      });

                    }}
                  >
                    Cancel
                  </button>


                  <button
                    type="submit"
                    className="save-button"
                  >
                    {editingMaterialCategory
                      ? "Update Category"
                      : "Save Category"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}


      </section>
    );
  };

  // =========================================
  // RENDER TRANSACTIONS
  // =========================================

  const renderTransactions = () => {
    const filteredTransactions = transactions.filter((item) => {
      const search = transactionSearch.toLowerCase().trim();

      const matchesSearch =
        !search ||
        item.description?.toLowerCase().includes(search) ||
        item.project?.name?.toLowerCase().includes(search) ||
        item.category?.name?.toLowerCase().includes(search) ||
        item.worker?.name?.toLowerCase().includes(search) ||
        item.vendor?.name?.toLowerCase().includes(search);

      const matchesType =
        transactionTypeFilter === "ALL" ||
        item.type === transactionTypeFilter;

      const matchesProject =
        transactionProjectFilter === "ALL" ||
        String(item.projectId) === transactionProjectFilter;

      const matchesCategory =
        transactionCategoryFilter === "ALL" ||
        String(item.categoryId) === transactionCategoryFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesProject &&
        matchesCategory
      );
    });

    const filteredCredit = filteredTransactions
      .filter((item) => item.type === "INCOME")
      .reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );

    const filteredDebit = filteredTransactions
      .filter((item) => item.type === "EXPENSE")
      .reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0
      );

    const filteredBalance =
      filteredCredit - filteredDebit;










    return (
      <section className="dashboard">

        {message && (
          <div
            className={`message-box ${message.includes("❌")
                ? "message-error"
                : "message-success"
              }`}
          >
            {message}
          </div>
        )}

        <div className="content-card">

          <div className="card-header">

            <div>
              <h2>Transactions</h2>

              <p>
                All income and expense transactions
              </p>
            </div>

            <RefreshButton
              onRefresh={loadTransactions}
            />

          </div>

          <div className="transaction-filters">

            <div className="transaction-filter-group search-filter">
              <label>Search</label>

              <input
                type="text"
                value={transactionSearch}
                onChange={(e) =>
                  setTransactionSearch(e.target.value)
                }
                placeholder="Search transaction..."
              />
            </div>

            <div className="transaction-filter-group">
              <label>Type</label>

              <select
                value={transactionTypeFilter}
                onChange={(e) =>
                  setTransactionTypeFilter(e.target.value)
                }
              >
                <option value="ALL">
                  All Types
                </option>

                <option value="INCOME">
                  Income
                </option>

                <option value="EXPENSE">
                  Expense
                </option>
              </select>
            </div>

            <div className="transaction-filter-group">
              <label>Project</label>

              <select
                value={transactionProjectFilter}
                onChange={(e) =>
                  setTransactionProjectFilter(e.target.value)
                }
              >
                <option value="ALL">
                  All Projects
                </option>

                {projects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="transaction-filter-group">
              <label>Category</label>

              <select
                value={transactionCategoryFilter}
                onChange={(e) =>
                  setTransactionCategoryFilter(e.target.value)
                }
              >
                <option value="ALL">
                  All Categories
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() => {
                setTransactionSearch("");
                setTransactionTypeFilter("ALL");
                setTransactionProjectFilter("ALL");
                setTransactionCategoryFilter("ALL");
              }}
            >
              Reset
            </button>

          </div>


          <div className="transaction-page-size">

            <label>
              Show:
            </label>

            <select
              value={transactionLimit}
              onChange={(e) => {
                const newLimit =
                  Number(e.target.value);

                setTransactionLimit(newLimit);
                setTransactionPage(1);

                loadTransactions(
                  1,
                  newLimit
                );
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>
              transactions per page
            </span>

          </div>










          {transactions.length === 0 ? (

            <div className="empty-state">

              <Wallet size={50} />

              <h3>No Transactions Found</h3>

              <p>
                Your transaction list is currently empty.
              </p>

            </div>

          ) : (

            <div className="table-wrapper">

              <table>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Project</th>
                    <th>Category</th>
                    <th>Worker</th>
                    <th>Vendor</th>
                    <th>Description</th>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Action</th>

                  </tr>
                </thead>

                <tbody>


                  {filteredTransactions.map((item) => (

                    <tr key={item.id}>

                      <td>
                        #{item.id}
                      </td>

                      <td>
                        {new Date(
                          item.transactionDate
                        ).toLocaleDateString(
                          "en-GB"
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            item.type === "INCOME"
                              ? "transaction-income"
                              : "transaction-expense"
                          }
                        >
                          {item.type}
                        </span>
                      </td>

                      <td>
                        {item.project?.name || "-"}
                      </td>

                      <td>
                        {item.category?.name || "-"}
                      </td>

                      <td>
                        {item.worker?.name || "-"}
                      </td>

                      <td>
                        {item.vendor?.name || "-"}
                      </td>

                      <td>
                        {item.description || "-"}
                      </td>

                      <td>
                        {item.paymentMethod
                          ?.replaceAll(
                            "_",
                            " "
                          ) || "CASH"}
                      </td>

                      <td
                        className={
                          item.type === "INCOME"
                            ? "money transaction-income-amount"
                            : "money transaction-expense-amount"
                        }
                      >
                        {item.type === "INCOME"
                          ? "+ "
                          : "- "}
                        ৳{" "}
                        {formatMoney(
                          item.amount
                        )}
                      </td>

                      <td>
                        <div className="income-actions">

                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              openTransactionDetails(item)
                            }
                          >
                            View
                          </button>


                          <button
                            type="button"
                            className="edit-income-button"
                            onClick={() =>
                              handleEditTransaction(item)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="delete-income-button"
                            onClick={() =>
                              handleDeleteTransaction(item.id)
                            }
                          >
                            Delete
                          </button>

                        </div>
                      </td>



                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}




          <div className="transaction-summary-footer">

            <span className="credit-summary">


              Credit: ৳{" "}
              {formatMoney(filteredCredit)}

            </span>

            <span className="summary-separator">|</span>

            <span className="debit-summary">

              Debit: ৳{" "}
              {formatMoney(filteredDebit)}

            </span>

            <span className="summary-separator">|</span>

            <span className="balance-summary">
              Balance: ৳{" "}
              {formatMoney(filteredBalance)}
            </span>

          </div>




          <div className="transaction-pagination">

            <div className="pagination-info">
              Showing{" "}
              {transactionPagination.totalTransactions === 0
                ? 0
                : (transactionPagination.page - 1) *
                transactionPagination.limit +
                1}
              {" - "}
              {Math.min(
                transactionPagination.page *
                transactionPagination.limit,
                transactionPagination.totalTransactions
              )}
              {" of "}
              {transactionPagination.totalTransactions}
              {" transactions"}
            </div>

            <div className="pagination-buttons">

              <button
                type="button"
                disabled={transactionPagination.page <= 1}
                onClick={() =>
                  handleTransactionPageChange(
                    transactionPagination.page - 1
                  )
                }
              >
                Previous
              </button>

              <span className="pagination-current">
                Page {transactionPagination.page} of{" "}
                {transactionPagination.totalPages}
              </span>

              <button
                type="button"
                disabled={
                  transactionPagination.page >=
                  transactionPagination.totalPages
                }
                onClick={() =>
                  handleTransactionPageChange(
                    transactionPagination.page + 1
                  )
                }
              >
                Next
              </button>

            </div>

          </div>


        </div>

      </section>
    );
  };

  return (
    <div className="app">
      {/* =========================================
          SIDEBAR
      ========================================= */}

      <aside
        className={`sidebar ${sidebarOpen ? "" : "sidebar-hidden"
          }`}
      >
        <div className="logo">
          <div className="logo-icon">BE</div>

          <div className="logo-text">
            <h2>BE Interior</h2>
            <span>Finance Manager</span>
          </div>
        </div>

        <nav className="menu">

          <a
            href="#"
            className={
              activePage === "dashboard"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("dashboard");
            }}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </a>



          <a
            href="#"
            className={
              activePage === "projects"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("projects");
            }}
          >
            <FolderKanban size={20} />
            <span>Projects</span>
          </a>

          <a
            href="#"
            className={
              activePage === "boqs"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();

              setActivePage("boqs");

              loadBOQs();
            }}
          >
            <ClipboardList size={20} />
            <span>BOQ</span>
          </a>

          <a
            href="#"
            className={
              activePage === "income"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("income");
            }}
          >
            <ArrowDownCircle size={20} />
            <span>Income</span>
          </a>



          <a
            href="#"
            className={
              activePage === "expenses"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("expenses");
            }}
          >
            <ArrowUpCircle size={20} />
            <span>Expenses</span>
          </a>








          <a
            href="#"
            className={
              activePage === "transactions"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("transactions");
            }}
          >
            <Wallet size={20} />
            <span>Transactions</span>
          </a>


          <a
            href="#"
            className={
              activePage === "workers"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("workers");
            }}
          >
            <Users size={20} />
            <span>Workers</span>
          </a>




          <a
            href="#"
            className={
              activePage === "vendors"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("vendors");
            }}
          >
            <Building2 size={20} />
            <span>Vendors</span>
          </a>


          <a
            href="#"
            className={
              activePage === "materials"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("materials");

              loadMaterials(
                materialPage,
                materialLimit
              );
              loadMaterialCategories();
            }}
          >
            <Boxes size={20} />
            <span>Materials</span>
          </a>


       <a
        href="#"
        className={
          activePage === "purchases"
            ? "active"
            : ""
        }
        onClick={(e) => {
          e.preventDefault();
          setActivePage("purchases");
        }}
      >
        <ShoppingCart size={20} />
        <span>Purchases</span>
      </a>

            <a
              href="#"
              className={
                activePage === "purchase-requests"
                  ? "active"
                  : ""
              }
              onClick={(e) => {
                e.preventDefault();
                setActivePage("purchase-requests");
              }}
            >
              <ClipboardList size={20} />
              <span>Purchase Requests</span>
            </a>

            <a
              href="#"
              className={
                activePage === "rfqs"
                  ? "active"
                  : ""
              }
              onClick={(e) => {
                e.preventDefault();
                setActivePage("rfqs");
              }}
            >
              <FileText size={20} />
              <span>RFQ</span>
            </a>

            <a
              href="#"
              className={
                activePage === "purchase-orders"
                  ? "active"
                  : ""
              }
              onClick={(e) => {
                e.preventDefault();
                setActivePage("purchase-orders");
              }}
            >
              <FileCheck size={20} />
              <span>Purchase Orders</span>
            </a>



          <a
            href="#"
            className={
              activePage === "categories"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              setActivePage("categories");
            }}
          >
            <Tags size={20} />
            <span>Categories</span>
          </a>




        </nav>




        <div className="sidebar-footer">
          © 2026 BE Interior
        </div>
      </aside>

      {/* =========================================
          MAIN CONTENT
      ========================================= */}

      <main className="main-content">

        {/* TOPBAR */}

        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-button"
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
            >
              {sidebarOpen ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>

            <div>
              <h1>Finance Dashboard</h1>
              <p>
                Welcome to BE Interior Finance Manager
              </p>
            </div>
          </div>

          <div className="profile">
            <div className="avatar">HM</div>

            <div>
              <strong>Hossain Al Mahmud</strong>
              <span>Managing Director</span>
            </div>
          </div>
        </header>



        {/* DASHBOARD */}
        {activePage === "dashboard" && (
          <section className="dashboard">

            {/* MESSAGE */}

            {message && (
              <div
                className={`message-box ${message.includes("❌")
                    ? "message-error"
                    : "message-success"
                  }`}
              >
                {message}
              </div>
            )}




            {/* STATS */}

            <div className="stats-grid dashboard-kpi-grid">

              {/* TOTAL PROJECTS */}
              <div className="stat-card dashboard-kpi-card projects-kpi">

                <div className="kpi-content">

                  <span className="stat-title">
                    Total Projects
                  </span>

                  <h2>
                    {dashboardData.totalProjects}
                  </h2>

                  <small className="kpi-subtitle">
                    All projects
                  </small>

                </div>

                <div className="stat-icon project-icon">
                  <FolderKanban size={24} />
                </div>

              </div>


              {/* TOTAL INCOME */}
              <div className="stat-card dashboard-kpi-card income-kpi">

                <div className="kpi-content">

                  <span className="stat-title">
                    Total Income
                  </span>

                  <h2>
                    ৳{" "}
                    {formatMoney(
                      dashboardData.totalIncome
                    )}
                  </h2>

                  <small className="kpi-subtitle">
                    Total credit
                  </small>

                </div>

                <div className="stat-icon income-icon">
                  <ArrowDownCircle size={24} />
                </div>

              </div>


              {/* TOTAL EXPENSES */}
              <div className="stat-card dashboard-kpi-card expense-kpi">

                <div className="kpi-content">

                  <span className="stat-title">
                    Total Expenses
                  </span>

                  <h2>
                    ৳{" "}
                    {formatMoney(
                      dashboardData.totalExpenses
                    )}
                  </h2>

                  <small className="kpi-subtitle">
                    Total debit
                  </small>

                </div>

                <div className="stat-icon expense-icon">
                  <ArrowUpCircle size={24} />
                </div>

              </div>


              {/* CURRENT BALANCE */}
              <div className="stat-card dashboard-kpi-card balance-kpi">

                <div className="kpi-content">

                  <span className="stat-title">
                    Current Balance
                  </span>

                  <h2>
                    ৳{" "}
                    {formatMoney(
                      dashboardData.currentBalance
                    )}
                  </h2>

                  <small className="kpi-subtitle">
                    Income − Expenses
                  </small>

                </div>

                <div className="stat-icon balance-icon">
                  <Wallet size={24} />
                </div>

              </div>

            </div>



            {/* =========================================
    FINANCIAL POSITION + RECENT TRANSACTIONS
========================================= */}

            <div className="dashboard-finance-row">

              {/* FINANCIAL POSITION */}

              <div className="content-card dashboard-finance-card">

                <div className="card-header">

                  <div>
                    <h2>Financial Position</h2>

                    <p>
                      Current company financial condition
                    </p>
                  </div>

                  <Wallet size={22} />
                </div>


                <div className="financial-summary-grid">

                  <div className="financial-summary-item credit-summary-item">

                    <span>
                      Credit
                    </span>

                    <strong>
                      ৳{" "}
                      {formatMoney(
                        dashboardData.totalIncome
                      )}
                    </strong>

                    <small>
                      Total Income
                    </small>

                  </div>


                  <div className="financial-summary-item debit-summary-item">

                    <span>
                      Debit
                    </span>

                    <strong>
                      ৳{" "}
                      {formatMoney(
                        dashboardData.totalExpenses
                      )}
                    </strong>

                    <small>
                      Total Expenses
                    </small>

                  </div>


                  <div className="financial-summary-item balance-summary-item">

                    <span>
                      Balance
                    </span>

                    <strong>
                      ৳{" "}
                      {formatMoney(
                        dashboardData.currentBalance
                      )}
                    </strong>

                    <small>
                      Income − Expenses
                    </small>

                  </div>

                </div>

              </div>


              {/* RECENT TRANSACTIONS */}

              <div className="content-card dashboard-finance-card">

                <div className="card-header">

                  <div>
                    <h2>Recent Transactions</h2>

                    <p>
                      Latest financial activity
                    </p>
                  </div>

                  <button
                    type="button"
                    className="refresh-button"
                    onClick={loadTransactions}
                  >
                    <RefreshCw size={17} />
                    Refresh
                  </button>

                </div>


                {transactions.length === 0 ? (

                  <div className="dashboard-empty-small">

                    <Wallet size={35} />

                    <p>
                      No transactions found.
                    </p>

                  </div>

                ) : (

                  <div className="recent-transactions-list">

                    {transactions
                      .slice(0, 5)
                      .map((item) => (

                        <div
                          className="recent-transaction-item"
                          key={item.id}
                        >

                          <div className="recent-transaction-left">

                            <div
                              className={
                                item.type === "INCOME"
                                  ? "recent-transaction-icon income-recent-icon"
                                  : "recent-transaction-icon expense-recent-icon"
                              }
                            >
                              {item.type === "INCOME"
                                ? "+"
                                : "-"}
                            </div>

                            <div>

                              <strong>
                                {item.category?.name ||
                                  item.description ||
                                  "Transaction"}
                              </strong>

                              <small>
                                {item.project?.name ||
                                  item.description ||
                                  "No project"}
                              </small>

                            </div>

                          </div>


                          <div className="recent-transaction-right">

                            <strong
                              className={
                                item.type === "INCOME"
                                  ? "recent-income-amount"
                                  : "recent-expense-amount"
                              }
                            >
                              {item.type === "INCOME"
                                ? "+"
                                : "-"}
                              ৳{" "}
                              {formatMoney(
                                item.amount
                              )}
                            </strong>

                            <small>
                              {new Date(
                                item.transactionDate
                              ).toLocaleDateString(
                                "en-GB"
                              )}
                            </small>

                          </div>

                        </div>

                      ))}

                  </div>

                )}

              </div>

            </div>


            {/* =========================================
    COMPANY CONDITION
========================================= */}

            <div className="content-card company-condition-card">

              <div className="card-header">

                <div>
                  <h2>Company Condition</h2>

                  <p>
                    Current BE Interior project and activity status
                  </p>
                </div>

                <FolderKanban size={22} />

              </div>


              <div className="company-condition-grid">

                {/* ONGOING */}

                <div className="condition-item ongoing-condition">

                  <div className="condition-icon">
                    <FolderKanban size={20} />
                  </div>

                  <div>
                    <span>
                      Ongoing Projects
                    </span>

                    <strong>
                      {ongoingProjectsCount}
                    </strong>

                    <small>
                      Currently running
                    </small>
                  </div>

                </div>


                {/* COMPLETED */}

                <div className="condition-item completed-condition">

                  <div className="condition-icon">
                    ✓
                  </div>

                  <div>
                    <span>
                      Completed Projects
                    </span>

                    <strong>
                      {completedProjectsCount}
                    </strong>

                    <small>
                      Successfully completed
                    </small>
                  </div>

                </div>


                {/* ON HOLD */}

                <div className="condition-item hold-condition">

                  <div className="condition-icon">
                    !
                  </div>

                  <div>
                    <span>
                      On Hold
                    </span>

                    <strong>
                      {onHoldProjectsCount}
                    </strong>

                    <small>
                      Projects on hold
                    </small>
                  </div>

                </div>


                {/* RECENT ACTIVITY */}

                <div className="condition-item activity-condition">

                  <div className="condition-icon">
                    ↗
                  </div>

                  <div>
                    <span>
                      Recent Activity
                    </span>

                    <strong>
                      {recentTransactionCount}
                    </strong>

                    <small>
                      Latest transactions
                    </small>
                  </div>

                </div>

              </div>

            </div>






            {/* RECENT PROJECTS */}

            <div className="content-card recent-projects-card">

              <div className="card-header">
                <div>
                  <h2>Recent Projects</h2>
                  <p>
                    Latest projects from your database
                  </p>
                </div>

                <div className="header-actions">

                  <button
                    className="refresh-button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw
                      size={18}
                      className={
                        refreshing ? "spin" : ""
                      }
                    />

                    {refreshing
                      ? "Refreshing..."
                      : "Refresh"}
                  </button>

                  <button
                    className="add-button"
                    onClick={openProjectModal}
                  >
                    <Plus size={18} />
                    Add Project
                  </button>

                </div>
              </div>

              {loading ? (

                <div className="loading">
                  <LoaderCircle
                    size={30}
                    className="spin"
                  />
                  <p>Loading projects...</p>
                </div>

              ) : projects.length === 0 ? (

                <div className="empty-state">
                  <FolderKanban size={50} />

                  <h3>No Projects Found</h3>

                  <p>
                    Your project list is currently empty.
                  </p>

                  <button
                    className="empty-add-button"
                    onClick={openProjectModal}
                  >
                    <Plus size={18} />
                    Add Your First Project
                  </button>
                </div>

              ) : (

                <div className="table-wrapper">

                  <table className="dashboard-projects-table">

                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Project Name</th>
                        <th>Contract Value</th>
                        <th>Status</th>
                        <th>Created Date</th>
                      </tr>
                    </thead>

                    <tbody>


                      {projects.slice(0, 5).map((project) => (

                        <tr key={project.id} className="dashboard-project-row">

                          <td>#{project.id}</td>

                          <td>
                            <strong>
                              {project.name}
                            </strong>

                            {project.notes && (
                              <small className="project-notes">
                                {project.notes}
                              </small>
                            )}
                          </td>

                          <td className="money">
                            ৳{" "}
                            {formatMoney(
                              project.contractValue
                            )}
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                project.status
                              )}
                            >
                              {project.status === "ON_HOLD"
                                ? "ON HOLD"
                                : project.status}
                            </span>
                          </td>

                          <td>
                            {new Date(
                              project.createdAt
                            ).toLocaleDateString(
                              "en-GB"
                            )}
                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          </section>
        )}

        {activePage === "projects" && renderProjects()}
        {activePage === "boqs" && renderBOQs()}
        {activePage === "income" && renderIncome()}
        {activePage === "expenses" && renderExpenses()}
        {activePage === "workers" && renderWorkers()}
        {activePage === "vendors" && renderVendors()}
        {activePage === "categories" && renderCategories()}
        {activePage === "transactions" && renderTransactions()}
        {activePage === "materials" && renderMaterials()}
        {activePage === "purchases" && renderPurchases()}
        {activePage === "purchase-requests" && renderPurchaseRequests()}
        {activePage === "purchase-orders" && renderPurchaseOrders()}
        {activePage === "rfqs" && renderRFQs()}

      
        {renderProjectViewModal()}

        {renderBOQModal()}
        {renderBOQDetailsModal()}
        {renderBOQItemModal()}
        {renderBOQItemViewModal()}

        {renderPurchaseRequestModal()}
        {renderPurchaseRequestViewModal()}
        {renderPurchaseRequestEditModal()}

        {renderRFQModal()}
        {renderRFQViewModal()}
        {renderRFQEditModal()}

        {renderPurchaseOrderModal()}
        {renderPurchaseOrderViewModal()}
      </main>



      {/* Purchase Details Modal */}

      {showPurchaseDetailsModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowPurchaseDetailsModal(false);
            setSelectedPurchase(null);
          }}



        >
          <div
            className="project-modal purchase-details-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  Purchase Details
                </h2>

                <p>
                  {selectedPurchase?.purchaseNo}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setShowPurchaseDetailsModal(false);
                  setSelectedPurchase(null);
                }}
              >
                ×
              </button>

            </div>


            {loadingPurchaseDetails ? (

              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                }}
              >
                Loading purchase details...
              </div>

            ) : selectedPurchase ? (

              <div className="purchase-details-content">

                <div className="purchase-info-grid">

                  <div>
                    <strong>
                      Purchase No
                    </strong>

                    <span>
                      {selectedPurchase.purchaseNo}
                    </span>
                  </div>

                  <div>
                    <strong>
                      Purchase Date
                    </strong>

                    <span>
                      {new Date(
                        selectedPurchase.purchaseDate
                      ).toLocaleDateString(
                        "en-GB"
                      )}
                    </span>
                  </div>

                  <div>
                    <strong>
                      Vendor
                    </strong>

                    <span>
                      {
                        selectedPurchase.vendor
                          ?.name || "-"
                      }
                    </span>
                  </div>

                  <div>
                    <strong>
                      Project
                    </strong>

                    <span>
                      {
                        selectedPurchase.project
                          ?.name || "-"
                      }
                    </span>
                  </div>

                  <div>
                    <strong>
                      Payment Status
                    </strong>

                    <span className="status-badge active">
                      {
                        selectedPurchase.paymentStatus
                      }
                    </span>
                  </div>

                </div>


                <div className="purchase-details-section">

                  <h3>
                    Purchase Items
                  </h3>

                  <div className="purchase-details-table-wrapper">

                    <table>

                      <thead>

                        <tr>
                          <th>Material</th>
                          <th>Quantity</th>
                          <th>Unit</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                        </tr>

                      </thead>

                      <tbody>

                        {selectedPurchase.items?.map(
                          (item) => (

                            <tr
                              key={item.id}
                            >

                              <td>
                                <strong>
                                  {
                                    item.material
                                      ?.name
                                  }
                                </strong>

                                <small
                                  style={{
                                    display:
                                      "block",
                                  }}
                                >
                                  {
                                    item.material
                                      ?.code || ""
                                  }
                                </small>
                              </td>

                              <td>
                                {Number(
                                  item.quantity
                                )}
                              </td>

                              <td>
                                {item.unit}
                              </td>

                              <td>
                                ৳
                                {Number(
                                  item.unitPrice
                                ).toLocaleString(
                                  "en-BD"
                                )}
                              </td>

                              <td>
                                ৳
                                {Number(
                                  item.total
                                ).toLocaleString(
                                  "en-BD"
                                )}
                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>


                <div className="purchase-summary">

                  <div>
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      ৳
                      {Number(
                        selectedPurchase.subtotal
                      ).toLocaleString(
                        "en-BD"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Discount
                    </span>

                    <strong>
                      ৳
                      {Number(
                        selectedPurchase.discount
                      ).toLocaleString(
                        "en-BD"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Transport Cost
                    </span>

                    <strong>
                      ৳
                      {Number(
                        selectedPurchase.transportCost
                      ).toLocaleString(
                        "en-BD"
                      )}
                    </strong>
                  </div>

                  <div className="grand-total">
                    <span>
                      Grand Total
                    </span>

                    <strong>
                      ৳
                      {Number(
                        selectedPurchase.grandTotal
                      ).toLocaleString(
                        "en-BD"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Paid
                    </span>

                    <strong>
                      ৳
                      {Number(
                        selectedPurchase.paidAmount
                      ).toLocaleString(
                        "en-BD"
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Due
                    </span>

                    <strong>
                      ৳
                      {Number(
                        selectedPurchase.dueAmount
                      ).toLocaleString(
                        "en-BD"
                      )}
                    </strong>
                  </div>

                </div>


                {selectedPurchase.notes && (
                  <div className="purchase-notes">

                    <strong>
                      Notes
                    </strong>

                    <p>
                      {selectedPurchase.notes}
                    </p>

                  </div>
                )}


                <div className="modal-actions">

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => {
                      setShowPurchaseDetailsModal(false);
                      setSelectedPurchase(null);
                    }}
                  >
                    Close
                  </button>

                </div>

              </div>

            ) : null}

          </div>
        </div>
      )}



      {/* =========================================
          ADD PROJECT MODAL
      ========================================= */}

      {showProjectModal && (

        <div
          className="modal-overlay"
          onClick={closeProjectModal}
        >

          <div
            className="project-modal transaction-edit-modal"
            style={{
              width: "900px",
              maxWidth: "95vw",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <h2>
                  {editingProjectId
                    ? "Edit Project"
                    : "Add New Project"}
                </h2>

                <p>
                  Add a new BE Interior project
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeProjectModal}
                disabled={savingProject}
              >
                <X size={22} />
              </button>

            </div>

            <form
              onSubmit={handleCreateProject}
              className="project-form"
            >

              <div className="form-group">

                <label>
                  Project Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={projectForm.name}
                  onChange={handleProjectChange}
                  placeholder="Example: Aftabnagar Residence Interior"
                  autoFocus
                />

              </div>

              <div className="form-group">

                <label>
                  Contract Value (৳)
                </label>

                <input
                  type="number"
                  name="contractValue"
                  value={projectForm.contractValue}
                  onChange={handleProjectChange}
                  placeholder="Example: 1500000"
                  min="0"
                />

              </div>

              <div className="form-group">

                <label>
                  Project Status
                </label>

                <select
                  name="status"
                  value={projectForm.status}
                  onChange={handleProjectChange}
                >
                  <option value="ONGOING">
                    Ongoing
                  </option>

                  <option value="COMPLETED">
                    Completed
                  </option>

                  <option value="ON_HOLD">
                    On Hold
                  </option>
                </select>

              </div>

              <div className="form-group">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={projectForm.notes}
                  onChange={handleProjectChange}
                  placeholder="Write project details or notes..."
                  rows="4"
                />

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeProjectModal}
                  disabled={savingProject}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={savingProject}
                >

                  {savingProject ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {editingProjectId
                        ? "Update Project"
                        : "Save Project"}
                    </>
                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =========================================
          ADD INCOME MODAL
      ========================================= */}

      {showIncomeModal && (
        <div
          className="modal-overlay"
          onClick={closeIncomeModal}
        >
          <div
            className="project-modal income-edit-modal"
            style={{
              width: "900px",
              maxWidth: "95vw",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <h2>
                  {editingIncomeId
                    ? "Edit Income"
                    : "Add New Income"}
                </h2>

                <p>
                  Add a new income transaction
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeIncomeModal}
                disabled={savingIncome}
              >
                <X size={22} />
              </button>

            </div>


            <form
              onSubmit={handleCreateIncome}
              className="project-form income-edit-form"
            >

              <div className="form-group income-notes-field">

                <label>
                  Income Date *
                </label>

                <input
                  type="date"
                  name="transactionDate"
                  value={
                    incomeForm.transactionDate
                  }
                  onChange={handleIncomeChange}
                />

              </div>


              <div className="form-group">

                <label>
                  Amount (৳) *
                </label>

                <input
                  type="number"
                  name="amount"
                  value={incomeForm.amount}
                  onChange={handleIncomeChange}
                  placeholder="Example: 500000"
                  min="1"
                />

              </div>











              <div className="form-group">

                <label>
                  Project
                </label>

                <select
                  name="projectId"
                  value={incomeForm.projectId}
                  onChange={handleIncomeChange}
                >

                  <option value="">
                    -- No Project --
                  </option>

                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  ))}

                </select>

              </div>



              <div className="form-group">

                <label>
                  Category
                </label>

                <select
                  name="categoryId"
                  value={incomeForm.categoryId}
                  onChange={handleIncomeChange}
                >
                  <option value="">
                    -- Select Category --
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>

              </div>









              <div className="form-group">

                <label>
                  Payment Method
                </label>

                <select
                  name="paymentMethod"
                  value={
                    incomeForm.paymentMethod
                  }
                  onChange={handleIncomeChange}
                >

                  <option value="CASH">
                    Cash
                  </option>

                  <option value="BANK">
                    Bank
                  </option>

                  <option value="MOBILE_BANKING">
                    Mobile Banking
                  </option>

                  <option value="OTHER">
                    Other
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Description
                </label>

                <input
                  type="text"
                  name="description"
                  value={
                    incomeForm.description
                  }
                  onChange={handleIncomeChange}
                  placeholder="Example: Client Payment"
                />

              </div>


              <div className="form-group">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={incomeForm.notes}
                  onChange={handleIncomeChange}
                  placeholder="Optional note"
                  rows="4"
                />

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeIncomeModal}
                  disabled={savingIncome}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={savingIncome}
                >

                  {savingIncome
                    ? "Saving..."
                    : editingIncomeId
                      ? "Update Income"
                      : "Save Income"}



                </button>

              </div>

            </form>

          </div>
        </div>
      )}


      {/* =========================================
    INCOME DETAILS MODAL
========================================= */}

      {showIncomeDetailsModal && (
        <div
          className="modal-overlay"
          onClick={closeIncomeDetails}
        >
          <div
            className="project-modal income-details-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <h2>
                  Income Details
                </h2>

                <p>
                  Transaction #{selectedIncome?.id}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeIncomeDetails}
              >
                <X size={22} />
              </button>

            </div>


            {selectedIncome && (
              <div
                style={{
                  padding: "24px",
                }}
              >

                {/* BASIC INFORMATION */}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "20px",
                    marginBottom: "24px",
                  }}
                >

                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Income ID
                    </small>

                    <strong
                      style={{
                        display: "block",
                      }}
                    >
                      #{selectedIncome.id}
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Income Date
                    </small>

                    <strong
                      style={{
                        display: "block",
                      }}
                    >
                      {selectedIncome.transactionDate
                        ? new Date(
                          selectedIncome.transactionDate
                        ).toLocaleDateString("en-GB")
                        : "-"}
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Project
                    </small>

                    <strong
                      style={{
                        display: "block",
                      }}
                    >
                      {selectedIncome.project?.name || "-"}
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Category
                    </small>

                    <strong
                      style={{
                        display: "block",
                      }}
                    >
                      {selectedIncome.category?.name || "-"}
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Worker
                    </small>

                    <strong
                      style={{
                        display: "block",
                      }}
                    >
                      {selectedIncome.worker?.name || "-"}
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Vendor
                    </small>

                    <strong
                      style={{
                        display: "block",
                      }}
                    >
                      {selectedIncome.vendor?.name || "-"}
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Payment Method
                    </small>

                    <strong
                      style={{
                        display: "block",
                      }}
                    >
                      {selectedIncome.paymentMethod
                        ?.replaceAll("_", " ") || "CASH"}
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Type
                    </small>

                    <strong
                      style={{
                        display: "block",
                      }}
                    >
                      {selectedIncome.type}
                    </strong>
                  </div>

                </div>

                {/* AMOUNT */}

                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "24px",
                    border:
                      "1px solid #e2e8f0",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      marginBottom: "8px",
                    }}
                  >
                    Income Amount
                  </span>

                  <strong
                    style={{
                      fontSize: "28px",
                    }}
                  >
                    ৳{" "}
                    {formatMoney(
                      selectedIncome.amount
                    )}
                  </strong>

                </div>


                {/* DESCRIPTION */}

                <div
                  style={{
                    marginBottom: "20px",
                  }}
                >

                  <h4>
                    Description
                  </h4>

                  <p>
                    {selectedIncome.description ||
                      "-"}
                  </p>

                </div>


                {/* NOTES */}

                <div>

                  <h4>
                    Notes
                  </h4>

                  <p>
                    {selectedIncome.notes ||
                      "-"}
                  </p>

                </div>


                {/* FOOTER */}

                <div
                  className="modal-actions"
                  style={{
                    marginTop: "24px",
                  }}
                >

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeIncomeDetails}
                  >
                    Close
                  </button>

                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* =========================================
    ADD EXPENSE MODAL
========================================= */}

      {showExpenseModal && (
        <div
          className="modal-overlay"
          onClick={closeExpenseModal}
        >
          <div
            className="project-modal expense-edit-modal"
            style={{
              width: "900px",
              maxWidth: "95vw",
              maxHeight: "90vh",
            }}
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-header">

              <div>
                <h2>
                  {editingExpenseId
                    ? "Edit Expense"
                    : "Add New Expense"}
                </h2>

                <p>
                  Add a new expense transaction
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeExpenseModal}
                disabled={savingExpense}
              >
                <X size={22} />
              </button>

            </div>


            <form
              onSubmit={handleCreateExpense}
              className="project-form expense-edit-form"
            >

              <div className="form-group expense-notes-field">

                <label>
                  Expense Date *
                </label>

                <input
                  type="date"
                  name="transactionDate"
                  value={
                    expenseForm.transactionDate
                  }
                  onChange={
                    handleExpenseChange
                  }
                />

              </div>


              <div className="form-group">

                <label>
                  Amount (৳) *
                </label>

                <input
                  type="number"
                  name="amount"
                  value={
                    expenseForm.amount
                  }
                  onChange={
                    handleExpenseChange
                  }
                  placeholder="Example: 50000"
                  min="1"
                />

              </div>


              <div className="form-group">

                <label>
                  Project
                </label>

                <select
                  name="projectId"
                  value={
                    expenseForm.projectId
                  }
                  onChange={
                    handleExpenseChange
                  }
                >

                  <option value="">
                    -- No Project --
                  </option>

                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  ))}

                </select>

              </div>


              <div className="form-group">

                <label>
                  Expense Category
                </label>

                <select
                  name="categoryId"
                  value={expenseForm.categoryId}
                  onChange={handleExpenseChange}
                >

                  <option value="">
                    -- Select Category --
                  </option>

                  {categories
                    .filter(
                      (category) =>
                        category.type === "EXPENSE"
                    )
                    .map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}

                </select>

              </div>





              <div className="form-group">

                <label>
                  Worker
                </label>

                <select
                  name="workerId"
                  value={
                    expenseForm.workerId
                  }
                  onChange={
                    handleExpenseChange
                  }
                >

                  <option value="">
                    -- Select Worker --
                  </option>

                  {/* Worker API পরে যোগ করবো */}
                  {workers.map((worker) => (
                    <option
                      key={worker.id}
                      value={worker.id}
                    >
                      {worker.name}
                    </option>
                  ))}



                </select>

              </div>


              <div className="form-group">

                <label>
                  Vendor
                </label>

                <select
                  name="vendorId"
                  value={
                    expenseForm.vendorId
                  }
                  onChange={
                    handleExpenseChange
                  }
                >

                  <option value="">
                    -- Select Vendor --
                  </option>

                  {/* Vendor API পরে যোগ করবো */}
                  {vendors.map((vendor) => (
                    <option
                      key={vendor.id}
                      value={vendor.id}
                    >
                      {vendor.name}
                    </option>
                  ))}



                </select>

              </div>


              <div className="form-group">

                <label>
                  Payment Method
                </label>

                <select
                  name="paymentMethod"
                  value={
                    expenseForm.paymentMethod
                  }
                  onChange={
                    handleExpenseChange
                  }
                >

                  <option value="CASH">
                    Cash
                  </option>

                  <option value="BANK">
                    Bank
                  </option>

                  <option value="MOBILE_BANKING">
                    Mobile Banking
                  </option>

                  <option value="OTHER">
                    Other
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Description
                </label>

                <input
                  type="text"
                  name="description"
                  value={
                    expenseForm.description
                  }
                  onChange={
                    handleExpenseChange
                  }
                  placeholder="Example: Material purchase"
                />

              </div>


              <div className="form-group">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={
                    expenseForm.notes
                  }
                  onChange={
                    handleExpenseChange
                  }
                  placeholder="Optional note"
                  rows="4"
                />

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeExpenseModal}
                  disabled={savingExpense}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={savingExpense}
                >
                  {savingExpense
                    ? "Saving..."
                    : editingExpenseId
                      ? "Update Expense"
                      : "Save Expense"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}



      {/* =========================================
    EXPENSE DETAILS MODAL
========================================= */}

      {showExpenseDetailsModal && (
        <div
          className="modal-overlay"
          onClick={closeExpenseDetails}
        >
          <div
            className="project-modal expense-details-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}

            <div className="modal-header">

              <div>
                <h2>
                  Expense Details
                </h2>

                <p>
                  Transaction #{selectedExpense?.id}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeExpenseDetails}
              >
                <X size={22} />
              </button>

            </div>


            {/* CONTENT */}

            {selectedExpense && (

              <div
                style={{
                  padding: "24px",
                }}
              >

                {/* BASIC INFORMATION */}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",
                    gap: "20px",
                    marginBottom: "24px",
                  }}
                >

                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Expense ID
                    </small>

                    <strong>
                      #{selectedExpense.id}
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Expense Date
                    </small>

                    <strong>
                      {selectedExpense.transactionDate
                        ? new Date(
                          selectedExpense.transactionDate
                        ).toLocaleDateString(
                          "en-GB"
                        )
                        : "-"}
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Project
                    </small>

                    <strong>
                      {
                        selectedExpense.project
                          ?.name || "-"
                      }
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Category
                    </small>

                    <strong>
                      {
                        selectedExpense.category
                          ?.name || "-"
                      }
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Worker
                    </small>

                    <strong>
                      {
                        selectedExpense.worker
                          ?.name || "-"
                      }
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Vendor
                    </small>

                    <strong>
                      {
                        selectedExpense.vendor
                          ?.name || "-"
                      }
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Payment Method
                    </small>

                    <strong>
                      {
                        selectedExpense.paymentMethod
                          ?.replaceAll(
                            "_",
                            " "
                          ) || "CASH"
                      }
                    </strong>
                  </div>


                  <div>
                    <small
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "#64748b",
                      }}
                    >
                      Type
                    </small>

                    <strong>
                      {selectedExpense.type}
                    </strong>
                  </div>

                </div>


                {/* AMOUNT */}

                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "24px",
                    border:
                      "1px solid #e2e8f0",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      marginBottom: "8px",
                    }}
                  >
                    Expense Amount
                  </span>

                  <strong
                    style={{
                      fontSize: "28px",
                    }}
                  >
                    ৳{" "}
                    {formatMoney(
                      selectedExpense.amount
                    )}
                  </strong>

                </div>


                {/* DESCRIPTION */}

                <div
                  style={{
                    marginBottom: "20px",
                  }}
                >

                  <h4>
                    Description
                  </h4>

                  <p>
                    {selectedExpense.description ||
                      "-"}
                  </p>

                </div>


                {/* NOTES */}

                <div>

                  <h4>
                    Notes
                  </h4>

                  <p>
                    {selectedExpense.notes ||
                      "-"}
                  </p>

                </div>


                {/* ACTIONS */}

                <div
                  className="modal-actions"
                  style={{
                    marginTop: "24px",
                  }}
                >

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeExpenseDetails}
                  >
                    Close
                  </button>

                </div>

              </div>

            )}

          </div>
        </div>
      )}



      {/* =========================================
    WORKER MODAL
========================================= */}

      {showWorkerModal && (
        <div
          className="modal-overlay"
          onClick={closeWorkerModal}
        >
          <div
            className="project-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  {editingWorkerId
                    ? "Edit Worker"
                    : "Add New Worker"}
                </h2>

                <p>
                  Manage BE Interior worker
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeWorkerModal}
                disabled={savingWorker}
              >
                <X size={22} />
              </button>

            </div>

            <form
              onSubmit={handleSaveWorker}
              className="project-form"
            >

              <div className="form-group">
                <label>
                  Worker Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={workerForm.name}
                  onChange={handleWorkerChange}
                  placeholder="Example: Shipon"
                />
              </div>

              <div className="form-group">
                <label>
                  Phone
                </label>

                <input
                  type="text"
                  name="phone"
                  value={workerForm.phone}
                  onChange={handleWorkerChange}
                  placeholder="Example: 017XXXXXXXX"
                />
              </div>

              <div className="form-group">
                <label>
                  Role
                </label>

                <input
                  type="text"
                  name="role"
                  value={workerForm.role}
                  onChange={handleWorkerChange}
                  placeholder="Example: Painter"
                />
              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeWorkerModal}
                  disabled={savingWorker}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={savingWorker}
                >
                  {savingWorker
                    ? "Saving..."
                    : editingWorkerId
                      ? "Update Worker"
                      : "Save Worker"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
      {/* =========================================
    WORKER DETAILS MODAL
========================================= */}

      {showWorkerDetailsModal && (
        <div
          className="modal-overlay"
          onClick={closeWorkerDetails}
        >
          <div
            className="project-modal worker-details-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}

            <div className="modal-header">

              <div>
                <h2>
                  Worker Details
                </h2>

                <p>
                  Worker #{selectedWorker?.id}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeWorkerDetails}
              >
                <X size={22} />
              </button>

            </div>


            {/* CONTENT */}

            {selectedWorker && (
              <div className="purchase-details-content">

                {/* BASIC INFORMATION */}

                <div className="purchase-info-grid">

                  <div>
                    <strong>
                      Worker ID
                    </strong>

                    <span>
                      #{selectedWorker.id}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Name
                    </strong>

                    <span>
                      {selectedWorker.name || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Phone
                    </strong>

                    <span>
                      {selectedWorker.phone || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Role
                    </strong>

                    <span>
                      {selectedWorker.role || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Status
                    </strong>

                    <span className="status-badge active">
                      {selectedWorker.status || "ACTIVE"}
                    </span>
                  </div>

                </div>


                {/* WORKER SUMMARY */}

                <div
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px",
                    marginTop: "24px",
                    marginBottom: "24px",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "16px",
                      marginBottom: "8px",
                    }}
                  >
                    Worker Name
                  </span>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "28px",
                      lineHeight: "1.2",
                    }}
                  >
                    {selectedWorker.name || "-"}
                  </strong>

                </div>


                {/* FOOTER */}

                <div
                  className="modal-actions"
                  style={{
                    marginTop: "24px",
                  }}
                >

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeWorkerDetails}
                  >
                    Close
                  </button>

                </div>

              </div>
            )}

          </div>
        </div>
      )}


      {/* =========================================
    VENDOR MODAL
========================================= */}

      {showVendorModal && (
        <div
          className="modal-overlay"
          onClick={closeVendorModal}
        >
          <div
            className="project-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  {editingVendorId
                    ? "Edit Vendor"
                    : "Add New Vendor"}
                </h2>

                <p>
                  Manage BE Interior vendor
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeVendorModal}
                disabled={savingVendor}
              >
                <X size={22} />
              </button>

            </div>

            <form
              onSubmit={handleSaveVendor}
              className="project-form"
            >

              <div className="form-group">
                <label>
                  Vendor Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={vendorForm.name}
                  onChange={handleVendorChange}
                  placeholder="Example: Sonali Partical"
                />
              </div>

              <div className="form-group">
                <label>
                  Company Name
                </label>

                <input
                  type="text"
                  name="companyName"
                  value={vendorForm.companyName}
                  onChange={handleVendorChange}
                  placeholder="Example: Sonali Furniture"
                />
              </div>

              <div className="form-group">
                <label>
                  Phone
                </label>

                <input
                  type="text"
                  name="phone"
                  value={vendorForm.phone}
                  onChange={handleVendorChange}
                  placeholder="Example: 017XXXXXXXX"
                />
              </div>

              <div className="form-group">
                <label>
                  Address
                </label>

                <textarea
                  name="address"
                  value={vendorForm.address}
                  onChange={handleVendorChange}
                  placeholder="Vendor address..."
                  rows="4"
                />
              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeVendorModal}
                  disabled={savingVendor}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={savingVendor}
                >
                  {savingVendor
                    ? "Saving..."
                    : editingVendorId
                      ? "Update Vendor"
                      : "Save Vendor"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
      {/* =========================================
    VENDOR DETAILS MODAL
========================================= */}

      {showVendorDetailsModal && (
        <div
          className="modal-overlay"
          onClick={closeVendorDetails}
        >
          <div
            className="project-modal vendor-details-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}

            <div className="modal-header">

              <div>
                <h2>
                  Vendor Details
                </h2>

                <p>
                  Vendor #{selectedVendor?.id}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeVendorDetails}
              >
                <X size={22} />
              </button>

            </div>


            {/* CONTENT */}

            {selectedVendor && (
              <div className="purchase-details-content">

                {/* BASIC INFORMATION */}

                <div className="purchase-info-grid">

                  <div>
                    <strong>
                      Vendor ID
                    </strong>

                    <span>
                      #{selectedVendor.id}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Vendor Name
                    </strong>

                    <span>
                      {selectedVendor.name || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Company Name
                    </strong>

                    <span>
                      {selectedVendor.companyName || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Phone
                    </strong>

                    <span>
                      {selectedVendor.phone || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Email
                    </strong>

                    <span>
                      {selectedVendor.email || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Status
                    </strong>

                    <span className="status-badge active">
                      {selectedVendor.status || "ACTIVE"}
                    </span>
                  </div>

                </div>


                {/* ADDRESS */}

                <div
                  className="purchase-notes"
                  style={{
                    marginTop: "24px",
                  }}
                >

                  <strong>
                    Address
                  </strong>

                  <p>
                    {selectedVendor.address || "-"}
                  </p>

                </div>


                {/* VENDOR SUMMARY */}

                <div
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px",
                    marginTop: "24px",
                    marginBottom: "24px",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "16px",
                      marginBottom: "8px",
                    }}
                  >
                    Vendor
                  </span>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "28px",
                      lineHeight: "1.2",
                    }}
                  >
                    {selectedVendor.name || "-"}
                  </strong>

                  {selectedVendor.companyName && (
                    <small
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "#64748b",
                      }}
                    >
                      {selectedVendor.companyName}
                    </small>
                  )}

                </div>


                {/* FOOTER */}

                <div
                  className="modal-actions"
                  style={{
                    marginTop: "24px",
                  }}
                >

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeVendorDetails}
                  >
                    Close
                  </button>

                </div>

              </div>
            )}

          </div>
        </div>
      )}



      {/* =========================================
    CATEGORY MODAL
========================================= */}

      {showCategoryModal && (
        <div
          className="modal-overlay"
          onClick={closeCategoryModal}
        >
          <div
            className="project-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  {editingCategoryId
                    ? "Edit Category"
                    : "Add New Category"}
                </h2>

                <p>
                  Manage finance transaction category
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeCategoryModal}
                disabled={savingCategory}
              >
                <X size={22} />
              </button>

            </div>


            <form
              onSubmit={handleSaveCategory}
              className="project-form"
            >

              <div className="form-group">

                <label>
                  Category Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={categoryForm.name}
                  onChange={handleCategoryChange}
                  placeholder="Example: Materials"
                  autoFocus
                />

              </div>


              <div className="form-group">

                <label>
                  Category Type *
                </label>

                <select
                  name="type"
                  value={categoryForm.type}
                  onChange={handleCategoryChange}
                >

                  <option value="INCOME">
                    Income
                  </option>

                  <option value="EXPENSE">
                    Expense
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Status
                </label>

                <select
                  name="status"
                  value={categoryForm.status}
                  onChange={handleCategoryChange}
                >

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>

                </select>

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeCategoryModal}
                  disabled={savingCategory}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={savingCategory}
                >

                  {savingCategory
                    ? "Saving..."
                    : editingCategoryId
                      ? "Update Category"
                      : "Save Category"}

                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================================
    EDIT TRANSACTION MODAL
========================================= */}

      {showTransactionModal && (
        <div
          className="modal-overlay"
          onClick={closeTransactionModal}
        >
          <div
            className="project-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  Edit Transaction
                </h2>

                <p>
                  Update income or expense transaction
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeTransactionModal}
                disabled={savingTransaction}
              >
                <X size={22} />
              </button>

            </div>


            <form
              onSubmit={handleUpdateTransaction}
              className="project-form transaction-edit-form"
            >

              <div className="form-group">

                <label>
                  Transaction Date *
                </label>

                <input
                  type="date"
                  name="transactionDate"
                  value={
                    transactionForm.transactionDate
                  }
                  onChange={
                    handleTransactionChange
                  }
                />

              </div>


              <div className="form-group">

                <label>
                  Transaction Type *
                </label>

                <select
                  name="type"
                  value={transactionForm.type}
                  onChange={
                    handleTransactionChange
                  }
                >

                  <option value="INCOME">
                    Income
                  </option>

                  <option value="EXPENSE">
                    Expense
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Amount (৳) *
                </label>

                <input
                  type="number"
                  name="amount"
                  value={
                    transactionForm.amount
                  }
                  onChange={
                    handleTransactionChange
                  }
                  min="1"
                />

              </div>


              <div className="form-group">

                <label>
                  Project
                </label>

                <select
                  name="projectId"
                  value={
                    transactionForm.projectId
                  }
                  onChange={
                    handleTransactionChange
                  }
                >

                  <option value="">
                    -- No Project --
                  </option>

                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  ))}

                </select>

              </div>


              <div className="form-group">

                <label>
                  Category
                </label>

                <select
                  name="categoryId"
                  value={
                    transactionForm.categoryId
                  }
                  onChange={
                    handleTransactionChange
                  }
                >

                  <option value="">
                    -- Select Category --
                  </option>

                  {categories
                    .filter(
                      (category) =>
                        category.type ===
                        transactionForm.type
                    )
                    .map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}

                </select>

              </div>


              <div className="form-group">

                <label>
                  Worker
                </label>

                <select
                  name="workerId"
                  value={
                    transactionForm.workerId
                  }
                  onChange={
                    handleTransactionChange
                  }
                >

                  <option value="">
                    -- Select Worker --
                  </option>

                  {workers.map((worker) => (
                    <option
                      key={worker.id}
                      value={worker.id}
                    >
                      {worker.name}
                    </option>
                  ))}

                </select>

              </div>


              <div className="form-group">

                <label>
                  Vendor
                </label>

                <select
                  name="vendorId"
                  value={
                    transactionForm.vendorId
                  }
                  onChange={
                    handleTransactionChange
                  }
                >

                  <option value="">
                    -- Select Vendor --
                  </option>

                  {vendors.map((vendor) => (
                    <option
                      key={vendor.id}
                      value={vendor.id}
                    >
                      {vendor.name}
                    </option>
                  ))}

                </select>

              </div>


              <div className="form-group">

                <label>
                  Payment Method
                </label>

                <select
                  name="paymentMethod"
                  value={
                    transactionForm.paymentMethod
                  }
                  onChange={
                    handleTransactionChange
                  }
                >

                  <option value="CASH">
                    Cash
                  </option>

                  <option value="BANK">
                    Bank
                  </option>

                  <option value="MOBILE_BANKING">
                    Mobile Banking
                  </option>

                  <option value="OTHER">
                    Other
                  </option>

                </select>

              </div>


              <div className="form-group">

                <label>
                  Description
                </label>

                <input
                  type="text"
                  name="description"
                  value={
                    transactionForm.description
                  }
                  onChange={
                    handleTransactionChange
                  }
                />

              </div>


              <div className="form-group">

                <label>
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={
                    transactionForm.notes
                  }
                  onChange={
                    handleTransactionChange
                  }
                  rows="4"
                />

              </div>


              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeTransactionModal}
                  disabled={savingTransaction}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                  disabled={savingTransaction}
                >

                  {savingTransaction
                    ? "Updating..."
                    : "Update Transaction"}

                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================================
    TRANSACTION DETAILS MODAL
========================================= */}

      {showTransactionDetailsModal && (
        <div
          className="modal-overlay"
          onClick={closeTransactionDetails}
        >
          <div
            className="project-modal transaction-details-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}

            <div className="modal-header">

              <div>
                <h2>
                  Transaction Details
                </h2>

                <p>
                  Transaction #{selectedTransaction?.id}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeTransactionDetails}
              >
                <X size={22} />
              </button>

            </div>


            {/* CONTENT */}

            {selectedTransaction && (
              <div className="purchase-details-content">

                {/* BASIC INFORMATION */}

                <div className="purchase-info-grid">

                  <div>
                    <strong>
                      Transaction ID
                    </strong>

                    <span>
                      #{selectedTransaction.id}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Transaction Date
                    </strong>

                    <span>
                      {selectedTransaction.transactionDate
                        ? new Date(
                          selectedTransaction.transactionDate
                        ).toLocaleDateString("en-GB")
                        : "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Type
                    </strong>

                    <span>
                      {selectedTransaction.type}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Payment Method
                    </strong>

                    <span>
                      {selectedTransaction.paymentMethod
                        ?.replaceAll("_", " ")
                        || "CASH"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Project
                    </strong>

                    <span>
                      {selectedTransaction.project?.name || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Category
                    </strong>

                    <span>
                      {selectedTransaction.category?.name || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Worker
                    </strong>

                    <span>
                      {selectedTransaction.worker?.name || "-"}
                    </span>
                  </div>


                  <div>
                    <strong>
                      Vendor
                    </strong>

                    <span>
                      {selectedTransaction.vendor?.name || "-"}
                    </span>
                  </div>

                </div>


                {/* AMOUNT */}

                {/* TRANSACTION AMOUNT */}

                <div
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px",
                    marginTop: "24px",
                    marginBottom: "24px",
                  }}
                >

                  <span
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "16px",
                      marginBottom: "8px",
                    }}
                  >
                    Transaction Amount
                  </span>

                  <strong
                    style={{
                      display: "block",
                      fontSize: "28px",
                      lineHeight: "1.2",
                    }}
                  >
                    {selectedTransaction.type === "INCOME"
                      ? "+ "
                      : "- "}
                    ৳{" "}
                    {formatMoney(
                      selectedTransaction.amount
                    )}
                  </strong>

                </div>




                {/* DESCRIPTION */}

                <div
                  className="purchase-notes"
                  style={{
                    marginTop: "24px",
                  }}
                >

                  <strong>
                    Description
                  </strong>

                  <p>
                    {selectedTransaction.description || "-"}
                  </p>

                </div>


                {/* NOTES */}

                <div
                  className="purchase-notes"
                  style={{
                    marginTop: "16px",
                  }}
                >

                  <strong>
                    Notes
                  </strong>

                  <p>
                    {selectedTransaction.notes || "-"}
                  </p>

                </div>


                {/* FOOTER */}

                <div
                  className="modal-actions"
                  style={{
                    marginTop: "24px",
                  }}
                >

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={closeTransactionDetails}
                  >
                    Close
                  </button>

                </div>

              </div>
            )}




          </div>
        </div>
      )}

    </div>
  );
}

export default App;