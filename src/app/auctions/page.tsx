'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Gavel, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Flame, 
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ArrowUpDown,
  Car,
  Building,
  Sun,
  Laptop,
  Truck,
  Cog,
  RefreshCw,
  Activity
} from 'lucide-react';
import { YEMEN_CITIES } from '@/lib/constants';

interface AuctionItemData {
  id: string;
  title: string;
  category: string;
  city: string;
  currency: 'YER' | 'USD' | 'SAR';
  currentPrice: number;
  startingPrice: number;
  minIncrement: number;
  requiredDeposit: number;
  bidsCount: number;
  timeLeftSeconds: number;
  status: 'active' | 'extended' | 'closed';
  itemCondition: string;
  isTrustedSeller: boolean;
  sellerName: string;
  verificationTier?: number;
}

const CATEGORIES = [
  'الكل',
  'سيارات ومركبات',
  'عقارات وأراضي',
  'طاقة شمسية',
  'إلكترونيات وأجهزة',
  'معدات ومزارع',
];

const getCategoryIcon = (category: string) => {
  if (category.includes('سيارات') || category.includes('مركبات')) return Car;
  if (category.includes('عقار') || category.includes('أراضي')) return Building;
  if (category.includes('طاقة') || category.includes('شمسية')) return Sun;
  if (category.includes('إلكترون') || category.includes('أجهزة')) return Laptop;
  if (category.includes('معدات') || category.includes('مزارع')) return Cog;
  if (category.includes('نقل') || category.includes('شاحنات')) return Truck;
  return Gavel;
};

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedCity, setSelectedCity] = useState('الكل');
  const [selectedCurrency, setSelectedCurrency] = useState('الكل');
  const [sortBy, setSortBy] = useState<'time' | 'price_desc' | 'price_asc' | 'bids'>('time');

  // جلب المزادات الحية من PostgreSQL عبر الـ API
  const fetchLiveAuctions = async () => {
    try {
      const res = await fetch('/api/auctions', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.auctions)) {
          const mapped: AuctionItemData[] = data.auctions
            // شرط حاسم: استبعاد أي مزاد وقته صفر أو سالب فوراً
            .filter((row: any) => row.time_left_seconds > 0)
            .map((row: any) => ({
              id: row.id,
              title: row.title,
              category: row.category_name || 'مزادات عامة',
              city: row.location_city || 'صنعاء',
              currency: row.currency || 'YER',
              currentPrice: parseFloat(row.current_price),
              startingPrice: parseFloat(row.starting_price),
              minIncrement: parseFloat(row.min_bid_increment || 50000),
              requiredDeposit: parseFloat(row.required_deposit_amount || 0),
              bidsCount: parseInt(row.total_bids_count || 0, 10),
              timeLeftSeconds: Math.max(0, parseInt(row.time_left_seconds || 0, 10)),
              status: row.status,
              itemCondition: row.item_condition || 'مستعمل بحالة ممتازة',
              isTrustedSeller: row.is_trusted_seller || (row.verification_tier >= 2),
              sellerName: row.seller_name || 'مزايد موثوق',
              verificationTier: row.verification_tier || 1,
            }));
          setAuctions(mapped);
          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.error('Error fetching auctions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveAuctions();
    // إعادة التحقق الدوري كل 15 ثانية لمزامنة المزايدات الجديدة
    const syncInterval = setInterval(fetchLiveAuctions, 15000);
    return () => clearInterval(syncInterval);
  }, []);

  // عداد تنازلي لحظي كل ثانية — يختفي المزاد فور وصول العداد إلى الصفر (100% حي)
  useEffect(() => {
    const timer = setInterval(() => {
      setAuctions((prev) => {
        return prev
          .map((item) => ({
            ...item,
            timeLeftSeconds: item.timeLeftSeconds - 1,
          }))
          // الحذف الفوري التلقائي للمزاد من الشاشة فور انتهاء وقته
          .filter((item) => item.timeLeftSeconds > 0);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // تصفية وترتيب المزادات
  const filteredAuctions = useMemo(() => {
    return auctions.filter((item) => {
      if (item.timeLeftSeconds <= 0) return false;
      if (searchTerm.trim() && !item.title.toLowerCase().includes(searchTerm.toLowerCase())) {
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
    }).sort((a, b) => {
      if (sortBy === 'time') return a.timeLeftSeconds - b.timeLeftSeconds;
      if (sortBy === 'price_desc') return b.currentPrice - a.currentPrice;
      if (sortBy === 'price_asc') return a.currentPrice - b.currentPrice;
      if (sortBy === 'bids') return b.bidsCount - a.bidsCount;
      return 0;
    });
  }, [auctions, searchTerm, selectedCategory, selectedCity, selectedCurrency, sortBy]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'منتهي';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h} س و ${m} د`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* عنوان الصفحة الرئيسي وشارة الاتصال الحي */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>مزادات مباشرة</span>
            </span>
            <span className="text-slate-500">•</span>
            <span>تنافس حي مع تمديد الوقت التلقائي</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            استكشاف المزادات الحية الجارية
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            زايد مباشرة مع حماية تمديد الوقت التلقائي (Anti-Sniping +120s) وضمان مالي يمني معتمد.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setIsLoading(true); fetchLiveAuctions(); }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs px-4 py-3 rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>تحديث يدوي</span>
          </button>

          <Link
            href="/auctions/create"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition"
          >
            <Sparkles className="w-4 h-4 text-emerald-100" />
            <span>طرح مزاد جديد</span>
          </Link>
        </div>
      </div>

      {/* شريط البحث والفلاتر */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* حقل البحث */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم السلعة، الموديل، المواصفات..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* فلتر المحافظة */}
          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none transition"
            >
              <option value="الكل">كافة المحافظات اليمنية</option>
              {YEMEN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* فلتر الترتيب */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none transition"
            >
              <option value="time">الأقرب انتهاءً (شمعة الوقت)</option>
              <option value="price_desc">الأعلى سعراً أولاً</option>
              <option value="price_asc">الأقل سعراً أولاً</option>
              <option value="bids">الأكثر تنافساً ومزايدات</option>
            </select>
          </div>
        </div>

        {/* أزرار التصنيفات والعملات */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 ml-2">التصنيف:</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">العملة:</span>
            {['الكل', 'YER', 'USD', 'SAR'].map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition ${
                  selectedCurrency === curr
                    ? 'bg-slate-700 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {curr === 'الكل' ? 'الكل' : curr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* نتائج المزادات الحية */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>المزادات المفتوحة حالياً: <strong className="text-emerald-400 font-mono">{filteredAuctions.length}</strong> مزاد</span>
          </span>
          {filteredAuctions.some((a) => a.timeLeftSeconds <= 180) && (
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>يوجد مزاد في اللحظات الأخيرة الحرجة (+120s تمديد تلقائي)</span>
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">جاري تحميل المزادات الحية من قاعدة البيانات...</p>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Gavel className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">لا توجد مزادات نشطة مطابقة حالياً</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              تم إغلاق العروض السابقة فور اكتمال مدتها المحددة. يمكنك تصفح التصنيفات الأخرى أو طرح مزاد جديد.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('الكل');
                  setSelectedCity('الكل');
                  setSelectedCurrency('الكل');
                  fetchLiveAuctions();
                }}
                className="text-xs text-emerald-400 hover:underline font-semibold"
              >
                إعادة ضبط الفلاتر
              </button>
              <span className="text-slate-600">•</span>
              <Link
                href="/auctions/create"
                className="text-xs text-teal-400 hover:underline font-semibold"
              >
                إنشاء مزاد جديد الآن
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => {
              const isCritical = auction.timeLeftSeconds <= 180;
              const CategoryIcon = getCategoryIcon(auction.category);

              return (
                <div
                  key={auction.id}
                  className={`rounded-2xl bg-slate-900 border transition flex flex-col justify-between overflow-hidden group ${
                    isCritical
                      ? 'border-rose-500/70 shadow-lg shadow-rose-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* رأس البطاقة */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                        {auction.category}
                      </span>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                        isCritical
                          ? 'bg-rose-950 border border-rose-700 text-rose-300 candle-extension-alert'
                          : 'bg-slate-800 text-emerald-400'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(auction.timeLeftSeconds)}</span>
                      </div>
                    </div>

                    {/* أيقونة فيكتور عالية الدقة */}
                    <div className="h-36 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 flex items-center justify-center group-hover:scale-102 transition-transform">
                      <CategoryIcon className="w-16 h-16 text-emerald-400 drop-shadow-md" />
                    </div>

                    {/* تفاصيل السلعة */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{auction.city}</span>
                        </span>
                        <span>{auction.bidsCount} مزايدة مسجلة</span>
                      </div>

                      <h3 className="font-bold text-white text-sm line-clamp-2 leading-relaxed">
                        {auction.title}
                      </h3>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400 text-[11px]">{auction.itemCondition}</span>
                        <div className="flex items-center gap-1 text-[11px]">
                          {auction.isTrustedSeller && (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>توثيق المستوى {auction.verificationTier || 2}</span>
                            </span>
                          )}
                          <span className="text-slate-400">({auction.sellerName})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* شريط السعر وزر الدخول المباشر */}
                  <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">أعلى عرض حالي</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          {auction.currentPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {auction.currency}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        الحد الأدنى للزيادة: +{auction.minIncrement.toLocaleString()} {auction.currency}
                      </span>
                    </div>

                    <Link
                      href={`/auctions/${auction.id}`}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition shadow-md flex items-center gap-1.5 ${
                        isCritical
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                      }`}
                    >
                      {isCritical ? (
                        <>
                          <Flame className="w-3.5 h-3.5 animate-pulse" />
                          <span>زايد فوراً</span>
                        </>
                      ) : (
                        <span>دخول الغرفة</span>
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
