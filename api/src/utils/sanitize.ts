export function extractText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractText(item);
      if (text) return text;
    }
    return null;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj._ === "string") return obj._.trim() || null;
    if (obj.name) return extractText(obj.name);
    return null;
  }

  return null;
}

export function safeDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return isNaN(date.getTime()) ? null : date;
}