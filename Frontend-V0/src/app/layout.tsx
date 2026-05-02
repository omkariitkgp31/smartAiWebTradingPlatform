import Providers from './providers';
import '../index.css';
import '../App.css';

export const metadata = {
  title: 'SyntheticBull — Stock Trading Terminal',
  description: 'SyntheticBull — Professional stock trading terminal powered by real-time data',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
