/* =========================================
   إعداد Supabase
========================================= */
const SUPABASE_URL = "https://okyujxqzzrxtmtuimndk.supabase.co";
const SUPABASE_KEY = "ضع_مفتاح_anon_هنا";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================================
   أدوات عامة
========================================= */
function qs(id) {
  return document.getElementById(id);
}

function msg(text) {
  alert(text);
}

function safe(v) {
  return v === null || v === undefined ? "" : v;
}

function money(v) {
  return Number(v || 0).toFixed(2);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fillSelect(id, rows, valueKey = "id", textKey = "name", placeholder = "-- اختر --") {
  const el = qs(id);
  if (!el) return;
  let html = `<option value="">${placeholder}</option>`;
  rows.forEach((row) => {
    html += `<option value="${row[valueKey]}">${safe(row[textKey])}</option>`;
  });
  el.innerHTML = html;
}

function exportTableToCSV(filename, tableId) {
  const table = qs(tableId);
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll("tr");

  rows.forEach((row) => {
    const cols = row.querySelectorAll("th, td");
    let line = [];
    cols.forEach((col) => {
      let text = col.innerText.replace(/"/g, '""');
      line.push(`"${text}"`);
    });
    csv.push(line.join(","));
  });

  const blob = new Blob(["\uFEFF" + csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function badge(text) {
  return `<span class="badge blue">${safe(text)}</span>`;
}

/* =========================================
   الوضع الليلي
========================================= */
function toggleDark() {
  document.body.classList.toggle("dark");
  localStorage.setItem("oyoon_dark", document.body.classList.contains("dark") ? "1" : "0");
}

if (localStorage.getItem("oyoon_dark") === "1") {
  document.body.classList.add("dark");
}

/* =========================================
   الساعة 12 ساعة
========================================= */
function clock() {
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();
  let ampm = "AM";

  if (h >= 12) {
    ampm = "PM";
    h -= 12;
  }

  if (h === 0) h = 12;
  if (m < 10) m = "0" + m;

  const el = qs("clock");
  if (el) {
    el.innerText = h + ":" + m + " " + ampm;
  }
}
setInterval(clock, 1000);
clock();

/* =========================================
   الشعار
========================================= */
function uploadLogo() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      const src = evt.target.result;
      const logo = qs("companyLogo");
      if (logo) logo.src = src;
      localStorage.setItem("oyoon_logo", src);
    };
    reader.readAsDataURL(file);
  };

  input.click();
}

window.addEventListener("load", () => {
  const savedLogo = localStorage.getItem("oyoon_logo");
  if (savedLogo && qs("companyLogo")) {
    qs("companyLogo").src = savedLogo;
  }
});

/* =========================================
   كاش الجداول المرجعية
========================================= */
let departmentsCache = [];
let jobsCache = [];
let branchesCache = [];
let linesCache = [];
let vehiclesCache = [];
let employeesCache = [];
let lineRatesCache = [];
let usersCache = [];

async function loadCaches() {
  const [
    departmentsRes,
    jobsRes,
    branchesRes,
    linesRes,
    vehiclesRes,
    employeesRes,
    lineRatesRes,
    usersRes
  ] = await Promise.all([
    db.from("departments").select("*").order("name"),
    db.from("job_titles").select("*").order("name"),
    db.from("branches").select("*").order("name"),
    db.from("distribution_lines").select("*").order("name"),
    db.from("vehicle_types").select("*").order("name"),
    db.from("employees").select("*").order("name"),
    db.from("line_vehicle_rates").select("*"),
    db.from("users").select("*")
  ]);

  departmentsCache = departmentsRes.data || [];
  jobsCache = jobsRes.data || [];
  branchesCache = branchesRes.data || [];
  linesCache = linesRes.data || [];
  vehiclesCache = vehiclesRes.data || [];
  employeesCache = employeesRes.data || [];
  lineRatesCache = lineRatesRes.data || [];
  usersCache = usersRes.data || [];
}

function getDepartmentName(id) {
  return (departmentsCache.find(x => x.id === id) || {}).name || "";
}

function getJobName(id) {
  return (jobsCache.find(x => x.id === id) || {}).name || "";
}

function getBranchName(id) {
  return (branchesCache.find(x => x.id === id) || {}).name || "";
}

function getLineName(id) {
  return (linesCache.find(x => x.id === id) || {}).name || "";
}

function getVehicleName(id) {
  return (vehiclesCache.find(x => x.id === id) || {}).name || "";
}

function getEmployeeName(id) {
  const row = employeesCache.find(x => x.id === id);
  return row ? (row.name || row.full_name || "") : "";
}

function getRate(lineId, vehicleTypeId) {
  return lineRatesCache.find(r => (r.line_id === lineId) && (r.vehicle_type_id === vehicleTypeId));
}

/* =========================================
   فتح الصفحات
========================================= */
function openPage(page) {
  if (page === "dashboard") return dashboard();
  if (page === "employees") return employees();
  if (page === "departments") return departments();
  if (page === "jobs") return jobs();
  if (page === "branches") return branches();
  if (page === "lines") return lines();
  if (page === "vehicles") return vehicles();
  if (page === "attendance") return attendance();
  if (page === "fingerprint") return fingerprint();
  if (page === "loans") return loans();
  if (page === "payroll") return payroll();
  if (page === "expenses") return expenses();
  if (page === "reports") return reports();
  if (page === "users") return users();
  if (page === "backups") return backups();
  if (page === "settings") return settings();
}

/* =========================================
   لوحة التحكم
========================================= */
async function dashboard() {
  await loadCaches();

  const [attendanceRes, loansRes, expensesRes] = await Promise.all([
    db.from("attendance").select("*"),
    db.from("loans").select("*"),
    db.from("expenses").select("*")
  ]);

  const attendanceRows = attendanceRes.data || [];
  const loansRows = loansRes.data || [];
  const expensesRows = expensesRes.data || [];

  qs("contentArea").innerHTML = `
    <div class="card">
      <h2>لوحة التحكم</h2>
      <p>عدد الموظفين: ${employeesCache.length}</p>
      <p>عدد الأقسام: ${departmentsCache.length}</p>
      <p>عدد الوظائف: ${jobsCache.length}</p>
      <p>عدد الفروع: ${branchesCache.length}</p>
      <p>عدد خطوط التوزيع: ${linesCache.length}</p>
      <p>عدد أنواع السيارات: ${vehiclesCache.length}</p>
      <p>عدد سجلات الحضور: ${attendanceRows.length}</p>
      <p>عدد السلف والديون: ${loansRows.length}</p>
      <p>عدد المصروفات: ${expensesRows.length}</p>
    </div>
  `;
}

/* =========================================
   الأقسام
========================================= */
async function departments() {
  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>الأقسام</h2>
        <button onclick="saveDepartment()">حفظ</button>
      </div>

      <input type="hidden" id="department_id">

      <div class="form-group">
        <label>اسم القسم</label>
        <input id="department_name">
      </div>

      <div id="departmentsTable"></div>
    </div>
  `;

  loadDepartments();
}

async function loadDepartments() {
  const { data, error } = await db.from("departments").select("*").order("name");
  if (error) return msg("خطأ في تحميل الأقسام");

  let html = `
    <table id="departments_table_export">
      <tr>
        <th>اسم القسم</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((row) => {
    html += `
      <tr>
        <td>${safe(row.name)}</td>
        <td><button onclick="editDepartment('${row.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("departmentsTable").innerHTML = html;
}

async function saveDepartment() {
  const id = qs("department_id").value;
  const payload = { name: qs("department_name").value };

  let res;
  if (id) {
    res = await db.from("departments").update(payload).eq("id", id);
  } else {
    res = await db.from("departments").insert(payload);
  }

  if (res.error) return msg("فشل حفظ القسم");
  msg("تم حفظ القسم");
  departments();
}

async function editDepartment(id) {
  await departments();
  const { data } = await db.from("departments").select("*").eq("id", id).single();
  if (!data) return;
  qs("department_id").value = data.id || "";
  qs("department_name").value = data.name || "";
}

/* =========================================
   الوظائف
========================================= */
async function jobs() {
  await loadCaches();

  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>الوظائف</h2>
        <button onclick="saveJob()">حفظ</button>
      </div>

      <input type="hidden" id="job_id">

      <div class="form-group">
        <label>القسم</label>
        <select id="job_department_id"></select>
      </div>

      <div class="form-group">
        <label>اسم الوظيفة</label>
        <input id="job_name">
      </div>

      <div id="jobsTable"></div>
    </div>
  `;

  fillSelect("job_department_id", departmentsCache, "id", "name");
  loadJobs();
}

async function loadJobs() {
  await loadCaches();

  const { data, error } = await db.from("job_titles").select("*").order("name");
  if (error) return msg("خطأ في تحميل الوظائف");

  let html = `
    <table id="jobs_table_export">
      <tr>
        <th>القسم</th>
        <th>الوظيفة</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((row) => {
    html += `
      <tr>
        <td>${getDepartmentName(row.department_id)}</td>
        <td>${safe(row.name)}</td>
        <td><button onclick="editJob('${row.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("jobsTable").innerHTML = html;
}

async function saveJob() {
  const id = qs("job_id").value;
  const payload = {
    department_id: qs("job_department_id").value || null,
    name: qs("job_name").value
  };

  let res;
  if (id) {
    res = await db.from("job_titles").update(payload).eq("id", id);
  } else {
    res = await db.from("job_titles").insert(payload);
  }

  if (res.error) return msg("فشل حفظ الوظيفة");
  msg("تم حفظ الوظيفة");
  jobs();
}

async function editJob(id) {
  await jobs();
  const { data } = await db.from("job_titles").select("*").eq("id", id).single();
  if (!data) return;
  qs("job_id").value = data.id || "";
  qs("job_department_id").value = data.department_id || "";
  qs("job_name").value = data.name || "";
}

/* =========================================
   الفروع
========================================= */
async function branches() {
  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>الفروع</h2>
        <button onclick="saveBranch()">حفظ</button>
      </div>

      <input type="hidden" id="branch_id">

      <div class="form-group">
        <label>اسم الفرع</label>
        <input id="branch_name">
      </div>

      <div id="branchesTable"></div>
    </div>
  `;

  loadBranches();
}

async function loadBranches() {
  const { data, error } = await db.from("branches").select("*").order("name");
  if (error) return msg("خطأ في تحميل الفروع");

  let html = `
    <table id="branches_table_export">
      <tr>
        <th>اسم الفرع</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((row) => {
    html += `
      <tr>
        <td>${safe(row.name)}</td>
        <td><button onclick="editBranch('${row.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("branchesTable").innerHTML = html;
}

async function saveBranch() {
  const id = qs("branch_id").value;
  const payload = { name: qs("branch_name").value };

  let res;
  if (id) {
    res = await db.from("branches").update(payload).eq("id", id);
  } else {
    res = await db.from("branches").insert(payload);
  }

  if (res.error) return msg("فشل حفظ الفرع");
  msg("تم حفظ الفرع");
  branches();
}

async function editBranch(id) {
  await branches();
  const { data } = await db.from("branches").select("*").eq("id", id).single();
  if (!data) return;
  qs("branch_id").value = data.id || "";
  qs("branch_name").value = data.name || "";
}

/* =========================================
   خطوط التوزيع
========================================= */
async function lines() {
  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>خطوط التوزيع</h2>
        <button onclick="saveLine()">حفظ</button>
      </div>

      <input type="hidden" id="line_id">

      <div class="form-group">
        <label>اسم الخط</label>
        <input id="line_name">
      </div>

      <div id="linesTable"></div>
    </div>
  `;

  loadLines();
}

async function loadLines() {
  const { data, error } = await db.from("distribution_lines").select("*").order("name");
  if (error) return msg("خطأ في تحميل الخطوط");

  let html = `
    <table id="lines_table_export">
      <tr>
        <th>اسم الخط</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((row) => {
    html += `
      <tr>
        <td>${safe(row.name)}</td>
        <td><button onclick="editLine('${row.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("linesTable").innerHTML = html;
}

async function saveLine() {
  const id = qs("line_id").value;
  const payload = { name: qs("line_name").value };

  let res;
  if (id) {
    res = await db.from("distribution_lines").update(payload).eq("id", id);
  } else {
    res = await db.from("distribution_lines").insert(payload);
  }

  if (res.error) return msg("فشل حفظ الخط");
  msg("تم حفظ الخط");
  lines();
}

async function editLine(id) {
  await lines();
  const { data } = await db.from("distribution_lines").select("*").eq("id", id).single();
  if (!data) return;
  qs("line_id").value = data.id || "";
  qs("line_name").value = data.name || "";
}

/* =========================================
   أنواع السيارات
========================================= */
async function vehicles() {
  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>أنواع السيارات</h2>
        <button onclick="saveVehicle()">حفظ</button>
      </div>

      <input type="hidden" id="vehicle_id">

      <div class="form-group">
        <label>اسم النوع</label>
        <input id="vehicle_name">
      </div>

      <div id="vehiclesTable"></div>
    </div>
  `;

  loadVehicles();
}

async function loadVehicles() {
  const { data, error } = await db.from("vehicle_types").select("*").order("name");
  if (error) return msg("خطأ في تحميل أنواع السيارات");

  let html = `
    <table id="vehicles_table_export">
      <tr>
        <th>النوع</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((row) => {
    html += `
      <tr>
        <td>${safe(row.name)}</td>
        <td><button onclick="editVehicle('${row.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("vehiclesTable").innerHTML = html;
}

async function saveVehicle() {
  const id = qs("vehicle_id").value;
  const payload = { name: qs("vehicle_name").value };

  let res;
  if (id) {
    res = await db.from("vehicle_types").update(payload).eq("id", id);
  } else {
    res = await db.from("vehicle_types").insert(payload);
  }

  if (res.error) return msg("فشل حفظ النوع");
  msg("تم حفظ النوع");
  vehicles();
}

async function editVehicle(id) {
  await vehicles();
  const { data } = await db.from("vehicle_types").select("*").eq("id", id).single();
  if (!data) return;
  qs("vehicle_id").value = data.id || "";
  qs("vehicle_name").value = data.name || "";
}

/* =========================================
   تسعير الخطوط
========================================= */
async function lineRatesPage() {
  await loadCaches();

  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>تسعير الخطوط</h2>
        <button onclick="saveLineRate()">حفظ</button>
      </div>

      <input type="hidden" id="rate_id">

      <div class="row">
        <div class="col">
          <label>الخط</label>
          <select id="rate_line_id"></select>
        </div>
        <div class="col">
          <label>نوع السيارة</label>
          <select id="rate_vehicle_type_id"></select>
        </div>
        <div class="col">
          <label>القيمة الشهرية</label>
          <input type="number" id="rate_monthly_rate">
        </div>
      </div>

      <div id="lineRatesTable"></div>
    </div>
  `;

  fillSelect("rate_line_id", linesCache, "id", "name");
  fillSelect("rate_vehicle_type_id", vehiclesCache, "id", "name");
  loadLineRatesPage();
}

async function loadLineRatesPage() {
  await loadCaches();

  const { data, error } = await db.from("line_vehicle_rates").select("*");
  if (error) return msg("خطأ في تحميل التسعير");

  let html = `
    <table id="line_rates_export">
      <tr>
        <th>الخط</th>
        <th>السيارة</th>
        <th>القيمة</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((row) => {
    html += `
      <tr>
        <td>${getLineName(row.line_id)}</td>
        <td>${getVehicleName(row.vehicle_type_id)}</td>
        <td>${money(row.monthly_rate)}</td>
        <td><button onclick="editLineRate('${row.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("lineRatesTable").innerHTML = html;
}

async function saveLineRate() {
  const id = qs("rate_id").value;
  const payload = {
    line_id: qs("rate_line_id").value || null,
    vehicle_type_id: qs("rate_vehicle_type_id").value || null,
    monthly_rate: Number(qs("rate_monthly_rate").value || 0)
  };

  let res;
  if (id) {
    res = await db.from("line_vehicle_rates").update(payload).eq("id", id);
  } else {
    res = await db.from("line_vehicle_rates").insert(payload);
  }

  if (res.error) return msg("فشل حفظ التسعير");
  msg("تم حفظ التسعير");
  lineRatesPage();
}

async function editLineRate(id) {
  await lineRatesPage();

  const { data } = await db.from("line_vehicle_rates").select("*").eq("id", id).single();
  if (!data) return;

  qs("rate_id").value = data.id || "";
  qs("rate_line_id").value = data.line_id || "";
  qs("rate_vehicle_type_id").value = data.vehicle_type_id || "";
  qs("rate_monthly_rate").value = data.monthly_rate || 0;
}

/* =========================================
   الموظفون
========================================= */
async function employees() {
  await loadCaches();

  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>الموظفون</h2>
        <button onclick="saveEmployee()">حفظ الموظف</button>
      </div>

      <input type="hidden" id="employee_id">

      <div class="row">
        <div class="col">
          <label>الرقم الوظيفي</label>
          <input id="employee_no">
        </div>
        <div class="col">
          <label>اسم الموظف</label>
          <input id="employee_name">
        </div>
        <div class="col">
          <label>القسم</label>
          <select id="employee_department_id"></select>
        </div>
        <div class="col">
          <label>الوظيفة</label>
          <select id="employee_job_title_id"></select>
        </div>
      </div>

      <div class="row">
        <div class="col">
          <label>الفرع</label>
          <select id="employee_branch_id"></select>
        </div>
        <div class="col">
          <label>الراتب الأساسي</label>
          <input type="number" id="employee_salary">
        </div>
        <div class="col">
          <label>نوع الموظف</label>
          <select id="employee_type" onchange="toggleDriverBox()">
            <option value="عادي">عادي</option>
            <option value="سائق">سائق</option>
            <option value="سائق احتياط">سائق احتياط</option>
          </select>
        </div>
        <div class="col">
          <label>الحالة</label>
          <select id="employee_status">
            <option value="نشط">نشط</option>
            <option value="موقوف">موقوف</option>
          </select>
        </div>
      </div>

      <div class="row" id="driverBox" style="display:none">
        <div class="col">
          <label>خط التوزيع</label>
          <select id="employee_distribution_line_id"></select>
        </div>
        <div class="col">
          <label>نوع السيارة</label>
          <select id="employee_vehicle_type_id"></select>
        </div>
        <div class="col">
          <label>مرتب الاحتياط</label>
          <input type="number" id="employee_reserve_salary">
        </div>
      </div>

      <div id="employeesTable"></div>
    </div>
  `;

  fillSelect("employee_department_id", departmentsCache, "id", "name");
  fillSelect("employee_job_title_id", jobsCache, "id", "name");
  fillSelect("employee_branch_id", branchesCache, "id", "name");
  fillSelect("employee_distribution_line_id", linesCache, "id", "name");
  fillSelect("employee_vehicle_type_id", vehiclesCache, "id", "name");

  loadEmployees();
}

function toggleDriverBox() {
  const type = qs("employee_type").value;
  qs("driverBox").style.display = (type === "سائق" || type === "سائق احتياط") ? "flex" : "none";
}

async function loadEmployees() {
  await loadCaches();

  const { data, error } = await db.from("employees").select("*").order("created_at", { ascending: false });
  if (error) return msg("خطأ في تحميل الموظفين");

  let html = `
    <table id="employees_export">
      <tr>
        <th>الرقم</th>
        <th>الاسم</th>
        <th>القسم</th>
        <th>الوظيفة</th>
        <th>الفرع</th>
        <th>النوع</th>
        <th>الخط</th>
        <th>السيارة</th>
        <th>الراتب</th>
        <th>الحالة</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((emp) => {
    html += `
      <tr>
        <td>${safe(emp.employee_no)}</td>
        <td>${safe(emp.name || emp.full_name)}</td>
        <td>${getDepartmentName(emp.department_id)}</td>
        <td>${getJobName(emp.job_title_id)}</td>
        <td>${getBranchName(emp.branch_id)}</td>
        <td>${safe(emp.employee_type)}</td>
        <td>${getLineName(emp.distribution_line_id)}</td>
        <td>${getVehicleName(emp.vehicle_type_id)}</td>
        <td>${money(emp.salary || emp.basic_salary)}</td>
        <td>${safe(emp.status)}</td>
        <td><button onclick="editEmployee('${emp.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("employeesTable").innerHTML = html;
}

async function saveEmployee() {
  const id = qs("employee_id").value;

  const payload = {
    employee_no: qs("employee_no").value,
    name: qs("employee_name").value,
    department_id: qs("employee_department_id").value || null,
    job_title_id: qs("employee_job_title_id").value || null,
    branch_id: qs("employee_branch_id").value || null,
    salary: Number(qs("employee_salary").value || 0),
    basic_salary: Number(qs("employee_salary").value || 0),
    employee_type: qs("employee_type").value,
    distribution_line_id: qs("employee_distribution_line_id").value || null,
    vehicle_type_id: qs("employee_vehicle_type_id").value || null,
    reserve_driver_salary: Number(qs("employee_reserve_salary").value || 0),
    status: qs("employee_status").value
  };

  let res;
  if (id) {
    res = await db.from("employees").update(payload).eq("id", id);
  } else {
    res = await db.from("employees").insert(payload);
  }

  if (res.error) return msg("فشل حفظ الموظف");
  msg("تم حفظ الموظف");
  employees();
}

async function editEmployee(id) {
  await employees();

  const { data } = await db.from("employees").select("*").eq("id", id).single();
  if (!data) return;

  qs("employee_id").value = data.id || "";
  qs("employee_no").value = data.employee_no || "";
  qs("employee_name").value = data.name || data.full_name || "";
  qs("employee_department_id").value = data.department_id || "";
  qs("employee_job_title_id").value = data.job_title_id || "";
  qs("employee_branch_id").value = data.branch_id || "";
  qs("employee_salary").value = data.salary || data.basic_salary || 0;
  qs("employee_type").value = data.employee_type || "عادي";
  qs("employee_distribution_line_id").value = data.distribution_line_id || "";
  qs("employee_vehicle_type_id").value = data.vehicle_type_id || "";
  qs("employee_reserve_salary").value = data.reserve_driver_salary || 0;
  qs("employee_status").value = data.status || "نشط";

  toggleDriverBox();
}

/* =========================================
   الحضور
========================================= */
async function attendance() {
  await loadCaches();

  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>الحضور</h2>
        <button onclick="saveAttendance()">حفظ الحضور</button>
      </div>

      <input type="hidden" id="attendance_id">

      <div class="row">
        <div class="col">
          <label>الموظف</label>
          <select id="attendance_employee_id"></select>
        </div>
        <div class="col">
          <label>التاريخ</label>
          <input type="date" id="attendance_date">
        </div>
        <div class="col">
          <label>الحالة</label>
          <select id="attendance_status">
            <option value="حضور">حضور</option>
            <option value="غياب">غياب</option>
            <option value="تأخير">تأخير</option>
            <option value="إجازة مدفوعة">إجازة مدفوعة</option>
            <option value="إجازة غير مدفوعة">إجازة غير مدفوعة</option>
            <option value="مأمورية">مأمورية</option>
            <option value="نصف يوم">نصف يوم</option>
          </select>
        </div>
        <div class="col">
          <label>وقت الدخول</label>
          <input type="time" id="attendance_check_in_time">
        </div>
      </div>

      <div class="row">
        <div class="col">
          <label>دقائق التأخير</label>
          <input type="number" id="attendance_late_minutes" value="0">
        </div>
        <div class="col">
          <label>ملاحظات</label>
          <input id="attendance_notes">
        </div>
      </div>

      <div id="attendanceTable"></div>
    </div>
  `;

  fillSelect("attendance_employee_id", employeesCache, "id", "name");
  qs("attendance_date").value = todayISO();

  loadAttendance();
}

async function loadAttendance() {
  await loadCaches();

  const { data, error } = await db.from("attendance").select("*").order("attendance_date", { ascending: false });
  if (error) return msg("خطأ في تحميل الحضور");

  let html = `
    <table id="attendance_export">
      <tr>
        <th>الموظف</th>
        <th>التاريخ</th>
        <th>الحالة</th>
        <th>وقت الدخول</th>
        <th>التأخير</th>
        <th>ملاحظات</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((row) => {
    html += `
      <tr>
        <td>${getEmployeeName(row.employee_id)}</td>
        <td>${safe(row.attendance_date)}</td>
        <td>${safe(row.status)}</td>
        <td>${safe(row.check_in_time)}</td>
        <td>${safe(row.late_minutes)}</td>
        <td>${safe(row.notes)}</td>
        <td><button onclick="editAttendance('${row.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("attendanceTable").innerHTML = html;
}

async function saveAttendance() {
  const id = qs("attendance_id").value;

  const payload = {
    employee_id: qs("attendance_employee_id").value || null,
    attendance_date: qs("attendance_date").value,
    status: qs("attendance_status").value,
    check_in_time: qs("attendance_check_in_time").value || null,
    late_minutes: Number(qs("attendance_late_minutes").value || 0),
    notes: qs("attendance_notes").value
  };

  let res;
  if (id) {
    res = await db.from("attendance").update(payload).eq("id", id);
  } else {
    res = await db.from("attendance").insert(payload);
  }

  if (res.error) return msg("فشل حفظ الحضور");
  msg("تم حفظ الحضور");
  attendance();
}

async function editAttendance(id) {
  await attendance();
  const { data } = await db.from("attendance").select("*").eq("id", id).single();
  if (!data) return;

  qs("attendance_id").value = data.id || "";
  qs("attendance_employee_id").value = data.employee_id || "";
  qs("attendance_date").value = data.attendance_date || "";
  qs("attendance_status").value = data.status || "حضور";
  qs("attendance_check_in_time").value = data.check_in_time || "";
  qs("attendance_late_minutes").value = data.late_minutes || 0;
  qs("attendance_notes").value = data.notes || "";
}

/* =========================================
   البصمة
========================================= */
function fingerprint() {
  qs("contentArea").innerHTML = `
    <div class="card">
      <h2>استيراد البصمة</h2>

      <div class="form-group">
        <label>اختر ملف Excel</label>
        <input type="file" id="excelFile" accept=".xlsx,.xls">
      </div>

      <button onclick="importFingerprint()">استيراد</button>

      <div id="fingerprintResult" style="margin-top:20px"></div>
    </div>
  `;
}

async function importFingerprint() {
  const fileInput = qs("excelFile");
  const file = fileInput.files[0];

  if (!file) {
    msg("اختر ملف Excel");
    return;
  }

  await loadCaches();

  const reader = new FileReader();
  reader.onload = async function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    let inserted = 0;
    let notFound = [];

    for (const row of json) {
      const employeeNo =
        row.employee_no ||
        row.employeeNo ||
        row["الرقم الوظيفي"] ||
        row["رقم الموظف"] ||
        row["الرقم"] ||
        "";

      const dateValue =
        row.date ||
        row["التاريخ"] ||
        row.attendance_date ||
        "";

      const inTime =
        row.check_in ||
        row["وقت الدخول"] ||
        row.time ||
        "";

      if (!employeeNo || !dateValue) continue;

      const emp = employeesCache.find(e => String(e.employee_no) === String(employeeNo));

      if (!emp) {
        notFound.push(employeeNo);
        continue;
      }

      const exists = await db
        .from("attendance")
        .select("*")
        .eq("employee_id", emp.id)
        .eq("attendance_date", dateValue)
        .maybeSingle();

      if (!exists.data) {
        await db.from("attendance").insert({
          employee_id: emp.id,
          attendance_date: dateValue,
          status: "حضور",
          check_in_time: inTime || null,
          late_minutes: 0,
          notes: "مستورد من البصمة"
        });
        inserted++;
      }
    }

    qs("fingerprintResult").innerHTML = `
      <div class="card">
        <p>تم استيراد ${inserted} سجل</p>
        <p>الأرقام غير الموجودة: ${notFound.join(", ") || "لا يوجد"}</p>
      </div>
    `;
  };

  reader.readAsArrayBuffer(file);
}

/* =========================================
   السلف والديون
========================================= */
async function loans() {
  await loadCaches();

  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>السلف والديون</h2>
        <button onclick="saveLoan()">حفظ</button>
      </div>

      <input type="hidden" id="loan_id">

      <div class="row">
        <div class="col">
          <label>الموظف</label>
          <select id="loan_employee_id"></select>
        </div>
        <div class="col">
          <label>النوع</label>
          <select id="loan_type">
            <option value="سلفة">سلفة</option>
            <option value="مديونية">مديونية</option>
          </select>
        </div>
        <div class="col">
          <label>المبلغ</label>
          <input type="number" id="loan_amount" oninput="previewLoanInstallment()">
        </div>
        <div class="col">
          <label>عدد الشهور</label>
          <input type="number" id="loan_months_count" oninput="previewLoanInstallment()">
        </div>
      </div>

      <div class="row">
        <div class="col">
          <label>بداية الخصم</label>
          <input type="month" id="loan_start_month">
        </div>
        <div class="col">
          <label>السبب</label>
          <input id="loan_reason">
        </div>
        <div class="col">
          <label>القسط الأول</label>
          <input id="loan_installment_amount" readonly>
        </div>
      </div>

      <div id="loanTable"></div>
    </div>
  `;

  fillSelect("loan_employee_id", employeesCache, "id", "name");
  loadLoans();
}

function previewLoanInstallment() {
  const amount = Math.floor(Number(qs("loan_amount").value || 0));
  const months = Math.max(1, Number(qs("loan_months_count").value || 1));
  const base = Math.floor(amount / months);
  const remainder = amount - (base * months);
  qs("loan_installment_amount").value = base + remainder;
}

async function loadLoans() {
  await loadCaches();

  const { data, error } = await db.from("loans").select("*").order("created_at", { ascending: false });
  if (error) return msg("خطأ في تحميل السلف");

  let html = `
    <table id="loans_export">
      <tr>
        <th>الموظف</th>
        <th>النوع</th>
        <th>المبلغ</th>
        <th>الشهور</th>
        <th>القسط</th>
        <th>المتبقي</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((row) => {
    html += `
      <tr>
        <td>${getEmployeeName(row.employee_id)}</td>
        <td>${safe(row.type)}</td>
        <td>${money(row.amount)}</td>
        <td>${safe(row.months_count)}</td>
        <td>${money(row.installment_amount)}</td>
        <td>${money(row.remaining_amount)}</td>
        <td><button onclick="editLoan('${row.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("loanTable").innerHTML = html;
}

async function saveLoan() {
  const id = qs("loan_id").value;
  const amount = Math.floor(Number(qs("loan_amount").value || 0));
  const months = Math.max(1, Number(qs("loan_months_count").value || 1));
  const base = Math.floor(amount / months);
  const remainder = amount - (base * months);
  const firstInstallment = base + remainder;

  const payload = {
    employee_id: qs("loan_employee_id").value || null,
    type: qs("loan_type").value,
    amount: amount,
    months_count: months,
    installment_amount: firstInstallment,
    remaining_amount: amount,
    start_month: qs("loan_start_month").value || null,
    reason: qs("loan_reason").value || ""
  };

  let res;
  if (id) {
    res = await db.from("loans").update(payload).eq("id", id);
  } else {
    res = await db.from("loans").insert(payload);
  }

  if (res.error) return msg("فشل حفظ السلفة أو الدين");
  msg("تم حفظ السلفة أو الدين");
  loans();
}

async function editLoan(id) {
  await loans();
  const { data } = await db.from("loans").select("*").eq("id", id).single();
  if (!data) return;

  qs("loan_id").value = data.id || "";
  qs("loan_employee_id").value = data.employee_id || "";
  qs("loan_type").value = data.type || "سلفة";
  qs("loan_amount").value = data.amount || 0;
  qs("loan_months_count").value = data.months_count || 1;
  qs("loan_start_month").value = data.start_month || "";
  qs("loan_reason").value = data.reason || "";
  qs("loan_installment_amount").value = data.installment_amount || 0;
}

/* =========================================
   الرواتب
========================================= */
async function payroll() {
  await loadCaches();

  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>الرواتب</h2>
        <button onclick="generatePayroll()">إنشاء رواتب الشهر</button>
      </div>

      <div class="form-group">
        <label>الشهر</label>
        <input type="month" id="payroll_month" value="${currentMonthISO()}">
      </div>

      <div id="payrollTable"></div>
    </div>
  `;
}

function countWorkDays(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 5) {
      workDays++;
    }
  }

  return workDays;
}

async function generatePayroll() {
  await loadCaches();

  const monthValue = qs("payroll_month").value;
  if (!monthValue) return msg("اختر الشهر");

  const [year, month] = monthValue.split("-").map(Number);
  const workDays = countWorkDays(year, month);

  const { data: attendanceRows } = await db.from("attendance").select("*");
  const { data: loanRows } = await db.from("loans").select("*");

  let html = `
    <table id="payroll_export">
      <tr>
        <th>الموظف</th>
        <th>أيام العمل</th>
        <th>الحضور</th>
        <th>الغياب</th>
        <th>الراتب المستحق</th>
        <th>خصم السلف</th>
        <th>الصافي</th>
      </tr>
  `;

  for (const emp of employeesCache) {
    const empAttendance = (attendanceRows || []).filter(a =>
      a.employee_id === emp.id &&
      String(a.attendance_date || "").startsWith(monthValue)
    );

    const presentDays = empAttendance.filter(a =>
      ["حضور", "إجازة مدفوعة", "مأمورية"].includes(a.status)
    ).length;

    const absentDays = empAttendance.filter(a =>
      ["غياب", "إجازة غير مدفوعة"].includes(a.status)
    ).length;

    let deservedSalary = 0;

    if (emp.employee_type === "سائق") {
      const rateRow = getRate(emp.distribution_line_id, emp.vehicle_type_id);
      const monthlyRate = rateRow ? Number(rateRow.monthly_rate || 0) : 0;
      deservedSalary = (monthlyRate / workDays) * presentDays;
    } else if (emp.employee_type === "سائق احتياط") {
      deservedSalary = (Number(emp.reserve_driver_salary || 0) / workDays) * presentDays;
    } else {
      const salary = Number(emp.salary || emp.basic_salary || 0);
      deservedSalary = (salary / workDays) * presentDays;
    }

    const empLoans = (loanRows || []).filter(l => l.employee_id === emp.id);
    const loansDeduction = empLoans.reduce((sum, l) => sum + Number(l.installment_amount || 0), 0);

    let net = deservedSalary - loansDeduction;
    if (net < 0) net = 0;

    html += `
      <tr>
        <td>${safe(emp.name || emp.full_name)}</td>
        <td>${workDays}</td>
        <td>${presentDays}</td>
        <td>${absentDays}</td>
        <td>${money(deservedSalary)}</td>
        <td>${money(loansDeduction)}</td>
        <td>${money(net)}</td>
      </tr>
    `;
  }

  html += `</table>`;
  qs("payrollTable").innerHTML = html;
}

/* =========================================
   المصروفات
========================================= */
async function expenses() {
  qs("contentArea").innerHTML = `
    <div class="card">
      <div class="toolbar">
        <h2>المصروفات</h2>
        <button onclick="saveExpense()">حفظ</button>
      </div>

      <input type="hidden" id="expense_id">

      <div class="row">
        <div class="col">
          <label>البند</label>
          <input id="expense_title">
        </div>
        <div class="col">
          <label>المبلغ</label>
          <input type="number" id="expense_amount">
        </div>
        <div class="col">
          <label>التاريخ</label>
          <input type="date" id="expense_date" value="${todayISO()}">
        </div>
        <div class="col">
          <label>ملاحظات</label>
          <input id="expense_notes">
        </div>
      </div>

      <div id="expensesTable"></div>
    </div>
  `;

  loadExpenses();
}

async function loadExpenses() {
  const { data, error } = await db.from("expenses").select("*").order("expense_date", { ascending: false });
  if (error) return msg("خطأ في تحميل المصروفات");

  let html = `
    <table id="expenses_export">
      <tr>
        <th>البند</th>
        <th>المبلغ</th>
        <th>التاريخ</th>
        <th>ملاحظات</th>
        <th>إجراءات</th>
      </tr>
  `;

  data.forEach((row) => {
    html += `
      <tr>
        <td>${safe(row.title || row.expense_title)}</td>
        <td>${money(row.amount)}</td>
        <td>${safe(row.expense_date || row.date)}</td>
        <td>${safe(row.notes)}</td>
        <td><button onclick="editExpense('${row.id}')">تعديل</button></td>
      </tr>
    `;
  });

  html += `</table>`;
  qs("expensesTable").innerHTML = html;
}

async function saveExpense() {
  const id = qs("expense_id").value;

  const payload = {
    title: qs("expense_title").value,
    amount: Number(qs("expense_amount").value || 0),
    expense_date: qs("expense_date").value,
    notes: qs("expense_notes").value
  };

  let res;
  if (id) {
    res = await db.from("expenses").update(payload).eq("id", id);
  } else {
    res = await db.from("expenses").insert(payload);
  }

  if (res.error) return msg("فشل حفظ المصروف");
  msg("تم حفظ المصروف");
  expenses();
}

async function editExpense(id) {
  await expenses();
  const { data } = await db.from("expenses").select("*").eq("id", id).single();
  if (!data) return;

  qs("expense_id").value = data.id || "";
  qs("expense_title").value = data.title || data.expense_title || "";
  qs("expense_amount").value = data.amount || 0;
  qs("expense_date").value = data.expense_date || data.date || "";
  qs("expense_notes").value = data.notes || "";
}

/* =========================================
   التقارير
========================================= */
function reports() {
  qs("contentArea").innerHTML = `
    <div class="card">
      <h2>التقارير</h2>
      <div class="toolbar">
        <button onclick="exportTableToCSV('employees.csv','employees_export')">تصدير الموظفين CSV</button>
        <button onclick="exportTableToCSV('attendance.csv','attendance_export')">تصدير الحضور CSV</button>
        <button onclick="exportTableToCSV('loans.csv','loans_export')">تصدير السلف CSV</button>
        <button onclick="exportTableToCSV('payroll.csv','payroll_export')">تصدير الرواتب CSV</button>
        <button onclick="exportTableToCSV('expenses.csv','expenses_export')">تصدير المصروفات CSV</button>
      </div>
      <p>افتح الصفحة المطلوبة أولًا حتى يتم تجهيز جدول التصدير.</p>
    </div>
  `;
}

/* =========================================
   المستخدمون
========================================= */
async function users() {
  const { data, error } = await db.from("users").select("*");
  if (error) {
    qs("contentArea").innerHTML = `<div class="card"><h2>المستخدمون</h2><p>خطأ في تحميل المستخدمين</p></div>`;
    return;
  }

  let html = `
    <div class="card">
      <h2>المستخدمون</h2>
      <table id="users_export">
        <tr>
          <th>اسم المستخدم</th>
          <th>الحالة</th>
        </tr>
  `;

  data.forEach((u) => {
    html += `
      <tr>
        <td>${safe(u.username)}</td>
        <td>${safe(u.status)}</td>
      </tr>
    `;
  });

  html += `</table></div>`;
  qs("contentArea").innerHTML = html;
}

/* =========================================
   النسخ الاحتياطية
========================================= */
async function backups() {
  const { data, error } = await db.from("backups").select("*").order("created_at", { ascending: false });

  if (error) {
    qs("contentArea").innerHTML = `<div class="card"><h2>النسخ الاحتياطية</h2><p>خطأ في تحميل النسخ</p></div>`;
    return;
  }

  let totalSize = 0;
  (data || []).forEach((b) => {
    totalSize += Number(b.file_size_bytes || 0);
  });

  let html = `
    <div class="card">
      <h2>النسخ الاحتياطية</h2>
      <p>عدد النسخ: ${(data || []).length}</p>
      <p>إجمالي الحجم: ${totalSize} bytes</p>

      <table id="backups_export">
        <tr>
          <th>الملف</th>
          <th>النوع</th>
          <th>الحجم</th>
          <th>التاريخ</th>
        </tr>
  `;

  (data || []).forEach((b) => {
    html += `
      <tr>
        <td>${safe(b.file_name)}</td>
        <td>${safe(b.file_type)}</td>
        <td>${safe(b.file_size_bytes)}</td>
        <td>${safe(b.created_at)}</td>
      </tr>
    `;
  });

  html += `</table></div>`;
  qs("contentArea").innerHTML = html;
}

/* =========================================
   الإعدادات
========================================= */
async function settings() {
  qs("contentArea").innerHTML = `
    <div class="card">
      <h2>الإعدادات</h2>
      <button onclick="uploadLogo()">رفع شعار الشركة</button>
      <button onclick="toggleDark()">الوضع الليلي</button>
    </div>
  `;
}

/* =========================================
   البداية
========================================= */
window.addEventListener("load", async () => {
  await loadCaches();
  dashboard();
});
