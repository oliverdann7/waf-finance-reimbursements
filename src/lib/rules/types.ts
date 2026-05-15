export interface ReimbursementRule {
  id: string;
  key: string;
  name: string;
  description: string;
  type: "rate" | "cap" | "percentage" | "limit" | "days";
  value: number;
  unit: string;
  active: boolean;
}

export interface RuleEvaluation {
  ruleKey: string;
  ruleName: string;
  passed: boolean;
  message: string;
  severity: "info" | "warning" | "error";
}
