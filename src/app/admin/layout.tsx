'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Activity, 
  Wallet, 
  UserCheck, 
  Scale, 
  Radar, 
  LayoutDashboard, 
  Gavel,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const adminNavItems = [
    { href: '/admin', label: 'المؤشرات', icon: LayoutDashboard },
    { href: '/admin/live', label: 'المراقبة الحية', icon: Activity, dot: 'bg-rose-500 animate-ping' },
    { href: '/admin/kyc', label: 'توثيق KYC', icon: UserCheck, count: '3' },
    { href: '/admin/finance', label: 'التدقيق المالي', icon: Wallet, count: '4' },
    { href: '/admin/disputes', label: 'فض النزاعات', icon: Scale, count: '1' },
    { href: '/admin/ai-security', label: 'مكافحة الاحتيال', icon: Radar },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* شريط الإدارة العلوي المدمج والأنيق - بار واحد فقط بدون أي تكرار */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          
          {/* الجانب الأيمن: الشعار وشارة الرقابة */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Gavel className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm text-white hidden sm:inline">
                مـزايـد
              </span>
            </Link>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 font-medium">
              لوحة الإدارة
            </span>
          </div>

          {/* المنتصف: تبويبات الأقسام المدمجة */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.dot && (
                    <span className={`w-1.5 h-1.5 rounded-full ${item.dot} ${active ? 'bg-slate-950' : ''}`} />
                  )}
                  {item.count && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      active ? 'bg-slate-950 text-amber-400 font-bold' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* الجانب الأيسر: حالة الخادم وزر الخروج للواجهة العامة */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden lg:flex items-center gap-1.5 text-emerald-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>النظام نشط</span>
            </span>
            <Link
              href="/"
              className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <span>الواجهة العامة</span>
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>

        </div>
      </header>

      {/* مساحة المحتوى الإداري */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full flex-1">
        {children}
      </main>
    </div>
  );
}
