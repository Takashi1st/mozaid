'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Wallet, 
  UserCheck, 
  Scale, 
  Radar, 
  TrendingUp, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  Gavel,
  FileText,
  MapPin,
  DollarSign
} from 'lucide-react';

export default function AdminOverviewDashboard() {
  const kpiStats = [
    {
      title: 'إجمالي حجم التداولات',
      value: '227,500,000 ر.ي',
      subValue: '+ $192,000 USD • + 145,000 SAR',
      trend: '+18.4% هذا الأسبوع',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'عوائد عمولة المنصة 2.5%',
      value: '5,687,500 ر.ي',
      subValue: '+$4,800 USD صافي الأتعاب المحصلة',
      trend: 'محسوبة آلياً بنسبة صفر تسريب',
      icon: DollarSign,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
    },
    {
      title: 'الغرف الحية النشطة الآن',
      value: '6 مزادات • 4 مناقصات',
      subValue: '3 غرف في وضع التمديد الحاسم لمنع الاحتكار',
      trend: 'تزامن حي فوري',
      icon: Activity,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'طلبات التدقيق والاعتماد',
      value: '4 سندات • 3 توثيق هويات',
      subValue: '1 قضية نزاع تحكيم قيد النظر',
      trend: 'متوسط زمن الاعتماد 9 دقائق',
      icon: Clock,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
  ];

  const regionalActivity = [
    { city: 'أمانة العاصمة - صنعاء', share: '46%', volume: '104,650,000 ر.ي', deals: 28 },
    { city: 'العاصمة المؤقتة - عدن', share: '28%', volume: '$125,000 USD', deals: 19 },
    { city: 'محافظة تعز', share: '14%', volume: '31,850,000 ر.ي', deals: 12 },
    { city: 'حضرموت (المكلا وسيئون)', share: '8%', volume: '48,000 SAR', deals: 7 },
    { city: 'مأرب والحديدة', share: '4%', volume: '9,100,000 ر.ي', deals: 4 },
  ];

  const systemAuditLog = [
    { time: '10:48 ص', actor: 'النظام التلقائي', action: 'تمديد تلقائي +120 ثانية لمزاد تويوتا لاندكروزر 2022 بصنعاء' },
    { time: '10:35 ص', actor: 'المشرف المالي', action: 'اعتماد سند إيداع KR-772819 بنك الكريمي بمبلغ 1,500,000 ر.ي' },
    { time: '10:12 ص', actor: 'رادار مكافحة الاحتيال', action: 'رصد تكرار IP للمزايد #u-109 مع بائع مزاد أجهزة حاسوب (تنبيه درجة متوسطة)' },
    { time: '09:50 ص', actor: 'نظام الضمان المالي', action: 'إفراج تلقائي لمبلغ 18,200 SAR بعد انتهاء مهلة 48 ساعة دون نزاع' },
  ];

  return (
    <div className="space-y-8">
      
      {/* عنوان المركز ورسالة الترحيب */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">لوحة القيادة والمؤشرات العامة</h1>
          <p className="text-xs text-slate-400 mt-1">
            مراقبة الأداء المالي، نشاط الغرف الحية، طوابير التدقيق، ومؤشرات الأمان عبر المحافظات اليمنية.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/live"
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition flex items-center gap-2"
          >
            <Activity className="w-4 h-4 animate-pulse" />
            <span>غرفة المراقبة الحية للطوارئ</span>
          </Link>
        </div>
      </div>

      {/* 1. شبكة المؤشرات الرئيسية (KPIs Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiStats.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="rounded-3xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{kpi.title}</span>
                <div className={`p-2 rounded-xl ${kpi.bgColor} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  {kpi.subValue}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span>{kpi.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. مراكز الإدارة المباشرة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Link
          href="/admin/live"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/60 transition group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition">
              <Activity className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">المراقبة الحية للطوارئ</h3>
            <p className="text-xs text-slate-400 mt-1">
              إيقاف المزاد، التراجع عن العرض الخاطئ، وتمديد العداد اليدوي.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/kyc"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/60 transition group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono">3 معلقة</span>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">توثيق الهويات الوطنية</h3>
            <p className="text-xs text-slate-400 mt-1">
              تدقيق بطاقات الهوية الشخصية ومطابقة صور السيلفي واعتماد الشارات.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/finance"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/60 transition group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono">4 سندات</span>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">التدقيق المالي والضمان</h3>
            <p className="text-xs text-slate-400 mt-1">
              مطابقة سندات الإيداع وشحن المحافظ وتتبع عمولات المنصة 2.5%.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/ai-security"
          className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/60 transition group space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
              <Radar className="w-5 h-5" />
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono">نشط</span>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">رادار مكافحة الاحتيال</h3>
            <p className="text-xs text-slate-400 mt-1">
              كشف المزايدات الوهمية وتقارب العناوين وحظر حسابات الظل.
            </p>
          </div>
        </Link>

      </div>

      {/* 3. النشاط الإقليمي وسجل التدقيق اللحظي */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* النشاط الإقليمي وحجم التداولات عبر المحافظات */}
        <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">التوزيع الجغرافي لحجم التداولات</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">المحافظات اليمنية</span>
          </div>

          <div className="space-y-3">
            {regionalActivity.map((region, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{region.city}</span>
                  <span className="text-[11px] text-slate-500">{region.deals} صفقات منجزة</span>
                </div>

                <div className="text-left font-mono">
                  <span className="font-extrabold text-emerald-400 text-sm block">{region.volume}</span>
                  <span className="text-[10px] text-slate-400">حصة السوق: {region.share}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* سجل التدقيق الإداري والعمليات اللحظي */}
        <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>سجل العمليات والرقابة الميدانية</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">سجل لحظي</span>
          </div>

          <div className="space-y-3">
            {systemAuditLog.map((log, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-300">{log.actor}</span>
                  <span className="text-slate-500 font-mono">{log.time}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {log.action}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
