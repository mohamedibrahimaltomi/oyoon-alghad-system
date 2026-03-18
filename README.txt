Oyoon-HR-FINAL (Option 1)

هيكل المشروع:
- index.html           -> تحويل تلقائي إلى login.html
- login.html           -> صفحة تسجيل الدخول
- dashboard.html       -> لوحة التحكم الرئيسية

المجلدات:
- css/style.css
- js/app.js
- js/auth.js
- js/employees.js
- js/attendance.js
- js/payroll.js
- js/drivers.js
- js/reports.js
- config/supabase.js
- sql/schema.sql
- sql/policies.sql
- assets/icons-3d/
- assets/logo/logo.png

خطوات التشغيل:
1) نفذ sql/schema.sql في Supabase
2) ثم نفذ sql/policies.sql
3) ارفع المجلد بالكامل إلى Vercel
4) الدخول الافتراضي:
   username: admin
   password: admin123

ملاحظات:
- المشروع الآن مبني وفق الخيار 1 (login.html + dashboard.html)
- ملف config/supabase.js يحتوي رابط المشروع ومفتاح anon
- توجد أيقونات وصور بديلة داخل assets ويمكن استبدالها لاحقًا
