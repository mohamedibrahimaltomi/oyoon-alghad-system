const Drivers = {
  getLineById(id) {
    return AppState.lines.find((x) => x.id === id) || null;
  },

  getVehicleById(id) {
    return AppState.vehicles.find((x) => x.id === id) || null;
  },

  lineName(id) {
    return this.getLineById(id)?.name || "-";
  },

  vehicleName(id) {
    return this.getVehicleById(id)?.name || "-";
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

  async saveBackup(reason = "تعديل بيانات السائقين") {
    try {
      const payload = {
        lines: AppState.lines,
        vehicles: AppState.vehicles,
        pricing: AppState.pricing,
        employees: AppState.employees
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

  renderLinesTable() {
    const tbody = $("linesTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.lines.length
      ? AppState.lines.map((item) => `
        <tr>
          <td>${safeText(item.name)}</td>
          <td><button class="btn btn-light" onclick="Drivers.openLineModal('${item.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="2">لا توجد بيانات</td></tr>`;
  },

  renderVehiclesTable() {
    const tbody = $("vehiclesTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.vehicles.length
      ? AppState.vehicles.map((item) => `
        <tr>
          <td>${safeText(item.name)}</td>
          <td><button class="btn btn-light" onclick="Drivers.openVehicleModal('${item.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="2">لا توجد بيانات</td></tr>`;
  },

  renderPricingTable() {
    const tbody = $("pricingTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.pricing.length
      ? AppState.pricing.map((item) => `
        <tr>
          <td>${safeText(this.lineName(item.line_id))}</td>
          <td>${safeText(this.vehicleName(item.vehicle_id))}</td>
          <td>${formatMoney(item.amount)}</td>
          <td><button class="btn btn-light" onclick="Drivers.openPricingModal('${item.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">لا توجد بيانات</td></tr>`;
  },

  buildOptions(items, labelFn, selected = "") {
    return items.map((item) => {
      const label = typeof labelFn === "function" ? labelFn(item) : item[labelFn];
      const isSelected = String(selected || "") === String(item.id) ? "selected" : "";
      return `<option value="${safeText(item.id)}" ${isSelected}>${safeText(label)}</option>`;
    }).join("");
  },

  openLineModal(id = null) {
    const item = id ? this.getLineById(id) : null;

    App.openModal(
      item ? "تعديل خط توزيع" : "إضافة خط توزيع",
      `
      <div class="field">
        <label>اسم الخط</label>
        <input id="f_name" value="${safeText(item?.name || "")}" data-enter-next />
      </div>
      `,
      async () => {
        try {
          const payload = { name: $("f_name").value.trim() };
          if (!payload.name) {
            openInfoModal("تنبيه", "يرجى إدخال اسم الخط.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.lines, item.id, payload);
            await this.addLog("تعديل خط توزيع", payload.name);
          } else {
            await sbInsert(TABLES.lines, [payload]);
            await this.addLog("إضافة خط توزيع", payload.name);
          }

          await loadCoreData();
          await this.saveBackup(item ? "تعديل خط توزيع" : "إضافة خط توزيع");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ الخط.");
        }
      }
    );
  },

  openVehicleModal(id = null) {
    const item = id ? this.getVehicleById(id) : null;

    App.openModal(
      item ? "تعديل نوع سيارة" : "إضافة نوع سيارة",
      `
      <div class="field">
        <label>اسم السيارة</label>
        <input id="f_name" value="${safeText(item?.name || "")}" data-enter-next />
      </div>
      `,
      async () => {
        try {
          const payload = { name: $("f_name").value.trim() };
          if (!payload.name) {
            openInfoModal("تنبيه", "يرجى إدخال اسم السيارة.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.vehicles, item.id, payload);
            await this.addLog("تعديل نوع سيارة", payload.name);
          } else {
            await sbInsert(TABLES.vehicles, [payload]);
            await this.addLog("إضافة نوع سيارة", payload.name);
          }

          await loadCoreData();
          await this.saveBackup(item ? "تعديل نوع سيارة" : "إضافة نوع سيارة");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ السيارة.");
        }
      }
    );
  },

  openPricingModal(id = null) {
    const item = id ? AppState.pricing.find((x) => x.id === id) : null;

    App.openModal(
      item ? "تعديل تسعير خط" : "إضافة تسعير خط",
      `
      <div class="form-grid">
        <div class="field">
          <label>الخط</label>
          <select id="f_line" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.lines, "name", item?.line_id)}
          </select>
        </div>
        <div class="field">
          <label>السيارة</label>
          <select id="f_vehicle" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.vehicles, "name", item?.vehicle_id)}
          </select>
        </div>
        <div class="field">
          <label>المرتب الشهري</label>
          <input id="f_amount" type="number" value="${safeText(item?.amount || 0)}" data-enter-next />
        </div>
      </div>
      `,
      async () => {
        try {
          const payload = {
            line_id: $("f_line").value || null,
            vehicle_id: $("f_vehicle").value || null,
            amount: Number($("f_amount").value || 0)
          };

          if (!payload.line_id || !payload.vehicle_id) {
            openInfoModal("تنبيه", "يرجى اختيار الخط والسيارة.");
            return;
          }

          if (payload.amount <= 0) {
            openInfoModal("تنبيه", "يرجى إدخال مرتب شهري صحيح.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.pricing, item.id, payload);
            await this.addLog("تعديل تسعير خط", `${this.lineName(payload.line_id)} / ${this.vehicleName(payload.vehicle_id)}`);
          } else {
            await sbInsert(TABLES.pricing, [payload]);
            await this.addLog("إضافة تسعير خط", `${this.lineName(payload.line_id)} / ${this.vehicleName(payload.vehicle_id)}`);
          }

          await loadCoreData();
          await this.saveBackup(item ? "تعديل تسعير خط" : "إضافة تسعير خط");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ التسعير.");
        }
      }
    );
  },

  getPricingValue(lineId, vehicleId) {
    return Number(
      AppState.pricing.find((x) => x.line_id === lineId && x.vehicle_id === vehicleId)?.amount || 0
    );
  },

  getReserveLineId() {
    return AppState.lines.find((x) => x.name === "احتياط")?.id || null;
  },

  getDriverMonthlyLineAmount(employee) {
    if (!employee) return 0;
    return this.getPricingValue(employee.line_id, employee.vehicle_id);
  },

  getReserveBaseAmount(employee) {
    if (!employee) return 0;

    const reserveLineId = this.getReserveLineId();
    const reservePricing = reserveLineId
      ? this.getPricingValue(reserveLineId, employee.vehicle_id)
      : 0;

    return reservePricing > 0 ? reservePricing : Number(employee.salary || 0);
  },

  getEmployeeLineVehicleSummary(employeeId) {
    const emp = AppState.employees.find((x) => x.id === employeeId);
    if (!emp) {
      return {
        lineName: "-",
        vehicleName: "-",
        monthlyAmount: 0
      };
    }

    return {
      lineName: this.lineName(emp.line_id),
      vehicleName: this.vehicleName(emp.vehicle_id),
      monthlyAmount: this.getDriverMonthlyLineAmount(emp)
    };
  }
};

window.Drivers = Drivers;
