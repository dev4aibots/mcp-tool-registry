'use client';

import { usePathname, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  Header,
  Breadcrumbs,
  BranchName,
  UnderlineNav,
  CounterLabel,
  Text,
  Link,
  Avatar,
  TextInput,
  ButtonGroup,
  Button,
  Stack,
} from '@primer/react';
import { MarkGithubIcon, SearchIcon } from '@primer/octicons-react';
import { ThemeToggle } from './ThemeToggle';

// Reads as github.com/dev4aibots/mcp-tool-registry — the source repo
const TABS: Array<{ href: string; label: string; count?: number }> = [
  { href: '/tools', label: 'Tools', count: 3 },
  { href: '/incidents', label: 'Incidents', count: 3 },
  { href: '/console', label: 'Console' },
  { href: '/errors', label: 'Error paths' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/tools') return pathname === '/tools' || pathname === '/';
  if (href === '/incidents') return pathname === '/incidents' || pathname.startsWith('/incidents/');
  return pathname === href;
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const submitSearch = (value: string) => {
    const q = value.trim();
    // SPA navigation: preserves the module-level session store (ack state),
    // unlike window.location.assign which resets it via a full reload.
    router.push(`/incidents${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  return (
    <div className="col" style={{ minHeight: '100vh', gap: 0 }}>
      {/* GitHub dark top bar */}
      <Header>
        <Header.Item>
          <Header.Link href="https://github.com/dev4aibots/mcp-tool-registry" className="flex">
            <MarkGithubIcon size={32} />
            <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              dev4aibots/mcp-tool-registry on GitHub
            </span>
          </Header.Link>
        </Header.Item>
        <Header.Item full>
          <TextInput
            aria-label="Search this demo"
            placeholder="Search incidents and tools"
            leadingVisual={SearchIcon}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                submitSearch((event.target as HTMLInputElement).value);
              }
            }}
          />
        </Header.Item>
        <Header.Item className="mr-0">
          <ThemeToggle />
        </Header.Item>
        <Header.Item className="mr-0">
          <Avatar src="https://github.com/dev4aibots.png" alt="dev4aibots" size={32} square />
        </Header.Item>
      </Header>

      {/* Repo context header */}
      <div
        style={{
          backgroundColor: 'var(--bgColor-default)',
          borderBottom: '1px solid var(--borderColor-default)',
          paddingLeft: 'var(--space-lg)',
          paddingRight: 'var(--space-lg)',
          paddingTop: 'var(--space-lg)',
        }}
      >
        <Stack direction="horizontal" justify="space-between" align="center" wrap="wrap" gap="normal">
          <Breadcrumbs>
            <Breadcrumbs.Item href="https://github.com/dev4aibots">dev4aibots</Breadcrumbs.Item>
            <Breadcrumbs.Item as={NextLink} href="/tools" selected>
              mcp-tool-registry-demo
            </Breadcrumbs.Item>
          </Breadcrumbs>
          <Stack direction="horizontal" align="center" gap="normal">
            <BranchName href="https://github.com/dev4aibots/mcp-tool-registry">main</BranchName>
            <ButtonGroup>
              <Button
                size="small"
                as="a"
                href="https://github.com/dev4aibots/mcp-tool-registry"
                target="_blank"
                rel="noreferrer"
                aria-label="Watch dev4aibots/mcp-tool-registry on GitHub (opens in a new tab)"
              >
                Watch
              </Button>
              <Button
                size="small"
                as="a"
                href="https://github.com/dev4aibots/mcp-tool-registry/fork"
                target="_blank"
                rel="noreferrer"
                aria-label="Fork dev4aibots/mcp-tool-registry on GitHub (opens in a new tab)"
              >
                Fork
              </Button>
              <Button
                size="small"
                as="a"
                href="https://github.com/dev4aibots/mcp-tool-registry"
                target="_blank"
                rel="noreferrer"
                aria-label="Star dev4aibots/mcp-tool-registry on GitHub (opens in a new tab)"
              >
                Star <CounterLabel className="ml-1">1</CounterLabel>
              </Button>
            </ButtonGroup>
          </Stack>
        </Stack>

        <UnderlineNav aria-label="Demo views" className="mt-2">
          {TABS.map((tab) => (
            <UnderlineNav.Item
              key={tab.href}
              as={NextLink}
              href={tab.href}
              aria-current={isActive(pathname, tab.href) ? 'page' : undefined}
              counter={tab.count}
            >
              {tab.label}
            </UnderlineNav.Item>
          ))}
        </UnderlineNav>
      </div>

      {/* Page content */}
      <main
        style={{
          flex: '1 0 auto',
          width: '100%',
          maxWidth: '1280px',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: 'var(--space-xl) var(--space-lg)',
        }}
      >
        {children}
      </main>

      {/* Thin muted footer */}
      <footer
        style={{
          borderTop: '1px solid var(--borderColor-default)',
          padding: 'var(--space-md) var(--space-lg)',
        }}
      >
        <Stack direction="horizontal" gap="normal" wrap="wrap" align="center">
          <Text className="t-caption-muted">© 2026 dev4aibots</Text>
          <Link href="https://github.com/dev4aibots/mcp-tool-registry" className="t-code" style={{ fontSize: '12px' }}>
            mcp-tool-registry
          </Link>
          <Link as={NextLink} href="/console" style={{ fontSize: '12px' }}>
            JSON-RPC console
          </Link>
          <Text className="t-caption-muted">
            Every view dispatches against the real ported protocol core — no mocks.
          </Text>
        </Stack>
      </footer>
    </div>
  );
}
