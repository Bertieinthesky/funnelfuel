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

function testPattern(url: string, path: string, pattern: string): boolean {
  return (
    micromatch.isMatch(url, pattern, { nocase: true }) ||
    micromatch.isMatch(path, pattern, { nocase: true })
  );
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
    if (!testPattern(url, path, rule.pattern)) return false;
    // Must NOT match exclude pattern
    if (rule.excludePattern && testPattern(url, path, rule.excludePattern)) return false;
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
  if (!testPattern(url, path, pattern)) return false;
  if (excludePattern && testPattern(url, path, excludePattern)) return false;
  return true;
}
