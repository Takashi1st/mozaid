'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Wallet, 
  Activity, 
  Users, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Play, 
  RotateCcw, 
  Clock, 
  FileCheck, 
  UserCheck 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'command' | 'finance' | 'security' | 'kyc' | 'analytics'>('command');
  
  // حالة المزاد الحي في غرفة التحكم
  const [isAuctionPaused, setIsAuctionPaused] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // سندات الإيداع قيد التدقيق
  const [deposits, setDeposits] = useState([
    {
      id: 'tx-101',
      senderName: 'ياسر محمد الآنسي',
      channel: 'بنك الكريمي الإسلامي (حساب مميز)',
      channelKey: 'kuraimi_bank',
      refNumber: 'KR-982410',
      amount: 1500000,
      currency: 'YER',
      timestamp: 'منذ 10 دقائق',
      status: 'pending',
    },
    {
      id: 'tx-102',
      senderName: 'شركة تهامة للاستيراد',
      channel: 'محفظة ون كاش (OneCash)',
      channelKey: 'one_cash',
      refNumber: 'OC-554109',
      amount: 4500000,
      currency: 'YER',
      timestamp: 'منذ 25 دقيقة',
      status: 'pending',
    },
    {
      id: 'tx-103',
      senderName: 'موسى صالح الحاوري',
      channel: 'شبكة النجم للحوالات',
      channelKey: 'al_najm',
      refNumber: 'NJ-331298',
      amount: 800000,
      currency: 'YER',
      timestamp: 'منذ 40 دقيقة',
      status: 'pending',
    },
  ]);

  // طلبات توثيق الهوية KYC
  const [kycRequests, setKycRequests] = useState([
    {
      id: 'kyc-01',
      fullName: 'جمال عبده أحمد القدسي',
      phone: '771234567 (يمن موبايل)',
      nationalId: '01010045892',
      city: 'تعز',
      aiFaceMatchScore: 97.4,
      status: 'pending',
    },
    {
      id: 'kyc-02',
      fullName: 'مؤسسة صعدة للطاقة الشمسية',
      phone: '734567890 (يو YOU)',
      nationalId: '04020011934',
      city: 'صنعاء',
      aiFaceMatchScore: 95.8,
      status: 'pending',
    },
  ]);

  // تنبيهات مكافحة التلاعب والمزايدات الوهمية (Shill Bidding)
  const [shillAlerts] = useState([
    {
      id: 'alt-01',
      listingTitle: 'قطعة أرض تجارية - صنعاء بيت بوس',
      suspectBidder: 'حساب: طارق الصنعاني (ID: u-889)',
      riskLevel: 'عالي (HIGH)',
      riskScore: 0.89,
      reason: 'تطابق عنوان الـ IP وشبكة الاتصال تماماً مع صاحب المزاد (شبهة رفع السعر ذاتياً)',
      timestamp: 'منذ 5 دقائق',
    },
    {
      id: 'alt-02',
      listingTitle: 'شاحنة مرسيدس أكتروس 2018',
      suspectBidder: 'حساب: مزايد سريع (ID: u-904)',
      riskLevel: 'متوسط (MEDIUM)',
      riskScore: 0.65,
      reason: 'نمط مزايدة تصاعدي سريع متكرر 7 مرات دون دفع أي عربون تأمين',
      timestamp: 'منذ 18 دقيقة',
    },
  ]);

  const handleApproveDeposit = (id: string) => {
    setDeposits(deposits.filter((d) => d.id !== id));
    setActionNotice('تم اعتماد السند وشحن رصيد المحفظة فوراً للمستخدم.');
  };

  const handleRejectDeposit = (id: string) => {
    setDeposits(deposits.filter((d) => d.id !== id));
    setActionNotice('تم رفض سند الإيداع وإشعار المستخدم بالمراجعة.');
  };

  const handleApproveKyc = (id: string) => {
    setKycRequests(kycRequests.filter((k) => k.id !== id));
    setActionNotice('تم توثيق الحساب بالرقم الوطني بنجاح ومنح شارة الموثوقية.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" dir="rtl">
      
      {/* عنوان لوحة القيادة */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
            غرفة التحكم وإدارة العمليات (Admin Command Center)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            مراقبة المزادات الحية، تدقيق سندات الصرافة اليمنية، فحص الـ KYC، وحماية النزاهة بالذكاء الاصطناعي
          </p>
        </div>

        {/* إشعار الإجراء */}
        {actionNotice && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs px-4 py-2 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
        )}
      </div>

      {/* شريط التبويبات الرئيسي للوحة */}
      <div className="flex flex-wrap gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('command')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'command'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          غرفة المراقبة اللحظية
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'finance'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" />
          التدقيق المالي وسندات الصرافة ({deposits.length})
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'security'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          مكافحة التلاعب بالـ AI ({shillAlerts.length})
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'kyc'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          توثيق الهويات KYC ({kycRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          مؤشرات التداول (BI)
        </button>
      </div>

      {/* 1. غرفة المراقبة اللحظية والتحكم في الطوارئ */}
      {activeTab === 'command' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">المزاد الحي النشط حالياً</h2>
                <span className="text-xs text-slate-400">تويوتا لاندكروزر V8 صالون 2022 نظيف مجمرك</span>
              </div>

              {/* أزرار الطوارئ للمشرف */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsAuctionPaused(!isAuctionPaused);
                    setActionNotice(isAuctionPaused ? 'تم استئناف المزاد الحي بنجاح.' : 'تم إيقاف المزاد مؤقتاً للطوارئ.');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    isAuctionPaused
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  }`}
                >
                  {isAuctionPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {isAuctionPaused ? 'استئناف المزاد' : 'إيقاف مؤقت للمزاد'}
                </button>

                <button
                  onClick={() => setActionNotice('تم التراجع عن آخر مزايدة وإعادتها للسعر السابق.')}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  إلغاء آخر مزايدة
                </button>

                <button
                  onClick={() => setActionNotice('تمت إضافة 180 ثانية يدوياً لعداد المزاد.')}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-700 transition"
                >
                  <Clock className="w-4 h-4 text-emerald-400" />
                  +3 دقائق إضافية
                </button>
              </div>
            </div>

            {/* إحصائيات سريعة للغرفة الحية */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs text-slate-500 block">السعر الحالي</span>
                <span className="text-xl font-black text-emerald-400 font-mono">42,500,000 ر.ي</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs text-slate-500 block">المتواجدون بالغرفة</span>
                <span className="text-xl font-black text-slate-200 font-mono">48 مزايداً</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs text-slate-500 block">مجموع المزايدات</span>
                <span className="text-xl font-black text-slate-200 font-mono">14 عطاء</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                <span className="text-xs text-slate-500 block">حالة الرقابة</span>
                <span className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
                  <CheckCircle className="w-4 h-4" />
                  نشطة وطبيعية
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. التدقيق المالي وسندات المحافظ اليمنية */}
      {activeTab === 'finance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-100">طابور تدقيق الإيداعات وسندات الصرافة</h2>
              <span className="text-xs text-slate-400">تأكيد شحن رصيد المحافظ عبر بنك الكريمي، ون كاش، جوالي، والشبكات</span>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full">
              {deposits.length} سندات بانتظار الاعتماد
            </span>
          </div>

          <div className="space-y-3">
            {deposits.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">{item.senderName}</span>
                    <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-0.5 rounded-full">
                      {item.channel}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>رقم السند/الحوالة: <strong className="font-mono text-slate-200">{item.refNumber}</strong></span>
                    <span>• {item.timestamp}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left font-mono">
                    <span className="text-base font-black text-emerald-400 block">{item.amount.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500">{item.currency}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveDeposit(item.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      اعتماد
                    </button>
                    <button
                      onClick={() => handleRejectDeposit(item.id)}
                      className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      رفض
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. مركز مكافحة التلاعب والمزايدات الوهمية (Anti-Shill AI) */}
      {activeTab === 'security' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-slate-100">تنبيهات كشف الاحتيال والمزايدات الوهمية</h2>
            <span className="text-xs text-slate-400">تحليل الذكاء الاصطناعي لسلوك المزايدين وتطابق عناوين الـ IP والحسابات المرتبطة</span>
          </div>

          <div className="space-y-3">
            {shillAlerts.map((alt) => (
              <div
                key={alt.id}
                className="bg-rose-950/20 border border-rose-800/40 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      مستوى الخطورة: {alt.riskLevel}
                    </span>
                    <span className="text-xs text-slate-400">{alt.timestamp}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-200">{alt.listingTitle}</h3>
                  <p className="text-xs text-rose-300/80">{alt.reason}</p>
                  <span className="text-[11px] text-slate-500 font-mono block">{alt.suspectBidder}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActionNotice('تم تجميد حساب المزايد المشبوه وإلغاء مزايداته.')}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition"
                  >
                    تجميد الحساب
                  </button>
                  <button 
                    onClick={() => setActionNotice('تم التغاضي عن التنبيه وتصنيفه كحركة مقبولة.')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition"
                  >
                    تجاهل
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. توثيق الهويات الوطنية KYC */}
      {activeTab === 'kyc' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-slate-100">مراجعة وتوثيق الهويات بالبطاقة الوطنية (KYC)</h2>
            <span className="text-xs text-slate-400">فحص صور البطاقات الشخصية واستخراج البيانات ومطابقة الوجوه بالذكاء الاصطناعي</span>
          </div>

          <div className="space-y-3">
            {kycRequests.map((k) => (
              <div
                key={k.id}
                className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200">{k.fullName}</span>
                    <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded-full">
                      {k.city}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>الرقم الوطني: <strong className="font-mono text-slate-300">{k.nationalId}</strong></span>
                    <span>• {k.phone}</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold block">
                    مؤشر مطابقة الوجه بالـ AI: {k.aiFaceMatchScore}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveKyc(k.id)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition"
                  >
                    <UserCheck className="w-4 h-4" />
                    اعتماد التوثيق
                  </button>
                  <button
                    onClick={() => setKycRequests(kycRequests.filter((req) => req.id !== k.id))}
                    className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition"
                  >
                    رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. مؤشرات الأداء والتقارير المالية (BI) */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center space-y-2">
            <span className="text-xs text-slate-400 block">إجمالي قيمة التداولات (GMV)</span>
            <div className="text-3xl font-black text-emerald-400 font-mono">184,250,000</div>
            <span className="text-xs text-slate-500">ريال يمني (خلال آخر 30 يوماً)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center space-y-2">
            <span className="text-xs text-slate-400 block">صافي أرباح وعمولات المنصة</span>
            <div className="text-3xl font-black text-amber-400 font-mono">4,606,250</div>
            <span className="text-xs text-slate-500">ريال يمني (بنسبة 2.5% من الصفقات الناجحة)</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-center space-y-2">
            <span className="text-xs text-slate-400 block">نسبة نجاح الترسية وفض النزاعات</span>
            <div className="text-3xl font-black text-teal-400 font-mono">98.2%</div>
            <span className="text-xs text-slate-500">خالية من أي تعثر مالي أو تخلّف</span>
          </div>
        </div>
      )}

    </div>
  );
};
