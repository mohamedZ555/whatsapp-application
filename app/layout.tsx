import type { Metadata } from 'next';
import './globals.css';
import { getLocale, getMessages } from 'next-intl/server';
import Providers from '@/components/providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Manrope, JetBrains_Mono } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'FadaaWhats',
  description: 'WhatsApp Business Messaging Platform',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await getServerSession(authOptions);

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}>
        <Providers locale={locale} messages={messages} session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
