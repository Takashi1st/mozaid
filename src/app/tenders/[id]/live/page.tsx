'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  FileText, 
  Clock, 
  TrendingDown, 
  ShieldCheck, 
  Download, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  ArrowRight,
  Sparkles,
  Lock,
  Layers,
  MapPin,
  HelpCircle,
  Check,
  RefreshCw
} from 'lucide-react';

interface AnonymousQuote {
  id: string;
  anonymousLabel: string;
  amount: number;
  deliveryDays: number;
  submittedAt: string;
  isLowest: boolean;
}

export default function LiveReverseTenderRoomPage() {
  const params = useParams();
  const tenderId = (params?.id as string) || 'tnd-501';

  const [tender, setTender] = useState<any>(null);
  const [lowestPrice, setLowestPrice] = useState<number>(72000);
  const [quotes, setQuotes] = useState<AnonymousQuote[]>([]);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(39600);
  const [isLoading, setIsLoading] = useState(true);

  // مدخلات العرض الجديد للمورد
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  const [deliveryDays, setDeliveryDays] = useState<string>('25');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // جلب المناقصة الحية من الـ API
  const fetchTender = async () => {
    try {
      const res = await fetch(`/api/tenders/${tenderId}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tender) {
          setTender(data.tender);
          setLowestPrice(data.tender.lowest_bid || data.tender.budget_cap);
          setTimeLeftSeconds(Math.max(0, data.tender.time_left_seconds));
          if (data.bids && data.bids.length > 0) {
            setQuotes(
              data.bids.map((b: any, idx: number) => ({
                id: b.id,
                anonymousLabel: `مورد معتمد #${idx + 1}`,
                amount: b.amount,
                deliveryDays: 30,
                submittedAt: new Date(b.createdAt).toLocaleTimeString('ar-YE'),
                isLowest: idx === 0,
              }))
            );
          }
        }
      }
    } catch (err) {
      console.error('Error fetching tender room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTender();
  }, [tenderId]);

  // تشغيل العداد التنازلي الحي
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatHoursTimer = (seconds: number) => {
    if (seconds <= 0) return 'منتهية';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const minDecrement = tender?.min_bid_increment || 1000;
  const maxAllowedQuote = lowestPrice - minDecrement;

  // إرسال عرض توريد عكسي أقل
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setIsSubmitting(true);

    const amount = Number(quoteAmount);
    if (amount >= lowestPrice) {
      setStatusMsg({
        type: 'error',
        text: `قيمة العرض غير مقبولة، يجب أن تكون أقل من السعر الحالي (${lowestPrice.toLocaleString()}) بمقدار خطوة التناقص على الأقل.`,
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // إرسال المزايدة العكسية للـ API
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: tender?.id || tenderId,
          amount,
          bidderId: '51ed834d-bc69-4411-83e4-a81f8179e3cb',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newQuote: AnonymousQuote = {
          id: `q-${Date.now()}`,
          anonymousLabel: 'أنت (عرضك السري المجهول)',
          amount,
          deliveryDays: Number(deliveryDays) || 30,
          submittedAt: 'الآن',
          isLowest: true,
        };

        setQuotes([
          newQuote,
          ...quotes.map((q) => ({ ...q, isLowest: false })),
        ]);
        setLowestPrice(amount);
        setQuoteAmount('');
        setStatusMsg({
          type: 'success',
          text: `تم تسجيل عرضك التنافسي بنجاح بمبلغ ${amount.toLocaleString()} ${tender?.currency || 'USD'}. أنت صاحب أقل سعر حالياً! هويتك محمية بالكامل.`,
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: data.error || 'تعذر تسجيل عرض السعر.',
        });
      }
    } catch (err: any) {
      console.error('Submit quote error:', err);
      setStatusMsg({ type: 'error', text: 'حدث خطأ أثناء الاتصال بالخادم.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClosed = timeLeftSeconds <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* شريط التنقل العلوي وتفاصيل الغرفة */}
      <div className="flex items-center justify-between">
        <Link
          href="/tenders"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لكافة المناقصات</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>غرفة تنافس عكسي مشفرة الهوية (Anonymous Bidding)</span>
          </span>
        </div>
      </div>

      {/* تنبيه نظام الترسية المشروطة */}
      <div className="rounded-2xl bg-slate-900 border border-amber-500/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block">نظام الترسية المشروطة (Conditional Awarding):</span>
            <span>
              تقديم أقل سعر يمنحك الأولوية، وتتم الترسية النهائية بعد مراجعة الجهة لشهادات التأهيل ومطابقة المواصفات الفنية.
            </span>
          </div>
        </div>
        <div className="shrink-0 text-amber-400 font-semibold text-xs font-mono">
          ضمان جدية التوريد: {(tender?.required_deposit_amount || 5000).toLocaleString()} {tender?.currency || 'USD'}
        </div>
      </div>

      {/* لوحة المناقصة الرئيسية */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* كراسة الشروط والمواصفات الفنية */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between text-xs">
              <span className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                طلب توريد وتركيب (RFP)
              </span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>{tender?.location_city || 'عدن'}</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white leading-snug">
              {tender?.title || 'توريد وتركيب منظومة طاقة شمسية هجينة 150 كيلوواط - مستشفى الأمل'}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 py-2 border-y border-slate-800">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>الجهة الطارحة: <strong className="text-white">{tender?.requester_org || 'مستشفى الأمل النموذجي'}</strong></span>
              </span>
              <span>•</span>
              <span>سقف الميزانية التقديرية: <strong className="text-amber-400 font-mono">{(tender?.budget_cap || 85000).toLocaleString()} {tender?.currency || 'USD'}</strong></span>
            </div>

            {/* نبذة عن المشروع */}
            <div className="space-y-2">
              <h3 className="font-bold text-white text-sm">تفاصيل ونطاق العمل المطلوب:</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {tender?.description || 'مطلوب توريد وتركيب ألواح طاقة شمسية بقدرة إجمالية 150KW مع إنفرترات ذكية وبطاريات ليثيوم للمبنى الرئيسي.'}
              </p>
            </div>

            {/* المواصفات الفنية المستخرجة بالذكاء الاصطناعي */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">المواصفات الفنية المعتمدة للكراسة:</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tender?.ai_generated_specs && Object.entries(tender.ai_generated_specs).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">{key}</span>
                    <span className="font-semibold text-slate-200">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* غرفة التنافس العكسي وتقديم العروض */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6 sticky top-20 shadow-2xl">
            
            {/* عداد وقت الإغلاق */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400 block mb-1">المهلة المتبقية لتقديم العروض:</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span className="text-2xl font-black text-white font-mono tracking-wider">
                    {formatHoursTimer(timeLeftSeconds)}
                  </span>
                </div>
              </div>

              <div className="text-left">
                <span className="text-xs text-slate-400 block mb-1">خطوة التناقص الأدنى:</span>
                <span className="text-xs font-bold text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  -{minDecrement.toLocaleString()} {tender?.currency || 'USD'}
                </span>
              </div>
            </div>

            {/* أقل سعر حالي */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                أقل عرض سعر حالي مسجل (العرض الرابح)
              </span>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black text-amber-400 font-mono">
                    {lowestPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-400 mr-2 font-bold">{tender?.currency || 'USD'}</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">حالة العرض</span>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>مؤهل ومطابق</span>
                  </span>
                </div>
              </div>
            </div>

            {/* تنبيهات الحالة */}
            {statusMsg && (
              <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                  : 'bg-rose-950/80 border border-rose-700 text-rose-300'
              }`}>
                {statusMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* نموذج تقديم عرض سعر أقل */}
            {!isClosed && (
              <form onSubmit={handleSubmitQuote} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    قيمة عرضك الجديد (يجب أن يكون أقل من {lowestPrice.toLocaleString()} {tender?.currency || 'USD'}):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      placeholder={maxAllowedQuote.toString()}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 outline-none transition"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                      {tender?.currency || 'USD'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">مدة التنفيذ (بالأيام):</label>
                    <input
                      type="number"
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">فترة الضمان (بالأشهر):</label>
                    <input
                      type="number"
                      defaultValue="36"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!quoteAmount || isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>تقديم العرض التنافسي المجهول</span>
                </button>
              </form>
            )}

            {/* سجل عروض الأسعار التنافسية */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  <span>عروض الأسعار المجهولة المتنافسة ({quotes.length})</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">سرية تامة</span>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                {quotes.map((q) => (
                  <div
                    key={q.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      q.isLowest
                        ? 'bg-amber-950/40 border-amber-600/60 text-white'
                        : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block text-slate-200">{q.anonymousLabel}</span>
                      <span className="text-[10px] text-slate-500">مدة التوريد: {q.deliveryDays} يوماً • {q.submittedAt}</span>
                    </div>

                    <div className="text-left font-mono font-bold">
                      <span className={q.isLowest ? 'text-amber-300 text-sm' : 'text-slate-300'}>
                        {q.amount.toLocaleString()} {tender?.currency || 'USD'}
                      </span>
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
