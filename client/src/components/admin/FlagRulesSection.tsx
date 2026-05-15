"use client";

import type { RuleDefinition } from "./types";
import { RuleEditor } from "./RuleEditor";

export function FlagRulesSection({
  rules,
  flagKey,
  onAdd,
  onUpdate,
  onRemove,
}: {
  rules: RuleDefinition[];
  flagKey: string;
  onAdd: (type: RuleDefinition["type"]) => void;
  onUpdate: (idx: number, next: RuleDefinition) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Rules{" "}
          <span className="text-xs font-normal text-slate-500">
            (evaluated top-to-bottom; first match wins)
          </span>
        </h2>
        <RuleAddButtons onAdd={onAdd} />
      </header>

      {rules.length === 0 ? (
        <p className="text-xs text-slate-500">
          No rules — flag will fall through to the default value for everyone.
        </p>
      ) : (
        rules.map((rule, i) => (
          <RuleEditor
            key={i}
            rule={rule}
            flagKey={flagKey}
            onChange={(next) => onUpdate(i, next)}
            onRemove={() => onRemove(i)}
          />
        ))
      )}
    </section>
  );
}

function RuleAddButtons({ onAdd }: { onAdd: (type: RuleDefinition["type"]) => void }) {
  return (
    <div className="flex gap-2">
      <button type="button" className="btn" onClick={() => onAdd("user_targeting")}>
        + User targeting
      </button>
      <button type="button" className="btn" onClick={() => onAdd("attribute")}>
        + Attribute
      </button>
      <button type="button" className="btn" onClick={() => onAdd("percentage_rollout")}>
        + Percentage rollout
      </button>
    </div>
  );
}
