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

  async exportPayrollPDF() {
    try {
      const month = $("payrollMonth")?.value || currentMonthValue();
      const rows = Payroll.buildPayrollRows(month);

      if (!rows.length) {
        openInfoModal("تنبيه", "لا توجد رواتب لهذا الشهر.");
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "landscape" });

      doc.setFontSize(16);
      doc.text(`Oyoon Alghad Payroll - ${month}`, 14, 14);

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

      doc.autoTable({
        head: [[
          "Employee",
          "Type",
          "Work Days",
          "Present",
          "Absent",
          "Deserved",
          "Late Deduction",
          "Repeat Deduction",
          "Monthly Effects",
          "Admin Adjustment",
          "Net"
        ]],
        body,
        startY: 22,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] }
      });

      doc.save(`payroll-${month}.pdf`);
      await this.addLog("تصدير رواتب PDF", month);
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر إنشاء ملف PDF.");
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
