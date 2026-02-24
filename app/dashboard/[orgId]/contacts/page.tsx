import { getContacts, getFilterOptions, type ContactFilters } from "@/lib/dashboard/queries";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { ContactFilters as ContactFiltersUI } from "@/components/dashboard/contact-filters";
import { cn } from "@/lib/cn";
import { formatDistanceToNow } from "date-fns";
import { EventType } from "@prisma/client";
import Link from "next/link";

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { orgId } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  // Build filters from search params
  const filters: ContactFilters = {};
  if (sp.q) filters.search = sp.q;
  if (sp.source) filters.source = sp.source;
  if (sp.title) filters.title = sp.title;
  if (sp.quality) filters.leadQuality = sp.quality;
  if (sp.eventType && sp.eventType in EventType) {
    filters.eventType = sp.eventType as EventType;
  }
  if (sp.range) {
    const range = parseDateRange(sp.range);
    filters.dateFrom = range.from;
    filters.dateTo = range.to;
  }

  const [{ contacts, total, totalPages }, filterOptions] = await Promise.all([
    getContacts(orgId, page, 50, filters),
    getFilterOptions(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-sm text-text-muted">
          {total.toLocaleString()} contact{total !== 1 ? "s" : ""}
          {Object.keys(filters).length > 0 ? " matching filters" : " total"}
        </p>
      </div>

      <ContactFiltersUI
        sources={filterOptions.sources}
        titles={filterOptions.titles}
      />

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-sm text-text-muted">
          {Object.keys(filters).length > 0
            ? "No contacts match your filters."
            : "No contacts yet. Contacts are created when visitors submit forms or complete purchases."}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-text-muted">
                    Quality
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">
                    Tags
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">
                    Events
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">
                    Payments
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => {
                  const name = [contact.firstName, contact.lastName]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={contact.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/${orgId}/contacts/${contact.id}`}
                          className="font-medium text-text transition-colors hover:text-accent"
                        >
                          {name || (
                            <span className="text-text-dim">Anonymous</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {contact.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {contact.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                            contact.leadQuality === "HIGH" &&
                              "bg-green-dim text-green",
                            contact.leadQuality === "MEDIUM" &&
                              "bg-yellow-dim text-yellow",
                            contact.leadQuality === "LOW" &&
                              "bg-red-dim text-red",
                            contact.leadQuality === "UNKNOWN" &&
                              "bg-surface-elevated text-text-dim"
                          )}
                        >
                          {contact.leadQuality.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {contact.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-accent-dim px-1.5 py-0.5 text-[10px] text-accent"
                              >
                                {tag}
                              </span>
                            ))}
                            {contact.tags.length > 3 && (
                              <span className="text-[10px] text-text-dim">
                                +{contact.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-dim">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                        {contact._count.events}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                        {contact._count.payments}
                      </td>
                      <td className="px-4 py-3 text-right text-text-dim">
                        {formatDistanceToNow(new Date(contact.createdAt), {
                          addSuffix: true,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-muted hover:text-text"
                >
                  Previous
                </Link>
              )}
              <span className="text-xs text-text-dim">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-muted hover:text-text"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
