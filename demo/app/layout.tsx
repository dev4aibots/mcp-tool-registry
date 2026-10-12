import './global.css';
import { cookies } from 'next/headers';
import { BaseStyles, ThemeProvider } from '@primer/react';
import { SiteChrome } from '@/components/SiteChrome';

export const metadata = {
  title: 'mcp-tool-registry demo — dev4aibots',
  description:
    'Live browser demo of the MCP tool registry protocol core: real JSON-RPC dispatch, incidents tools, and error paths.',
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
      <body>
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
