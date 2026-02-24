import { createHash } from "crypto";

/**
 * Generates a deterministic, stable ID from a set of inputs.
 * Use this as the externalId fallback when a webhook payload doesn't include
 * its own unique ID — ensures retries produce the same ID instead of colliding.
 *
 * Example:
 *   deterministicId("ghl", email, "opt_in", orgId)
 *   → always the same 32-char hex string for the same inputs
 */
export function deterministicId(...parts: unknown[]): string {
  return createHash("sha256")
    .update(parts.map((p) => String(p ?? "")).join("|"))
    .digest("hex")
    .slice(0, 32);
}
