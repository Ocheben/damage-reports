type Tone = "slate" | "emerald";

const TONE_CLASSES: Record<Tone, string> = {
  slate: "border-slate-200 bg-white text-slate-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function DecisionsStats({
  total,
  trueCount,
  falseCount,
}: {
  total: number;
  trueCount: number;
  falseCount: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Total" value={total} />
      <Stat label="True" value={trueCount} tone="emerald" />
      <Stat label="False" value={falseCount} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-lg border p-4 ${TONE_CLASSES[tone]}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
