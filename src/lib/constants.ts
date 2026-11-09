/**
 * الثوابت الأساسية لمنصة مزايد (Mozaid AI Constants)
 */

export const YEMEN_CITIES = [
  'صنعاء',
  'عدن',
  'تعز',
  'الحديدة',
  'المكلا',
  'إب',
  'ذمار',
  'سيئون',
  'مأرب',
  'عمران',
  'حجة',
  'صعدة',
  'لحج',
  'أبين',
  'شبوة',
  'المهرة',
] as const;

export const PAYMENT_CHANNELS_CONFIG = [
  {
    id: 'kuraimi_bank',
    nameAr: 'بنك الكريمي الإسلامي (حساب مميز)',
    nameEn: 'Kuraimi Bank',
    type: 'bank',
    accountNumber: '12345678',
    beneficiaryName: 'شركة مزايد للخدمات الإلكترونية',
  },
  {
    id: 'one_cash',
    nameAr: 'محفظة ون كاش (OneCash)',
    nameEn: 'OneCash Wallet',
    type: 'wallet',
    accountNumber: '777000111',
    beneficiaryName: 'مزايد للتقنية',
  },
  {
    id: 'jwali',
    nameAr: 'محفظة جوالي',
    nameEn: 'Jwali Wallet',
    type: 'wallet',
    accountNumber: '777000222',
    beneficiaryName: 'مزايد للتقنية',
  },
  {
    id: 'floosak',
    nameAr: 'محفظة فلوسك (بنك اليمن والكويت)',
    nameEn: 'Floosak Wallet',
    type: 'wallet',
    accountNumber: '777000444',
    beneficiaryName: 'مزايد للتقنية',
  },
  {
    id: 'cash_wallet',
    nameAr: 'محفظة كاش',
    nameEn: 'Cash Wallet',
    type: 'wallet',
    accountNumber: '733000333',
    beneficiaryName: 'مزايد للتقنية',
  },
  {
    id: 'al_najm',
    nameAr: 'شبكة النجم للحوالات',
    nameEn: 'Al-Najm Express',
    type: 'exchange',
    recipientName: 'منصة مزايد للتجارة الإلكترونية',
  },
  {
    id: 'al_omqy',
    nameAr: 'شركة العمقي وإخوانه للصرافة',
    nameEn: 'Al-Omqy Exchange',
    type: 'exchange',
    recipientName: 'منصة مزايد للتجارة الإلكترونية',
  },
] as const;

export const AUCTION_RULES = {
  // تمديد المزاد التلقائي (Anti-Sniping)
  ANTI_SNIPING_TRIGGER_WINDOW_SECONDS: 120, // آخر دقيقتين
  ANTI_SNIPING_EXTENSION_SECONDS: 120, // إضافة دقيقتين
  MAX_TIMES_EXTENDED: 20, // أقصى عدد مرات تمديد متتالية لمنع التعليق اللانهائي

  // مهلة المعاينة الافتراضية للمشتري
  DEFAULT_INSPECTION_WINDOW_HOURS: 48,

  // نسبة عمولة المنصة
  PLATFORM_FEE_PERCENT: 2.5, // 2.5% من إجمالي قيمة الصفقة
};
