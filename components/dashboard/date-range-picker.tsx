"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const presets = [
  { label: "Today", value: "today" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "All", value: "all" },
];

export function DateRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("range") || "30d";

  function setRange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <Tabs value={current} onValueChange={setRange}>
      <TabsList className="h-8">
        {presets.map((preset) => (
          <TabsTrigger
            key={preset.value}
            value={preset.value}
            className="px-3 text-xs"
          >
            {preset.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
