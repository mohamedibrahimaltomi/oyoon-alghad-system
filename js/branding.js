const Branding = {
  storageKey: "oyoon_brand_logo",
  defaultLogo: "assets/logo/company-default.png",

  getLogo() {
    return localStorage.getItem(this.storageKey) || this.defaultLogo;
  },

  setLogo(dataUrl) {
    localStorage.setItem(this.storageKey, dataUrl);
    this.applyBranding();
  },

  resetLogo() {
    localStorage.removeItem(this.storageKey);
    this.applyBranding();
  },

  updatePreview() {
    const logo = this.getLogo();
    const preview = document.getElementById("brandingLogoPreview");
    if (preview) preview.src = logo;
    const current = document.getElementById("brandingCurrentLogo");
    if (current) current.src = logo;
  },

  applyBranding() {
    const logo = this.getLogo();

    document.querySelectorAll("[data-company-logo]").forEach((img) => {
      img.src = logo;
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
  },

  init() {
    this.applyBranding();
    this.bindControls();
  }
};

window.Branding = Branding;
window.addEventListener("load", () => Branding.init());
