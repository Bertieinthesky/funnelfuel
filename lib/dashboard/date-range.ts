export function parseDateRange(range: string | null): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Custom range: "2024-01-15_2024-02-15"
  if (range && range.includes("_")) {
    const [fromStr, toStr] = range.split("_");
    const from = new Date(fromStr + "T00:00:00");
    const customTo = new Date(toStr + "T23:59:59.999");
    if (!isNaN(from.getTime()) && !isNaN(customTo.getTime())) {
      return { from, to: customTo };
    }
  }

  switch (range) {
    case "today": {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { from, to };
    }
    case "7d": {
      const from = new Date(to);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "90d": {
      const from = new Date(to);
      from.setDate(from.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
    case "all": {
      return { from: new Date(2020, 0, 1), to };
    }
    case "30d":
    default: {
      const from = new Date(to);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    }
  }
}
