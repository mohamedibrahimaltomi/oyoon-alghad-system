
const Reports = {
  employeeName(id) {
    return AppState.employees.find((x) => x.id === id)?.name || "-";
  },

  departmentName(id) {
    return AppState.departments.find((x) => x.id === id)?.name || "-";
  },

  employeeTypeName(id) {
    return AppState.employeeTypes.find((x) => x.id === id)?.name || "-";
  },

  lineName(id) {
    return AppState.lines.find((x) => x.id === id)?.name || "-";
  },

  vehicleName(id) {
    return AppState.vehicles.find((x) => x.id === id)?.name || "-";
  },

  async addLog(action, details = "") {
    try {
      await sbInsert(TABLES.logs, [{
        action,
        username: AppState.currentUser?.username || "system",
        details,
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.error("log error", err);
    }
  },

  renderReportsFilters() {
    const dep = $("reportDepartmentFilter");
    const typ = $("reportTypeFilter");
    const line = $("reportLineFilter");

    if (dep) {
      dep.innerHTML =
        `<option value="">كل الأقسام</option>` +
        AppState.departments.map((x) => `<option value="${safeText(x.id)}">${safeText(x.name)}</option>`).join("");
    }

    if (typ) {
      typ.innerHTML =
        `<option value="">كل أنواع الموظفين</option>` +
        AppState.employeeTypes.map((x) => `<option value="${safeText(x.id)}">${safeText(x.name)}</option>`).join("");
    }

    if (line) {
      line.innerHTML =
        `<option value="">كل الخطوط</option>` +
        AppState.lines.map((x) => `<option value="${safeText(x.id)}">${safeText(x.name)}</option>`).join("");
    }
  },

  getFilteredEmployees() {
    const depId = $("reportDepartmentFilter")?.value || "";
    const typeId = $("reportTypeFilter")?.value || "";
    const lineId = $("reportLineFilter")?.value || "";

    return AppState.employees.filter((emp) => {
      if (depId && emp.department_id !== depId) return false;
      if (typeId && emp.employee_type_id !== typeId) return false;
      if (lineId && emp.line_id !== lineId) return false;
      return true;
    });
  },

  getPayrollRowsForMonth(month) {
    return Payroll.buildPayrollRows(month);
  },

  getEmployeePayrollRow(employeeId, month) {
    return this.getPayrollRowsForMonth(month).find((x) => x.employeeId === employeeId) || null;
  },

  getEmployeeLoanDeduction(employeeId) {
    const loans = AppState.loans.filter(
      (x) => x.employee_id === employeeId && Number(x.remaining_amount || 0) > 0
    );

    return loans.reduce((sum, x) => {
      return sum + Math.min(
        Number(x.monthly_installment || 0),
        Number(x.remaining_amount || 0)
      );
    }, 0);
  },

  getEmployeeAdditions(employeeId, month) {
    return AppState.adjustments
      .filter((x) => x.employee_id === employeeId && x.month === month && x.type === "إضافة")
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
  },

  getEmployeeManualDeductions(employeeId, month) {
    return AppState.adjustments
      .filter((x) => x.employee_id === employeeId && x.month === month && x.type === "خصم")
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
  },

  companyLogo() {
    return window.Branding?.getLogo ? Branding.getLogo() : "assets/logo/company-default.png";
  },

  openPrintableDocument(title, bodyHtml) {
    const win = window.open("", "_blank");
    if (!win) {
      openInfoModal("تنبيه", "تعذر فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.");
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${safeText(title)}</title>
        <style>
          @font-face{font-family:'Tajawal';src:url('${location.origin}/assets/fonts/Tajawal-Regular.ttf') format('truetype');font-weight:400}
          @font-face{font-family:'Tajawal';src:url('${location.origin}/assets/fonts/Tajawal-Bold.ttf') format('truetype');font-weight:700}
          body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;margin:0;background:#fff;color:#0f172a}
          .print-shell{padding:24px}.print-toolbar{display:flex;justify-content:flex-start;margin-bottom:12px}.print-toolbar button{border:none;background:#2563eb;color:#fff;padding:10px 14px;border-radius:10px;font-family:'Tajawal';cursor:pointer}
          .print-head{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:24px;border-bottom:2px solid #dbeafe;padding-bottom:16px}
          .print-brand{display:flex;align-items:center;gap:14px}
          .print-brand img{width:68px;height:68px;object-fit:contain;border:1px solid #dbeafe;border-radius:12px;padding:6px;background:#fff}
          .print-title{font-size:24px;font-weight:700;margin-bottom:6px}
          .print-subtitle{font-size:14px;color:#475569}
          .summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:16px 0 24px}
          .summary-item{border:1px solid #dbeafe;border-radius:12px;padding:12px;background:#f8fbff}
          .print-table{width:100%;border-collapse:collapse;font-size:13px}
          .print-table th,.print-table td{border:1px solid #cbd5e1;padding:8px;text-align:center}
          .print-table th{background:#dbeafe;color:#0f172a}
          .print-footer{margin-top:28px;display:flex;justify-content:space-between;align-items:flex-end}
          .print-signature{margin-top:20px;text-align:center;min-width:220px}
          .print-signature .line{border-top:1px solid #0f172a;margin-top:42px;padding-top:8px}
          .print-note{color:#475569;font-size:12px}
          .page-break{page-break-after:always}
          .payslip-sheet{width:100%}
          @page{size:A4 landscape;margin:10mm}
          @media print{
            body{background:#fff!important}
            .no-print{display:none!important}
          }
        </style>
      </head>
      <body>
        <div class="print-shell"><div class="print-toolbar no-print"><button onclick="window.print()">طباعة</button></div>${bodyHtml}</div>
        <script>
          window.onload = function() {
            setTimeout(function(){ window.print(); }, 350);
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  },

  exportExcelTable(filename, sheetTitle, headers, rows) {
    if (!rows.length) {
      openInfoModal("تنبيه", "لا توجد بيانات للتصدير.");
      return;
    }

    const headerHtml = headers.map((h) => `<th>${safeText(h)}</th>`).join("");
    const bodyHtml = rows.map((row) => `
      <tr>${row.map((cell) => `<td>${safeText(cell)}</td>`).join("")}</tr>
    `).join("");

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]><xml>
          <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${safeText(sheetTitle)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
        </xml><![endif]-->
        <style>
          body{font-family:Tajawal,Arial,sans-serif;direction:rtl}
          table{border-collapse:collapse;width:100%;direction:rtl}
          th,td{border:1px solid #cbd5e1;padding:8px;text-align:center}
          th{background:#dbeafe;color:#0f172a;font-weight:700}
          h1,h2{margin:0 0 12px 0}
          .meta{margin-bottom:14px;color:#475569}
        </style>
      </head>
      <body>
        <h2>${safeText(sheetTitle)}</h2>
        <div class="meta">شركة عيون الغد - نظام إدارة الموارد البشرية</div>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  },

  exportEmployeesCSV() {
    const rows = this.getFilteredEmployees();
    const body = rows.map((emp) => [
      emp.employee_no || "",
      emp.name || "",
      this.departmentName(emp.department_id),
      AppState.jobs.find((x) => x.id === emp.job_id)?.name || "-",
      this.employeeTypeName(emp.employee_type_id),
      this.lineName(emp.line_id),
      this.vehicleName(emp.vehicle_id),
      Number(emp.salary || 0),
      emp.status || "-"
    ]);

    this.exportExcelTable(
      "employees.xls",
      "تقرير الموظفين",
      ["الرقم الوظيفي", "اسم الموظف", "القسم", "الوظيفة", "نوع الموظف", "الخط", "المركبة", "الراتب", "الحالة"],
      body
    );
    this.addLog("تصدير الموظفين Excel", `عدد السجلات: ${rows.length}`);
  },

  exportAttendanceCSV() {
    const rows = AppState.attendance.map((row) => [
      row.date || "",
      AppState.employees.find((x) => x.id === row.employee_id)?.employee_no || "-",
      this.employeeName(row.employee_id),
      row.status || "",
      row.check_in || "",
      Number(row.late_minutes || 0),
      row.reserve_replacement ? "نعم" : "لا",
      this.lineName(row.actual_line_id),
      this.vehicleName(row.actual_vehicle_id)
    ]);

    this.exportExcelTable(
      "attendance.xls",
      "تقرير الحضور والانصراف",
      ["التاريخ", "الرقم الوظيفي", "اسم الموظف", "الحالة", "وقت الدخول", "دقائق التأخير", "بديل احتياط", "الخط الفعلي", "المركبة الفعلية"],
      rows
    );
    this.addLog("تصدير الحضور Excel", `عدد السجلات: ${rows.length}`);
  },

  exportPayrollCSV() {
    const month = $("payrollMonth")?.value || currentMonthValue();
    return this.exportPayrollExcel(month);
  },

  exportPayrollExcel(month = currentMonthValue()) {
    const rows = this.getPayrollRowsForMonth(month);
    const body = rows.map((row) => [
      row.employeeName,
      row.employeeType,
      row.workDays,
      row.presentDays,
      row.absentDays,
      row.deservedSalary,
      row.lateDeduction,
      row.repeatDeduction,
      row.monthlyEffects,
      row.adminAdjustment,
      row.net
    ]);

    this.exportExcelTable(
      `payroll-${month}.xls`,
      `تقرير رواتب شهر ${month}`,
      ["الموظف", "النوع", "أيام العمل", "الحضور", "الغياب", "المستحق", "خصم التأخير", "خصم التكرار", "التأثيرات الشهرية", "التعديل الإداري", "الصافي"],
      body
    );
    this.addLog("تصدير الرواتب Excel", month);
  },

  async exportPayrollPDF() {
    const month = $("payrollMonth")?.value || currentMonthValue();
    return this.exportPayrollMonthPDF(month);
  },

  async exportPayrollMonthPDF(month = currentMonthValue()) {
    try {
      const rows = this.getPayrollRowsForMonth(month);
      if (!rows.length) {
        openInfoModal("تنبيه", "لا توجد رواتب لهذا الشهر.");
        return;
      }

      const totalNet = rows.reduce((sum, row) => sum + Number(row.net || 0), 0);
      const totalLate = rows.reduce((sum, row) => sum + Number(row.lateDeduction || 0), 0);
      const totalRepeat = rows.reduce((sum, row) => sum + Number(row.repeatDeduction || 0), 0);
      const totalMonthlyEffects = rows.reduce((sum, row) => sum + Number(row.monthlyEffects || 0), 0);

      const bodyRows = rows.map((row) => `
        <tr>
          <td>${safeText(row.employeeName)}</td>
          <td>${safeText(row.employeeType)}</td>
          <td>${row.workDays}</td>
          <td>${row.presentDays}</td>
          <td>${row.absentDays}</td>
          <td>${formatMoney(row.deservedSalary)}</td>
          <td>${formatMoney(row.lateDeduction)}</td>
          <td>${formatMoney(row.repeatDeduction)}</td>
          <td>${formatMoney(row.monthlyEffects)}</td>
          <td>${formatMoney(row.adminAdjustment)}</td>
          <td>${formatMoney(row.net)}</td>
        </tr>
      `).join("");

      const bodyHtml = `
        <div class="print-head">
          <div class="print-brand">
            <img src="${this.companyLogo()}" alt="شعار الشركة" />
            <div>
              <h1>عيون الغد</h1>
              <p>نظام إدارة الموارد البشرية</p>
            </div>
          </div>
          <div>
            <div class="print-title">تقرير رواتب الشهر</div>
            <div class="print-subtitle">الشهر: ${safeText(month)}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item"><strong>إجمالي الصافي</strong><div>${formatMoney(totalNet)}</div></div>
          <div class="summary-item"><strong>إجمالي خصم التأخير</strong><div>${formatMoney(totalLate)}</div></div>
          <div class="summary-item"><strong>إجمالي خصم التكرار</strong><div>${formatMoney(totalRepeat)}</div></div>
          <div class="summary-item"><strong>التأثيرات الشهرية</strong><div>${formatMoney(totalMonthlyEffects)}</div></div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th>الموظف</th>
              <th>النوع</th>
              <th>أيام العمل</th>
              <th>الحضور</th>
              <th>الغياب</th>
              <th>المستحق</th>
              <th>خصم التأخير</th>
              <th>خصم التكرار</th>
              <th>التأثيرات الشهرية</th>
              <th>التعديل الإداري</th>
              <th>الصافي</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>

        <div class="print-footer">
          <div class="print-note">تم إنشاء هذا التقرير من نظام عيون الغد لإدارة الموارد البشرية.</div>
          <div class="print-signature">
            <div class="line">اعتماد الإدارة</div>
          </div>
        </div>
      `;

      this.openPrintableDocument(`تقرير رواتب ${month}`, bodyHtml);
      await this.addLog("تصدير تقرير رواتب الشهر PDF", month);
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر إنشاء تقرير رواتب الشهر.");
    }
  },

  async exportEmployeePaySlipPDF(employeeId, month = currentMonthValue()) {
    try {
      const row = this.getEmployeePayrollRow(employeeId, month);
      const employee = AppState.employees.find((x) => x.id === employeeId);

      if (!row || !employee) {
        openInfoModal("تنبيه", "تعذر إنشاء كشف الراتب لهذا الموظف.");
        return;
      }

      const additions = this.getEmployeeAdditions(employeeId, month);
      const manualDeductions = this.getEmployeeManualDeductions(employeeId, month);
      const loanDeduction = this.getEmployeeLoanDeduction(employeeId);
      const totalDeductions = Number(row.lateDeduction || 0) + Number(row.repeatDeduction || 0) + Number(manualDeductions || 0) + Number(loanDeduction || 0) + Number(row.adminAdjustment || 0);

      const bodyHtml = `
        <div class="print-head">
          <div class="print-brand">
            <img src="${this.companyLogo()}" alt="شعار الشركة" />
            <div>
              <h1>عيون الغد</h1>
              <p>نظام إدارة الموارد البشرية</p>
            </div>
          </div>
          <div>
            <div class="print-title">كشف راتب</div>
            <div class="print-subtitle">الشهر: ${safeText(month)}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item"><strong>الرقم الوظيفي</strong><div>${safeText(employee.employee_no || "-")}</div></div>
          <div class="summary-item"><strong>اسم الموظف</strong><div>${safeText(employee.name || "-")}</div></div>
          <div class="summary-item"><strong>نوع الموظف</strong><div>${safeText(row.employeeType || "-")}</div></div>
          <div class="summary-item"><strong>صافي الراتب</strong><div>${formatMoney(row.net)}</div></div>
        </div>

        <table class="print-table">
          <tbody>
            <tr><th>أيام العمل</th><td>${row.workDays}</td><th>الحضور</th><td>${row.presentDays}</td></tr>
            <tr><th>الغياب</th><td>${row.absentDays}</td><th>المستحق</th><td>${formatMoney(row.deservedSalary)}</td></tr>
            <tr><th>الإضافات</th><td>${formatMoney(additions)}</td><th>خصم التأخير</th><td>${formatMoney(row.lateDeduction)}</td></tr>
            <tr><th>خصم التكرار</th><td>${formatMoney(row.repeatDeduction)}</td><th>خصم السلف</th><td>${formatMoney(loanDeduction)}</td></tr>
            <tr><th>الخصومات اليدوية</th><td>${formatMoney(manualDeductions)}</td><th>التعديل الإداري</th><td>${formatMoney(row.adminAdjustment)}</td></tr>
            <tr><th>إجمالي الخصومات</th><td>${formatMoney(totalDeductions)}</td><th>الصافي النهائي</th><td>${formatMoney(row.net)}</td></tr>
          </tbody>
        </table>

        <div class="print-footer">
          <div class="print-note">هذا الكشف صادر إلكترونيًا من نظام عيون الغد.</div>
          <div class="print-signature">
            <div class="line">اعتماد الإدارة</div>
          </div>
        </div>
      `;

      this.openPrintableDocument(`كشف راتب ${employee.name} - ${month}`, bodyHtml);
      await this.addLog("تصدير كشف راتب PDF", `${employee.name} - ${month}`);
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر إنشاء كشف الراتب.");
    }
  },


  exportEmployeePayslip(employeeId, month = currentMonthValue()) {
    return this.exportEmployeePaySlipPDF(employeeId, month);
  },


  async exportAllEmployeePaySlips(month = currentMonthValue()) {
    try {
      const rows = this.getPayrollRowsForMonth(month);

      if (!rows.length) {
        openInfoModal("تنبيه", "لا توجد رواتب لهذا الشهر.");
        return;
      }

      const payslipsHtml = rows.map((row, index) => {
        const employee = AppState.employees.find((x) => x.id === row.employeeId);
        const additions = this.getEmployeeAdditions(row.employeeId, month);
        const manualDeductions = this.getEmployeeManualDeductions(row.employeeId, month);
        const loanDeduction = this.getEmployeeLoanDeduction(row.employeeId);
        const totalDeductions =
          Number(row.lateDeduction || 0) +
          Number(row.repeatDeduction || 0) +
          Number(manualDeductions || 0) +
          Number(loanDeduction || 0) +
          Number(row.adminAdjustment || 0);

        return `
          <section class="payslip-sheet${index < rows.length - 1 ? ' page-break' : ''}">
            <div class="print-head">
              <div class="print-brand">
                <img src="${this.companyLogo()}" alt="شعار الشركة" />
                <div>
                  <h1>عيون الغد</h1>
                  <p>نظام إدارة الموارد البشرية</p>
                </div>
              </div>
              <div>
                <div class="print-title">كشف راتب</div>
                <div class="print-subtitle">الشهر: ${safeText(month)}</div>
              </div>
            </div>

            <div class="summary-grid">
              <div class="summary-item"><strong>الرقم الوظيفي</strong><div>${safeText(employee?.employee_no || '-')}</div></div>
              <div class="summary-item"><strong>اسم الموظف</strong><div>${safeText(employee?.name || '-')}</div></div>
              <div class="summary-item"><strong>نوع الموظف</strong><div>${safeText(row.employeeType || '-')}</div></div>
              <div class="summary-item"><strong>صافي الراتب</strong><div>${formatMoney(row.net)}</div></div>
            </div>

            <table class="print-table">
              <tbody>
                <tr><th>أيام العمل</th><td>${row.workDays}</td><th>الحضور</th><td>${row.presentDays}</td></tr>
                <tr><th>الغياب</th><td>${row.absentDays}</td><th>المستحق</th><td>${formatMoney(row.deservedSalary)}</td></tr>
                <tr><th>الإضافات</th><td>${formatMoney(additions)}</td><th>خصم التأخير</th><td>${formatMoney(row.lateDeduction)}</td></tr>
                <tr><th>خصم التكرار</th><td>${formatMoney(row.repeatDeduction)}</td><th>خصم السلف</th><td>${formatMoney(loanDeduction)}</td></tr>
                <tr><th>الخصومات اليدوية</th><td>${formatMoney(manualDeductions)}</td><th>التعديل الإداري</th><td>${formatMoney(row.adminAdjustment)}</td></tr>
                <tr><th>إجمالي الخصومات</th><td>${formatMoney(totalDeductions)}</td><th>الصافي النهائي</th><td>${formatMoney(row.net)}</td></tr>
              </tbody>
            </table>

            <div class="print-footer">
              <div class="print-note">هذا الكشف صادر إلكترونيًا من نظام عيون الغد.</div>
              <div class="print-signature">
                <div class="line">اعتماد الإدارة</div>
              </div>
            </div>
          </section>
        `;
      }).join('');

      this.openPrintableDocument(`كشوف رواتب ${month}`, payslipsHtml);
      await this.addLog("طباعة جميع كشوف الرواتب", month);
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر إنشاء جميع كشوف الرواتب.");
    }
  },

  renderBackupsTable() {
    const usage = $("backupUsage");
    const tbody = $("backupsTable");

    const totalBytes = AppState.backups.reduce((sum, item) => sum + Number(item.size_bytes || 0), 0);

    if (usage) {
      usage.innerHTML = `عدد النسخ: <strong>${AppState.backups.length}</strong> | الحجم المستخدم: <strong>${(totalBytes / (1024 * 1024)).toFixed(2)} MB</strong>`;
    }

    if (!tbody) return;

    tbody.innerHTML = AppState.backups.length
      ? AppState.backups.map((item) => `
        <tr>
          <td>${formatDateTime(item.created_at)}</td>
          <td>${safeText(item.reason)}</td>
          <td>${(Number(item.size_bytes || 0) / (1024 * 1024)).toFixed(2)} MB</td>
          <td><button class="btn btn-light" onclick="Reports.downloadBackup('${item.id}')">تحميل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">لا توجد نسخ احتياطية</td></tr>`;
  },

  async createBackup() {
    try {
      const payload = {
        employeeTypes: AppState.employeeTypes,
        departments: AppState.departments,
        jobs: AppState.jobs,
        lines: AppState.lines,
        vehicles: AppState.vehicles,
        pricing: AppState.pricing,
        employees: AppState.employees,
        attendance: AppState.attendance,
        leaveRequests: AppState.leaveRequests,
        loans: AppState.loans,
        adjustments: AppState.adjustments,
        payrollArchive: AppState.payrollArchive,
        employeeHistory: AppState.employeeHistory,
        deleteRequests: AppState.deleteRequests,
        users: AppState.users,
        logs: AppState.logs,
        settings: AppState.settings,
        payrollOverrides: AppState.payrollOverrides
      };

      const sizeBytes = new Blob([JSON.stringify(payload)]).size;

      await sbInsert(TABLES.backups, [{
        reason: "نسخة يدوية",
        payload,
        size_bytes: sizeBytes,
        created_at: new Date().toISOString()
      }]);

      await this.addLog("إنشاء نسخة احتياطية", "نسخة يدوية");
      await loadCoreData();
      this.renderBackupsTable();
      openInfoModal("تم", "تم إنشاء النسخة الاحتياطية بنجاح.");
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر إنشاء النسخة الاحتياطية.");
    }
  },

  downloadBackup(id) {
    const item = AppState.backups.find((x) => x.id === id);
    if (!item) {
      openInfoModal("تنبيه", "النسخة غير موجودة.");
      return;
    }

    const blob = new Blob([JSON.stringify(item.payload || {}, null, 2)], {
      type: "application/json"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `backup-${String(item.created_at || "file").replace(/[: ]/g, "-")}.json`;
    link.click();
  }
};

window.Reports = Reports;
