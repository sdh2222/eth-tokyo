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
    <ol className="flex flex-row flex-wrap gap-x-4 gap-y-2 lg:flex-col">
      {steps.map((step, stepIndex) => {
        const done = stepIndex < index;
        return (
          <li key={step.id}>
            <button
              type="button"
              className="text-body"
              disabled={!done}
              onClick={() => {
                if (done) onJump(step.id);
              }}
            >
              {step.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
