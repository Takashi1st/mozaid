'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRightLeft, 
  HelpCircle, 
  FileCheck,
  Building,
  Smartphone
} from 'lucide-react';
import { PAYMENT_CHANNELS_CONFIG } from '../lib/constants';

export const EscrowDisputeCenter: React.FC = () => {
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('defect_mismatch');
  const [disputeNotes, setDisputeNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // عقد ضمان تجريبي قيد المعاينة (48 ساعة)
  const [escrowDeal, setEscrowDeal] = useState({
    id: 'esc-901',
    itemTitle: 'تويوتا لاندكروزر V8 صالون 2022',
    buyerName: 'أنت (المشتري)',
    sellerName: 'معرض القمة للسيارات',
    totalAmount: 42500000,
    platformFee: 1062500, // 2.5%
    sellerPayout: 41437500,
    currency: 'YER',
    status: 'inspecting', // holding, inspecting, completed, disputed
    inspectionHoursLeft: 34,
  });

  const handleReleaseFunds = () => {
    setEscrowDeal({ ...escrowDeal, status: 'completed' });
    setStatusMessage('تم تأكيد مطابقة واستلام السلعة بنجاح! تم تحويل 41,437,500 ر.ي للبائع واقتطاع عمولة المنصة.');
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    setEscrowDeal({ ...escrowDeal, status: 'disputed' });
    setIsDisputeOpen(false);
    setStatusMessage('تم فتح طلب النزاع الرسمي وتجميد صرف المبلغ للبائع. جاري تحويل القضية للمحكم بالذكاء الاصطناعي.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6" dir="rtl">
      
      {/* عنوان الصفحة */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            مركز الضمان المالي والوساطة (Escrow & Trust)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            حماية كاملة لأموال المشتري والبائع — الأموال محفوظة بأمان حتى معاينة السلعة والموافقة عليها
          </p>
        </div>

        {statusMessage && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* بطاقة الصفقة الحالية في فترة المعاينة */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              صفقة نشطة تحت حماية الضمان (Escrow Protection)
            </span>
            <h2 className="text-lg font-bold text-slate-100">{escrowDeal.itemTitle}</h2>
          </div>

          <div className="text-left font-mono">
            <span className="text-xs text-slate-400 block">إجمالي المبلغ المحجوز</span>
            <span className="text-2xl font-black text-emerald-400">
              {escrowDeal.totalAmount.toLocaleString()} {escrowDeal.currency}
            </span>
          </div>
        </div>

        {/* مؤشر فترة المعاينة 48 ساعة */}
        {escrowDeal.status === 'inspecting' && (
          <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-100 block">نافذة المعاينة والفحص جارية</span>
                <span className="text-xs text-slate-400">
                  متبقي <strong className="text-amber-400 font-mono text-sm">{escrowDeal.inspectionHoursLeft} ساعة</strong> لفحص السلعة والتأكد من مطابقتها لكراسة المزاد
                </span>
              </div>
            </div>

            {/* أزرار الإجراءات للمشتري */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleReleaseFunds}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد الاستلام والمطابقة (صرف للبائع)
              </button>

              <button
                onClick={() => setIsDisputeOpen(true)}
                className="bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 font-bold text-xs px-4 py-3 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                فتح نزاع واعتراض
              </button>
            </div>
          </div>
        )}

        {/* حالة اكتمال الصفقة */}
        {escrowDeal.status === 'completed' && (
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 text-center text-emerald-300 text-sm font-bold flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            اكتملت هذه الصفقة بنجاح وتم صرف كافة المستحقات وإغلاق عقد الضمان.
          </div>
        )}

        {/* حالة النزاع */}
        {escrowDeal.status === 'disputed' && (
          <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-4 text-center text-rose-300 text-sm font-bold flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            هذه الصفقة تحت إجراءات التحكيم الرقمي والنزاع حالياً — تم تجميد الأموال بالكامل.
          </div>
        )}

        {/* تفاصيل التوزيع المالي */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">قيمة الصفقة الإجمالية:</span>
            <span className="font-bold text-slate-200 font-mono">{escrowDeal.totalAmount.toLocaleString()} ر.ي</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">عمولة المنصة (2.5%):</span>
            <span className="font-bold text-amber-400 font-mono">{escrowDeal.platformFee.toLocaleString()} ر.ي</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-0.5">صافي مستحقات البائع:</span>
            <span className="font-bold text-emerald-400 font-mono">{escrowDeal.sellerPayout.toLocaleString()} ر.ي</span>
          </div>
        </div>

      </div>

      {/* نافذة منبثقة لفتح نزاع */}
      {isDisputeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-100">فتح طلب نزاع رسمي على الصفقة</h3>
            </div>

            <form onSubmit={handleSubmitDispute} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">سبب الاعتراض الأساسي:</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-rose-500"
                >
                  <option value="defect_mismatch">وجود عيب جوهري غير مذكور في كراسة المزاد</option>
                  <option value="fake_specs">المواصفات الفعلية لا تطابق الوصف والصور نهائياً</option>
                  <option value="non_delivery">البائع يرفض تسليم السلعة أو يماطل</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">شرح وتفاصيل العيب المكتشف:</label>
                <textarea
                  rows={3}
                  placeholder="اشرح المشكلة بدقة مع ذكر الفروقات عن تقرير الفحص..."
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-3 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 leading-relaxed">
                سيقوم الذكاء الاصطناعي بمقارنة شرحك وصورك المرفقة مع صور وكراسة المزاد الأصلية وتقديم ملخص محايد لمشرف النزاعات للبت في القضية خلال 24 ساعة.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisputeOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-lg shadow-rose-600/30"
                >
                  إرسال وتجميد المبلغ فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* شبكات وحسابات الإيداع والوساطة المعتمدة في اليمن */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Building className="w-5 h-5 text-emerald-400" />
          حسابات الإيداع وشبكات الصرافة الرسمية للمنصة في اليمن
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PAYMENT_CHANNELS_CONFIG.map((channel) => (
            <div key={channel.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <span className="font-bold text-slate-200 block text-sm">{channel.nameAr}</span>
              {'accountNumber' in channel && (
                <div className="text-slate-400">
                  رقم الحساب/المحفظة: <strong className="font-mono text-emerald-400">{channel.accountNumber}</strong>
                </div>
              )}
              {'beneficiaryName' in channel && (
                <div className="text-slate-500 text-[11px]">باسم: {channel.beneficiaryName}</div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
