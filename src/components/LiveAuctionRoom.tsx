'use client';

import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, Award, TrendingUp, AlertTriangle, CheckCircle, MapPin, Zap, UserCheck } from 'lucide-react';
import { validateForwardBid } from '../lib/auction-engine';
import { ListingItem, RealtimeBid } from '../types';

interface LiveAuctionRoomProps {
  listing?: ListingItem;
  currentUserId?: string;
  onBidPlaced?: (newAmount: number) => void;
}

const DEFAULT_SAMPLE_LISTING: ListingItem = {
  id: 'auc-001',
  userId: 'seller-99',
  categoryId: 2,
  title: 'تويوتا لاندكروزر V8 صالون 2022 نظيف مجمرك - فحص كامل',
  slug: 'toyota-landcruiser-v8-2022',
  listingType: 'forward_auction',
  status: 'active',
  currency: 'YER',
  startingPrice: 38000000,
  currentPrice: 42500000,
  minBidIncrement: 250000,
  requiredDepositAmount: 1000000,
  startsAt: new Date(Date.now() - 3600000).toISOString(),
  endsAt: new Date(Date.now() + 180000).toISOString(), // 3 دقائق متبقية
  timesExtended: 2,
  description: 'سيارة تويوتا لاندكروزر وارد بازرعة، بحالة الوكالة خالية من الصدمات، مجمركة ومرقمة بصنعاء. تم الفحص الفني للماكينة والجير والدبل بنسبة 96%.',
  aiGeneratedSpecs: {
    'المحرك': '4.0 لتر V6 توين تيربو',
    'ناقل الحركة': 'أوتوماتيك 10 سرعات',
    'اللون': 'أبيض لؤلؤي',
    'العداد': '34,000 كم',
    'مكان المعاينة': 'صنعاء - شارع حدة (معرض القمة)',
    'حالة الفحص': 'معتمد ومطابق لتقرير الفحص المرفق',
  },
  itemCondition: 'used_mint',
  locationCity: 'صنعاء',
  inspectionWindowHours: 48,
  totalBidsCount: 14,
  viewsCount: 412,
  images: [
    '/assets/car-sample.jpg',
  ],
};

const INITIAL_BIDS: RealtimeBid[] = [
  {
    id: 'b-14',
    listingId: 'auc-001',
    bidderId: 'u-101',
    bidderName: 'م. أحمد الحاشدي',
    bidderReputation: 4.9,
    amount: 42500000,
    isWinningBid: true,
    isExtensionTrigger: true,
    createdAt: 'منذ 45 ثانية',
  },
  {
    id: 'b-13',
    listingId: 'auc-001',
    bidderId: 'u-102',
    bidderName: 'شركة النور للمقاولات',
    bidderReputation: 4.8,
    amount: 42250000,
    isWinningBid: false,
    isExtensionTrigger: false,
    createdAt: 'منذ دقيقة',
  },
  {
    id: 'b-12',
    listingId: 'auc-001',
    bidderId: 'u-103',
    bidderName: 'سلطان الحضرمي',
    bidderReputation: 5.0,
    amount: 42000000,
    isWinningBid: false,
    isExtensionTrigger: false,
    createdAt: 'منذ دقيقتين',
  },
];

export const LiveAuctionRoom: React.FC<LiveAuctionRoomProps> = ({
  listing = DEFAULT_SAMPLE_LISTING,
  currentUserId = 'my-user-id',
  onBidPlaced,
}) => {
  const [bids, setBids] = useState<RealtimeBid[]>(INITIAL_BIDS);
  const [currentPrice, setCurrentPrice] = useState<number>(listing.currentPrice);
  const [timeLeft, setTimeLeft] = useState<number>(180); // ثواني
  const [isExtended, setIsExtended] = useState<boolean>(true);
  const [customBidAmount, setCustomBidAmount] = useState<string>('');
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  // تشغيل العداد التنازلي الحي
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const nextMinimumBid = currentPrice + listing.minBidIncrement;

  const handlePlaceBid = (amount: number) => {
    setBidError(null);
    setBidSuccess(null);

    const validation = validateForwardBid(
      { ...listing, currentPrice },
      currentUserId,
      amount,
      bids[0]
    );

    if (!validation.isValid) {
      setBidError(validation.errorMessage || 'تعذرت المزايدة');
      return;
    }

    // قبول المزايدة وتحديث الغرفة الحية
    const newBid: RealtimeBid = {
      id: `b-${Date.now()}`,
      listingId: listing.id,
      bidderId: currentUserId,
      bidderName: 'أنت (المزايد الحالي)',
      bidderReputation: 5.0,
      amount,
      isWinningBid: true,
      isExtensionTrigger: validation.isAntiSnipingTriggered,
      createdAt: 'الآن',
    };

    setBids([newBid, ...bids.map((b) => ({ ...b, isWinningBid: false }))]);
    setCurrentPrice(amount);

    // تمديد الوقت إذا انطبق شرط الـ Anti-Sniping
    if (validation.isAntiSnipingTriggered) {
      setTimeLeft((prev) => prev + 120);
      setIsExtended(true);
    }

    setBidSuccess(`تم تسجيل مزايدتك بنجاح بقيمة ${amount.toLocaleString()} ${listing.currency}`);
    setCustomBidAmount('');
    onBidPlaced?.(amount);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" dir="rtl">
      
      {/* شريط التنبيه عند تمديد الوقت تلقائياً لمكافحة القنص */}
      {isExtended && (
        <div className="bg-amber-950/80 border border-amber-500/40 text-amber-300 p-3.5 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <span className="font-bold text-sm block">تم تمديد وقت المزاد تلقائياً (Anti-Sniping)!</span>
              <span className="text-xs text-amber-200/80">
                لوجود مزايدة في الدقائق الأخيرة، أضاف النظام 120 ثانية إضافية لإتاحة منافسة عادلة للجميع.
              </span>
            </div>
          </div>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1 rounded-full font-mono">
            تمديد #{listing.timesExtended}
          </span>
        </div>
      )}

      {/* لوحة العرض الرئيسية للمزاد المباشر */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* العمود الأيمن: صور السلعة، التفاصيل، والمواصفات الفنية المولدة بالـ AI */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* كارت السلعة الأساسي */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            
            {/* رأس الكارت */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  مزاد حي مباشر
                </span>
                <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {listing.locationCity}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>البائع: معرض القمة (موثق KYC)</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 leading-snug">
              {listing.title}
            </h1>

            {/* صورة السلعة الافتراضية */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <div className="text-center p-6 space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <Award className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-sm text-slate-300 font-medium">معاينة صور السلعة عالية الدقة وفحص المرور</p>
                <p className="text-xs text-slate-500">تم فحص ومعاينة المستندات والصور بواسطة درع فحص المحتوى بالذكاء الاصطناعي</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {listing.description}
            </p>

            {/* المواصفات المولدة بالذكاء الاصطناعي */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  جدول المواصفات الفنية المستخرجة بالـ AI
                </span>
                <span className="text-[11px] text-slate-500">موثوقية التحليل 98%</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {listing.aiGeneratedSpecs &&
                  Object.entries(listing.aiGeneratedSpecs).map(([key, value]) => (
                    <div key={key} className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
                      <span className="text-slate-400 block mb-0.5">{key}</span>
                      <span className="font-semibold text-slate-200">{String(value)}</span>
                    </div>
                  ))}
              </div>
            </div>

          </div>

        </div>

        {/* العمود الأيسر: غرفة المزايدة التفاعلية والتحكم بالوقت الفعلي */}
        <div className="space-y-6">

          {/* لوحة المزايدة الحية والعداد */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            
            {/* العداد التنازلي */}
            <div className="text-center bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <span className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                الوقت المتبقي حتى انتهاء المزاد
              </span>
              <div className="text-4xl font-extrabold text-amber-400 tracking-wider font-mono">
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* السعر الحالي وأعلى مزايد */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
              <span className="text-xs text-slate-400 block">أعلى سعر حالي (السعر المباشر)</span>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {currentPrice.toLocaleString()}{' '}
                <span className="text-base font-normal text-emerald-300">{listing.currency}</span>
              </div>
              <span className="text-xs text-slate-400 block pt-1">
                صاحب العرض الفائز: <strong className="text-slate-200">{bids[0]?.bidderName || 'لا يوجد'}</strong>
              </span>
            </div>

            {/* أزرار المزايدة السريعة */}
            <div className="space-y-3">
              <span className="text-xs text-slate-400 block">زايد فوراً بضغطة واحدة:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePlaceBid(currentPrice + listing.minBidIncrement)}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{(listing.minBidIncrement).toLocaleString()}
                </button>
                <button
                  onClick={() => handlePlaceBid(currentPrice + listing.minBidIncrement * 2)}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{(listing.minBidIncrement * 2).toLocaleString()}
                </button>
              </div>

              {/* حقل مزايدة مخصصة */}
              <div className="flex gap-2 pt-2">
                <input
                  type="number"
                  placeholder={`الحد الأدنى: ${nextMinimumBid.toLocaleString()}`}
                  value={customBidAmount}
                  onChange={(e) => setCustomBidAmount(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  onClick={() => handlePlaceBid(Number(customBidAmount))}
                  disabled={!customBidAmount || Number(customBidAmount) < nextMinimumBid}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
                >
                  تأكيد
                </button>
              </div>

              {bidError && (
                <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{bidError}</span>
                </div>
              )}

              {bidSuccess && (
                <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{bidSuccess}</span>
                </div>
              )}
            </div>

            {/* شروط الضمان المحلي */}
            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>صفقة مضمونة بنظام الوساطة (Escrow)</span>
              </div>
              <p>المبلغ يودع في حساب الضمان ولا يُسلم للبائع إلا بعد فحصك ومعاينتك للسلعة خلال 48 ساعة.</p>
            </div>

          </div>

          {/* سجل العطاءات والمزايدات الحية المتزامنة */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200">سجل المزايدات الحية</span>
              <span className="text-[11px] text-slate-400">{bids.length} عطاء مسجل</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {bids.map((bid, idx) => (
                <div
                  key={bid.id}
                  className={`p-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                    idx === 0
                      ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/40 border border-slate-800/60 text-slate-300'
                  }`}
                >
                  <div>
                    <span className="font-semibold block">{bid.bidderName}</span>
                    <span className="text-[10px] text-slate-500">{bid.createdAt}</span>
                  </div>
                  <div className="text-left font-mono">
                    <span className="font-bold text-slate-100">{bid.amount.toLocaleString()}</span>
                    <span className="text-[10px] block text-slate-400">{listing.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
