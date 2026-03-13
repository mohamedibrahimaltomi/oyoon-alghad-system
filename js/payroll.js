const Payroll = {
  getEmployeeById(id) {
    return AppState.employees.find((x) => x.id === id) || null;
  },

  getEmployeeTypeById(id) {
    return AppState.employeeTypes.find((x) => x.id === id) || null;
  },

  employeeName(id) {
    return this.getEmployeeById(id)?.name || "-";
  },

  employeeNo(id) {
    return this.getEmployeeById(id)?.employee_no || "-";
  },

  employeeTypeName(id) {
    return this.getEmployeeTypeById(id)?.name || "-";
  },

  employeeTypeMethod(id) {
    return this.getEmployeeTypeById(id)?.payroll_method || "fixed_salary";
  },

  getSettingNumber(key, fallback = 0) {
    const row = AppState.settings.find((x) => x.key === key);
    if (!row || row.value_number == null) return fallback;
    return Number(row.value_number);
  },

  getSettingMode(key, fallback = "days") {
    return AppState.settings.find((x) => x.key === key)?.value_mode || fallback;
  },

  getSettingText(key, fallback = "") {
    return AppState.settings.find((x) => x.key === key)?.value_text || fallback;
  },

  countWorkDaysInMonth(month) {
    if (!month || !month.includes("-")) return 0;
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(year, monthNumber - 1, d).getDay();
      if (day !== 5) count += 1; // الجمعة مستبعدة
    }
    return count;
  },

  getEmployeeAttendanceRows(employeeId, month) {
    return AppState.attendance.filter(
      (x) => x.employee_id === employeeId && String(x.date).startsWith(month)
    );
  },

  getEmployeeLeaveRows(employeeId, month) {
    return AppState.leaveRequests.filter(
      (x) => x.employee_id === employeeId && String(x.from_date).startsWith(month)
    );
  },

  getPricingValue(lineId, vehicleId) {
    return Number(
      AppState.pricing.find((x) => x.line_id === lineId && x.vehicle_id === vehicleId)?.amount || 0
    );
  },

  getDailyBase(employee, month, attendanceRow = null) {
    const workDays = this.countWorkDaysInMonth(month);
    if (!employee || workDays <= 0) return 0;

    const method = this.employeeTypeMethod(employee.employee_type_id);

    if (method === "driver_line_vehicle") {
      return this.getPricingValue(employee.line_id, employee.vehicle_id) / workDays;
    }

    if (method === "reserve_driver") {
      if (
        attendanceRow?.reserve_replacement &&
        attendanceRow?.actual_line_id &&
        attendanceRow?.actual_vehicle_id
      ) {
        return this.getPricingValue(
          attendanceRow.actual_line_id,
          attendanceRow.actual_vehicle_id
        ) / workDays;
      }

      const reserveLineId =
        AppState.lines.find((x) => x.name === "احتياط")?.id || null;

      const reserveAmount = reserveLineId
        ? this.getPricingValue(reserveLineId, employee.vehicle_id)
        : 0;

      const baseMonthly = reserveAmount > 0 ? reserveAmount : Number(employee.salary || 0);
      return baseMonthly / workDays;
    }

    return Number(employee.salary || 0) / workDays;
  },

  getLateRule(lateMinutes) {
    const l1 = this.getSettingNumber("late_1_minutes", 30);
    const l2 = this.getSettingNumber("late_2_minutes", 60);
    const l3 = this.getSettingNumber("late_3_minutes", 120);

    if (lateMinutes < l1) {
      return { mode: "days", value: 0 };
    }

    if (lateMinutes < l2) {
      return {
        mode: this.getSettingMode("late_1_mode", "days"),
        value: this.getSettingNumber("late_1_value", 0.25)
      };
    }

    if (lateMinutes < l3) {
      return {
        mode: this.getSettingMode("late_2_mode", "days"),
        value: this.getSettingNumber("late_2_value", 0.5)
      };
    }

    return {
      mode: this.getSettingMode("late_3_mode", "days"),
      value: this.getSettingNumber("late_3_value", 0.75)
    };
  },

  getRepeatPenaltyCount(employeeId, month) {
    const threshold = this.getSettingNumber("late_3_minutes", 120);

    const rows = this.getEmployeeAttendanceRows(employeeId, month)
      .filter((x) => Number(x.late_minutes || 0) >= threshold)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    let count = Math.floor(rows.length / 3);

    let consecutive = 1;
    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].date);
      const curr = new Date(rows[i].date);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        consecutive += 1;
        if (consecutive >= 2) {
          count += 1;
          consecutive = 0;
        }
      } else {
        consecutive = 1;
      }
    }

    return count;
  },

  buildPayrollRows(month = currentMonthValue()) {
    const workDays = this.countWorkDaysInMonth(month);

    return AppState.employees.map((employee) => {
      const method = this.employeeTypeMethod(employee.employee_type_id);
      const attendanceRows = this.getEmployeeAttendanceRows(employee.id, month);
      const leaveRows = this.getEmployeeLeaveRows(employee.id, month);

      const presentRows = attendanceRows.filter((x) =>
        ["حضور", "تأخير", "إجازة"].includes(x.status)
      );

      const presentDays = presentRows.length + leaveRows.length;
      const absentDays = attendanceRows.filter((x) => x.status === "غياب").length;

      let deservedSalary = 0;

      if (method === "driver_line_vehicle") {
        const monthlyAmount = this.getPricingValue(employee.line_id, employee.vehicle_id);
        deservedSalary = workDays > 0 ? (monthlyAmount / workDays) * presentDays : 0;
      } else if (method === "reserve_driver") {
        let total = 0;
        for (const row of presentRows) {
          total += this.getDailyBase(employee, month, row);
        }
        total += leaveRows.length * this.getDailyBase(employee, month, null);
        deservedSalary = total;
      } else {
        deservedSalary = workDays > 0 ? (Number(employee.salary || 0) / workDays) * presentDays : 0;
      }

      let lateDeduction = 0;
      attendanceRows
        .filter((x) => x.status === "تأخير")
        .forEach((row) => {
          const rule = this.getLateRule(Number(row.late_minutes || 0));
          const dayBase = this.getDailyBase(employee, month, row);
          lateDeduction += rule.mode === "days"
            ? dayBase * Number(rule.value || 0)
            : Number(rule.value || 0);
        });

      let repeatDeduction = 0;
      if (this.getSettingNumber("repeat_enabled", 1) === 1) {
        const repeatCount = this.getRepeatPenaltyCount(employee.id, month);
        const repeatValue = this.getSettingNumber("repeat_value", 3);
        const repeatMode = this.getSettingMode("repeat_mode", "days");
        const base = this.getDailyBase(employee, month, null);

        repeatDeduction = repeatMode === "days"
          ? base * repeatValue * repeatCount
          : repeatValue * repeatCount;
      }

      const loans = AppState.loans.filter(
        (x) => x.employee_id === employee.id && Number(x.remaining_amount || 0) > 0
      );
      const loansDeduction = loans.reduce((sum, x) => {
        return sum + Math.min(Number(x.monthly_installment || 0), Number(x.remaining_amount || 0));
      }, 0);

      const adjustments = AppState.adjustments.filter(
        (x) => x.employee_id === employee.id && x.month === month
      );

      const additions = adjustments
        .filter((x) => x.type === "إضافة")
        .reduce((sum, x) => sum + Number(x.amount || 0), 0);

      const manualDeductions = adjustments
        .filter((x) => x.type === "خصم")
        .reduce((sum, x) => sum + Number(x.amount || 0), 0);

      const override = AppState.payrollOverrides.find(
        (x) => x.employee_id === employee.id && x.month === month
      );

      let adminAdjustment = 0;
      if (override) {
        const base = this.getDailyBase(employee, month, null);
        adminAdjustment = override.override_mode === "days"
          ? base * Number(override.override_value || 0)
          : Number(override.override_value || 0);
      }

      const monthlyEffects = additions - manualDeductions - loansDeduction;
      const gross = Number(deservedSalary || 0) + Number(additions || 0);
      const totalDeductions =
        Number(lateDeduction || 0) +
        Number(repeatDeduction || 0) +
        Number(loansDeduction || 0) +
        Number(manualDeductions || 0) +
        Number(adminAdjustment || 0);

      const net = Math.max(0, gross - totalDeductions);

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        employeeType: this.employeeTypeName(employee.employee_type_id),
        workDays,
        presentDays,
        absentDays,
        deservedSalary: Number(deservedSalary.toFixed(2)),
        lateDeduction: Number(lateDeduction.toFixed(2)),
        repeatDeduction: Number(repeatDeduction.toFixed(2)),
        monthlyEffects: Number(monthlyEffects.toFixed(2)),
        adminAdjustment: Number(adminAdjustment.toFixed(2)),
        net: Number(net.toFixed(2))
      };
    });
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

  async saveBackup(reason = "تحديث بيانات الرواتب") {
    try {
      const payload = {
        loans: AppState.loans,
        adjustments: AppState.adjustments,
        payrollArchive: AppState.payrollArchive,
        payrollOverrides: AppState.payrollOverrides,
        settings: AppState.settings
      };
      const sizeBytes = new Blob([JSON.stringify(payload)]).size;

      await sbInsert(TABLES.backups, [{
        reason,
        payload,
        size_bytes: sizeBytes,
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.error("backup error", err);
    }
  },

  renderLoansTable() {
    const tbody = $("loansTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.loans.length
      ? AppState.loans.map((item) => `
        <tr>
          <td>${safeText(this.employeeName(item.employee_id))}</td>
          <td>${safeText(item.type)}</td>
          <td>${formatMoney(item.amount)}</td>
          <td>${safeText(item.months_count)}</td>
          <td>${formatMoney(item.monthly_installment)}</td>
          <td>${formatMoney(item.remaining_amount)}</td>
          <td><button class="btn btn-light" onclick="Payroll.openLoanModal('${item.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="7">لا توجد بيانات</td></tr>`;
  },

  renderAdjustmentsTable() {
    const tbody = $("adjustmentsTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.adjustments.length
      ? AppState.adjustments.map((item) => `
        <tr>
          <td>${safeText(this.employeeName(item.employee_id))}</td>
          <td>${safeText(item.type)}</td>
          <td>${formatMoney(item.amount)}</td>
          <td>${safeText(item.month)}</td>
          <td>${safeText(item.notes || "-")}</td>
          <td><button class="btn btn-light" onclick="Payroll.openAdjustmentModal('${item.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="6">لا توجد بيانات</td></tr>`;
  },

  renderPayrollTable() {
    const tbody = $("payrollTable");
    if (!tbody) return;

    const month = $("payrollMonth")?.value || currentMonthValue();
    const rows = this.buildPayrollRows(month);

    tbody.innerHTML = rows.length
      ? rows.map((row) => `
        <tr>
          <td>${safeText(row.employeeName)}</td>
          <td>${safeText(row.employeeType)}</td>
          <td>${safeText(row.workDays)}</td>
          <td>${safeText(row.presentDays)}</td>
          <td>${safeText(row.absentDays)}</td>
          <td>${formatMoney(row.deservedSalary)}</td>
          <td>${formatMoney(row.lateDeduction)}</td>
          <td>${formatMoney(row.repeatDeduction)}</td>
          <td>${formatMoney(row.monthlyEffects)}</td>
          <td>${formatMoney(row.adminAdjustment)}</td>
          <td>${formatMoney(row.net)}</td>
          <td>
            <button class="btn btn-light" onclick="Payroll.openPayrollOverrideModal('${month}', '${row.employeeId}')">تعديل</button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="12">لا توجد بيانات</td></tr>`;
  },

  renderPayrollArchiveTable() {
    const tbody = $("payrollArchiveTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.payrollArchive.length
      ? AppState.payrollArchive.map((item) => {
          const rows = item.rows || [];
          const total = rows.reduce((sum, row) => sum + Number(row.net || 0), 0);
          return `
            <tr>
              <td>${safeText(item.month)}</td>
              <td>${rows.length}</td>
              <td>${formatMoney(total)}</td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="3">لا توجد بيانات</td></tr>`;
  },

  renderSettings() {
    $("payrollMonth") && ($("payrollMonth").value = $("payrollMonth").value || currentMonthValue());

    if ($("setting_work_start_time")) $("setting_work_start_time").value = this.getSettingText("work_start_time", "08:00");
    if ($("setting_late_1_minutes")) $("setting_late_1_minutes").value = this.getSettingNumber("late_1_minutes", 30);
    if ($("setting_late_1_mode")) $("setting_late_1_mode").value = this.getSettingMode("late_1_mode", "days");
    if ($("setting_late_1_value")) $("setting_late_1_value").value = this.getSettingNumber("late_1_value", 0.25);

    if ($("setting_late_2_minutes")) $("setting_late_2_minutes").value = this.getSettingNumber("late_2_minutes", 60);
    if ($("setting_late_2_mode")) $("setting_late_2_mode").value = this.getSettingMode("late_2_mode", "days");
    if ($("setting_late_2_value")) $("setting_late_2_value").value = this.getSettingNumber("late_2_value", 0.5);

    if ($("setting_late_3_minutes")) $("setting_late_3_minutes").value = this.getSettingNumber("late_3_minutes", 120);
    if ($("setting_late_3_mode")) $("setting_late_3_mode").value = this.getSettingMode("late_3_mode", "days");
    if ($("setting_late_3_value")) $("setting_late_3_value").value = this.getSettingNumber("late_3_value", 0.75);

    if ($("setting_repeat_enabled")) $("setting_repeat_enabled").value = String(this.getSettingNumber("repeat_enabled", 1));
    if ($("setting_repeat_mode")) $("setting_repeat_mode").value = this.getSettingMode("repeat_mode", "days");
    if ($("setting_repeat_value")) $("setting_repeat_value").value = this.getSettingNumber("repeat_value", 3);
  },

  async saveSettings() {
    try {
      const rows = [
        { key: "work_start_time", value_text: $("setting_work_start_time").value, value_number: null, value_mode: null },
        { key: "late_1_minutes", value_text: null, value_number: Number($("setting_late_1_minutes").value || 30), value_mode: null },
        { key: "late_1_mode", value_text: null, value_number: null, value_mode: $("setting_late_1_mode").value },
        { key: "late_1_value", value_text: null, value_number: Number($("setting_late_1_value").value || 0.25), value_mode: null },

        { key: "late_2_minutes", value_text: null, value_number: Number($("setting_late_2_minutes").value || 60), value_mode: null },
        { key: "late_2_mode", value_text: null, value_number: null, value_mode: $("setting_late_2_mode").value },
        { key: "late_2_value", value_text: null, value_number: Number($("setting_late_2_value").value || 0.5), value_mode: null },

        { key: "late_3_minutes", value_text: null, value_number: Number($("setting_late_3_minutes").value || 120), value_mode: null },
        { key: "late_3_mode", value_text: null, value_number: null, value_mode: $("setting_late_3_mode").value },
        { key: "late_3_value", value_text: null, value_number: Number($("setting_late_3_value").value || 0.75), value_mode: null },

        { key: "repeat_enabled", value_text: null, value_number: Number($("setting_repeat_enabled").value || 1), value_mode: null },
        { key: "repeat_mode", value_text: null, value_number: null, value_mode: $("setting_repeat_mode").value },
        { key: "repeat_value", value_text: null, value_number: Number($("setting_repeat_value").value || 3), value_mode: null }
      ];

      for (const row of rows) {
        const { error } = await sb.from(TABLES.settings).upsert([{
          ...row,
          updated_at: new Date().toISOString()
        }], {
          onConflict: "key"
        });
        if (error) throw error;
      }

      await this.addLog("حفظ الإعدادات", "خصومات التأخير والتكرار");
      await loadCoreData();
      await this.saveBackup("حفظ إعدادات الرواتب");
      App.renderAll();
      openInfoModal("تم", "تم حفظ الإعدادات بنجاح.");
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر حفظ الإعدادات.");
    }
  },

  openLoanModal(id = null) {
    const item = id ? AppState.loans.find((x) => x.id === id) : null;

    App.openModal(
      item ? "تعديل سلفة / دين" : "إضافة سلفة / دين",
      `
      <div class="form-grid">
        <div class="field">
          <label>الموظف</label>
          <select id="f_employee" data-enter-next>
            <option value="">اختر</option>
            ${AppState.employees.map((x) => `<option value="${safeText(x.id)}" ${String(item?.employee_id || "") === String(x.id) ? "selected" : ""}>${safeText(x.employee_no)} - ${safeText(x.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>النوع</label>
          <select id="f_type" data-enter-next>
            <option value="سلفة">سلفة</option>
            <option value="دين">دين</option>
          </select>
        </div>
        <div class="field">
          <label>المبلغ</label>
          <input id="f_amount" type="number" value="${safeText(item?.amount || 0)}" data-enter-next />
        </div>
        <div class="field">
          <label>عدد الأشهر</label>
          <input id="f_months_count" type="number" value="${safeText(item?.months_count || 1)}" data-enter-next />
        </div>
      </div>
      `,
      async () => {
        try {
          const amount = Number($("f_amount").value || 0);
          const monthsCount = Math.max(1, Number($("f_months_count").value || 1));

          const payload = {
            employee_id: $("f_employee").value || null,
            type: $("f_type").value,
            amount,
            months_count: monthsCount,
            monthly_installment: amount / monthsCount,
            remaining_amount: item ? Number(item.remaining_amount ?? amount) : amount
          };

          if (!payload.employee_id || amount <= 0) {
            openInfoModal("تنبيه", "يرجى إدخال الموظف والمبلغ بشكل صحيح.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.loans, item.id, payload);
            await this.addLog("تعديل سلفة / دين", `${this.employeeName(payload.employee_id)} - ${amount}`);
          } else {
            await sbInsert(TABLES.loans, [payload]);
            await this.addLog("إضافة سلفة / دين", `${this.employeeName(payload.employee_id)} - ${amount}`);
          }

          await loadCoreData();
          await this.saveBackup(item ? "تعديل سلفة / دين" : "إضافة سلفة / دين");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ السلفة / الدين.");
        }
      }
    );

    $("f_type").value = item?.type || "سلفة";
  },

  openAdjustmentModal(id = null) {
    const item = id ? AppState.adjustments.find((x) => x.id === id) : null;

    App.openModal(
      item ? "تعديل إضافة / خصم" : "إضافة إضافة / خصم",
      `
      <div class="form-grid">
        <div class="field">
          <label>الموظف</label>
          <select id="f_employee" data-enter-next>
            <option value="">اختر</option>
            ${AppState.employees.map((x) => `<option value="${safeText(x.id)}" ${String(item?.employee_id || "") === String(x.id) ? "selected" : ""}>${safeText(x.employee_no)} - ${safeText(x.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>النوع</label>
          <select id="f_type" data-enter-next>
            <option value="إضافة">إضافة</option>
            <option value="خصم">خصم</option>
          </select>
        </div>
        <div class="field">
          <label>المبلغ</label>
          <input id="f_amount" type="number" value="${safeText(item?.amount || 0)}" data-enter-next />
        </div>
        <div class="field">
          <label>الشهر</label>
          <input id="f_month" type="month" value="${safeText(item?.month || currentMonthValue())}" data-enter-next />
        </div>
        <div class="field">
          <label>ملاحظات</label>
          <textarea id="f_notes">${safeText(item?.notes || "")}</textarea>
        </div>
      </div>
      `,
      async () => {
        try {
          const payload = {
            employee_id: $("f_employee").value || null,
            type: $("f_type").value,
            amount: Number($("f_amount").value || 0),
            month: $("f_month").value,
            notes: $("f_notes").value.trim()
          };

          if (!payload.employee_id || payload.amount <= 0 || !payload.month) {
            openInfoModal("تنبيه", "يرجى إدخال البيانات المطلوبة بشكل صحيح.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.adjustments, item.id, payload);
            await this.addLog("تعديل إضافة / خصم", `${this.employeeName(payload.employee_id)} - ${payload.amount}`);
          } else {
            await sbInsert(TABLES.adjustments, [payload]);
            await this.addLog("إضافة إضافة / خصم", `${this.employeeName(payload.employee_id)} - ${payload.amount}`);
          }

          await loadCoreData();
          await this.saveBackup(item ? "تعديل إضافة / خصم" : "إضافة إضافة / خصم");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ الإضافة / الخصم.");
        }
      }
    );

    $("f_type").value = item?.type || "إضافة";
  },

  openPayrollOverrideModal(month, employeeId) {
    const current = AppState.payrollOverrides.find(
      (x) => x.month === month && x.employee_id === employeeId
    );

    App.openModal(
      "تعديل إداري للخصم الشهري",
      `
      <div class="form-grid">
        <div class="field">
          <label>نوع التعديل</label>
          <select id="f_override_mode" data-enter-next>
            <option value="days">أيام</option>
            <option value="amount">قيمة</option>
          </select>
        </div>
        <div class="field">
          <label>القيمة</label>
          <input id="f_override_value" type="number" step="0.01" value="${safeText(current?.override_value || 0)}" data-enter-next />
        </div>
        <div class="field">
          <label>السبب</label>
          <textarea id="f_reason">${safeText(current?.reason || "")}</textarea>
        </div>
      </div>
      `,
      async () => {
        try {
          const payload = {
            month,
            employee_id: employeeId,
            override_mode: $("f_override_mode").value,
            override_value: Number($("f_override_value").value || 0),
            reason: $("f_reason").value.trim(),
            created_by: AppState.currentUser?.username || "system"
          };

          if (current) {
            await sbUpdate(TABLES.payrollOverrides, current.id, payload);
            await this.addLog("تعديل إداري للخصم", `${this.employeeName(employeeId)} - ${month}`);
          } else {
            await sbInsert(TABLES.payrollOverrides, [payload]);
            await this.addLog("إضافة تعديل إداري للخصم", `${this.employeeName(employeeId)} - ${month}`);
          }

          await loadCoreData();
          await this.saveBackup("تعديل إداري للخصم الشهري");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ التعديل الإداري.");
        }
      }
    );

    $("f_override_mode").value = current?.override_mode || "days";
  },

  async approvePayrollMonth() {
    try {
      const month = $("payrollMonth")?.value || currentMonthValue();
      const rows = this.buildPayrollRows(month);

      const existing = AppState.payrollArchive.find((x) => x.month === month);
      const payload = {
        month,
        rows,
        created_at: new Date().toISOString()
      };

      if (existing) {
        await sbUpdate(TABLES.payrollArchive, existing.id, payload);
      } else {
        await sbInsert(TABLES.payrollArchive, [payload]);
      }

      for (const loan of AppState.loans.filter((x) => Number(x.remaining_amount || 0) > 0)) {
        const installment = Math.min(
          Number(loan.monthly_installment || 0),
          Number(loan.remaining_amount || 0)
        );
        const remaining = Math.max(0, Number(loan.remaining_amount || 0) - installment);
        await sbUpdate(TABLES.loans, loan.id, { remaining_amount: remaining });
      }

      await this.addLog("اعتماد رواتب شهر", month);
      await loadCoreData();
      await this.saveBackup(`اعتماد رواتب ${month}`);
      App.renderAll();
      openInfoModal("تم", `تم اعتماد رواتب شهر ${month} بنجاح.`);
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر اعتماد رواتب الشهر.");
    }
  }
};

window.Payroll = Payroll;
