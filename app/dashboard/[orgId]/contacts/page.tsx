import { getContacts } from "@/lib/dashboard/queries";
import { cn } from "@/lib/cn";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default async function ContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgId } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const { contacts, total, totalPages } = await getContacts(orgId, page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
        <p className="text-sm text-text-muted">
          {total.toLocaleString()} total contact{total !== 1 ? "s" : ""}
        </p>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-sm text-text-muted">
          No contacts yet. Contacts are created when visitors submit forms or complete purchases.
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">
                    Events
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">
                    Sessions
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
                    <tr
                      key={contact.id}
                      className="border-b border-border transition-colors last:border-0 hover:bg-surface-elevated"
                    >
                      <td className="px-4 py-3 font-medium">
                        {name || (
                          <span className="text-text-dim">Anonymous</span>
                        )}
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
                      <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                        {contact._count.events}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                        {contact._count.sessions}
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
                  href={`?page=${page - 1}`}
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
                  href={`?page=${page + 1}`}
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
