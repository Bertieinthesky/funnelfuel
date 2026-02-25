"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PixelSetup } from "./pixel-setup";
import { WebhookSetup } from "./webhook-setup";
import { VerifySetup } from "./verify-setup";

interface Props {
  orgId: string;
  publicKey: string;
}

export function SetupTabs({ orgId, publicKey }: Props) {
  return (
    <Tabs defaultValue="pixel">
      <TabsList variant="line">
        <TabsTrigger value="pixel">Pixel</TabsTrigger>
        <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        <TabsTrigger value="verify">Verify</TabsTrigger>
      </TabsList>

      <TabsContent value="pixel" className="mt-6">
        <PixelSetup orgId={orgId} publicKey={publicKey} />
      </TabsContent>

      <TabsContent value="webhooks" className="mt-6">
        <WebhookSetup orgId={orgId} />
      </TabsContent>

      <TabsContent value="verify" className="mt-6">
        <VerifySetup orgId={orgId} />
      </TabsContent>
    </Tabs>
  );
}
