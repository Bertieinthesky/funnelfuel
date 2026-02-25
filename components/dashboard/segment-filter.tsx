"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  segments: { id: string; name: string }[];
}

export function SegmentFilter({ segments }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("segment", value);
    } else {
      params.delete("segment");
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <Select
      value={searchParams.get("segment") || "all"}
      onValueChange={onChange}
    >
      <SelectTrigger size="sm" className="text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Segments</SelectItem>
        {segments.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
