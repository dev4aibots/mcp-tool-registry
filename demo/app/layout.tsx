import './global.css';
import './design-overlay.css';
import '@fontsource-variable/mona-sans';
import '@fontsource-variable/hubot-sans';
import { cookies } from 'next/headers';
import { BaseStyles, ThemeProvider } from '@primer/react';
import { SiteChrome } from '@/components/SiteChrome';

export const metadata = {
  title: 'mcp-tool-registry demo — dev4aibots',
  description:
    'Every tool an AI assistant can plug into, in one catalog: browse the tools, watch incidents get acknowledged, and send raw requests to the real protocol core.',
};

type ColorMode = 'light' | 'dark' | 'auto';

function getColorMode(preference?: string): ColorMode {
  if (preference === 'light' || preference === 'dark') return preference;
  return 'auto';
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const colorMode = getColorMode(cookieStore.get('color-preference')?.value);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-color-mode={colorMode}
      data-light-theme="light"
      data-dark-theme="dark"
    >
      <body className="du-theme-fade">
        {/* Theme attributes live on <html>; contextOnly avoids an extra DOM wrapper */}
        <ThemeProvider colorMode={colorMode} contextOnly>
          <BaseStyles>
            <SiteChrome>{children}</SiteChrome>
          </BaseStyles>
        </ThemeProvider>
      </body>
    </html>
  );
}
