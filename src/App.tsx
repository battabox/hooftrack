import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext, type AppCtx, type ToastInput } from './AppContext';
import { repo } from './data';
import { useFarms } from './data/hooks';
import { useRoute } from './lib/router';
import { Layout } from './components/Layout';
import { Dashboard } from './screens/Dashboard';
import { FindCow } from './screens/FindCow';
import { TrimRecord } from './screens/TrimRecord';
import { CowHistory } from './screens/CowHistory';
import { Farms } from './screens/Farms';
import { Settings } from './screens/Settings';
import { ToTrim } from './screens/ToTrim';

const FARM_KEY = 'hooftrack.currentFarm';
const readFarmId = () => { try { return localStorage.getItem(FARM_KEY); } catch { return null; } };

export default function App() {
  const farms = useFarms();
  const [farmId, setFarmId] = useState<string | null>(readFarmId);
  const [toast, setToast] = useState<ToastInput | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const route = useRoute();

  useEffect(() => { repo.ensureSeed(); }, []);

  const selectFarm = useCallback((id: string) => {
    setFarmId(id);
    try { localStorage.setItem(FARM_KEY, id); } catch { /* ignore */ }
  }, []);

  const showToast = useCallback((t: ToastInput) => {
    window.clearTimeout(timer.current);
    setToast(t);
    timer.current = window.setTimeout(() => setToast(null), t.onAction ? 15000 : 4000);
  }, []);

  const farm = farms?.find((f) => f.id === farmId) ?? farms?.[0];
  const ctx = useMemo<AppCtx | null>(() => (farm ? { farm, selectFarm, toast: showToast } : null), [farm, selectFarm, showToast]);

  if (!ctx) return <div className="p-6 text-xl">Loading…</div>;

  const [page, id] = route;
  let screen;
  let active = page ?? '';
  let hideNav = false;
  switch (page) {
    case 'cows': screen = <FindCow />; break;
    case 'list': screen = <ToTrim />; break;
    case 'cow': screen = <CowHistory cowId={id} />; active = 'cows'; break;
    case 'trim': screen = <TrimRecord key={id} cowId={id} />; active = 'cows'; hideNav = true; break;
    case 'farms': screen = <Farms />; break;
    case 'settings': screen = <Settings />; break;
    default: screen = <Dashboard />; active = '';
  }

  return (
    <AppContext.Provider value={ctx}>
      <Layout key={ctx.farm.id} active={active} hideNav={hideNav}>{screen}</Layout>
      {toast && (
        <div role="status" className="fixed inset-x-0 bottom-20 z-50 mx-auto max-w-xl px-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-3 rounded-2xl border-2 border-green-950 bg-green-800 p-3 text-lg font-bold text-white shadow-2xl">
            <span className="flex-1">{toast.message}</span>
            {toast.onAction && (
              <button
                type="button"
                className="min-h-12 rounded-xl border-2 border-white bg-white px-4 text-green-900"
                onClick={async () => { const fn = toast.onAction!; setToast(null); await fn(); }}
              >
                {toast.actionLabel ?? 'Undo'}
              </button>
            )}
            <button type="button" aria-label="Dismiss" className="min-h-12 min-w-12 text-2xl" onClick={() => setToast(null)}>×</button>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}
