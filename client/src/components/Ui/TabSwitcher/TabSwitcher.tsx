"use client";

export type TabOption<T extends string> = {
  id: T;
  label: React.ReactNode;
};

export function TabSwitcher<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: ReadonlyArray<TabOption<T>>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`tab ${active === t.id ? "tab-active" : ""}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
