import { PROGRAM_HEX, PROGRAM_LENGTH_NOTE } from "../desk/fixture/program";
import { emptyConfig } from "../desk/fixture/state";
import { useDeskPort } from "../hooks/useDesk";

export function ProgramPage() {
  const port = useDeskPort();
  const lines = port.describeProgram({ deadline: 0n, salt: 0n, unknown: [] }, emptyConfig());
  const decoded = port.decodeProgram(PROGRAM_HEX);
  const bytes = (PROGRAM_HEX.length - 2) / 2;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">Program</h1>
        <p className="text-body text-muted">What this desk will and will not do.</p>
      </header>
      <ol className="grid gap-3">
        {lines.map((line, index) => (
          <li key={line} className="flex gap-4 rounded-card border border-border bg-surface p-5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-program text-small text-onfocus">
              {index + 1}
            </span>
            <p className="text-body">{line}</p>
          </li>
        ))}
      </ol>
      <section className="rounded-card border border-border bg-text p-5 text-onfocus">
        <p className="text-small text-onfocus/80">Bytecode</p>
        <p className="num mt-2 break-all text-body">{PROGRAM_HEX}</p>
        <p className="mt-3 text-small text-onfocus/80">
          {PROGRAM_LENGTH_NOTE} ({bytes} bytes)
        </p>
      </section>
      <section className="overflow-x-auto rounded-card border border-border">
        <table>
          <thead>
            <tr>
              <th className="px-5">Opcode</th>
              <th className="px-5">Args</th>
            </tr>
          </thead>
          <tbody>
            {decoded.unknown.map((step, index) => (
              <tr key={index}>
                <td className="num border-t border-border px-5">{step.opcode.toString(16)}</td>
                <td className="num border-t border-border px-5">{step.args}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
