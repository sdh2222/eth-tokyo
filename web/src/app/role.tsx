import { useState } from "react";

export type Role = "treasury" | "mm" | "observer";

const KEY = "desk.role";

function readRole(): Role {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored === "treasury" || stored === "mm" || stored === "observer") {
      return stored;
    }
  } catch {
    return "treasury";
  }
  return "treasury";
}

export function useRole(): [Role, (r: Role) => void] {
  const [role, setRoleState] = useState<Role>(readRole);

  function setRole(next: Role) {
    try {
      sessionStorage.setItem(KEY, next);
    } catch {
      // sessionStorage can be blocked. The in-memory role still switches.
    }
    setRoleState(next);
  }

  return [role, setRole];
}

export function homeFor(role: Role): string {
  if (role === "mm") return "/trade";
  return "/desk";
}
