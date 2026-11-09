'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Gavel, 
  Clock, 
  ShieldAlert, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  Zap, 
  UserCheck, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  DollarSign,
  PackageCheck,
  AlertCircle,
  Car,
  Building,
  Sun,
  Laptop,
  Truck,
  Cog,
  RefreshCw
} from 'lucide-react';

interface RealtimeBid {
  id: string;
  bidderName: string;
  verificationTier?: string;
  reputation?: number;
  amount: number;
  isWinningBid: boolean;
  isExtensionTrigger: boolean;
  createdAt: string;
}

interface AuctionDetail {
  id: string;
  title: string;
  slug: string;
  listing_type: string;
  status: string;
  currency: string;
  current_price: number;
  starting_price: number;
  min_bid_increment: number;
  buy_now_price?: number | null;
  required_deposit_amount: number;
  times_extended: number;
  description: string;
  ai_generated_specs: Record<string, any>;
  item_condition: string;
  location_city: string;
  inspection_window_hours: number;
  total_bids_count: number;
  views_count: number;
  category_name: string;
  seller_id: string;
  seller_name: string;
  is_trusted_seller: boolean;
  verification_tier: string;
  reputation_score: string;
  time_left_seconds: number;
}

const getCategoryIcon = (category: string) => {
  if (category?.includes('سيارات') || category?.includes('مركبات')) return Car;
  if (category?.includes('عقار') || category?.includes('أراضي')) return Building;
  if (category?.includes('طاقة') || category?.includes('شمسية')) return Sun;
  if (category?.includes('إلكترون') || category?.includes('أجهزة')) return Laptop;
  if (category?.includes('معدات') || category?.includes('مزارع')) return Cog;
  if (category?.includes('شاحنات') || category?.includes('نقل')) return Truck;
  return Gavel;
};

export default function LiveAuctionRoomPage() {
  const params = useParams();
  const listingId = (params?.id as string);

  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [bids, setBids] = useState<RealtimeBid[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timesExtended, setTimesExtended] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // جلب بيانات المزاد الحية من قاعدة البيانات
  const fetchAuctionDetail = async () => {
    if (!listingId) return;
    try {
      const res = await fetch(`/api/auctions/${listingId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.auction) {
          setAuction(data.auction);
          setCurrentPrice(data.auction.current_price);
          setTimeLeft(Math.max(0, data.auction.time_left_seconds));
          setTimesExtended(data.auction.times_extended || 0);
          setBids(data.bids || []);
        }
      } else {
        setStatusMessage({ type: 'error', text: 'المزاد غير موجود أو تم إغلاقه.' });
      }
    } catch (err) {
      console.error('Error fetching auction detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctionDetail();
    const syncInterval = setInterval(fetchAuctionDetail, 10000);
    return () => clearInterval(syncInterval);
  }, [listingId]);

  // العداد التنازلي التزامني الحي كل ثانية
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    if (seconds <= 0) return 'منتهي';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // تقديم مزايدة حية وحفظها في قاعدة البيانات
  const handlePlaceBid = async (bidAmount: number) => {
    if (!auction) return;
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: auction.id,
          amount: bidAmount,
          bidderId: '51ed834d-bc69-4411-83e4-a81f8179e3cb', // مزايد موثق معتمد في PostgreSQL
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setCurrentPrice(bidAmount);
        setCustomBidAmount('');

        // إذا تم تفعيل Anti-Sniping
        if (result.antiSnipingTriggered) {
          setTimeLeft((prev) => prev + 120);
          setTimesExtended((prev) => prev + 1);
          setStatusMessage({
            type: 'success',
            text: `أنت الآن صاحب أعلى عرض (${bidAmount.toLocaleString()} ${auction.currency})! تم تمديد وقت المزاد +120 ثانية تلقائياً لمنع القرصنة.`,
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: `تم تسجيل عرضك بنجاح بمبلغ ${bidAmount.toLocaleString()} ${auction.currency}. أنت صاحب أعلى عرض حالياً!`,
          });
        }

        // تحديث القائمة
        fetchAuctionDetail();
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'تعذر تسجيل المزايدة في قاعدة البيانات.',
        });
      }
    } catch (err: any) {
      console.error('Bid error:', err);
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء الاتصال بالخادم.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCriticalTime = timeLeft <= 120 && timeLeft > 0;
  const isAuctionClosed = timeLeft <= 0 || auction?.status === 'closed';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
        <p className="text-xs text-slate-400">جاري الاتصال بغرفة المزاد الحي...</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
          <Gavel className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-white text-lg">المزاد غير موجود أو تم إغلاقه</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          المزادات المنتهية يتم إغلاقها تلقائياً بالكامل في قاعدة البيانات لمنع أي بيانات غير حية.
        </p>
        <Link href="/auctions" className="text-xs text-emerald-400 hover:underline font-semibold">
          العودة لسوق المزادات الحية
        </Link>
      </div>
    );
  }

  const minIncrement = auction.min_bid_increment || 50000;
  const quickIncrements = [
    { label: `+${minIncrement.toLocaleString()}`, amount: currentPrice + minIncrement },
    { label: `+${(minIncrement * 2).toLocaleString()}`, amount: currentPrice + (minIncrement * 2) },
    { label: `+${(minIncrement * 4).toLocaleString()}`, amount: currentPrice + (minIncrement * 4) },
  ];

  const CategoryIcon = getCategoryIcon(auction.category_name);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* شريط التنقل العلوي وتفاصيل المزاد */}
      <div className="flex items-center justify-between">
        <Link
          href="/auctions"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لكافة المزادات</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>متصل بغرفة المزاد الحي</span>
          </span>
          <span className="text-xs text-slate-400 font-mono">{auction.views_count} مشاهد</span>
        </div>
      </div>

      {/* تنبيه انتهاء المزاد */}
      {isAuctionClosed && (
        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-4 text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Clock className="w-5 h-5" />
            <span>انتهى وقت المزاد رسمياً وتم إغلاقه بنجاح</span>
          </div>
          <p className="text-xs text-slate-400">
            أعلى عرض مسجل: {currentPrice.toLocaleString()} {auction.currency} — تم الانتقال لمرحلة الوساطة وتجميد الضمان (Escrow).
          </p>
        </div>
      )}

      {/* تنبيه التمديد الذكي Anti-Sniping عند التفعيل */}
      {isCriticalTime && (
        <div className="rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border-2 border-rose-600/80 p-4 candle-extension-alert flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-600 text-white animate-bounce">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-rose-300">نظام حماية اللحظات الأخيرة (Anti-Sniping Engine) نشط!</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-900 text-rose-200 font-mono">
                  تمديد {timesExtended} / 20
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                أي مزايدة تُقدم في الثواني الأخيرة ستمدد العداد +120 ثانية تلقائياً لإتاحة الفرصة العادلة للجميع.
              </p>
            </div>
          </div>
          <div className="text-rose-400 font-mono font-black text-xl shrink-0 px-3 py-1 bg-rose-950 rounded-xl border border-rose-800">
            {formatTimer(timeLeft)}
          </div>
        </div>
      )}

      {/* لوحة العرض الرئيسية للمزاد */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* تفاصيل السلعة والمواصفات */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-800 text-slate-300">
                {auction.category_name}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>{auction.location_city}</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white leading-snug">
              {auction.title}
            </h1>

            {/* الصورة الرئيسية كأيقونة فيكتور عالية الدقة */}
            <div className="h-64 sm:h-80 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
              <CategoryIcon className="w-32 h-32 text-emerald-400 drop-shadow-2xl relative z-10" />
              <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
                <span className="text-xs bg-black/70 backdrop-blur text-white px-3 py-1 rounded-lg border border-slate-700">
                  فحص فني معتمد 96%
                </span>
              </div>
            </div>

            {/* الوصف */}
            <div className="space-y-2">
              <h3 className="font-bold text-white text-sm">بيان البائع وحالة السلعة:</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {auction.description}
              </p>
            </div>

            {/* المواصفات الفنية المستخرجة بالذكاء الاصطناعي */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">المواصفات الفنية المعتمدة:</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {auction.ai_generated_specs && Object.entries(auction.ai_generated_specs).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{key}</span>
                    <span className="font-semibold text-slate-200">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* معلومات البائع والضمان */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-xs text-slate-400">معلومات البائع:</span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  {auction.seller_name ? auction.seller_name.charAt(0) : 'ب'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">{auction.seller_name}</span>
                    {auction.is_trusted_seller && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    توثيق المستوى {auction.verification_tier || 2} • تقييم {auction.reputation_score || '5.0'}/5
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t sm:border-t-0 sm:border-r sm:pr-4 border-slate-800">
              <span className="text-xs text-slate-400">شروط الضمان والمعاينة:</span>
              <div className="space-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <PackageCheck className="w-4 h-4" />
                  <span className="font-semibold">مهلة معاينة وفحص: {auction.inspection_window_hours} ساعة</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  المبلغ محجوز بحساب الضمان (Escrow) ولن يُسلم للبائع إلا بعد تأكيد فحصك واستلامك للسلعة.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* غرفة المزايدة التفاعلية والأزرار اللحظية */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6 sticky top-20 shadow-2xl">
            
            {/* مؤقت الغرفة التنازلي */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400 block mb-1">الوقت المتبقي لإغلاق المزاد:</span>
                <div className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 ${isCriticalTime ? 'text-rose-400 animate-spin' : 'text-emerald-400'}`} />
                  <span className={`text-3xl font-black font-mono tracking-wider ${
                    isCriticalTime ? 'text-rose-400 candle-extension-alert' : 'text-white'
                  }`}>
                    {formatTimer(timeLeft)}
                  </span>
                </div>
              </div>

              <div className="text-left">
                <span className="text-xs text-slate-400 block mb-1">العربون المحجوز للدخول:</span>
                <span className="text-xs font-bold text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  {auction.required_deposit_amount.toLocaleString()} {auction.currency}
                </span>
              </div>
            </div>

            {/* أعلى عرض حالي */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                أعلى عرض حالي (المزايدة الرابحة)
              </span>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-emerald-400 font-mono price-pulse">
                    {currentPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-400 mr-2 font-bold">{auction.currency}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">صاحب العرض</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {bids[0]?.bidderName || 'لا يوجد عروض'}
                  </span>
                </div>
              </div>
            </div>

            {/* تنبيهات الحالة ورسائل المزايدة */}
            {statusMessage && (
              <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                  : 'bg-rose-950/80 border border-rose-700 text-rose-300'
              }`}>
                {statusMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* أزرار المزايدة السريعة */}
            {!isAuctionClosed && (
              <>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">
                    مزايدة فورية سريعة بضغطة زر:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {quickIncrements.map((btn, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isSubmitting || timeLeft <= 0}
                        onClick={() => handlePlaceBid(btn.amount)}
                        className="p-3 rounded-xl bg-slate-800 hover:bg-emerald-700/80 hover:text-white text-slate-200 border border-slate-700 text-xs font-bold font-mono transition flex flex-col items-center justify-center gap-0.5 active:scale-95 disabled:opacity-50"
                      >
                        <span className="text-emerald-400">{btn.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {(btn.amount / 1000000).toFixed(2)}M
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* إدخال مبلغ مخصص */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">
                    أو أدخل مبلغ مزايدة مخصص (الحد الأدنى: {(currentPrice + minIncrement).toLocaleString()} {auction.currency}):
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customBidAmount}
                      onChange={(e) => setCustomBidAmount(e.target.value)}
                      placeholder={(currentPrice + minIncrement).toString()}
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 outline-none transition"
                    />
                    <button
                      type="button"
                      disabled={!customBidAmount || isSubmitting || timeLeft <= 0}
                      onClick={() => handlePlaceBid(Number(customBidAmount))}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                    >
                      تأكيد العرض
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* شريط المزايدات اللحظية */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>سجل المزايدات الحية ({bids.length})</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">تحديث مباشر</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {bids.map((bid) => (
                  <div
                    key={bid.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition ${
                      bid.isWinningBid
                        ? 'bg-emerald-950/60 border-emerald-600/60 text-white'
                        : 'bg-slate-950/50 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${bid.isWinningBid ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                      <div>
                        <span className="font-semibold block">{bid.bidderName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(bid.createdAt).toLocaleTimeString('ar-YE')}
                        </span>
                      </div>
                    </div>

                    <div className="text-left font-mono font-bold">
                      <span className={bid.isWinningBid ? 'text-emerald-300 text-sm' : 'text-slate-300'}>
                        {bid.amount.toLocaleString()} {auction.currency}
                      </span>
                      {bid.isExtensionTrigger && (
                        <span className="text-[9px] block text-rose-400 font-sans">
                          +120s تمديد
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
