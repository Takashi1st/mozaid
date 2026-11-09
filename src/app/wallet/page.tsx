'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Lock, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Building, 
  UploadCloud, 
  FileText, 
  ShieldCheck, 
  RefreshCw,
  Copy,
  Receipt
} from 'lucide-react';
import { PAYMENT_CHANNELS_CONFIG } from '@/lib/constants';

interface TransactionItem {
  id: string;
  type: 'deposit' | 'bid_deposit_hold' | 'escrow_release' | 'withdrawal' | 'escrow_refund';
  channel: string;
  refNumber: string;
  amount: number;
  currency: 'YER' | 'USD' | 'SAR';
  status: 'approved' | 'pending' | 'holding' | 'rejected';
  date: string;
  notes?: string;
}

const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    id: 'tx-901',
    type: 'deposit',
    channel: 'بنك الكريمي الإسلامي',
    refNumber: 'KR-772819',
    amount: 1500000,
    currency: 'YER',
    status: 'approved',
    date: 'اليوم، 10:30 ص',
    notes: 'إيداع نقدي عبر حساب مميز تم التحقق منه آلياً',
  },
  {
    id: 'tx-902',
    type: 'bid_deposit_hold',
    channel: 'حجز عربون داخلي',
    refNumber: 'HLD-00192',
    amount: 1000000,
    currency: 'YER',
    status: 'holding',
    date: 'أمس، 04:15 م',
    notes: 'تأمين دخول مزاد سيارة تويوتا لاندكروزر 2022',
  },
  {
    id: 'tx-903',
    type: 'deposit',
    channel: 'محفظة ون كاش (OneCash)',
    refNumber: 'OC-114092',
    amount: 500,
    currency: 'USD',
    status: 'approved',
    date: '05 نوفمبر 2026',
    notes: 'شحن رصيد لدخول مناقصات الطاقة الشمسية',
  },
  {
    id: 'tx-904',
    type: 'escrow_release',
    channel: 'صرف مستحقات صفقة',
    refNumber: 'ESC-4401',
    amount: 3200,
    currency: 'SAR',
    status: 'approved',
    date: '02 نوفمبر 2026',
    notes: 'اكتمال فحص أجهزة لابتوب ديل بعد 48 ساعة معاينة',
  },
];

export default function WalletPage() {
  // الأرصدة المتعددة
  const [yerBalance, setYerBalance] = useState({ available: 450000, frozen: 1000000 });
  const [usdBalance, setUsdBalance] = useState({ available: 500, frozen: 0 });
  const [sarBalance, setSarBalance] = useState({ available: 3200, frozen: 0 });

  const [activeCurrency, setActiveCurrency] = useState<'YER' | 'USD' | 'SAR'>('YER');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('kuraimi_bank');
  
  // مدخلات سند الإيداع
  const [depositAmount, setDepositAmount] = useState<string>('1000000');
  const [depositRefNumber, setDepositRefNumber] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('م. أحمد الحاشدي');
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);

  const selectedChannel = PAYMENT_CHANNELS_CONFIG.find((c) => c.id === selectedChannelId) || PAYMENT_CHANNELS_CONFIG[0];

  // تقديم إشعار / سند إيداع
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!depositRefNumber.trim()) {
      setNotification({ type: 'error', text: 'يرجى إدخال رقم الحوالة أو مرجع الإشعار البنكي.' });
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newTx: TransactionItem = {
        id: `tx-${Date.now().toString().slice(-4)}`,
        type: 'deposit',
        channel: selectedChannel.nameAr,
        refNumber: depositRefNumber.toUpperCase().trim(),
        amount: Number(depositAmount),
        currency: activeCurrency,
        status: 'pending',
        date: 'الآن',
        notes: `طلب إيداع قيد المراجعة والتدقيق بواسطة مسؤول المالية (${senderName})`,
      };

      setTransactions([newTx, ...transactions]);
      setDepositRefNumber('');
      setReceiptFileName(null);
      setIsSubmitting(false);

      setNotification({
        type: 'success',
        text: `تم استلام سند الإيداع بنجاح برقم إشعار (${newTx.refNumber}). يتم مطابقة الحوالة مع كشف الحساب وشحن رصيدك خلال أقل من 15 دقيقة!`,
      });
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <Wallet className="w-4 h-4" />
            <span>المحفظة الرقمية المتوافقة مع الشبكات المصرفية اليمنية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            محفظتي والضمان المالي (Escrow Ledger)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            إدارة الأرصدة بالريال اليمني والدولار والسعودي، ورفع سندات الإيداع، وتتبع المبالغ المحجوزة في الضمان.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>حساب موثق بالبطاقة الوطنية</span>
          </span>
        </div>
      </div>

      {/* 1. بطاقات الأرصدة متعددة العملات (Multi-Currency Balances) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* ريال يمني YER */}
        <div 
          onClick={() => setActiveCurrency('YER')}
          className={`cursor-pointer rounded-3xl p-6 transition border ${
            activeCurrency === 'YER'
              ? 'bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-emerald-400 font-mono">YER • ريال يمني</span>
            {activeCurrency === 'YER' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                العملة المحددة
              </span>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">الرصيد المتاح للمزايدة:</span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {yerBalance.available.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ر.ي</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>العربون والضمان المحجوز:</span>
            </span>
            <span className="font-bold text-amber-400 font-mono">
              {yerBalance.frozen.toLocaleString()} ر.ي
            </span>
          </div>
        </div>

        {/* دولار أمريكي USD */}
        <div 
          onClick={() => setActiveCurrency('USD')}
          className={`cursor-pointer rounded-3xl p-6 transition border ${
            activeCurrency === 'USD'
              ? 'bg-gradient-to-br from-teal-950/70 via-slate-900 to-slate-900 border-teal-500 shadow-lg shadow-teal-950/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-teal-400 font-mono">USD • دولار أمريكي</span>
            {activeCurrency === 'USD' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold">
                العملة المحددة
              </span>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">الرصيد المتاح للمزايدة:</span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              ${usdBalance.available.toLocaleString()} <span className="text-xs text-slate-400 font-normal">USD</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>العربون والضمان المحجوز:</span>
            </span>
            <span className="font-bold text-amber-400 font-mono">
              ${usdBalance.frozen.toLocaleString()} USD
            </span>
          </div>
        </div>

        {/* ريال سعودي SAR */}
        <div 
          onClick={() => setActiveCurrency('SAR')}
          className={`cursor-pointer rounded-3xl p-6 transition border ${
            activeCurrency === 'SAR'
              ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-900 border-amber-500 shadow-lg shadow-amber-950/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-amber-400 font-mono">SAR • ريال سعودي</span>
            {activeCurrency === 'SAR' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                العملة المحددة
              </span>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">الرصيد المتاح للمزايدة:</span>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {sarBalance.available.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ر.س</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>العربون والضمان المحجوز:</span>
            </span>
            <span className="font-bold text-amber-400 font-mono">
              {sarBalance.frozen.toLocaleString()} ر.س
            </span>
          </div>
        </div>

      </div>

      {/* 2. قسم شحن الرصيد وسندات الإيداع المحلية (Deposit Vouchers) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* العمود الأيمن: نموذج رفع سند الإيداع (7 أعمدة) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">إيداع رصيد جديد عبر القنوات اليمنية المعتمدة</h3>
                  <p className="text-xs text-slate-400">حسابات المنصة الرسمية لدى البنوك والمحافظ وشبكات الصرافة</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                {activeCurrency}
              </span>
            </div>

            {/* تنبيه الاستجابة */}
            {notification && (
              <div className={`p-4 rounded-2xl text-xs flex items-center gap-3 ${
                notification.type === 'success'
                  ? 'bg-emerald-950/90 border border-emerald-700 text-emerald-300'
                  : 'bg-rose-950/90 border border-rose-700 text-rose-300'
              }`}>
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                )}
                <span className="leading-relaxed">{notification.text}</span>
              </div>
            )}

            {/* اختيار قناة الدفع */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">اختر وسيلة الإيداع أو شبكة التحويل:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PAYMENT_CHANNELS_CONFIG.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                      selectedChannelId === channel.id
                        ? 'bg-slate-800 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-xs font-bold block">{channel.nameAr}</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-1">{channel.nameEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* تفاصيل الحساب البنكي / المحفظة المحددة للتحويل إليها */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2 text-xs">
              <span className="text-[11px] text-emerald-400 font-bold block">
                بيانات التحويل الرسمي لمنصة مزايد:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">الجهة أو القناة:</span>
                  <span className="font-bold text-white">{selectedChannel.nameAr}</span>
                </div>
                {'accountNumber' in selectedChannel && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">رقم الحساب / المحفظة:</span>
                    <span className="font-mono font-bold text-emerald-300 text-sm select-all">
                      {selectedChannel.accountNumber}
                    </span>
                  </div>
                )}
                {'beneficiaryName' in selectedChannel && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">اسم المستفيد المعتمد:</span>
                    <span className="font-semibold text-slate-200">{selectedChannel.beneficiaryName}</span>
                  </div>
                )}
                {'recipientName' in selectedChannel && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">اسم المستلم في الحوالة:</span>
                    <span className="font-semibold text-slate-200">{selectedChannel.recipientName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* نموذج إدخال رقم العملية وسند التحويل */}
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">مبلغ الإيداع ({activeCurrency}):</label>
                  <input
                    type="number"
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">رقم الحوالة / مرجع الإشعار البنكي:</label>
                  <input
                    type="text"
                    required
                    value={depositRefNumber}
                    onChange={(e) => setDepositRefNumber(e.target.value)}
                    placeholder="مثال: KR-984021 أو رقم الحوالة"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none uppercase"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">اسم المودع كما يظهر في السند:</label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* رفع صورة السند */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">إرفاق صورة سند الإيداع أو لقطة شاشة التحويل:</label>
                <div 
                  onClick={() => setReceiptFileName('receipt_deposit_voucher_signed.jpg')}
                  className="cursor-pointer p-4 rounded-xl bg-slate-950 border-2 border-dashed border-slate-800 hover:border-emerald-500/60 transition text-center space-y-1"
                >
                  <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                  <span className="text-xs text-slate-300 block font-medium">
                    {receiptFileName ? `تم إرفاق: ${receiptFileName} (جاهز)` : 'انقر لرفع صورة السند أو سحب الإشعار هنا'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">يدعم JPG, PNG, PDF حتى 10MB</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>إرسال سند الإيداع للتدقيق وشحن المحفظة</span>
              </button>
            </form>
          </div>
        </div>

        {/* العمود الأيسر: إرشادات الضمان والسحب (5 أعمدة) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
            <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>قواعد الوساطة والضمان المالي (Escrow Rules)</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">1. حجز العربون التلقائي:</span>
                <p className="text-slate-400">
                  عند دخولك مزاد عالي القيمة يتم حجز مبلغ العربون مؤقتاً في رصيدك المجمد، وإذا لم تفز بالمزاد يُعاد إلى رصيدك المتاح فور إغلاق المزاد.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">2. مهلة فحص السلعة 48 ساعة:</span>
                <p className="text-slate-400">
                  يظل إجمالي قيمة الصفقة مجمداً في حساب الضمان حتى تستلم السلعة وتفحصها وتؤكد مطابقتها للمواصفات.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-white block">3. سحب الأرباح والرصيد:</span>
                <p className="text-slate-400">
                  يمكن للبائعين سحب مستحقاتهم الصافية في أي وقت عبر حسابات بنك الكريمي أو شبكات النجم والعمقي مع عمولة منصة ثابتة 2.5%.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert('طلب السحب متاح لأرصدتك الصافية عبر لوحة الصرف')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              <span>طلب سحب رصيد لحسابي البنكي</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. سجل الحركات والمعاملات المالية (Transaction Ledger) */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">سجل المعاملات والعمليات المالية المعتمدة</h3>
          </div>
          <span className="text-xs text-slate-400">سجل محاسبي رقمي متزامن وغير قابل للتلاعب</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-3 font-semibold">نوع العملية</th>
                <th className="py-3 px-3 font-semibold">القناة / المرجع</th>
                <th className="py-3 px-3 font-semibold">المبلغ والعملة</th>
                <th className="py-3 px-3 font-semibold">الحالة</th>
                <th className="py-3 px-3 font-semibold">التاريخ</th>
                <th className="py-3 px-3 font-semibold">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-3 font-bold text-white">
                    {tx.type === 'deposit' && 'إيداع محفظة'}
                    {tx.type === 'bid_deposit_hold' && 'حجز عربون مزاد'}
                    {tx.type === 'escrow_release' && 'إفراج ضمان للبائع'}
                    {tx.type === 'withdrawal' && 'سحب أرباح'}
                    {tx.type === 'escrow_refund' && 'استرداد ضمان'}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="block text-slate-300 font-medium">{tx.channel}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{tx.refNumber}</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-slate-200">
                    <span className={tx.type === 'deposit' || tx.type === 'escrow_release' ? 'text-emerald-400' : 'text-amber-400'}>
                      {tx.type === 'deposit' ? '+' : ''}{tx.amount.toLocaleString()} {tx.currency}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    {tx.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        <CheckCircle className="w-3 h-3" />
                        <span>مكتمل ومعتمد</span>
                      </span>
                    )}
                    {tx.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>قيد المراجعة</span>
                      </span>
                    )}
                    {tx.status === 'holding' && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                        <Lock className="w-3 h-3" />
                        <span>محجوز بالضمان</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                    {tx.date}
                  </td>
                  <td className="py-3.5 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                    {tx.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
