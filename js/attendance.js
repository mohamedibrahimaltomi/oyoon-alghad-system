const Attendance = {
  getEmployeeById(id) {
    return AppState.employees.find((x) => x.id === id) || null;
  },

  getLineById(id) {
    return AppState.lines.find((x) => x.id === id) || null;
  },

  getVehicleById(id) {
    return AppState.vehicles.find((x) => x.id === id) || null;
  },

  employeeName(id) {
    return this.getEmployeeById(id)?.name || "-";
  },

  employeeNo(id) {
    return this.getEmployeeById(id)?.employee_no || "-";
  },

  lineName(id) {
    return this.getLineById(id)?.name || "-";
  },

  vehicleName(id) {
    return this.getVehicleById(id)?.name || "-";
  },

  statusBadge(status) {
    const map = {
      "حضور": "success",
      "غياب": "danger",
      "تأخير": "warn",
      "إجازة": "info"
    };
    const cls = map[status] || "info";
    return `<span class="status-pill ${cls}">${safeText(status)}</span>`;
  },

  buildOptions(items, labelFn, selected = "") {
    return items.map((item) => {
      const label = typeof labelFn === "function" ? labelFn(item) : item[labelFn];
      const isSelected = String(selected || "") === String(item.id) ? "selected" : "";
      return `<option value="${safeText(item.id)}" ${isSelected}>${safeText(label)}</option>`;
    }).join("");
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

  async saveBackup(reason = "تعديل بيانات الحضور") {
    try {
      const payload = {
        attendance: AppState.attendance,
        leaveRequests: AppState.leaveRequests,
        fingerprintPreviewRows: AppState.fingerprintPreviewRows
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

  getSettingText(key, fallback = "") {
    return AppState.settings.find((x) => x.key === key)?.value_text ?? fallback;
  },

  parseTimeToMinutes(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  },

  calculateLateMinutes(checkIn) {
    const startTime = this.getSettingText("work_start_time", "08:00");
    const start = this.parseTimeToMinutes(startTime);
    const actual = this.parseTimeToMinutes(checkIn);
    if (start == null || actual == null) return 0;
    return Math.max(0, actual - start);
  },

  renderAttendanceTable() {
    const tbody = $("attendanceTable");
    if (!tbody) return;

    const q = String($("attendanceSearch")?.value || "").trim().toLowerCase();

    const rows = [...AppState.attendance]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .filter((row) => {
        const hay = [
          row.date,
          this.employeeName(row.employee_id),
          this.employeeNo(row.employee_id),
          row.status,
          row.check_in,
          this.lineName(row.actual_line_id),
          this.vehicleName(row.actual_vehicle_id)
        ].join(" ").toLowerCase();
        return !q || hay.includes(q);
      });

    tbody.innerHTML = rows.length
      ? rows.map((row) => `
        <tr>
          <td>${safeText(row.date)}</td>
          <td>${safeText(this.employeeName(row.employee_id))}</td>
          <td>${this.statusBadge(row.status)}</td>
          <td>${safeText(row.check_in || "-")}</td>
          <td>${safeText(row.late_minutes || 0)}</td>
          <td>${row.reserve_replacement ? "نعم" : "لا"}</td>
          <td>${safeText(this.lineName(row.actual_line_id))}</td>
          <td>${safeText(this.vehicleName(row.actual_vehicle_id))}</td>
          <td><button class="btn btn-light" onclick="Attendance.openAttendanceModal('${row.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="9">لا توجد بيانات</td></tr>`;
  },

  renderAttendanceHistoryTable() {
    const tbody = $("attendanceHistoryTable");
    if (!tbody) return;

    const q = String($("attendanceHistorySearch")?.value || "").trim().toLowerCase();

    const rows = [...AppState.attendance]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .filter((row) => {
        const hay = [
          this.employeeName(row.employee_id),
          this.employeeNo(row.employee_id),
          row.date,
          row.status,
          row.late_minutes
        ].join(" ").toLowerCase();
        return !q || hay.includes(q);
      });

    tbody.innerHTML = rows.length
      ? rows.map((row) => `
        <tr>
          <td>${safeText(this.employeeName(row.employee_id))}</td>
          <td>${safeText(row.date)}</td>
          <td>${safeText(row.status)}</td>
          <td>${safeText(row.late_minutes || 0)}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">لا توجد بيانات</td></tr>`;
  },

  renderLeaveTable() {
    const tbody = $("leaveTable");
    if (!tbody) return;

    const rows = [...AppState.leaveRequests].sort((a, b) => String(b.from_date).localeCompare(String(a.from_date)));

    tbody.innerHTML = rows.length
      ? rows.map((row) => `
        <tr>
          <td>${safeText(this.employeeName(row.employee_id))}</td>
          <td>${safeText(row.leave_type)}</td>
          <td>${safeText(row.from_date)}</td>
          <td>${safeText(row.to_date)}</td>
          <td>${safeText(row.notes || "-")}</td>
          <td><button class="btn btn-light" onclick="Attendance.openLeaveModal('${row.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="6">لا توجد بيانات</td></tr>`;
  },

  openAttendanceModal(id = null) {
    const item = id ? AppState.attendance.find((x) => x.id === id) : null;

    App.openModal(
      item ? "تعديل حضور" : "إضافة حضور",
      `
      <div class="form-grid">
        <div class="field">
          <label>الموظف</label>
          <select id="f_employee" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.employees, (x) => `${x.employee_no} - ${x.name}`, item?.employee_id)}
          </select>
        </div>
        <div class="field">
          <label>التاريخ</label>
          <input id="f_date" type="date" value="${safeText(item?.date || todayISO())}" data-enter-next />
        </div>
        <div class="field">
          <label>الحالة</label>
          <select id="f_status" data-enter-next>
            <option value="حضور">حضور</option>
            <option value="غياب">غياب</option>
            <option value="تأخير">تأخير</option>
            <option value="إجازة">إجازة</option>
          </select>
        </div>
        <div class="field">
          <label>وقت الدخول</label>
          <input id="f_check_in" type="time" value="${safeText(item?.check_in || "")}" data-enter-next />
        </div>
        <div class="field">
          <label>بدل احتياط</label>
          <select id="f_reserve_replacement" data-enter-next>
            <option value="false">لا</option>
            <option value="true">نعم</option>
          </select>
        </div>
        <div class="field">
          <label>الخط الفعلي</label>
          <select id="f_actual_line" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.lines, "name", item?.actual_line_id)}
          </select>
        </div>
        <div class="field">
          <label>السيارة الفعلية</label>
          <select id="f_actual_vehicle" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.vehicles, "name", item?.actual_vehicle_id)}
          </select>
        </div>
      </div>
      `,
      async () => {
        try {
          const checkIn = $("f_check_in").value || null;
          const status = $("f_status").value;
          const payload = {
            employee_id: $("f_employee").value || null,
            date: $("f_date").value,
            status,
            check_in: checkIn,
            late_minutes: status === "تأخير" || checkIn ? this.calculateLateMinutes(checkIn) : 0,
            reserve_replacement: $("f_reserve_replacement").value === "true",
            actual_line_id: $("f_actual_line").value || null,
            actual_vehicle_id: $("f_actual_vehicle").value || null
          };

          if (!payload.employee_id || !payload.date) {
            openInfoModal("تنبيه", "يرجى اختيار الموظف والتاريخ.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.attendance, item.id, payload);
            await this.addLog("تعديل حضور", `${this.employeeName(payload.employee_id)} - ${payload.date}`);
          } else {
            await sbInsert(TABLES.attendance, [payload]);
            await this.addLog("إضافة حضور", `${this.employeeName(payload.employee_id)} - ${payload.date}`);
          }

          await loadCoreData();
          await this.saveBackup(item ? "تعديل حضور" : "إضافة حضور");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ سجل الحضور.");
        }
      }
    );

    $("f_status").value = item?.status || "حضور";
    $("f_reserve_replacement").value = String(item?.reserve_replacement || false);
  },

  openLeaveModal(id = null) {
    const item = id ? AppState.leaveRequests.find((x) => x.id === id) : null;

    App.openModal(
      item ? "تعديل إجازة" : "إضافة إجازة",
      `
      <div class="form-grid">
        <div class="field">
          <label>الموظف</label>
          <select id="f_employee" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.employees, (x) => `${x.employee_no} - ${x.name}`, item?.employee_id)}
          </select>
        </div>
        <div class="field">
          <label>نوع الإجازة</label>
          <input id="f_leave_type" value="${safeText(item?.leave_type || "إجازة")}" data-enter-next />
        </div>
        <div class="field">
          <label>من</label>
          <input id="f_from_date" type="date" value="${safeText(item?.from_date || todayISO())}" data-enter-next />
        </div>
        <div class="field">
          <label>إلى</label>
          <input id="f_to_date" type="date" value="${safeText(item?.to_date || todayISO())}" data-enter-next />
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
            leave_type: $("f_leave_type").value.trim(),
            from_date: $("f_from_date").value,
            to_date: $("f_to_date").value,
            notes: $("f_notes").value.trim()
          };

          if (!payload.employee_id || !payload.from_date || !payload.to_date) {
            openInfoModal("تنبيه", "يرجى إدخال البيانات المطلوبة.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.leaveRequests, item.id, payload);
            await this.addLog("تعديل إجازة", `${this.employeeName(payload.employee_id)} - ${payload.from_date}`);
          } else {
            await sbInsert(TABLES.leaveRequests, [payload]);
            await this.addLog("إضافة إجازة", `${this.employeeName(payload.employee_id)} - ${payload.from_date}`);
          }

          await loadCoreData();
          await this.saveBackup(item ? "تعديل إجازة" : "إضافة إجازة");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ الإجازة.");
        }
      }
    );
  },

  normalizeImportedValue(value) {
    if (value == null) return "";
    return String(value).trim();
  },

  rowValue(obj, names) {
    for (const key of Object.keys(obj || {})) {
      const low = String(key).trim().toLowerCase();
      if (names.includes(low)) return obj[key];
    }
    return "";
  },

  async previewFingerprintImport() {
    try {
      const file = $("fingerprintFile")?.files?.[0];
      if (!file) {
        openInfoModal("تنبيه", "يرجى اختيار ملف Excel أو CSV أولاً.");
        return;
      }

      let rows = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const workbook = XLSX.read(text, { type: "string" });
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
      } else {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
      }

      AppState.fingerprintPreviewRows = rows.map((row) => {
        const employeeNo = this.normalizeImportedValue(
          this.rowValue(row, ["employee_no", "employee no", "emp no", "رقم", "الرقم الوظيفي", "user id", "code"])
        );
        const date = this.normalizeImportedValue(
          this.rowValue(row, ["date", "التاريخ"])
        );
        const checkIn = this.normalizeImportedValue(
          this.rowValue(row, ["time", "check_in", "check in", "وقت الدخول", "in"])
        );

        const employee = AppState.employees.find(
          (x) => String(x.employee_no).trim() === employeeNo
        );

        const late = this.calculateLateMinutes(checkIn);
        const status = late > 0 ? "تأخير" : "حضور";

        return {
          employeeNo,
          employeeId: employee?.id || null,
          date,
          checkIn,
          lateMinutes: late,
          status,
          matched: Boolean(employee?.id && date)
        };
      });

      const tbody = $("fingerprintPreviewTable");
      if (tbody) {
        tbody.innerHTML = AppState.fingerprintPreviewRows.length
          ? AppState.fingerprintPreviewRows.map((row) => `
            <tr>
              <td>${safeText(row.employeeNo)}</td>
              <td>${safeText(row.date)}</td>
              <td>${safeText(row.checkIn)}</td>
              <td>${safeText(row.lateMinutes)}</td>
              <td>${safeText(row.status)}</td>
              <td>${row.matched ? '<span class="status-pill success">مطابق</span>' : '<span class="status-pill danger">غير مطابق</span>'}</td>
            </tr>
          `).join("")
          : `<tr><td colspan="6">لا توجد بيانات</td></tr>`;
      }
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر قراءة ملف البصمة.");
    }
  },

  async importFingerprintRows() {
    try {
      if (!AppState.fingerprintPreviewRows.length) {
        openInfoModal("تنبيه", "يرجى معاينة الملف أولاً.");
        return;
      }

      const validRows = AppState.fingerprintPreviewRows
        .filter((row) => row.matched)
        .map((row) => ({
          employee_id: row.employeeId,
          date: row.date,
          status: row.status,
          check_in: row.checkIn || null,
          late_minutes: Number(row.lateMinutes || 0),
          reserve_replacement: false,
          actual_line_id: null,
          actual_vehicle_id: null
        }));

      if (!validRows.length) {
        openInfoModal("تنبيه", "لا توجد صفوف صالحة للاستيراد.");
        return;
      }

      await sbInsert(TABLES.attendance, validRows);
      await this.addLog("استيراد بصمة", `${validRows.length} سجل`);

      await loadCoreData();
      await this.saveBackup("استيراد بصمة");
      App.renderAll();
      openInfoModal("تم", `تم استيراد ${validRows.length} سجل حضور بنجاح.`);
    } catch (err) {
      console.error(err);
      openInfoModal("خطأ", err.message || "تعذر استيراد بيانات البصمة.");
    }
  }
};

window.Attendance = Attendance;
