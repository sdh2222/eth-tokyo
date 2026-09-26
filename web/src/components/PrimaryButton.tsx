import type { ButtonHTMLAttributes } from "react";
import { useCanAct } from "../hooks/useCanAct";

export function PrimaryButton({
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { wrongNetwork } = useCanAct();

  return (
    <button
      {...rest}
      type={type}
      disabled={disabled === true || wrongNetwork}
      className="bg-focus text-onfocus rounded-control px-4 py-3 text-body font-medium disabled:opacity-40"
    />
  );
}
