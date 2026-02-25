import { getContacts, getFilterOptions, type ContactFilters } from "@/lib/dashboard/queries";
import { db } from "@/lib/db";
import { parseDateRange } from "@/lib/dashboard/date-range";
import { ContactFilters as ContactFiltersUI } from "@/components/dashboard/contact-filters";
import { ContactsChart } from "@/components/dashboard/contacts-chart";
import { cn } from "@/lib/cn";
import { formatDistanceToNow } from "date-fns";
import { EventType } from "@prisma/client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const filters: ContactFilters = {};
  if (sp.q) filters.search = sp.q;
  if (sp.source) filters.source = sp.source;
  if (sp.title) filters.title = sp.title;
  if (sp.tag) filters.tag = sp.tag;
  if (sp.quality) filters.leadQuality = sp.quality;
  if (sp.eventType && sp.eventType in EventType) {
    filters.eventType = sp.eventType as EventType;
  }
  if (sp.range) {
    const range = parseDateRange(sp.range);
    filters.dateFrom = range.from;
    filters.dateTo = range.to;
  }
  if (sp.segment) filters.segmentId = sp.segment;

  const [{ contacts, total, totalPages }, filterOptions, segments] = await Promise.all([
    getContacts(orgId, page, 50, filters),
    getFilterOptions(orgId),
    db.segment.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Contacts</h1>
        <p className="text-sm text-muted-foreground">
          {total.toLocaleString()} contact{total !== 1 ? "s" : ""}
          {Object.keys(filters).length > 0 ? " matching filters" : " total"}
        </p>
      </div>

      <ContactsChart orgId={orgId} tags={filterOptions.tags} />

      <ContactFiltersUI
        orgId={orgId}
        sources={filterOptions.sources}
        titles={filterOptions.titles}
        tags={filterOptions.tags}
        segments={segments}
      />

      {contacts.length === 0 ? (
        <Card className="border-border py-0">
          <div className="p-12 text-center text-sm text-muted-foreground">
            {Object.keys(filters).length > 0
              ? "No contacts match your filters."
              : "No contacts yet. Contacts are created when visitors submit forms or complete purchases."}
          </div>
        </Card>
      ) : (
        <>
          <Card className="gap-0 border-border py-0 overflow-hidden">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="px-4 text-xs">Contact</TableHead>
                  <TableHead className="px-4 text-xs">Email</TableHead>
                  <TableHead className="px-4 text-xs">Phone</TableHead>
                  <TableHead className="px-4 text-center text-xs">Quality</TableHead>
                  <TableHead className="px-4 text-xs">Tags</TableHead>
                  <TableHead className="px-4 text-right text-xs">Events</TableHead>
                  <TableHead className="px-4 text-right text-xs">Payments</TableHead>
                  <TableHead className="px-4 text-right text-xs">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => {
                  const name = [contact.firstName, contact.lastName]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <TableRow key={contact.id} className="border-border">
                      <TableCell className="px-4">
                        <Link
                          href={`/dashboard/${orgId}/contacts/${contact.id}`}
                          className="font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {name || (
                            <span className="text-muted-foreground/60">Anonymous</span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {contact.email ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 text-muted-foreground">
                        {contact.phone ?? "—"}
                      </TableCell>
                      <TableCell className="px-4 text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[11px]",
                            contact.leadQuality === "HIGH" && "bg-green-dim text-green",
                            contact.leadQuality === "MEDIUM" && "bg-yellow-dim text-yellow",
                            contact.leadQuality === "LOW" && "bg-red-dim text-red",
                            contact.leadQuality === "UNKNOWN" && "bg-secondary text-muted-foreground/60"
                          )}
                        >
                          {contact.leadQuality.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4">
                        {contact.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {contact.tags.slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="bg-primary/10 text-primary text-[10px] px-1.5 py-0"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {contact.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground/60">
                                +{contact.tags.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                        {contact._count.events}
                      </TableCell>
                      <TableCell className="px-4 text-right tabular-nums text-muted-foreground">
                        {contact._count.payments}
                      </TableCell>
                      <TableCell className="px-4 text-right text-muted-foreground/60">
                        {formatDistanceToNow(new Date(contact.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`}>
                    Previous
                  </Link>
                </Button>
              )}
              <span className="text-xs text-muted-foreground/60">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`}>
                    Next
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
