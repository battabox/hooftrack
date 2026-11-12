import type { ReactNode } from 'react';

const base = 'min-h-14 rounded-xl border-2 px-3 py-2 text-lg font-semibold leading-tight transition-colors active:scale-[0.98]';

export function Choice(props: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  const { selected, onClick, children, className = '' } = props;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`${base} text-left ${
        selected
          ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-neutral-950'
          : 'border-neutral-400 bg-white text-neutral-950 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white'
      } ${className}`}
    >
      {selected && <span aria-hidden="true">✓ </span>}
      {children}
    </button>
  );
}

export function Button(props: {
  onClick?: () => void;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const { variant = 'secondary', className = '', type = 'button', ...rest } = props;
  const styles = {
    primary: 'border-green-800 bg-green-800 text-white disabled:border-neutral-400 disabled:bg-neutral-400 dark:disabled:border-neutral-700 dark:disabled:bg-neutral-700',
    secondary: 'border-neutral-950 bg-white text-neutral-950 dark:border-white dark:bg-neutral-900 dark:text-white disabled:opacity-40',
    danger: 'border-red-700 bg-white text-red-700 dark:bg-neutral-900 dark:text-red-400 dark:border-red-400',
  }[variant];
  return (
    <button type={type} {...rest} className={`${base} text-center ${styles} ${className}`}>
      {props.children}
    </button>
  );
}

export function Section(props: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-bold tracking-wide text-neutral-600 uppercase dark:text-neutral-300">
        {props.title} {props.hint && <span className="font-normal normal-case">({props.hint})</span>}
      </h2>
      {props.children}
    </section>
  );
}

export const inputClass =
  'min-h-14 w-full rounded-xl border-2 border-neutral-500 bg-white px-3 text-lg text-neutral-950 placeholder:text-neutral-500 focus:border-neutral-950 focus:outline-none dark:border-neutral-500 dark:bg-neutral-900 dark:text-white dark:focus:border-white';

export function DemoBadge() {
  return <span className="ml-2 rounded bg-purple-700 px-1.5 py-0.5 align-middle text-xs font-bold text-white">DEMO</span>;
}
