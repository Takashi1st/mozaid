const { Client } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:Kiss0OduwEqtGlqYmAMyedKswhoHiGcy2jkmWxZge95ELjeoV29tRrnmqxZvetuo@161.97.152.98:9374/postgres';

async function seedTestData() {
  const client = new Client({ connectionString, ssl: false });
  await client.connect();

  console.log('🚀 بدء إضافة بيانات حية للمزادات والمناقصات للتجربة...');

  // 1. المستخدمين الموثقين
  const usersToUpsert = [
    {
      phone: '777112233',
      name: 'معرض القمة للسيارات - بازرعة',
      role: 'seller',
      city: 'صنعاء',
      tier: 'tier2_id_liveness',
      isTrusted: true,
      rep: 4.95,
      balanceYER: 85000000,
      balanceUSD: 120000
    },
    {
      phone: '771234567',
      name: 'م. أحمد ناصر الحاشدي',
      role: 'bidder',
      city: 'صنعاء',
      tier: 'tier2_id_liveness',
      isTrusted: false,
      rep: 5.0,
      balanceYER: 25000000,
      balanceUSD: 45000
    },
    {
      phone: '733445566',
      name: 'إدارة مستشفى الأمل النموذجي',
      role: 'contractor',
      city: 'عدن',
      tier: 'tier2_id_liveness',
      isTrusted: true,
      rep: 4.9,
      balanceYER: 40000000,
      balanceUSD: 250000
    },
    {
      phone: '775556677',
      name: 'شركة سبأ للمقاولات والتوريدات العامة',
      role: 'contractor',
      city: 'المكلا',
      tier: 'tier2_id_liveness',
      isTrusted: true,
      rep: 4.88,
      balanceYER: 150000000,
      balanceUSD: 300000
    },
    {
      phone: '711223344',
      name: 'مؤسسة الأفق للتقنية والتجارة',
      role: 'seller',
      city: 'صنعاء',
      tier: 'tier2_id_liveness',
      isTrusted: true,
      rep: 4.92,
      balanceYER: 35000000,
      balanceUSD: 80000
    },
    {
      phone: '733998877',
      name: 'د. سمير عبدالجليل اليافعي',
      role: 'bidder',
      city: 'عدن',
      tier: 'tier2_id_liveness',
      isTrusted: true,
      rep: 4.96,
      balanceYER: 50000000,
      balanceUSD: 95000
    },
    {
      phone: '700112233',
      name: 'فؤاد علي الحكيمي',
      role: 'bidder',
      city: 'تعز',
      tier: 'tier2_id_liveness',
      isTrusted: false,
      rep: 4.85,
      balanceYER: 18000000,
      balanceUSD: 25000
    }
  ];

  const userIds = {};

  for (const u of usersToUpsert) {
    const res = await client.query(`
      INSERT INTO users (full_name, phone_number, password_hash, role, city, kyc_status, verification_tier, national_id_number, is_trusted_seller, reputation_score)
      VALUES ($1, $2, '$2b$10$abcdefghijklmnopqrstuvwxyz123456', $3, $4, 'verified', $5, '010' || floor(random() * 89999999 + 10000000)::text, $6, $7)
      ON CONFLICT (phone_number) DO UPDATE 
      SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, is_trusted_seller = EXCLUDED.is_trusted_seller
      RETURNING id;
    `, [u.name, u.phone, u.role, u.city, u.tier, u.isTrusted, u.rep]);

    const uid = res.rows[0].id;
    userIds[u.phone] = uid;

    // شحن المحفظة
    await client.query(`
      INSERT INTO wallets (user_id, available_balance, frozen_escrow_balance, currency)
      VALUES ($1, $2, 0, 'YER')
      ON CONFLICT (user_id) DO UPDATE 
      SET available_balance = EXCLUDED.available_balance;
    `, [uid, u.balanceYER]);
  }

  // التأكد من توفر الفئات
  const catRows = await client.query('SELECT id, slug FROM categories;');
  const catMap = {};
  catRows.rows.forEach(c => { catMap[c.slug] = c.id; });

  const catVehicles = catMap['vehicles'] || 1;
  const catRealEstate = catMap['real-estate'] || 2;
  const catSolar = catMap['solar-energy'] || 3;
  const catElectronics = catMap['electronics'] || 4;
  const catTenders = catMap['tenders'] || 5;

  // تنظيف المزادات القديمة أو التجريبية السابقة
  await client.query(`
    DELETE FROM listings 
    WHERE slug IN (
      'live-toyota-landcruiser-v8-2022',
      'live-solar-system-150kw-hospital',
      'auc-toyota-lc2023-sanaa',
      'auc-building-sixtieth-sanaa',
      'auc-mercedes-actros-hodeidah',
      'auc-solar-farm-40kw-marib',
      'auc-land-bayt-baws-sanaa',
      'auc-dell-workstations-aden',
      'tnd-solar-aden-hospital',
      'tnd-university-fiber-lab',
      'tnd-steel-mukalla-towers',
      'tnd-caterpillar-generators-taiz'
    );
  `);

  console.log('✅ تم تجهيز المستخدمين والمحافظ وتجهيز التصنيفات.');

  // ==========================================
  // 2. إضافة 6 مزادات علنية نشطة (Forward Auctions)
  // ==========================================
  const auctions = [
    {
      slug: 'auc-toyota-lc2023-sanaa',
      sellerPhone: '777112233',
      catId: catVehicles,
      title: 'تويوتا لاندكروزر V8 صالون 2023 فل كامل بازرعة - فحص شامل',
      type: 'forward_auction',
      currency: 'YER',
      startPrice: 42000000,
      currentPrice: 46500000,
      minIncrement: 250000,
      deposit: 1500000,
      hoursLeft: 4.5, // 4 ساعات ونصف
      city: 'صنعاء',
      condition: 'used_mint',
      bidsCount: 3,
      description: 'سيارة تويوتا لاندكروزر صالون 2023 وارد بازرعة فل كامل شاشات خلفية، كاميرات 360، خالية تماماً من الرش والخدوش بحالة الزيرو. تم الفحص الفني المعتمد لدى مركز بازرعة بنسبة 98%. مجمركة ومرقمة لوحة خصوصي صنعاء.',
      specs: {
        'المحرك': '3.5 لتر توين تيربو V6',
        'ناقل الحركة': 'أوتوماتيك 10 سرعات',
        'اللون': 'أبيض لؤلؤي ملكي',
        'العداد': '18,500 كم',
        'المقاعد': 'جلد فاخر بيج تبريد وتسخين',
        'مكان المعاينة': 'صنعاء - شارع حدة جوار معرض القمة'
      },
      bids: [
        { bidderPhone: '771234567', amount: 43500000, minutesAgo: 90 },
        { bidderPhone: '733998877', amount: 45000000, minutesAgo: 45 },
        { bidderPhone: '700112233', amount: 46500000, minutesAgo: 10, isWinning: true }
      ]
    },
    {
      slug: 'auc-building-sixtieth-sanaa',
      sellerPhone: '711223344',
      catId: catRealEstate,
      title: 'عمارة تجارية استثمارية 4 أدوار حجر - شارع الستين الجنوبي',
      type: 'forward_auction',
      currency: 'USD',
      startPrice: 320000,
      currentPrice: 355000,
      minIncrement: 5000,
      deposit: 10000,
      hoursLeft: 72, // 3 أيام
      city: 'صنعاء',
      condition: 'new',
      bidsCount: 4,
      description: 'عمارة استثمارية ممتازة مبنية حجر مسلح شخصي 4 أدوار وبدروم كامل، تقع مباشرة على شارع الستين الجنوبي. تحتوي على 5 فتحات تجارية مؤجرة بالكامل و8 شقق سكنية واسعة، دخل شهري مضمون وموثق بعقود سارية.',
      specs: {
        'المساحة': '12 لبنة حر معمدة بالسجل العقاري',
        'عدد الأدوار': '4 أدوار + بدروم كامل مواقف ومخازن',
        'الواجهة': 'حجر بيضاء واجهة غربية 24 متر على الشارع',
        'الدخل الشهري': '3,400 دولار أمريكي',
        'الأوراق': 'بصيرة أصل معمدة شرعياً وسجل عقاري نافذ'
      },
      bids: [
        { bidderPhone: '771234567', amount: 330000, minutesAgo: 300 },
        { bidderPhone: '733998877', amount: 340000, minutesAgo: 180 },
        { bidderPhone: '700112233', amount: 350000, minutesAgo: 60 },
        { bidderPhone: '775556677', amount: 355000, minutesAgo: 15, isWinning: true }
      ]
    },
    {
      slug: 'auc-mercedes-actros-hodeidah',
      sellerPhone: '777112233',
      catId: catVehicles,
      title: 'شاحنة مرسيدس بنز آكتروس 2019 قلاب 20م3 نقل ثقيل',
      type: 'forward_auction',
      currency: 'USD',
      startPrice: 48000,
      currentPrice: 52000,
      minIncrement: 1000,
      deposit: 3000,
      hoursLeft: 36, // 36 ساعة
      city: 'الحديدة',
      condition: 'used_mint',
      bidsCount: 2,
      description: 'شاحنة مرسيدس بنز آكتروس موديل 2019 هيدروليك قلاب سعة 20 متر مكعب وارد ألمانيا بحالة فنية ممتازة جداً. كفرات جديدة بنسبة 90%، ماكينة وجير وطرمبة على الشرط، جاهزة للعمل الفوري في المقاولات.',
      specs: {
        'الموديل': 'Actros 3340 6x4',
        'قوة المحرك': '400 حصان Turbo Intercooler',
        'الحمولة': '33 طن',
        'العداد': '142,000 كم',
        'مكان المعاينة': 'الحديدة - المنطقة الحرة جوار صوامع الغلال'
      },
      bids: [
        { bidderPhone: '775556677', amount: 50000, minutesAgo: 120 },
        { bidderPhone: '700112233', amount: 52000, minutesAgo: 25, isWinning: true }
      ]
    },
    {
      slug: 'auc-solar-farm-40kw-marib',
      sellerPhone: '711223344',
      catId: catSolar,
      title: 'محطة طاقة شمسية زراعية هجينة متكاملة 40KW مع غطاس 25 حصان',
      type: 'forward_auction',
      currency: 'USD',
      startPrice: 15000,
      currentPrice: 16800,
      minIncrement: 300,
      deposit: 1000,
      hoursLeft: 48, // يومين
      city: 'مأرب',
      condition: 'new',
      bidsCount: 3,
      description: 'منظومة طاقة شمسية زراعية متكاملة ومعدة لتشغيل آبار المياه والمزارع. تشمل 72 لوح جينكو سولار كفاءة عالية 560 وات N-Type مع محول ضخ شمسي ذكي INVT 30KW وغطاس إيطالي أصلي 25 حصان وكابلات بحرية معزولة.',
      specs: {
        'إجمالي القدرة': '40,320 واط (72 لوح x 560W)',
        'نوع الألواح': 'Jinko Solar N-Type Tier-1 Monocrystalline',
        'الإنفرتر': 'INVT Solar VFD 30KW ثلاثي الطور IP65',
        'الغطاس': 'Caprari إيطالي 25 حصان مخرج 3 بوصة',
        'الضمان': '12 سنة للألواح و 3 سنوات للمحول'
      },
      bids: [
        { bidderPhone: '771234567', amount: 15600, minutesAgo: 200 },
        { bidderPhone: '700112233', amount: 16200, minutesAgo: 80 },
        { bidderPhone: '733998877', amount: 16800, minutesAgo: 30, isWinning: true }
      ]
    },
    {
      slug: 'auc-land-bayt-baws-sanaa',
      sellerPhone: '711223344',
      catId: catRealEstate,
      title: 'أرض سكنية تجارية 8 لبن حر زاوية شارعين 14م و 12م - بيت بوس',
      type: 'forward_auction',
      currency: 'YER',
      startPrice: 65000000,
      currentPrice: 72500000,
      minIncrement: 500000,
      deposit: 3000000,
      hoursLeft: 120, // 5 أيام
      city: 'صنعاء',
      condition: 'new',
      bidsCount: 2,
      description: 'أرض سكنية راقية في أرقى أحياء بيت بوس بصنعاء، زاوية على شارعين (شارع 14 متر وشارع 12 متر)، مستوية وجاهزة للبناء الفوري، واصل إليها كافة الخدمات (مياه، كهرباء، هاتف، وصرف صحي). الأوراق بصيرة أصل معمدة وسجل عقاري.',
      specs: {
        'المساحة': '8 لبن ذماري حر',
        'الواجهات': 'واجهة غربية 20م وواجهة شمالية 18م',
        'رقم المخطط': 'مخطط رقم 14 - حي الشباب بيت بوس',
        'نوع الملكية': 'ملك حر خالص معمد بالمحكمة والسجل العقاري'
      },
      bids: [
        { bidderPhone: '771234567', amount: 69000000, minutesAgo: 360 },
        { bidderPhone: '733998877', amount: 72500000, minutesAgo: 90, isWinning: true }
      ]
    },
    {
      slug: 'auc-dell-workstations-aden',
      sellerPhone: '711223344',
      catId: catElectronics,
      title: 'دفعة أجهزة عمل هندسية Dell Precision 7550 Core i7 (10 قطع)',
      type: 'forward_auction',
      currency: 'YER',
      startPrice: 4000000,
      currentPrice: 4650000,
      minIncrement: 50000,
      deposit: 250000,
      hoursLeft: 14, // 14 ساعة
      city: 'عدن',
      condition: 'used_mint',
      bidsCount: 4,
      description: 'دفعة ممتازة تتكون من 10 أجهزة حاسوب محمولة مخصصة للأعمال الهندسية والتصميم والرندرة الثقيلة Dell Precision 7550 استيراد أمريكي بحالة الوكالة فئة A+. مع الشواحن الأصلية وضمان فحص وتشغيل كامل.',
      specs: {
        'المعالج': 'Intel Core i7-10850H سداسي النواة 5.1GHz',
        'الذاكرة العشوائية': '32GB DDR4 قابلة للزيادة حتى 128GB',
        'كرت الشاشة': 'NVIDIA Quadro T2000 4GB GDDR6',
        'التخزين': '1TB NVMe M.2 SSD فائق السرعة',
        'الشاشة': '15.6 بوصة FHD IPS بدقة 100% sRGB',
        'الضمان': 'ضمان تجربة واستبدال 30 يوماً + مهلة معاينة 48 ساعة'
      },
      bids: [
        { bidderPhone: '771234567', amount: 4200000, minutesAgo: 180 },
        { bidderPhone: '700112233', amount: 4350000, minutesAgo: 110 },
        { bidderPhone: '775556677', amount: 4500000, minutesAgo: 50 },
        { bidderPhone: '733998877', amount: 4650000, minutesAgo: 12, isWinning: true }
      ]
    }
  ];

  for (const a of auctions) {
    const sellerId = userIds[a.sellerPhone];
    const startsAt = `CURRENT_TIMESTAMP - INTERVAL '3 hours'`;
    const endsAt = `CURRENT_TIMESTAMP + INTERVAL '${a.hoursLeft} hours'`;

    const insertSql = `
      INSERT INTO listings (
        user_id, category_id, title, slug, listing_type, status, currency,
        starting_price, current_price, min_bid_increment, required_deposit_amount,
        starts_at, ends_at, original_ends_at, anti_sniping_trigger_seconds, anti_sniping_extension_seconds,
        times_extended, description, ai_generated_specs, item_condition, location_city,
        inspection_window_hours, total_bids_count
      ) VALUES (
        $1, $2, $3, $4, $5, 'active', $6,
        $7, $8, $9, $10,
        ${startsAt}, ${endsAt}, ${endsAt}, 120, 120,
        0, $11, $12, $13, $14,
        48, $15
      ) RETURNING id;
    `;

    const res = await client.query(insertSql, [
      sellerId, a.catId, a.title, a.slug, a.type, a.currency,
      a.startPrice, a.currentPrice, a.minIncrement, a.deposit,
      a.description, JSON.stringify(a.specs), a.condition, a.city,
      a.bidsCount
    ]);

    const listingId = res.rows[0].id;

    // تسجيل العطاءات في جدول bids
    for (const b of a.bids) {
      const bidderId = userIds[b.bidderPhone];
      await client.query(`
        INSERT INTO bids (listing_id, bidder_id, amount, is_winning_bid, ip_address, created_at)
        VALUES ($1, $2, $3, $4, '161.97.152.98', CURRENT_TIMESTAMP - INTERVAL '${b.minutesAgo} minutes');
      `, [listingId, bidderId, b.amount, !!b.isWinning]);
    }
  }

  console.log('✅ تم إدراج 6 مزادات علنية نشطة مع كافة المزايدات والعروض المتنافسة.');

  // ==========================================
  // 3. إضافة 4 مناقصات عكسية نشطة (Reverse Tenders)
  // ==========================================
  const tenders = [
    {
      slug: 'tnd-solar-aden-hospital',
      reqPhone: '733445566', // مستشفى الأمل
      catId: catTenders,
      title: 'توريد وتركيب منظومة طاقة شمسية هجينة 150 كيلوواط - مستشفى الأمل',
      currency: 'USD',
      budgetCap: 85000,
      lowestBid: 71500,
      minIncrement: 500,
      deposit: 5000,
      hoursLeft: 96, // 4 أيام
      city: 'عدن',
      description: 'مطلوب من الشركات المؤهلة توريد وتركيب وتشغيل منظومة طاقة شمسية هجينة بقدرة إجمالية 150KW لتغطية استهلاك أقسام العناية المركزة والعمليات لمستشفى الأمل النموذجي بعدن، تشمل الإنفرترات والبطاريات ونظام التحكم الذكي.',
      specs: {
        'القدرة الإجمالية': '150 kWp بنظام Net-Metering',
        'نوع الألواح': 'Tier-1 Monocrystalline بقوة 550W فأعلى',
        'الإنفرترات': '3 إنفرترات ذكية هجينة قدرة كل منها 50KW',
        'بنك البطاريات': 'بطاريات ليثيوم LiFePO4 بسعة إجمالية لا تقل عن 200kWh',
        'الضمان': 'ضمان تشغيلي شامل لمدة 24 شهراً و10 سنوات للألواح',
        'مدة التنفيذ': 'أقصاها 35 يوماً من تاريخ الترسية'
      },
      offers: [
        { contractorPhone: '775556677', amount: 78000, minutesAgo: 240 },
        { contractorPhone: '711223344', amount: 74500, minutesAgo: 120 },
        { contractorPhone: '777112233', amount: 71500, minutesAgo: 30, isWinning: true }
      ]
    },
    {
      slug: 'tnd-university-fiber-lab',
      reqPhone: '711223344', // مؤسسة الأفق للتعليم والتقنية
      catId: catTenders,
      title: 'مشروع تجهيز شبكة ألياف ضوئية و 60 محطة حاسوب لجامعة سبأ',
      currency: 'USD',
      budgetCap: 60000,
      lowestBid: 49200,
      minIncrement: 400,
      deposit: 3000,
      hoursLeft: 144, // 6 أيام
      city: 'صنعاء',
      description: 'مناقصة لتوريد وتركيب وتمديد شبكة حاسوب متكاملة تعتمد الألياف الضوئية (Fiber Optic) وتجهيز معملين دراسيين بعدد 60 جهاز All-in-One بمواصفات معالجة حديثة وشاشات عالية الدقة للتدريب البرمجي.',
      specs: {
        'أجهزة الحاسوب': '60 جهاز HP ProOne All-in-One Core i5 12th Gen / 16GB RAM / 512GB SSD',
        'شبكة الألياف': 'تمديد 2,500 متر كيبل فايبر OM4 متعدد الأنماط داخلي وخارجي',
        'المحولات Switches': '4 محولات سيسكو Cisco Catalyst 24-Port PoE+ Gigabit',
        'خزانة السيرفر': 'كابينة راك 42U مع وحدة تبريد ونظام تأريض متكامل',
        'مدة التسليم': '25 يوماً تقويمياً'
      },
      offers: [
        { contractorPhone: '775556677', amount: 56000, minutesAgo: 300 },
        { contractorPhone: '733445566', amount: 52000, minutesAgo: 150 },
        { contractorPhone: '771234567', amount: 49200, minutesAgo: 40, isWinning: true }
      ]
    },
    {
      slug: 'tnd-steel-mukalla-towers',
      reqPhone: '775556677', // شركة سبأ للمقاولات
      catId: catTenders,
      title: 'توريد 120 طن حديد تسليح تركي وإسمنت حضرموت لمشروع أبراج الساحل',
      currency: 'YER',
      budgetCap: 110000000,
      lowestBid: 98500000,
      minIncrement: 500000,
      deposit: 5000000,
      hoursLeft: 72, // 3 أيام
      city: 'المكلا',
      description: 'تعلن شركة سبأ للمقاولات عن رغبتها في استدراج عروض أسعار لتوريد 120 طن حديد تسليح إنشائي عالي المقاومة و 2,000 كيس إسمنت بورتلاندي عادي (مصنع حضرموت) واصل إلى موقع العمل بالمكلا.',
      specs: {
        'كمية الحديد': '120 طن حديد تركي مشوه عالي المقاومة Grade 60 (مقاسات 12, 14, 16, 20 ملم)',
        'كمية الإسمنت': '2,000 كيس إسمنت بورتلاندي إنشائي نخب أول تعبئة جديدة',
        'الفحص والجودة': 'تقديم شهادات فحص الشد والاستطالة من مختبر معتمد في حضرموت',
        'التوصيل والتنزيل': 'واصل لموقع المشروع في المكلا - منطقة خلف شامل النقل والعتالة'
      },
      offers: [
        { contractorPhone: '711223344', amount: 105000000, minutesAgo: 360 },
        { contractorPhone: '777112233', amount: 101000000, minutesAgo: 180 },
        { contractorPhone: '700112233', amount: 98500000, minutesAgo: 60, isWinning: true }
      ]
    },
    {
      slug: 'tnd-caterpillar-generators-taiz',
      reqPhone: '700112233', // فؤاد علي الحكيمي
      catId: catTenders,
      title: 'عقد صيانة سنوية شاملة وقطع غيار لـ 4 مولدات كاتربيلر 500KVA',
      currency: 'USD',
      budgetCap: 22000,
      lowestBid: 17400,
      minIncrement: 300,
      deposit: 1500,
      hoursLeft: 48, // يومين
      city: 'تعز',
      description: 'مطلوب إبرام عقد صيانة وقائية وعلاجية سنوية لعدد 4 مولدات كهربائية نوع Caterpillar بقدرة 500KVA لكل مولد، يشمل تبديل الزيوت والفلاتر الدورية والاستجابة للأعطال الطارئة على مدار 24 ساعة.',
      specs: {
        'عدد المولدات': '4 مولدات كاتربيلر موديل C15 سعة 500KVA',
        'الزيوت والفلاتر': 'توفير فلاتر ديزل وزيت وهواء أصلية مع زيوت معتمدة كل 250 ساعة عمل',
        'الصيانة الوقائية': 'زيارة تفقدية أسبوعية وفحص كامل للوحة التحكم والمضخات',
        'زمن الاستجابة': 'الوصول لموقع المنشأة في تعز خلال 3 ساعات كحد أقصى عند البلاغ'
      },
      offers: [
        { contractorPhone: '775556677', amount: 20000, minutesAgo: 180 },
        { contractorPhone: '733445566', amount: 18500, minutesAgo: 90 },
        { contractorPhone: '711223344', amount: 17400, minutesAgo: 20, isWinning: true }
      ]
    }
  ];

  for (const t of tenders) {
    const reqId = userIds[t.reqPhone];
    const startsAt = `CURRENT_TIMESTAMP - INTERVAL '4 hours'`;
    const endsAt = `CURRENT_TIMESTAMP + INTERVAL '${t.hoursLeft} hours'`;

    const insertSql = `
      INSERT INTO listings (
        user_id, category_id, title, slug, listing_type, status, currency,
        starting_price, current_price, min_bid_increment, required_deposit_amount,
        starts_at, ends_at, original_ends_at, anti_sniping_trigger_seconds, anti_sniping_extension_seconds,
        times_extended, description, ai_generated_specs, location_city,
        inspection_window_hours, total_bids_count
      ) VALUES (
        $1, $2, $3, $4, 'reverse_tender', 'active', $5,
        $6, $7, $8, $9,
        ${startsAt}, ${endsAt}, ${endsAt}, 120, 120,
        0, $10, $11, $12,
        72, $13
      ) RETURNING id;
    `;

    const res = await client.query(insertSql, [
      reqId, t.catId, t.title, t.slug, t.currency,
      t.budgetCap, t.lowestBid, t.minIncrement, t.deposit,
      t.description, JSON.stringify(t.specs), t.city,
      t.offers.length
    ]);

    const tenderId = res.rows[0].id;

    for (const off of t.offers) {
      const bidderId = userIds[off.contractorPhone];
      await client.query(`
        INSERT INTO bids (listing_id, bidder_id, amount, is_winning_bid, ip_address, created_at)
        VALUES ($1, $2, $3, $4, '161.97.152.98', CURRENT_TIMESTAMP - INTERVAL '${off.minutesAgo} minutes');
      `, [tenderId, bidderId, off.amount, !!off.isWinning]);
    }
  }

  console.log('✅ تم إدراج 4 مناقصات عكسية نشطة مع كافة العروض التنافسية.');

  // التحقق النهائي من قاعدة البيانات
  const activeAuctionsCount = await client.query(`SELECT count(*) FROM listings WHERE listing_type = 'forward_auction' AND status = 'active';`);
  const activeTendersCount = await client.query(`SELECT count(*) FROM listings WHERE listing_type = 'reverse_tender' AND status = 'active';`);
  const totalBidsCount = await client.query(`SELECT count(*) FROM bids;`);

  console.log(`\n🎉 اكتمل التجهيز بنجاح تام!`);
  console.log(`📊 إجمالي المزادات النشطة: ${activeAuctionsCount.rows[0].count}`);
  console.log(`📊 إجمالي المناقصات النشطة: ${activeTendersCount.rows[0].count}`);
  console.log(`📊 إجمالي العطاءات والمزايدات: ${totalBidsCount.rows[0].count}`);

  await client.end();
}

seedTestData().catch(console.error);
