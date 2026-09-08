import { redactSecrets } from "../nostr/secretGuard";

type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
    __lovableReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

const MAX_MESSAGE = 2_000;
const MAX_STACK = 8_000;
const CAUSE_DEPTH = 4;

function clean(value: unknown, limit: number): string {
  const text = typeof value === "string" ? value : String(value ?? "");
  return redactSecrets(text).slice(0, limit);
}

/**
 * Audit F3: telemetry only ever receives sanitized, bounded strings — never a
 * raw Error, never a cause chain object, never form data or key-entry state.
 */
export function describeSafely(error: unknown): { message: string; stack: string | undefined } {
  const messages: string[] = [];
  let stack: string | undefined;
  let current: unknown = error;
  for (let depth = 0; depth < CAUSE_DEPTH && current != null; depth += 1) {
    if (current instanceof Response) {
      messages.push(`Response ${current.status}${current.url ? ` at ${current.url}` : ""}`);
      break;
    }
    if (current instanceof Error) {
      messages.push(`${depth === 0 ? "" : "caused by: "}${current.name}: ${current.message}`);
      if (depth === 0 && typeof current.stack === "string") stack = current.stack;
      current = current.cause;
      continue;
    }
    messages.push(typeof current === "string" ? current : "[non-error value]");
    break;
  }
  return {
    message: clean(messages.join(" | ") || "Unknown error", MAX_MESSAGE),
    stack: stack === undefined ? undefined : clean(stack, MAX_STACK),
  };
}

/** Small, bounded, sanitized context values only. */
function safeContext(context: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
      continue;
    }
    if (typeof value === "string") {
      out[key] = clean(value, 200);
    }
    // Objects/arrays are dropped on purpose: nested payloads are where form
    // data and key-entry state would otherwise leak into telemetry.
  }
  return out;
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const { message, stack } = describeSafely(error);
  const safe = safeContext({
    source: "react_error_boundary",
    route: window.location.pathname,
    ...context,
  });

  // A sanitized copy is reported INSTEAD of the raw error — passing both would
  // hand the original message/stack straight back to telemetry.
  window.__lovableEvents?.captureException?.(
    new Error(message),
    { ...safe, ...(stack !== undefined && { stack }) },
    { mechanism: "react_error_boundary", handled: false, severity: "error" },
  );
  // Prod React does not rethrow boundary-caught errors to window.onerror, so the
  // editor's telemetry never sees them. Forward to lovable.js's reporting hook,
  // which is present only inside the editor preview.
  window.__lovableReportRuntimeError?.({
    message,
    ...(stack !== undefined && { stack }),
    filename: window.location.pathname,
  });
}
