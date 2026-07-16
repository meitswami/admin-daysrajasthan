import type { IntelligenceLogRecord } from "../types";

export type IntelligenceLogger = {
  log: (record: IntelligenceLogRecord) => void;
};

const defaultLogger: IntelligenceLogger = {
  log: (record) => {
    if (record.level === "error" || record.level === "warn") {
      console.error("[intelligence]", record);
      return;
    }
    if (process.env.NODE_ENV === "development") {
      console.info("[intelligence]", record);
    }
  },
};

let active: IntelligenceLogger = defaultLogger;

export function setIntelligenceLogger(logger: IntelligenceLogger): void {
  active = logger;
}

export function logIntelligence(record: IntelligenceLogRecord): void {
  active.log(record);
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "logging" as const,
  description: "Request/trace logging (future ai_logs, Sentry, Datadog)",
} as const;
