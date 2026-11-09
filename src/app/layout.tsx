import './globals.css';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';

export const viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: 'منصة مزايد | مزادات ومناقصات حية بضمان مالي في اليمن',
  description: 'المنصة اليمنية الأولى للمزادات التصاعدية بالوقت الفعلي، المناقصات العكسية، الضمان المالي Escrow، وتوثيق الهويات KYC.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased font-['Cairo',sans-serif] min-h-screen flex flex-col selection:bg-emerald-500 selection:text-white pb-16 md:pb-0">
        {/* رأس الصفحة الرئيسي مع شريط الإشعارات المتزامن (يُخفى تلقائياً في لوحة الإدارة لمنع الازدحام) */}
        <Header />

        {/* محتوى الصفحات */}
        <main className="flex-1 w-full">
          {children}
        </main>

        {/* شريط التنقل السفلي للأجهزة الذكية (Mobile PWA Bottom Bar) */}
        <MobileNav />

        {/* تذييل الصفحة للمكتبي */}
        <footer className="hidden md:block bg-slate-950 border-t border-slate-900 py-8 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-200">منصة مزايد</span>
              <span>•</span>
              <span>الجمهورية اليمنية</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono">v1.0.0 Production PWA</span>
            </div>
            <div className="flex items-center gap-6">
              <span>نسبة الوساطة الضامنة: 2.5%</span>
              <span>مهلة المعاينة: 48 ساعة</span>
              <span>حماية المزايدة Anti-Sniping (+120s)</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
