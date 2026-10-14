'use client';

import { useEffect } from 'react';
import { SunIcon, MoonIcon } from '@primer/octicons-react';
import { IconButton, useTheme } from '@primer/react';

const STORAGE_KEY = 'color-preference';

function readStored(): 'light' | 'dark' | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null; // storage unavailable (e.g. private mode)
  }
}

export function ThemeToggle() {
  const { colorMode, setColorMode } = useTheme();

  // Re-apply a previously saved choice on mount. The cookie handles SSR
  // first paint; this covers full reloads where the cookie write didn't
  // stick, so the toggle genuinely survives a page load.
  useEffect(() => {
    const saved = readStored();
    if (saved) {
      document.documentElement.setAttribute('data-color-mode', saved);
      setColorMode(saved);
    }
  }, [setColorMode]);

  const apply = (next: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-color-mode', next);
    setColorMode(next);
    // Synchronous client persistence (the cookie POST below is fire-and-forget).
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode — cookie still applies */
    }
    // Persist the cookie so SSR matches on first paint after reloads
    fetch('/api/color-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colorMode: next }),
    }).catch(() => {
      /* preference still applies for this session via localStorage */
    });
  };

  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={colorMode === 'dark' ? SunIcon : MoonIcon}
      variant="invisible"
      onClick={() => {
        const next = colorMode === 'dark' ? 'light' : 'dark';
        apply(next);
      }}
    />
  );
}
