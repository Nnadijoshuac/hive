import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const sans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const mono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Hive: every AI answer, checked before you pay for it',
  description:
    'Post a task and a budget. Three AIs answer on NEAR AI confidential hardware and a fourth grades them. Answers that score 70 or more share the budget and the rest comes back to you.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} antialiased`}>
      <body className="min-h-full bg-white text-neutral-950">{children}</body>
    </html>
  );
}
