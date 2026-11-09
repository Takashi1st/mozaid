'use client';

import React from 'react';
import Link from 'next/link';
import { Gavel, FileText, ShieldCheck, Wallet, User, Bell, PlusCircle, Award, Phone } from 'lucide-react';
import { VerificationTier } from '@/types';

interface NavbarProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  walletBalance?: number;
  isVerified?: boolean;
  verificationTier?: VerificationTier;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab = 'auctions',
  onTabChange,
  walletBalance = 450000,
  isVerified = true,
  verificationTier = 'tier2_id_liveness',
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* الشعار والهوية */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Gavel className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-amber-300 bg-clip-text text-transparent">
              مـزايـد AI
            </span>
            <span className="text-[10px] text-slate-400 block -mt-1 font-mono">
              اليمن • مزادات ومناقصات ذكية
            </span>
          </div>
        </div>

        {/* روابط التنقل الرئيسية */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => onTabChange?.('auctions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              currentTab === 'auctions'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Gavel className="w-4 h-4" />
            المزادات الحية
          </button>

          <button
            onClick={() => onTabChange?.('tenders')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              currentTab === 'tenders'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            المناقصات والتوريدات
          </button>

          <button
            onClick={() => onTabChange?.('escrow')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              currentTab === 'escrow'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            الضمان والنزاعات
          </button>

          <button
            onClick={() => onTabChange?.('admin')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              currentTab === 'admin'
                ? 'bg-amber-600 text-white shadow'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            غرفة التحكم (الإدارة)
          </button>
        </nav>

        {/* الرصيد، التوثيق، والإشعارات */}
        <div className="flex items-center gap-3">
          {/* رصيد المحفظة */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block leading-none">المحفظة</span>
              <span className="text-xs font-bold text-emerald-300 font-mono">
                {walletBalance.toLocaleString()} ر.ي
              </span>
            </div>
          </div>

          {/* شارات مستويات التوثيق الثلاثة (Tiers 1, 2, 3) */}
          {verificationTier === 'tier1_phone' && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded-full">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>المستوى 1: هاتف موثق</span>
            </div>
          )}

          {verificationTier === 'tier2_id_liveness' && (
            <div className="hidden sm:flex items-center gap-1 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>المستوى 2: هوية حية معتمدة</span>
            </div>
          )}

          {verificationTier === 'tier3_elite_trader' && (
            <div className="hidden sm:flex items-center gap-1 bg-amber-950/70 border border-amber-600/80 text-amber-300 text-xs px-2.5 py-1 rounded-full shadow-sm">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>المستوى 3: تاجر ذهبي موثوق (10+ صفقات)</span>
            </div>
          )}

          {/* زر إضافة مزاد / مناقصة جديد */}
          <button 
            onClick={() => onTabChange?.('create')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">طرح جديد</span>
          </button>

          {/* الإشعارات */}
          <button className="relative p-2 text-slate-300 hover:text-white bg-slate-800/80 rounded-xl border border-slate-700">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
          </button>
        </div>

      </div>
    </header>
  );
};
