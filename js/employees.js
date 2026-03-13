const Employees = {
  getEmployeeTypeById(id) {
    return AppState.employeeTypes.find((x) => x.id === id) || null;
  },

  getDepartmentById(id) {
    return AppState.departments.find((x) => x.id === id) || null;
  },

  getJobById(id) {
    return AppState.jobs.find((x) => x.id === id) || null;
  },

  getLineById(id) {
    return AppState.lines.find((x) => x.id === id) || null;
  },

  getVehicleById(id) {
    return AppState.vehicles.find((x) => x.id === id) || null;
  },

  getEmployeeById(id) {
    return AppState.employees.find((x) => x.id === id) || null;
  },

  employeeTypeName(id) {
    return this.getEmployeeTypeById(id)?.name || "-";
  },

  departmentName(id) {
    return this.getDepartmentById(id)?.name || "-";
  },

  jobName(id) {
    return this.getJobById(id)?.name || "-";
  },

  lineName(id) {
    return this.getLineById(id)?.name || "-";
  },

  vehicleName(id) {
    return this.getVehicleById(id)?.name || "-";
  },

  employeeName(id) {
    return this.getEmployeeById(id)?.name || "-";
  },

  payrollMethodLabel(method) {
    if (method === "driver_line_vehicle") return "حسب الخط والسيارة";
    if (method === "reserve_driver") return "احتياط / بدل سائق";
    return "راتب ثابت";
  },

  statusBadge(status) {
    const map = {
      "نشط": "success",
      "موقوف": "danger",
      "active": "success",
      "inactive": "danger",
      "معلق": "warn"
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

  async saveBackup(reason = "تحديث بيانات الموظفين") {
    try {
      const payload = {
        employeeTypes: AppState.employeeTypes,
        departments: AppState.departments,
        jobs: AppState.jobs,
        employees: AppState.employees,
        users: AppState.users,
        employeeHistory: AppState.employeeHistory
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

  async addHistory(employeeId, changeText) {
    try {
      await sbInsert(TABLES.employeeHistory, [{
        employee_id: employeeId,
        change_text: changeText,
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.error("employee history error", err);
    }
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

  async addDeleteRequest(tableName, itemLabel) {
    try {
      await sbInsert(TABLES.deleteRequests, [{
        table_name: tableName,
        item_label: itemLabel,
        status: "معلق",
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.error("delete request error", err);
    }
  },

  renderEmployeeTypesTable() {
    const tbody = $("employeeTypesTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.employeeTypes.length
      ? AppState.employeeTypes.map((item) => `
        <tr>
          <td>${safeText(item.name)}</td>
          <td>${safeText(this.payrollMethodLabel(item.payroll_method))}</td>
          <td>
            <button class="btn btn-light" onclick="Employees.openEmployeeTypeModal('${item.id}')">تعديل</button>
          </td>
        </tr>
      `).join("")
      : `<tr><td colspan="3">لا توجد بيانات</td></tr>`;
  },

  renderDepartmentsTable() {
    const tbody = $("departmentsTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.departments.length
      ? AppState.departments.map((item) => `
        <tr>
          <td>${safeText(item.name)}</td>
          <td><button class="btn btn-light" onclick="Employees.openDepartmentModal('${item.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="2">لا توجد بيانات</td></tr>`;
  },

  renderJobsTable() {
    const tbody = $("jobsTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.jobs.length
      ? AppState.jobs.map((item) => `
        <tr>
          <td>${safeText(this.departmentName(item.department_id))}</td>
          <td>${safeText(item.name)}</td>
          <td><button class="btn btn-light" onclick="Employees.openJobModal('${item.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="3">لا توجد بيانات</td></tr>`;
  },

  renderEmployeesTable() {
    const tbody = $("employeesTable");
    if (!tbody) return;

    const q = String($("employeesSearch")?.value || "").trim().toLowerCase();

    const rows = AppState.employees.filter((item) => {
      const haystack = [
        item.employee_no,
        item.name,
        this.departmentName(item.department_id),
        this.jobName(item.job_id),
        this.employeeTypeName(item.employee_type_id),
        this.lineName(item.line_id),
        this.vehicleName(item.vehicle_id),
        item.status
      ].join(" ").toLowerCase();

      return !q || haystack.includes(q);
    });

    tbody.innerHTML = rows.length
      ? rows.map((item) => `
        <tr>
          <td>${safeText(item.employee_no)}</td>
          <td>${safeText(item.name)}</td>
          <td>${safeText(this.departmentName(item.department_id))}</td>
          <td>${safeText(this.jobName(item.job_id))}</td>
          <td>${safeText(this.employeeTypeName(item.employee_type_id))}</td>
          <td>${safeText(this.lineName(item.line_id))}</td>
          <td>${safeText(this.vehicleName(item.vehicle_id))}</td>
          <td>${formatMoney(item.salary)}</td>
          <td>${this.statusBadge(item.status)}</td>
          <td><button class="btn btn-light" onclick="Employees.openEmployeeModal('${item.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="10">لا توجد بيانات</td></tr>`;
  },

  renderEmployeeHistoryTable() {
    const tbody = $("employeeHistoryTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.employeeHistory.length
      ? AppState.employeeHistory.map((item) => `
        <tr>
          <td>${safeText(this.employeeName(item.employee_id))}</td>
          <td>${formatDateTime(item.created_at)}</td>
          <td>${safeText(item.change_text)}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="3">لا توجد بيانات</td></tr>`;
  },

  renderUsersTable() {
    const tbody = $("usersTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.users.length
      ? AppState.users.map((item) => `
        <tr>
          <td>${safeText(item.username)}</td>
          <td>${safeText(item.full_name)}</td>
          <td>${safeText(item.role)}</td>
          <td>${this.statusBadge(item.status)}</td>
          <td><button class="btn btn-light" onclick="Employees.openUserModal('${item.id}')">تعديل</button></td>
        </tr>
      `).join("")
      : `<tr><td colspan="5">لا توجد بيانات</td></tr>`;
  },

  renderDeleteRequestsTable() {
    const tbody = $("deleteRequestsTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.deleteRequests.length
      ? AppState.deleteRequests.map((item) => `
        <tr>
          <td>${safeText(item.table_name)}</td>
          <td>${safeText(item.item_label)}</td>
          <td>${this.statusBadge(item.status)}</td>
          <td>${formatDateTime(item.created_at)}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">لا توجد بيانات</td></tr>`;
  },

  renderLogsTable() {
    const tbody = $("logsTable");
    if (!tbody) return;

    tbody.innerHTML = AppState.logs.length
      ? AppState.logs.map((item) => `
        <tr>
          <td>${safeText(item.action)}</td>
          <td>${safeText(item.username)}</td>
          <td>${formatDateTime(item.created_at)}</td>
          <td>${safeText(item.details || "-")}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4">لا توجد بيانات</td></tr>`;
  },

  openEmployeeTypeModal(id = null) {
    const item = id ? this.getEmployeeTypeById(id) : null;

    App.openModal(
      item ? "تعديل نوع موظف" : "إضافة نوع موظف",
      `
      <div class="form-grid">
        <div class="field">
          <label>الاسم</label>
          <input id="f_name" value="${safeText(item?.name || "")}" data-enter-next />
        </div>
        <div class="field">
          <label>طريقة الاحتساب</label>
          <select id="f_method" data-enter-next>
            <option value="fixed_salary">راتب ثابت</option>
            <option value="driver_line_vehicle">حسب الخط والسيارة</option>
            <option value="reserve_driver">احتياط / بدل سائق</option>
          </select>
        </div>
      </div>
      `,
      async () => {
        try {
          const payload = {
            name: $("f_name").value.trim(),
            payroll_method: $("f_method").value
          };

          if (!payload.name) {
            openInfoModal("تنبيه", "يرجى إدخال اسم النوع.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.employeeTypes, item.id, payload);
            await this.addLog("تعديل نوع موظف", payload.name);
          } else {
            await sbInsert(TABLES.employeeTypes, [payload]);
            await this.addLog("إضافة نوع موظف", payload.name);
          }

          await loadCoreData();
          await this.saveBackup("تعديل أنواع الموظفين");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ البيانات.");
        }
      }
    );

    $("f_method").value = item?.payroll_method || "fixed_salary";
  },

  openDepartmentModal(id = null) {
    const item = id ? this.getDepartmentById(id) : null;

    App.openModal(
      item ? "تعديل قسم" : "إضافة قسم",
      `
      <div class="field">
        <label>الاسم</label>
        <input id="f_name" value="${safeText(item?.name || "")}" data-enter-next />
      </div>
      `,
      async () => {
        try {
          const payload = { name: $("f_name").value.trim() };
          if (!payload.name) {
            openInfoModal("تنبيه", "يرجى إدخال اسم القسم.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.departments, item.id, payload);
            await this.addLog("تعديل قسم", payload.name);
          } else {
            await sbInsert(TABLES.departments, [payload]);
            await this.addLog("إضافة قسم", payload.name);
          }

          await loadCoreData();
          await this.saveBackup("تعديل الأقسام");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ البيانات.");
        }
      }
    );
  },

  openJobModal(id = null) {
    const item = id ? this.getJobById(id) : null;

    App.openModal(
      item ? "تعديل وظيفة" : "إضافة وظيفة",
      `
      <div class="form-grid">
        <div class="field">
          <label>القسم</label>
          <select id="f_department" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.departments, "name", item?.department_id)}
          </select>
        </div>
        <div class="field">
          <label>الاسم</label>
          <input id="f_name" value="${safeText(item?.name || "")}" data-enter-next />
        </div>
      </div>
      `,
      async () => {
        try {
          const payload = {
            department_id: $("f_department").value || null,
            name: $("f_name").value.trim()
          };

          if (!payload.name) {
            openInfoModal("تنبيه", "يرجى إدخال اسم الوظيفة.");
            return;
          }

          if (item) {
            await sbUpdate(TABLES.jobs, item.id, payload);
            await this.addLog("تعديل وظيفة", payload.name);
          } else {
            await sbInsert(TABLES.jobs, [payload]);
            await this.addLog("إضافة وظيفة", payload.name);
          }

          await loadCoreData();
          await this.saveBackup("تعديل الوظائف");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ البيانات.");
        }
      }
    );
  },

  openEmployeeModal(id = null) {
    const item = id ? this.getEmployeeById(id) : null;

    App.openModal(
      item ? "تعديل موظف" : "إضافة موظف",
      `
      <div class="form-grid">
        <div class="field">
          <label>الرقم الوظيفي</label>
          <input id="f_employee_no" value="${safeText(item?.employee_no || "")}" data-enter-next />
        </div>
        <div class="field">
          <label>الاسم</label>
          <input id="f_name" value="${safeText(item?.name || "")}" data-enter-next />
        </div>
        <div class="field">
          <label>القسم</label>
          <select id="f_department" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.departments, "name", item?.department_id)}
          </select>
        </div>
        <div class="field">
          <label>الوظيفة</label>
          <select id="f_job" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.jobs, "name", item?.job_id)}
          </select>
        </div>
        <div class="field">
          <label>نوع الموظف</label>
          <select id="f_employee_type" data-enter-next>
            <option value="">اختر</option>
            ${this.buildOptions(AppState.employeeTypes, "name", item?.employee_type_id)}
          </select>
        </div>
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
          <label>الراتب</label>
          <input id="f_salary" type="number" value="${safeText(item?.salary || 0)}" data-enter-next />
        </div>
        <div class="field">
          <label>الحالة</label>
          <select id="f_status" data-enter-next>
            <option value="نشط">نشط</option>
            <option value="موقوف">موقوف</option>
          </select>
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
            employee_no: $("f_employee_no").value.trim(),
            name: $("f_name").value.trim(),
            department_id: $("f_department").value || null,
            job_id: $("f_job").value || null,
            employee_type_id: $("f_employee_type").value || null,
            line_id: $("f_line").value || null,
            vehicle_id: $("f_vehicle").value || null,
            salary: Number($("f_salary").value || 0),
            status: $("f_status").value,
            notes: $("f_notes").value.trim()
          };

          if (!payload.employee_no || !payload.name) {
            openInfoModal("تنبيه", "يرجى إدخال الرقم الوظيفي والاسم.");
            return;
          }

          let savedId = item?.id || null;

          if (item) {
            await sbUpdate(TABLES.employees, item.id, payload);
            await this.addLog("تعديل موظف", `${payload.employee_no} - ${payload.name}`);
            await this.addHistory(item.id, `تم تعديل بيانات الموظف: ${payload.name}`);
          } else {
            const inserted = await sbInsert(TABLES.employees, [payload]);
            savedId = inserted[0]?.id || null;
            await this.addLog("إضافة موظف", `${payload.employee_no} - ${payload.name}`);
            if (savedId) {
              await this.addHistory(savedId, `تمت إضافة الموظف: ${payload.name}`);
            }
          }

          await loadCoreData();
          await this.saveBackup(item ? "تعديل موظف" : "إضافة موظف");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ بيانات الموظف.");
        }
      }
    );

    $("f_status").value = item?.status || "نشط";
  },

  openUserModal(id = null) {
    const item = id ? AppState.users.find((x) => x.id === id) : null;

    App.openModal(
      item ? "تعديل مستخدم" : "إضافة مستخدم",
      `
      <div class="form-grid">
        <div class="field">
          <label>اسم المستخدم</label>
          <input id="f_username" value="${safeText(item?.username || "")}" data-enter-next />
        </div>
        <div class="field">
          <label>الاسم الكامل</label>
          <input id="f_full_name" value="${safeText(item?.full_name || "")}" data-enter-next />
        </div>
        <div class="field">
          <label>الدور</label>
          <select id="f_role" data-enter-next>
            <option value="مدير النظام">مدير النظام</option>
            <option value="HR">HR</option>
            <option value="محاسب">محاسب</option>
            <option value="مشرف">مشرف</option>
            <option value="موظف">موظف</option>
          </select>
        </div>
        <div class="field">
          <label>الحالة</label>
          <select id="f_status" data-enter-next>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
        <div class="field">
          <label>كلمة المرور ${item ? "(اتركها فارغة إذا لم ترد تغييرها)" : ""}</label>
          <input id="f_password" type="password" data-enter-next />
        </div>
      </div>
      `,
      async () => {
        try {
          const payload = {
            p_username: $("f_username").value.trim(),
            p_full_name: $("f_full_name").value.trim(),
            p_role: $("f_role").value,
            p_status: $("f_status").value,
            p_password: $("f_password").value
          };

          if (!payload.p_username || !payload.p_full_name) {
            openInfoModal("تنبيه", "يرجى إدخال اسم المستخدم والاسم الكامل.");
            return;
          }

          if (item) {
            const { error } = await sb.rpc("update_app_user", {
              p_id: item.id,
              ...payload
            });
            if (error) throw error;
            await this.addLog("تعديل مستخدم", payload.p_username);
          } else {
            if (!payload.p_password) {
              openInfoModal("تنبيه", "يرجى إدخال كلمة المرور للمستخدم الجديد.");
              return;
            }
            const { error } = await sb.rpc("create_app_user", payload);
            if (error) throw error;
            await this.addLog("إضافة مستخدم", payload.p_username);
          }

          await loadCoreData();
          await this.saveBackup(item ? "تعديل مستخدم" : "إضافة مستخدم");
          App.renderAll();
          App.closeModal();
        } catch (err) {
          console.error(err);
          openInfoModal("خطأ", err.message || "تعذر حفظ بيانات المستخدم.");
        }
      }
    );

    $("f_role").value = item?.role || "موظف";
    $("f_status").value = item?.status || "active";
  }
};

window.Employees = Employees;
