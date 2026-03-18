const App = {
  currentModalSave: null,

  init() {
    if (!Auth.requireSession()) return;

    Auth.bindSessionActivity();

    if (window.Branding) Branding.applyBranding();

    this.bindSidebar();
    this.bindTheme();
    this.bindNotifications();
    this.bindModal();
    this.bindGlobalSearch();
    this.bindSectionButtons();
    this.bindLiveClock();

    Auth.bindLogout();

    loadCoreData()
      .then(() => {
        this.applyPermissions();
        this.renderAll();
      })
      .catch((err) => {
        console.error(err);
        openInfoModal("خطأ", "تعذر تحميل البيانات.");
      });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch((err) => {
        console.error("service worker register error", err);
      });
    }

    if ($("payrollChart") && typeof Chart !== "undefined") {
      if (AppState.payrollChart) AppState.payrollChart.destroy();
      const archives = [...(AppState.payrollArchive || [])].sort((a,b)=>String(a.month).localeCompare(String(b.month))).slice(-6);
      AppState.payrollChart = new Chart($("payrollChart"), {
        type: "line",
        data: {
          labels: archives.map(x => x.month),
          datasets: [{
            label: "إجمالي الرواتب",
            data: archives.map(x => (x.rows || []).reduce((sum, row) => sum + Number(row.net || 0), 0)),
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.12)",
            fill: true,
            tension: 0.35
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  },

  bindSidebar() {
    document.querySelectorAll(".menu-group-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = $(btn.dataset.target);
        if (!target) return;
        const isOpen = target.classList.contains("open");
        target.classList.toggle("open", !isOpen);
        btn.classList.toggle("open", !isOpen);
        btn.setAttribute("aria-expanded", String(!isOpen));
      });
    });

    document.querySelectorAll(".menu-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sectionId = btn.dataset.section;
        if (!sectionId) return;
        this.showSection(sectionId, btn.textContent.trim());
      });
    });

    $("sidebarCollapseBtn")?.addEventListener("click", () => {
      document.querySelector(".sidebar")?.classList.toggle("collapsed");
    });
  },

  bindTheme() {
    if (localStorage.getItem("oyoon_theme") === "light") {
      document.body.classList.add("light-mode");
    }

    $("darkModeBtn")?.addEventListener("click", () => {
      document.body.classList.toggle("light-mode");
      localStorage.setItem(
        "oyoon_theme",
        document.body.classList.contains("light-mode") ? "light" : "dark"
      );
    });
  },

  bindNotifications() {
    $("notifyBtn")?.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        openInfoModal("تنبيه", "المتصفح لا يدعم الإشعارات.");
        return;
      }
      const permission = await Notification.requestPermission();
      openInfoModal(
        "الإشعارات",
        permission === "granted"
          ? "تم تفعيل الإشعارات بنجاح."
          : "لم يتم تفعيل الإشعارات."
      );
    });
  },

  bindModal() {
    $("closeModalBtn")?.addEventListener("click", () => this.closeModal());
    $("cancelModalBtn")?.addEventListener("click", () => this.closeModal());
    $("appModal")?.addEventListener("click", (e) => {
      if (e.target.id === "appModal") this.closeModal();
    });
  },

  bindGlobalSearch() {
    const buildResults = (query) => {
      const q = String(query || "").trim().toLowerCase();
      if (!q) return [];

      const pushRows = (type, rows, labelFn, sectionId) =>
        rows
          .filter((row) => String(labelFn(row)).toLowerCase().includes(q))
          .slice(0, 8)
          .map((row) => ({ type, label: labelFn(row), sectionId }));

      const results = [
        ...pushRows("موظف", AppState.employees, (x) => `${x.employee_no || ""} ${x.name || ""}`, "employeesSection"),
        ...pushRows("قسم", AppState.departments, (x) => x.name || "", "departmentsSection"),
        ...pushRows("وظيفة", AppState.jobs, (x) => x.name || "", "jobsSection"),
        ...pushRows("خط", AppState.lines, (x) => x.name || "", "linesSection"),
        ...pushRows("مركبة", AppState.vehicles, (x) => x.name || "", "vehiclesSection"),
        ...pushRows("سلفة/دين", AppState.loans, (x) => `${Employees?.employeeName?.(x.employee_id) || "-"} ${x.type || ""}`, "loansSection"),
        ...pushRows("حضور", AppState.attendance, (x) => `${Attendance?.employeeName?.(x.employee_id) || "-"} ${x.date || ""}`, "attendanceSection"),
        ...pushRows("راتب", Payroll?.buildPayrollRows?.(currentMonthValue()) || [], (x) => `${x.employeeName || ""} ${x.net || ""}`, "payrollSection"),
        ...pushRows("مستخدم", AppState.users, (x) => `${x.username || ""} ${x.full_name || ""}`, "usersSection")
      ].slice(0, 20);

      return results;
    };

    const menuSearch = $("menuSearchInput");
    const globalSearch = $("globalSearchInput");

    const renderSearchResults = (query) => {
      const target = $("globalSearchResults");
      if (!target) return;
      const results = buildResults(query);
      target.innerHTML = results.length
        ? results.map((row) => `<button class="search-result-item" data-section="${row.sectionId}"><strong>${safeText(row.type)}</strong><span>${safeText(row.label)}</span></button>`).join("")
        : (String(query || "").trim() ? `<div class="info-box">لا توجد نتائج مطابقة.</div>` : "");
      target.querySelectorAll("[data-section]").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.showSection(btn.dataset.section, btn.textContent.trim());
          target.innerHTML = "";
          if (globalSearch) globalSearch.value = "";
        });
      });
    };

    menuSearch?.addEventListener("input", (e) => {
      const q = String(e.target.value || "").trim().toLowerCase();
      document.querySelectorAll(".menu-btn").forEach((btn) => {
        const text = btn.textContent.trim().toLowerCase();
        btn.style.display = !q || text.includes(q) ? "" : "none";
      });
    });

    globalSearch?.addEventListener("input", (e) => renderSearchResults(e.target.value));

    $("employeesSearch")?.addEventListener("input", () => Employees?.renderEmployeesTable?.());
    $("attendanceSearch")?.addEventListener("input", () => Attendance?.renderAttendanceTable?.());
    $("attendanceHistorySearch")?.addEventListener("input", () => Attendance?.renderAttendanceHistoryTable?.());
  },

  bindSectionButtons() {
    $("addEmployeeBtn")?.addEventListener("click", () => Employees?.openEmployeeModal?.());
    $("addEmployeeTypeBtn")?.addEventListener("click", () => Employees?.openEmployeeTypeModal?.());
    $("addDepartmentBtn")?.addEventListener("click", () => Employees?.openDepartmentModal?.());
    $("addJobBtn")?.addEventListener("click", () => Employees?.openJobModal?.());
    $("addLineBtn")?.addEventListener("click", () => Drivers?.openLineModal?.());
    $("addVehicleBtn")?.addEventListener("click", () => Drivers?.openVehicleModal?.());
    $("addPricingBtn")?.addEventListener("click", () => Drivers?.openPricingModal?.());
    $("addAttendanceBtn")?.addEventListener("click", () => Attendance?.openAttendanceModal?.());
    $("addLeaveBtn")?.addEventListener("click", () => Attendance?.openLeaveModal?.());
    $("previewFingerprintBtn")?.addEventListener("click", () => Attendance?.previewFingerprintImport?.());
    $("importFingerprintBtn")?.addEventListener("click", () => Attendance?.importFingerprintRows?.());
    $("addLoanBtn")?.addEventListener("click", () => Payroll?.openLoanModal?.());
    $("addAdjustmentBtn")?.addEventListener("click", () => Payroll?.openAdjustmentModal?.());
    $("refreshPayrollBtn")?.addEventListener("click", () => Payroll?.renderPayrollTable?.());
    $("approvePayrollBtn")?.addEventListener("click", () => Payroll?.approvePayrollMonth?.());
    $("exportPayrollPdfBtn")?.addEventListener("click", () => Reports?.exportPayrollPDF?.());
    $("exportPayrollMonthPdfBtn")?.addEventListener("click", () => {
      const month = $("payrollMonth")?.value || currentMonthValue();
      Reports?.exportPayrollMonthPDF?.(month);
    });
    $("exportPayrollXlsxBtn")?.addEventListener("click", () => {
      const month = $("payrollMonth")?.value || currentMonthValue();
      Reports?.exportPayrollExcel?.(month);
    });
    $("printAllPayslipsBtn")?.addEventListener("click", () => {
      const month = $("payrollMonth")?.value || currentMonthValue();
      Reports?.exportAllEmployeePaySlips?.(month);
    });
    $("exportEmployeesCsvBtn")?.addEventListener("click", () => Reports?.exportEmployeesCSV?.());
    $("exportAttendanceCsvBtn")?.addEventListener("click", () => Reports?.exportAttendanceCSV?.());
    $("exportPayrollCsvBtn")?.addEventListener("click", () => Reports?.exportPayrollCSV?.());
    $("addUserBtn")?.addEventListener("click", () => Employees?.openUserModal?.());
    $("createBackupBtn")?.addEventListener("click", () => Reports?.createBackup?.());
    $("restoreBackupBtn")?.addEventListener("click", () => Reports?.restoreBackupFile?.($("restoreBackupFile")?.files?.[0]));
    $("saveSettingsBtn")?.addEventListener("click", () => Payroll?.saveSettings?.());
    $("saveCompanySettingsBtn")?.addEventListener("click", () => Branding?.bindControls?.());
    $("exportAbsenceReportBtn")?.addEventListener("click", () => Reports?.exportAbsenceReport?.($("payrollMonth")?.value || currentMonthValue()));
    $("exportAttendanceMonthlyBtn")?.addEventListener("click", () => Reports?.exportAttendanceMonthlyReport?.($("payrollMonth")?.value || currentMonthValue()));
    $("exportLoansReportBtn")?.addEventListener("click", () => Reports?.exportLoansReport?.());
    $("exportEmployeesByDepartmentBtn")?.addEventListener("click", () => Reports?.exportEmployeesByDepartmentReport?.());
    $("exportDriversByLineBtn")?.addEventListener("click", () => Reports?.exportDriversByLineReport?.());
  },

  bindLiveClock() {
    const renderTime = () => {
      if ($("liveDateTime")) $("liveDateTime").textContent = formatDateTime(new Date());
    };
    renderTime();
    setInterval(renderTime, 1000);
  },

  showSection(sectionId, title = "") {
    if (!userCanAccess(sectionId)) {
      openInfoModal("رفض الوصول", "ليست لديك صلاحية لفتح هذه الصفحة.");
      return;
    }

    document.querySelectorAll(".page-section").forEach((section) =>
      section.classList.remove("active")
    );

    document.querySelectorAll(".menu-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.section === sectionId) btn.classList.add("active");
    });

    $(sectionId)?.classList.add("active");
    if ($("currentSectionTitle")) $("currentSectionTitle").textContent = title || "النظام";
  },

  applyPermissions() {
    document.querySelectorAll(".menu-btn").forEach((btn) => {
      const sectionId = btn.dataset.section;
      btn.style.display = userCanAccess(sectionId) ? "" : "none";
    });
  },

  openModal(title, bodyHtml, onSave = null) {
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = bodyHtml;
    $("appModal").classList.remove("hidden");
    this.currentModalSave = onSave;
    $("saveModalBtn").onclick = () => {
      if (typeof this.currentModalSave === "function") this.currentModalSave();
    };
    this.bindEnterNavigation($("modalBody"));
  },

  closeModal() {
    $("appModal").classList.add("hidden");
    $("modalTitle").textContent = "نموذج";
    $("modalBody").innerHTML = "";
    this.currentModalSave = null;
  },

  bindEnterNavigation(container = document) {
    const fields = Array.from(
      container.querySelectorAll("input[data-enter-next], select[data-enter-next], textarea[data-enter-next]")
    );

    fields.forEach((field, index) => {
      field.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        if (field.tagName.toLowerCase() === "textarea") return;
        e.preventDefault();

        const next = fields[index + 1];
        if (next) {
          next.focus();
          if (typeof next.select === "function") next.select();
        } else if (!$("appModal").classList.contains("hidden")) {
          $("saveModalBtn")?.focus();
        }
      });
    });
  },

  renderDashboard() {
    const today = todayISO();
    const todayRows = AppState.attendance.filter((x) => x.date === today);
    const month = currentMonthValue();
    const payrollRows = window.Payroll?.buildPayrollRows ? Payroll.buildPayrollRows(month) : [];
    const monthPayrollTotal = payrollRows.reduce((sum, row) => sum + Number(row.net || 0), 0);
    const remainingLoansTotal = AppState.loans.reduce((sum, loan) => sum + Number(loan.remaining_amount || 0), 0);
    const presentToday = todayRows.filter((x) => ["حضور", "تأخير", "إجازة"].includes(x.status)).length;
    const lateToday = todayRows.filter((x) => x.status === "تأخير").length;
    const absenceToday = todayRows.filter((x) => x.status === "غياب").length;

    if ($("employeesCount")) $("employeesCount").textContent = AppState.employees.length;
    if ($("todayAttendance")) $("todayAttendance").textContent = todayRows.filter((x) => x.status === "حضور").length;
    if ($("todayAbsence")) $("todayAbsence").textContent = absenceToday;
    if ($("todayLate")) $("todayLate").textContent = lateToday;
    if ($("monthPayrollTotal")) $("monthPayrollTotal").textContent = formatMoney(monthPayrollTotal);
    if ($("dashboardPresentToday")) $("dashboardPresentToday").textContent = presentToday;
    if ($("dashboardLateToday")) $("dashboardLateToday").textContent = lateToday;
    if ($("remainingLoansTotal")) $("remainingLoansTotal").textContent = formatMoney(remainingLoansTotal);
    if ($("absenceAlertCount")) $("absenceAlertCount").textContent = absenceToday;

    const topLateEmployees = [...AppState.employees].map((emp) => {
      const lateRows = AppState.attendance.filter((x) => x.employee_id === emp.id && String(x.date).startsWith(month) && x.status === "تأخير");
      return { name: emp.name, count: lateRows.length };
    }).filter((x) => x.count > 0).sort((a,b) => b.count - a.count).slice(0, 5);

    const inactiveEmployees = AppState.employees.filter((x) => String(x.status || "").trim() !== "نشط").slice(0, 5);
    const executiveAlerts = [];
    if (absenceToday > 0) executiveAlerts.push(`يوجد ${absenceToday} موظفين غائبين اليوم`);
    if (lateToday > 0) executiveAlerts.push(`يوجد ${lateToday} موظفين متأخرين اليوم`);
    if (remainingLoansTotal > 0) executiveAlerts.push(`إجمالي السلف المتبقية ${formatMoney(remainingLoansTotal)}`);
    if (!AppState.payrollArchive.some((x) => x.month === month)) executiveAlerts.push("لم يتم اعتماد رواتب هذا الشهر بعد");

    if ($("topLateEmployeesList")) {
      $("topLateEmployeesList").innerHTML = topLateEmployees.length
        ? topLateEmployees.map((x) => `<li><span>${safeText(x.name)}</span><strong>${x.count}</strong></li>`).join("")
        : `<li class="muted-item">لا يوجد تأخير متكرر هذا الشهر</li>`;
    }

    if ($("inactiveEmployeesList")) {
      $("inactiveEmployeesList").innerHTML = inactiveEmployees.length
        ? inactiveEmployees.map((x) => `<li><span>${safeText(x.name)}</span><strong>${safeText(x.status || "-")}</strong></li>`).join("")
        : `<li class="muted-item">لا يوجد موظفون موقوفون أو غير نشطين</li>`;
    }

    if ($("executiveAlertsList")) {
      $("executiveAlertsList").innerHTML = executiveAlerts.length
        ? executiveAlerts.map((t) => `<li>${safeText(t)}</li>`).join("")
        : `<li class="muted-item">لا توجد تنبيهات تنفيذية حالياً</li>`;
    }

    const alerts = [];
    if (todayRows.some((x) => x.status === "غياب")) {
      alerts.push('<div class="alert-item danger">يوجد غياب اليوم</div>');
    }
    if (todayRows.some((x) => x.status === "تأخير")) {
      alerts.push('<div class="alert-item warn">يوجد تأخير اليوم</div>');
    }
    if (AppState.deleteRequests.some((x) => x.status === "معلق")) {
      alerts.push('<div class="alert-item warn">يوجد طلبات حذف معلقة</div>');
    }
    if (!alerts.length) {
      alerts.push('<div class="alert-item success">لا توجد تنبيهات حالياً</div>');
    }
    if ($("dashboardAlerts")) $("dashboardAlerts").innerHTML = alerts.join("");

    if ($("employeesCountExec")) $("employeesCountExec").textContent = AppState.employees.length;
    if ($("monthPayrollTotalExec")) $("monthPayrollTotalExec").textContent = formatMoney(monthPayrollTotal);
    if ($("todayAbsenceExec")) $("todayAbsenceExec").textContent = absenceToday;
    if ($("topDeductionsExec")) $("topDeductionsExec").textContent = formatMoney(Math.max(...payrollRows.map((x)=>Number(x.lateDeduction||0)+Number(x.repeatDeduction||0)+Math.max(0,-Number(x.monthlyEffects||0))+Number(x.adminAdjustment||0)),0));
    if ($("topLateExec")) $("topLateExec").textContent = topLateEmployees[0]?.name || "-";
    if ($("inactiveExec")) $("inactiveExec").textContent = inactiveEmployees.length;

    if ($("topLateEmployeesListExec")) $("topLateEmployeesListExec").innerHTML = $("topLateEmployeesList")?.innerHTML || `<li class="muted-item">لا يوجد</li>`;
    if ($("inactiveEmployeesListExec")) $("inactiveEmployeesListExec").innerHTML = $("inactiveEmployeesList")?.innerHTML || `<li class="muted-item">لا يوجد</li>`;
    if ($("executiveAlertsListExec")) $("executiveAlertsListExec").innerHTML = $("executiveAlertsList")?.innerHTML || `<li class="muted-item">لا يوجد</li>`;

    if ($("attendanceChart") && typeof Chart !== "undefined") {
      if (AppState.attendanceChart) AppState.attendanceChart.destroy();

      AppState.attendanceChart = new Chart($("attendanceChart"), {
        type: "bar",
        data: {
          labels: ["حضور", "غياب", "تأخير"],
          datasets: [
            {
              label: "إحصائيات اليوم",
              data: [
                todayRows.filter((x) => x.status === "حضور").length,
                todayRows.filter((x) => x.status === "غياب").length,
                todayRows.filter((x) => x.status === "تأخير").length
              ]
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    if ($("payrollChart") && typeof Chart !== "undefined") {
      if (AppState.payrollChart) AppState.payrollChart.destroy();
      const archives = [...(AppState.payrollArchive || [])].sort((a,b)=>String(a.month).localeCompare(String(b.month))).slice(-6);
      AppState.payrollChart = new Chart($("payrollChart"), {
        type: "line",
        data: {
          labels: archives.map(x => x.month),
          datasets: [{
            label: "إجمالي الرواتب",
            data: archives.map(x => (x.rows || []).reduce((sum, row) => sum + Number(row.net || 0), 0)),
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.12)",
            fill: true,
            tension: 0.35
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  },

  renderAll() {
    this.renderDashboard();
    Employees?.renderEmployeeTypesTable?.();
    Employees?.renderDepartmentsTable?.();
    Employees?.renderJobsTable?.();
    Employees?.renderEmployeesTable?.();
    Employees?.renderEmployeeHistoryTable?.();
    Employees?.renderUsersTable?.();
    Employees?.renderDeleteRequestsTable?.();
    Employees?.renderLogsTable?.();
    Drivers?.renderLinesTable?.();
    Drivers?.renderVehiclesTable?.();
    Drivers?.renderPricingTable?.();
    Attendance?.renderAttendanceTable?.();
    Attendance?.renderAttendanceHistoryTable?.();
    Attendance?.renderLeaveTable?.();
    Payroll?.renderLoansTable?.();
    Payroll?.renderAdjustmentsTable?.();
    Payroll?.renderPayrollTable?.();
    Payroll?.renderPayrollArchiveTable?.();
    Payroll?.renderSettings?.();
    Reports?.renderReportsFilters?.();
    Reports?.renderBackupsTable?.();
  }
};

window.App = App;
window.addEventListener("load", () => App.init());
