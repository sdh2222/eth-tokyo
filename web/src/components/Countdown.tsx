export function Countdown({ secondsLeft }: { secondsLeft: number }) {
  return (
    <span className={secondsLeft === 0 ? "num text-body text-muted" : "num text-body"}>
      {secondsLeft}
    </span>
  );
}
