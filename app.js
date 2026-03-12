/* =========================================================
   إعداد الاتصال بقاعدة البيانات Supabase
========================================================= */

const SUPABASE_URL = "https://okyujxqzzrxtmtuimndk.supabase.co"
const SUPABASE_KEY = "ضع_مفتاح_anon_هنا"

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)


/* =========================================================
   الساعة 12 ساعة
========================================================= */

function clock(){

  const now = new Date()

  let h = now.getHours()
  let m = now.getMinutes()

  let ampm = "AM"

  if(h >= 12){
    ampm = "PM"
    h -= 12
  }

  if(h === 0){
    h = 12
  }

  if(m < 10){
    m = "0" + m
  }

  const el = document.getElementById("clock")
  if(el){
    el.innerText = h + ":" + m + " " + ampm
  }

}

setInterval(clock,1000)


/* =========================================================
   الوضع الليلي
========================================================= */

function toggleDark(){
  document.body.classList.toggle("dark")
}


/* =========================================================
   فتح الصفحات
========================================================= */

function openPage(page){

  if(page === "dashboard") dashboard()
  if(page === "employees") employees()
  if(page === "departments") departments()
  if(page === "jobs") jobs()
  if(page === "branches") branches()
  if(page === "lines") lines()
  if(page === "vehicles") vehicles()
  if(page === "attendance") attendance()
  if(page === "fingerprint") fingerprint()
  if(page === "loans") loans()
  if(page === "payroll") payroll()
  if(page === "expenses") expenses()
  if(page === "reports") reports()
  if(page === "users") users()
  if(page === "backups") backups()
  if(page === "settings") settings()

}


/* =========================================================
   لوحة التحكم
========================================================= */

async function dashboard(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
    <h2>لوحة التحكم</h2>
    <div id="stats">جاري التحميل...</div>
  </div>
  `

  const {data} = await supabaseClient
  .from("employees")
  .select("*")

  const count = data ? data.length : 0

  document.getElementById("stats").innerHTML =
  `عدد الموظفين: ${count}`

}


/* =========================================================
   الموظفون
========================================================= */

async function employees(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">

  <div class="toolbar">
    <h2>الموظفون</h2>
    <button onclick="addEmployee()">إضافة موظف</button>
  </div>

  <div id="employeeTable"></div>

  </div>
  `

  loadEmployees()

}


async function loadEmployees(){

  const {data,error} = await supabaseClient
  .from("employees")
  .select("*")

  if(error){
    alert("خطأ في تحميل الموظفين")
    return
  }

  let html = `
  <table>

  <tr>
    <th>الرقم الوظيفي</th>
    <th>الاسم</th>
    <th>القسم</th>
    <th>الراتب</th>
  </tr>
  `

  data.forEach(emp=>{

    html += `
    <tr>
      <td>${emp.employee_no || ""}</td>
      <td>${emp.name || ""}</td>
      <td>${emp.department_id || ""}</td>
      <td>${emp.salary || ""}</td>
    </tr>
    `

  })

  html += `</table>`

  document.getElementById("employeeTable").innerHTML = html

}


async function addEmployee(){

  const name = prompt("اسم الموظف")

  if(!name) return

  await supabaseClient
  .from("employees")
  .insert({
    name:name
  })

  loadEmployees()

}


/* =========================================================
   الأقسام
========================================================= */

function departments(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>الأقسام</h2>
  <p>إدارة الأقسام ستكون هنا</p>
  </div>
  `

}


/* =========================================================
   الوظائف
========================================================= */

function jobs(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>الوظائف</h2>
  </div>
  `

}


/* =========================================================
   الفروع
========================================================= */

function branches(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>الفروع</h2>
  </div>
  `

}


/* =========================================================
   خطوط التوزيع
========================================================= */

function lines(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>خطوط التوزيع</h2>
  </div>
  `

}


/* =========================================================
   أنواع السيارات
========================================================= */

function vehicles(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>أنواع السيارات</h2>
  </div>
  `

}


/* =========================================================
   الحضور
========================================================= */

function attendance(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>الحضور</h2>
  </div>
  `

}


/* =========================================================
   البصمة (استيراد Excel)
========================================================= */

function fingerprint(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">

  <h2>استيراد البصمة</h2>

  <input type="file" id="excelFile">

  <button onclick="importFingerprint()">استيراد</button>

  </div>
  `

}


function importFingerprint(){

  const fileInput = document.getElementById("excelFile")

  const file = fileInput.files[0]

  if(!file){
    alert("اختر ملف Excel")
    return
  }

  const reader = new FileReader()

  reader.onload = function(e){

    const data = new Uint8Array(e.target.result)

    const workbook = XLSX.read(data,{type:'array'})

    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    const json = XLSX.utils.sheet_to_json(sheet)

    console.log(json)

    alert("تم قراءة الملف")

  }

  reader.readAsArrayBuffer(file)

}


/* =========================================================
   السلف
========================================================= */

function loans(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>السلف والديون</h2>
  </div>
  `

}


/* =========================================================
   الرواتب
========================================================= */

function payroll(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>الرواتب</h2>
  <button onclick="calculatePayroll()">حساب الرواتب</button>
  </div>
  `

}


function calculatePayroll(){

  alert("سيتم حساب الرواتب")

}


/* =========================================================
   المصروفات
========================================================= */

function expenses(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>المصروفات</h2>
  </div>
  `

}


/* =========================================================
   التقارير
========================================================= */

function reports(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>التقارير</h2>
  </div>
  `

}


/* =========================================================
   المستخدمون
========================================================= */

function users(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>المستخدمون</h2>
  </div>
  `

}


/* =========================================================
   النسخ الاحتياطي
========================================================= */

function backups(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">
  <h2>النسخ الاحتياطية</h2>
  </div>
  `

}


/* =========================================================
   الإعدادات
========================================================= */

function settings(){

  document.getElementById("contentArea").innerHTML = `
  <div class="card">

  <h2>الإعدادات</h2>

  <button onclick="uploadLogo()">رفع شعار الشركة</button>

  </div>
  `

}


function uploadLogo(){

  const input = document.createElement("input")

  input.type = "file"

  input.onchange = e => {

    const file = e.target.files[0]

    const reader = new FileReader()

    reader.onload = function(evt){

      document.getElementById("companyLogo").src = evt.target.result

    }

    reader.readAsDataURL(file)

  }

  input.click()

}
