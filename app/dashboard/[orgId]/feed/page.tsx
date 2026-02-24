import { EventFeed } from "@/components/dashboard/event-feed";
import { getRecentEvents } from "@/lib/dashboard/queries";

export default async function FeedPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const events = await getRecentEvents(orgId, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Live Feed</h1>
        <p className="text-sm text-text-muted">
          Real-time stream of all tracked events
        </p>
      </div>

      <EventFeed
        events={events.map((e) => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        }))}
      />
    </div>
  );
}
