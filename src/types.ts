export enum ReportType {
  DAILY_NEW = "daily_new",
  DAILY_EXISTING = "daily_existing",
  WEEKLY_PIPELINE = "weekly_pipeline",
  MONTHLY_ACCOUNT = "monthly_account",
  EMERGENCY_CLAIM = "emergency_claim",
  CUSTOM = "custom"
}

export interface ClientReport {
  id: string;
  name: string;
  person: string;
  claimSeverity?: string; // Step 2-A
  purpose?: string;       // Step 3
  result?: string;        // Step 4
  dealAmount?: string;    // Step 4
  dealProbability?: string; // Step 4
  outlier?: string;       // Step 5
  jargon?: RefinedJargon; // Step 6
  isCompleted?: boolean;
}

export interface RefinedJargon {
  purpose: string;
  result: string;
  pipeline: string;
  outlier: string;
  action: string;
}

export interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  options?: Array<{ value: string; label: string }>;
  isInputPending?: boolean;
  stepId?: string;
}
