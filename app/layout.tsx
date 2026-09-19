import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

// Both are variable fonts, so no weights need listing. Exposed as CSS variables, consumed by the
// theme in globals.css (font-sans = Plus Jakarta Sans, font-heading = Outfit).
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });

export const metadata: Metadata = {
  title: 'GistVeil',
  description: 'Post your problem anonymously. Get real advice.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jakarta.variable}`}>
      <body className="min-h-screen bg-black">{children}</body>
    </html>
  );
}
