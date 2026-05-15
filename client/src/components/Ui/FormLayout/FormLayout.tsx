export function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">{children}</div>;
}

export function FormField({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-900">{label}</span>
      {children}
      {error ? (
        <FieldError message={error} />
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function FieldError({ message }: { message: string }) {
  return (
    <span role="alert" className="mt-1 block text-xs text-red-600">
      {message}
    </span>
  );
}
