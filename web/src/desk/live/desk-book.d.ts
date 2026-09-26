// Types for the book reader in ts/src/lib/book.ts (main, PR #29), aliased as @desk/book
// in vite.config.ts. Declared here so web's tsconfig does not type-check ts/.
declare module "@desk/book" {
  import type { DeskBook } from "../book";
  export function readBook(cfg: unknown, rpc: string): Promise<DeskBook>;
}
