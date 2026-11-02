import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'AI Influencer Studio',
  description: 'A considered workspace for extraordinary fictional characters.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
