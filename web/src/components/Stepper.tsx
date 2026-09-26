export function Stepper({
  steps,
  current,
  onJump,
}: {
  steps: { id: string; label: string }[];
  current: string;
  onJump: (id: string) => void;
}) {
  const index = steps.findIndex((step) => step.id === current);

  return (
    <ol className="step-rail flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
      {steps.map((step, stepIndex) => {
        const done = stepIndex < index;
        const active = step.id === current;
        return (
          <li key={step.id} className="relative">
            <button
              type="button"
              className={
                active
                  ? "step-item step-item-active w-full justify-start bg-text text-onfocus"
                  : "step-item w-full justify-start bg-transparent text-muted"
              }
              disabled={!done && !active}
              aria-current={active ? "step" : undefined}
              onClick={() => {
                if (done) onJump(step.id);
              }}
            >
              <span className="step-index">{stepIndex + 1}</span>
              {step.label}
            </button>
            {active ? <span className="step-bridge" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
