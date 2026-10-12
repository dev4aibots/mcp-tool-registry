'use client';

import { SunIcon, MoonIcon } from '@primer/octicons-react';
import { IconButton, useTheme } from '@primer/react';

export function ThemeToggle() {
  const { colorMode, setColorMode } = useTheme();

  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={colorMode === 'dark' ? SunIcon : MoonIcon}
      variant="invisible"
      onClick={() => {
        const next = colorMode === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-color-mode', next);
        setColorMode(next);
        // Persist the cookie so SSR matches on first paint after reloads
        fetch('/api/color-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colorMode: next }),
        }).catch(() => {
          /* preference still applies for this session */
        });
      }}
    />
  );
}
