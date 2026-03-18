const Branding = {
  logoKey: "oyoon_brand_logo",
  settingsKey: "oyoon_company_settings",
  defaultLogo: "assets/logo/company-default.png",
  defaults: {
    name: "شركة عيون الغد",
    subtitle: "نظام إدارة الموارد البشرية",
    address: "",
    phone: "",
    signature: "اعتماد الإدارة",
    seal: ""
  },

  getLogo() {
    return localStorage.getItem(this.logoKey) || this.defaultLogo;
  },

  getSettings() {
    try {
      return { ...this.defaults, ...(JSON.parse(localStorage.getItem(this.settingsKey) || "{}")) };
    } catch {
      return { ...this.defaults };
    }
  },

  saveSettings(data) {
    const merged = { ...this.getSettings(), ...data };
    localStorage.setItem(this.settingsKey, JSON.stringify(merged));
    this.applyBranding();
  },

  setLogo(dataUrl) {
    localStorage.setItem(this.logoKey, dataUrl);
    this.applyBranding();
  },

  resetLogo() {
    localStorage.removeItem(this.logoKey);
    this.applyBranding();
  },

  updatePreview() {
    const logo = this.getLogo();
    const settings = this.getSettings();
    const preview = document.getElementById("brandingLogoPreview");
    if (preview) preview.src = logo;
    document.querySelectorAll("[data-company-logo]").forEach((img) => img.src = logo);
    document.querySelectorAll("[data-company-name]").forEach((el) => el.textContent = settings.name);
    document.querySelectorAll("[data-company-subtitle]").forEach((el) => el.textContent = settings.subtitle);
    ["companyNameSetting","companyAddressSetting","companyPhoneSetting","companySignatureSetting","companySealSetting"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const map = {
        companyNameSetting: "name",
        companyAddressSetting: "address",
        companyPhoneSetting: "phone",
        companySignatureSetting: "signature",
        companySealSetting: "seal"
      };
      el.value = settings[map[id]] || "";
    });
  },

  applyBranding() {
    const logo = this.getLogo();
    const settings = this.getSettings();

    document.querySelectorAll("[data-company-logo]").forEach((img) => {
      img.src = logo;
    });

    document.querySelectorAll("[data-company-name]").forEach((el) => {
      el.textContent = settings.name;
    });

    document.querySelectorAll("[data-company-subtitle]").forEach((el) => {
      el.textContent = settings.subtitle;
    });

    const favicon = document.querySelector('link[rel="icon"]') || document.createElement("link");
    favicon.rel = "icon";
    favicon.href = logo;
    if (!favicon.parentNode) document.head.appendChild(favicon);

    const appleTouch = document.querySelector('link[rel="apple-touch-icon"]') || document.createElement("link");
    appleTouch.rel = "apple-touch-icon";
    appleTouch.href = logo;
    if (!appleTouch.parentNode) document.head.appendChild(appleTouch);

    this.updatePreview();
  },

  bindControls() {
    const fileInput = document.getElementById("brandingLogoFile");
    const resetBtn = document.getElementById("resetBrandingBtn");
    const saveCompanyBtn = document.getElementById("saveCompanySettingsBtn");

    fileInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.setLogo(reader.result);
        if (window.openInfoModal) openInfoModal("تم", "تم تحديث شعار الشركة بنجاح.");
      };
      reader.readAsDataURL(file);
    });

    resetBtn?.addEventListener("click", () => {
      this.resetLogo();
      if (window.openInfoModal) openInfoModal("تم", "تمت إعادة الشعار الافتراضي.");
    });

    saveCompanyBtn?.addEventListener("click", () => {
      this.saveSettings({
        name: document.getElementById("companyNameSetting")?.value?.trim() || this.defaults.name,
        address: document.getElementById("companyAddressSetting")?.value?.trim() || "",
        phone: document.getElementById("companyPhoneSetting")?.value?.trim() || "",
        signature: document.getElementById("companySignatureSetting")?.value?.trim() || "اعتماد الإدارة",
        seal: document.getElementById("companySealSetting")?.value?.trim() || "",
        subtitle: document.getElementById("companySubtitleSetting")?.value?.trim() || this.defaults.subtitle
      });
      if (window.openInfoModal) openInfoModal("تم", "تم حفظ إعدادات الشركة بنجاح.");
    });
  },

  init() {
    this.applyBranding();
    this.bindControls();
  }
};

window.Branding = Branding;
window.addEventListener("load", () => Branding.init());
