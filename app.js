/* =========================================
   نظام عيون الغد - app.js
   نسخة منظمة مبدئية V4
========================================= */

const STORAGE_KEYS = {
  employees: "oyoon_v4_employees",
  attendance: "oyoon_v4_attendance",
  backups: "oyoon_v4_backups",
  darkMode: "oyoon_v4_dark_mode"
};

const BACKUP_LIMIT_MB = 50;

const state = {
  employees: [],
  attendance: [],
  backups: [],
  attendanceChart: null,
  departmentChart: null
};

/* =========================================
   أدوات عامة
========================================= */

function $(id) {
  return document.getElementById(id);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function formatDateTime(date = new Date()) {
  return date.toLocaleString("ar-EG");
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function currentMonthPrefix() {
  return new Date().toISOString().slice(0, 7);
}

function bytesToMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function estimateObjectSizeBytes(obj) {
  return new Blob([JSON.stringify(obj)]).size;
}

function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function countWorkDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const weekDay = new Date(year, month - 1, day).getDay();
    if (weekDay !== 5) {
      count++;
    }
  }

  return count;
}

/* =========================================
   تهيئة البيانات
========================================= */

function seedDemoData() {
  const employees = loadFromStorage(STORAGE_KEYS.employees);
  const attendance = loadFromStorage(STORAGE_KEYS.attendance);

  if (employees.length === 0) {
    const demoEmployees = [
      {
        id: createId("emp"),
        employeeNo: "1001",
        name: "أحمد سالم",
        department: "المبيعات",
        jobTitle: "مسوق",
        type: "عادي",
        salary: 1800
      },
      {
        id: createId("emp"),
        employeeNo: "1002",
        name: "محمد علي",
        department: "الحركة",
        jobTitle: "سائق",
        type: "سائق",
        salary: 2200
      },
      {
        id: createId("emp"),
        employeeNo: "1003",
        name: "خالد محمود",
        department: "الحركة",
        jobTitle: "سائق احتياط",
        type: "سائق احتياط",
        salary: 1600
      },
      {
        id: createId("emp"),
        employeeNo: "1004",
        name: "يوسف إبراهيم",
        department: "الإدارة",
        jobTitle: "مشرف",
        type: "عادي",
        salary: 2500
      }
    ];

    saveToStorage(STORAGE_KEYS.employees, demoEmployees);
  }

  if (attendance.length === 0) {
    const loadedEmployees = loadFromStorage(STORAGE_KEYS.employees);

    const demoAttendance = [
      {
        id: createId("att"),
        date: todayISO(),
        employeeId: loadedEmployees[0]?.id || "",
        employeeName: loadedEmployees[0]?.name || "",
        status: "حضور",
        checkIn: "08:05",
        lateMinutes: 0
      },
      {
        id: createId("att"),
        date: todayISO(),
        employeeId: loadedEmployees[1]?.id || "",
        employeeName: loadedEmployees[1]?.name || "",
        status: "تأخير",
        checkIn: "08:25",
        lateMinutes: 25
      },
      {
        id: createId("att"),
        date: todayISO(),
        employeeId: loadedEmployees[2]?.id || "",
        employeeName: loadedEmployees[2]?.name || "",
        status: "غياب",
        checkIn: "",
        lateMinutes: 0
      },
      {
        id: createId("att"),
        date: todayISO(),
        employeeId: loadedEmployees[3]?.id || "",
        employeeName: loadedEmployees[3]?.name || "",
        status: "حضور",
        checkIn: "07:58",
        lateMinutes: 0
      }
    ];

    saveToStorage(STORAGE_KEYS.attendance, demoAttendance);
  }
}

function loadState() {
  state.employees = safeArray(loadFromStorage(STORAGE_KEYS.employees));
  state.attendance = safeArray(loadFromStorage(STORAGE_KEYS.attendance));
  state.backups = safeArray(loadFromStorage(STORAGE_KEYS.backups));
}

/* =========================================
   التنقل بين الأقسام
========================================= */

function showSection(sectionId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  const target = $(sectionId);
  if (target) {
    target.classList.add("active");
  }

  const titles = {
    dashboard: "لوحة التحكم",
    employees: "الموظفون",
    departments: "الأقسام",
    jobs: "الوظائف",
    lines: "خطوط التوزيع",
    vehicles: "أنواع السيارات",
    pricing: "تسعير الخطوط",
    attendance: "الحضور",
    fingerprint: "البصمة",
    loans: "السلف والديون",
    adjustments: "الإضافات والخصومات",
    payroll: "الرواتب",
    deleteRequests: "طلبات الحذف",
    users: "المستخدمون",
    reports: "التقارير",
    backups: "النسخ الاحتياطية",
    settings: "الإعدادات"
  };

  if ($("pageTitle")) {
    $("pageTitle").textContent = titles[sectionId] || "النظام";
  }
}

/* =========================================
   الوضع الليلي
========================================= */

function applyDarkMode() {
  const enabled = localStorage.getItem(STORAGE_KEYS.darkMode) === "1";
  document.documentElement.classList.toggle("dark", enabled);
  document.body.classList.toggle("dark", enabled);
}

function toggleDarkMode() {
  const enabled = localStorage.getItem(STORAGE_KEYS.darkMode) === "1";
  localStorage.setItem(STORAGE_KEYS.darkMode, enabled ? "0" : "1");
  applyDarkMode();
}

/* =========================================
   الوقت والتاريخ
========================================= */

function updateDateTime() {
  if ($("dateTime")) {
    $("dateTime").textContent = formatDateTime();
  }
}

/* =========================================
   الموظفون
========================================= */

function renderEmployeesTable() {
  const tbody = $("employeesTable");
  if (!tbody) return;

  if (state.employees.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">لا توجد بيانات موظفين</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.employees.map((employee) => {
    return `
      <tr>
        <td>${employee.employeeNo || ""}</td>
        <td>${employee.name || ""}</td>
        <td>${employee.department || ""}</td>
        <td>${employee.jobTitle || ""}</td>
        <td>${employee.type || ""}</td>
        <td>${Number(employee.salary || 0).toFixed(2)}</td>
      </tr>
    `;
  }).join("");
}

function openEmployeeForm() {
  const employeeNo = prompt("الرقم الوظيفي");
  if (!employeeNo) return;

  const name = prompt("اسم الموظف");
  if (!name) return;

  const department = prompt("القسم", "المبيعات") || "";
  const jobTitle = prompt("الوظيفة", "موظف") || "";
  const type = prompt("نوع الموظف: عادي / سائق / سائق احتياط", "عادي") || "عادي";
  const salary = Number(prompt("الراتب", "0") || 0);

  state.employees.push({
    id: createId("emp"),
    employeeNo,
    name,
    department,
    jobTitle,
    type,
    salary
  });

  saveToStorage(STORAGE_KEYS.employees, state.employees);
  autoCreateBackup("إضافة موظف");
  renderEmployeesTable();
  refreshDashboard();
}

/* =========================================
   الحضور
========================================= */

function renderAttendanceTable() {
  const tbody = $("attendanceTable");
  if (!tbody) return;

  if (state.attendance.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">لا توجد سجلات حضور</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.attendance
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((row) => {
      return `
        <tr>
          <td>${row.date || ""}</td>
          <td>${row.employeeName || ""}</td>
          <td>${row.status || ""}</td>
          <td>${row.checkIn || "-"}</td>
          <td>${row.lateMinutes || 0}</td>
        </tr>
      `;
    })
    .join("");
}

/* =========================================
   التقارير والتصدير
========================================= */

function exportArrayToCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    alert("لا توجد بيانات للتصدير");
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(",")
    )
  ];

  const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function exportEmployees() {
  const rows = state.employees.map((e) => ({
    الرقم_الوظيفي: e.employeeNo,
    الاسم: e.name,
    القسم: e.department,
    الوظيفة: e.jobTitle,
    النوع: e.type,
    الراتب: e.salary
  }));

  exportArrayToCSV("employees.csv", rows);
}

function exportAttendance() {
  const rows = state.attendance.map((a) => ({
    التاريخ: a.date,
    الموظف: a.employeeName,
    الحالة: a.status,
    وقت_الدخول: a.checkIn,
    التأخير: a.lateMinutes
  }));

  exportArrayToCSV("attendance.csv", rows);
}

function exportPayroll() {
  const payrollRows = buildPayrollRows().map((row) => ({
    الموظف: row.name,
    النوع: row.type,
    أيام_العمل: row.workDays,
    الحضور: row.presentDays,
    الغياب: row.absentDays,
    المستحق: row.deservedSalary.toFixed(2)
  }));

  exportArrayToCSV("payroll.csv", payrollRows);
}

function exportPayrollPDF() {
  window.print();
}

/* =========================================
   النسخ الاحتياطية
========================================= */

function getBackupUsageBytes() {
  return state.backups.reduce((sum, backup) => sum + Number(backup.sizeBytes || 0), 0);
}

function getBackupUsageMB() {
  return Number(bytesToMB(getBackupUsageBytes()));
}

function getRemainingBackupMB() {
  return Math.max(BACKUP_LIMIT_MB - getBackupUsageMB(), 0).toFixed(2);
}

function buildBackupSnapshot(reason = "نسخة احتياطية") {
  return {
    employees: state.employees,
    attendance: state.attendance,
    reason
  };
}

function cleanupOldBackupsIfNeeded() {
  let totalMB = getBackupUsageMB();

  while (totalMB >= BACKUP_LIMIT_MB && state.backups.length > 0) {
    state.backups.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    state.backups.shift();
    totalMB = getBackupUsageMB();
  }

  saveToStorage(STORAGE_KEYS.backups, state.backups);
}

function autoCreateBackup(reason = "تحديث تلقائي") {
  const snapshot = buildBackupSnapshot(reason);
  const sizeBytes = estimateObjectSizeBytes(snapshot);

  state.backups.push({
    id: createId("backup"),
    createdAt: new Date().toISOString(),
    reason,
    sizeBytes,
    snapshot
  });

  cleanupOldBackupsIfNeeded();
  saveToStorage(STORAGE_KEYS.backups, state.backups);
  renderBackupsTable();
  updateBackupStatus();
}

function createBackup() {
  autoCreateBackup("نسخة يدوية");
  alert("تم إنشاء نسخة احتياطية");
}

function downloadBackup(backupId) {
  const backup = state.backups.find((b) => b.id === backupId);
  if (!backup) return;

  const blob = new Blob([JSON.stringify(backup.snapshot, null, 2)], {
    type: "application/json"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `backup-${backup.createdAt}.json`;
  link.click();
}

function renderBackupsTable() {
  const tbody = $("backupsTable");
  if (!tbody) return;

  if (state.backups.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3">لا توجد نسخ احتياطية</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = state.backups
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((backup) => {
      return `
        <tr>
          <td>${formatDateTime(new Date(backup.createdAt))}</td>
          <td>${bytesToMB(backup.sizeBytes)} MB</td>
          <td>
            <button onclick="downloadBackup('${backup.id}')">تحميل</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function updateBackupStatus() {
  const usageText = `
المستخدم: ${getBackupUsageMB().toFixed(2)} MB |
المتاح: ${getRemainingBackupMB()} MB |
الحد الكلي: ${BACKUP_LIMIT_MB} MB |
عدد النسخ: ${state.backups.length}
  `.trim();

  if ($("backupUsage")) {
    $("backupUsage").textContent = usageText;
  }
}

/* =========================================
   إحصائيات لوحة التحكم
========================================= */

function getTodayAttendanceRows() {
  return state.attendance.filter((row) => row.date === todayISO());
}

function getTodayPresentCount() {
  return getTodayAttendanceRows().filter((row) => row.status === "حضور").length;
}

function getTodayAbsentCount() {
  return getTodayAttendanceRows().filter((row) => row.status === "غياب").length;
}

function getTodayLateCount() {
  return getTodayAttendanceRows().filter((row) => row.status === "تأخير").length;
}

function computeTopByStatus(status) {
  const month = currentMonthPrefix();
  const counts = {};

  state.attendance
    .filter((row) => String(row.date).startsWith(month))
    .forEach((row) => {
      if (row.status === status) {
        const key = row.employeeName || "غير معروف";
        counts[key] = (counts[key] || 0) + 1;
      }
    });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function computeTopLate() {
  const month = currentMonthPrefix();
  const counts = {};

  state.attendance
    .filter((row) => String(row.date).startsWith(month))
    .forEach((row) => {
      if (row.status === "تأخير") {
        const key = row.employeeName || "غير معروف";
        counts[key] = (counts[key] || 0) + Number(row.lateMinutes || 0);
      }
    });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
}

function renderTopLists() {
  const topAttendance = $("topAttendance");
  const topAbsence = $("topAbsence");
  const topLate = $("topLate");

  if (topAttendance) {
    const rows = computeTopByStatus("حضور");
    topAttendance.innerHTML = rows.length
      ? rows.map((row) => `<li>${row[0]} - ${row[1]}</li>`).join("")
      : "<li>لا توجد بيانات</li>";
  }

  if (topAbsence) {
    const rows = computeTopByStatus("غياب");
    topAbsence.innerHTML = rows.length
      ? rows.map((row) => `<li>${row[0]} - ${row[1]}</li>`).join("")
      : "<li>لا توجد بيانات</li>";
  }

  if (topLate) {
    const rows = computeTopLate();
    topLate.innerHTML = rows.length
      ? rows.map((row) => `<li>${row[0]} - ${row[1]} دقيقة</li>`).join("")
      : "<li>لا توجد بيانات</li>";
  }
}

function renderCards() {
  if ($("employeesCount")) $("employeesCount").textContent = state.employees.length;
  if ($("todayAttendance")) $("todayAttendance").textContent = getTodayPresentCount();
  if ($("todayAbsence")) $("todayAbsence").textContent = getTodayAbsentCount();
  if ($("todayLate")) $("todayLate").textContent = getTodayLateCount();
}

function renderAttendanceChart() {
  const canvas = $("attendanceChart");
  if (!canvas) return;

  const data = [
    getTodayPresentCount(),
    getTodayAbsentCount(),
    getTodayLateCount()
  ];

  if (state.attendanceChart) {
    state.attendanceChart.destroy();
  }

  state.attendanceChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["حضور", "غياب", "تأخير"],
      datasets: [
        {
          label: "إحصائيات اليوم",
          data
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        }
      }
    }
  });
}

function renderDepartmentChart() {
  const canvas = $("departmentChart");
  if (!canvas) return;

  const counts = {};
  state.employees.forEach((employee) => {
    const dep = employee.department || "غير محدد";
    counts[dep] = (counts[dep] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const values = Object.values(counts);

  if (state.departmentChart) {
    state.departmentChart.destroy();
  }

  state.departmentChart = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          label: "الموظفون حسب القسم",
          data: values
        }
      ]
    },
    options: {
      responsive: true
    }
  });
}

/* =========================================
   الرواتب - أساس مبدئي
========================================= */

function buildPayrollRows() {
  const month = currentMonthPrefix();
  const [year, monthNumber] = month.split("-").map(Number);
  const workDays = countWorkDaysInMonth(year, monthNumber);

  return state.employees.map((employee) => {
    const employeeAttendance = state.attendance.filter((row) => {
      return row.employeeId === employee.id && String(row.date).startsWith(month);
    });

    const presentDays = employeeAttendance.filter((row) =>
      ["حضور", "تأخير"].includes(row.status)
    ).length;

    const absentDays = employeeAttendance.filter((row) =>
      row.status === "غياب"
    ).length;

    const deservedSalary = workDays > 0
      ? (Number(employee.salary || 0) / workDays) * presentDays
      : 0;

    return {
      name: employee.name,
      type: employee.type,
      workDays,
      presentDays,
      absentDays,
      deservedSalary
    };
  });
}

/* =========================================
   التحديث العام
========================================= */

function refreshDashboard() {
  renderCards();
  renderTopLists();
  renderAttendanceChart();
  renderDepartmentChart();
  updateBackupStatus();
}

function renderAll() {
  renderEmployeesTable();
  renderAttendanceTable();
  renderBackupsTable();
  refreshDashboard();
}

/* =========================================
   الإقلاع
========================================= */

function initApp() {
  seedDemoData();
  loadState();
  applyDarkMode();
  updateDateTime();
  renderAll();
  showSection("dashboard");

  setInterval(updateDateTime, 1000);
}

window.addEventListener("load", initApp);
