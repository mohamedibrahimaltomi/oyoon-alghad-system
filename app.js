
const SUPABASE_URL = "https://okyujxqzzrxtmtuimndk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9reXVqeHF6enJ4dG10dWltbmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDIyNjYsImV4cCI6MjA4ODY3ODI2Nn0.KAk2TEAm_QVBo15wK5AWk4RfT5I7CNWd7SoiACqs7Yw";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
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
  deleteRequests: [],
  users: [],
  logs: [],
  payrollArchive: [],
  employeeHistory: [],
  backups: [],
  permissions: [
    { role: "مدير النظام", access: "كل شيء" },
    { role: "HR", access: "الموظفون / الحضور / الإجازات / التقارير" },
    { role: "محاسب", access: "الرواتب / السلف / الإضافات والخصومات" },
    { role: "موظف", access: "عرض فقط" }
  ],
  currentUser: null,
  modalSave: null,
  deferredInstallPrompt: null,
  attendanceChart: null,
  departmentChart: null,
  fingerprintPreviewRows: []
};

const App = {};

function $(id){ return document.getElementById(id); }
function esc(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function fmt(n){ return Number(n || 0).toFixed(2); }
function todayISO(){ return new Date().toISOString().split("T")[0]; }
function currentMonthPrefix(){ return new Date().toISOString().slice(0,7); }
function currentTimeString(){ return new Date().toLocaleString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true}); }
function countWorkDaysInMonth(year, month){ const days = new Date(year, month, 0).getDate(); let c = 0; for(let d=1; d<=days; d++){ if(new Date(year, month-1, d).getDay() !== 5) c++; } return c; }
function monthNameLabel(monthValue){ if(!monthValue) return "-"; const [y,m]=monthValue.split("-").map(Number); return new Date(y,m-1,1).toLocaleDateString("en-GB",{year:"numeric",month:"long"}); }
function statusBadge(status){ const map={"حضور":"success","غياب":"danger","تأخير":"warn","إجازة":"info","نشط":"success","معلق":"warn","active":"success","inactive":"danger"}; return `<span class="status-pill ${map[status]||'info'}">${esc(status)}</span>`; }
function downloadText(name, content, mime="text/plain;charset=utf-8"){ const blob = new Blob([content], {type:mime}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.click(); }
function exportCsv(name, rows){
  if(!rows.length){ App.info("لا توجد بيانات للتصدير."); return; }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g,'""')}"`).join(","))];
  downloadText(name, "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8");
}
function required(ids){ let ok=true; ids.forEach(id=>{ const el=$(id); if(!el) return; if(!String(el.value||"").trim()){ el.style.borderColor="var(--danger)"; ok=false; } else { el.style.borderColor="var(--border)"; }}); return ok; }
function selectOptions(rows, valueKey="id", labelGetter=(x)=>x.name){ return rows.map(row=>`<option value="${esc(row[valueKey])}">${esc(typeof labelGetter === "function" ? labelGetter(row) : row[labelGetter])}</option>`).join(""); }

function getType(id){ return state.employeeTypes.find(x=>x.id===id) || null; }
function getDepartment(id){ return state.departments.find(x=>x.id===id) || null; }
function getJob(id){ return state.jobs.find(x=>x.id===id) || null; }
function getLine(id){ return state.lines.find(x=>x.id===id) || null; }
function getVehicle(id){ return state.vehicles.find(x=>x.id===id) || null; }
function getEmployee(id){ return state.employees.find(x=>x.id===id) || null; }
function getTypeName(id){ return getType(id)?.name || "-"; }
function getDepartmentName(id){ return getDepartment(id)?.name || "-"; }
function getJobName(id){ return getJob(id)?.name || "-"; }
function getLineName(id){ return getLine(id)?.name || "-"; }
function getVehicleName(id){ return getVehicle(id)?.name || "-"; }
function getEmployeeName(id){ return getEmployee(id)?.name || "-"; }
function pricingValue(lineId, vehicleId){ return Number(state.pricing.find(x=>x.line_id===lineId && x.vehicle_id===vehicleId)?.amount || 0); }

App.showSection = function(id, btn){
  document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
  $(id)?.classList.add("active");
  document.querySelectorAll(".menu-btn").forEach(b=>b.classList.remove("active"));
  if(btn) btn.classList.add("active");
  const titles = {
    dashboard:"لوحة التحكم", employeeTypes:"أنواع الموظفين", departments:"الأقسام", jobs:"الوظائف", lines:"خطوط التوزيع", vehicles:"أنواع السيارات",
    pricing:"تسعير الخطوط", employees:"الموظفون", attendance:"الحضور", leaveRequests:"الإجازات", fingerprint:"استيراد البصمة", loans:"السلف والديون",
    adjustments:"الإضافات والخصومات", payroll:"الرواتب", payrollArchive:"أرشيف الرواتب", employeeHistory:"سجل تاريخ الموظف",
    attendanceHistory:"سجل الحضور الشهري", deleteRequests:"طلبات الحذف", users:"المستخدمون", logs:"سجل العمليات", reports:"التقارير",
    backups:"النسخ الاحتياطية", settings:"الإعدادات"
  };
  $("pageTitle").textContent = titles[id] || "النظام";
};

App.toggleDarkMode = function(){
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("oyoon_dark", document.documentElement.classList.contains("dark") ? "1" : "0");
};

App.applyDarkMode = function(){
  if(localStorage.getItem("oyoon_dark")==="1") document.documentElement.classList.add("dark");
};

App.requestBrowserNotifications = function(){
  if(!("Notification" in window)){ App.info("المتصفح لا يدعم الإشعارات."); return; }
  Notification.requestPermission().then(p => App.info(p === "granted" ? "تم تفعيل الإشعارات." : "لم يتم تفعيل الإشعارات."));
};

App.notify = function(title, body){
  if("Notification" in window && Notification.permission === "granted"){
    new Notification(title, { body });
  }
};

App.openModal = function(title, bodyHtml, onSave){
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = bodyHtml;
  $("appModal").classList.remove("hidden");
  state.modalSave = onSave || null;
  $("modalSaveBtn").onclick = ()=>{ if(typeof state.modalSave === "function") state.modalSave(); };
};

App.closeModal = function(){
  $("appModal").classList.add("hidden");
  $("modalBody").innerHTML = "";
  state.modalSave = null;
};

App.info = function(text){
  App.openModal("تنبيه", `<div class="note-box">${esc(text)}</div>`, ()=>App.closeModal());
};

App.formShell = function(inner, cols=""){
  return `<div class="form-grid ${cols}">${inner}</div>`;
};

async function logAction(action, details=""){
  if(!state.currentUser) return;
  await sb.from("app_logs").insert([{ action, username: state.currentUser.username, details }]);
}

async function addDeleteRequest(tableName, itemLabel){
  await sb.from("delete_requests").insert([{ table_name: tableName, item_label: itemLabel, status: "معلق" }]);
}

async function addEmployeeHistory(employeeId, changeText){
  if(!employeeId) return;
  await sb.from("employee_history").insert([{ employee_id: employeeId, change_text: changeText }]);
}

async function createCloudBackup(reason){
  const payload = {
    employeeTypes: state.employeeTypes,
    departments: state.departments,
    jobs: state.jobs,
    lines: state.lines,
    vehicles: state.vehicles,
    pricing: state.pricing,
    employees: state.employees,
    attendance: state.attendance,
    leaveRequests: state.leaveRequests,
    loans: state.loans,
    adjustments: state.adjustments,
    payrollArchive: state.payrollArchive,
    employeeHistory: state.employeeHistory,
    by: state.currentUser?.username || "system"
  };
  const sizeBytes = new Blob([JSON.stringify(payload)]).size;
  await sb.from("backups").insert([{ reason, payload, size_bytes: sizeBytes }]);
}

async function withMutation(actionLabel, reason, work){
  const result = await work();
  if(result.error){
    console.error(result.error);
    App.info("فشلت العملية. راجع Console أو إعدادات Supabase.");
    return false;
  }
  await logAction(actionLabel, reason);
  await createCloudBackup(reason);
  await loadAll();
  return true;
}

async function login(){
  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value.trim();
  if(!username || !password){ App.info("أدخل اسم المستخدم وكلمة المرور."); return; }
  const { data, error } = await sb.rpc("verify_app_user", { p_username: username, p_password: password });
  if(error){ console.error(error); App.info("فشل تسجيل الدخول."); return; }
  if(!data || !data.length){ App.info("بيانات الدخول غير صحيحة."); return; }
  state.currentUser = data[0];
  sessionStorage.setItem("oyoon_user", JSON.stringify(state.currentUser));
  $("loginScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  $("currentUserBadge").textContent = `${state.currentUser.full_name} - ${state.currentUser.role}`;
  await loadAll();
}

function logout(){
  sessionStorage.removeItem("oyoon_user");
  state.currentUser = null;
  $("appShell").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
}

async function restoreSession(){
  const raw = sessionStorage.getItem("oyoon_user");
  if(!raw) return false;
  try{
    state.currentUser = JSON.parse(raw);
    $("loginScreen").classList.add("hidden");
    $("appShell").classList.remove("hidden");
    $("currentUserBadge").textContent = `${state.currentUser.full_name} - ${state.currentUser.role}`;
    return true;
  }catch{
    return false;
  }
}

async function fetchTable(key, table, orderBy=null, ascending=true){
  let query = sb.from(table).select("*");
  if(orderBy) query = query.order(orderBy, { ascending });
  const { data, error } = await query;
  if(error){ console.error(table, error); state[key] = []; return; }
  state[key] = data || [];
}

async function loadAll(){
  await Promise.all([
    fetchTable("employeeTypes","employee_types","name"),
    fetchTable("departments","departments","name"),
    fetchTable("jobs","jobs","created_at",false),
    fetchTable("lines","lines","name"),
    fetchTable("vehicles","vehicles","name"),
    fetchTable("pricing","pricing","created_at",false),
    fetchTable("employees","employees","employee_no"),
    fetchTable("attendance","attendance","date",false),
    fetchTable("leaveRequests","leave_requests","from_date",false),
    fetchTable("loans","loans","created_at",false),
    fetchTable("adjustments","adjustments","month",false),
    fetchTable("deleteRequests","delete_requests","created_at",false),
    fetchTable("users","app_users","created_at",false),
    fetchTable("logs","app_logs","created_at",false),
    fetchTable("payrollArchive","payroll_archive","month",false),
    fetchTable("employeeHistory","employee_history","created_at",false),
    fetchTable("backups","backups","created_at",false),
  ]);
  renderAll();
}

async function ensureSeeds(){
  const { data: types } = await sb.from("employee_types").select("id").limit(1);
  if(!types || !types.length){
    await sb.from("employee_types").insert([
      { name:"سائق", payroll_method:"driver_line_vehicle" },
      { name:"سائق احتياط", payroll_method:"reserve_driver" },
      { name:"مسوق", payroll_method:"fixed_salary" },
      { name:"موظف", payroll_method:"fixed_salary" }
    ]);
  }
  const { data: deps } = await sb.from("departments").select("id").limit(1);
  if(!deps || !deps.length){
    await sb.from("departments").insert([{ name:"المبيعات" }, { name:"الحركة" }, { name:"الإدارة" }]);
  }
}

function updateDateTime(){
  $("dateTime").textContent = currentTimeString();
}

function getTodayRows(){ return state.attendance.filter(x=>x.date === todayISO()); }

function computeTopByStatus(status){
  const counts = {};
  state.attendance.filter(r=>String(r.date).startsWith(currentMonthPrefix()) && r.status === status).forEach(r=>{
    const key = getEmployeeName(r.employee_id);
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
}

function computeTopLate(){
  const counts = {};
  state.attendance.filter(r=>String(r.date).startsWith(currentMonthPrefix()) && r.status === "تأخير").forEach(r=>{
    const key = getEmployeeName(r.employee_id);
    counts[key] = (counts[key] || 0) + Number(r.late_minutes || 0);
  });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);
}

function buildPayrollRows(month = currentMonthPrefix()){
  const [year, monthNumber] = month.split("-").map(Number);
  const workDays = countWorkDaysInMonth(year, monthNumber);

  return state.employees.map(employee => {
    const type = getType(employee.employee_type_id);
    const employeeAttendance = state.attendance.filter(row => row.employee_id === employee.id && String(row.date).startsWith(month));
    const leaveRows = state.leaveRequests.filter(row => row.employee_id === employee.id && String(row.from_date).startsWith(month));

    const leaveAsPresenceDays = leaveRows.length;
    const presentRows = employeeAttendance.filter(row => ["حضور","تأخير","إجازة"].includes(row.status));
    const presentDays = presentRows.length + leaveAsPresenceDays;
    const absentDays = employeeAttendance.filter(row => row.status === "غياب").length;

    let deservedSalary = 0;
    if(type?.payroll_method === "driver_line_vehicle"){
      const monthlyRate = pricingValue(employee.line_id, employee.vehicle_id);
      deservedSalary = workDays > 0 ? (monthlyRate / workDays) * presentDays : 0;
    } else if(type?.payroll_method === "reserve_driver"){
      let total = 0;
      for(const row of presentRows){
        if(row.reserve_replacement && row.actual_line_id && row.actual_vehicle_id){
          total += workDays > 0 ? pricingValue(row.actual_line_id, row.actual_vehicle_id) / workDays : 0;
        } else {
          total += workDays > 0 ? Number(employee.salary || 0) / workDays : 0;
        }
      }
      total += leaveAsPresenceDays * (workDays > 0 ? Number(employee.salary || 0) / workDays : 0);
      deservedSalary = total;
    } else {
      deservedSalary = workDays > 0 ? (Number(employee.salary || 0) / workDays) * presentDays : 0;
    }

    const monthLoans = state.loans.filter(l => l.employee_id === employee.id && Number(l.remaining_amount || 0) > 0);
    let loanDeduction = 0;
    monthLoans.forEach(loan => { loanDeduction += Math.min(Number(loan.monthly_installment || 0), Number(loan.remaining_amount || 0)); });

    const monthAdjustments = state.adjustments.filter(a => a.employee_id === employee.id && a.month === month);
    const additions = monthAdjustments.filter(a => a.type === "إضافة").reduce((s,a)=>s + Number(a.amount || 0),0);
    const manualDeduction = monthAdjustments.filter(a => a.type === "خصم").reduce((s,a)=>s + Number(a.amount || 0),0);

    const gross = Number(deservedSalary || 0) + Number(additions || 0);
    const totalDeductions = Number(loanDeduction || 0) + Number(manualDeduction || 0);

    let net = 0;
    let transported = 0;
    if(totalDeductions <= gross){
      net = gross - totalDeductions;
    } else {
      transported = totalDeductions - gross;
      net = 0;
    }

    return {
      employeeId: employee.id,
      name: employee.name,
      type: type?.name || "غير محدد",
      workDays,
      presentDays,
      absentDays,
      deservedSalary: +deservedSalary.toFixed(2),
      additions: +additions.toFixed(2),
      loanDeduction: +loanDeduction.toFixed(2),
      manualDeduction: +manualDeduction.toFixed(2),
      transported: +transported.toFixed(2),
      net: +net.toFixed(2)
    };
  });
}

function renderCards(){
  $("employeesCount").textContent = state.employees.length;
  $("todayAttendance").textContent = getTodayRows().filter(x=>x.status==="حضور").length;
  $("todayAbsence").textContent = getTodayRows().filter(x=>x.status==="غياب").length;
  $("todayLate").textContent = getTodayRows().filter(x=>x.status==="تأخير").length;
  $("activeLoansCount").textContent = state.loans.filter(x=>Number(x.remaining_amount || 0) > 0).length;
  $("pendingDeletesCount").textContent = state.deleteRequests.filter(x=>x.status==="معلق").length;

  const payrollRows = buildPayrollRows(currentMonthPrefix());
  const totalPresent = payrollRows.reduce((s,r)=>s + Number(r.presentDays || 0),0);
  const totalAbsent = payrollRows.reduce((s,r)=>s + Number(r.absentDays || 0),0);
  const totalDays = totalPresent + totalAbsent;
  const attendanceAverage = totalDays > 0 ? (totalPresent / totalDays) * 100 : 0;
  const absenceRate = totalDays > 0 ? (totalAbsent / totalDays) * 100 : 0;
  const salaryCost = payrollRows.reduce((s,r)=>s + Number(r.net || 0),0);

  const depCosts = {};
  payrollRows.forEach(row=>{
    const depName = getDepartmentName(getEmployee(row.employeeId)?.department_id);
    depCosts[depName] = (depCosts[depName] || 0) + Number(row.net || 0);
  });
  let highestDepartmentCost = "-", maxCost = 0;
  Object.entries(depCosts).forEach(([dep,cost])=>{ if(cost > maxCost){ maxCost = cost; highestDepartmentCost = dep; }});

  $("attendanceAverage").textContent = `${attendanceAverage.toFixed(1)}%`;
  $("absenceRate").textContent = `${absenceRate.toFixed(1)}%`;
  $("salaryCost").textContent = salaryCost.toFixed(2);
  $("highestDepartmentCost").textContent = highestDepartmentCost;
}

function renderTopLists(){
  $("topAttendance").innerHTML = computeTopByStatus("حضور").map(r=>`<li>${r[0]} - ${r[1]}</li>`).join("") || "<li>لا توجد بيانات</li>";
  $("topAbsence").innerHTML = computeTopByStatus("غياب").map(r=>`<li>${r[0]} - ${r[1]}</li>`).join("") || "<li>لا توجد بيانات</li>";
  $("topLate").innerHTML = computeTopLate().map(r=>`<li>${r[0]} - ${r[1]} دقيقة</li>`).join("") || "<li>لا توجد بيانات</li>";
}

function renderDashboardAlerts(){
  const alerts = [];
  getTodayRows().filter(x=>x.status==="غياب").forEach(x=>alerts.push(`غياب اليوم: ${getEmployeeName(x.employee_id)}`));
  getTodayRows().filter(x=>x.status==="تأخير").forEach(x=>alerts.push(`تأخير اليوم: ${getEmployeeName(x.employee_id)} - ${x.late_minutes || 0} دقيقة`));
  const pending = state.deleteRequests.filter(x=>x.status==="معلق").length;
  if(pending) alerts.push(`يوجد ${pending} طلبات حذف معلقة`);
  $("dashboardAlerts").innerHTML = alerts.length ? alerts.map(t=>`<div class="alert-item">${esc(t)}</div>`).join("") : `<div class="alert-item">لا توجد تنبيهات حالياً</div>`;
}

function renderAttendanceChart(){
  if(state.attendanceChart) state.attendanceChart.destroy();
  state.attendanceChart = new Chart($("attendanceChart"), {
    type:"bar",
    data:{labels:["حضور","غياب","تأخير"],datasets:[{label:"إحصائيات اليوم",data:[
      getTodayRows().filter(x=>x.status==="حضور").length,
      getTodayRows().filter(x=>x.status==="غياب").length,
      getTodayRows().filter(x=>x.status==="تأخير").length
    ]}]},
    options:{responsive:true,maintainAspectRatio:false}
  });
}

function renderDepartmentChart(){
  const counts = {};
  state.employees.forEach(e=>{ const dep = getDepartmentName(e.department_id); counts[dep] = (counts[dep] || 0) + 1; });
  if(state.departmentChart) state.departmentChart.destroy();
  state.departmentChart = new Chart($("departmentChart"), {
    type:"pie",
    data:{labels:Object.keys(counts),datasets:[{label:"الموظفون حسب القسم",data:Object.values(counts)}]},
    options:{responsive:true,maintainAspectRatio:false}
  });
}

function renderEmployeeTypesTable(){
  $("employeeTypesTable").innerHTML = state.employeeTypes.length ? state.employeeTypes.map(item=>`
    <tr>
      <td>${esc(item.name)}</td>
      <td>${esc(item.payroll_method === "driver_line_vehicle" ? "حسب الخط والسيارة" : item.payroll_method === "reserve_driver" ? "احتياط / بدل سائق" : "راتب ثابت")}</td>
      <td><div class="inline-actions"><button onclick="App.openEmployeeTypeModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteEmployeeType('${item.id}')">حذف</button></div></td>
    </tr>`).join("") : `<tr><td colspan="3">لا توجد أنواع</td></tr>`;
}
function renderDepartmentsTable(){ $("departmentsTable").innerHTML = state.departments.length ? state.departments.map(item=>`<tr><td>${esc(item.name)}</td><td><div class="inline-actions"><button onclick="App.openDepartmentModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteDepartment('${item.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="2">لا توجد أقسام</td></tr>`; }
function renderJobsTable(){ $("jobsTable").innerHTML = state.jobs.length ? state.jobs.map(item=>`<tr><td>${esc(getDepartmentName(item.department_id))}</td><td>${esc(item.name)}</td><td><div class="inline-actions"><button onclick="App.openJobModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteJob('${item.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="3">لا توجد وظائف</td></tr>`; }
function renderLinesTable(){ $("linesTable").innerHTML = state.lines.length ? state.lines.map(item=>`<tr><td>${esc(item.name)}</td><td><div class="inline-actions"><button onclick="App.openLineModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteLine('${item.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="2">لا توجد خطوط</td></tr>`; }
function renderVehiclesTable(){ $("vehiclesTable").innerHTML = state.vehicles.length ? state.vehicles.map(item=>`<tr><td>${esc(item.name)}</td><td><div class="inline-actions"><button onclick="App.openVehicleModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteVehicle('${item.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="2">لا توجد سيارات</td></tr>`; }
function renderPricingTable(){ $("pricingTable").innerHTML = state.pricing.length ? state.pricing.map(item=>`<tr><td>${esc(getLineName(item.line_id))}</td><td>${esc(getVehicleName(item.vehicle_id))}</td><td>${fmt(item.amount)}</td><td><div class="inline-actions"><button onclick="App.openPricingModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deletePricing('${item.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="4">لا توجد تسعيرات</td></tr>`; }
function renderEmployeesTable(){
  const q = ($("employeesSearch").value || "").trim().toLowerCase();
  const rows = state.employees.filter(e=>[e.employee_no,e.name,getDepartmentName(e.department_id),getJobName(e.job_id),getTypeName(e.employee_type_id)].join(" ").toLowerCase().includes(q));
  $("employeesTable").innerHTML = rows.length ? rows.map(e=>`<tr><td>${esc(e.employee_no)}</td><td>${esc(e.name)}</td><td>${esc(getDepartmentName(e.department_id))}</td><td>${esc(getJobName(e.job_id))}</td><td>${esc(getTypeName(e.employee_type_id))}</td><td>${esc(getLineName(e.line_id))}</td><td>${esc(getVehicleName(e.vehicle_id))}</td><td>${fmt(e.salary)}</td><td>${statusBadge(e.status || "نشط")}</td><td><div class="inline-actions"><button onclick="App.openEmployeeModal('${e.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteEmployee('${e.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="10">لا توجد بيانات</td></tr>`;
}
function renderAttendanceTable(){
  const q = ($("attendanceSearch").value || "").trim().toLowerCase();
  const rows = state.attendance.filter(r=>[r.date,getEmployeeName(r.employee_id),r.status,getLineName(r.actual_line_id),getVehicleName(r.actual_vehicle_id)].join(" ").toLowerCase().includes(q));
  $("attendanceTable").innerHTML = rows.length ? rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(getEmployeeName(r.employee_id))}</td><td>${statusBadge(r.status)}</td><td>${esc(r.check_in || "-")}</td><td>${esc(r.late_minutes || 0)}</td><td>${r.reserve_replacement ? "نعم" : "لا"}</td><td>${esc(getLineName(r.actual_line_id))}</td><td>${esc(getVehicleName(r.actual_vehicle_id))}</td><td><div class="inline-actions"><button onclick="App.openAttendanceModal('${r.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteAttendance('${r.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="9">لا توجد سجلات</td></tr>`;
}
function renderLeaveTable(){ $("leaveTable").innerHTML = state.leaveRequests.length ? state.leaveRequests.map(item=>`<tr><td>${esc(getEmployeeName(item.employee_id))}</td><td>${esc(item.leave_type)}</td><td>${esc(item.from_date)}</td><td>${esc(item.to_date)}</td><td>${esc(item.notes || "-")}</td><td><div class="inline-actions"><button onclick="App.openLeaveModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteLeave('${item.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="6">لا توجد إجازات</td></tr>`; }
function renderLoansTable(){ $("loansTable").innerHTML = state.loans.length ? state.loans.map(item=>`<tr><td>${esc(getEmployeeName(item.employee_id))}</td><td>${esc(item.type)}</td><td>${fmt(item.amount)}</td><td>${esc(item.months_count)}</td><td>${fmt(item.monthly_installment)}</td><td>${fmt(item.remaining_amount)}</td><td>${Array.isArray(item.plan) ? item.plan.join(" / ") : "-"}</td><td><div class="inline-actions"><button onclick="App.openLoanModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteLoan('${item.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="8">لا توجد سلف أو ديون</td></tr>`; }
function renderAdjustmentsTable(){ $("adjustmentsTable").innerHTML = state.adjustments.length ? state.adjustments.map(item=>`<tr><td>${esc(getEmployeeName(item.employee_id))}</td><td>${esc(item.type)}</td><td>${fmt(item.amount)}</td><td>${esc(item.month)}</td><td>${esc(item.notes || "-")}</td><td><div class="inline-actions"><button onclick="App.openAdjustmentModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteAdjustment('${item.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="6">لا توجد إضافات أو خصومات</td></tr>`; }
function renderPayrollTable(){ const rows = buildPayrollRows($("payrollMonth").value || currentMonthPrefix()); $("payrollTable").innerHTML = rows.length ? rows.map(r=>`<tr><td>${r.name}</td><td>${r.type}</td><td>${r.workDays}</td><td>${r.presentDays}</td><td>${r.absentDays}</td><td>${r.deservedSalary.toFixed(2)}</td><td>${r.additions.toFixed(2)}</td><td>${r.loanDeduction.toFixed(2)}</td><td>${r.manualDeduction.toFixed(2)}</td><td>${r.transported.toFixed(2)}</td><td>${r.net.toFixed(2)}</td></tr>`).join("") : `<tr><td colspan="11">لا توجد بيانات رواتب</td></tr>`; }
function renderPayrollArchiveTable(){ $("payrollArchiveTable").innerHTML = state.payrollArchive.length ? state.payrollArchive.map(item=>`<tr><td>${esc(monthNameLabel(item.month))}</td><td>${(item.rows || []).length}</td><td>${fmt((item.rows || []).reduce((s,r)=>s + Number(r.net || 0),0))}</td></tr>`).join("") : `<tr><td colspan="3">لا يوجد أرشيف</td></tr>`; }
function renderEmployeeHistoryTable(){ $("employeeHistoryTable").innerHTML = state.employeeHistory.length ? state.employeeHistory.map(item=>`<tr><td>${esc(getEmployeeName(item.employee_id))}</td><td>${esc(new Date(item.created_at).toLocaleString("en-GB"))}</td><td>${esc(item.change_text)}</td></tr>`).join("") : `<tr><td colspan="3">لا يوجد سجل</td></tr>`; }
function renderAttendanceHistoryTable(){ const q = ($("attendanceHistorySearch").value || "").trim().toLowerCase(); const rows = state.attendance.filter(r=>[getEmployeeName(r.employee_id), getEmployee(r.employee_id)?.employee_no || "", r.date, r.status].join(" ").toLowerCase().includes(q)); $("attendanceHistoryTable").innerHTML = rows.length ? rows.map(r=>`<tr><td>${esc(getEmployeeName(r.employee_id))}</td><td>${esc(r.date)}</td><td>${esc(r.status)}</td><td>${esc(r.late_minutes || 0)}</td></tr>`).join("") : `<tr><td colspan="4">لا يوجد سجل</td></tr>`; }
function renderDeleteRequestsTable(){ $("deleteRequestsTable").innerHTML = state.deleteRequests.length ? state.deleteRequests.map(item=>`<tr><td>${esc(item.table_name)}</td><td>${esc(item.item_label)}</td><td>${statusBadge(item.status)}</td><td>${esc(new Date(item.created_at).toLocaleString("en-GB"))}</td></tr>`).join("") : `<tr><td colspan="4">لا توجد طلبات</td></tr>`; }
function renderUsersTable(){ $("usersTable").innerHTML = state.users.length ? state.users.map(item=>`<tr><td>${esc(item.username)}</td><td>${esc(item.full_name)}</td><td>${esc(item.role)}</td><td>${statusBadge(item.status)}</td><td><div class="inline-actions"><button onclick="App.openUserModal('${item.id}')">تعديل</button><button class="secondary-btn" onclick="App.deleteUser('${item.id}')">حذف</button></div></td></tr>`).join("") : `<tr><td colspan="5">لا يوجد مستخدمون</td></tr>`; }
function renderLogsTable(){ $("logsTable").innerHTML = state.logs.length ? state.logs.map(item=>`<tr><td>${esc(item.action)}</td><td>${esc(item.username)}</td><td>${esc(new Date(item.created_at).toLocaleString("en-GB"))}</td><td>${esc(item.details || "-")}</td></tr>`).join("") : `<tr><td colspan="4">لا توجد عمليات</td></tr>`; }
function renderBackupsTable(){ $("backupsTable").innerHTML = state.backups.length ? state.backups.map(item=>`<tr><td>${esc(new Date(item.created_at).toLocaleString("en-GB"))}</td><td>${esc(item.reason)}</td><td>${(Number(item.size_bytes || 0)/(1024*1024)).toFixed(2)} MB</td><td><button onclick="App.downloadBackup('${item.id}')">تحميل</button></td></tr>`).join("") : `<tr><td colspan="4">لا توجد نسخ</td></tr>`; }
function renderReportsFilters(){
  $("reportDepartmentFilter").innerHTML = `<option value="">كل الأقسام</option>` + selectOptions(state.departments);
  $("reportTypeFilter").innerHTML = `<option value="">كل أنواع الموظفين</option>` + selectOptions(state.employeeTypes);
  $("reportLineFilter").innerHTML = `<option value="">كل الخطوط</option>` + selectOptions(state.lines);
}
function updateBackupStatus(){
  const totalBytes = state.backups.reduce((s,b)=>s + Number(b.size_bytes || 0),0);
  const last = state.backups[0];
  $("backupUsage").innerHTML = `
    <div>عدد النسخ: <strong>${state.backups.length}</strong></div>
    <div>آخر نسخة: <strong>${last ? new Date(last.created_at).toLocaleString("en-GB") : "-"}</strong></div>
    <div>الحجم المستخدم: <strong>${(totalBytes / (1024*1024)).toFixed(2)} MB</strong></div>
  `;
}

function renderAll(){
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
  renderLogsTable();
  renderBackupsTable();
  renderReportsFilters();
  renderCards();
  renderTopLists();
  renderDashboardAlerts();
  renderAttendanceChart();
  renderDepartmentChart();
  updateBackupStatus();
}

App.openEmployeeTypeModal = function(id=""){
  const row = state.employeeTypes.find(x=>x.id===id);
  App.openModal(row ? "تعديل نوع موظف" : "إضافة نوع موظف", App.formShell(`
    <div class="field"><label>الاسم</label><input id="f_name" value="${esc(row?.name || "")}" /></div>
    <div class="field"><label>طريقة الاحتساب</label><select id="f_payroll_method">
      <option value="fixed_salary">راتب ثابت</option>
      <option value="driver_line_vehicle">حسب الخط والسيارة</option>
      <option value="reserve_driver">احتياط / بدل سائق</option>
    </select></div>
  `), async()=>{
    if(!required(["f_name","f_payroll_method"])) return;
    const payload = { name: $("f_name").value.trim(), payroll_method: $("f_payroll_method").value };
    const ok = row
      ? await withMutation("تعديل نوع موظف", `تعديل نوع موظف ${payload.name}`, ()=>sb.from("employee_types").update(payload).eq("id", row.id))
      : await withMutation("إضافة نوع موظف", `إضافة نوع موظف ${payload.name}`, ()=>sb.from("employee_types").insert([payload]));
    if(ok) App.closeModal();
  });
  $("f_payroll_method").value = row?.payroll_method || "fixed_salary";
};

App.deleteEmployeeType = async function(id){
  const row = state.employeeTypes.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف نوع الموظف: <strong>${esc(row?.name || "")}</strong> ؟</div>`, async()=>{
    const ok = await withMutation("حذف نوع موظف", `حذف نوع موظف ${row?.name || ""}`, ()=>sb.from("employee_types").delete().eq("id", id));
    if(ok){ await addDeleteRequest("employee_types", row?.name || ""); App.closeModal(); }
  });
};

App.openDepartmentModal = function(id=""){
  const row = state.departments.find(x=>x.id===id);
  App.openModal(row ? "تعديل قسم" : "إضافة قسم", App.formShell(`
    <div class="field"><label>اسم القسم</label><input id="f_name" value="${esc(row?.name || "")}" /></div>
  `, "one"), async()=>{
    if(!required(["f_name"])) return;
    const payload = { name: $("f_name").value.trim() };
    const ok = row
      ? await withMutation("تعديل قسم", `تعديل قسم ${payload.name}`, ()=>sb.from("departments").update(payload).eq("id", row.id))
      : await withMutation("إضافة قسم", `إضافة قسم ${payload.name}`, ()=>sb.from("departments").insert([payload]));
    if(ok) App.closeModal();
  });
};

App.deleteDepartment = async function(id){
  const row = state.departments.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف القسم: <strong>${esc(row?.name || "")}</strong> ؟</div>`, async()=>{
    const ok = await withMutation("حذف قسم", `حذف قسم ${row?.name || ""}`, ()=>sb.from("departments").delete().eq("id", id));
    if(ok){ await addDeleteRequest("departments", row?.name || ""); App.closeModal(); }
  });
};

App.openJobModal = function(id=""){
  const row = state.jobs.find(x=>x.id===id);
  App.openModal(row ? "تعديل وظيفة" : "إضافة وظيفة", App.formShell(`
    <div class="field"><label>القسم</label><select id="f_department_id"><option value="">اختر</option>${selectOptions(state.departments)}</select></div>
    <div class="field"><label>اسم الوظيفة</label><input id="f_name" value="${esc(row?.name || "")}" /></div>
  `), async()=>{
    if(!required(["f_department_id","f_name"])) return;
    const payload = { department_id: $("f_department_id").value || null, name: $("f_name").value.trim() };
    const ok = row
      ? await withMutation("تعديل وظيفة", `تعديل وظيفة ${payload.name}`, ()=>sb.from("jobs").update(payload).eq("id", row.id))
      : await withMutation("إضافة وظيفة", `إضافة وظيفة ${payload.name}`, ()=>sb.from("jobs").insert([payload]));
    if(ok) App.closeModal();
  });
  $("f_department_id").value = row?.department_id || "";
};

App.deleteJob = async function(id){
  const row = state.jobs.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف الوظيفة: <strong>${esc(row?.name || "")}</strong> ؟</div>`, async()=>{
    const ok = await withMutation("حذف وظيفة", `حذف وظيفة ${row?.name || ""}`, ()=>sb.from("jobs").delete().eq("id", id));
    if(ok){ await addDeleteRequest("jobs", row?.name || ""); App.closeModal(); }
  });
};

function simpleNameModal(title, rows, table, id){
  const row = rows.find(x=>x.id===id);
  App.openModal(row ? `تعديل ${title}` : `إضافة ${title}`, App.formShell(`<div class="field"><label>الاسم</label><input id="f_name" value="${esc(row?.name || "")}" /></div>`, "one"), async()=>{
    if(!required(["f_name"])) return;
    const payload = { name: $("f_name").value.trim() };
    const ok = row
      ? await withMutation(`تعديل ${title}`, `تعديل ${title} ${payload.name}`, ()=>sb.from(table).update(payload).eq("id", row.id))
      : await withMutation(`إضافة ${title}`, `إضافة ${title} ${payload.name}`, ()=>sb.from(table).insert([payload]));
    if(ok) App.closeModal();
  });
}
App.openLineModal = function(id=""){ simpleNameModal("خط", state.lines, "lines", id); };
App.openVehicleModal = function(id=""){ simpleNameModal("نوع سيارة", state.vehicles, "vehicles", id); };

App.deleteLine = async function(id){
  const row = state.lines.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف الخط: <strong>${esc(row?.name || "")}</strong> ؟</div>`, async()=>{
    const ok = await withMutation("حذف خط", `حذف خط ${row?.name || ""}`, ()=>sb.from("lines").delete().eq("id", id));
    if(ok){ await addDeleteRequest("lines", row?.name || ""); App.closeModal(); }
  });
};
App.deleteVehicle = async function(id){
  const row = state.vehicles.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف نوع السيارة: <strong>${esc(row?.name || "")}</strong> ؟</div>`, async()=>{
    const ok = await withMutation("حذف نوع سيارة", `حذف نوع سيارة ${row?.name || ""}`, ()=>sb.from("vehicles").delete().eq("id", id));
    if(ok){ await addDeleteRequest("vehicles", row?.name || ""); App.closeModal(); }
  });
};

App.openPricingModal = function(id=""){
  const row = state.pricing.find(x=>x.id===id);
  App.openModal(row ? "تعديل تسعيرة" : "إضافة تسعيرة", App.formShell(`
    <div class="field"><label>الخط</label><select id="f_line_id"><option value="">اختر</option>${selectOptions(state.lines)}</select></div>
    <div class="field"><label>السيارة</label><select id="f_vehicle_id"><option value="">اختر</option>${selectOptions(state.vehicles)}</select></div>
    <div class="field"><label>القيمة الشهرية</label><input id="f_amount" type="number" value="${esc(row?.amount || 0)}" /></div>
  `), async()=>{
    if(!required(["f_line_id","f_vehicle_id","f_amount"])) return;
    const payload = { line_id: $("f_line_id").value, vehicle_id: $("f_vehicle_id").value, amount: Number($("f_amount").value || 0) };
    const ok = row
      ? await withMutation("تعديل تسعيرة", "تعديل تسعيرة", ()=>sb.from("pricing").update(payload).eq("id", row.id))
      : await withMutation("إضافة تسعيرة", "إضافة تسعيرة", ()=>sb.from("pricing").insert([payload]));
    if(ok) App.closeModal();
  });
  $("f_line_id").value = row?.line_id || "";
  $("f_vehicle_id").value = row?.vehicle_id || "";
};

App.deletePricing = async function(id){
  const row = state.pricing.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف التسعيرة الحالية؟</div>`, async()=>{
    const ok = await withMutation("حذف تسعيرة", "حذف تسعيرة", ()=>sb.from("pricing").delete().eq("id", id));
    if(ok){ await addDeleteRequest("pricing", `${getLineName(row?.line_id)} - ${getVehicleName(row?.vehicle_id)}`); App.closeModal(); }
  });
};

App.openEmployeeModal = function(id=""){
  const row = state.employees.find(x=>x.id===id);
  App.openModal(row ? "تعديل موظف" : "إضافة موظف", App.formShell(`
    <div class="field"><label>الرقم الوظيفي</label><input id="f_employee_no" value="${esc(row?.employee_no || "")}" /></div>
    <div class="field"><label>الاسم</label><input id="f_name" value="${esc(row?.name || "")}" /></div>
    <div class="field"><label>القسم</label><select id="f_department_id"><option value="">اختر</option>${selectOptions(state.departments)}</select></div>
    <div class="field"><label>الوظيفة</label><select id="f_job_id"><option value="">اختر</option>${selectOptions(state.jobs, "id", x => `${getDepartmentName(x.department_id)} - ${x.name}`)}</select></div>
    <div class="field"><label>نوع الموظف</label><select id="f_employee_type_id"><option value="">اختر</option>${selectOptions(state.employeeTypes)}</select></div>
    <div class="field"><label>الخط</label><select id="f_line_id"><option value="">اختر</option>${selectOptions(state.lines)}</select></div>
    <div class="field"><label>السيارة</label><select id="f_vehicle_id"><option value="">اختر</option>${selectOptions(state.vehicles)}</select></div>
    <div class="field"><label>الراتب</label><input id="f_salary" type="number" value="${esc(row?.salary || 0)}" /></div>
    <div class="field"><label>الحالة</label><select id="f_status"><option value="نشط">نشط</option><option value="موقوف">موقوف</option></select></div>
    <div class="field"><label>ملاحظات</label><textarea id="f_notes">${esc(row?.notes || "")}</textarea></div>
  `), async()=>{
    if(!required(["f_employee_no","f_name","f_employee_type_id"])) return;
    const payload = {
      employee_no: $("f_employee_no").value.trim(),
      name: $("f_name").value.trim(),
      department_id: $("f_department_id").value || null,
      job_id: $("f_job_id").value || null,
      employee_type_id: $("f_employee_type_id").value || null,
      line_id: $("f_line_id").value || null,
      vehicle_id: $("f_vehicle_id").value || null,
      salary: Number($("f_salary").value || 0),
      status: $("f_status").value,
      notes: $("f_notes").value.trim()
    };
    const ok = row
      ? await withMutation("تعديل موظف", `تعديل موظف ${payload.name}`, ()=>sb.from("employees").update(payload).eq("id", row.id))
      : await withMutation("إضافة موظف", `إضافة موظف ${payload.name}`, ()=>sb.from("employees").insert([payload]));
    if(ok){
      if(row) await addEmployeeHistory(row.id, `تم تعديل بيانات الموظف ${payload.name}`);
      App.closeModal();
    }
  });
  $("f_department_id").value = row?.department_id || "";
  $("f_job_id").value = row?.job_id || "";
  $("f_employee_type_id").value = row?.employee_type_id || "";
  $("f_line_id").value = row?.line_id || "";
  $("f_vehicle_id").value = row?.vehicle_id || "";
  $("f_status").value = row?.status || "نشط";
};

App.deleteEmployee = async function(id){
  const row = state.employees.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف الموظف: <strong>${esc(row?.name || "")}</strong> ؟</div>`, async()=>{
    const ok = await withMutation("حذف موظف", `حذف موظف ${row?.name || ""}`, ()=>sb.from("employees").delete().eq("id", id));
    if(ok){ await addDeleteRequest("employees", row?.name || ""); App.closeModal(); }
  });
};

App.openAttendanceModal = function(id=""){
  const row = state.attendance.find(x=>x.id===id);
  App.openModal(row ? "تعديل حضور" : "إضافة حضور", App.formShell(`
    <div class="field"><label>الموظف</label><select id="f_employee_id"><option value="">اختر</option>${selectOptions(state.employees, "id", x=>`${x.employee_no} - ${x.name}`)}</select></div>
    <div class="field"><label>التاريخ</label><input id="f_date" type="date" value="${esc(row?.date || todayISO())}" /></div>
    <div class="field"><label>الحالة</label><select id="f_status"><option>حضور</option><option>غياب</option><option>تأخير</option><option>إجازة</option></select></div>
    <div class="field"><label>وقت الدخول</label><input id="f_check_in" value="${esc(row?.check_in || "")}" /></div>
    <div class="field"><label>دقائق التأخير</label><input id="f_late_minutes" type="number" value="${esc(row?.late_minutes || 0)}" /></div>
    <div class="field"><label>بدل سائق؟</label><select id="f_reserve_replacement"><option value="false">لا</option><option value="true">نعم</option></select></div>
    <div class="field"><label>الخط الفعلي</label><select id="f_actual_line_id"><option value="">اختر</option>${selectOptions(state.lines)}</select></div>
    <div class="field"><label>السيارة الفعلية</label><select id="f_actual_vehicle_id"><option value="">اختر</option>${selectOptions(state.vehicles)}</select></div>
  `), async()=>{
    if(!required(["f_employee_id","f_date","f_status"])) return;
    const payload = {
      employee_id: $("f_employee_id").value,
      date: $("f_date").value,
      status: $("f_status").value,
      check_in: $("f_check_in").value.trim() || null,
      late_minutes: Number($("f_late_minutes").value || 0),
      reserve_replacement: $("f_reserve_replacement").value === "true",
      actual_line_id: $("f_actual_line_id").value || null,
      actual_vehicle_id: $("f_actual_vehicle_id").value || null
    };
    const ok = row
      ? await withMutation("تعديل حضور", `تعديل حضور ${getEmployeeName(payload.employee_id)}`, ()=>sb.from("attendance").update(payload).eq("id", row.id))
      : await withMutation("إضافة حضور", `إضافة حضور ${getEmployeeName(payload.employee_id)}`, ()=>sb.from("attendance").insert([payload]));
    if(ok) App.closeModal();
  });
  $("f_employee_id").value = row?.employee_id || "";
  $("f_status").value = row?.status || "حضور";
  $("f_reserve_replacement").value = String(row?.reserve_replacement || false);
  $("f_actual_line_id").value = row?.actual_line_id || "";
  $("f_actual_vehicle_id").value = row?.actual_vehicle_id || "";
};

App.deleteAttendance = async function(id){
  const row = state.attendance.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف سجل الحضور الحالي؟</div>`, async()=>{
    const ok = await withMutation("حذف حضور", `حذف حضور ${getEmployeeName(row?.employee_id)}`, ()=>sb.from("attendance").delete().eq("id", id));
    if(ok){ await addDeleteRequest("attendance", getEmployeeName(row?.employee_id)); App.closeModal(); }
  });
};

App.openLeaveModal = function(id=""){
  const row = state.leaveRequests.find(x=>x.id===id);
  App.openModal(row ? "تعديل إجازة" : "إضافة إجازة", App.formShell(`
    <div class="field"><label>الموظف</label><select id="f_employee_id"><option value="">اختر</option>${selectOptions(state.employees, "id", x=>`${x.employee_no} - ${x.name}`)}</select></div>
    <div class="field"><label>نوع الإجازة</label><select id="f_leave_type"><option>سنوية</option><option>مرضية</option><option>بدون راتب</option></select></div>
    <div class="field"><label>من</label><input id="f_from_date" type="date" value="${esc(row?.from_date || todayISO())}" /></div>
    <div class="field"><label>إلى</label><input id="f_to_date" type="date" value="${esc(row?.to_date || todayISO())}" /></div>
    <div class="field"><label>ملاحظات</label><textarea id="f_notes">${esc(row?.notes || "")}</textarea></div>
  `), async()=>{
    if(!required(["f_employee_id","f_leave_type","f_from_date","f_to_date"])) return;
    const payload = { employee_id: $("f_employee_id").value, leave_type: $("f_leave_type").value, from_date: $("f_from_date").value, to_date: $("f_to_date").value, notes: $("f_notes").value.trim() };
    const ok = row
      ? await withMutation("تعديل إجازة", `تعديل إجازة ${getEmployeeName(payload.employee_id)}`, ()=>sb.from("leave_requests").update(payload).eq("id", row.id))
      : await withMutation("إضافة إجازة", `إضافة إجازة ${getEmployeeName(payload.employee_id)}`, ()=>sb.from("leave_requests").insert([payload]));
    if(ok) App.closeModal();
  });
  $("f_employee_id").value = row?.employee_id || "";
  $("f_leave_type").value = row?.leave_type || "سنوية";
};

App.deleteLeave = async function(id){
  const row = state.leaveRequests.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف الإجازة الحالية؟</div>`, async()=>{
    const ok = await withMutation("حذف إجازة", `حذف إجازة ${getEmployeeName(row?.employee_id)}`, ()=>sb.from("leave_requests").delete().eq("id", id));
    if(ok){ await addDeleteRequest("leave_requests", getEmployeeName(row?.employee_id)); App.closeModal(); }
  });
};

function installmentPlan(amount, months){
  amount = Math.floor(Number(amount || 0));
  months = Math.max(1, Math.floor(Number(months || 1)));
  const base = Math.floor(amount / months);
  const remainder = amount - (base * months);
  const plan = [];
  for(let i=0;i<months;i++){ plan.push(i===0 ? base + remainder : base); }
  return plan;
}

App.openLoanModal = function(id=""){
  const row = state.loans.find(x=>x.id===id);
  App.openModal(row ? "تعديل سلفة / دين" : "إضافة سلفة / دين", App.formShell(`
    <div class="field"><label>الموظف</label><select id="f_employee_id"><option value="">اختر</option>${selectOptions(state.employees, "id", x=>`${x.employee_no} - ${x.name}`)}</select></div>
    <div class="field"><label>النوع</label><select id="f_type"><option>سلفة</option><option>مديونية</option></select></div>
    <div class="field"><label>المبلغ</label><input id="f_amount" type="number" value="${esc(row?.amount || 0)}" /></div>
    <div class="field"><label>عدد الشهور</label><input id="f_months_count" type="number" value="${esc(row?.months_count || 1)}" /></div>
  `), async()=>{
    if(!required(["f_employee_id","f_type","f_amount","f_months_count"])) return;
    const amount = Number($("f_amount").value || 0);
    const months_count = Number($("f_months_count").value || 1);
    const plan = installmentPlan(amount, months_count);
    const payload = {
      employee_id: $("f_employee_id").value,
      type: $("f_type").value,
      amount,
      months_count,
      monthly_installment: plan[0] || 0,
      remaining_amount: amount,
      plan
    };
    const ok = row
      ? await withMutation("تعديل سلفة / دين", `تعديل سلفة / دين ${getEmployeeName(payload.employee_id)}`, ()=>sb.from("loans").update(payload).eq("id", row.id))
      : await withMutation("إضافة سلفة / دين", `إضافة سلفة / دين ${getEmployeeName(payload.employee_id)}`, ()=>sb.from("loans").insert([payload]));
    if(ok) App.closeModal();
  });
  $("f_employee_id").value = row?.employee_id || "";
  $("f_type").value = row?.type || "سلفة";
};

App.deleteLoan = async function(id){
  const row = state.loans.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف السلفة / الدين الحالي؟</div>`, async()=>{
    const ok = await withMutation("حذف سلفة / دين", `حذف سلفة / دين ${getEmployeeName(row?.employee_id)}`, ()=>sb.from("loans").delete().eq("id", id));
    if(ok){ await addDeleteRequest("loans", getEmployeeName(row?.employee_id)); App.closeModal(); }
  });
};

App.openAdjustmentModal = function(id=""){
  const row = state.adjustments.find(x=>x.id===id);
  App.openModal(row ? "تعديل إضافة / خصم" : "إضافة إضافة / خصم", App.formShell(`
    <div class="field"><label>الموظف</label><select id="f_employee_id"><option value="">اختر</option>${selectOptions(state.employees, "id", x=>`${x.employee_no} - ${x.name}`)}</select></div>
    <div class="field"><label>النوع</label><select id="f_type"><option>إضافة</option><option>خصم</option></select></div>
    <div class="field"><label>المبلغ</label><input id="f_amount" type="number" value="${esc(row?.amount || 0)}" /></div>
    <div class="field"><label>الشهر</label><input id="f_month" type="month" value="${esc(row?.month || currentMonthPrefix())}" /></div>
    <div class="field"><label>ملاحظات</label><textarea id="f_notes">${esc(row?.notes || "")}</textarea></div>
  `), async()=>{
    if(!required(["f_employee_id","f_type","f_amount","f_month"])) return;
    const payload = {
      employee_id: $("f_employee_id").value,
      type: $("f_type").value,
      amount: Number($("f_amount").value || 0),
      month: $("f_month").value,
      notes: $("f_notes").value.trim()
    };
    const ok = row
      ? await withMutation("تعديل إضافة / خصم", `تعديل إضافة / خصم ${getEmployeeName(payload.employee_id)}`, ()=>sb.from("adjustments").update(payload).eq("id", row.id))
      : await withMutation("إضافة إضافة / خصم", `إضافة إضافة / خصم ${getEmployeeName(payload.employee_id)}`, ()=>sb.from("adjustments").insert([payload]));
    if(ok) App.closeModal();
  });
  $("f_employee_id").value = row?.employee_id || "";
  $("f_type").value = row?.type || "إضافة";
};

App.deleteAdjustment = async function(id){
  const row = state.adjustments.find(x=>x.id===id);
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف هذا السجل؟</div>`, async()=>{
    const ok = await withMutation("حذف إضافة / خصم", `حذف إضافة / خصم ${getEmployeeName(row?.employee_id)}`, ()=>sb.from("adjustments").delete().eq("id", id));
    if(ok){ await addDeleteRequest("adjustments", getEmployeeName(row?.employee_id)); App.closeModal(); }
  });
};

App.generatePayroll = async function(){
  renderPayrollTable();
  await logAction("تحديث الرواتب", "تم تحديث كشف الرواتب");
  App.notify("تحديث الرواتب", "تم تحديث كشف الرواتب الحالي");
};

App.approvePayrollMonth = async function(){
  const month = $("payrollMonth").value || currentMonthPrefix();
  const rows = buildPayrollRows(month);
  const existing = state.payrollArchive.find(x=>x.month === month);
  const ok = existing
    ? await withMutation("اعتماد رواتب", `تم اعتماد رواتب شهر ${month}`, ()=>sb.from("payroll_archive").update({ rows, created_at: new Date().toISOString() }).eq("id", existing.id))
    : await withMutation("اعتماد رواتب", `تم اعتماد رواتب شهر ${month}`, ()=>sb.from("payroll_archive").insert([{ month, rows }]));
  if(ok) App.notify("اعتماد الرواتب", `تم اعتماد رواتب شهر ${month}`);
};

App.openUserModal = function(id=""){
  const row = state.users.find(x=>x.id===id);
  App.openModal(row ? "تعديل مستخدم" : "إضافة مستخدم", App.formShell(`
    <div class="field"><label>اسم المستخدم</label><input id="f_username" value="${esc(row?.username || "")}" /></div>
    <div class="field"><label>الاسم الكامل</label><input id="f_full_name" value="${esc(row?.full_name || "")}" /></div>
    <div class="field"><label>الدور</label><select id="f_role"><option>مدير النظام</option><option>HR</option><option>محاسب</option><option>موظف</option></select></div>
    <div class="field"><label>الحالة</label><select id="f_status"><option value="active">active</option><option value="inactive">inactive</option></select></div>
    <div class="field"><label>كلمة المرور ${row ? "(اختياري للتغيير)" : ""}</label><input id="f_password" type="password" /></div>
  `), async()=>{
    if(!required(["f_username","f_full_name","f_role","f_status"])) return;
    const username = $("f_username").value.trim();
    const fullName = $("f_full_name").value.trim();
    const role = $("f_role").value;
    const status = $("f_status").value;
    const password = $("f_password").value;
    if(!row && !password){ App.info("أدخل كلمة المرور."); return; }

    let result;
    if(row){
      result = await sb.rpc("update_app_user", { p_id: row.id, p_username: username, p_full_name: fullName, p_role: role, p_status: status, p_password: password || null });
    } else {
      result = await sb.rpc("create_app_user", { p_username: username, p_full_name: fullName, p_role: role, p_status: status, p_password: password });
    }
    if(result.error){ console.error(result.error); App.info("فشل حفظ المستخدم."); return; }
    await logAction(row ? "تعديل مستخدم" : "إضافة مستخدم", `${row ? "تعديل" : "إضافة"} مستخدم ${username}`);
    await createCloudBackup(`${row ? "تعديل" : "إضافة"} مستخدم ${username}`);
    await loadAll();
    App.closeModal();
  });
  $("f_role").value = row?.role || "موظف";
  $("f_status").value = row?.status || "active";
};

App.deleteUser = async function(id){
  const row = state.users.find(x=>x.id===id);
  if(!row) return;
  App.openModal("تأكيد الحذف", `<div class="note-box">حذف المستخدم: <strong>${esc(row.username)}</strong> ؟</div>`, async()=>{
    const ok = await withMutation("حذف مستخدم", `حذف مستخدم ${row.username}`, ()=>sb.from("app_users").delete().eq("id", id));
    if(ok){ await addDeleteRequest("app_users", row.username); App.closeModal(); }
  });
};

App.previewFingerprintImport = async function(){
  const file = $("fingerprintFile").files[0];
  if(!file){ App.info("اختر ملفًا أولًا."); return; }
  const data = await file.arrayBuffer();
  let rows = [];
  if(file.name.toLowerCase().endsWith(".csv")){
    const text = new TextDecoder().decode(data);
    const workbook = XLSX.read(text, { type:"string" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval:"" });
  } else {
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval:"" });
  }
  const normalize = (obj, keys)=> {
    for(const k of Object.keys(obj)){
      const low = String(k).trim().toLowerCase();
      if(keys.includes(low)) return obj[k];
    }
    return "";
  };
  state.fingerprintPreviewRows = rows.map(row=>{
    const employeeNo = String(normalize(row, ["employee_no","employee no","الرقم الوظيفي","رقم وظيفي","رقم"])).trim();
    const date = String(normalize(row, ["date","التاريخ"])).trim();
    const status = String(normalize(row, ["status","الحالة"])).trim() || "حضور";
    const checkIn = String(normalize(row, ["check_in","check in","وقت الدخول"])).trim();
    const lateMinutes = Number(normalize(row, ["late_minutes","late","التأخير"]) || 0);
    const employee = state.employees.find(e=>String(e.employee_no).trim() === employeeNo);
    return {
      employeeNo,
      employeeId: employee?.id || null,
      date,
      status,
      checkIn,
      lateMinutes,
      ok: Boolean(employee?.id && date)
    };
  });
  $("fingerprintPreviewTable").innerHTML = state.fingerprintPreviewRows.length ? state.fingerprintPreviewRows.map(r=>`
    <tr>
      <td>${esc(r.employeeNo)}</td>
      <td>${esc(r.date)}</td>
      <td>${esc(r.status)}</td>
      <td>${esc(r.checkIn || "-")}</td>
      <td>${esc(r.lateMinutes || 0)}</td>
      <td class="${r.ok ? 'preview-ok' : 'preview-bad'}">${r.ok ? "جاهز" : "غير مطابق"}</td>
    </tr>
  `).join("") : `<tr><td colspan="6">لا توجد بيانات للمعاينة</td></tr>`;
};

App.importFingerprintRows = async function(){
  if(!state.fingerprintPreviewRows.length){ App.info("قم بالمعاينة أولًا."); return; }
  const validRows = state.fingerprintPreviewRows.filter(r=>r.ok).map(r=>({
    employee_id: r.employeeId,
    date: r.date,
    status: r.status,
    check_in: r.checkIn || null,
    late_minutes: Number(r.lateMinutes || 0),
    reserve_replacement: false,
    actual_line_id: null,
    actual_vehicle_id: null
  }));
  if(!validRows.length){ App.info("لا توجد صفوف صالحة للاستيراد."); return; }
  const ok = await withMutation("استيراد بصمة", `استيراد ${validRows.length} سجل بصمة`, ()=>sb.from("attendance").insert(validRows));
  if(ok){
    state.fingerprintPreviewRows = [];
    $("fingerprintPreviewTable").innerHTML = "";
    App.info("تم استيراد البصمة بنجاح.");
  }
};

App.createBackup = async function(){
  await createCloudBackup("نسخة يدوية");
  await logAction("إنشاء نسخة احتياطية", "تم إنشاء نسخة يدوية");
  await loadAll();
};

App.downloadBackup = async function(id){
  const row = state.backups.find(x=>x.id===id);
  if(!row) return;
  downloadText(`backup-${row.created_at}.json`, JSON.stringify(row.payload, null, 2), "application/json");
};

App.exportEmployees = function(){
  exportCsv("employees.csv", state.employees.map(e=>({
    employee_no: e.employee_no,
    name: e.name,
    department: getDepartmentName(e.department_id),
    job: getJobName(e.job_id),
    employee_type: getTypeName(e.employee_type_id),
    line: getLineName(e.line_id),
    vehicle: getVehicleName(e.vehicle_id),
    salary: e.salary,
    status: e.status
  })));
};

App.exportAttendance = function(){
  exportCsv("attendance.csv", state.attendance.map(r=>({
    date: r.date,
    employee_no: getEmployee(r.employee_id)?.employee_no || "",
    employee_name: getEmployeeName(r.employee_id),
    status: r.status,
    check_in: r.check_in || "",
    late_minutes: r.late_minutes || 0
  })));
};

App.exportPayroll = function(){
  const rows = buildPayrollRows($("payrollMonth").value || currentMonthPrefix());
  exportCsv("payroll.csv", rows);
};

function bindStaticEvents(){
  document.querySelectorAll(".menu-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>App.showSection(btn.dataset.section, btn));
  });
  $("loginBtn").addEventListener("click", login);
  $("logoutBtn").addEventListener("click", logout);
  $("darkModeBtn").addEventListener("click", App.toggleDarkMode);
  $("notifyBtn").addEventListener("click", App.requestBrowserNotifications);
  $("employeesSearch").addEventListener("input", renderEmployeesTable);
  $("attendanceSearch").addEventListener("input", renderAttendanceTable);
  $("attendanceHistorySearch").addEventListener("input", renderAttendanceHistoryTable);
  $("appModal").addEventListener("click", (e)=>{ if(e.target.id === "appModal") App.closeModal(); });
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") App.closeModal(); });
}

function initPWA(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js").catch(()=>{});
  }
  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault();
    state.deferredInstallPrompt = e;
    $("installBtn").style.display = "inline-block";
    $("installBtn").onclick = async ()=>{
      if(!state.deferredInstallPrompt) return;
      state.deferredInstallPrompt.prompt();
      await state.deferredInstallPrompt.userChoice;
      state.deferredInstallPrompt = null;
      $("installBtn").style.display = "none";
    };
  });
}

async function initApp(){
  App.applyDarkMode();
  bindStaticEvents();
  initPWA();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  $("payrollMonth").value = currentMonthPrefix();

  const restored = await restoreSession();
  if(restored){
    await ensureSeeds();
    await loadAll();
  }
}

window.addEventListener("load", initApp);
