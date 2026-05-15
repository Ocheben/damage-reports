import type { AttributeRule } from "../types";

export const ATTRIBUTE_OPERATORS: ReadonlyArray<AttributeRule["operator"]> = [
  "equals",
  "not_equals",
  "in",
  "not_in",
  "contains",
];

export function isArrayOperator(op: AttributeRule["operator"]): boolean {
  return op === "in" || op === "not_in";
}
