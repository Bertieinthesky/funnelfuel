import type { Prisma } from "@prisma/client";

/**
 * Safely convert any value to Prisma's InputJsonValue.
 * Serializes through JSON to strip `undefined` and enforce JSON-compatibility.
 */
export function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}
