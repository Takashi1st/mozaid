'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Gavel, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  ArrowLeft, 
  Flame, 
  CheckCircle2, 
  Wallet, 
  Layers,
  Building,
  Car,
  Sun,
  Laptop,
  Truck,
  Cog,
  Bell,
  Zap,
  CreditCard,
  RefreshCw,
  Activity
} from 'lucide-react';

interface LiveAuction {
  id: string;
  title: string;
  category: string;
  city: string;
  currentPrice: number;
  currency: string;
  bidsCount: number;
  timeLeftSeconds: number;
  isHot?: boolean;
}

interface LiveTender {
  id: string;
  title: string;
  requester: string;
  city: string;
  lowestBid: number;
  budgetCap: number;
  currency: string;
  offersCount: number;
  timeLeftSeconds: number;
  category: string;
}

const getCategoryIcon = (category: string) => {
  if (category.includes('سيارات') || category.includes('مركبات')) return Car;
  if (category.includes('عقار') || category.includes('أراضي')) return Building;
  if (category.includes('طاقة') || category.includes('شمسية')) return Sun;
  if (category.includes('إلكترون') || category.includes('أجهزة')) return Laptop;
  if (category.includes('معدات') || category.includes('مزارع')) return Cog;
  if (category.includes('شاحنات') || category.includes('نقل')) return Truck;
  return Gavel;
};

export default function HomePage() {
  const [tickerIndex, setTickerIndex] = useState(0);
  const [liveAuctions, setLiveAuctions] = useState<LiveAuction[]>([]);
  const [liveTenders, setLiveTenders] = useState<LiveTender[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const liveTickerEvents = [
    { text: 'مزاد جديد: تويوتا لاندكروزر 2022 بصنعاء - آخر عرض 42,500,000 ر.ي (+250,000 ر.ي)', icon: Bell },
    { text: 'مناقصة عكسية: توريد منظومة طاقة شمسية 150KW بعدن - أقل عرض 72,000 $', icon: Zap },
    { text: 'ضمان مالي: تم إفراج مبلغ 12,000,000 ر.ي للبائع بعد اكتمال 48 ساعة معاينة بنجاح', icon: ShieldCheck },
    { text: 'تمديد ذكي Anti-Sniping: تم تمديد مزاد عقار حدة +120 ثانية لتنافس اللحظات الأخيرة', icon: Flame },
    { text: 'إيداع مؤكد: تم قيد 1,500,000 ر.ي عبر بنك الكريمي لمحفظة مزايد موثق', icon: CreditCard }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % liveTickerEvents.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [liveTickerEvents.length]);

  // جلب البيانات الحية 100% من PostgreSQL
  const fetchLiveData = async () => {
    try {
      const [aucRes, tndRes] = await Promise.all([
        fetch('/api/auctions', { cache: 'no-store' }),
        fetch('/api/tenders', { cache: 'no-store' })
      ]);

      if (aucRes.ok) {
        const aucData = await aucRes.json();
        if (aucData.success && Array.isArray(aucData.auctions)) {
          setLiveAuctions(
            aucData.auctions
              .filter((a: any) => a.time_left_seconds > 0)
              .map((a: any) => ({
                id: a.id,
                title: a.title,
                category: a.category_name || 'عام',
                city: a.location_city || 'صنعاء',
                currentPrice: parseFloat(a.current_price),
                currency: a.currency,
                bidsCount: parseInt(a.total_bids_count || 0, 10),
                timeLeftSeconds: Math.max(0, parseInt(a.time_left_seconds || 0, 10)),
                isHot: a.time_left_seconds <= 300,
              }))
          );
        }
      }

      if (tndRes.ok) {
        const tndData = await tndRes.json();
        if (tndData.success && Array.isArray(tndData.tenders)) {
          setLiveTenders(
            tndData.tenders
              .filter((t: any) => t.time_left_seconds > 0)
              .map((t: any) => ({
                id: t.id,
                title: t.title,
                requester: t.requester_org || 'جهة معتمدة',
                city: t.location_city || 'عدن',
                lowestBid: parseFloat(t.lowest_bid || t.budget_cap || 0),
                budgetCap: parseFloat(t.budget_cap || 0),
                currency: t.currency,
                offersCount: parseInt(t.offers_count || 0, 10),
                timeLeftSeconds: Math.max(0, parseInt(t.time_left_seconds || 0, 10)),
                category: t.category_name || 'طاقة ومولدات',
              }))
          );
        }
      }
    } catch (err) {
      console.error('Error fetching live home data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 15000);
    return () => clearInterval(interval);
  }, []);

  // عداد تنازلي لحظي — إخفاء فوري لأي عرض انتهى وقته (100% حي)
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveAuctions((prev) =>
        prev
          .map((a) => ({ ...a, timeLeftSeconds: a.timeLeftSeconds - 1 }))
          .filter((a) => a.timeLeftSeconds > 0)
      );
      setLiveTenders((prev) =>
        prev
          .map((t) => ({ ...t, timeLeftSeconds: t.timeLeftSeconds - 1 }))
          .filter((t) => t.timeLeftSeconds > 0)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatSeconds = (sec: number) => {
    if (sec <= 0) return 'منتهي';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h} س و ${m % 60} د`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTenderTime = (sec: number) => {
    if (sec <= 0) return 'منتهية';
    const hours = Math.floor(sec / 3600);
    if (hours > 24) {
      return `${Math.floor(hours / 24)} يوم متبقي`;
    }
    if (hours > 0) {
      return `${hours} ساعة متبقية`;
    }
    return `${Math.floor(sec / 60)} دقيقة متبقية`;
  };

  return (
    <div className="space-y-10 pb-16">
      
      {/* 1. شريط الأحداث الحية المتجددة (Live Event Ticker) */}
      <div className="bg-slate-900 border-b border-slate-800 text-xs py-2 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="hidden sm:inline">البث الحي للأحداث:</span>
          </div>
          <div className="flex-1 truncate text-slate-300 font-medium transition-all duration-500 text-right flex items-center gap-2">
            {React.createElement(liveTickerEvents[tickerIndex].icon, { className: 'w-4 h-4 text-emerald-400 shrink-0 inline' })}
            <span>{liveTickerEvents[tickerIndex].text}</span>
          </div>
          <div className="text-[11px] text-slate-500 shrink-0 font-mono">
            تحديث مباشر
          </div>
        </div>
      </div>

      {/* 2. قسم البطل (Hero Section) */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 p-8 sm:p-12 lg:p-16">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>منصة مزايد — سوق المزادات والمناقصات الأول في اليمن</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              مزادات حية ومناقصات تنافسية بضمان مالي موثوق
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              المنصة اليمنية الأولى للمزادات التصاعدية والمناقصات العكسية مع نظام وساطة مالية (Escrow) يحمي الطرفين ويدعم بنك الكريمي، ون كاش، وجوالي مع مهلة فحص 48 ساعة.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/auctions"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition flex items-center gap-2"
              >
                <Gavel className="w-4 h-4" />
                <span>دخول سوق المزادات الحية</span>
              </Link>

              <Link
                href="/tenders"
                className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm transition flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>استعراض المناقصات العكسية</span>
              </Link>
            </div>

            {/* ميزات سريعة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>وساطة مالية Escrow (2.5%)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>نافذة معاينة 48 ساعة</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>توثيق الهوية KYC ثلاثي المستويات</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>كريمي • ون كاش • جوالي</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. بطاقات الوصول السريع (Quick Actions) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/auctions/create"
            className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">خطوات مبسطة</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition">طرح مزاد جديد</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                حدد بيانات سلعتك والصور لبدء المزايدة التنافسية المباشرة وحماية القيمة العادلة.
              </p>
            </div>
          </Link>

          <Link
            href="/tenders/create"
            className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">B2B / توريد</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition">طرح كراسة مناقصة RFP</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                صياغة شروط التوريد والمواصفات الفنية وتلقي عروض الأسعار التنافسية بالوقت الفعلي.
              </p>
            </div>
          </Link>

          <Link
            href="/wallet"
            className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900 transition flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 font-medium">ريال • دولار • سعودي</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-teal-400 transition">شحن المحفظة وسندات الإيداع</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                إيداع عبر حساب الكريمي أو ون كاش وتجميد العربون للمزايدة بسهولة وأمان.
              </p>
            </div>
          </Link>

          <Link
            href="/kyc"
            className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-medium">3 مستويات توثيق</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-indigo-400 transition">توثيق الهوية الوطنية KYC</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                المستوى 1 (هاتف) • المستوى 2 (هوية حية) • المستوى 3 (10 صفقات مكتملة).
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* 4. المزادات الحية الجارية (Featured Live Auctions) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">المزادات الحية الجارية الآن</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                  مفتوحة الآن
                </span>
              </div>
              <p className="text-xs text-slate-400">تحديث أسعار وعروض المزايدين لحظياً مع ميزة تمديد الوقت (+120s)</p>
            </div>
          </div>
          <Link
            href="/auctions"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
          >
            <span>عرض كافة المزادات</span>
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>

        {liveAuctions.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
            <Gavel className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">لا توجد مزادات مفتوحة حالياً</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              تم إغلاق وحذف كافة المزادات السابقة فور انتهاء عداداتها لمنع أي عروض منتهية.
            </p>
            <Link href="/auctions/create" className="text-xs text-emerald-400 hover:underline pt-2 inline-block font-semibold">
              طرح مزاد جديد
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {liveAuctions.map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {item.category}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-800/60 text-rose-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        <span>{formatSeconds(item.timeLeftSeconds)}</span>
                      </span>
                    </div>

                    <div className="h-28 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 flex items-center justify-center">
                      <CategoryIcon className="w-14 h-14 text-emerald-400 drop-shadow" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{item.city}</span>
                        <span>{item.bidsCount} مزايدة مسجلة</span>
                      </div>
                      <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">أعلى عرض حالي</span>
                      <span className="text-base font-extrabold text-emerald-400 font-mono">
                        {item.currentPrice.toLocaleString()} <span className="text-xs text-slate-400">{item.currency}</span>
                      </span>
                    </div>
                    <Link
                      href={`/auctions/${item.id}`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                    >
                      زايد الآن
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. المناقصات العكسية المميزة (Reverse Procurement Tenders) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">المناقصات والتوريدات التنافسية (عكسية)</h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-500/30 text-amber-400">
                  طلبات نشطة
                </span>
              </div>
              <p className="text-xs text-slate-400">تنافس الموردين لتقديم أقل سعر مطابق لكراسة الشروط الفنية</p>
            </div>
          </div>
          <Link
            href="/tenders"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 group"
          >
            <span>عرض كافة المناقصات</span>
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>

        {liveTenders.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
            <FileText className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-white">لا توجد مناقصات جارية حالياً</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              تم إغلاق كافة طلبات التوريد المنتهية تلقائياً.
            </p>
            <Link href="/tenders/create" className="text-xs text-amber-400 hover:underline pt-2 inline-block font-semibold">
              طرح كراسة شروط RFP جديدة
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {liveTenders.map((tender) => (
              <div
                key={tender.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 p-6 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {tender.category}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{formatTenderTime(tender.timeLeftSeconds)}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug">
                    {tender.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>الجهة: <strong className="text-slate-200">{tender.requester}</strong></span>
                    <span>المدينة: <strong className="text-slate-200">{tender.city}</strong></span>
                    <span>العروض: <strong className="text-emerald-400">{tender.offersCount} موردين</strong></span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">أقل عرض تنافسي مسجل</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-amber-400 font-mono">
                        {tender.lowestBid.toLocaleString()} {tender.currency}
                      </span>
                      <span className="text-xs text-slate-500 line-through font-mono">
                        سقف الميزانية: {tender.budgetCap.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/tenders/${tender.id}/live`}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition shadow-sm"
                  >
                    دخول غرفة المناقصة
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. دورة الضمان المالي 6 مراحل (Escrow Assurance & Local Trust) */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white">كيف يحمي نظام الوساطة والضمان المالي حقوقك؟</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              لا يستلم البائع أمواله إلا بعد استلامك للسلعة ومطابقتها للمواصفات خلال مهلة فحص 48 ساعة.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-400">01</span>
              <h4 className="text-xs font-bold text-white">إيداع العربون</h4>
              <p className="text-[10px] text-slate-400">حجز تأمين الدخول</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-400">02</span>
              <h4 className="text-xs font-bold text-white">حجز الضمان</h4>
              <p className="text-[10px] text-slate-400">تجميد قيمة الصفقة</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-400">03</span>
              <h4 className="text-xs font-bold text-white">شحن السلعة</h4>
              <p className="text-[10px] text-slate-400">تجهيز وتسليم الطلب</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-mono font-bold text-amber-400">04</span>
              <h4 className="text-xs font-bold text-white">مهلة الفحص 48h</h4>
              <p className="text-[10px] text-slate-400">معاينة وتجربة السلعة</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-400">05</span>
              <h4 className="text-xs font-bold text-white">تأكيد الاستلام</h4>
              <p className="text-[10px] text-slate-400">موافقة المشتري التامة</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-400">06</span>
              <h4 className="text-xs font-bold text-white">صرف المستحقات</h4>
              <p className="text-[10px] text-slate-400">تحويل صافي الرصيد للبائع</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
