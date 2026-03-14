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

  getLogo() {
    return window.Branding?.getLogo?.() || "assets/logo/company-default.png";
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

  exportCSV(filename, rows) {
    if (!rows.length) {
      openInfoModal("تنبيه", "لا توجد بيانات للتصدير.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(","),
      ...rows.map((row) =>
        headers
          .map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  },

  exportEmployeesCSV() {
    const rows = this.getFilteredEmployees().map((emp) => ({
      employee_no: emp.employee_no,
      name: emp.name,
      department: this.departmentName(emp.department_id),
      job: AppState.jobs.find((x) => x.id === emp.job_id)?.name || "-",
      employee_type: this.employeeTypeName(emp.employee_type_id),
      line: this.lineName(emp.line_id),
      vehicle: this.vehicleName(emp.vehicle_id),
      salary: Number(emp.salary || 0),
      status: emp.status
    }));

    this.exportCSV("employees.csv", rows);
    this.addLog("تصدير الموظفين CSV", `عدد السجلات: ${rows.length}`);
  },

  exportAttendanceCSV() {
    const rows = AppState.attendance.map((row) => ({
      date: row.date,
      employee_no: AppState.employees.find((x) => x.id === row.employee_id)?.employee_no || "-",
      employee_name: this.employeeName(row.employee_id),
      status: row.status,
      check_in: row.check_in || "",
      late_minutes: Number(row.late_minutes || 0),
      reserve_replacement: row.reserve_replacement ? "نعم" : "لا",
      actual_line: this.lineName(row.actual_line_id),
      actual_vehicle: this.vehicleName(row.actual_vehicle_id)
    }));

    this.exportCSV("attendance.csv", rows);
    this.addLog("تصدير الحضور CSV", `عدد السجلات: ${rows.length}`);
  },

  exportPayrollCSV() {
    const month = $("payrollMonth")?.value || currentMonthValue();
    const rows = Payroll.buildPayrollRows(month).map((row) => ({
      employee_name: row.employeeName,
      employee_type: row.employeeType,
      work_days: row.workDays,
      present_days: row.presentDays,
      absent_days: row.absentDays,
      deserved_salary: row.deservedSalary,
      late_deduction: row.lateDeduction,
      repeat_deduction: row.repeatDeduction,
      monthly_effects: row.monthlyEffects,
      admin_adjustment: row.adminAdjustment,
      net: row.net
    }));

    this.exportCSV(`payroll-${month}.csv`, rows);
    this.addLog("تصدير الرواتب CSV", month);
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
    return loans.reduce((sum, x) => sum + Math.min(Number(x.monthly_installment || 0), Number(x.remaining_amount || 0)), 0);
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

  openPrintWindow(title, bodyHtml) {
    const logo = this.getLogo();
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
body{font-family:Tahoma,Arial,sans-serif;background:#fff;color:#111;padding:24px;direction:rtl}
.print-shell{max-width:1100px;margin:0 auto}
.print-head{display:flex;align-items:center;justify-content:space-between;gap:18px;border-bottom:3px solid #16a34a;padding-bottom:14px;margin-bottom:18px}
.print-brand{display:flex;align-items:center;gap:16px}
.print-brand img{width:92px;height:92px;object-fit:contain;border-radius:18px;background:#fff;border:1px solid #d1d5db;padding:6px}
.print-brand h1{margin:0;font-size:30px;color:#166534}
.print-brand p{margin:6px 0 0;font-size:14px;color:#374151}
.print-title{font-size:24px;font-weight:700;color:#0f172a;margin-bottom:6px}
.print-subtitle{color:#475569;font-size:13px}
.summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 18px;margin:18px 0}
.summary-item{border:1px solid #dbe4ec;border-radius:12px;padding:10px 12px;background:#f8fafc}
.summary-item strong{display:block;color:#166534;font-size:13px;margin-bottom:4px}
.table-wrap{margin-top:14px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #dbe4ec;padding:10px 8px;text-align:center;font-size:13px}
th{background:#16a34a;color:#fff}
tr:nth-child(even) td{background:#f8fafc}
.print-footer{margin-top:24px;display:flex;justify-content:space-between;gap:20px;align-items:flex-end}
.footer-sign{margin-top:36px;border-top:1px dashed #94a3b8;padding-top:10px;min-width:260px;text-align:center}
.note{font-size:12px;color:#64748b}
@media print{body{padding:0}.print-shell{max-width:none}}
</style>
</head>
<body>
<div class="print-shell">
${bodyHtml.replaceAll('__LOGO__', logo)}
</div>
<script>window.onload=()=>{setTimeout(()=>window.print(),300)};<\/script>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (!win) {
      openInfoModal("تنبيه", "يرجى السماح بفتح النوافذ المنبثقة للطباعة.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  },

  async exportPayrollPDF() {
    const month = $("payrollMonth")?.value || currentMonthValue();
    return this.exportPayrollMonthPDF(month);
  },

  async exportPayrollMonthPDF(month = currentMonthValue()) {
    try {
      const rows = this.getPayrollRowsForMonth(month);
      if (!rows.length) {
        openInfoModal("تنبيه", "لا توجد بيانات رواتب لهذا الشهر.");
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
            <img src="__LOGO__" alt="شعار الشركة" />
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
          <div class="summary-item"><strong>إجمالي الصافي</strong>${formatMoney(totalNet)}</div>
          <div class="summary-item"><strong>إجمالي خصم التأخير</strong>${formatMoney(totalLate)}</div>
          <div class="summary-item"><strong>إجمالي خصم التكرار</strong>${formatMoney(totalRepeat)}</div>
          <div class="summary-item"><strong>التأثيرات الشهرية</strong>${formatMoney(totalMonthlyEffects)}</div>
        </div>
        <div class="table-wrap">
          <table>
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
                <th>تعديل إداري</th>
                <th>الصافي</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
        <div class="print-footer">
          <div class="note">اعتماد الإدارة - شركة عيون الغد</div>
          <div class="footer-sign">اعتماد الإدارة</div>
        </div>
      `;

      this.openPrintWindow(`تقرير رواتب ${month}`, bodyHtml);
      await this.addLog("طباعة تقرير رواتب الشهر", month);
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
      const dept = this.departmentName(employee.department_id);
      const line = this.lineName(employee.line_id);
      const vehicle = this.vehicleName(employee.vehicle_id);

      const bodyHtml = `
        <div class="print-head">
          <div class="print-brand">
            <img src="__LOGO__" alt="شعار الشركة" />
            <div>
              <h1>عيون الغد</h1>
              <p>نظام إدارة الموارد البشرية</p>
            </div>
          </div>
          <div>
            <div class="print-title">كشف راتب</div>
            <div class="print-subtitle">عن شهر ${safeText(month)}</div>
          </div>
        </div>
        <div class="summary-grid">
          <div class="summary-item"><strong>اسم الموظف</strong>${safeText(employee.name || '-')}</div>
          <div class="summary-item"><strong>الرقم الوظيفي</strong>${safeText(employee.employee_no || '-')}</div>
          <div class="summary-item"><strong>القسم</strong>${safeText(dept)}</div>
          <div class="summary-item"><strong>نوع الموظف</strong>${safeText(row.employeeType)}</div>
          <div class="summary-item"><strong>الخط</strong>${safeText(line)}</div>
          <div class="summary-item"><strong>السيارة</strong>${safeText(vehicle)}</div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>البيان</th><th>القيمة</th></tr>
            </thead>
            <tbody>
              <tr><td>أيام العمل</td><td>${row.workDays}</td></tr>
              <tr><td>أيام الحضور</td><td>${row.presentDays}</td></tr>
              <tr><td>أيام الغياب</td><td>${row.absentDays}</td></tr>
              <tr><td>الراتب المستحق</td><td>${formatMoney(row.deservedSalary)}</td></tr>
              <tr><td>الإضافات</td><td>${formatMoney(additions)}</td></tr>
              <tr><td>خصم التأخير</td><td>${formatMoney(row.lateDeduction)}</td></tr>
              <tr><td>خصم التكرار</td><td>${formatMoney(row.repeatDeduction)}</td></tr>
              <tr><td>خصم السلف والديون</td><td>${formatMoney(loanDeduction)}</td></tr>
              <tr><td>الخصومات اليدوية</td><td>${formatMoney(manualDeductions)}</td></tr>
              <tr><td>التعديل الإداري</td><td>${formatMoney(row.adminAdjustment)}</td></tr>
              <tr><th>صافي الراتب</th><th>${formatMoney(row.net)}</th></tr>
            </tbody>
          </table>
        </div>
        <div class="print-footer">
          <div class="note">اعتماد الإدارة - شركة عيون الغد</div>
          <div class="footer-sign">اعتماد الإدارة</div>
        </div>
      `;

      this.openPrintWindow(`كشف راتب ${employee.name} ${month}`, bodyHtml);
      await this.addLog("طباعة كشف راتب", `${employee.name} - ${month}`);
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر إنشاء كشف الراتب.");
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
