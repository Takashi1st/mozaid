'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Gavel, 
  FileText, 
  Wallet, 
  LayoutDashboard, 
  PlusCircle, 
  Menu, 
  X, 
  UserCheck
} from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // إخفاء رأس الواجهة العامة بالكامل عند الدخول إلى لوحة الإدارة لمنع ازدحام الشاشة
  const isAdmin = pathname.startsWith('/admin');
  if (isAdmin) {
    return null;
  }

  const navLinks = [
    { href: '/auctions', label: 'المزادات الحية', icon: Gavel },
    { href: '/tenders', label: 'المناقصات والتوريدات', icon: FileText },
    { href: '/wallet', label: 'محفظتي', icon: Wallet },
    { href: '/kyc', label: 'توثيق الحساب', icon: UserCheck },
    { href: '/admin', label: 'الإدارة', icon: LayoutDashboard },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* الهوية والشعار */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-200 to-emerald-100 bg-clip-text text-transparent">
                  مـزايـد
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-mono">
                  اليمن
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                مزادات ومناقصات حية بضمان مالي
              </span>
            </div>
          </Link>
        </div>

        {/* الروابط الرئيسية لسطح المكتب */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* أزرار الإجراءات السريعة والمحفظة */}
        <div className="flex items-center gap-2.5">
          {/* رصيد المحفظة السريع */}
          <Link
            href="/wallet"
            className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 px-3 py-1.5 rounded-xl transition"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block leading-tight">المحفظة</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                450,000 <span className="text-[10px] text-slate-400 font-normal">ر.ي</span>
              </span>
            </div>
          </Link>

          {/* زر طرح مزاد جديد */}
          <Link
            href="/auctions/create"
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4 text-emerald-100" />
            <span>طرح مزاد جديد</span>
          </Link>

          {/* زر قائمة الموبايل */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* قائمة الجوال المنبثقة */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/98 px-4 pt-3 pb-5 space-y-2 animate-fadeIn">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  active
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <Link
              href="/tenders/create"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>طرح مناقصة جديدة</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
