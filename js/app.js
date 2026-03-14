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
  },

  bindSidebar() {
    document.querySelectorAll(".menu-group-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = $(btn.dataset.target);
        if (!target) return;
        const isOpen = target.classList.contains("open");
        target.classList.toggle("open", !isOpen);
        btn.classList.toggle("open", !isOpen);
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
    $("menuSearchInput")?.addEventListener("input", (e) => {
      const q = String(e.target.value || "").trim().toLowerCase();
      document.querySelectorAll(".menu-btn").forEach((btn) => {
        const text = btn.textContent.trim().toLowerCase();
        btn.style.display = !q || text.includes(q) ? "" : "none";
      });
    });

    $("employeesSearch")?.addEventListener("input", () =>
      Employees?.renderEmployeesTable?.()
    );
    $("attendanceSearch")?.addEventListener("input", () =>
      Attendance?.renderAttendanceTable?.()
    );
    $("attendanceHistorySearch")?.addEventListener("input", () =>
      Attendance?.renderAttendanceHistoryTable?.()
    );
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
    $("exportEmployeesCsvBtn")?.addEventListener("click", () => Reports?.exportEmployeesCSV?.());
    $("exportAttendanceCsvBtn")?.addEventListener("click", () => Reports?.exportAttendanceCSV?.());
    $("exportPayrollCsvBtn")?.addEventListener("click", () => Reports?.exportPayrollCSV?.());
    $("addUserBtn")?.addEventListener("click", () => Employees?.openUserModal?.());
    $("createBackupBtn")?.addEventListener("click", () => Reports?.createBackup?.());
    $("saveSettingsBtn")?.addEventListener("click", () => Payroll?.saveSettings?.());
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
