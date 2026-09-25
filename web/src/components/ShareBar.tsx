const WAD = 10n ** 18n;

function percent(wad: bigint): number {
  if (wad <= 0n) return 0;
  const hundredths = (wad * 10000n) / WAD;
  const value = Number(hundredths) / 100;
  if (value > 100) return 100;
  return value;
}

export function ShareBar({
  shareWad,
  targetWad,
  caption,
}: {
  shareWad: bigint;
  targetWad: bigint;
  caption: string;
}) {
  const share = percent(shareWad);
  const target = percent(targetWad);

  return (
    <div>
      <div className="relative h-3 rounded-pill bg-treasury-tint" aria-label={caption}>
        <div className="h-3 rounded-pill bg-treasury" style={{ width: `${share}%` }} />
        <div
          className="absolute top-0 h-3 w-[2px] bg-text"
          style={{ left: `${target}%` }}
        />
      </div>
      <p className="mt-2 text-small text-muted">{caption}</p>
    </div>
  );
}
