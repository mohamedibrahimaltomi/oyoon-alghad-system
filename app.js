const STORAGE_KEYS = {
  employees: "oyoon_v4_employees",
  employeeTypes: "oyoon_v4_employee_types",
  departments: "oyoon_v4_departments",
  jobs: "oyoon_v4_jobs",
  lines: "oyoon_v4_lines",
  vehicles: "oyoon_v4_vehicles",
  pricing: "oyoon_v4_pricing",
  attendance: "oyoon_v4_attendance",
  loans: "oyoon_v4_loans",
  adjustments: "oyoon_v4_adjustments",
  deleteRequests: "oyoon_v4_delete_requests",
  users: "oyoon_v4_users",
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
  loans: [],
  adjustments: [],
  deleteRequests: [],
  users: [],
  backups: [],
  attendanceChart: null,
  departmentChart: null
};

function $(id){ return document.getElementById(id); }
function safeArray(v){ return Array.isArray(v) ? v : []; }
function saveToStorage(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function loadFromStorage(key){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }catch{
    return [];
  }
}
function createId(prefix="id"){
  return `${prefix}_${Date.now()}_${Math.floor(Math.random()*100000)}`;
}
function todayISO(){
  return new Date().toISOString().split("T")[0];
}
function currentMonthPrefix(){
  return new Date().toISOString().slice(0,7);
}
function formatDateTime(date = new Date()){
  return date.toLocaleString("ar-EG");
}
function bytesToMB(bytes){
  return (bytes / (1024*1024)).toFixed(2);
}
function estimateObjectSizeBytes(obj){
  return new Blob([JSON.stringify(obj)]).size;
}
function countWorkDaysInMonth(year, month){
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for(let day=1; day<=daysInMonth; day++){
    const weekDay = new Date(year, month-1, day).getDay();
    if(weekDay !== 5) count++;
  }
  return count;
}
function promptRequired(label, def=""){
  const value = prompt(label, def);
  if(value === null) return null;
  if(String(value).trim() === ""){
    alert("هذا الحقل مطلوب");
    return null;
  }
  return String(value).trim();
}
function requestDelete(tableName, itemLabel){
  state.deleteRequests.push({
    id: createId("del"),
    tableName,
    itemLabel,
    status: "معلق",
    createdAt: new Date().toISOString()
  });
  saveToStorage(STORAGE_KEYS.deleteRequests, state.deleteRequests);
  autoCreateBackup(`طلب حذف - ${tableName}`);
  renderDeleteRequestsTable();
  refreshDashboard();
}
function requestBrowserNotifications(){
  if(!("Notification" in window)){
    alert("المتصفح لا يدعم الإشعارات");
    return;
  }
  Notification.requestPermission().then((permission) => {
    if(permission === "granted"){
      localStorage.setItem(STORAGE_KEYS.notifications, "1");
      alert("تم تفعيل الإشعارات");
    }else{
      alert("لم يتم تفعيل الإشعارات");
    }
  });
}
function notify(title, body){
  if(localStorage.getItem(STORAGE_KEYS.notifications) === "1" && "Notification" in window && Notification.permission === "granted"){
    new Notification(title, { body });
  }
}
function showSection(sectionId, btn){
  document.querySelectorAll(".section").forEach((section) => section.classList.remove("active"));
  const section = $(sectionId);
  if(section) section.classList.add("active");

  document.querySelectorAll(".menu-btn").forEach((b) => b.classList.remove("active"));
  if(btn) btn.classList.add("active");

  const titles = {
    dashboard:"لوحة التحكم",
    employees:"الموظفون",
    employeeTypes:"أنواع الموظفين",
    departments:"الأقسام",
    jobs:"الوظائف",
    lines:"خطوط التوزيع",
    vehicles:"أنواع السيارات",
    pricing:"تسعير الخطوط",
    attendance:"الحضور",
    fingerprint:"البصمة / Excel",
    loans:"السلف والديون",
    adjustments:"الإضافات والخصومات",
    payroll:"الرواتب",
    deleteRequests:"طلبات الحذف",
    users:"المستخدمون",
    reports:"التقارير",
    backups:"النسخ الاحتياطية",
    settings:"الإعدادات"
  };
  if($("pageTitle")) $("pageTitle").textContent = titles[sectionId] || "النظام";
}
function applyDarkMode(){
  const enabled = localStorage.getItem(STORAGE_KEYS.darkMode) === "1";
  document.documentElement.classList.toggle("dark", enabled);
  document.body.classList.toggle("dark", enabled);
}
function toggleDarkMode(){
  const enabled = localStorage.getItem(STORAGE_KEYS.darkMode) === "1";
  localStorage.setItem(STORAGE_KEYS.darkMode, enabled ? "0" : "1");
  applyDarkMode();
}
function updateDateTime(){
  if($("dateTime")) $("dateTime").textContent = formatDateTime();
}

/* ===== Lookup helpers ===== */
function getEmployeeTypeName(id){
  return state.employeeTypes.find(x => x.id === id)?.name || "غير محدد";
}
function getEmployeeTypeByName(name){
  return state.employeeTypes.find(x => x.name === name);
}
function getPayrollMethodLabel(method){
  if(method === "driver_line_vehicle") return "حسب الخط والسيارة";
  if(method === "reserve_driver") return "احتياط / بدل سائق";
  return "راتب ثابت";
}
function getDepartmentName(id){
  return state.departments.find(x => x.id === id)?.name || "-";
}
function getDepartmentByName(name){
  return state.departments.find(x => x.name === name);
}
function getJobName(id){
  return state.jobs.find(x => x.id === id)?.name || "-";
}
function getJobByName(name){
  return state.jobs.find(x => x.name === name);
}
function getLineName(id){
  return state.lines.find(x => x.id === id)?.name || "-";
}
function getLineByName(name){
  return state.lines.find(x => x.name === name);
}
function getVehicleName(id){
  return state.vehicles.find(x => x.id === id)?.name || "-";
}
function getVehicleByName(name){
  return state.vehicles.find(x => x.name === name);
}
function getEmployeeName(id){
  return state.employees.find(x => x.id === id)?.name || "-";
}
function getPricingValue(lineId, vehicleId){
  return Number(state.pricing.find(x => x.lineId === lineId && x.vehicleId === vehicleId)?.amount || 0);
}

/* ===== Seed ===== */
function seedDemoData(){
  if(loadFromStorage(STORAGE_KEYS.employeeTypes).length === 0){
    saveToStorage(STORAGE_KEYS.employeeTypes, [
      { id:createId("etype"), name:"سائق", payrollMethod:"driver_line_vehicle" },
      { id:createId("etype"), name:"سائق احتياط", payrollMethod:"reserve_driver" },
      { id:createId("etype"), name:"مسوق", payrollMethod:"fixed_salary" },
      { id:createId("etype"), name:"موظف", payrollMethod:"fixed_salary" }
    ]);
  }

  if(loadFromStorage(STORAGE_KEYS.departments).length === 0){
    saveToStorage(STORAGE_KEYS.departments, [
      { id:createId("dep"), name:"المبيعات" },
      { id:createId("dep"), name:"الحركة" },
      { id:createId("dep"), name:"الإدارة" }
    ]);
  }

  const departments = loadFromStorage(STORAGE_KEYS.departments);

  if(loadFromStorage(STORAGE_KEYS.jobs).length === 0){
    saveToStorage(STORAGE_KEYS.jobs, [
      { id:createId("job"), departmentId:departments[0]?.id || "", name:"مسوق" },
      { id:createId("job"), departmentId:departments[1]?.id || "", name:"سائق" },
      { id:createId("job"), departmentId:departments[1]?.id || "", name:"سائق احتياط" },
      { id:createId("job"), departmentId:departments[2]?.id || "", name:"موظف إداري" }
    ]);
  }

  if(loadFromStorage(STORAGE_KEYS.lines).length === 0){
    saveToStorage(STORAGE_KEYS.lines, [
      { id:createId("line"), name:"خط الساحل" },
      { id:createId("line"), name:"خط صبراتة" },
      { id:createId("line"), name:"خط الزاوية" }
    ]);
  }

  if(loadFromStorage(STORAGE_KEYS.vehicles).length === 0){
    saveToStorage(STORAGE_KEYS.vehicles, [
      { id:createId("veh"), name:"سيارة صغيرة" },
      { id:createId("veh"), name:"فان" },
      { id:createId("veh"), name:"شاحنة" }
    ]);
  }

  const lines = loadFromStorage(STORAGE_KEYS.lines);
  const vehicles = loadFromStorage(STORAGE_KEYS.vehicles);

  if(loadFromStorage(STORAGE_KEYS.pricing).length === 0){
    saveToStorage(STORAGE_KEYS.pricing, [
      { id:createId("price"), lineId:lines[0]?.id || "", vehicleId:vehicles[0]?.id || "", amount:2200 },
      { id:createId("price"), lineId:lines[1]?.id || "", vehicleId:vehicles[1]?.id || "", amount:2600 },
      { id:createId("price"), lineId:lines[2]?.id || "", vehicleId:vehicles[2]?.id || "", amount:3000 }
    ]);
  }

  if(loadFromStorage(STORAGE_KEYS.users).length === 0){
    saveToStorage(STORAGE_KEYS.users, [
      { id:createId("usr"), username:"admin", fullName:"مدير النظام", role:"مدير النظام", status:"active" }
    ]);
  }

  const employeeTypes = loadFromStorage(STORAGE_KEYS.employeeTypes);
  const jobs = loadFromStorage(STORAGE_KEYS.jobs);
  const driverType = employeeTypes.find(x => x.name === "سائق");
  const reserveType = employeeTypes.find(x => x.name === "سائق احتياط");
  const marketerType = employeeTypes.find(x => x.name === "مسوق");
  const employeeType = employeeTypes.find(x => x.name === "موظف");

  if(loadFromStorage(STORAGE_KEYS.employees).length === 0){
    saveToStorage(STORAGE_KEYS.employees, [
      {
        id:createId("emp"),
        employeeNo:"1001",
        name:"أحمد سالم",
        departmentId:departments[0]?.id || "",
        jobId:jobs.find(x => x.name === "مسوق")?.id || "",
        employeeTypeId:marketerType?.id || "",
        lineId:"",
        vehicleId:"",
        salary:1800
      },
      {
        id:createId("emp"),
        employeeNo:"1002",
        name:"محمد علي",
        departmentId:departments[1]?.id || "",
        jobId:jobs.find(x => x.name === "سائق")?.id || "",
        employeeTypeId:driverType?.id || "",
        lineId:lines[0]?.id || "",
        vehicleId:vehicles[0]?.id || "",
        salary:0
      },
      {
        id:createId("emp"),
        employeeNo:"1003",
        name:"خالد محمود",
        departmentId:departments[1]?.id || "",
        jobId:jobs.find(x => x.name === "سائق احتياط")?.id || "",
        employeeTypeId:reserveType?.id || "",
        lineId:"",
        vehicleId:"",
        salary:1600
      },
      {
        id:createId("emp"),
        employeeNo:"1004",
        name:"يوسف إبراهيم",
        departmentId:departments[2]?.id || "",
        jobId:jobs.find(x => x.name === "موظف إداري")?.id || "",
        employeeTypeId:employeeType?.id || "",
        lineId:"",
        vehicleId:"",
        salary:2500
      }
    ]);
  }

  const employees = loadFromStorage(STORAGE_KEYS.employees);

  if(loadFromStorage(STORAGE_KEYS.attendance).length === 0){
    saveToStorage(STORAGE_KEYS.attendance, [
      { id:createId("att"), date:todayISO(), employeeId:employees[0]?.id || "", status:"حضور", checkIn:"08:05", lateMinutes:0, reserveReplacement:false, actualLineId:"", actualVehicleId:"" },
      { id:createId("att"), date:todayISO(), employeeId:employees[1]?.id || "", status:"تأخير", checkIn:"08:25", lateMinutes:25, reserveReplacement:false, actualLineId:"", actualVehicleId:"" },
      { id:createId("att"), date:todayISO(), employeeId:employees[2]?.id || "", status:"غياب", checkIn:"", lateMinutes:0, reserveReplacement:false, actualLineId:"", actualVehicleId:"" },
      { id:createId("att"), date:todayISO(), employeeId:employees[3]?.id || "", status:"حضور", checkIn:"07:58", lateMinutes:0, reserveReplacement:false, actualLineId:"", actualVehicleId:"" }
    ]);
  }

  if(loadFromStorage(STORAGE_KEYS.loans).length === 0){
    saveToStorage(STORAGE_KEYS.loans, []);
  }
  if(loadFromStorage(STORAGE_KEYS.adjustments).length === 0){
    saveToStorage(STORAGE_KEYS.adjustments, []);
  }
  if(loadFromStorage(STORAGE_KEYS.deleteRequests).length === 0){
    saveToStorage(STORAGE_KEYS.deleteRequests, []);
  }
}
function loadState(){
  state.employeeTypes = safeArray(loadFromStorage(STORAGE_KEYS.employeeTypes));
  state.departments = safeArray(loadFromStorage(STORAGE_KEYS.departments));
  state.jobs = safeArray(loadFromStorage(STORAGE_KEYS.jobs));
  state.lines = safeArray(loadFromStorage(STORAGE_KEYS.lines));
  state.vehicles = safeArray(loadFromStorage(STORAGE_KEYS.vehicles));
  state.pricing = safeArray(loadFromStorage(STORAGE_KEYS.pricing));
  state.employees = safeArray(loadFromStorage(STORAGE_KEYS.employees));
  state.attendance = safeArray(loadFromStorage(STORAGE_KEYS.attendance));
  state.loans = safeArray(loadFromStorage(STORAGE_KEYS.loans));
  state.adjustments = safeArray(loadFromStorage(STORAGE_KEYS.adjustments));
  state.deleteRequests = safeArray(loadFromStorage(STORAGE_KEYS.deleteRequests));
  state.users = safeArray(loadFromStorage(STORAGE_KEYS.users));
  state.backups = safeArray(loadFromStorage(STORAGE_KEYS.backups));
}

/* ===== Backups ===== */
function buildBackupSnapshot(reason="نسخة احتياطية"){
  return {
    employeeTypes: state.employeeTypes,
    departments: state.departments,
    jobs: state.jobs,
    lines: state.lines,
    vehicles: state.vehicles,
    pricing: state.pricing,
    employees: state.employees,
    attendance: state.attendance,
    loans: state.loans,
    adjustments: state.adjustments,
    deleteRequests: state.deleteRequests,
    users: state.users,
    reason
  };
}
function getBackupUsageBytes(){
  return state.backups.reduce((sum, b) => sum + Number(b.sizeBytes || 0), 0);
}
function getBackupUsageMB(){
  return Number(bytesToMB(getBackupUsageBytes()));
}
function getRemainingBackupMB(){
  return Math.max(BACKUP_LIMIT_MB - getBackupUsageMB(), 0).toFixed(2);
}
function cleanupOldBackupsIfNeeded(){
  let totalMB = getBackupUsageMB();
  while(totalMB >= BACKUP_LIMIT_MB && state.backups.length > 0){
    state.backups.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    state.backups.shift();
    totalMB = getBackupUsageMB();
  }
  saveToStorage(STORAGE_KEYS.backups, state.backups);
}
function autoCreateBackup(reason="تحديث تلقائي"){
  const snapshot = buildBackupSnapshot(reason);
  const sizeBytes = estimateObjectSizeBytes(snapshot);
  state.backups.push({
    id:createId("backup"),
    createdAt:new Date().toISOString(),
    reason,
    sizeBytes,
    snapshot
  });
  cleanupOldBackupsIfNeeded();
  saveToStorage(STORAGE_KEYS.backups, state.backups);
  renderBackupsTable();
  updateBackupStatus();
}
function createBackup(){
  autoCreateBackup("نسخة يدوية");
  alert("تم إنشاء نسخة احتياطية");
}
function downloadBackup(backupId){
  const backup = state.backups.find(x => x.id === backupId);
  if(!backup) return;
  const blob = new Blob([JSON.stringify(backup.snapshot, null, 2)], { type:"application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `backup-${backup.createdAt}.json`;
  link.click();
}
function renderBackupsTable(){
  const tbody = $("backupsTable");
  if(!tbody) return;
  if(state.backups.length === 0){
    tbody.innerHTML = `<tr><td colspan="4">لا توجد نسخ احتياطية</td></tr>`;
    return;
  }
  tbody.innerHTML = state.backups
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((b) => `
      <tr>
        <td>${formatDateTime(new Date(b.createdAt))}</td>
        <td>${b.reason || "-"}</td>
        <td>${bytesToMB(b.sizeBytes)} MB</td>
        <td><button onclick="downloadBackup('${b.id}')">تحميل</button></td>
      </tr>
    `).join("");
}
function updateBackupStatus(){
  const last = state.backups.length ? state.backups.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0] : null;
  $("backupUsage").innerHTML = `
    <div>عدد النسخ: <strong>${state.backups.length}</strong></div>
    <div>آخر نسخة: <strong>${last ? formatDateTime(new Date(last.createdAt)) : "-"}</strong></div>
    <div>الحجم المستخدم: <strong>${getBackupUsageMB().toFixed(2)} MB</strong></div>
    <div>المساحة المتاحة: <strong>${getRemainingBackupMB()} MB</strong></div>
    <div>المساحة الكلية: <strong>${BACKUP_LIMIT_MB} MB</strong></div>
  `;
}

/* ===== Employee Types ===== */
function renderEmployeeTypesTable(){
  const tbody = $("employeeTypesTable");
  if(!tbody) return;
  tbody.innerHTML = state.employeeTypes.length ? state.employeeTypes.map((t) => `
    <tr>
      <td>${t.name}</td>
      <td>${getPayrollMethodLabel(t.payrollMethod)}</td>
      <td>
        <button onclick="editEmployeeType('${t.id}')">تعديل</button>
        <button onclick="deleteEmployeeType('${t.id}')">حذف</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="3">لا توجد أنواع موظفين</td></tr>`;
}
function addEmployeeType(){
  const name = promptRequired("اسم نوع الموظف");
  if(!name) return;
  const payrollMethod = promptRequired("طريقة الاحتساب:\nfixed_salary\n driver_line_vehicle\n reserve_driver", "fixed_salary");
  if(!payrollMethod) return;
  state.employeeTypes.push({ id:createId("etype"), name, payrollMethod });
  saveToStorage(STORAGE_KEYS.employeeTypes, state.employeeTypes);
  autoCreateBackup("إضافة نوع موظف");
  renderAll();
}
function editEmployeeType(id){
  const row = state.employeeTypes.find(x => x.id === id);
  if(!row) return;
  const name = promptRequired("اسم نوع الموظف", row.name);
  if(!name) return;
  const payrollMethod = promptRequired("طريقة الاحتساب", row.payrollMethod);
  if(!payrollMethod) return;
  row.name = name;
  row.payrollMethod = payrollMethod;
  saveToStorage(STORAGE_KEYS.employeeTypes, state.employeeTypes);
  autoCreateBackup("تعديل نوع موظف");
  renderAll();
}
function deleteEmployeeType(id){
  const row = state.employeeTypes.find(x => x.id === id);
  if(!row) return;
  if(!confirm(`هل تريد حذف نوع الموظف: ${row.name} ؟`)) return;
  state.employeeTypes = state.employeeTypes.filter(x => x.id !== id);
  state.employees = state.employees.map((e) => e.employeeTypeId === id ? { ...e, employeeTypeId:"" } : e);
  saveToStorage(STORAGE_KEYS.employeeTypes, state.employeeTypes);
  saveToStorage(STORAGE_KEYS.employees, state.employees);
  requestDelete("employeeTypes", row.name);
  autoCreateBackup("حذف نوع موظف");
  renderAll();
}

/* ===== Departments ===== */
function renderDepartmentsTable(){
  const tbody = $("departmentsTable");
  if(!tbody) return;
  tbody.innerHTML = state.departments.length ? state.departments.map((d) => `
    <tr>
      <td>${d.name}</td>
      <td>
        <button onclick="editDepartment('${d.id}')">تعديل</button>
        <button onclick="deleteDepartment('${d.id}')">حذف</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="2">لا توجد أقسام</td></tr>`;
}
function addDepartment(){
  const name = promptRequired("اسم القسم");
  if(!name) return;
  state.departments.push({ id:createId("dep"), name });
  saveToStorage(STORAGE_KEYS.departments, state.departments);
  autoCreateBackup("إضافة قسم");
  renderAll();
}
function editDepartment(id){
  const row = state.departments.find(x => x.id === id);
  if(!row) return;
  const name = promptRequired("اسم القسم", row.name);
  if(!name) return;
  row.name = name;
  saveToStorage(STORAGE_KEYS.departments, state.departments);
  autoCreateBackup("تعديل قسم");
  renderAll();
}
function deleteDepartment(id){
  const row = state.departments.find(x => x.id === id);
  if(!row) return;
  if(!confirm(`هل تريد حذف القسم: ${row.name} ؟`)) return;
  state.departments = state.departments.filter(x => x.id !== id);
  state.employees = state.employees.map((e) => e.departmentId === id ? { ...e, departmentId:"" } : e);
  state.jobs = state.jobs.map((j) => j.departmentId === id ? { ...j, departmentId:"" } : j);
  saveToStorage(STORAGE_KEYS.departments, state.departments);
  saveToStorage(STORAGE_KEYS.employees, state.employees);
  saveToStorage(STORAGE_KEYS.jobs, state.jobs);
  requestDelete("departments", row.name);
  autoCreateBackup("حذف قسم");
  renderAll();
}

/* ===== Jobs ===== */
function renderJobsTable(){
  const tbody = $("jobsTable");
  if(!tbody) return;
  tbody.innerHTML = state.jobs.length ? state.jobs.map((j) => `
    <tr>
      <td>${getDepartmentName(j.departmentId)}</td>
      <td>${j.name}</td>
      <td>
        <button onclick="editJob('${j.id}')">تعديل</button>
        <button onclick="deleteJob('${j.id}')">حذف</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="3">لا توجد وظائف</td></tr>`;
}
function addJob(){
  if(state.departments.length === 0){
    alert("أضف قسمًا أولًا");
    return;
  }
  const depName = promptRequired("اختر القسم بالاسم:\n" + state.departments.map(x => x.name).join(" / "));
  if(!depName) return;
  const department = getDepartmentByName(depName);
  if(!department){
    alert("القسم غير موجود");
    return;
  }
  const name = promptRequired("اسم الوظيفة");
  if(!name) return;
  state.jobs.push({ id:createId("job"), departmentId:department.id, name });
  saveToStorage(STORAGE_KEYS.jobs, state.jobs);
  autoCreateBackup("إضافة وظيفة");
  renderAll();
}
function editJob(id){
  const row = state.jobs.find(x => x.id === id);
  if(!row) return;
  const name = promptRequired("اسم الوظيفة", row.name);
  if(!name) return;
  row.name = name;
  saveToStorage(STORAGE_KEYS.jobs, state.jobs);
  autoCreateBackup("تعديل وظيفة");
  renderAll();
}
function deleteJob(id){
  const row = state.jobs.find(x => x.id === id);
  if(!row) return;
  if(!confirm(`هل تريد حذف الوظيفة: ${row.name} ؟`)) return;
  state.jobs = state.jobs.filter(x => x.id !== id);
  state.employees = state.employees.map((e) => e.jobId === id ? { ...e, jobId:"" } : e);
  saveToStorage(STORAGE_KEYS.jobs, state.jobs);
  saveToStorage(STORAGE_KEYS.employees, state.employees);
  requestDelete("jobs", row.name);
  autoCreateBackup("حذف وظيفة");
  renderAll();
}

/* ===== Lines ===== */
function renderLinesTable(){
  const tbody = $("linesTable");
  if(!tbody) return;
  tbody.innerHTML = state.lines.length ? state.lines.map((l) => `
    <tr>
      <td>${l.name}</td>
      <td>
        <button onclick="editLine('${l.id}')">تعديل</button>
        <button onclick="deleteLine('${l.id}')">حذف</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="2">لا توجد خطوط توزيع</td></tr>`;
}
function addLine(){
  const name = promptRequired("اسم خط التوزيع");
  if(!name) return;
  state.lines.push({ id:createId("line"), name });
  saveToStorage(STORAGE_KEYS.lines, state.lines);
  autoCreateBackup("إضافة خط");
  renderAll();
}
function editLine(id){
  const row = state.lines.find(x => x.id === id);
  if(!row) return;
  const name = promptRequired("اسم الخط", row.name);
  if(!name) return;
  row.name = name;
  saveToStorage(STORAGE_KEYS.lines, state.lines);
  autoCreateBackup("تعديل خط");
  renderAll();
}
function deleteLine(id){
  const row = state.lines.find(x => x.id === id);
  if(!row) return;
  if(!confirm(`هل تريد حذف الخط: ${row.name} ؟`)) return;
  state.lines = state.lines.filter(x => x.id !== id);
  state.pricing = state.pricing.filter(x => x.lineId !== id);
  state.employees = state.employees.map((e) => e.lineId === id ? { ...e, lineId:"" } : e);
  state.attendance = state.attendance.map((a) => a.actualLineId === id ? { ...a, actualLineId:"" } : a);
  saveToStorage(STORAGE_KEYS.lines, state.lines);
  saveToStorage(STORAGE_KEYS.pricing, state.pricing);
  saveToStorage(STORAGE_KEYS.employees, state.employees);
  saveToStorage(STORAGE_KEYS.attendance, state.attendance);
  requestDelete("lines", row.name);
  autoCreateBackup("حذف خط");
  renderAll();
}

/* ===== Vehicles ===== */
function renderVehiclesTable(){
  const tbody = $("vehiclesTable");
  if(!tbody) return;
  tbody.innerHTML = state.vehicles.length ? state.vehicles.map((v) => `
    <tr>
      <td>${v.name}</td>
      <td>
        <button onclick="editVehicle('${v.id}')">تعديل</button>
        <button onclick="deleteVehicle('${v.id}')">حذف</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="2">لا توجد أنواع سيارات</td></tr>`;
}
function addVehicle(){
  const name = promptRequired("اسم نوع السيارة");
  if(!name) return;
  state.vehicles.push({ id:createId("veh"), name });
  saveToStorage(STORAGE_KEYS.vehicles, state.vehicles);
  autoCreateBackup("إضافة سيارة");
  renderAll();
}
function editVehicle(id){
  const row = state.vehicles.find(x => x.id === id);
  if(!row) return;
  const name = promptRequired("اسم نوع السيارة", row.name);
  if(!name) return;
  row.name = name;
  saveToStorage(STORAGE_KEYS.vehicles, state.vehicles);
  autoCreateBackup("تعديل سيارة");
  renderAll();
}
function deleteVehicle(id){
  const row = state.vehicles.find(x => x.id === id);
  if(!row) return;
  if(!confirm(`هل تريد حذف نوع السيارة: ${row.name} ؟`)) return;
  state.vehicles = state.vehicles.filter(x => x.id !== id);
  state.pricing = state.pricing.filter(x => x.vehicleId !== id);
  state.employees = state.employees.map((e) => e.vehicleId === id ? { ...e, vehicleId:"" } : e);
  state.attendance = state.attendance.map((a) => a.actualVehicleId === id ? { ...a, actualVehicleId:"" } : a);
  saveToStorage(STORAGE_KEYS.vehicles, state.vehicles);
  saveToStorage(STORAGE_KEYS.pricing, state.pricing);
  saveToStorage(STORAGE_KEYS.employees, state.employees);
  saveToStorage(STORAGE_KEYS.attendance, state.attendance);
  requestDelete("vehicles", row.name);
  autoCreateBackup("حذف سيارة");
  renderAll();
}

/* ===== Pricing ===== */
function renderPricingTable(){
  const tbody = $("pricingTable");
  if(!tbody) return;
  tbody.innerHTML = state.pricing.length ? state.pricing.map((p) => `
    <tr>
      <td>${getLineName(p.lineId)}</td>
      <td>${getVehicleName(p.vehicleId)}</td>
      <td>${Number(p.amount || 0).toFixed(2)}</td>
      <td>
        <button onclick="editPricing('${p.id}')">تعديل</button>
        <button onclick="deletePricing('${p.id}')">حذف</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="4">لا توجد تسعيرات</td></tr>`;
}
function addPricing(){
  if(state.lines.length === 0 || state.vehicles.length === 0){
    alert("أضف الخطوط والسيارات أولًا");
    return;
  }
  const lineName = promptRequired("اختر الخط:\n" + state.lines.map(x => x.name).join(" / "));
  if(!lineName) return;
  const vehicleName = promptRequired("اختر السيارة:\n" + state.vehicles.map(x => x.name).join(" / "));
  if(!vehicleName) return;
  const line = getLineByName(lineName);
  const vehicle = getVehicleByName(vehicleName);
  if(!line || !vehicle){
    alert("الخط أو السيارة غير موجود");
    return;
  }
  const amount = Number(promptRequired("القيمة الشهرية", "0") || 0);
  const existing = state.pricing.find(x => x.lineId === line.id && x.vehicleId === vehicle.id);
  if(existing){
    existing.amount = amount;
  }else{
    state.pricing.push({ id:createId("price"), lineId:line.id, vehicleId:vehicle.id, amount });
  }
  saveToStorage(STORAGE_KEYS.pricing, state.pricing);
  autoCreateBackup("إضافة/تعديل تسعيرة");
  renderAll();
}
function editPricing(id){
  const row = state.pricing.find(x => x.id === id);
  if(!row) return;
  const amount = Number(promptRequired("القيمة الشهرية", String(row.amount || 0)) || 0);
  row.amount = amount;
  saveToStorage(STORAGE_KEYS.pricing, state.pricing);
  autoCreateBackup("تعديل تسعيرة");
  renderAll();
}
function deletePricing(id){
  const row = state.pricing.find(x => x.id === id);
  if(!row) return;
  if(!confirm("هل تريد حذف التسعيرة؟")) return;
  state.pricing = state.pricing.filter(x => x.id !== id);
  saveToStorage(STORAGE_KEYS.pricing, state.pricing);
  requestDelete("pricing", `${getLineName(row.lineId)} - ${getVehicleName(row.vehicleId)}`);
  autoCreateBackup("حذف تسعيرة");
  renderAll();
}

/* ===== Employees ===== */
function renderEmployeesTable(){
  const tbody = $("employeesTable");
  if(!tbody) return;
  tbody.innerHTML = state.employees.length ? state.employees.map((e) => `
    <tr>
      <td>${e.employeeNo}</td>
      <td>${e.name}</td>
      <td>${getDepartmentName(e.departmentId)}</td>
      <td>${getJobName(e.jobId)}</td>
      <td>${getEmployeeTypeName(e.employeeTypeId)}</td>
      <td>${getLineName(e.lineId)}</td>
      <td>${getVehicleName(e.vehicleId)}</td>
      <td>${Number(e.salary || 0).toFixed(2)}</td>
      <td><button onclick="editEmployee('${e.id}')">تعديل</button></td>
    </tr>
  `).join("") : `<tr><td colspan="9">لا توجد بيانات موظفين</td></tr>`;
}
function openEmployeeForm(){
  const employeeNo = promptRequired("الرقم الوظيفي");
  if(!employeeNo) return;
  const name = promptRequired("اسم الموظف");
  if(!name) return;

  const depName = promptRequired("القسم:\n" + state.departments.map(x => x.name).join(" / "), state.departments[0]?.name || "");
  if(!depName) return;
  const department = getDepartmentByName(depName);

  const jobName = promptRequired("الوظيفة:\n" + state.jobs.map(x => x.name).join(" / "), state.jobs[0]?.name || "");
  if(!jobName) return;
  const job = getJobByName(jobName);

  const typeName = promptRequired("نوع الموظف:\n" + state.employeeTypes.map(x => x.name).join(" / "), "موظف");
  if(!typeName) return;
  const type = getEmployeeTypeByName(typeName);

  let lineId = "";
  let vehicleId = "";
  let salary = 0;

  if(type?.payrollMethod === "driver_line_vehicle"){
    const lineName = promptRequired("خط التوزيع:\n" + state.lines.map(x => x.name).join(" / "));
    if(!lineName) return;
    lineId = getLineByName(lineName)?.id || "";

    const vehicleName = promptRequired("نوع السيارة:\n" + state.vehicles.map(x => x.name).join(" / "));
    if(!vehicleName) return;
    vehicleId = getVehicleByName(vehicleName)?.id || "";

    salary = 0;
  }else{
    salary = Number(promptRequired("الراتب أو مرتب الاحتياط", "0") || 0);
  }

  state.employees.push({
    id:createId("emp"),
    employeeNo,
    name,
    departmentId:department?.id || "",
    jobId:job?.id || "",
    employeeTypeId:type?.id || "",
    lineId,
    vehicleId,
    salary
  });

  saveToStorage(STORAGE_KEYS.employees, state.employees);
  autoCreateBackup("إضافة موظف");
  notify("إضافة موظف", `تمت إضافة الموظف ${name}`);
  renderAll();
}
function editEmployee(id){
  const e = state.employees.find(x => x.id === id);
  if(!e) return;
  const name = promptRequired("اسم الموظف", e.name);
  if(!name) return;
  e.name = name;
  saveToStorage(STORAGE_KEYS.employees, state.employees);
  autoCreateBackup("تعديل موظف");
  renderAll();
}

/* ===== Attendance ===== */
function renderAttendanceTable(){
  const tbody = $("attendanceTable");
  if(!tbody) return;
  tbody.innerHTML = state.attendance.length ? state.attendance
    .sort((a,b) => String(b.date).localeCompare(String(a.date)))
    .map((a) => `
      <tr>
        <td>${a.date}</td>
        <td>${getEmployeeName(a.employeeId)}</td>
        <td>${a.status}</td>
        <td>${a.checkIn || "-"}</td>
        <td>${a.lateMinutes || 0}</td>
        <td>${a.reserveReplacement ? "نعم" : "لا"}</td>
        <td>${getLineName(a.actualLineId)}</td>
        <td>${getVehicleName(a.actualVehicleId)}</td>
        <td><button onclick="editAttendance('${a.id}')">تعديل</button></td>
      </tr>
    `).join("") : `<tr><td colspan="9">لا توجد سجلات حضور</td></tr>`;
}
function addAttendance(){
  if(state.employees.length === 0){
    alert("أضف موظفين أولًا");
    return;
  }
  const employeeNo = promptRequired("رقم الموظف:\n" + state.employees.map(x => `${x.employeeNo} - ${x.name}`).join(" / "));
  if(!employeeNo) return;
  const employee = state.employees.find(x => x.employeeNo === employeeNo || x.name === employeeNo);
  if(!employee){
    alert("الموظف غير موجود");
    return;
  }
  const status = promptRequired("الحالة: حضور / غياب / تأخير / إجازة", "حضور");
  if(!status) return;
  const date = promptRequired("التاريخ", todayISO());
  if(!date) return;
  const checkIn = prompt("وقت الدخول", "08:00") || "";
  const lateMinutes = Number(prompt("دقائق التأخير", "0") || 0);

  let reserveReplacement = false;
  let actualLineId = "";
  let actualVehicleId = "";

  const typeName = getEmployeeTypeName(employee.employeeTypeId);
  if(typeName === "سائق احتياط"){
    reserveReplacement = confirm("هل خرج بدل سائق اليوم؟");
    if(reserveReplacement){
      const lineName = promptRequired("الخط الفعلي:\n" + state.lines.map(x => x.name).join(" / "));
      if(lineName) actualLineId = getLineByName(lineName)?.id || "";
      const vehicleName = promptRequired("السيارة الفعلية:\n" + state.vehicles.map(x => x.name).join(" / "));
      if(vehicleName) actualVehicleId = getVehicleByName(vehicleName)?.id || "";
    }
  }

  state.attendance.push({
    id:createId("att"),
    date,
    employeeId:employee.id,
    status,
    checkIn,
    lateMinutes,
    reserveReplacement,
    actualLineId,
    actualVehicleId
  });

  saveToStorage(STORAGE_KEYS.attendance, state.attendance);
  autoCreateBackup("إضافة حضور");
  if(status === "غياب") notify("تنبيه غياب", `${employee.name} غائب اليوم`);
  if(status === "تأخير") notify("تنبيه تأخير", `${employee.name} متأخر ${lateMinutes} دقيقة`);
  renderAll();
}
function editAttendance(id){
  const row = state.attendance.find(x => x.id === id);
  if(!row) return;
  const status = promptRequired("الحالة", row.status);
  if(!status) return;
  row.status = status;
  saveToStorage(STORAGE_KEYS.attendance, state.attendance);
  autoCreateBackup("تعديل حضور");
  renderAll();
}
function importFingerprintPrompt(){
  alert("الاستيراد الحقيقي من Excel يحتاج مكتبة وربط إضافي. سنضيفه لاحقًا على نفس الهيكل.");
}

/* ===== Loans ===== */
function calculateInstallmentPlan(amount, months){
  amount = Math.floor(Number(amount || 0));
  months = Math.max(1, Math.floor(Number(months || 1)));
  const base = Math.floor(amount / months);
  const remainder = amount - (base * months);
  const plan = [];
  for(let i=0; i<months; i++){
    plan.push(i === 0 ? base + remainder : base);
  }
  return plan;
}
function renderLoansTable(){
  const tbody = $("loansTable");
  if(!tbody) return;
  tbody.innerHTML = state.loans.length ? state.loans.map((l) => `
    <tr>
      <td>${getEmployeeName(l.employeeId)}</td>
      <td>${l.type}</td>
      <td>${Number(l.amount).toFixed(2)}</td>
      <td>${l.monthsCount}</td>
      <td>${Number(l.monthlyInstallment).toFixed(2)}</td>
      <td>${Number(l.remainingAmount).toFixed(2)}</td>
      <td>${Array.isArray(l.plan) ? l.plan.join(" / ") : "-"}</td>
      <td><button onclick="deleteLoan('${l.id}')">حذف</button></td>
    </tr>
  `).join("") : `<tr><td colspan="8">لا توجد سلف أو ديون</td></tr>`;
}
function addLoan(){
  const employeeNo = promptRequired("رقم الموظف:\n" + state.employees.map(x => `${x.employeeNo} - ${x.name}`).join(" / "));
  if(!employeeNo) return;
  const employee = state.employees.find(x => x.employeeNo === employeeNo || x.name === employeeNo);
  if(!employee){
    alert("الموظف غير موجود");
    return;
  }
  const type = promptRequired("النوع: سلفة / مديونية", "سلفة");
  if(!type) return;
  const amount = Number(promptRequired("المبلغ", "0") || 0);
  const monthsCount = Number(promptRequired("عدد الشهور", "1") || 1);
  const plan = calculateInstallmentPlan(amount, monthsCount);

  state.loans.push({
    id:createId("loan"),
    employeeId:employee.id,
    type,
    amount,
    monthsCount,
    monthlyInstallment: plan[0] || 0,
    remainingAmount: amount,
    plan
  });

  saveToStorage(STORAGE_KEYS.loans, state.loans);
  autoCreateBackup("إضافة سلفة/دين");
  notify("سلفة/مديونية جديدة", `تمت إضافة ${type} للموظف ${employee.name}`);
  renderAll();
}
function deleteLoan(id){
  const row = state.loans.find(x => x.id === id);
  if(!row) return;
  if(!confirm("هل تريد حذف هذا السجل؟")) return;
  state.loans = state.loans.filter(x => x.id !== id);
  saveToStorage(STORAGE_KEYS.loans, state.loans);
  requestDelete("loans", getEmployeeName(row.employeeId));
  autoCreateBackup("حذف سلفة/دين");
  renderAll();
}

/* ===== Adjustments ===== */
function renderAdjustmentsTable(){
  const tbody = $("adjustmentsTable");
  if(!tbody) return;
  tbody.innerHTML = state.adjustments.length ? state.adjustments.map((a) => `
    <tr>
      <td>${getEmployeeName(a.employeeId)}</td>
      <td>${a.type}</td>
      <td>${Number(a.amount).toFixed(2)}</td>
      <td>${a.month}</td>
      <td>${a.notes || "-"}</td>
      <td><button onclick="deleteAdjustment('${a.id}')">حذف</button></td>
    </tr>
  `).join("") : `<tr><td colspan="6">لا توجد إضافات أو خصومات</td></tr>`;
}
function addAdjustment(){
  const employeeNo = promptRequired("رقم الموظف:\n" + state.employees.map(x => `${x.employeeNo} - ${x.name}`).join(" / "));
  if(!employeeNo) return;
  const employee = state.employees.find(x => x.employeeNo === employeeNo || x.name === employeeNo);
  if(!employee){
    alert("الموظف غير موجود");
    return;
  }
  const type = promptRequired("النوع: إضافة / خصم", "إضافة");
  if(!type) return;
  const amount = Number(promptRequired("المبلغ", "0") || 0);
  const month = promptRequired("الشهر", currentMonthPrefix());
  if(!month) return;
  const notes = prompt("ملاحظات", "") || "";

  state.adjustments.push({
    id:createId("adj"),
    employeeId:employee.id,
    type,
    amount,
    month,
    notes
  });

  saveToStorage(STORAGE_KEYS.adjustments, state.adjustments);
  autoCreateBackup("إضافة إضافة/خصم");
  renderAll();
}
function deleteAdjustment(id){
  const row = state.adjustments.find(x => x.id === id);
  if(!row) return;
  if(!confirm("هل تريد حذف هذا السجل؟")) return;
  state.adjustments = state.adjustments.filter(x => x.id !== id);
  saveToStorage(STORAGE_KEYS.adjustments, state.adjustments);
  requestDelete("adjustments", getEmployeeName(row.employeeId));
  autoCreateBackup("حذف إضافة/خصم");
  renderAll();
}

/* ===== Users ===== */
function renderUsersTable(){
  const tbody = $("usersTable");
  if(!tbody) return;
  tbody.innerHTML = state.users.length ? state.users.map((u) => `
    <tr>
      <td>${u.username}</td>
      <td>${u.fullName}</td>
      <td>${u.role}</td>
      <td>${u.status}</td>
      <td><button onclick="deleteUser('${u.id}')">حذف</button></td>
    </tr>
  `).join("") : `<tr><td colspan="5">لا يوجد مستخدمون</td></tr>`;
}
function addUser(){
  const username = promptRequired("اسم المستخدم");
  if(!username) return;
  const fullName = promptRequired("الاسم الكامل");
  if(!fullName) return;
  const role = promptRequired("الدور", "مدير النظام");
  if(!role) return;

  state.users.push({
    id:createId("usr"),
    username,
    fullName,
    role,
    status:"active"
  });

  saveToStorage(STORAGE_KEYS.users, state.users);
  autoCreateBackup("إضافة مستخدم");
  renderAll();
}
function deleteUser(id){
  const row = state.users.find(x => x.id === id);
  if(!row) return;
  if(!confirm("هل تريد حذف المستخدم؟")) return;
  state.users = state.users.filter(x => x.id !== id);
  saveToStorage(STORAGE_KEYS.users, state.users);
  requestDelete("users", row.username);
  autoCreateBackup("حذف مستخدم");
  renderAll();
}

/* ===== Delete Requests ===== */
function renderDeleteRequestsTable(){
  const tbody = $("deleteRequestsTable");
  if(!tbody) return;
  tbody.innerHTML = state.deleteRequests.length ? state.deleteRequests
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((d) => `
      <tr>
        <td>${d.tableName}</td>
        <td>${d.itemLabel}</td>
        <td>${d.status}</td>
        <td>${formatDateTime(new Date(d.createdAt))}</td>
      </tr>
    `).join("") : `<tr><td colspan="4">لا توجد طلبات حذف</td></tr>`;
}

/* ===== Reports ===== */
function exportArrayToCSV(filename, rows){
  if(!rows || rows.length === 0){
    alert("لا توجد بيانات للتصدير");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ];
  const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type:"text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
function exportEmployees(){
  exportArrayToCSV("employees.csv", state.employees.map((e) => ({
    الرقم_الوظيفي:e.employeeNo,
    الاسم:e.name,
    القسم:getDepartmentName(e.departmentId),
    الوظيفة:getJobName(e.jobId),
    النوع:getEmployeeTypeName(e.employeeTypeId),
    الخط:getLineName(e.lineId),
    السيارة:getVehicleName(e.vehicleId),
    الراتب:e.salary
  })));
}
function exportAttendance(){
  exportArrayToCSV("attendance.csv", state.attendance.map((a) => ({
    التاريخ:a.date,
    الموظف:getEmployeeName(a.employeeId),
    الحالة:a.status,
    وقت_الدخول:a.checkIn,
    التأخير:a.lateMinutes,
    بدل_سائق:a.reserveReplacement ? "نعم" : "لا",
    الخط_الفعلي:getLineName(a.actualLineId),
    السيارة_الفعلية:getVehicleName(a.actualVehicleId)
  })));
}
function exportPayroll(){
  exportArrayToCSV("payroll.csv", buildPayrollRows().map((p) => ({
    الموظف:p.name,
    النوع:p.type,
    أيام_العمل:p.workDays,
    الحضور:p.presentDays,
    الغياب:p.absentDays,
    المستحق:p.deservedSalary.toFixed(2),
    الإضافات:p.additions.toFixed(2),
    خصم_السلف:p.loanDeduction.toFixed(2),
    الخصومات:p.manualDeduction.toFixed(2),
    المرحل:p.transported.toFixed(2),
    الصافي:p.net.toFixed(2)
  })));
}
function exportPayrollPDF(){
  window.print();
}

/* ===== Payroll ===== */
function buildPayrollRows(){
  const month = currentMonthPrefix();
  const [year, monthNumber] = month.split("-").map(Number);
  const workDays = countWorkDaysInMonth(year, monthNumber);

  return state.employees.map((employee) => {
    const type = state.employeeTypes.find((t) => t.id === employee.employeeTypeId);
    const employeeAttendance = state.attendance.filter((row) => row.employeeId === employee.id && String(row.date).startsWith(month));

    const presentRows = employeeAttendance.filter((row) => ["حضور","تأخير","إجازة"].includes(row.status));
    const presentDays = presentRows.length;
    const absentDays = employeeAttendance.filter((row) => row.status === "غياب").length;

    let deservedSalary = 0;

    if(type?.payrollMethod === "driver_line_vehicle"){
      const monthlyRate = getPricingValue(employee.lineId, employee.vehicleId);
      deservedSalary = workDays > 0 ? (monthlyRate / workDays) * presentDays : 0;
    }else if(type?.payrollMethod === "reserve_driver"){
      let total = 0;
      for(const row of presentRows){
        if(row.reserveReplacement && row.actualLineId && row.actualVehicleId){
          const actualMonthly = getPricingValue(row.actualLineId, row.actualVehicleId);
          total += workDays > 0 ? actualMonthly / workDays : 0;
        }else{
          total += workDays > 0 ? Number(employee.salary || 0) / workDays : 0;
        }
      }
      deservedSalary = total;
    }else{
      deservedSalary = workDays > 0 ? (Number(employee.salary || 0) / workDays) * presentDays : 0;
    }

    const monthLoans = state.loans.filter((l) => l.employeeId === employee.id);
    const loanDeduction = monthLoans.reduce((sum, l) => sum + Number(l.monthlyInstallment || 0), 0);

    const monthAdjustments = state.adjustments.filter((a) => a.employeeId === employee.id && a.month === month);
    const additions = monthAdjustments.filter((a) => a.type === "إضافة").reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const manualDeduction = monthAdjustments.filter((a) => a.type === "خصم").reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const gross = deservedSalary + additions;
    const deductions = loanDeduction + manualDeduction;

    let net = 0;
    let transported = 0;

    if(deductions <= gross){
      net = gross - deductions;
    }else{
      net = 0;
      transported = deductions - gross;
    }

    return {
      employeeId: employee.id,
      name: employee.name,
      type: getEmployeeTypeName(employee.employeeTypeId),
      workDays,
      presentDays,
      absentDays,
      deservedSalary,
      additions,
      loanDeduction,
      manualDeduction,
      transported,
      net
    };
  });
}
function renderPayrollTable(){
  const tbody = $("payrollTable");
  if(!tbody) return;
  const rows = buildPayrollRows();
  tbody.innerHTML = rows.length ? rows.map((r) => `
    <tr>
      <td>${r.name}</td>
      <td>${r.type}</td>
      <td>${r.workDays}</td>
      <td>${r.presentDays}</td>
      <td>${r.absentDays}</td>
      <td>${r.deservedSalary.toFixed(2)}</td>
      <td>${r.additions.toFixed(2)}</td>
      <td>${r.loanDeduction.toFixed(2)}</td>
      <td>${r.manualDeduction.toFixed(2)}</td>
      <td>${r.transported.toFixed(2)}</td>
      <td>${r.net.toFixed(2)}</td>
    </tr>
  `).join("") : `<tr><td colspan="11">لا توجد بيانات رواتب</td></tr>`;
}
function generatePayroll(){
  renderPayrollTable();
  notify("تحديث الرواتب", "تم تحديث كشف الرواتب الحالي");
}

/* ===== Dashboard ===== */
function getTodayAttendanceRows(){
  return state.attendance.filter((row) => row.date === todayISO());
}
function getTodayPresentCount(){
  return getTodayAttendanceRows().filter((row) => row.status === "حضور").length;
}
function getTodayAbsentCount(){
  return getTodayAttendanceRows().filter((row) => row.status === "غياب").length;
}
function getTodayLateCount(){
  return getTodayAttendanceRows().filter((row) => row.status === "تأخير").length;
}
function computeTopByStatus(status){
  const month = currentMonthPrefix();
  const counts = {};
  state.attendance
    .filter((row) => String(row.date).startsWith(month))
    .forEach((row) => {
      if(row.status === status){
        const key = getEmployeeName(row.employeeId);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
  return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0,5);
}
function computeTopLate(){
  const month = currentMonthPrefix();
  const counts = {};
  state.attendance
    .filter((row) => String(row.date).startsWith(month))
    .forEach((row) => {
      if(row.status === "تأخير"){
        const key = getEmployeeName(row.employeeId);
        counts[key] = (counts[key] || 0) + Number(row.lateMinutes || 0);
      }
    });
  return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0,5);
}
function renderTopLists(){
  $("topAttendance").innerHTML = computeTopByStatus("حضور").map((r) => `<li>${r[0]} - ${r[1]}</li>`).join("") || "<li>لا توجد بيانات</li>";
  $("topAbsence").innerHTML = computeTopByStatus("غياب").map((r) => `<li>${r[0]} - ${r[1]}</li>`).join("") || "<li>لا توجد بيانات</li>";
  $("topLate").innerHTML = computeTopLate().map((r) => `<li>${r[0]} - ${r[1]} دقيقة</li>`).join("") || "<li>لا توجد بيانات</li>";
}
function renderCards(){
  $("employeesCount").textContent = state.employees.length;
  $("todayAttendance").textContent = getTodayPresentCount();
  $("todayAbsence").textContent = getTodayAbsentCount();
  $("todayLate").textContent = getTodayLateCount();
  $("activeLoansCount").textContent = state.loans.length;
  $("pendingDeletesCount").textContent = state.deleteRequests.filter((x) => x.status === "معلق").length;
}
function renderDashboardAlerts(){
  const box = $("dashboardAlerts");
  if(!box) return;
  const alerts = [];
  state.attendance.filter((x) => x.date === todayISO() && x.status === "غياب").forEach((x) => {
    alerts.push({ text:`غياب اليوم: ${getEmployeeName(x.employeeId)}`, type:"danger" });
  });
  state.attendance.filter((x) => x.date === todayISO() && x.status === "تأخير").forEach((x) => {
    alerts.push({ text:`تأخير اليوم: ${getEmployeeName(x.employeeId)} - ${x.lateMinutes} دقيقة`, type:"warn" });
  });
  if(state.deleteRequests.some((x) => x.status === "معلق")){
    alerts.push({ text:`يوجد ${state.deleteRequests.filter((x) => x.status === "معلق").length} طلبات حذف معلقة`, type:"warn" });
  }
  if(getBackupUsageMB() > 40){
    alerts.push({ text:"تنبيه: مساحة النسخ الاحتياطية اقتربت من الحد", type:"warn" });
  }
  box.innerHTML = alerts.length ? alerts.map((a) => `<div class="alert-item ${a.type}">${a.text}</div>`).join("") : `<div class="alert-item success">لا توجد تنبيهات حالياً</div>`;
}
function renderAttendanceChart(){
  const canvas = $("attendanceChart");
  if(!canvas) return;

  if(state.attendanceChart) state.attendanceChart.destroy();

  state.attendanceChart = new Chart(canvas, {
    type:"bar",
    data:{
      labels:["حضور","غياب","تأخير"],
      datasets:[{
        label:"إحصائيات اليوم",
        data:[getTodayPresentCount(), getTodayAbsentCount(), getTodayLateCount()]
      }]
    },
    options:{ responsive:true, maintainAspectRatio:false }
  });
}
function renderDepartmentChart(){
  const canvas = $("departmentChart");
  if(!canvas) return;

  const counts = {};
  state.employees.forEach((e) => {
    const dep = getDepartmentName(e.departmentId);
    counts[dep] = (counts[dep] || 0) + 1;
  });

  if(state.departmentChart) state.departmentChart.destroy();

  state.departmentChart = new Chart(canvas, {
    type:"pie",
    data:{
      labels:Object.keys(counts),
      datasets:[{
        label:"الموظفون حسب القسم",
        data:Object.values(counts)
      }]
    },
    options:{ responsive:true, maintainAspectRatio:false }
  });
}
function refreshDashboard(){
  renderCards();
  renderTopLists();
  renderDashboardAlerts();
  renderAttendanceChart();
  renderDepartmentChart();
  updateBackupStatus();
}

/* ===== Render all ===== */
function renderAll(){
  renderEmployeeTypesTable();
  renderDepartmentsTable();
  renderJobsTable();
  renderLinesTable();
  renderVehiclesTable();
  renderPricingTable();
  renderEmployeesTable();
  renderAttendanceTable();
  renderLoansTable();
  renderAdjustmentsTable();
  renderPayrollTable();
  renderDeleteRequestsTable();
  renderUsersTable();
  renderBackupsTable();
  refreshDashboard();
}

/* ===== Init ===== */
function initApp(){
  seedDemoData();
  loadState();
  applyDarkMode();
  updateDateTime();
  renderAll();
  showSection("dashboard", document.querySelector(".menu-btn.active"));
  setInterval(updateDateTime, 1000);
}
window.addEventListener("load", initApp);
