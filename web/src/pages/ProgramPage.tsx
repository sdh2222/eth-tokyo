import { PROGRAM_HEX, PROGRAM_LENGTH_NOTE } from "../desk/fixture/program";
import { emptyConfig } from "../desk/fixture/state";
import { useDeskPort } from "../hooks/useDesk";

export function ProgramPage() {
  const port = useDeskPort();
  const lines = port.describeProgram({ deadline: 0n, salt: 0n, unknown: [] }, emptyConfig());
  const decoded = port.decodeProgram(PROGRAM_HEX);
  const bytes = (PROGRAM_HEX.length - 2) / 2;
  return (
    <div className="flex flex-col gap-3">
      {lines.map((line) => (
        <p key={line} className="text-body">
          {line}
        </p>
      ))}
      <p className="num text-body">{PROGRAM_HEX}</p>
      <p className="text-body">
        {PROGRAM_LENGTH_NOTE} ({bytes} bytes)
      </p>
      <ol>
        {decoded.unknown.map((step, index) => (
          <li key={index} className="num text-body">
            {step.opcode.toString(16)} {step.args}
          </li>
        ))}
      </ol>
    </div>
  );
}
