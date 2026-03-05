import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'nas-gpt-chat',
  description: 'Self-hosted ChatGPT-style app for NAS'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
