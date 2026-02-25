// URL Rule Matcher
//
// Checks each page_view against org URL rules. Fires an event when a rule
// matches AND the URL does not match the optional excludePattern.
//
// matchType: "contains" (glob via micromatch) or "exact" (full URL equals pattern)
// ignoreCase: case-insensitive matching (default true)
// ignoreQuery: strip ?query_string before matching (default true)

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

function stripQuery(s: string): string {
  const i = s.indexOf("?");
  return i === -1 ? s : s.slice(0, i);
}

function prepareUrl(url: string, ignoreCase: boolean, ignoreQuery: boolean): string {
  let u = url;
  if (ignoreQuery) u = stripQuery(u);
  if (ignoreCase) u = u.toLowerCase();
  return u;
}

function testGlob(url: string, path: string, pattern: string, ignoreCase: boolean, ignoreQuery: boolean): boolean {
  const u = ignoreQuery ? stripQuery(url) : url;
  const p = ignoreQuery ? stripQuery(path) : path;
  return (
    micromatch.isMatch(u, pattern, { nocase: ignoreCase }) ||
    micromatch.isMatch(p, pattern, { nocase: ignoreCase })
  );
}

function testExact(url: string, path: string, pattern: string, ignoreCase: boolean, ignoreQuery: boolean): boolean {
  const u = prepareUrl(url, ignoreCase, ignoreQuery);
  const p = prepareUrl(path, ignoreCase, ignoreQuery);
  const pat = ignoreCase ? pattern.toLowerCase() : pattern;
  return u === pat || p === pat;
}

interface RuleOptions {
  matchType: string;
  ignoreCase: boolean;
  ignoreQuery: boolean;
}

function testRule(url: string, path: string, pattern: string, opts: RuleOptions): boolean {
  return opts.matchType === "exact"
    ? testExact(url, path, pattern, opts.ignoreCase, opts.ignoreQuery)
    : testGlob(url, path, pattern, opts.ignoreCase, opts.ignoreQuery);
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
    const opts: RuleOptions = {
      matchType: rule.matchType,
      ignoreCase: rule.ignoreCase,
      ignoreQuery: rule.ignoreQuery,
    };
    // Must match include pattern
    if (!testRule(url, path, rule.pattern, opts)) return false;
    // Must NOT match exclude pattern (only applies to contains/glob mode)
    if (rule.excludePattern && rule.matchType !== "exact" && testGlob(url, path, rule.excludePattern, opts.ignoreCase, opts.ignoreQuery)) return false;
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
  if (!testGlob(url, path, pattern, true, true)) return false;
  if (excludePattern && testGlob(url, path, excludePattern, true, true)) return false;
  return true;
}
