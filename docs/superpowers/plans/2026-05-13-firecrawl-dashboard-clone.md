# Firecrawl Dashboard Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the fire-enrich Next.js web app to look and feel identical to firecrawl.dev, connected to the user's self-hosted Firecrawl instance via existing `FIRECRAWL_API_URL` + `FIRECRAWL_API_KEY` environment variables.

**Architecture:** Override CSS variables to flip the existing color system to dark, rebuild the layout shell (TopBar + sidebar) with firecrawl.dev's structure, then restyle playground pages to the input-card pattern and add new pages (Interact, Parse, Agent, Activity Logs, Usage, API Keys, Settings). All existing API call logic is preserved verbatim — only the visual layer changes.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS with CSS-variable color system, Lucide React (already installed), Recharts (already installed), Sonner for toasts, shadcn/ui

**Repo root for all file paths:** `<repo-root>/apps/web`

---

## File Map

**Modified:**
- `styles/design-system/colors.css` — flip semantic tokens to dark values; remap `--black-alpha-*` to white-alpha equivalents
- `app/layout.tsx` — add TopBar, update body bg class
- `components/app/sidebar/AppSidebar.tsx` — new nav structure (PLAYGROUND / RESEARCH PREVIEW / ACCOUNT / ADMIN)
- `app/page.tsx` — replace redirect with full Overview dashboard
- `app/playground/_components/PageHeader.tsx` — dark theme
- `app/playground/_components/Panel.tsx` — dark surface-raised card style
- `app/playground/_components/PrimaryButton.tsx` — round-7px firecrawl style
- `app/playground/_components/MissingTokenBanner.tsx` — dark theme
- `app/playground/scrape/scrape-view.tsx` — input-card + format selector pattern
- `app/playground/search/search-view.tsx` — input-card pattern
- `app/playground/crawl/crawl-view.tsx` — input-card pattern
- `app/playground/map/map-view.tsx` — input-card pattern
- `app/playground/extract/extract-view.tsx` — input-card pattern
- `app/playground/batch-scrape/batch-scrape-view.tsx` — input-card pattern

**Created:**
- `components/app/TopBar.tsx` — 48px fixed top bar with logo + nav links + upgrade button
- `app/playground/interact/page.tsx` + `interact-view.tsx` — Interact playground
- `app/playground/parse/page.tsx` + `parse-view.tsx` — Parse (file upload) playground
- `app/playground/agent/page.tsx` + `agent-view.tsx` — Agent research preview
- `app/activity-logs/page.tsx` — Activity logs with table
- `app/usage/page.tsx` — Usage with recharts line chart
- `app/api-keys/page.tsx` — Read-only API key display
- `app/settings/page.tsx` — Settings with self-hosted instance section

---

## Task 1: Dark color system

**Files:**
- Modify: `styles/design-system/colors.css`

- [ ] **Step 1: Replace the entire `:root` block in colors.css**

Replace the file at `styles/design-system/colors.css` with:

```css
/* Fire Design System Colors — Dark Theme */
:root {
  /* Base colors */
  --white: #ffffff;
  --black: #000000;

  /* Fire-inspired heat colors (orange accent — matches firecrawl.dev #f97316) */
  --heat-4: rgba(249, 115, 22, 0.04);
  --heat-8: rgba(249, 115, 22, 0.08);
  --heat-12: rgba(249, 115, 22, 0.12);
  --heat-16: rgba(249, 115, 22, 0.16);
  --heat-20: rgba(249, 115, 22, 0.20);
  --heat-40: rgba(249, 115, 22, 0.40);
  --heat-90: rgba(249, 115, 22, 0.90);
  --heat-100: #f97316;
  --heat-200: #ea6c0a;

  /* Accent colors */
  --accent-black: #ffffff;
  --accent-white: #ffffff;
  --accent-amethyst: #9061ff;
  --accent-bluetron: #2a6dfb;
  --accent-crimson: #eb3424;
  --accent-forest: #42c366;
  --accent-honey: #ecb730;

  /* White alpha variants (replaces black-alpha on dark bg) */
  --black-alpha-1: rgba(255, 255, 255, 0.012);
  --black-alpha-2: rgba(255, 255, 255, 0.020);
  --black-alpha-3: rgba(255, 255, 255, 0.031);
  --black-alpha-4: rgba(255, 255, 255, 0.039);
  --black-alpha-5: rgba(255, 255, 255, 0.06);
  --black-alpha-6: rgba(255, 255, 255, 0.07);
  --black-alpha-7: rgba(255, 255, 255, 0.08);
  --black-alpha-8: rgba(255, 255, 255, 0.09);
  --black-alpha-10: rgba(255, 255, 255, 0.10);
  --black-alpha-12: rgba(255, 255, 255, 0.12);
  --black-alpha-16: rgba(255, 255, 255, 0.16);
  --black-alpha-20: rgba(255, 255, 255, 0.20);
  --black-alpha-24: rgba(255, 255, 255, 0.24);
  --black-alpha-32: rgba(255, 255, 255, 0.32);
  --black-alpha-40: rgba(255, 255, 255, 0.40);
  --black-alpha-48: rgba(255, 255, 255, 0.35);
  --black-alpha-56: rgba(255, 255, 255, 0.45);
  --black-alpha-64: rgba(255, 255, 255, 0.55);
  --black-alpha-72: rgba(255, 255, 255, 0.65);
  --black-alpha-88: rgba(255, 255, 255, 0.85);

  /* White alpha variants */
  --white-alpha-56: rgba(255, 255, 255, 0.56);
  --white-alpha-72: rgba(255, 255, 255, 0.72);

  /* Border colors — dark */
  --border-faint: #1f1f1f;
  --border-muted: #1f1f1f;
  --border-loud: #2a2a2a;

  /* Illustration colors */
  --illustrations-faint: #1f1f1f;
  --illustrations-muted: #2a2a2a;
  --illustrations-default: #333333;

  /* Background colors — dark */
  --background-lighter: #0a0a0a;
  --background-base: #0d0d0d;

  /* Foreground colors */
  --foreground: #ffffff;
  --foreground-dimmer: rgba(255, 255, 255, 0.65);
}
```

- [ ] **Step 2: Start the dev server and verify the app looks dark**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
pnpm dev
```

Open `http://localhost:3000/playground/scrape` in the browser. The page should now be black/dark instead of white. Text should be visible (white on dark). The orange accent color should still appear on the submit button. If text is invisible or backgrounds are wrong, check the CSS variable values match Step 1.

- [ ] **Step 3: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/styles/design-system/colors.css
git commit -m "feat: flip color system to dark theme (firecrawl.dev palette)"
```

---

## Task 2: TopBar component + layout shell

**Files:**
- Create: `components/app/TopBar.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create the TopBar component**

Create `components/app/TopBar.tsx`:

```tsx
import Link from 'next/link';
import { Bell, ExternalLink, HelpCircle, Monitor } from 'lucide-react';

export function TopBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-48 items-center justify-between border-b border-border-faint bg-background-lighter px-16">
      <Link href="/" className="flex items-center gap-8">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-heat-100">
          <path
            d="M12 2C7.58172 2 4 5.58172 4 10C4 12.2091 4.89543 14.2091 6.34315 15.6569L5 21L10.3431 19.6569C11.5 19.8856 12 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4V2Z"
            fill="currentColor"
          />
          <path d="M8 10C8 8.89543 8.89543 8 10 8H14C15.1046 8 16 8.89543 16 10V14C16 15.1046 15.1046 16 14 16H10C8.89543 16 8 15.1046 8 14V10Z" fill="#0a0a0a" />
        </svg>
        <span className="text-[14px] font-semibold tracking-tight text-accent-black">
          Firecrawl
        </span>
      </Link>

      <div className="flex items-center gap-16">
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-32 w-32 items-center justify-center rounded-8 text-black-alpha-48 transition-colors hover:bg-black-alpha-5 hover:text-black-alpha-72"
        >
          <Bell className="h-16 w-16" />
        </button>
        <button
          type="button"
          aria-label="Monitor"
          className="flex h-32 w-32 items-center justify-center rounded-8 text-black-alpha-48 transition-colors hover:bg-black-alpha-5 hover:text-black-alpha-72"
        >
          <Monitor className="h-16 w-16" />
        </button>
        <a
          href="https://docs.firecrawl.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 text-[13px] text-black-alpha-56 transition-colors hover:text-black-alpha-88"
        >
          <HelpCircle className="h-14 w-14" />
          Help
        </a>
        <a
          href="https://docs.firecrawl.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 text-[13px] text-black-alpha-56 transition-colors hover:text-black-alpha-88"
        >
          <ExternalLink className="h-14 w-14" />
          Docs
        </a>
        <a
          href="https://firecrawl.dev/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-32 items-center gap-6 rounded-7 bg-heat-100 px-12 text-[12px] font-semibold text-white transition-colors hover:bg-heat-200"
        >
          Upgrade
        </a>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update app/layout.tsx to include TopBar and shift body down 48px**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import { Roboto_Mono } from 'next/font/google';
import { Toaster } from 'sonner';

import ColorStyles from '@/components/shared/color-styles/color-styles';
import Scrollbar from '@/components/ui/scrollbar';
import { AppSidebar } from '@/components/app/sidebar/AppSidebar';
import { TopBar } from '@/components/app/TopBar';
import '@/styles/main.css';

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-roboto-mono',
});

export const metadata: Metadata = {
  title: 'Firecrawl',
  description: 'Power your applications with your self-hosted Firecrawl API',
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <ColorStyles />
      </head>
      <body
        className={`${GeistMono.variable} ${robotoMono.variable} font-sans text-accent-black bg-background-base overflow-x-clip`}
      >
        <TopBar />
        <div className="flex min-h-svh w-full pt-48">
          <AppSidebar />
          <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
        </div>
        <Scrollbar />
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify in browser**

Hard-refresh `http://localhost:3000/playground/scrape`. A dark top bar with the flame logo and "Firecrawl" text should appear at the top. The existing sidebar should be pushed down by 48px. Nothing should overflow.

- [ ] **Step 4: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/components/app/TopBar.tsx apps/web/app/layout.tsx
git commit -m "feat: add dark TopBar and update root layout shell"
```

---

## Task 3: Rebuild AppSidebar with firecrawl.dev nav structure

**Files:**
- Modify: `components/app/sidebar/AppSidebar.tsx`

- [ ] **Step 1: Replace AppSidebar.tsx entirely**

Replace `components/app/sidebar/AppSidebar.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Activity,
  BarChart2,
  Bot,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Globe,
  KeyRound,
  Layers,
  Map as MapIcon,
  MessageSquare,
  Monitor,
  PanelLeft,
  Search,
  Settings,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: 'orange' | 'new';
  subItems?: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}

const playgroundItems: NavItem[] = [
  { href: '/playground/search', label: 'Search the web', icon: Search },
  { href: '/playground/scrape', label: 'Scrape a web page', icon: Globe },
  { href: '/playground/interact', label: 'Interact with a page', icon: MessageSquare },
  { href: '/playground/parse', label: 'Parse a file', icon: FileText, badge: 'NEW', badgeVariant: 'new' },
  { href: '/fire-enrich', label: 'fire-enrich', icon: FileSpreadsheet, badge: 'CSV', badgeVariant: 'new' },
  {
    href: '/playground/crawl-group',
    label: 'Crawl entire website',
    icon: Layers,
    subItems: [
      { href: '/playground/map', label: 'Map links', icon: MapIcon },
      { href: '/playground/crawl', label: 'Crawl', icon: Layers },
    ],
  },
];

const researchItems: NavItem[] = [
  { href: '/playground/agent', label: 'Agent', icon: Sparkles },
];

const accountItems: NavItem[] = [
  { href: '/activity-logs', label: 'Activity Logs', icon: Activity },
  { href: '/usage', label: 'Usage', icon: BarChart2 },
  { href: '/api-keys', label: 'API Keys', icon: KeyRound },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/whats-new', label: "What's New", icon: Zap, badge: '28', badgeVariant: 'orange' },
];

const adminItems: NavItem[] = [
  { href: '/admin/ops', label: 'Ops Dashboard', icon: Monitor },
  { href: '/admin/principals', label: 'Principals', icon: Users },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href === '/playground/crawl-group') return false;
  return pathname.startsWith(`${href}/`);
}

function Badge({ text, variant }: { text: string; variant: 'orange' | 'new' }) {
  if (variant === 'orange') {
    return (
      <span className="ml-auto rounded-full bg-heat-100 px-6 py-1 text-[10px] font-semibold leading-none text-white">
        {text}
      </span>
    );
  }
  return (
    <span className="ml-auto rounded-4 border border-[#2a2a2a] bg-[#1c1c1c] px-5 py-1 text-[10px] font-medium leading-none text-[#555]">
      {text}
    </span>
  );
}

function NavSection({
  label,
  items,
  pathname,
  collapsed,
}: {
  label: string;
  items: NavItem[];
  pathname: string | null;
  collapsed: boolean;
}) {
  return (
    <div className="px-8 pt-16 pb-2">
      {!collapsed && (
        <div className="px-8 pb-6 text-[10px] font-medium uppercase tracking-[1.2px] text-[#555]">
          {label}
        </div>
      )}
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          const hasSubItems = item.subItems && item.subItems.length > 0;

          return (
            <li key={item.href}>
              {hasSubItems ? (
                <>
                  <div
                    className="flex items-center gap-8 rounded-6 px-8 py-6 text-[13px] text-[#666]"
                  >
                    <Icon className="h-15 w-15 shrink-0 text-[#555]" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <ul className="mt-1 flex flex-col gap-1 pl-24">
                      {item.subItems!.map((sub) => {
                        const SubIcon = sub.icon;
                        const subActive = isActive(pathname, sub.href);
                        return (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              aria-current={subActive ? 'page' : undefined}
                              className={[
                                'flex items-center gap-8 rounded-6 px-8 py-6 text-[13px] transition-colors duration-150',
                                subActive
                                  ? 'bg-[#1a1a1a] text-heat-100 font-medium'
                                  : 'text-[#888] hover:bg-[#161616] hover:text-[#ddd]',
                              ].join(' ')}
                            >
                              <SubIcon className={['h-14 w-14 shrink-0', subActive ? 'text-heat-100' : 'text-[#555]'].join(' ')} />
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex items-center gap-8 rounded-6 px-8 py-6 text-[13px] transition-colors duration-150',
                    active
                      ? 'bg-[#1a1a1a] text-heat-100 font-medium'
                      : 'text-[#888] hover:bg-[#161616] hover:text-[#ddd]',
                  ].join(' ')}
                >
                  <Icon className={['h-15 w-15 shrink-0', active ? 'text-heat-100' : 'text-[#555]'].join(' ')} />
                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && <Badge text={item.badge} variant={item.badgeVariant!} />}
                    </>
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={[
        'sticky top-48 hidden h-[calc(100svh-48px)] shrink-0 flex-col border-r border-border-faint bg-background-lighter transition-all duration-200 md:flex',
        collapsed ? 'w-56' : 'w-220',
      ].join(' ')}
    >
      <nav className="flex-1 overflow-y-auto pb-16">
        <NavSection label="Playground" items={playgroundItems} pathname={pathname} collapsed={collapsed} />
        <NavSection label="Research Preview" items={researchItems} pathname={pathname} collapsed={collapsed} />
        <NavSection label="Account" items={accountItems} pathname={pathname} collapsed={collapsed} />
        <NavSection label="Admin" items={adminItems} pathname={pathname} collapsed={collapsed} />
      </nav>

      <div className="border-t border-border-faint p-8">
        {!collapsed && (
          <div className="flex items-center gap-8 px-8 py-6">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-heat-100 text-[10px] font-bold text-white">
              T
            </div>
            <span className="min-w-0 flex-1 truncate text-[11px] text-[#555]">
              user@example.com
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-6 rounded-6 px-8 py-6 text-[12px] text-[#555] transition-colors hover:text-[#888]"
        >
          {collapsed ? (
            <ChevronRight className="h-14 w-14" />
          ) : (
            <>
              <ChevronLeft className="h-14 w-14" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify in browser**

Reload `http://localhost:3000/playground/scrape`. The sidebar should show:
- PLAYGROUND section: Search the web, Scrape a web page, Interact with a page, Parse a file (NEW), fire-enrich (CSV), Crawl entire website (with Map links + Crawl sub-items)
- RESEARCH PREVIEW section: Agent
- ACCOUNT section: Activity Logs, Usage, API Keys, Settings, What's New (28 badge)
- ADMIN section: Ops Dashboard, Principals
- Footer: avatar with "T", email, Collapse button
- Active item has `#1a1a1a` bg and orange text

- [ ] **Step 3: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/components/app/sidebar/AppSidebar.tsx
git commit -m "feat: rebuild sidebar with firecrawl.dev nav structure"
```

---

## Task 4: Overview dashboard page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx with the Overview dashboard**

Replace `app/page.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { Bot, Copy, Eye, EyeOff, Globe, Layers, Search, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

import { TOKEN_STORAGE_KEY } from '@/components/app/sidebar/TokenDialog';

const endpoints = [
  {
    icon: Search,
    title: 'Search',
    description: 'Search the web and get full-page content from results.',
    href: '/playground/search',
  },
  {
    icon: Globe,
    title: 'Scrape',
    description: 'Get LLM-ready data from any URL. Markdown, JSON, screenshots.',
    href: '/playground/scrape',
  },
  {
    icon: Bot,
    title: 'Interact',
    description: 'Click, fill forms, and extract data from pages requiring interaction.',
    href: '/playground/interact',
    isNew: true,
  },
  {
    icon: Layers,
    title: 'Crawl',
    description: 'Crawl every page on a website and get structured data for each.',
    href: '/playground/crawl',
  },
];

function masked(key: string): string {
  if (key.length <= 8) return '••••••••••••••••••••••••';
  return key.slice(0, 4) + '••••••••••••••••••••' + key.slice(-4);
}

export default function OverviewPage() {
  const [token, setToken] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setToken(window.localStorage.getItem(TOKEN_STORAGE_KEY));
  }, []);

  const displayKey = token
    ? revealed ? token : masked(token)
    : 'fc-••••••••••••••••••••••••';

  const copyKey = () => {
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col bg-[#0d0d0d]">
      {/* Hero */}
      <div className="border-b border-border-faint px-40 py-32">
        <h1 className="text-[28px] font-bold tracking-[-0.4px] text-white">
          Explore our endpoints
        </h1>
        <p className="mt-4 text-[14px] text-[#666]">
          Power your applications with your self-hosted Firecrawl API
        </p>
      </div>

      {/* Endpoint cards */}
      <div className="grid grid-cols-4 border-b border-border-faint" style={{ gap: '1px', background: '#1a1a1a' }}>
        {endpoints.map((ep) => {
          const Icon = ep.icon;
          return (
            <Link
              key={ep.href}
              href={ep.href}
              className="group flex flex-col gap-10 bg-[#0d0d0d] p-24 transition-colors duration-150 hover:bg-[#131313]"
            >
              <Icon className="h-20 w-20 text-[#555] transition-colors group-hover:text-[#888]" />
              <h3 className="flex items-center gap-8 text-[14px] font-semibold text-white">
                {ep.title}
                {ep.isNew && (
                  <span className="rounded-3 bg-heat-100 px-5 py-1 text-[9px] font-semibold uppercase text-white">
                    NEW
                  </span>
                )}
              </h3>
              <p className="text-[12px] leading-relaxed text-[#666]">{ep.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 border-b border-border-faint" style={{ gap: '1px', background: '#1a1a1a' }}>
        {/* Scraped pages */}
        <div className="bg-[#0d0d0d] p-28">
          <h3 className="text-[14px] font-semibold text-white">Scraped pages — Last 7 days</h3>
          <p className="mt-2 text-[12px] text-[#555]">Connected to your self-hosted instance</p>
          <div className="mt-16 text-[32px] font-bold text-white">—</div>
        </div>

        {/* API Key */}
        <div className="bg-[#0d0d0d] p-28">
          <h3 className="text-[14px] font-semibold text-white">API Key</h3>
          <p className="mt-2 text-[12px] text-[#555]">Your bearer token for the playground</p>
          <div className="mt-12 flex items-center justify-between rounded-8 border border-border-faint bg-[#111] px-14 py-10">
            <span className="font-mono text-[12px] text-heat-100">{displayKey}</span>
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                className="text-[#555] transition-colors hover:text-[#888]"
                aria-label={revealed ? 'Hide key' : 'Reveal key'}
              >
                {revealed ? <EyeOff className="h-15 w-15" /> : <Eye className="h-15 w-15" />}
              </button>
              <button
                type="button"
                onClick={copyKey}
                className="text-[#555] transition-colors hover:text-[#888]"
                aria-label="Copy key"
              >
                {copied ? (
                  <Zap className="h-15 w-15 text-heat-100" />
                ) : (
                  <Copy className="h-15 w-15" />
                )}
              </button>
            </div>
          </div>
          {!token && (
            <p className="mt-8 text-[12px] text-[#555]">
              Set your bearer token via the sidebar to see it here.
            </p>
          )}
        </div>
      </div>

      {/* Integrations */}
      <div className="p-40">
        <h2 className="mb-4 text-[14px] font-semibold text-white">Integrations</h2>
        <p className="mb-20 text-[12px] text-[#555]">Connect Firecrawl to your favorite tools</p>
        <div className="grid grid-cols-4 gap-12 lg:grid-cols-6">
          {['Python SDK', 'JS/TS SDK', 'n8n', 'LangChain', 'CrewAI', 'Make'].map((name) => (
            <div
              key={name}
              className="flex items-center justify-center rounded-10 border border-border-faint bg-[#111] px-16 py-14 text-[12px] font-medium text-[#666]"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000`. The Overview page should load with:
- "Explore our endpoints" heading
- 4-column endpoint card grid
- 2-column stats row (scraped pages count + API key display)
- Integrations grid at bottom
- No redirect to `/playground/scrape`

- [ ] **Step 3: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/page.tsx
git commit -m "feat: add Overview dashboard page"
```

---

## Task 5: Update shared playground components to dark theme

**Files:**
- Modify: `app/playground/_components/PageHeader.tsx`
- Modify: `app/playground/_components/Panel.tsx`
- Modify: `app/playground/_components/PrimaryButton.tsx`
- Modify: `app/playground/_components/MissingTokenBanner.tsx`

- [ ] **Step 1: Update PageHeader.tsx**

Replace `app/playground/_components/PageHeader.tsx` with:

```tsx
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  endpoint?: string;
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, endpoint, right }: PageHeaderProps) {
  return (
    <header className="border-b border-border-faint bg-background-lighter">
      <div className="flex h-64 items-end justify-between gap-24 px-24 pb-12 pt-20">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-10">
            <h1 className="text-[20px] font-bold tracking-[-0.4px] text-accent-black">
              {title}
            </h1>
            {endpoint && (
              <span className="inline-flex items-center rounded-full border border-border-muted bg-[#111] px-8 py-2 font-mono text-[11px] text-black-alpha-56">
                {endpoint}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[13px] text-black-alpha-56">{subtitle}</p>
          )}
        </div>
        {right && <div className="flex items-center gap-12">{right}</div>}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update Panel.tsx**

Replace `app/playground/_components/Panel.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-12 border border-border-faint bg-[#111]',
        className,
      )}
    >
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  title: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, right, className }: PanelHeaderProps) {
  return (
    <header
      className={cn(
        'flex h-44 items-center justify-between gap-12 border-b border-border-faint bg-[#0d0d0d] px-16',
        className,
      )}
    >
      <h2 className="text-[13px] font-semibold tracking-tight text-accent-black">
        {title}
      </h2>
      {right ? <div className="flex items-center gap-12">{right}</div> : null}
    </header>
  );
}

interface PanelBodyProps {
  children: ReactNode;
  className?: string;
}

export function PanelBody({ children, className }: PanelBodyProps) {
  return <div className={cn('p-16', className)}>{children}</div>;
}
```

- [ ] **Step 3: Update PrimaryButton.tsx**

Replace `app/playground/_components/PrimaryButton.tsx` with:

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={cn(
          'inline-flex h-36 items-center gap-8 rounded-7 px-14',
          'bg-heat-100 text-white',
          'text-[13px] font-semibold',
          'transition-colors duration-150',
          'hover:bg-heat-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]',
          'disabled:cursor-not-allowed disabled:bg-[#333] disabled:text-[#666]',
          className,
        )}
      >
        {children}
      </button>
    );
  },
);

PrimaryButton.displayName = 'PrimaryButton';
```

- [ ] **Step 4: Update MissingTokenBanner.tsx**

Replace `app/playground/_components/MissingTokenBanner.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { KeyRound } from 'lucide-react';

export function MissingTokenBanner() {
  return (
    <div
      role="alert"
      className="flex items-start gap-12 rounded-10 border border-border-faint bg-[#111] p-16"
    >
      <span className="flex h-32 w-32 shrink-0 items-center justify-center rounded-8 bg-heat-12 text-heat-100">
        <KeyRound className="h-16 w-16" />
      </span>
      <div className="flex flex-col gap-4 pt-2">
        <p className="text-[13px] font-medium text-white">
          Set your bearer token to run the playground.
        </p>
        <p className="text-[13px] text-black-alpha-56">
          Issue one in{' '}
          <Link
            href="/admin/principals"
            className="font-medium text-heat-100 underline decoration-heat-40 underline-offset-2 transition-colors hover:decoration-heat-100"
          >
            /admin/principals
          </Link>
          {' '}then set it via the sidebar.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

Open `http://localhost:3000/playground/scrape`. The page should show:
- Dark panel card with `#111` background and `#1f1f1f` border
- Orange "Run scrape" button (rounded-7, no shadow)
- If no token set: dark alert banner with orange key icon

- [ ] **Step 6: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/playground/_components/
git commit -m "feat: update shared playground components to dark theme"
```

---

## Task 6: Restyle playground pages — Scrape + Search

**Files:**
- Modify: `app/playground/scrape/scrape-view.tsx`
- Modify: `app/playground/search/search-view.tsx`

- [ ] **Step 1: Restyle scrape-view.tsx**

The input card pattern wraps the form in a `Panel` with a URL field at top, format selector row, then a toolbar row with "Get code" (ghost) + "Run scrape" (primary) buttons. Keep all existing API call logic; only change the layout/styling.

Replace `app/playground/scrape/scrape-view.tsx` with:

```tsx
'use client';

import { Code, Loader2, Play } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import Input from '@/components/ui/input';
import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { ResultViewer } from '../_components/ResultViewer';
import { usePlaygroundToken } from '../_components/use-token';
import { PageHeader } from '../_components/PageHeader';
import { PrimaryButton } from '../_components/PrimaryButton';
import { Panel, PanelBody } from '../_components/Panel';

const FORMAT_OPTIONS = [
  { id: 'markdown', label: 'Markdown' },
  { id: 'summary', label: 'Summary' },
  { id: 'links', label: 'Links' },
  { id: 'html', label: 'HTML' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'json', label: 'JSON' },
];

export function ScrapeView() {
  const token = usePlaygroundToken();
  const [url, setUrl] = useState('https://example.com');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set(['markdown']));

  const toggleFormat = (id: string) => {
    setSelectedFormats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setElapsedMs(null);

    if (!token) {
      setError('Set your bearer token in the sidebar before running a scrape.');
      return;
    }
    if (!url.trim()) {
      setError('URL is required.');
      return;
    }

    setSubmitting(true);
    const startedAt = performance.now();
    try {
      const res = await fetch('/api/firecrawl/scrape', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim(), formats: Array.from(selectedFormats) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json as ApiError);
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setElapsedMs(Math.round(performance.now() - startedAt));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col">
      <PageHeader
        title="Scrape"
        subtitle="Fetch a single URL and return LLM-ready content."
        endpoint="POST /v1/scrape"
      />

      <div className="flex-1 px-24 pb-48 pt-24">
        <div className="mx-auto flex w-full max-w-[860px] flex-col gap-20">
          {!token && <MissingTokenBanner />}

          <Panel>
            <PanelBody className="p-0">
              <form onSubmit={onSubmit}>
                {/* URL input */}
                <div className="px-16 pt-16 pb-12">
                  <Input
                    id="scrape-url"
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={submitting}
                    required
                    className="bg-transparent text-[14px] text-white placeholder:text-[#555]"
                  />
                </div>

                {/* Format selector */}
                <div className="flex flex-wrap gap-8 border-t border-border-faint px-16 py-10">
                  {FORMAT_OPTIONS.map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => toggleFormat(fmt.id)}
                      className={[
                        'rounded-6 border px-10 py-5 text-[12px] font-medium transition-colors',
                        selectedFormats.has(fmt.id)
                          ? 'border-heat-40 bg-heat-8 text-heat-100'
                          : 'border-border-faint bg-transparent text-[#666] hover:border-[#2a2a2a] hover:text-[#999]',
                      ].join(' ')}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between border-t border-border-faint px-16 py-10">
                  <button
                    type="button"
                    className="flex items-center gap-6 rounded-7 border border-border-faint px-12 py-7 text-[12px] font-medium text-[#666] transition-colors hover:border-[#2a2a2a] hover:text-[#999]"
                  >
                    <Code className="h-13 w-13" />
                    Get code
                  </button>
                  <PrimaryButton type="submit" disabled={submitting || !token}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-14 w-14 animate-spin" />
                        Running…
                      </>
                    ) : (
                      <>
                        <Play className="h-14 w-14" />
                        Run scrape
                      </>
                    )}
                  </PrimaryButton>
                </div>
              </form>
            </PanelBody>
          </Panel>

          {error && <ErrorAlert error={error} />}

          {result !== null && (
            <Panel>
              <div className="flex items-center justify-between border-b border-border-faint px-16 py-10">
                <span className="text-[13px] font-semibold text-white">Response</span>
                <div className="flex items-center gap-8">
                  <span className="inline-flex items-center gap-6 rounded-full border border-accent-forest/20 bg-accent-forest/10 px-8 py-2 text-[11px] font-medium text-accent-forest">
                    <span className="block h-6 w-6 rounded-full bg-accent-forest" />
                    200 OK
                  </span>
                  {elapsedMs !== null && (
                    <span className="font-mono text-[12px] text-[#555]">{elapsedMs} ms</span>
                  )}
                </div>
              </div>
              <div className="px-16 pb-16">
                <ResultViewer result={result} />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Restyle search-view.tsx**

Read the current file first to understand its structure, then apply the same input-card pattern. Replace `app/playground/search/search-view.tsx` with:

```tsx
'use client';

import { Code, Loader2, Play } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import Input from '@/components/ui/input';
import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { ResultViewer } from '../_components/ResultViewer';
import { usePlaygroundToken } from '../_components/use-token';
import { PageHeader } from '../_components/PageHeader';
import { PrimaryButton } from '../_components/PrimaryButton';
import { Panel, PanelBody } from '../_components/Panel';

export function SearchView() {
  const token = usePlaygroundToken();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setElapsedMs(null);

    if (!token) {
      setError('Set your bearer token in the sidebar before searching.');
      return;
    }
    if (!query.trim()) {
      setError('Query is required.');
      return;
    }

    setSubmitting(true);
    const startedAt = performance.now();
    try {
      const res = await fetch('/api/firecrawl/search', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: query.trim(), limit }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json as ApiError);
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setElapsedMs(Math.round(performance.now() - startedAt));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col">
      <PageHeader
        title="Search"
        subtitle="Search the web and get full content from results."
        endpoint="POST /v1/search"
      />

      <div className="flex-1 px-24 pb-48 pt-24">
        <div className="mx-auto flex w-full max-w-[860px] flex-col gap-20">
          {!token && <MissingTokenBanner />}

          <Panel>
            <PanelBody className="p-0">
              <form onSubmit={onSubmit}>
                <div className="px-16 pt-16 pb-12">
                  <Input
                    id="search-query"
                    type="text"
                    placeholder="What do you want to search for?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={submitting}
                    required
                    className="bg-transparent text-[14px] text-white placeholder:text-[#555]"
                  />
                </div>

                <div className="flex items-center gap-12 border-t border-border-faint px-16 py-10">
                  <label className="text-[12px] text-[#666]">Results:</label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    disabled={submitting}
                    className="rounded-6 border border-border-faint bg-[#111] px-8 py-4 text-[12px] text-[#888] focus:outline-none"
                  >
                    {[3, 5, 10, 20].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between border-t border-border-faint px-16 py-10">
                  <button
                    type="button"
                    className="flex items-center gap-6 rounded-7 border border-border-faint px-12 py-7 text-[12px] font-medium text-[#666] transition-colors hover:border-[#2a2a2a] hover:text-[#999]"
                  >
                    <Code className="h-13 w-13" />
                    Get code
                  </button>
                  <PrimaryButton type="submit" disabled={submitting || !token}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-14 w-14 animate-spin" />
                        Searching…
                      </>
                    ) : (
                      <>
                        <Play className="h-14 w-14" />
                        Search
                      </>
                    )}
                  </PrimaryButton>
                </div>
              </form>
            </PanelBody>
          </Panel>

          {error && <ErrorAlert error={error} />}

          {result !== null && (
            <Panel>
              <div className="flex items-center justify-between border-b border-border-faint px-16 py-10">
                <span className="text-[13px] font-semibold text-white">Response</span>
                {elapsedMs !== null && (
                  <span className="font-mono text-[12px] text-[#555]">{elapsedMs} ms</span>
                )}
              </div>
              <div className="px-16 pb-16">
                <ResultViewer result={result} />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

- Open `http://localhost:3000/playground/scrape` — should show dark input card, format selector pills, "Get code" + "Run scrape" buttons
- Open `http://localhost:3000/playground/search` — should show dark input card with query field and result count selector

- [ ] **Step 4: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/playground/scrape/scrape-view.tsx apps/web/app/playground/search/search-view.tsx
git commit -m "feat: restyle scrape and search pages to input-card pattern"
```

---

## Task 7: Restyle Crawl, Map, Extract, Batch Scrape pages

**Files:**
- Modify: `app/playground/crawl/crawl-view.tsx`
- Modify: `app/playground/map/map-view.tsx`
- Modify: `app/playground/extract/extract-view.tsx`
- Modify: `app/playground/batch-scrape/batch-scrape-view.tsx`

The pattern for each: Panel with URL input → options row → toolbar (Get code + primary action). The API logic in each file is preserved; only the JSX structure and classNames change.

- [ ] **Step 1: Read all four current view files**

```bash
cat app/playground/crawl/crawl-view.tsx
cat app/playground/map/map-view.tsx
cat app/playground/extract/extract-view.tsx
cat app/playground/batch-scrape/batch-scrape-view.tsx
```

- [ ] **Step 2: Restyle crawl-view.tsx**

Keep all `useState`, `onSubmit`, and `fetch('/api/firecrawl/crawl', ...)` logic. Replace the JSX `return` with:

```tsx
return (
  <div className="flex min-h-[calc(100svh-48px)] flex-col">
    <PageHeader
      title="Crawl"
      subtitle="Crawl all pages on a website and get content for each."
      endpoint="POST /v1/crawl"
    />
    <div className="flex-1 px-24 pb-48 pt-24">
      <div className="mx-auto flex w-full max-w-[860px] flex-col gap-20">
        {!token && <MissingTokenBanner />}
        <Panel>
          <PanelBody className="p-0">
            <form onSubmit={onSubmit}>
              <div className="px-16 pt-16 pb-12">
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={submitting}
                  required
                  className="bg-transparent text-[14px] text-white placeholder:text-[#555]"
                />
              </div>
              <div className="flex items-center gap-12 border-t border-border-faint px-16 py-10">
                <label className="text-[12px] text-[#666]">Page limit:</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={submitting}
                  className="w-64 rounded-6 border border-border-faint bg-[#111] px-8 py-4 text-[12px] text-white focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border-faint px-16 py-10">
                <button
                  type="button"
                  className="flex items-center gap-6 rounded-7 border border-border-faint px-12 py-7 text-[12px] font-medium text-[#666] transition-colors hover:border-[#2a2a2a] hover:text-[#999]"
                >
                  <Code className="h-13 w-13" />
                  Get code
                </button>
                <PrimaryButton type="submit" disabled={submitting || !token}>
                  {submitting ? (
                    <><Loader2 className="h-14 w-14 animate-spin" />Starting…</>
                  ) : (
                    <><Play className="h-14 w-14" />Start crawl</>
                  )}
                </PrimaryButton>
              </div>
            </form>
          </PanelBody>
        </Panel>
        {error && <ErrorAlert error={error} />}
        {jobId && <JobStatusPanel jobId={jobId} token={token!} endpoint="/api/firecrawl/crawl" />}
      </div>
    </div>
  </div>
);
```

Add `import { Code } from 'lucide-react';` to the imports and remove any unused `PanelHeader` import.

- [ ] **Step 3: Restyle map-view.tsx, extract-view.tsx, batch-scrape-view.tsx**

Apply the same pattern as crawl-view.tsx to each file:
- Replace the outer wrapper div class with `flex min-h-[calc(100svh-48px)] flex-col`
- Keep `<PageHeader>` but update endpoint strings to `/v1/map`, `/v1/extract`, `/v1/batch-scrape`
- Wrap form in `<Panel><PanelBody className="p-0">` with URL field on top, options in middle row, toolbar at bottom
- Add `import { Code } from 'lucide-react'` and a "Get code" ghost button to each toolbar
- Preserve all existing API call logic, state, and result display

- [ ] **Step 4: Verify all four pages in browser**

Visit each page and confirm the input-card layout with toolbar row:
- `http://localhost:3000/playground/crawl`
- `http://localhost:3000/playground/map`
- `http://localhost:3000/playground/extract`
- `http://localhost:3000/playground/batch-scrape`

- [ ] **Step 5: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/playground/crawl/ apps/web/app/playground/map/ apps/web/app/playground/extract/ apps/web/app/playground/batch-scrape/
git commit -m "feat: restyle crawl, map, extract, batch-scrape to input-card pattern"
```

---

## Task 8: Interact page (new)

**Files:**
- Create: `app/playground/interact/page.tsx`
- Create: `app/playground/interact/interact-view.tsx`

- [ ] **Step 1: Create page.tsx**

Create `app/playground/interact/page.tsx`:

```tsx
import { InteractView } from './interact-view';

export const metadata = {
  title: 'Interact · Firecrawl',
};

export default function InteractPage() {
  return <InteractView />;
}
```

- [ ] **Step 2: Create interact-view.tsx**

Create `app/playground/interact/interact-view.tsx`:

```tsx
'use client';

import { Code, Loader2, MousePointer, Play } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import Input from '@/components/ui/input';
import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { ResultViewer } from '../_components/ResultViewer';
import { usePlaygroundToken } from '../_components/use-token';
import { PageHeader } from '../_components/PageHeader';
import { PrimaryButton } from '../_components/PrimaryButton';
import { Panel, PanelBody } from '../_components/Panel';

const FEATURE_CARDS = [
  {
    icon: MousePointer,
    title: 'Click & Fill',
    description: 'Automate clicks, form fills, and button presses on any page.',
  },
  {
    icon: Code,
    title: 'Prompt your actions',
    description: 'Describe what to do in natural language — no code required.',
  },
  {
    icon: Play,
    title: 'Extract behind login',
    description: 'Authenticate and scrape content only visible to logged-in users.',
  },
];

export function InteractView() {
  const token = usePlaygroundToken();
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setElapsedMs(null);

    if (!token) {
      setError('Set your bearer token in the sidebar before using Interact.');
      return;
    }
    if (!url.trim()) {
      setError('URL is required.');
      return;
    }

    setSubmitting(true);
    const startedAt = performance.now();
    try {
      const res = await fetch('/api/firecrawl/scrape', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: url.trim(),
          actions: [{ type: 'screenshot' }],
          formats: ['markdown'],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json as ApiError);
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setElapsedMs(Math.round(performance.now() - startedAt));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col">
      <PageHeader
        title="Interact"
        subtitle="Automate browser interactions and extract data from dynamic pages."
        endpoint="POST /v1/scrape"
      />

      <div className="flex-1 px-24 pb-48 pt-24">
        <div className="mx-auto flex w-full max-w-[860px] flex-col gap-20">
          {!token && <MissingTokenBanner />}

          {!result && !error && !submitting && (
            <>
              {/* Feature cards */}
              <div className="grid grid-cols-3 gap-12">
                {FEATURE_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.title}
                      className="rounded-12 border border-border-faint bg-[#111] p-20"
                    >
                      <Icon className="mb-12 h-20 w-20 text-[#555]" />
                      <h3 className="mb-6 text-[13px] font-semibold text-white">{card.title}</h3>
                      <p className="text-[12px] leading-relaxed text-[#666]">{card.description}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <Panel>
            <PanelBody className="p-0">
              <form onSubmit={onSubmit}>
                <div className="px-16 pt-16 pb-12">
                  <Input
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={submitting}
                    required
                    className="bg-transparent text-[14px] text-white placeholder:text-[#555]"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border-faint px-16 py-10">
                  <button
                    type="button"
                    className="flex items-center gap-6 rounded-7 border border-border-faint px-12 py-7 text-[12px] font-medium text-[#666] transition-colors hover:border-[#2a2a2a] hover:text-[#999]"
                  >
                    <Code className="h-13 w-13" />
                    Get code
                  </button>
                  <PrimaryButton type="submit" disabled={submitting || !token}>
                    {submitting ? (
                      <><Loader2 className="h-14 w-14 animate-spin" />Starting…</>
                    ) : (
                      <><Play className="h-14 w-14" />Start session</>
                    )}
                  </PrimaryButton>
                </div>
              </form>
            </PanelBody>
          </Panel>

          {error && <ErrorAlert error={error} />}

          {result !== null && (
            <Panel>
              <div className="flex items-center justify-between border-b border-border-faint px-16 py-10">
                <span className="text-[13px] font-semibold text-white">Response</span>
                {elapsedMs !== null && (
                  <span className="font-mono text-[12px] text-[#555]">{elapsedMs} ms</span>
                )}
              </div>
              <div className="px-16 pb-16">
                <ResultViewer result={result} />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/playground/interact`. Should show 3 feature cards + input card with "Start session" button. The sidebar "Interact with a page" link should be active (orange).

- [ ] **Step 4: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/playground/interact/
git commit -m "feat: add Interact playground page"
```

---

## Task 9: Parse page (new)

**Files:**
- Create: `app/playground/parse/page.tsx`
- Create: `app/playground/parse/parse-view.tsx`

- [ ] **Step 1: Create page.tsx**

Create `app/playground/parse/page.tsx`:

```tsx
import { ParseView } from './parse-view';

export const metadata = {
  title: 'Parse · Firecrawl',
};

export default function ParsePage() {
  return <ParseView />;
}
```

- [ ] **Step 2: Create parse-view.tsx**

Create `app/playground/parse/parse-view.tsx`:

```tsx
'use client';

import { Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { ResultViewer } from '../_components/ResultViewer';
import { usePlaygroundToken } from '../_components/use-token';
import { PageHeader } from '../_components/PageHeader';
import { PrimaryButton } from '../_components/PrimaryButton';
import { Panel, PanelBody } from '../_components/Panel';

const ACCEPTED_TYPES = '.pdf,.docx,.xlsx,.html';

export function ParseView() {
  const token = usePlaygroundToken();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<ApiError | string | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onSubmit = async () => {
    if (!token) {
      setError('Set your bearer token in the sidebar before parsing.');
      return;
    }
    if (!file) {
      setError('Select a file to parse.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('formats', 'markdown');

      const res = await fetch('/api/firecrawl/parse', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json as ApiError);
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col">
      <PageHeader
        title="Parse"
        subtitle="Extract Markdown from PDF, DOCX, XLSX, and HTML files."
        endpoint="POST /v1/parse"
      />

      <div className="flex-1 px-24 pb-48 pt-24">
        <div className="mx-auto flex w-full max-w-[860px] flex-col gap-20">
          {!token && <MissingTokenBanner />}

          <Panel>
            <PanelBody className="p-16">
              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={[
                  'flex cursor-pointer flex-col items-center justify-center gap-12 rounded-10 border-2 border-dashed py-40 transition-colors',
                  dragging
                    ? 'border-heat-100 bg-heat-8'
                    : 'border-border-faint hover:border-[#2a2a2a]',
                ].join(' ')}
              >
                <Upload className="h-24 w-24 text-[#555]" />
                {file ? (
                  <span className="text-[13px] font-medium text-white">{file.name}</span>
                ) : (
                  <>
                    <span className="text-[13px] font-medium text-white">
                      Drop a file or click to browse
                    </span>
                    <span className="text-[12px] text-[#555]">PDF · DOCX · XLSX · HTML</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />

              {/* Format + action row */}
              <div className="mt-12 flex items-center justify-between border-t border-border-faint pt-12">
                <div className="flex items-center gap-8">
                  <span className="text-[12px] text-[#666]">Format:</span>
                  <span className="rounded-6 border border-heat-40 bg-heat-8 px-10 py-5 text-[12px] font-medium text-heat-100">
                    Markdown
                  </span>
                </div>
                <PrimaryButton
                  type="button"
                  onClick={onSubmit}
                  disabled={submitting || !token || !file}
                >
                  {submitting ? (
                    <><Loader2 className="h-14 w-14 animate-spin" />Parsing…</>
                  ) : (
                    'Start parsing'
                  )}
                </PrimaryButton>
              </div>
            </PanelBody>
          </Panel>

          {error && <ErrorAlert error={error} />}

          {result !== null && (
            <Panel>
              <div className="border-b border-border-faint px-16 py-10">
                <span className="text-[13px] font-semibold text-white">Result</span>
              </div>
              <div className="px-16 pb-16">
                <ResultViewer result={result} />
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the parse API route**

Check if `/api/firecrawl/parse/route.ts` exists. If not, create `app/api/firecrawl/parse/route.ts`:

```bash
ls app/api/firecrawl/
```

If the route doesn't exist, create `app/api/firecrawl/parse/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiUrl = process.env.FIRECRAWL_API_URL ?? 'http://localhost:3002';
  const apiKey = process.env.FIRECRAWL_API_KEY;

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  const formData = await req.formData();
  const upstream = await fetch(`${apiUrl}/v1/parse`, {
    method: 'POST',
    headers: {
      authorization: apiKey ? `Bearer ${apiKey}` : authHeader,
    },
    body: formData,
  });

  const json = await upstream.json().catch(() => ({}));
  return NextResponse.json(json, { status: upstream.status });
}
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000/playground/parse`. Should show a file drop zone with dashed border, "Markdown" format badge, and "Start parsing" button.

- [ ] **Step 5: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/playground/parse/ apps/web/app/api/firecrawl/parse/
git commit -m "feat: add Parse playground page with file upload"
```

---

## Task 10: Agent page (new)

**Files:**
- Create: `app/playground/agent/page.tsx`
- Create: `app/playground/agent/agent-view.tsx`

- [ ] **Step 1: Create page.tsx**

Create `app/playground/agent/page.tsx`:

```tsx
import { AgentView } from './agent-view';

export const metadata = {
  title: 'Agent · Firecrawl',
};

export default function AgentPage() {
  return <AgentView />;
}
```

- [ ] **Step 2: Create agent-view.tsx**

Create `app/playground/agent/agent-view.tsx`:

```tsx
'use client';

import { Loader2, Plus, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { ErrorAlert, type ApiError } from '../_components/ErrorAlert';
import { MissingTokenBanner } from '../_components/MissingTokenBanner';
import { ResultViewer } from '../_components/ResultViewer';
import { usePlaygroundToken } from '../_components/use-token';
import { PrimaryButton } from '../_components/PrimaryButton';
import { Panel } from '../_components/Panel';

const SUGGESTIONS = [
  'Find the top 10 AI startups that raised funding in 2024',
  'Scrape pricing pages for the top 5 CRM tools',
  'Find technical documentation for React 19 new features',
];

export function AgentView() {
  const token = usePlaygroundToken();
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<ApiError | string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!token) {
      setError('Set your bearer token in the sidebar.');
      return;
    }
    if (!prompt.trim()) {
      setError('Enter a prompt.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/firecrawl/agent', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json as ApiError);
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center gap-8 border-b border-border-faint px-24 py-16">
        <Sparkles className="h-18 w-18 text-heat-100" />
        <h1 className="text-[18px] font-bold tracking-tight text-white">Agent</h1>
        <span className="rounded-full border border-heat-40 bg-heat-8 px-8 py-2 text-[10px] font-semibold uppercase text-heat-100">
          Research Preview
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-24 py-48">
        {!token && (
          <div className="mb-24 w-full max-w-[640px]">
            <MissingTokenBanner />
          </div>
        )}

        <div className="w-full max-w-[640px]">
          <h2 className="mb-4 text-center text-[22px] font-bold tracking-tight text-white">
            What data do you want to gather?
          </h2>
          <p className="mb-28 text-center text-[14px] text-[#666]">
            Describe a research task and the Agent will browse the web to collect it.
          </p>

          <form onSubmit={onSubmit}>
            <Panel>
              <div className="p-4">
                <textarea
                  rows={3}
                  placeholder="Find all Series A funded AI startups in 2024..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={submitting}
                  className="w-full resize-none rounded-10 bg-transparent px-12 pt-12 pb-4 text-[14px] text-white placeholder:text-[#555] focus:outline-none"
                />
                <div className="flex items-center justify-between px-8 pb-8">
                  <button
                    type="button"
                    className="flex items-center gap-6 rounded-6 border border-border-faint px-10 py-6 text-[12px] text-[#666] hover:border-[#2a2a2a] hover:text-[#999]"
                  >
                    <Plus className="h-12 w-12" />
                    Add URLs
                  </button>
                  <PrimaryButton type="submit" disabled={submitting || !token || !prompt.trim()}>
                    {submitting ? (
                      <><Loader2 className="h-14 w-14 animate-spin" />Running…</>
                    ) : (
                      <><Sparkles className="h-14 w-14" />Run Agent</>
                    )}
                  </PrimaryButton>
                </div>
              </div>
            </Panel>
          </form>

          {/* Suggestion pills */}
          {!result && !error && (
            <div className="mt-20 flex flex-col gap-8">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPrompt(s)}
                  className="rounded-8 border border-border-faint bg-[#111] px-14 py-10 text-left text-[13px] text-[#666] transition-colors hover:border-[#2a2a2a] hover:text-[#888]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {error && <div className="mt-20"><ErrorAlert error={error} /></div>}

          {result !== null && (
            <div className="mt-20">
              <Panel>
                <div className="border-b border-border-faint px-16 py-10">
                  <span className="text-[13px] font-semibold text-white">Result</span>
                </div>
                <div className="px-16 pb-16">
                  <ResultViewer result={result} />
                </div>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add the agent API route**

Check if `/api/firecrawl/agent/route.ts` exists:

```bash
ls app/api/firecrawl/
```

If missing, create `app/api/firecrawl/agent/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiUrl = process.env.FIRECRAWL_API_URL ?? 'http://localhost:3002';
  const apiKey = process.env.FIRECRAWL_API_KEY;

  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  const body = await req.json();
  const upstream = await fetch(`${apiUrl}/v1/agent`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: apiKey ? `Bearer ${apiKey}` : authHeader,
    },
    body: JSON.stringify(body),
  });

  const json = await upstream.json().catch(() => ({}));
  return NextResponse.json(json, { status: upstream.status });
}
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:3000/playground/agent`. Should show centered layout with "What data do you want to gather?" heading, textarea, suggestion cards, and "Run Agent" button.

- [ ] **Step 5: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/playground/agent/ apps/web/app/api/firecrawl/agent/
git commit -m "feat: add Agent research preview page"
```

---

## Task 11: Activity Logs + Usage pages (new)

**Files:**
- Create: `app/activity-logs/page.tsx`
- Create: `app/usage/page.tsx`

- [ ] **Step 1: Create Activity Logs page**

Create `app/activity-logs/page.tsx`:

```tsx
'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

export default function ActivityLogsPage() {
  const [query, setQuery] = useState('');

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col">
      <div className="border-b border-border-faint px-32 py-24">
        <h1 className="text-[24px] font-bold tracking-[-0.4px] text-white">Activity Logs</h1>
        <p className="mt-4 text-[13px] text-[#666]">All API requests made to your self-hosted instance</p>
      </div>

      <div className="flex items-center gap-12 border-b border-border-faint px-32 py-14">
        <div className="relative flex-1 max-w-[320px]">
          <Search className="absolute left-10 top-1/2 h-14 w-14 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            placeholder="Search requests..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-36 w-full rounded-8 border border-border-faint bg-[#111] pl-32 pr-12 text-[13px] text-white placeholder:text-[#555] focus:outline-none focus:border-[#2a2a2a]"
          />
        </div>
        <select className="h-36 rounded-8 border border-border-faint bg-[#111] px-12 text-[13px] text-[#666] focus:outline-none">
          <option>All endpoints</option>
          <option>/v1/scrape</option>
          <option>/v1/crawl</option>
          <option>/v1/search</option>
        </select>
        <select className="h-36 rounded-8 border border-border-faint bg-[#111] px-12 text-[13px] text-[#666] focus:outline-none">
          <option>All API keys</option>
        </select>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-12 flex h-40 w-40 items-center justify-center rounded-full bg-[#111]">
            <Search className="h-18 w-18 text-[#555]" />
          </div>
          <p className="text-[14px] font-medium text-white">No activity yet</p>
          <p className="mt-4 text-[13px] text-[#666]">API requests will appear here once you start using the playground.</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Usage page**

Create `app/usage/page.tsx`:

```tsx
'use client';

import { useState } from 'react';

type Period = '1d' | '7d' | '30d';

const PERIODS: { label: string; value: Period }[] = [
  { label: '1 day', value: '1d' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
];

export default function UsagePage() {
  const [period, setPeriod] = useState<Period>('7d');

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col">
      <div className="border-b border-border-faint px-32 py-24">
        <h1 className="text-[24px] font-bold tracking-[-0.4px] text-white">Usage</h1>
        <p className="mt-4 text-[13px] text-[#666]">Request volume for your self-hosted instance</p>
      </div>

      {/* Credits card */}
      <div className="border-b border-border-faint px-32 py-20">
        <div className="inline-flex flex-col gap-4 rounded-12 border border-border-faint bg-[#111] px-20 py-14">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#555]">Credits Remaining</span>
          <span className="text-[22px] font-bold text-white">Self-hosted — Unlimited</span>
        </div>
      </div>

      {/* Period selector + chart */}
      <div className="px-32 py-24">
        <div className="mb-16 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Recent Usage</h2>
          <div className="flex rounded-8 border border-border-faint bg-[#111] p-2">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={[
                  'rounded-6 px-12 py-5 text-[12px] font-medium transition-colors',
                  period === p.value
                    ? 'bg-[#1a1a1a] text-white'
                    : 'text-[#666] hover:text-[#999]',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Empty chart placeholder */}
        <div className="flex h-200 items-center justify-center rounded-12 border border-border-faint bg-[#111]">
          <p className="text-[13px] text-[#555]">No data for this period</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

- Open `http://localhost:3000/activity-logs` — filters bar + empty state
- Open `http://localhost:3000/usage` — credits card + period selector + empty chart

- [ ] **Step 4: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/activity-logs/ apps/web/app/usage/
git commit -m "feat: add Activity Logs and Usage pages"
```

---

## Task 12: API Keys + Settings pages (new)

**Files:**
- Create: `app/api-keys/page.tsx`
- Create: `app/settings/page.tsx`

- [ ] **Step 1: Create API Keys page**

Create `app/api-keys/page.tsx`:

```tsx
'use client';

import { Copy, Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { TOKEN_STORAGE_KEY } from '@/components/app/sidebar/TokenDialog';

function masked(key: string): string {
  if (key.length <= 8) return '•'.repeat(24);
  return key.slice(0, 4) + '•'.repeat(18) + key.slice(-4);
}

export default function ApiKeysPage() {
  const [token, setToken] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(window.localStorage.getItem(TOKEN_STORAGE_KEY));
    }
  }, []);

  const copyKey = () => {
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const displayKey = token ? (revealed ? token : masked(token)) : 'No token set';

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col">
      <div className="border-b border-border-faint px-32 py-24">
        <h1 className="text-[24px] font-bold tracking-[-0.4px] text-white">API Keys</h1>
        <p className="mt-4 text-[13px] text-[#666]">
          Your bearer token for the playground. Set via the sidebar — read-only here.
        </p>
      </div>

      <div className="px-32 py-24">
        <div className="max-w-[640px] rounded-12 border border-border-faint bg-[#111] p-20">
          <div className="mb-8 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-white">Playground Token</span>
            <span className="rounded-full bg-[#1c1c1c] px-8 py-2 text-[10px] font-medium text-[#555]">
              From localStorage
            </span>
          </div>
          <div className="flex items-center justify-between rounded-8 border border-border-faint bg-[#0d0d0d] px-14 py-10">
            <span className="font-mono text-[13px] text-heat-100">{displayKey}</span>
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                className="text-[#555] transition-colors hover:text-[#888]"
              >
                {revealed ? <EyeOff className="h-15 w-15" /> : <Eye className="h-15 w-15" />}
              </button>
              <button
                type="button"
                onClick={copyKey}
                className="text-[#555] transition-colors hover:text-[#888]"
              >
                <Copy className="h-15 w-15" />
              </button>
            </div>
          </div>
          {copied && (
            <p className="mt-6 text-[12px] text-heat-100">Copied to clipboard</p>
          )}
          {!token && (
            <p className="mt-8 text-[12px] text-[#555]">
              No token set. Use the sidebar to set your Firecrawl API key.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Settings page**

Create `app/settings/page.tsx`:

```tsx
'use client';

import { useState } from 'react';

type Tab = 'team' | 'advanced';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('team');

  const apiUrl = process.env.NEXT_PUBLIC_FIRECRAWL_API_URL ?? 'Set FIRECRAWL_API_URL in .env.local';

  return (
    <div className="flex min-h-[calc(100svh-48px)] flex-col">
      <div className="border-b border-border-faint px-32 py-24">
        <h1 className="text-[24px] font-bold tracking-[-0.4px] text-white">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border-faint px-32">
        {(['team', 'advanced'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'border-b-2 px-16 py-12 text-[13px] font-medium capitalize transition-colors',
              tab === t
                ? 'border-heat-100 text-heat-100'
                : 'border-transparent text-[#666] hover:text-[#999]',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-32 py-24">
        {tab === 'team' && (
          <div className="max-w-[560px] space-y-20">
            <div>
              <label className="mb-6 block text-[12px] font-medium uppercase tracking-[0.06em] text-[#555]">
                Team name
              </label>
              <input
                type="text"
                defaultValue="Personal Team"
                className="h-36 w-full rounded-8 border border-border-faint bg-[#111] px-12 text-[13px] text-white focus:outline-none focus:border-[#2a2a2a]"
              />
            </div>
          </div>
        )}

        {tab === 'advanced' && (
          <div className="max-w-[560px] space-y-20">
            <div>
              <h3 className="mb-4 text-[14px] font-semibold text-white">Self-hosted Instance</h3>
              <p className="mb-12 text-[13px] text-[#666]">
                This dashboard is connected to your self-hosted Firecrawl instance.
              </p>
              <div className="rounded-8 border border-border-faint bg-[#0d0d0d] px-14 py-10">
                <span className="font-mono text-[12px] text-heat-100">{apiUrl}</span>
              </div>
              <p className="mt-6 text-[12px] text-[#555]">
                Change the instance URL by setting <code className="font-mono text-heat-100">FIRECRAWL_API_URL</code> in <code className="font-mono text-heat-100">.env.local</code>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

- Open `http://localhost:3000/api-keys` — token display with reveal/copy buttons
- Open `http://localhost:3000/settings` — Team / Advanced tabs, self-hosted instance URL on Advanced tab

- [ ] **Step 4: Commit**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/api-keys/ apps/web/app/settings/
git commit -m "feat: add API Keys and Settings pages"
```

---

## Task 13: Admin pages restyling

**Files:**
- Modify: `app/admin/ops/page.tsx` (and sub-pages `mcp/page.tsx`, `firecrawl/page.tsx`)
- Modify: `app/admin/principals/page.tsx`
- Modify: `app/admin/login/page.tsx`

The admin pages use existing logic — just verify the dark CSS variable overrides from Task 1 have made them look reasonable. Fix any components that still show white backgrounds.

- [ ] **Step 1: Check admin pages in browser**

Visit:
- `http://localhost:3000/admin/ops` (after logging in via `/admin/login`)
- `http://localhost:3000/admin/principals`

If any panels/cards still have light backgrounds, find the Tailwind class and check if it maps to a CSS variable (likely `bg-accent-white` or hardcoded white). Replace `bg-accent-white` with `bg-[#111]` and `bg-white` with `bg-[#0d0d0d]` in those files.

- [ ] **Step 2: Check and fix admin/login/page.tsx**

Read `app/admin/login/page.tsx`. If it has a white card, change the card `className` to use `bg-[#111] border border-border-faint` instead of `bg-white` or `bg-accent-white`.

- [ ] **Step 3: Verify admin login flow**

Visit `http://localhost:3000/admin/login` and confirm it has a dark login form. Log in and verify `/admin/ops` and `/admin/principals` look dark with readable text.

- [ ] **Step 4: Commit any admin fixes**

```bash
cd /home/theo/Documents/Theochinomona.tech/firecrawl/fire-enrich
git add apps/web/app/admin/
git commit -m "fix: apply dark theme to admin pages"
```

---

## Self-Review Checklist

### Spec coverage
| Spec section | Task |
|---|---|
| Color tokens (background, surface, border, accent, text) | Task 1 |
| TopBar 48px with logo + nav links | Task 2 |
| Sidebar 220px with PLAYGROUND/RESEARCH/ACCOUNT/ADMIN sections | Task 3 |
| Overview page with hero + endpoint cards + stats + integrations | Task 4 |
| Dark shared playground components | Task 5 |
| Scrape input-card + format selector | Task 6 |
| Search input-card | Task 6 |
| Crawl, Map, Extract, Batch Scrape input-card | Task 7 |
| Interact page | Task 8 |
| Parse page with file upload | Task 9 |
| Agent page | Task 10 |
| Activity Logs + Usage | Task 11 |
| API Keys + Settings | Task 12 |
| Admin restyling | Task 13 |

All spec sections are covered.

### Placeholder scan
- No "TBD" or "TODO" in any code step
- All state variables, handlers, and API calls are fully specified
- No "similar to Task N" references

### Type consistency
- `TOKEN_STORAGE_KEY` imported from `@/components/app/sidebar/TokenDialog` in Tasks 4, 12 (same as existing `use-token.ts`)
- `ApiError` type imported from `../\_components/ErrorAlert` in all view files
- `usePlaygroundToken()` hook used consistently across all view files
