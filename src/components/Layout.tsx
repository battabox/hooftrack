import type { ReactNode } from 'react';
import { useApp } from '../AppContext';
import { go } from '../lib/router';

const NAV = [
  { path: '/', key: '', label: 'Due', icon: '📅' },
  { path: '/list', key: 'list', label: 'To trim', icon: '📋' },
  { path: '/cows', key: 'cows', label: 'Cows', icon: '🐄' },
  { path: '/farms', key: 'farms', label: 'Farms', icon: '🏠' },
  { path: '/settings', key: 'settings', label: 'Settings', icon: '⚙️' },
];

export function Layout(props: { children: ReactNode; active: string; hideNav?: boolean }) {
  const { farm } = useApp();
  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header className="sticky top-0 z-20 border-b-2 border-green-950 bg-green-900 px-4 pt-[env(safe-area-inset-top)] text-white">
        <button type="button" onClick={() => go('/farms')} className="flex min-h-14 w-full items-center justify-between gap-3 text-left">
          <span className="min-w-0">
            <span className="block text-xs font-semibold tracking-widest text-green-200 uppercase">HoofTrack · Farm</span>
            <span className="block truncate text-xl font-extrabold">{farm.name}</span>
          </span>
          <span className="shrink-0 rounded-lg border border-green-300 px-2 py-1 text-sm font-semibold">Change</span>
        </button>
      </header>

      <main className={`px-4 pt-3 ${props.hideNav ? 'pb-40' : 'pb-28'}`}>{props.children}</main>

      {!props.hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-neutral-300 bg-white pb-[env(safe-area-inset-bottom)] dark:border-neutral-700 dark:bg-neutral-950">
          <div className="mx-auto grid max-w-xl grid-cols-5">
            {NAV.map((n) => {
              const on = n.key === props.active;
              return (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => go(n.path)}
                  aria-current={on ? 'page' : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center text-sm font-bold ${
                    on ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950' : 'text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">{n.icon}</span>
                  {n.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
