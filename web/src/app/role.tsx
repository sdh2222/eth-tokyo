import { useEffect, useState } from "react";

export type Role = "treasury" | "mm";

const KEY = "desk.role";

function readRole(): Role {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored === "treasury" || stored === "mm") {
      return stored;
    }
  } catch {
    return "treasury";
  }
  return "treasury";
}

let currentRole = readRole();
const roleListeners = new Set<(role: Role) => void>();

export function useRole(): [Role, (r: Role) => void] {
  const [role, setRoleState] = useState<Role>(currentRole);

  useEffect(() => {
    roleListeners.add(setRoleState);
    return () => {
      roleListeners.delete(setRoleState);
    };
  }, []);

  function setRole(next: Role) {
    currentRole = next;
    try {
      sessionStorage.setItem(KEY, next);
    } catch {
      // sessionStorage can be blocked. The in-memory role still switches.
    }
    roleListeners.forEach((listener) => listener(next));
  }

  return [role, setRole];
}

export function homeFor(role: Role): string {
  if (role === "mm") return "/trade";
  return "/desk";
}
