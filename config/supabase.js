const SUPABASE_URL = "https://okyujxqzzrxtmtuimndk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reXVqeHF6enJ4dG10dWltbmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDIyNjYsImV4cCI6MjA4ODY3ODI2Nn0.KAk2TEAm_QVBo15wK5AWk4RfT5I7CNWd7SoiACqs7Yw";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const AppState = {
  currentUser: null,
  employeeTypes: [],
  departments: [],
  jobs: [],
  lines: [],
  vehicles: [],
  pricing: [],
  employees: [],
  attendance: [],
  leaveRequests: [],
  loans: [],
  adjustments: [],
  payrollArchive: [],
  employeeHistory: [],
  deleteRequests: [],
  users: [],
  logs: [],
  backups: [],
  settings: [],
  payrollOverrides: [],
  fingerprintPreviewRows: [],
  attendanceChart: null
};

const TABLES = {
  employeeTypes: "employee_types",
  departments: "departments",
  jobs: "jobs",
  lines: "lines",
  vehicles: "vehicles",
  pricing: "pricing",
  employees: "employees",
  attendance: "attendance",
  leaveRequests: "leave_requests",
  loans: "loans",
  adjustments: "adjustments",
  payrollArchive: "payroll_archive",
  employeeHistory: "employee_history",
  deleteRequests: "delete_requests",
  users: "app_users",
  logs: "app_logs",
  backups: "backups",
  settings: "system_settings",
  payrollOverrides: "payroll_month_overrides"
};

const PERMISSIONS = {
  "مدير النظام": { all: true },
  "الإدارة": {
    sections: [
      "dashboardSection","executiveSection","reportsSection","payrollArchiveSection","logsSection","backupsSection","settingsSection"
    ]
  },
  "المحاسب": {
    sections: [
      "dashboardSection","payrollSection","payrollArchiveSection","loansSection","adjustmentsSection","reportsSection","backupsSection"
    ]
  },
  "الموارد البشرية": {
    sections: [
      "dashboardSection","employeesSection","employeeTypesSection","departmentsSection","jobsSection","employeeHistorySection","attendanceSection","attendanceHistorySection","leaveSection","fingerprintSection","reportsSection"
    ]
  },
  "مستخدم عرض فقط": {
    sections: [
      "dashboardSection","executiveSection","reportsSection"
    ]
  },
  "HR": {
    sections: [
      "dashboardSection","employeesSection","employeeTypesSection","departmentsSection","jobsSection","employeeHistorySection","attendanceSection","attendanceHistorySection","leaveSection","fingerprintSection","reportsSection"
    ]
  },
  "محاسب": {
    sections: [
      "dashboardSection","payrollSection","payrollArchiveSection","loansSection","adjustmentsSection","reportsSection","backupsSection"
    ]
  },
  "مشرف": {
    sections: [
      "dashboardSection","attendanceSection","attendanceHistorySection","leaveSection","fingerprintSection","reportsSection"
    ]
  },
  "موظف": {
    sections: ["dashboardSection"]
  }
};

function $(id) {
  return document.getElementById(id);
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

function bytesToMB(bytes) {
  return (Number(bytes || 0) / (1024 * 1024)).toFixed(2);
}

function showMessage(elementId, text, isError = true) {
  const el = $(elementId);
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  el.className = isError ? "message-box error" : "message-box success";
}

function hideMessage(elementId) {
  const el = $(elementId);
  if (!el) return;
  el.classList.add("hidden");
}

function openInfoModal(title, text) {
  if (typeof App === "undefined" || typeof App.openModal !== "function") {
    alert(text);
    return;
  }
  App.openModal(
    title,
    `<div class="info-box">${safeText(text)}</div>`,
    () => App.closeModal()
  );
}

async function sbSelect(tableName, orderBy = null, ascending = true) {
  let query = sb.from(tableName).select("*");
  if (orderBy) {
    query = query.order(orderBy, { ascending });
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function sbInsert(tableName, payload) {
  const { data, error } = await sb.from(tableName).insert(payload).select();
  if (error) throw error;
  return data || [];
}

async function sbUpdate(tableName, id, payload) {
  const { data, error } = await sb.from(tableName).update(payload).eq("id", id).select();
  if (error) throw error;
  return data || [];
}

async function sbDelete(tableName, id) {
  const { error } = await sb.from(tableName).delete().eq("id", id);
  if (error) throw error;
}

async function loadCoreData() {
  const result = await Promise.all([
    sbSelect(TABLES.employeeTypes, "name"),
    sbSelect(TABLES.departments, "name"),
    sbSelect(TABLES.jobs, "name"),
    sbSelect(TABLES.lines, "name"),
    sbSelect(TABLES.vehicles, "name"),
    sbSelect(TABLES.pricing, "amount"),
    sbSelect(TABLES.employees, "employee_no"),
    sbSelect(TABLES.attendance, "date", false),
    sbSelect(TABLES.leaveRequests, "from_date", false),
    sbSelect(TABLES.loans, "created_at", false),
    sbSelect(TABLES.adjustments, "month", false),
    sbSelect(TABLES.payrollArchive, "month", false),
    sbSelect(TABLES.employeeHistory, "created_at", false),
    sbSelect(TABLES.deleteRequests, "created_at", false),
    sbSelect(TABLES.users, "username"),
    sbSelect(TABLES.logs, "created_at", false),
    sbSelect(TABLES.backups, "created_at", false),
    sbSelect(TABLES.settings, "key"),
    sbSelect(TABLES.payrollOverrides, "created_at", false)
  ]);

  [
    AppState.employeeTypes,
    AppState.departments,
    AppState.jobs,
    AppState.lines,
    AppState.vehicles,
    AppState.pricing,
    AppState.employees,
    AppState.attendance,
    AppState.leaveRequests,
    AppState.loans,
    AppState.adjustments,
    AppState.payrollArchive,
    AppState.employeeHistory,
    AppState.deleteRequests,
    AppState.users,
    AppState.logs,
    AppState.backups,
    AppState.settings,
    AppState.payrollOverrides
  ] = result;
}

function getPermissionForRole(role) {
  return PERMISSIONS[role] || PERMISSIONS["مستخدم عرض فقط"];
}

function userCanAccess(sectionId) {
  if (!AppState.currentUser) return false;
  const permission = getPermissionForRole(AppState.currentUser.role);
  if (permission.all) return true;
  return permission.sections.includes(sectionId);
}
