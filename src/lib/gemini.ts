/**
 * خدمة الذكاء الاصطناعي لمنصة مزايد (Mozaid AI Dual-Mode Service)
 * تدعم العمل المزدوج: الربط المباشر بـ Google Gemini API عند توفر المفتاح،
 * أو المحاكاة الواقعية الذكية المتوافقة مع السوق اليمني عند غياب المفتاح أو انقطاع الاتصال.
 * تضمن عدم رمي أي استثناءات غير معالجة تمنع تشغيل المنصة (Zero-Crash Guarantee).
 */

import { GoogleGenAI } from '@google/genai';
import {
  AuctionSpecsParams,
  AuctionSpecsResult,
  TenderRFPParams,
  TenderRFPResult,
  BiddingTelemetry,
  ShillBiddingParams,
  ShillBiddingAnalysisResult,
  Currency,
} from '../types';

/**
 * الحصول على عميل Gemini AI عند توفر المفتاح وصحته
 */
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'mock' || apiKey === 'placeholder' || apiKey.length < 10) {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: apiKey.trim() });
  } catch (err) {
    console.warn('[Gemini AI] Failed to initialize GoogleGenAI client, falling back to mock:', err);
    return null;
  }
}

function getModelName(): string {
  return process.env.GEMINI_MODEL || process.env.GEMMA_MODEL || 'gemma-4-31b-it';
}

/**
 * تنظيف نصوص JSON من وسوم كتل Markdown البرمجية
 */
function cleanJsonString(str: string): string {
  return str
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/**
 * 1. التوليد التلقائي لمواصفات المزاد وتفاصيل السلعة من صورة أو وصف مختصر
 * يدعم الاستدعاء بكائن معلمات (AuctionSpecsParams) أو المعلمات المنفصلة للتوافقية
 */
export async function generateAuctionSpecs(
  paramsOrDesc: AuctionSpecsParams | string,
  legacyImageBase64?: string
): Promise<AuctionSpecsResult> {
  let briefDescription = '';
  let imageBase64: string | undefined;

  if (typeof paramsOrDesc === 'string') {
    briefDescription = paramsOrDesc;
    imageBase64 = legacyImageBase64;
  } else if (paramsOrDesc && typeof paramsOrDesc === 'object') {
    briefDescription = paramsOrDesc.briefDescription || '';
    imageBase64 = paramsOrDesc.imageBase64 || paramsOrDesc.images?.[0];
  }

  const client = getGenAIClient();

  if (client) {
    try {
      const prompt = `
أنت خبير تقييم سلع ومزادات تجارية معتمد في اليمن.
قم بتحليل الوصف المرفق والصورة (إن وجدت) واستخرج تفاصيل المزاد التالية بتنسيق JSON حصراً:
{
  "title": "عنوان تسويقي جذاب ودقيق للسلعة باللغة العربية",
  "category": "التصنيف المناسب (عقارات، سيارات ومحركات، إلكترونيات، بضائع عامة، طاقة وأجهزة)",
  "estimatedMarketValue": 1000000,
  "recommendedStartingPrice": 500000,
  "recommendedMinBidIncrement": 25000,
  "condition": "حالة السلعة (جديد، شبه جديد، مستعمل بحالة ممتازة، مستعمل)",
  "specificationsTable": { "المواصفة": "القيمة" },
  "warrantyAndInspectionTerms": "شروط المعاينة والفحص المقترحة لحماية الطرفين"
}
الوصف المدخل من المستخدم: "${briefDescription}"
`;

      const contents: any[] = [{ text: prompt }];

      if (imageBase64) {
        let mimeType = 'image/jpeg';
        let rawData = imageBase64;
        const match = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          rawData = match[2];
        }

        contents.push({
          inlineData: {
            mimeType,
            data: rawData,
          },
        });
      }

      const response = await client.models.generateContent({
        model: getModelName(),
        contents,
      });

      if (response && response.text) {
        const cleaned = cleanJsonString(response.text);
        const parsed = JSON.parse(cleaned);

        return {
          title: parsed.title || `${briefDescription.slice(0, 50)} - مزاد مميز`,
          category: parsed.category || 'بضائع عامة',
          estimatedMarketValue: Number(parsed.estimatedMarketValue) || 100000,
          recommendedStartingPrice: Number(parsed.recommendedStartingPrice) || 50000,
          recommendedMinBidIncrement: Number(parsed.recommendedMinBidIncrement) || 5000,
          condition: parsed.condition || 'مستعمل بحالة جيدة',
          specificationsTable: parsed.specificationsTable || {},
          warrantyAndInspectionTerms:
            parsed.warrantyAndInspectionTerms ||
            'فحص ومعاينة حرة لمدة 48 ساعة عبر نظام الضمان المالي لمنصة مزايد قبل تحرير المبلغ للبائع.',
          rawResponse: response.text,
          rawText: response.text,
          isSimulated: false,
        };
      }
    } catch (apiError) {
      console.warn('[Gemini AI] Live API call failed, using deterministic Yemeni mock:', apiError);
    }
  }

  // المولد الذكي المحلي المحاكي للسوق اليمني (Deterministic Yemeni Mock Generator)
  return generateDeterministicAuctionSpecs(briefDescription);
}

/**
 * المولد المحلي المحاكي لبيانات المزادات اليمنية
 */
function generateDeterministicAuctionSpecs(desc: string): AuctionSpecsResult {
  const d = (desc || '').toLowerCase();

  // 1. فئة الطاقة الشمسية والمولدات
  if (
    d.includes('طاقة') ||
    d.includes('شمس') ||
    d.includes('لوح') ||
    d.includes('بطار') ||
    d.includes('انفرتر') ||
    d.includes('إنفرتر') ||
    d.includes('مولد') ||
    d.includes('ماطور')
  ) {
    return {
      title: 'منظومة طاقة شمسية هجينة متكاملة 3.2KW مع بطارية ليثيوم LiFePO4 و4 ألواح مونو',
      category: 'طاقة وأجهزة',
      estimatedMarketValue: 980000,
      recommendedStartingPrice: 500000,
      recommendedMinBidIncrement: 25000,
      condition: 'جديد بالكرتون مع الضمان',
      specificationsTable: {
        'نوع المنظومة': 'هجينة (Solar Hybrid Inverter)',
        'قدرة الإنفرتر': '3200 واط موجة جيبية نقية (Must/Felicity)',
        'سعة البطارية': 'ليثيوم فوسفات الحديد 24V 200Ah مع نظام إدارة ذكي BMS',
        'الألواح الشمسية': '4 ألواح مونو هاف سيل 550 واط Tier-1',
        'منظم الشحن': 'MPPT داخلي 80A عالي الكفاءة',
        'موقع المعاينة والتسليم': 'صنعاء - شارع الستين الجنوبي',
      },
      warrantyAndInspectionTerms:
        'ضمان تشغيل وفحص لمدة 48 ساعة عبر وسيط منصة مزايد، وضمان صيانة واستبدال لمدة عام كامل على الإنفرتر و5 سنوات على خلايا الليثيوم.',
      rawResponse: 'SIMULATION_MODE',
      rawText: 'SIMULATION_MODE',
      isSimulated: true,
    };
  }

  // 2. فئة السيارات والمحركات
  if (
    d.includes('سيار') ||
    d.includes('برادو') ||
    d.includes('لاندكروزر') ||
    d.includes('تويوتا') ||
    d.includes('هايلوكس') ||
    d.includes('سنتافي') ||
    d.includes('محرك') ||
    d.includes('شاص') ||
    d.includes('صالون')
  ) {
    return {
      title: 'تويوتا لاندكروزر برادو TXL موديل 2020 وارد خليجي فل كامل V6',
      category: 'سيارات ومحركات',
      estimatedMarketValue: 28000000,
      recommendedStartingPrice: 16500000,
      recommendedMinBidIncrement: 200000,
      condition: 'مستعمل بحالة ممتازة (خالٍ من الصدمات والرش)',
      specificationsTable: {
        'سنة الصنع': '2020',
        'الممشى': '74,000 كم حقيقي',
        'المحرك': '6 سلندر 4.0L دفع رباعي مستمر 4WD',
        'ناقل الحركة': 'أوتوماتيك 6 سرعات مع نظام دبل خفيف وثقيل',
        'الجمارك واللوحات': 'مجمرك مرقم فاصل صنعاء فحص دوري ساري',
        'الوقود': 'بنزين اقتصادي',
        'المدينة': 'صنعاء - معارض السيارات',
      },
      warrantyAndInspectionTerms:
        'فحص شامل للجير والمحرك والشاصي والبودي في أي مركز فحص معتمد يختاره المشتري خلال مهلة المعاينة 48 ساعة قبل الإفراج عن مبلغ الضمان.',
      rawResponse: 'SIMULATION_MODE',
      rawText: 'SIMULATION_MODE',
      isSimulated: true,
    };
  }

  // 3. فئة العقارات والأراضي
  if (
    d.includes('عقار') ||
    d.includes('أرض') ||
    d.includes('شقة') ||
    d.includes('عمارة') ||
    d.includes('بيت') ||
    d.includes('لبنة') ||
    d.includes('فيلا')
  ) {
    return {
      title: 'عمارة سكنية استثمارية حجر دوران 4 أدوار - موقع استراتيجي صنعاء بيت بوس',
      category: 'عقارات',
      estimatedMarketValue: 185000000,
      recommendedStartingPrice: 110000000,
      recommendedMinBidIncrement: 1000000,
      condition: 'جديد تشطيب سوبر لوكس',
      specificationsTable: {
        'المساحة الإجمالية': '6 لبن عشاري حر معمد',
        'الواجهة': 'شارع 14 متر نافذ واجهة غربية حجر بيضاء',
        'عدد الأدوار': 'بدروم واسع + 4 أدوار متكررة',
        'عدد الشقق': '8 شقق مستقلة (كل شقة 4 غرف وصالة وحمامين ومطبخ)',
        'الخدمات': 'خزان أرضي سعة 4 وايتات، مصعد مؤسس، عدادات كهرباء ومياه مستقلة',
        'الوثائق': 'بصيرة شرعية وسجل عقاري معمد وخالٍ من أي رهونات',
      },
      warrantyAndInspectionTerms:
        'مطابقة الوثائق الشرعية وأصول البصائر لدى قلم التوثيق بالمحكمة المختصة خلال نافذة المعاينة والضمان قبل تحويل الدفعة النهائية.',
      rawResponse: 'SIMULATION_MODE',
      rawText: 'SIMULATION_MODE',
      isSimulated: true,
    };
  }

  // 4. فئة الإلكترونيات والهواتف الذكية وأجهزة الحاسوب
  if (
    d.includes('هاتف') ||
    d.includes('جوال') ||
    d.includes('آيفون') ||
    d.includes('ايفون') ||
    d.includes('سامسونج') ||
    d.includes('لابتوب') ||
    d.includes('كمبيوتر') ||
    d.includes('ديل') ||
    d.includes('ماك') ||
    d.includes('شاشة')
  ) {
    return {
      title: 'آبل آيفون 15 برو ماكس سعة 256 جيجابايت تيتانيوم طبيعي (يدعم شريحتين)',
      category: 'إلكترونيات',
      estimatedMarketValue: 880000,
      recommendedStartingPrice: 520000,
      recommendedMinBidIncrement: 20000,
      condition: 'شبه جديد - بطارية 98% مع كامل كرتونه وملحقاته الأصلية',
      specificationsTable: {
        'الموديل': 'Apple iPhone 15 Pro Max A3106',
        'سعة التخزين': '256 جيجابايت',
        'الذاكرة العشوائية': '8GB RAM',
        'الشاشة': '6.7 إنش Super Retina XDR OLED بتردد 120Hz',
        'المعالج': 'Apple A17 Pro (3 nm)',
        'البطارية': 'صحة البطارية 98% تدعم الشحن السريع 25W',
        'حالة الشريحة': 'شريحة فعلية Nano-SIM + شريحة إلكترونية eSIM مفتوح على كل الشبكات',
      },
      warrantyAndInspectionTerms:
        'فحص ومعاينة حرة للهاتف والشاشة وحساب الآيكلود لمدة 48 ساعة عبر وسيط منصة مزايد قبل تأكيد الاستلام.',
      rawResponse: 'SIMULATION_MODE',
      rawText: 'SIMULATION_MODE',
      isSimulated: true,
    };
  }

  // 5. السلع العامة والافتراضية
  return {
    title: desc.trim().length > 5 ? `${desc.trim()} - عرض مميز` : 'أصل تجاري فاخر معروض في مزاد علني',
    category: 'بضائع عامة',
    estimatedMarketValue: 1200000,
    recommendedStartingPrice: 600000,
    recommendedMinBidIncrement: 25000,
    condition: 'مستعمل بحالة ممتازة',
    specificationsTable: {
      'المنشأ': 'أصلي وارد دبي',
      'حالة الهيكل': 'سليم خالٍ من العيوب والكسور',
      'المعاينة': 'متاحة في صنعاء وعدن',
    },
    warrantyAndInspectionTerms: 'ضمان وساطة منصة مزايد لمدة 48 ساعة مع استرداد كامل في حال عدم المطابقة.',
    rawResponse: 'SIMULATION_MODE',
    rawText: 'SIMULATION_MODE',
    isSimulated: true,
  };
}

/**
 * 2. التوليد التلقائي لكراسة شروط ومواصفات المناقصة (RFP Generator)
 */
export async function generateTenderRFP(params: TenderRFPParams): Promise<TenderRFPResult>;
export async function generateTenderRFP(title: string, rawRequirements: string, category?: string): Promise<string>;
export async function generateTenderRFP(
  paramsOrTitle: TenderRFPParams | string,
  legacyRequirements?: string,
  category?: string
): Promise<TenderRFPResult | string> {
  let title = '';
  let rawRequirements = '';
  let rfpCategory = category;
  let currency: Currency = 'YER';
  const isDirectCall = typeof paramsOrTitle === 'string';

  if (typeof paramsOrTitle === 'string') {
    title = paramsOrTitle;
    rawRequirements = legacyRequirements || '';
  } else if (paramsOrTitle && typeof paramsOrTitle === 'object') {
    title = paramsOrTitle.title || '';
    rawRequirements = paramsOrTitle.rawRequirements || '';
    rfpCategory = paramsOrTitle.category || category;
    currency = paramsOrTitle.currency || 'YER';
  }

  const client = getGenAIClient();

  if (client) {
    try {
      const prompt = `
أنت مستشار قانوني وفني متخصص في صياغة كراسات الشروط والمناقصات وفق المعايير التجارية للسوق اليمني.
قم بصياغة كراسة شروط رسمية متكاملة لمناقصة توريد/تنفيذ بناءً على المدخلات التالية:
عنوان المناقصة: "${title}"
المتطلبات الأولية: "${rawRequirements}"

أخرج النتيجة بصيغة Markdown منظمة جداً تحتوي على:
1. مقدمة ونطاق العمل (Scope of Work)
2. الشروط والمواصفات الفنية الإلزامية (Technical Specifications)
3. الشروط المالية والضمانات البنكية أو النقدية المطلوبة (Financial Terms & Deposits)
4. الجدول الزمني للتسليم ومعايير التقييم الفني والمالي (Evaluation Matrix)
5. الشروط الجزائية عند التأخير أو الإخلال
`;

      const response = await client.models.generateContent({
        model: getModelName(),
        contents: [{ text: prompt }],
      });

      if (response && response.text) {
        const markdown = response.text;
        const resultObj: TenderRFPResult = {
          title,
          markdownContent: markdown,
          rfpMarkdown: markdown,
          summary: `كراسة شروط لمناقصة: ${title}`,
          estimatedBudget: 15000000,
          currency,
          submissionDeadlineDays: 14,
          scopeOfWork: 'تنفيذ وتوريد المتطلبات طبقاً لأعلى المعايير والمواصفات القياسية.',
          technicalSpecifications: ['شهادة جودة ومطابقة المواصفات', 'سجل تجاري وبطاقة ضريبية سارية'],
          financialTerms: 'عربون دخول محجوز بمحفظة الضمان ودفعات مستخلصة مرتبطة بالإنجاز.',
          evaluationCriteria: [
            { criterion: 'الكفاءة والخبرة الفنية', weight: 40 },
            { criterion: 'السعر التنافسي في المناقصة العكسية', weight: 60 },
          ],
          isSimulated: false,
        };

        if (isDirectCall) {
          return markdown;
        }
        return resultObj;
      }
    } catch (apiError) {
      console.warn('[Gemini AI] Live RFP generation failed, using deterministic mock:', apiError);
    }
  }

  // كراسة الشروط الافتراضية المحاكية
  const markdown = `# كراسة الشروط والمواصفات الفنية لمناقصة: ${title}

## 1. مقدمة ونطاق العمل (Scope of Work)
تعلن الجهة المستفيدة عبر **منصة مزايد للمناقصات والمزايدات الذكية** عن طرح المناقصة العامة لتنفيذ وتوريد الأعمال طبقاً للمتطلبات التالية:
> ${rawRequirements}

يلتزم المقاول/المورد المؤهل بتقديم العروض الفنية والمالية بطريقة المناقصة العكسية التنافسية مع ضمان الحفاظ على سرية هوية المقاولين المتنافسين طوال فترة المزايدة الحية.

## 2. الشروط والمواصفات الفنية الإلزامية (Technical Specifications)
1. **جودة المواد والمعدات**: يجب أن تكون جميع المواد والتجهيزات الموردة مطابقة للمواصفات القياسية ومعتمدة بكتالوجات رسمية وشهادات اختبار معملية معتمدة.
2. **الكادر الفني المشرف**: يُلزم المقاول بتوفير مهندس موقع متخصص ومشرف جودة ذوي خبرة موثقة لا تقل عن 5 سنوات في مشاريع مماثلة داخل الجمهورية اليمنية.
3. **فترة الضمان والصيانة**: ضمان شامل للأعمال ضد عيوب التصنيع والتنفيذ لمدة لا تقل عن سنة ميلادية كاملة تبدأ من تاريخ الاستلام الابتدائي المعتمد.

## 3. الشروط المالية والضمانات البنكية (Financial Terms & Deposits)
- **ضمان دخول المناقصة**: تجميد عربون دخول ابتدائي بنسبة 2% من السقف التقديري في محفظة الضمان الرقمية للمنصة (Escrow) عبر بنك الكريمي أو ون كاش.
- **آلية الصرف والوساطة**: تخضع الدفعات لنظام المستخلصات المرحلية بعد تدقيق الاستشاري وموافقة الطرفين مع خصم 2.5% عمولة تشغيلية لمنصة مزايد.

## 4. الجدول الزمني ومعايير التقييم (Evaluation Matrix)
- **فترة تقديم العروض**: 14 يوماً من تاريخ النشر.
- **معيار الترسية المشروطة**:
  - العرض الفني والامتثال للمواصفات: 40%
  - السعر التنافسي النهائي في غرفة المناقصة العكسية: 60%

## 5. الشروط الجزائية عند التأخير أو الإخلال (Penalty Terms)
في حال تأخر المقاول عن موعد التسليم النهائي المتفق عليه، تُطبق غرامة تأخير بواقع 0.1% عن كل يوم تأخير بحد أقصى 10% من إجمالي القيمة التعاقدية.
`;

  const simulatedResult: TenderRFPResult = {
    title,
    markdownContent: markdown,
    rfpMarkdown: markdown,
    summary: `كراسة شروط ومواصفات مناقصة: ${title}`,
    estimatedBudget: 15000000,
    currency,
    submissionDeadlineDays: 14,
    scopeOfWork: 'تنفيذ وتوريد المتطلبات طبقاً لأعلى المعايير والمواصفات القياسية في السوق اليمني.',
    technicalSpecifications: [
      'شهادة جودة ومطابقة المواصفات الفنية',
      'سجل تجاري وبطاقة ضريبية سارية المفعول',
      'جدول زمني تفصيلي لمراحل التنفيذ والتسليم',
    ],
    financialTerms: 'عربون دخول محجوز بمحفظة الضمان ودفعات مستخلصة مرتبطة بنسب الإنجاز.',
    evaluationCriteria: [
      { criterion: 'التقييم الفني وسابقة الأعمال', weight: 40 },
      { criterion: 'السعر التنافسي في غرفة المناقصة العكسية', weight: 60 },
    ],
    isSimulated: true,
  };

  if (isDirectCall) {
    return markdown;
  }
  return simulatedResult;
}

/**
 * 3. تحليل أنماط المزايدات وكشف التلاعب والمزايدات الوهمية (Anti-Shill Bidding Shield)
 */
export async function analyzeShillBiddingRisk(
  paramsOrBids: ShillBiddingParams | BiddingTelemetry[],
  legacySellerIp?: string
): Promise<ShillBiddingAnalysisResult> {
  let bids: BiddingTelemetry[] = [];
  let sellerId: string | undefined;
  let sellerIp: string | undefined;

  if (Array.isArray(paramsOrBids)) {
    bids = paramsOrBids;
    sellerIp = legacySellerIp;
  } else if (paramsOrBids && typeof paramsOrBids === 'object') {
    bids = paramsOrBids.bids || [];
    sellerId = paramsOrBids.sellerId;
    sellerIp = paramsOrBids.sellerIp;
  }

  if (!bids || bids.length === 0) {
    return {
      isSuspicious: false,
      confidenceScore: 0.0,
      riskLevel: 'LOW',
      reasons: ['لا توجد مزايدات مسجلة لتحليلها'],
      recommendedAction: 'DISMISS',
      analyzedBidsCount: 0,
      detectedAnomalies: {
        sellerIpMatches: 0,
        ipClusteringCount: 0,
        lastSecondBidsCount: 0,
      },
      isSimulated: true,
    };
  }

  const client = getGenAIClient();

  if (client) {
    try {
      const prompt = `
قم بتحليل سجل المزايدات التالي لمزاد تجاري لتحديد ما إذا كان هناك تلاعب أو مزايدات وهمية لرفع السعر مصطنعاً (Shill Bidding):
عنوان IP صاحب المزاد: "${sellerIp || 'غير محدد'}"
سجل المزايدات الأخيرة:
${JSON.stringify(bids, null, 2)}

أجب بتنسيق JSON حصراً يحتوي على:
- isSuspicious: (true/false)
- confidenceScore: درجة الثقة من 0.0 إلى 1.0
- riskLevel: (LOW, MEDIUM, HIGH, CRITICAL)
- reasons: قائمة بأسباب الشك
- recommendedAction: (CANCEL_BID, FREEZE_ACCOUNT, ALLOW_MONITOR, DISMISS)
`;

      const response = await client.models.generateContent({
        model: getModelName(),
        contents: [{ text: prompt }],
      });

      if (response && response.text) {
        const cleaned = cleanJsonString(response.text);
        const parsed = JSON.parse(cleaned);

        return {
          isSuspicious: Boolean(parsed.isSuspicious),
          confidenceScore: Number(parsed.confidenceScore) || 0.5,
          riskLevel: parsed.riskLevel || 'LOW',
          reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['أنماط مزايدة تم تحليلها بنجاح'],
          recommendedAction: parsed.recommendedAction || 'DISMISS',
          analyzedBidsCount: bids.length,
          detectedAnomalies: {
            sellerIpMatches: sellerIp ? bids.filter((b) => b.ipAddress === sellerIp).length : 0,
            ipClusteringCount: 0,
            lastSecondBidsCount: bids.filter((b) => b.secondsBeforeEnd <= 5).length,
          },
          isSimulated: false,
        };
      }
    } catch (apiError) {
      console.warn('[Gemini AI] Live shill bidding analysis failed, using heuristic engine:', apiError);
    }
  }

  // المحرك التحليلي المحلي الدقيق والمطابق للمعايير
  const reasons: string[] = [];
  let score = 0.0;

  // 1. تطابق عنوان الـ IP بين المزايد والبائع
  let sellerIpMatches = 0;
  if (sellerIp) {
    const matchingSellerIp = bids.filter((b) => b.ipAddress === sellerIp);
    sellerIpMatches = matchingSellerIp.length;
    if (sellerIpMatches > 0) {
      score += 0.75;
      reasons.push(`تم رصد مزايدات صادرة من نفس عنوان الـ IP للبائع (${sellerIp})`);
    }
  }

  // 2. محاولة مزايدة صريحة من حساب البائع نفسه
  if (sellerId) {
    const directSellerBids = bids.filter((b) => b.bidderId === sellerId);
    if (directSellerBids.length > 0) {
      score += 0.85;
      reasons.push('محاولة صريحة للمزايدة من حساب البائع نفسه لرفع السعر مصطنعاً');
    }
  }

  // 3. تركز المزايدات على عنوان IP واحد أو بصمة جهاز واحدة
  const ipCounts: Record<string, number> = {};
  bids.forEach((b) => {
    if (b.ipAddress) {
      ipCounts[b.ipAddress] = (ipCounts[b.ipAddress] || 0) + 1;
    }
  });

  const ipValues = Object.values(ipCounts);
  const maxBidsFromSingleIp = ipValues.length > 0 ? Math.max(...ipValues) : 0;
  let ipClusteringCount = 0;

  if (maxBidsFromSingleIp >= 4 && bids.length >= 5) {
    ipClusteringCount = maxBidsFromSingleIp;
    score += 0.35;
    reasons.push(`تركز غير طبيعي للمزايدات (${maxBidsFromSingleIp} مزايدات) من عنوان IP واحد`);
  }

  // 4. تتابع سريع جداً للمزايدات في الثواني الأخيرة (Last-second bot sniping)
  const rapidSnipes = bids.filter((b) => typeof b.secondsBeforeEnd === 'number' && b.secondsBeforeEnd <= 5);
  const lastSecondBidsCount = rapidSnipes.length;
  if (lastSecondBidsCount >= 3) {
    score += 0.2;
    reasons.push('تتابع سريع للمزايدات في الثواني الخمس الأخيرة يشير إلى روبوتات مزايدة');
  }

  const finalScore = Math.min(Number(score.toFixed(2)), 1.0);
  const isSuspicious = finalScore >= 0.5;

  let riskLevel: ShillBiddingAnalysisResult['riskLevel'] = 'LOW';
  let recommendedAction = 'DISMISS';

  if (finalScore >= 0.75) {
    riskLevel = 'CRITICAL';
    recommendedAction = 'FREEZE_ACCOUNT';
  } else if (finalScore >= 0.5) {
    riskLevel = 'HIGH';
    recommendedAction = 'CANCEL_BID';
  } else if (finalScore >= 0.25) {
    riskLevel = 'MEDIUM';
    recommendedAction = 'ALLOW_MONITOR';
  }

  if (reasons.length === 0) {
    reasons.push('أنماط المزايدة طبيعية وتتوافق مع حركة السوق التنافسية العادية');
  }

  return {
    isSuspicious,
    confidenceScore: finalScore,
    riskLevel,
    reasons,
    recommendedAction,
    analyzedBidsCount: bids.length,
    detectedAnomalies: {
      sellerIpMatches,
      ipClusteringCount,
      lastSecondBidsCount,
    },
    isSimulated: true,
  };
}
