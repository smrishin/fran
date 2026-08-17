export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  location?: string;
  description?: string;
  url?: string;
};

const unescapeIcs = (value: string) =>
  value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");

const readProperty = (block: string, name: string) => {
  const line = block.split("\n").find((candidate) => {
    const key = candidate.slice(0, candidate.indexOf(":"));
    return key === name || key.startsWith(`${name};`);
  });

  if (!line) return undefined;
  return line.slice(line.indexOf(":") + 1).trim();
};

const normalizeDate = (value?: string) => {
  if (!value) return undefined;
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }

  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return value;
  const [, year, month, day, hour, minute, second, zone] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${zone}`;
};

export function parseIcs(source: string): CalendarEvent[] {
  const unfolded = source.replace(/\r?\n[ \t]/g, "").replace(/\r\n/g, "\n");
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  return blocks.flatMap((block, index) => {
    const startRaw = readProperty(block, "DTSTART");
    const start = normalizeDate(startRaw);
    if (!start) return [];

    return [{
      id: readProperty(block, "UID") ?? `event-${index}`,
      title: unescapeIcs(readProperty(block, "SUMMARY") ?? "Untitled event"),
      start,
      end: normalizeDate(readProperty(block, "DTEND")),
      allDay: /^\d{8}$/.test(startRaw ?? ""),
      location: readProperty(block, "LOCATION") ? unescapeIcs(readProperty(block, "LOCATION")!) : undefined,
      description: readProperty(block, "DESCRIPTION") ? unescapeIcs(readProperty(block, "DESCRIPTION")!) : undefined,
      url: readProperty(block, "URL") ? unescapeIcs(readProperty(block, "URL")!) : undefined,
    }];
  }).sort((a, b) => a.start.localeCompare(b.start));
}
