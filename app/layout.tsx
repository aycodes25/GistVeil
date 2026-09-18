import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body className="min-h-screen bg-black">{children}</body>
    </html>
  );
}
