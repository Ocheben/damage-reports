// Wire contract from the generated SDK; FlagFormState/EMPTY_FLAG/RULE_TEMPLATES
// are UI-only.

import type {
  AttributeRule as GeneratedAttributeRule,
  AttributeRuleOperatorEnumKey,
} from "@/generated/types/AttributeRule";
import type { FeatureFlag as GeneratedFeatureFlag } from "@/generated/types/FeatureFlag";
import type { PercentageRolloutRule as GeneratedPercentageRolloutRule } from "@/generated/types/PercentageRolloutRule";
import type { UserTargetingRule as GeneratedUserTargetingRule } from "@/generated/types/UserTargetingRule";

// Re-exports under stable names; AttributeRule.value is narrowed to what the
// form editor handles (OpenAPI can't express discriminator-bound polymorphism).
export type UserTargetingRule = GeneratedUserTargetingRule;
export type AttributeRule = Omit<GeneratedAttributeRule, "value" | "operator"> & {
  operator: AttributeRuleOperatorEnumKey;
  value: string | string[];
};
export type PercentageRule = GeneratedPercentageRolloutRule;
export type RuleDefinition = UserTargetingRule | AttributeRule | PercentageRule;

// FeatureFlag with rules narrowed to the editor-friendly union.
export type AdminFlag = Omit<GeneratedFeatureFlag, "rules"> & {
  rules: RuleDefinition[] | null;
};

// UI form shape; uses string datetimes for <input type="datetime-local">.
export type FlagFormState = {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  default_value: boolean;
  starts_at: string;
  ends_at: string;
  rules: RuleDefinition[];
};

export const EMPTY_FLAG: FlagFormState = {
  key: "",
  name: "",
  description: "",
  enabled: true,
  default_value: false,
  starts_at: "",
  ends_at: "",
  rules: [],
};

export const RULE_TEMPLATES: Record<RuleDefinition["type"], (flagKey: string) => RuleDefinition> = {
  user_targeting: () => ({ type: "user_targeting", user_keys: [], result: true }),
  attribute: () => ({
    type: "attribute",
    attribute: "role",
    operator: "in",
    value: ["staff"],
    result: true,
  }),
  percentage_rollout: (flagKey) => ({
    type: "percentage_rollout",
    percentage: 25,
    salt: flagKey || "flag-salt",
    result: true,
  }),
};

