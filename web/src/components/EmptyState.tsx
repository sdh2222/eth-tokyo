export function EmptyState({
  sentence,
  action,
}: {
  sentence: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body">{sentence}</p>
      {action ? (
        <button type="button" className="text-body" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
