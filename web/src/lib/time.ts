export function formatWhen(targetUnix: number, nowUnix: number): string {
  const delta = targetUnix - nowUnix;
  const abs = Math.abs(delta);
  const future = delta > 0;

  if (abs < 86400) {
    if (abs < 60) {
      return future ? `in ${abs} s` : `${abs} s ago`;
    }
    if (abs < 3600) {
      const minutes = Math.floor(abs / 60);
      return future ? `in ${minutes} m` : `${minutes} m ago`;
    }
    const hours = Math.floor(abs / 3600);
    const minutes = Math.floor((abs % 3600) / 60);
    const body = minutes === 0 ? `${hours} h` : `${hours} h ${minutes} m`;
    return future ? `in ${body}` : `${body} ago`;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(targetUnix * 1000));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("month")} ${pick("day")}, ${pick("year")}, ${pick("hour")}:${pick("minute")} JST`;
}
