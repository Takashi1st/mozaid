'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Gavel, 
  FileText, 
  Wallet, 
  LayoutDashboard, 
  PlusCircle, 
  Menu, 
  X, 
  LogIn,
  LogOut,
  User,
  ShieldCheck
} from 'lucide-react';

interface AuthState {
  authenticated: boolean;
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: 'admin' | 'user';
    wallet?: {
      availableBalance: number;
      currency: string;
    };
  } | null;
}

export const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ authenticated: false, user: null });
  const [loading, setLoading] = useState(true);

  // إخفاء رأس الواجهة العامة عند التواجد داخل لوحة الإدارة
  const isAdminPath = pathname.startsWith('/admin');

  // جلب حالة المستخدم الحية من API
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setAuth(data);
          }
        }
      } catch (err) {
        console.error('Error fetching auth state in header:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    checkAuth();
    return () => { isMounted = false; };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuth({ authenticated: false, user: null });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (isAdminPath) {
    return null;
  }

  const navLinks = [
    { href: '/auctions', label: 'المزادات الحية', icon: Gavel },
    { href: '/tenders', label: 'المناقصات والتوريدات', icon: FileText },
    ...(auth.authenticated ? [{ href: '/wallet', label: 'محفظتي', icon: Wallet }] : []),
    ...(auth.user?.role === 'admin' ? [{ href: '/admin', label: 'لوحة الإدارة', icon: LayoutDashboard }] : []),
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* الهوية والشعار */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
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

        {/* أزرار الإجراءات وحالة الحساب */}
        <div className="flex items-center gap-2.5">
          
          {/* حالة المستخدم المسجل */}
          {auth.authenticated && auth.user ? (
            <>
              {/* رصيد المحفظة الحي للمستخدم المسجل */}
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
                    {(auth.user.wallet?.availableBalance ?? 0).toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ر.ي</span>
                  </span>
                </div>
              </Link>

              {/* زر طرح مزاد */}
              <Link
                href="/auctions/create"
                className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4 text-emerald-100" />
                <span>طرح مزاد</span>
              </Link>

              {/* اسم المستخدم أو زر الخروج */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs">
                {auth.user.role === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <User className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="font-bold text-white hidden md:inline truncate max-w-[100px]">
                  {auth.user.fullName}
                </span>
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : !loading ? (
            /* حالة الزائر (Guest): أزرار الدخول والتسجيل */
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-xl transition"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>دخول</span>
              </Link>

              <Link
                href="/register"
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-md shadow-emerald-600/20 transition"
              >
                <User className="w-4 h-4" />
                <span>تسجيل جديد</span>
              </Link>
            </div>
          ) : null}

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

          {auth.authenticated ? (
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <Link
                href="/auctions/create"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-xs font-bold text-white px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500"
              >
                <PlusCircle className="w-4 h-4" />
                <span>طرح مزاد جديد</span>
              </Link>
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-2.5 rounded-xl bg-rose-950/40 border border-rose-900/40"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200 py-2.5 rounded-xl bg-slate-900 border border-slate-800"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>دخول</span>
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-white py-2.5 rounded-xl bg-emerald-600"
              >
                <User className="w-4 h-4" />
                <span>حساب جديد</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
