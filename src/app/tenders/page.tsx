'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Search, 
  Clock, 
  MapPin, 
  Building2, 
  TrendingDown, 
  PlusCircle, 
  ShieldCheck,
  ChevronDown,
  Layers,
  ArrowRight,
  Check,
  RefreshCw,
  Activity
} from 'lucide-react';
import { YEMEN_CITIES } from '@/lib/constants';

interface TenderItemData {
  id: string;
  title: string;
  issuerOrg: string;
  category: string;
  city: string;
  currency: 'USD' | 'YER' | 'SAR';
  budgetCap: number;
  currentLowestQuote: number;
  quotesCount: number;
  timeLeftSeconds: number;
  qualifications: string[];
  status: 'active' | 'awarded' | 'closed';
}

const TENDER_CATEGORIES = [
  'الكل',
  'طاقة ومولدات',
  'طاقة شمسية',
  'مقاولات وبناء',
  'تقنية ومعلومات',
  'خدمات لوجستية ومحروقات',
  'مستلزمات طبية',
];

export default function TendersPage() {
  const [tenders, setTenders] = useState<TenderItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedCity, setSelectedCity] = useState('الكل');
  const [selectedCurrency, setSelectedCurrency] = useState('الكل');

  // جلب المناقصات الحية من PostgreSQL
  const fetchLiveTenders = async () => {
    try {
      const res = await fetch('/api/tenders', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tenders)) {
          const mapped: TenderItemData[] = data.tenders
            // شرط حاسم: استبعاد أي مناقصة انتهت مدتها
            .filter((row: any) => row.time_left_seconds > 0)
            .map((row: any) => ({
              id: row.id,
              title: row.title,
              issuerOrg: row.requester_org || 'جهة معتمدة',
              category: row.category_name || 'عام',
              city: row.location_city || 'صنعاء',
              currency: row.currency || 'USD',
              budgetCap: parseFloat(row.budget_cap || 0),
              currentLowestQuote: parseFloat(row.lowest_bid || row.budget_cap || 0),
              quotesCount: parseInt(row.offers_count || 0, 10),
              timeLeftSeconds: Math.max(0, parseInt(row.time_left_seconds || 0, 10)),
              qualifications: ['سجل تجاري ساري', 'سابقة أعمال معتمدة', 'ضمان بنكي أو محفظة'],
              status: row.status,
            }));
          setTenders(mapped);
        }
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTenders();
    const interval = setInterval(fetchLiveTenders, 15000);
    return () => clearInterval(interval);
  }, []);

  // عداد تنازلي لحظي — إخفاء فوري لأي مناقصة ينتهي وقتها
  useEffect(() => {
    const timer = setInterval(() => {
      setTenders((prev) => {
        return prev
          .map((item) => ({
            ...item,
            timeLeftSeconds: item.timeLeftSeconds - 1,
          }))
          .filter((item) => item.timeLeftSeconds > 0);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const filteredTenders = useMemo(() => {
    return tenders.filter((item) => {
      if (item.timeLeftSeconds <= 0) return false;
      if (searchTerm.trim() && !item.title.toLowerCase().includes(searchTerm.toLowerCase()) && !item.issuerOrg.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (selectedCategory !== 'الكل' && item.category !== selectedCategory) {
        return false;
      }
      if (selectedCity !== 'الكل' && item.city !== selectedCity) {
        return false;
      }
      if (selectedCurrency !== 'الكل' && item.currency !== selectedCurrency) {
        return false;
      }
      return true;
    });
  }, [tenders, searchTerm, selectedCategory, selectedCity, selectedCurrency]);

  const formatDeadline = (seconds: number) => {
    if (seconds <= 0) return 'منتهية';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} يوم و ${hours % 24} س متبقية`;
    }
    if (hours > 0) return `${hours} س و ${mins} د متبقية`;
    return `${mins} د و ${secs} ث متبقية`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* رأس الصفحة الرئيسي */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>مناقصات وتوريدات نشطة</span>
            </span>
            <span className="text-slate-500">•</span>
            <span>تنافس عكسي لحصول الجهات على أفضل سعر</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            استعراض المناقصات وطلبات التوريد
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            تنافس كمورد معتمد لتقديم أفضل عرض سعر ومواصفات بالوقت الفعلي مع الحفاظ على سرية وهوية العارضين.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsLoading(true); fetchLiveTenders(); }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs px-4 py-3 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>تحديث</span>
          </button>

          <Link
            href="/tenders/create"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-amber-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>طرح كراسة مناقصة RFP جديدة</span>
          </Link>
        </div>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم المناقصة، الجهة الطارحة، كود الكراسة..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none transition"
            >
              <option value="الكل">كافة المحافظات اليمنية</option>
              {YEMEN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 ml-2">مجال التوريد:</span>
            {TENDER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">العملة:</span>
            {['الكل', 'USD', 'YER', 'SAR'].map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition ${
                  selectedCurrency === curr
                    ? 'bg-slate-700 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {curr === 'الكل' ? 'الكل' : curr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* قائمة المناقصات الحية */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>المناقصات المتاحة للتنافس: <strong className="text-amber-400 font-mono">{filteredTenders.length}</strong> مناقصة</span>
          </span>
          <span className="text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>نظام الترسية المشروطة يضمن مطابقة المواصفات الفنية قبل التعاقد</span>
          </span>
        </div>

        {isLoading ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">جاري فحص وتحديث المناقصات الحية...</p>
          </div>
        ) : filteredTenders.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">لا توجد مناقصات جارية مطابقة</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              تم إغلاق المناقصات السابقة بعد انتهاء فترات التقديم المحددة. يمكنك طرح مناقصة جديدة لتلقي عروض الأسعار.
            </p>
            <div className="pt-2">
              <Link
                href="/tenders/create"
                className="text-xs text-amber-400 hover:underline font-semibold"
              >
                طرح طلب توريد أو مناقصة جديدة الآن
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTenders.map((tender) => (
              <div
                key={tender.id}
                className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-3 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                      {tender.category}
                    </span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tender.issuerOrg}</span>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tender.city}</span>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-rose-400 flex items-center gap-1 font-mono font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDeadline(tender.timeLeftSeconds)}</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white hover:text-amber-400 transition leading-snug">
                    {tender.title}
                  </h3>

                  {/* شروط التأهيل المطلوبة */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {tender.qualifications.map((q, idx) => (
                      <span key={idx} className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{q}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* بطاقة السعر وزر الدخول المباشر للغرفة */}
                <div className="lg:border-r lg:pr-6 border-slate-800 flex flex-row lg:flex-col items-center lg:items-end justify-between gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">أقل عرض حالي مسجل (عكسي)</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-400 font-mono">
                        {tender.currentLowestQuote.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-300 font-bold">{tender.currency}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      سقف الميزانية: {tender.budgetCap.toLocaleString()} {tender.currency} • {tender.quotesCount} عروض
                    </span>
                  </div>

                  <Link
                    href={`/tenders/${tender.id}/live`}
                    className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 shrink-0"
                  >
                    <span>دخول غرفة المناقصة الحية</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
