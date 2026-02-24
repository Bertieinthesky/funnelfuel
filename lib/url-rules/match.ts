// URL Rule Matcher
//
// Checks each page_view against org URL rules. Fires an event when a rule
// matches AND the URL does not match the optional excludePattern.
//
// excludePattern solves the /thank-you vs /thank-you-variant problem:
//   pattern:        "thank-you*"
//   excludePattern: "thank-you-v*"
//   -> fires on /thank-you but NOT on /thank-you-variant

import micromatch from "micromatch";
import { db } from "@/lib/db";
import { toJson } from "@/lib/json";
import { EventType, EventSource } from "@prisma/client";

interface MatchUrlRulesArgs {
  organizationId: string;
  url: string;
  path: string;
  contactId: string | null;
  sessionId: string;
  variantId?: string | null;
}

function testGlob(url: string, path: string, pattern: string): boolean {
  return (
    micromatch.isMatch(url, pattern, { nocase: true }) ||
    micromatch.isMatch(path, pattern, { nocase: true })
  );
}

function testExact(url: string, path: string, pattern: string): boolean {
  const p = pattern.toLowerCase();
  return url.toLowerCase() === p || path.toLowerCase() === p;
}

function testRule(url: string, path: string, pattern: string, matchType: string): boolean {
  return matchType === "exact"
    ? testExact(url, path, pattern)
    : testGlob(url, path, pattern);
}

export async function matchAndFireUrlRules({
  organizationId,
  url,
  path,
  contactId,
  sessionId,
  variantId,
}: MatchUrlRulesArgs): Promise<void> {
  const rules = await db.urlRule.findMany({
    where: { organizationId, isActive: true },
  });

  if (rules.length === 0) return;

  const matched = rules.filter((rule) => {
    // Must match include pattern
    if (!testRule(url, path, rule.pattern, rule.matchType)) return false;
    // Must NOT match exclude pattern (only applies to contains/glob mode)
    if (rule.excludePattern && rule.matchType !== "exact" && testGlob(url, path, rule.excludePattern)) return false;
    return true;
  });

  if (matched.length === 0) return;

  for (const rule of matched) {
    // Fires at most once per contact per rule per day
    const externalId = contactId
      ? `url-rule-${rule.id}-${contactId}-${new Date().toISOString().slice(0, 10)}`
      : null;

    await db.event
      .create({
        data: {
          organizationId,
          contactId,
          sessionId,
          type: rule.eventType as EventType,
          source: EventSource.PIXEL,
          confidence: contactId ? 80 : 50,
          variantId: variantId ?? null,
          funnelStepId: rule.funnelStepId ?? null,
          externalId,
          data: toJson({
            urlRuleId: rule.id,
            urlRuleName: rule.name,
            url,
            path,
            tags: rule.tags,
          }),
        },
      })
      .catch(() => {});

    if (contactId && rule.tags.length > 0) {
      await db.contact
        .update({
          where: { id: contactId },
          data: { tags: { push: rule.tags } },
        })
        .catch(() => {});
    }
  }
}

export function urlMatchesFunnelStep(
  url: string,
  path: string,
  pattern: string,
  excludePattern?: string | null
): boolean {
  if (!testGlob(url, path, pattern)) return false;
  if (excludePattern && testGlob(url, path, excludePattern)) return false;
  return true;
}
