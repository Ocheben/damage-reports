"use client";

import type {
  AttributeRule,
  PercentageRule,
  RuleDefinition,
  UserTargetingRule,
} from "./types";
import { ATTRIBUTE_OPERATORS, isArrayOperator } from "./constants/rule";

export function RuleEditor({
  rule,
  onChange,
  onRemove,
  flagKey,
}: {
  rule: RuleDefinition;
  onChange: (next: RuleDefinition) => void;
  onRemove: () => void;
  flagKey: string;
}) {
  return (
    <div className="card space-y-3 border-l-4 border-l-slate-300">
      <RuleHeader type={rule.type} onRemove={onRemove} />

      {rule.type === "user_targeting" && (
        <UserTargetingFields rule={rule} onChange={onChange} />
      )}
      {rule.type === "attribute" && <AttributeFields rule={rule} onChange={onChange} />}
      {rule.type === "percentage_rollout" && (
        <PercentageFields rule={rule} onChange={onChange} flagKey={flagKey} />
      )}

      <RuleResultToggle rule={rule} onChange={onChange} />
    </div>
  );
}

function RuleHeader({
  type,
  onRemove,
}: {
  type: RuleDefinition["type"];
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="pill bg-slate-100 text-slate-700">{type.replace(/_/g, " ")}</span>
      <button type="button" className="text-xs text-red-600 hover:underline" onClick={onRemove}>
        Remove rule
      </button>
    </div>
  );
}

function RuleResultToggle({
  rule,
  onChange,
}: {
  rule: RuleDefinition;
  onChange: (next: RuleDefinition) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={rule.result}
        onChange={(e) => onChange({ ...rule, result: e.target.checked } as RuleDefinition)}
        className="h-4 w-4"
      />
      When this rule matches, return <strong>{rule.result ? "true" : "false"}</strong>
    </label>
  );
}

function UserTargetingFields({
  rule,
  onChange,
}: {
  rule: UserTargetingRule;
  onChange: (next: RuleDefinition) => void;
}) {
  return (
    <label className="block">
      <span className="label">User keys (comma-separated)</span>
      <input
        className="input"
        value={rule.user_keys.join(", ")}
        onChange={(e) => onChange({ ...rule, user_keys: parseCommaList(e.target.value) })}
        placeholder="qa-alice, qa-bob"
      />
    </label>
  );
}

function AttributeFields({
  rule,
  onChange,
}: {
  rule: AttributeRule;
  onChange: (next: RuleDefinition) => void;
}) {
  const valueIsArray = isArrayOperator(rule.operator);

  const onOperatorChange = (next: AttributeRule["operator"]) => {
    const wasArray = isArrayOperator(rule.operator);
    const isArray = isArrayOperator(next);
    const value = isArray
      ? wasArray
        ? rule.value
        : [String(rule.value ?? "")]
      : wasArray
        ? Array.isArray(rule.value) ? rule.value[0] ?? "" : ""
        : rule.value;
    onChange({ ...rule, operator: next, value });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block">
        <span className="label">Attribute</span>
        <input
          className="input"
          value={rule.attribute}
          onChange={(e) => onChange({ ...rule, attribute: e.target.value })}
          placeholder="role"
        />
      </label>
      <label className="block">
        <span className="label">Operator</span>
        <select
          className="input"
          value={rule.operator}
          onChange={(e) => onOperatorChange(e.target.value as AttributeRule["operator"])}
        >
          {ATTRIBUTE_OPERATORS.map((op) => (
            <option key={op}>{op}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">{valueIsArray ? "Values (comma-separated)" : "Value"}</span>
        <input
          className="input"
          value={Array.isArray(rule.value) ? rule.value.join(", ") : String(rule.value ?? "")}
          onChange={(e) =>
            onChange({
              ...rule,
              value: valueIsArray ? parseCommaList(e.target.value) : e.target.value,
            })
          }
        />
      </label>
    </div>
  );
}

function PercentageFields({
  rule,
  onChange,
  flagKey,
}: {
  rule: PercentageRule;
  onChange: (next: RuleDefinition) => void;
  flagKey: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block">
        <span className="label">Percentage</span>
        <input
          className="input"
          type="number"
          min={0}
          max={100}
          step="0.01"
          value={rule.percentage}
          onChange={(e) => onChange({ ...rule, percentage: Number(e.target.value) })}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">Salt (controls bucketing)</span>
        <input
          className="input"
          value={rule.salt}
          onChange={(e) => onChange({ ...rule, salt: e.target.value })}
          placeholder={flagKey || "flag key"}
        />
        <span className="mt-1 block text-xs text-slate-500">
          Same salt = same bucket assignment across rollout changes. Default: the flag key.
        </span>
      </label>
    </div>
  );
}

function parseCommaList(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
