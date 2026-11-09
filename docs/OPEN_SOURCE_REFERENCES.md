# دليل المشاريع مفتوحة المصدر والمرجعيات التقنية للمنصة
## (Open-Source References & Architectural Accelerators)

لتقليص وقت التطوير بمقدار لا يقل عن **60% - 70%**، تم فحص وتحليل أبرز المستودعات والمشاريع مفتوحة المصدر المتوافقة مع أهداف منصة المزادات والمناقصات الذكية، وتقسيمها حسب المجالات الوظيفية:

---

## 1. محركات المزادات الحية بالوقت الفعلي (Real-Time Bidding Engines)

### أ. [SiegfriedBz / Next-Auctions](https://github.com/SiegfriedBz/Next-Auctions)
* **التقنيات المستخدمة:** Next.js (TypeScript), Supabase Realtime, Tailwind CSS, Nuqs.
* **ما يمكن الاستفادة منه مباشرة:**
  - معمارية الواجهات الحية والتحديث الفوري للعطاءات دون إعادة تحميل الصفحة (Realtime Subscription).
  - منطق إدارة دورة حياة المزاد التلقائية (Auto-Closing & Expiration triggers) باستخدام Edge Functions / Cron Jobs.
  - تجربة المستخدم الحديثة لعرض تفاصيل المزادات والصور والتحديث المتزامن لجميع المشاركين.

### ب. [Harsh-Pachauri / BidFlow](https://github.com/Harsh-Pachauri/BidFlow) & [IkboljonMe / auction-hub-server](https://github.com/IkboljonMe/auction-hub-server)
* **التقنيات المستخدمة:** Node.js, Express, Socket.io, PostgreSQL / Prisma.
* **ما يمكن الاستفادة منه مباشرة:**
  - محرك غرف المزادات المعتمد على **WebSockets / Socket.io** مع نظام البث الجماعي (Broadcasting) للعطاءات الجديدة.
  - خوارزمية **تمديد الوقت التلقائي (Anti-Sniping)**: إضافة دقيقتين للعداد الزمني إذا قُدّم عرض في آخر دقيقتين لمنع سرقة الصفقات في اللحظة الأخيرة.
  - التحقق من شروط المزايدة (Bid Step Validation): التأكد الفوري من أن العرض الجديد يتجاوز الحد الأدنى للزيادة قبل قبوله وبثه.

---

## 2. أنظمة المناقصات والمشتريات العكسية (E-Procurement & Reverse Auctions)

### أ. [OpenProcurement](https://github.com/openprocurement) (النواة البرمجية لمنصة ProZorro الوطنية)
* **التقنيات المستخدمة:** Python, REST APIs, Open Contracting Data Standard (OCDS).
* **ما يمكن الاستفادة منه مباشرة:**
  - تطبيق معايير التعاقد المفتوح (**OCDS**) المعتمدة دولياً، والتي تضمن نزاهة المناقصات وهيكلة كراسات الشروط.
  - نمذجة مراحل المناقصة: (طرح الكراسة -> استقبال العروض -> فحص الأهلية الفنية -> المزايدة التنافسية العكسية -> الترسية والتعاقد).
  - سكيما البيانات المعقدة للمشتريات والتوريدات والمواصفات الفنية متعددة البنود (Multi-lot Tendering).

### ب. [ERPNext - Buying & Sourcing Module](https://github.com/frappe/erpnext)
* **التقنيات المستخدمة:** Python / Frappe Framework, MariaDB / PostgreSQL.
* **ما يمكن الاستفادة منه مباشرة:**
  - تدفقات عمل طلبات عروض الأسعار (**RFQ - Request for Quotation**) والمقارنة التلقائية بين عروض الموردين (Vendor Quotation Comparison).
  - نظام تقييم الموردين (Supplier Scorecards) بناءً على الالتزام بالمواعيد وجودة التنفيذ وسجل النزاعات.

---

## 3. محركات الذكاء الاصطناعي وكراسات الشروط وكشف الاحتيال

### أ. [BidMaster-Pro](https://github.com/guangshu100/BidMaster-Pro) (AI-Powered Bidding Agent)
* **التقنيات المستخدمة:** Python, LLMs (Gemini / OpenAI), LangChain, Vector Database.
* **ما يمكن الاستفادة منه مباشرة:**
  - نماذج الـ Prompts وهيكلة كراسات الشروط آلياً (Auto-RFP Generation) وتحويل الوصف البسيط إلى شروط تعاقدية دقيقة ومكتملة الأركان.
  - استخراج المواصفات الفنية من صور السلع عبر نماذج Vision (Multimodal AI) وتحديد الفئة وحالة السلعة.
  - الفحص الذكي للالتزام بالمواصفات (Compliance Checking) لمقارنة عروض المزايدين مع شروط المناقصة.

### ب. مكتبات كشف المزايدات الوهمية وتحليل السلوك (Anti-Shill Bidding & Anomaly Detection)
* **التقنيات المقترحة:** Python (Scikit-Learn / Isolation Forest / Graph Analysis):
  - كشف الحسابات المرتبطة عبر تتبع عناوين IP، تشابه أوقات المزايدة، ونمط رفع السعر دون نية الشراء الحقيقية (Bid Shilling Pattern Detection).
  - إطلاق تنبيهات للمشرفين في لوحة التحكم عند اكتشاف نمط مزايدة مشبوه.

---

## 4. المكونات المعمارية المختارة للمشروع (Recommended Production Stack)

| الطبقة (Layer) | التقنية المختارة | سبب الاختيار وميزة الاستخدام |
| :--- | :--- | :--- |
| **الواجهة الأمامية وتطبيق PWA** | **Next.js 15 (React 19) + Tailwind CSS** | سرعة فائقة، دعم PWA للتثبيت كأيقونة في هواتف أندرويد و iOS، متوافق مع إنترنت اليمن الضعيف وخفيف التحميل. |
| **قاعدة البيانات والوقت الفعلي** | **PostgreSQL + Supabase Realtime / Socket.io** | دعم العلاقات المعقدة، الاستعلامات الجغرافية (PostGIS)، وقنوات WebSockets للبث اللحظي للعطاءات. |
| **معالجة الذكاء الاصطناعي** | **FastAPI / Python (أو Next.js AI SDK مع Gemini API)** | توليد كراسات الشروط، فحص الصور بالـ Vision، والمطابقة الذكية للمناقصات. |
| **التخزين السحابي للمستندات والصور** | **S3-compatible (MinIO / Cloudflare R2 / Supabase Storage)** | تخزين صور المزادات، وثائق KYC، وفواتير وسندات الدفع بتكلفة منخفضة وأمان عالي. |
| **إدارة المهام المجدولة والعدادات** | **Redis + BullMQ** | دقة متناهية في إغلاق المزادات وتمديد العداد الزمني (Anti-Sniping) ومعالجة طوابير العروض دون فقدان أي مزايدة. |
