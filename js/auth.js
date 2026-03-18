const Auth = {
  async login(username, password) {
    hideMessage("loginError");

    if (!username || !password) {
      showMessage("loginError", "يرجى إدخال اسم المستخدم وكلمة المرور.");
      return false;
    }

    try {
      const { data, error } = await sb.rpc("verify_app_user", {
        p_username: username,
        p_password: password
      });

      if (error) {
        console.error(error);
        showMessage("loginError", "تعذر تسجيل الدخول. تحقق من إعدادات قاعدة البيانات.");
        return false;
      }

      if (!data || !data.length) {
        showMessage("loginError", "اسم المستخدم أو كلمة المرور غير صحيحة.");
        return false;
      }

      AppState.currentUser = data[0];
      sessionStorage.setItem("oyoon_current_user", JSON.stringify(AppState.currentUser));
      sessionStorage.setItem("oyoon_login_time", Date.now());

      window.location.href = "/dashboard";
      return true;
    } catch (err) {
      console.error(err);
      showMessage("loginError", "حدث خطأ غير متوقع أثناء تسجيل الدخول.");
      return false;
    }
  },

  restoreSession() {
    try {
      const raw = sessionStorage.getItem("oyoon_current_user");
      const loginTime = sessionStorage.getItem("oyoon_login_time");

      if (!raw || !loginTime) return false;

      const SESSION_LIMIT = 30 * 60 * 1000; // 30 دقيقة

      if (Date.now() - Number(loginTime) > SESSION_LIMIT) {
        sessionStorage.clear();
        return false;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.username) return false;

      AppState.currentUser = parsed;
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  },

  requireSession() {
    if (!this.restoreSession()) {
      window.location.href = "/login";
      return false;
    }

    if ($("currentUserBadge")) {
      $("currentUserBadge").textContent = `${AppState.currentUser.full_name} - ${AppState.currentUser.role}`;
    }

    return true;
  },

  logout() {
    sessionStorage.removeItem("oyoon_current_user");
    sessionStorage.removeItem("oyoon_login_time");
    AppState.currentUser = null;
    window.location.href = "/login";
  },

  refreshSessionActivity() {
    if (sessionStorage.getItem("oyoon_current_user")) {
      sessionStorage.setItem("oyoon_login_time", Date.now());
    }
  },

  bindSessionActivity() {
    const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];

    events.forEach((eventName) => {
      window.addEventListener(
        eventName,
        () => {
          this.refreshSessionActivity();
        },
        { passive: true }
      );
    });
  },

  bindLoginForm() {
    const loginForm = $("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = $("loginUsername")?.value?.trim() || "";
      const password = $("loginPassword")?.value || "";
      await this.login(username, password);
    });
  },

  bindLogout() {
    $("logoutBtn")?.addEventListener("click", () => this.logout());
  },

  bindLoginEnterNavigation() {
    const fields = [$("loginUsername"), $("loginPassword")].filter(Boolean);

    fields.forEach((field, index) => {
      field.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();

        const nextField = fields[index + 1];
        if (nextField) {
          nextField.focus();
          if (typeof nextField.select === "function") nextField.select();
        } else {
          $("loginBtn")?.click();
        }
      });
    });
  }
};

window.Auth = Auth;

window.addEventListener("load", () => {
  if ($("loginForm")) {
    Auth.bindLoginForm();
    Auth.bindLoginEnterNavigation();
  }
});
