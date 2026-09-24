import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ร้านขายดี - แพลตฟอร์มจัดการร้านอาหาร & สั่งอาหารผ่าน QR Code',
  description: 'สุดยอดระบบจัดการร้านอาหาร POS, สั่งอาหาร QR Code, ครัว KDS, และระบบบัญชี สำหรับร้านตามสั่งและบุฟเฟ่ต์',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased text-slate-800">
        {children}
      </body>
    </html>
  );
}
