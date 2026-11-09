'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gavel, FileText, Wallet, LayoutDashboard, PlusCircle } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();

  // إخفاء الشريط السفلي في لوحة الإدارة لإتاحة مساحة كاملة
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const navItems = [
    { href: '/auctions', label: 'المزادات', icon: Gavel },
    { href: '/tenders', label: 'المناقصات', icon: FileText },
    { href: '/auctions/create', label: 'إنشاء', icon: PlusCircle, isAction: true },
    { href: '/wallet', label: 'محفظتي', icon: Wallet },
    { href: '/admin', label: 'الإدارة', icon: LayoutDashboard },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 pb-safe">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');

          if (item.isAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center relative -top-3 group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/40 group-active:scale-95 transition-transform">
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-emerald-400 mt-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
