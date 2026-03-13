/* =========================================
Oyoon Alghad HR System - V4 Final
LocalStorage + PWA-ready
========================================= */

const STORAGE_KEYS = {
employees: "oyoon_v4_employees",
employeeTypes: "oyoon_v4_employee_types",
departments: "oyoon_v4_departments",
jobs: "oyoon_v4_jobs",
lines: "oyoon_v4_lines",
vehicles: "oyoon_v4_vehicles",
pricing: "oyoon_v4_pricing",
attendance: "oyoon_v4_attendance",
leave: "oyoon_v4_leave",
loans: "oyoon_v4_loans",
adjustments: "oyoon_v4_adjustments",
deleteRequests: "oyoon_v4_delete_requests",
users: "oyoon_v4_users",
permissions: "oyoon_v4_permissions",
logs: "oyoon_v4_logs",
payrollArchive: "oyoon_v4_payroll_archive",
employeeHistory: "oyoon_v4_employee_history",
backups: "oyoon_v4_backups",
darkMode: "oyoon_v4_dark_mode",
notifications: "oyoon_v4_notifications"
};

const BACKUP_LIMIT_MB = 50;

const state = {
employees: [],
employeeTypes: [],
departments: [],
jobs: [],
lines: [],
vehicles: [],
pricing: [],
attendance: [],
leave: [],
loans: [],
adjustments: [],
deleteRequests: [],
users: [],
permissions: [],
logs: [],
payrollArchive: [],
employeeHistory: [],
backups: [],
attendanceChart: null,
departmentChart: null,
deferredInstallPrompt: null,
currentUser: { username: "admin", fullName: "مدير النظام", role: "مدير النظام", status: "active" },
currentModalSave: null,
currentDeleteContext: null
};

/* =========================================
Base helpers
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

function loadFromStorage(key, fallback = []) {
try {
const raw = localStorage.getItem(key);
return raw ? JSON.parse(raw) : fallback;
} catch {
return fallback;
}
}

function createId(prefix = "id") {
return ${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)};
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

function formatDateTime(value = new Date()) {
const date = value instanceof Date ? value : new Date(value);
return date.toLocaleString("en-GB", {
year: "numeric",
month: "2-digit",
day: "2-digit",
hour: "2-digit",
minute: "2-digit",
second: "2-digit",
hour12: true
});
}

function formatNumber(value) {
return Number(value || 0).toFixed(2);
}

function escapeHtml(value) {
return String(value ?? "")
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

function monthNameLabel(monthValue) {
if (!monthValue) return "-";
const [year, month] = monthValue.split("-").map(Number);
const d = new Date(year, month - 1, 1);
return d.toLocaleDateString("en-GB", { year: "numeric", month: "long" });
}

function countWorkDaysInMonth(year, month) {
const daysInMonth = new Date(year, month, 0).getDate();
let count = 0;
for (let day = 1; day <= daysInMonth; day++) {
const weekDay = new Date(year, month - 1, day).getDay();
if (weekDay !== 5) count++;
}
return count;
}

function getStatusBadge(status) {
const map = {
"حضور": "success",
"غياب": "danger",
"تأخير": "warn",
"إجازة": "info",
"نشط": "success",
"معلق": "warn",
"active": "success",
"inactive": "danger"
};
const cls = map[status] || "info";
return <span class="status-pill ${cls}">${escapeHtml(status)}</span>;
}

function downloadTextFile(filename, content, mime = "text/plain;charset=utf-8") {
const blob = new Blob([content], { type: mime });
const link = document.createElement("a");
link.href = URL.createObjectURL(blob);
link.download = filename;
link.click();
}

function exportArrayToCSV(filename, rows) {
if (!rows || rows.length === 0) {
openInfoModal("لا توجد بيانات للتصدير.");
return;
}
const headers = Object.keys(rows[0]);
const csvLines = [
headers.join(","),
...rows.map((row) =>
headers
.map((header) => "${String(row[header] ?? "").replace(/"/g, '""')}")
.join(",")
)
];
downloadTextFile(filename, "\uFEFF" + csvLines.join("\n"), "text/csv;charset=utf-8");
}

/* =========================================
Logging
========================================= */

function addLog(action, details = "") {
state.logs.unshift({
id: createId("log"),
action,
user: state.currentUser.username || "admin",
time: new Date().toISOString(),
details
});
saveToStorage(STORAGE_KEYS.logs, state.logs);
}

function addEmployeeHistory(employeeId, changeText) {
state.employeeHistory.unshift({
id: createId("eh"),
employeeId,
createdAt: new Date().toISOString(),
changeText
});
saveToStorage(STORAGE_KEYS.employeeHistory, state.employeeHistory);
}

/* =========================================
Lookup helpers
========================================= */

function getEmployeeTypeById(id) {
return state.employeeTypes.find((x) => x.id === id) || null;
}

function getEmployeeTypeByName(name) {
return state.employeeTypes.find((x) => x.name === name) || null;
}

function getEmployeeTypeName(id) {
return getEmployeeTypeById(id)?.name || "-";
}

function getPayrollMethodLabel(method) {
if (method === "driver_line_vehicle") return "حسب الخط والسيارة";
if (method === "reserve_driver") return "احتياط / بدل سائق";
return "راتب ثابت";
}

function getDepartmentById(id) {
return state.departments.find((x) => x.id === id) || null;
}

function getDepartmentByName(name) {
return state.departments.find((x) => x.name === name) || null;
}

function getDepartmentName(id) {
return getDepartmentById(id)?.name || "-";
}

function getJobById(id) {
return state.jobs.find((x) => x.id === id) || null;
}

function getJobByName(name) {
return state.jobs.find((x) => x.name === name) || null;
}

function getJobName(id) {
return getJobById(id)?.name || "-";
}

function getLineById(id) {
return state.lines.find((x) => x.id === id) || null;
}

function getLineByName(name) {
return state.lines.find((x) => x.name === name) || null;
}

function getLineName(id) {
return getLineById(id)?.name || "-";
}

function getVehicleById(id) {
return state.vehicles.find((x) => x.id === id) || null;
}

function getVehicleByName(name) {
return state.vehicles.find((x) => x.name === name) || null;
}

function getVehicleName(id) {
return getVehicleById(id)?.name || "-";
}

function getEmployeeById(id) {
return state.employees.find((x) => x.id === id) || null;
}

function getEmployeeByNoOrName(value) {
return state.employees.find((x) => x.employeeNo === value || x.name === value) || null;
}

function getEmployeeName(id) {
return getEmployeeById(id)?.name || "-";
}

function getPricingValue(lineId, vehicleId) {
return Number(
state.pricing.find((x) => x.lineId === lineId && x.vehicleId === vehicleId)?.amount || 0
);
}

/* =========================================
Modal helpers
========================================= */

function openModal(title, bodyHtml, onSave) {
$("modalTitle").textContent = title;
$("modalBody").innerHTML = bodyHtml;
$("appModal").classList.remove("hidden");
state.currentModalSave = onSave || null;

const saveBtn = $("modalSaveBtn");
saveBtn.onclick = () => {
if (typeof state.currentModalSave === "function") {
state.currentModalSave();
}
};
}

function closeModal() {
$("appModal").classList.add("hidden");
$("modalTitle").textContent = "نموذج";
$("modalBody").innerHTML = "";
state.currentModalSave = null;
state.currentDeleteContext = null;
}

function openInfoModal(text) {
openModal(
"تنبيه",
<div class="note-box">${escapeHtml(text)}</div>,
() => closeModal()
);
}

function getFieldValue(id) {
const el = $(id);
return el ? el.value : "";
}

function validateRequiredFields(ids) {
let ok = true;
ids.forEach((id) => {
const el = $(id);
if (!el) return;
const value = String(el.value || "").trim();
if (!value) {
el.style.borderColor = "var(--danger)";
ok = false;
} else {
el.style.borderColor = "var(--input-border)";
}
});
return ok;
}

function buildOptions(items, valueKey = "id", labelGetter) {
return items
.map((item) => {
const label = typeof labelGetter === "function" ? labelGetter(item) : item[labelGetter];
return <option value="${escapeHtml(item[valueKey])}">${escapeHtml(label)}</option>;
})
.join("");
}

function buildSelectField(id, label, optionsHtml, selectedValue = "", hint = "") {
return   <div class="field">   <label for="${id}">${label}</label>   <select id="${id}">   <option value="">اختر</option>   ${optionsHtml}   </select>   ${hint ?<div class="hint">${hint}</div>: ""}   </div>   <script>   setTimeout(function(){   var el=document.getElementById("${id}");   if(el) el.value=${JSON.stringify(selectedValue || "")};   },0);   </script>  ;
}

function buildInputField(id, label, value = "", type = "text", hint = "") {
return   <div class="field">   <label for="${id}">${label}</label>   <input id="${id}" type="${type}" value="${escapeHtml(value)}" />   ${hint ?<div class="hint">${hint}</div>: ""}   </div>  ;
}

function buildTextAreaField(id, label, value = "", hint = "") {
return   <div class="field">   <label for="${id}">${label}</label>   <textarea id="${id}">${escapeHtml(value)}</textarea>   ${hint ?<div class="hint">${hint}</div>: ""}   </div>  ;
}

function openDeleteModal(entityLabel, onConfirm) {
openModal(
"تأكيد الحذف",
<div class="note-box">هل أنت متأكد من حذف: <strong>${escapeHtml(entityLabel)}</strong> ؟ سيتم أيضًا إنشاء طلب حذف وسجل عملية.</div>,
() => {
onConfirm();
closeModal();
}
);
}

/* =========================================
Notifications
========================================= */

function requestBrowserNotifications() {
if (!("Notification" in window)) {
openInfoModal("المتصفح لا يدعم الإشعارات.");
return;
}
Notification.requestPermission().then((permission) => {
if (permission === "granted") {
localStorage.setItem(STORAGE_KEYS.notifications, "1");
openInfoModal("تم تفعيل الإشعارات.");
} else {
openInfoModal("لم يتم تفعيل الإشعارات.");
}
});
}

function notify(title, body) {
if (
localStorage.getItem(STORAGE_KEYS.notifications) === "1" &&
"Notification" in window &&
Notification.permission === "granted"
) {
new Notification(title, { body });
}
}

/* =========================================
PWA
========================================= */

function initPWA() {
if ("serviceWorker" in navigator) {
navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

window.addEventListener("beforeinstallprompt", (e) => {
e.preventDefault();
state.deferredInstallPrompt = e;
$("installBtn").style.display = "inline-flex";
});

$("installBtn").addEventListener("click", async () => {
if (!state.deferredInstallPrompt) return;
state.deferredInstallPrompt.prompt();
await state.deferredInstallPrompt.userChoice;
state.deferredInstallPrompt = null;
$("installBtn").style.display = "none";
});
}

/* =========================================
Seed + load
========================================= */

function seedDemoData() {
if (loadFromStorage(STORAGE_KEYS.employeeTypes).length === 0) {
saveToStorage(STORAGE_KEYS.employeeTypes, [
{ id: createId("etype"), name: "سائق", payrollMethod: "driver_line_vehicle" },
{ id: createId("etype"), name: "سائق احتياط", payrollMethod: "reserve_driver" },
{ id: createId("etype"), name: "مسوق", payrollMethod: "fixed_salary" },
{ id: createId("etype"), name: "موظف", payrollMethod: "fixed_salary" }
]);
}

if (loadFromStorage(STORAGE_KEYS.departments).length === 0) {
saveToStorage(STORAGE_KEYS.departments, [
{ id: createId("dep"), name: "المبيعات" },
{ id: createId("dep"), name: "الحركة" },
{ id: createId("dep"), name: "الإدارة" }
]);
}

const departments = loadFromStorage(STORAGE_KEYS.departments);
if (loadFromStorage(STORAGE_KEYS.jobs).length === 0) {
saveToStorage(STORAGE_KEYS.jobs, [
{ id: createId("job"), departmentId: departments[0]?.id || "", name: "مسوق" },
{ id: createId("job"), departmentId: departments[1]?.id || "", name: "سائق" },
{ id: createId("job"), departmentId: departments[1]?.id || "", name: "سائق احتياط" },
{ id: createId("job"), departmentId: departments[2]?.id || "", name: "موظف إداري" }
]);
}

if (loadFromStorage(STORAGE_KEYS.lines).length === 0) {
saveToStorage(STORAGE_KEYS.lines, [
{ id: createId("line"), name: "خط الساحل" },
{ id: createId("line"), name: "خط صبراتة" },
{ id: createId("line"), name: "خط الزاوية" }
]);
}

if (loadFromStorage(STORAGE_KEYS.vehicles).length === 0) {
saveToStorage(STORAGE_KEYS.vehicles, [
{ id: createId("veh"), name: "سيارة صغيرة" },
{ id: createId("veh"), name: "فان" },
{ id: createId("veh"), name: "شاحنة" }
]);
}

const lines = loadFromStorage(STORAGE_KEYS.lines);
const vehicles = loadFromStorage(STORAGE_KEYS.vehicles);

if (loadFromStorage(STORAGE_KEYS.pricing).length === 0) {
saveToStorage(STORAGE_KEYS.pricing, [
{ id: createId("price"), lineId: lines[0]?.id || "", vehicleId: vehicles[0]?.id || "", amount: 2200 },
{ id: createId("price"), lineId: lines[1]?.id || "", vehicleId: vehicles[1]?.id || "", amount: 2600 },
{ id: createId("price"), lineId: lines[2]?.id || "", vehicleId: vehicles[2]?.id || "", amount: 3000 }
]);
}

if (loadFromStorage(STORAGE_KEYS.users).length === 0) {
saveToStorage(STORAGE_KEYS.users, [
{ id: createId("usr"), username: "admin", fullName: "مدير النظام", role: "مدير النظام", status: "active" },
{ id: createId("usr"), username: "hr", fullName: "مسؤول الموارد البشرية", role: "HR", status: "active" },
{ id: createId("usr"), username: "accountant", fullName: "المحاسب", role: "محاسب", status: "active" }
]);
}

if (loadFromStorage(STORAGE_KEYS.permissions).length === 0) {
saveToStorage(STORAGE_KEYS.permissions, [
{ role: "مدير النظام", access: "كل شيء" },
{ role: "HR", access: "الموظفون / الحضور / الإجازات / التقارير" },
{ role: "محاسب", access: "الرواتب / السلف / الإضافات والخصومات" },
{ role: "موظف", access: "عرض فقط" }
]);
}

const employeeTypes = loadFromStorage(STORAGE_KEYS.employeeTypes);
const jobs = loadFromStorage(STORAGE_KEYS.jobs);

if (loadFromStorage(STORAGE_KEYS.employees).length === 0) {
saveToStorage(STORAGE_KEYS.employees, [
{
id: createId("emp"),
employeeNo: "1001",
name: "أحمد سالم",
departmentId: departments[0]?.id || "",
jobId: jobs.find((x) => x.name === "مسوق")?.id || "",
employeeTypeId: employeeTypes.find((x) => x.name === "مسوق")?.id || "",
lineId: "",
vehicleId: "",
salary: 1800,
status: "نشط",
notes: ""
},
{
id: createId("emp"),
employeeNo: "1002",
name: "محمد علي",
departmentId: departments[1]?.id || "",
jobId: jobs.find((x) => x.name === "سائق")?.id || "",
employeeTypeId: employeeTypes.find((x) => x.name === "سائق")?.id || "",
lineId: lines[0]?.id || "",
vehicleId: vehicles[0]?.id || "",
salary: 0,
status: "نشط",
notes: ""
},
{
id: createId("emp"),
employeeNo: "1003",
name: "خالد محمود",
departmentId: departments[1]?.id || "",
jobId: jobs.find((x) => x.name === "سائق احتياط")?.id || "",
employeeTypeId: employeeTypes.find((x) => x.name === "سائق احتياط")?.id || "",
lineId: "",
vehicleId: "",
salary: 1600,
status: "نشط",
notes: ""
},
{
id: createId("emp"),
employeeNo: "1004",
name: "يوسف إبراهيم",
departmentId: departments[2]?.id || "",
jobId: jobs.find((x) => x.name === "موظف إداري")?.id || "",
employeeTypeId: employeeTypes.find((x) => x.name === "موظف")?.id || "",
lineId: "",
vehicleId: "",
salary: 2500,
status: "نشط",
notes: ""
}
]);
}

const employees = loadFromStorage(STORAGE_KEYS.employees);

if (loadFromStorage(STORAGE_KEYS.attendance).length === 0) {
saveToStorage(STORAGE_KEYS.attendance, [
{
id: createId("att"),
date: todayISO(),
employeeId: employees[0]?.id || "",
status: "حضور",
checkIn: "08:05",
lateMinutes: 0,
reserveReplacement: false,
actualLineId: "",
actualVehicleId: ""
},
{
id: createId("att"),
date: todayISO(),
employeeId: employees[1]?.id || "",
status: "تأخير",
checkIn: "08:25",
lateMinutes: 25,
reserveReplacement: false,
actualLineId: "",
actualVehicleId: ""
},
{
id: createId("att"),
date: todayISO(),
employeeId: employees[2]?.id || "",
status: "غياب",
checkIn: "",
lateMinutes: 0,
reserveReplacement: false,
actualLineId: "",
actualVehicleId: ""
},
{
id: createId("att"),
date: todayISO(),
employeeId: employees[3]?.id || "",
status: "حضور",
checkIn: "07:58",
lateMinutes: 0,
reserveReplacement: false,
actualLineId: "",
actualVehicleId: ""
}
]);
}

if (loadFromStorage(STORAGE_KEYS.leave).length === 0) saveToStorage(STORAGE_KEYS.leave, []);
if (loadFromStorage(STORAGE_KEYS.loans).length === 0) saveToStorage(STORAGE_KEYS.loans, []);
if (loadFromStorage(STORAGE_KEYS.adjustments).length === 0) saveToStorage(STORAGE_KEYS.adjustments, []);
if (loadFromStorage(STORAGE_KEYS.deleteRequests).length === 0) saveToStorage(STORAGE_KEYS.deleteRequests, []);
if (loadFromStorage(STORAGE_KEYS.logs).length === 0) saveToStorage(STORAGE_KEYS.logs, []);
if (loadFromStorage(STORAGE_KEYS.payrollArchive).length === 0) saveToStorage(STORAGE_KEYS.payrollArchive, []);
if (loadFromStorage(STORAGE_KEYS.employeeHistory).length === 0) saveToStorage(STORAGE_KEYS.employeeHistory, []);
if (loadFromStorage(STORAGE_KEYS.backups).length === 0) saveToStorage(STORAGE_KEYS.backups, []);
}

function loadState() {
state.employees = safeArray(loadFromStorage(STORAGE_KEYS.employees));
state.employeeTypes = safeArray(loadFromStorage(STORAGE_KEYS.employeeTypes));
state.departments = safeArray(loadFromStorage(STORAGE_KEYS.departments));
state.jobs = safeArray(loadFromStorage(STORAGE_KEYS.jobs));
state.lines = safeArray(loadFromStorage(STORAGE_KEYS.lines));
state.vehicles = safeArray(loadFromStorage(STORAGE_KEYS.vehicles));
state.pricing = safeArray(loadFromStorage(STORAGE_KEYS.pricing));
state.attendance = safeArray(loadFromStorage(STORAGE_KEYS.attendance));
state.leave = safeArray(loadFromStorage(STORAGE_KEYS.leave));
state.loans = safeArray(loadFromStorage(STORAGE_KEYS.loans));
state.adjustments = safeArray(loadFromStorage(STORAGE_KEYS.adjustments));
state.deleteRequests = safeArray(loadFromStorage(STORAGE_KEYS.deleteRequests));
state.users = safeArray(loadFromStorage(STORAGE_KEYS.users));
state.permissions = safeArray(loadFromStorage(STORAGE_KEYS.permissions));
state.logs = safeArray(loadFromStorage(STORAGE_KEYS.logs));
state.payrollArchive = safeArray(loadFromStorage(STORAGE_KEYS.payrollArchive));
state.employeeHistory = safeArray(loadFromStorage(STORAGE_KEYS.employeeHistory));
state.backups = safeArray(loadFromStorage(STORAGE_KEYS.backups));
}

/* =========================================
Save all
========================================= */

function persistAll() {
saveToStorage(STORAGE_KEYS.employees, state.employees);
saveToStorage(STORAGE_KEYS.employeeTypes, state.employeeTypes);
saveToStorage(STORAGE_KEYS.departments, state.departments);
saveToStorage(STORAGE_KEYS.jobs, state.jobs);
saveToStorage(STORAGE_KEYS.lines, state.lines);
saveToStorage(STORAGE_KEYS.vehicles, state.vehicles);
saveToStorage(STORAGE_KEYS.pricing, state.pricing);
saveToStorage(STORAGE_KEYS.attendance, state.attendance);
saveToStorage(STORAGE_KEYS.leave, state.leave);
saveToStorage(STORAGE_KEYS.loans, state.loans);
saveToStorage(STORAGE_KEYS.adjustments, state.adjustments);
saveToStorage(STORAGE_KEYS.deleteRequests, state.deleteRequests);
saveToStorage(STORAGE_KEYS.users, state.users);
saveToStorage(STORAGE_KEYS.permissions, state.permissions);
saveToStorage(STORAGE_KEYS.logs, state.logs);
saveToStorage(STORAGE_KEYS.payrollArchive, state.payrollArchive);
saveToStorage(STORAGE_KEYS.employeeHistory, state.employeeHistory);
saveToStorage(STORAGE_KEYS.backups, state.backups);
}

/* =========================================
Backups
========================================= */

function buildBackupSnapshot(reason = "نسخة احتياطية") {
return {
employeeTypes: state.employeeTypes,
departments: state.departments,
jobs: state.jobs,
lines: state.lines,
vehicles: state.vehicles,
pricing: state.pricing,
employees: state.employees,
attendance: state.attendance,
leave: state.leave,
loans: state.loans,
adjustments: state.adjustments,
deleteRequests: state.deleteRequests,
users: state.users,
permissions: state.permissions,
logs: state.logs,
payrollArchive: state.payrollArchive,
employeeHistory: state.employeeHistory,
reason
};
}

function getBackupUsageBytes() {
return state.backups.reduce((sum, item) => sum + Number(item.sizeBytes || 0), 0);
}

function getBackupUsageMB() {
return Number(bytesToMB(getBackupUsageBytes()));
}

function getRemainingBackupMB() {
return Math.max(BACKUP_LIMIT_MB - getBackupUsageMB(), 0).toFixed(2);
}

function cleanupOldBackupsIfNeeded() {
let totalMB = getBackupUsageMB();
while (totalMB >= BACKUP_LIMIT_MB && state.backups.length > 0) {
state.backups.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
state.backups.shift();
totalMB = getBackupUsageMB();
}
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
addLog("إنشاء نسخة احتياطية", "تم إنشاء نسخة احتياطية يدوية");
renderAll();
}

function downloadBackup(id) {
const backup = state.backups.find((x) => x.id === id);
if (!backup) return;
downloadTextFile(
backup-${backup.createdAt}.json,
JSON.stringify(backup.snapshot, null, 2),
"application/json"
);
}

function updateBackupStatus() {
const last = state.backups.length
? [...state.backups].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
: null;

$("backupUsage").innerHTML =   <div>عدد النسخ: <strong>${state.backups.length}</strong></div>   <div>آخر نسخة: <strong>${last ? formatDateTime(last.createdAt) : "-"}</strong></div>   <div>الحجم المستخدم: <strong>${getBackupUsageMB().toFixed(2)} MB</strong></div>   <div>المساحة المتاحة: <strong>${getRemainingBackupMB()} MB</strong></div>   <div>المساحة الكلية: <strong>${BACKUP_LIMIT_MB} MB</strong></div>  ;
}

/* =========================================
Delete requests
========================================= */

function createDeleteRequest(tableName, itemLabel) {
state.deleteRequests.unshift({
id: createId("del"),
tableName,
itemLabel,
status: "معلق",
createdAt: new Date().toISOString()
});
saveToStorage(STORAGE_KEYS.deleteRequests, state.deleteRequests);
}

/* =========================================
Rendering tables
========================================= */

function renderEmployeeTypesTable() {
const tbody = $("employeeTypesTable");
tbody.innerHTML = state.employeeTypes.length
? state.employeeTypes.map((item) =>   <tr>   <td>${escapeHtml(item.name)}</td>   <td>${escapeHtml(getPayrollMethodLabel(item.payrollMethod))}</td>   <td>   <div class="inline-actions">   <button onclick="openEmployeeTypeModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteEmployeeType('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="3">لا توجد أنواع موظفين</td></tr>;
}

function renderDepartmentsTable() {
const tbody = $("departmentsTable");
tbody.innerHTML = state.departments.length
? state.departments.map((item) =>   <tr>   <td>${escapeHtml(item.name)}</td>   <td>   <div class="inline-actions">   <button onclick="openDepartmentModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteDepartment('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="2">لا توجد أقسام</td></tr>;
}

function renderJobsTable() {
const tbody = $("jobsTable");
tbody.innerHTML = state.jobs.length
? state.jobs.map((item) =>   <tr>   <td>${escapeHtml(getDepartmentName(item.departmentId))}</td>   <td>${escapeHtml(item.name)}</td>   <td>   <div class="inline-actions">   <button onclick="openJobModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteJob('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="3">لا توجد وظائف</td></tr>;
}

function renderLinesTable() {
const tbody = $("linesTable");
tbody.innerHTML = state.lines.length
? state.lines.map((item) =>   <tr>   <td>${escapeHtml(item.name)}</td>   <td>   <div class="inline-actions">   <button onclick="openLineModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteLine('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="2">لا توجد خطوط توزيع</td></tr>;
}

function renderVehiclesTable() {
const tbody = $("vehiclesTable");
tbody.innerHTML = state.vehicles.length
? state.vehicles.map((item) =>   <tr>   <td>${escapeHtml(item.name)}</td>   <td>   <div class="inline-actions">   <button onclick="openVehicleModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteVehicle('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="2">لا توجد أنواع سيارات</td></tr>;
}

function renderPricingTable() {
const tbody = $("pricingTable");
tbody.innerHTML = state.pricing.length
? state.pricing.map((item) =>   <tr>   <td>${escapeHtml(getLineName(item.lineId))}</td>   <td>${escapeHtml(getVehicleName(item.vehicleId))}</td>   <td>${formatNumber(item.amount)}</td>   <td>   <div class="inline-actions">   <button onclick="openPricingModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deletePricing('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="4">لا توجد تسعيرات</td></tr>;
}

function renderEmployeesTable() {
const tbody = $("employeesTable");
const q = String(getFieldValue("employeesSearch") || "").trim().toLowerCase();

const rows = state.employees.filter((e) => {
const haystack = [
e.employeeNo,
e.name,
getDepartmentName(e.departmentId),
getJobName(e.jobId),
getEmployeeTypeName(e.employeeTypeId)
].join(" ").toLowerCase();
return !q || haystack.includes(q);
});

tbody.innerHTML = rows.length
? rows.map((e) =>   <tr>   <td>${escapeHtml(e.employeeNo)}</td>   <td>${escapeHtml(e.name)}</td>   <td>${escapeHtml(getDepartmentName(e.departmentId))}</td>   <td>${escapeHtml(getJobName(e.jobId))}</td>   <td>${escapeHtml(getEmployeeTypeName(e.employeeTypeId))}</td>   <td>${escapeHtml(getLineName(e.lineId))}</td>   <td>${escapeHtml(getVehicleName(e.vehicleId))}</td>   <td>${formatNumber(e.salary)}</td>   <td>${getStatusBadge(e.status || "نشط")}</td>   <td>   <div class="inline-actions">   <button onclick="openEmployeeModal('${e.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteEmployee('${e.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="10">لا توجد بيانات موظفين</td></tr>;
}

function renderAttendanceTable() {
const tbody = $("attendanceTable");
const q = String(getFieldValue("attendanceSearch") || "").trim().toLowerCase();

const rows = [...state.attendance]
.sort((a, b) => String(b.date).localeCompare(String(a.date)))
.filter((row) => {
const haystack = [
row.date,
getEmployeeName(row.employeeId),
row.status,
getLineName(row.actualLineId),
getVehicleName(row.actualVehicleId)
].join(" ").toLowerCase();
return !q || haystack.includes(q);
});

tbody.innerHTML = rows.length
? rows.map((row) =>   <tr>   <td>${escapeHtml(row.date)}</td>   <td>${escapeHtml(getEmployeeName(row.employeeId))}</td>   <td>${getStatusBadge(row.status)}</td>   <td>${escapeHtml(row.checkIn || "-")}</td>   <td>${escapeHtml(row.lateMinutes || 0)}</td>   <td>${row.reserveReplacement ? "نعم" : "لا"}</td>   <td>${escapeHtml(getLineName(row.actualLineId))}</td>   <td>${escapeHtml(getVehicleName(row.actualVehicleId))}</td>   <td>   <div class="inline-actions">   <button onclick="openAttendanceModal('${row.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteAttendance('${row.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="9">لا توجد سجلات حضور</td></tr>;
}

function renderLeaveTable() {
const tbody = $("leaveTable");
tbody.innerHTML = state.leave.length
? [...state.leave]
.sort((a, b) => String(b.fromDate).localeCompare(String(a.fromDate)))
.map((item) =>   <tr>   <td>${escapeHtml(getEmployeeName(item.employeeId))}</td>   <td>${escapeHtml(item.leaveType)}</td>   <td>${escapeHtml(item.fromDate)}</td>   <td>${escapeHtml(item.toDate)}</td>   <td>${escapeHtml(item.notes || "-")}</td>   <td>   <div class="inline-actions">   <button onclick="openLeaveModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteLeave('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="6">لا توجد إجازات</td></tr>;
}

function renderLoansTable() {
const tbody = $("loansTable");
tbody.innerHTML = state.loans.length
? state.loans.map((item) =>   <tr>   <td>${escapeHtml(getEmployeeName(item.employeeId))}</td>   <td>${escapeHtml(item.type)}</td>   <td>${formatNumber(item.amount)}</td>   <td>${escapeHtml(item.monthsCount)}</td>   <td>${formatNumber(item.monthlyInstallment)}</td>   <td>${formatNumber(item.remainingAmount)}</td>   <td>${Array.isArray(item.plan) ? item.plan.join(" / ") : "-"}</td>   <td>   <div class="inline-actions">   <button onclick="openLoanModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteLoan('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="8">لا توجد سلف أو ديون</td></tr>;
}

function renderAdjustmentsTable() {
const tbody = $("adjustmentsTable");
tbody.innerHTML = state.adjustments.length
? [...state.adjustments]
.sort((a, b) => String(b.month).localeCompare(String(a.month)))
.map((item) =>   <tr>   <td>${escapeHtml(getEmployeeName(item.employeeId))}</td>   <td>${escapeHtml(item.type)}</td>   <td>${formatNumber(item.amount)}</td>   <td>${escapeHtml(item.month)}</td>   <td>${escapeHtml(item.notes || "-")}</td>   <td>   <div class="inline-actions">   <button onclick="openAdjustmentModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteAdjustment('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="6">لا توجد إضافات أو خصومات</td></tr>;
}

function renderDeleteRequestsTable() {
const tbody = $("deleteRequestsTable");
tbody.innerHTML = state.deleteRequests.length
? [...state.deleteRequests]
.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
.map((item) =>   <tr>   <td>${escapeHtml(item.tableName)}</td>   <td>${escapeHtml(item.itemLabel)}</td>   <td>${getStatusBadge(item.status)}</td>   <td>${formatDateTime(item.createdAt)}</td>   </tr>  ).join("")
: <tr><td colspan="4">لا توجد طلبات حذف</td></tr>;
}

function renderUsersTable() {
const tbody = $("usersTable");
tbody.innerHTML = state.users.length
? state.users.map((item) =>   <tr>   <td>${escapeHtml(item.username)}</td>   <td>${escapeHtml(item.fullName)}</td>   <td>${escapeHtml(item.role)}</td>   <td>${getStatusBadge(item.status)}</td>   <td>   <div class="inline-actions">   <button onclick="openUserModal('${item.id}')">تعديل</button>   <button class="secondary-btn" onclick="deleteUser('${item.id}')">حذف</button>   </div>   </td>   </tr>  ).join("")
: <tr><td colspan="5">لا يوجد مستخدمون</td></tr>;
}

function renderPermissionsTable() {
const tbody = $("permissionsTable");
tbody.innerHTML = state.permissions.length
? state.permissions.map((item) =>   <tr>   <td>${escapeHtml(item.role)}</td>   <td>${escapeHtml(item.access)}</td>   </tr>  ).join("")
: <tr><td colspan="2">لا توجد صلاحيات</td></tr>;
}

function renderLogsTable() {
const tbody = $("logsTable");
tbody.innerHTML = state.logs.length
? state.logs.map((item) =>   <tr>   <td>${escapeHtml(item.action)}</td>   <td>${escapeHtml(item.user)}</td>   <td>${formatDateTime(item.time)}</td>   <td>${escapeHtml(item.details || "-")}</td>   </tr>  ).join("")
: <tr><td colspan="4">لا توجد عمليات</td></tr>;
}

function renderPayrollArchiveTable() {
const tbody = $("payrollArchiveTable");
tbody.innerHTML = state.payrollArchive.length
? [...state.payrollArchive]
.sort((a, b) => String(b.month).localeCompare(String(a.month)))
.map((archive) =>   <tr>   <td>${escapeHtml(monthNameLabel(archive.month))}</td>   <td>${archive.rows.length}</td>   <td>${formatNumber(archive.rows.reduce((sum, row) => sum + Number(row.net || 0), 0))}</td>   </tr>  ).join("")
: <tr><td colspan="3">لا يوجد أرشيف رواتب</td></tr>;
}

function renderEmployeeHistoryTable() {
const tbody = $("employeeHistoryTable");
tbody.innerHTML = state.employeeHistory.length
? state.employeeHistory.map((item) =>   <tr>   <td>${escapeHtml(getEmployeeName(item.employeeId))}</td>   <td>${formatDateTime(item.createdAt)}</td>   <td>${escapeHtml(item.changeText)}</td>   </tr>  ).join("")
: <tr><td colspan="3">لا يوجد سجل تاريخ للموظفين</td></tr>;
}

function renderAttendanceHistoryTable() {
const tbody = $("attendanceHistoryTable");
const q = String(getFieldValue("attendanceHistorySearch") || "").trim().toLowerCase();

const rows = [...state.attendance]
.sort((a, b) => String(b.date).localeCompare(String(a.date)))
.filter((row) => {
const emp = getEmployeeById(row.employeeId);
const hay = [emp?.employeeNo, emp?.name, row.date, row.status].join(" ").toLowerCase();
return !q || hay.includes(q);
});

tbody.innerHTML = rows.length
? rows.map((row) =>   <tr>   <td>${escapeHtml(getEmployeeName(row.employeeId))}</td>   <td>${escapeHtml(row.date)}</td>   <td>${escapeHtml(row.status)}</td>   <td>${escapeHtml(row.lateMinutes || 0)}</td>   </tr>  ).join("")
: <tr><td colspan="4">لا توجد سجلات حضور شهرية</td></tr>;
}

function renderBackupsTable() {
const tbody = $("backupsTable");
tbody.innerHTML = state.backups.length
? [...state.backups]
.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
.map((item) =>   <tr>   <td>${formatDateTime(item.createdAt)}</td>   <td>${escapeHtml(item.reason)}</td>   <td>${bytesToMB(item.sizeBytes)} MB</td>   <td><button onclick="downloadBackup('${item.id}')">تحميل</button></td>   </tr>  ).join("")
: <tr><td colspan="4">لا توجد نسخ احتياطية</td></tr>;
}

function renderReportsFilters() {
$("reportDepartmentFilter").innerHTML =
<option value="">كل الأقسام</option> +
buildOptions(state.departments, "id", "name");

$("reportTypeFilter").innerHTML =
<option value="">كل أنواع الموظفين</option> +
buildOptions(state.employeeTypes, "id", "name");

$("reportLineFilter").innerHTML =
<option value="">كل الخطوط</option> +
buildOptions(state.lines, "id", "name");
}

/* =========================================
Dashboard
========================================= */

function getTodayAttendanceRows() {
return state.attendance.filter((x) => x.date === todayISO());
}

function getTodayPresentCount() {
return getTodayAttendanceRows().filter((x) => x.status === "حضور").length;
}

function getTodayAbsentCount() {
return getTodayAttendanceRows().filter((x) => x.status === "غياب").length;
}

function getTodayLateCount() {
return getTodayAttendanceRows().filter((x) => x.status === "تأخير").length;
}

function computeTopByStatus(status) {
const month = currentMonthPrefix();
const counts = {};
state.attendance
.filter((row) => String(row.date).startsWith(month))
.forEach((row) => {
if (row.status === status) {
const key = getEmployeeName(row.employeeId);
counts[key] = (counts[key] || 0) + 1;
}
});
return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function computeTopLate() {
const month = currentMonthPrefix();
const counts = {};
state.attendance
.filter((row) => String(row.date).startsWith(month))
.forEach((row) => {
if (row.status === "تأخير") {
const key = getEmployeeName(row.employeeId);
counts[key] = (counts[key] || 0) + Number(row.lateMinutes || 0);
}
});
return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function buildPayrollRows(month = currentMonthPrefix()) {
const [year, monthNumber] = month.split("-").map(Number);
const workDays = countWorkDaysInMonth(year, monthNumber);

return state.employees.map((employee) => {
const type = getEmployeeTypeById(employee.employeeTypeId);
const employeeAttendance = state.attendance.filter(
(row) => row.employeeId === employee.id && String(row.date).startsWith(month)
);
const leaveRows = state.leave.filter(
(row) => row.employeeId === employee.id &&
String(row.fromDate).startsWith(month)
);

const leaveAsPresenceDays = leaveRows.length;  
const presentRows = employeeAttendance.filter((row) =>  
  ["حضور", "تأخير", "إجازة"].includes(row.status)  
);  

const presentDays = presentRows.length + leaveAsPresenceDays;  
const absentDays = employeeAttendance.filter((row) => row.status === "غياب").length;  

let deservedSalary = 0;  

if (type?.payrollMethod === "driver_line_vehicle") {  
  const monthlyRate = getPricingValue(employee.lineId, employee.vehicleId);  
  deservedSalary = workDays > 0 ? (monthlyRate / workDays) * presentDays : 0;  
} else if (type?.payrollMethod === "reserve_driver") {
let total = 0;

for (const row of presentRows) {  
    if (row.reserveReplacement && row.actualLineId && row.actualVehicleId) {  
      const actualMonthly = getPricingValue(row.actualLineId, row.actualVehicleId);  
      total += workDays > 0 ? actualMonthly / workDays : 0;  
    } else {  
      total += workDays > 0 ? Number(employee.salary || 0) / workDays : 0;  
    }  
  }  

  total += leaveAsPresenceDays * (workDays > 0 ? Number(employee.salary || 0) / workDays : 0);  
  deservedSalary = total;  
} else {  
  deservedSalary = workDays > 0  
    ? (Number(employee.salary || 0) / workDays) * presentDays  
    : 0;  
}  

const monthLoans = state.loans.filter(  
  (l) => l.employeeId === employee.id && Number(l.remainingAmount || 0) > 0  
);  

let loanDeduction = 0;  

monthLoans.forEach((loan) => {  
  const deduction = Math.min(  
    Number(loan.monthlyInstallment || 0),  
    Number(loan.remainingAmount || 0)  
  );  
  loanDeduction += deduction;  
});  

const monthAdjustments = state.adjustments.filter(  
  (a) => a.employeeId === employee.id && a.month === month  
);  

const additions = monthAdjustments  
  .filter((a) => a.type === "إضافة")  
  .reduce((sum, a) => sum + Number(a.amount || 0), 0);  

const manualDeduction = monthAdjustments  
  .filter((a) => a.type === "خصم")  
  .reduce((sum, a) => sum + Number(a.amount || 0), 0);  

const gross = Number(deservedSalary || 0) + Number(additions || 0);  
const totalDeductions = Number(loanDeduction || 0) + Number(manualDeduction || 0);  

let net = 0;  
let transported = 0;  

if (totalDeductions <= gross) {  
  net = gross - totalDeductions;  
} else {  
  net = 0;  
  transported = totalDeductions - gross;  
}  

return {  
  employeeId: employee.id,  
  name: employee.name,  
  type: type?.name || "غير محدد",  
  workDays,  
  presentDays,  
  absentDays,  
  deservedSalary: Number(deservedSalary.toFixed(2)),  
  additions: Number(additions.toFixed(2)),  
  loanDeduction: Number(loanDeduction.toFixed(2)),  
  manualDeduction: Number(manualDeduction.toFixed(2)),  
  transported: Number(transported.toFixed(2)),  
  net: Number(net.toFixed(2))  
};

});
}

function renderCards() {
$("employeesCount").textContent = state.employees.length;
$("todayAttendance").textContent = getTodayPresentCount();
$("todayAbsence").textContent = getTodayAbsentCount();
$("todayLate").textContent = getTodayLateCount();
$("activeLoansCount").textContent = state.loans.filter(
(x) => Number(x.remainingAmount || 0) > 0
).length;
$("pendingDeletesCount").textContent = state.deleteRequests.filter(
(x) => x.status === "معلق"
).length;

const payrollRows = buildPayrollRows(currentMonthPrefix());
const totalPresent = payrollRows.reduce((sum, r) => sum + Number(r.presentDays || 0), 0);
const totalAbsent = payrollRows.reduce((sum, r) => sum + Number(r.absentDays || 0), 0);
const totalDays = totalPresent + totalAbsent;

const attendanceAverage = totalDays > 0 ? ((totalPresent / totalDays) * 100) : 0;
const absenceRate = totalDays > 0 ? ((totalAbsent / totalDays) * 100) : 0;
const salaryCost = payrollRows.reduce((sum, r) => sum + Number(r.net || 0), 0);

const departmentCosts = {};
payrollRows.forEach((row) => {
const employee = state.employees.find((e) => e.id === row.employeeId);
const depName = getDepartmentName(employee?.departmentId);
departmentCosts[depName] = (departmentCosts[depName] || 0) + Number(row.net || 0);
});

let highestDepartmentCost = "-";
let maxCost = 0;
Object.entries(departmentCosts).forEach(([dep, cost]) => {
if (cost > maxCost) {
maxCost = cost;
highestDepartmentCost = dep;
}
});

$("attendanceAverage").textContent = ${attendanceAverage.toFixed(1)}%;
$("absenceRate").textContent = ${absenceRate.toFixed(1)}%;
$("salaryCost").textContent = salaryCost.toFixed(2);
$("highestDepartmentCost").textContent = highestDepartmentCost;
}

function renderTopLists() {
$("topAttendance").innerHTML =
computeTopByStatus("حضور").map((r) => <li>${r[0]} - ${r[1]}</li>).join("") ||
"<li>لا توجد بيانات</li>";

$("topAbsence").innerHTML =
computeTopByStatus("غياب").map((r) => <li>${r[0]} - ${r[1]}</li>).join("") ||
"<li>لا توجد بيانات</li>";

$("topLate").innerHTML =
computeTopLate().map((r) => <li>${r[0]} - ${r[1]} دقيقة</li>).join("") ||
"<li>لا توجد بيانات</li>";
}

function renderDashboardAlerts() {
const box = $("dashboardAlerts");
if (!box) return;

const alerts = [];

state.attendance
.filter((x) => x.date === todayISO() && x.status === "غياب")
.forEach((x) => {
alerts.push({
text: غياب اليوم: ${getEmployeeName(x.employeeId)},
type: "danger"
});
});

state.attendance
.filter((x) => x.date === todayISO() && x.status === "تأخير")
.forEach((x) => {
alerts.push({
text: تأخير اليوم: ${getEmployeeName(x.employeeId)} - ${x.lateMinutes || 0} دقيقة,
type: "warn"
});
});

const pendingDeletes = state.deleteRequests.filter((x) => x.status === "معلق").length;
if (pendingDeletes > 0) {
alerts.push({
text: يوجد ${pendingDeletes} طلبات حذف معلقة,
type: "warn"
});
}

if (getBackupUsageMB() > 40) {
alerts.push({
text: "تنبيه: مساحة النسخ الاحتياطية اقتربت من الحد",
type: "warn"
});
}

const employeesWithoutType = state.employees.filter((e) => !e.employeeTypeId).length;
if (employeesWithoutType > 0) {
alerts.push({
text: يوجد ${employeesWithoutType} موظفين بدون نوع موظف,
type: "warn"
});
}

if (!alerts.length) {
box.innerHTML = <div class="alert-item success">لا توجد تنبيهات حالياً</div>;
return;
}

box.innerHTML = alerts
.map((a) => <div class="alert-item ${a.type}">${a.text}</div>)
.join("");
}

function renderAttendanceChart() {
const canvas = $("attendanceChart");
if (!canvas) return;

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
data: [
getTodayPresentCount(),
getTodayAbsentCount(),
getTodayLateCount()
]
}
]
},
options: {
responsive: true,
maintainAspectRatio: false
}
});
}

function renderDepartmentChart() {
const canvas = $("departmentChart");
if (!canvas) return;

const counts = {};
state.employees.forEach((e) => {
const dep = getDepartmentName(e.departmentId);
counts[dep] = (counts[dep] || 0) + 1;
});

if (state.departmentChart) {
state.departmentChart.destroy();
}

state.departmentChart = new Chart(canvas, {
type: "pie",
data: {
labels: Object.keys(counts),
datasets: [
{
label: "الموظفون حسب القسم",
data: Object.values(counts)
}
]
},
options: {
responsive: true,
maintainAspectRatio: false
}
});
}

function renderPayrollTable() {
const tbody = $("payrollTable");
if (!tbody) return;

const month = $("payrollMonth")?.value || currentMonthPrefix();
const rows = buildPayrollRows(month);

tbody.innerHTML = rows.length
? rows.map((r) =>   <tr>   <td>${r.name}</td>   <td>${r.type}</td>   <td>${r.workDays}</td>   <td>${r.presentDays}</td>   <td>${r.absentDays}</td>   <td>${r.deservedSalary.toFixed(2)}</td>   <td>${r.additions.toFixed(2)}</td>   <td>${r.loanDeduction.toFixed(2)}</td>   <td>${r.manualDeduction.toFixed(2)}</td>   <td>${r.transported.toFixed(2)}</td>   <td>${r.net.toFixed(2)}</td>   </tr>  ).join("")
: <tr><td colspan="11">لا توجد بيانات رواتب</td></tr>;
}

function generatePayroll() {
renderPayrollTable();
logAction("تحديث الرواتب", "system", "تم تحديث كشف الرواتب");
notify("تحديث الرواتب", "تم تحديث كشف الرواتب الحالي");
}

function approvePayrollMonth() {
const month = $("payrollMonth")?.value || currentMonthPrefix();
const rows = buildPayrollRows(month);

const existingIndex = state.payrollArchive.findIndex((x) => x.month === month);
const archivePayload = {
id: createId("par"),
month,
createdAt: new Date().toISOString(),
rows
};

if (existingIndex >= 0) {
state.payrollArchive[existingIndex] = archivePayload;
} else {
state.payrollArchive.push(archivePayload);
}

saveToStorage(STORAGE_KEYS.payrollArchive, state.payrollArchive);
autoCreateBackup(اعتماد رواتب ${month});
logAction("اعتماد رواتب", "system", تم اعتماد رواتب شهر ${month});
notify("اعتماد الرواتب", تم اعتماد رواتب شهر ${month});
renderPayrollArchiveTable();
}

function renderPayrollArchiveTable() {
const tbody = $("payrollArchiveTable");
if (!tbody) return;

tbody.innerHTML = state.payrollArchive.length
? state.payrollArchive
.slice()
.sort((a, b) => String(b.month).localeCompare(String(a.month)))
.map((item) => {
const totalNet = (item.rows || []).reduce((sum, r) => sum + Number(r.net || 0), 0);
return   <tr>   <td>${item.month}</td>   <td>${(item.rows || []).length}</td>   <td>${totalNet.toFixed(2)}</td>   </tr>  ;
}).join("")
: <tr><td colspan="3">لا يوجد أرشيف رواتب</td></tr>;
}

function renderAttendanceHistoryTable() {
const tbody = $("attendanceHistoryTable");
if (!tbody) return;

const q = ($("attendanceHistorySearch")?.value || "").trim().toLowerCase();

const rows = state.attendance.filter((row) => {
const employee = state.employees.find((e) => e.id === row.employeeId);
const employeeName = employee?.name || "";
const employeeNo = employee?.employeeNo || "";
return !q ||
employeeName.toLowerCase().includes(q) ||
String(employeeNo).toLowerCase().includes(q);
});

tbody.innerHTML = rows.length
? rows
.slice()
.sort((a, b) => String(b.date).localeCompare(String(a.date)))
.map((row) =>   <tr>   <td>${getEmployeeName(row.employeeId)}</td>   <td>${row.date}</td>   <td>${row.status}</td>   <td>${Number(row.lateMinutes || 0)}</td>   </tr>  ).join("")
: <tr><td colspan="4">لا يوجد سجل حضور</td></tr>;
}

function renderAll() {
renderEmployeeTypesTable();
renderDepartmentsTable();
renderJobsTable();
renderLinesTable();
renderVehiclesTable();
renderPricingTable();
renderEmployeesTable();
renderAttendanceTable();
renderLeaveTable();
renderLoansTable();
renderAdjustmentsTable();
renderPayrollTable();
renderPayrollArchiveTable();
renderEmployeeHistoryTable();
renderAttendanceHistoryTable();
renderDeleteRequestsTable();
renderUsersTable();
renderPermissionsTable();
renderLogsTable();
renderBackupsTable();
refreshDashboard();
populateReportFilters();
}

function refreshDashboard() {
renderCards();
renderTopLists();
renderDashboardAlerts();
renderAttendanceChart();
renderDepartmentChart();
updateBackupStatus();
}

function initPWAInstall() {
window.addEventListener("beforeinstallprompt", (e) => {
e.preventDefault();
deferredPrompt = e;
const installBtn = $("installBtn");
if (installBtn) {
installBtn.style.display = "inline-flex";
installBtn.onclick = async () => {
if (!deferredPrompt) return;
deferredPrompt.prompt();
await deferredPrompt.userChoice;
deferredPrompt = null;
installBtn.style.display = "none";
};
}
});
}

function registerServiceWorker() {
if ("serviceWorker" in navigator) {
navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
}

function initApp() {
seedDemoData();
loadState();
applyDarkMode();
updateDateTime();

if ($("payrollMonth") && !$("payrollMonth").value) {
$("payrollMonth").value = currentMonthPrefix();
}

renderAll();
showSection("dashboard", document.querySelector(".menu-btn.active"));
initPWAInstall();
registerServiceWorker();

setInterval(updateDateTime, 1000);
}

window.addEventListener("load", initApp);
