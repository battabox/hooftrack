import { createContext, useContext } from 'react';
import type { Farm } from './data';

export interface ToastInput {
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

export interface AppCtx {
  farm: Farm;
  selectFarm: (id: string) => void;
  toast: (t: ToastInput) => void;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppContext missing');
  return ctx;
}
