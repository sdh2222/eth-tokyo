import { useQuery } from "@tanstack/react-query";
import sepoliaConfig from "@config";
import { readBook } from "@desk/book";
import { fixtureBook, type DeskBook } from "../desk/book";
import { NOW } from "../desk/fixture/state";

const live = import.meta.env.VITE_DESK_MODE === "live";
const RPC = import.meta.env.VITE_SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

// The desk book every page reads. Live mode runs ts/src/lib/book.ts readBook against
// Sepolia every 15 s; fixture mode serves the agent-design.md worked example.
export function useBook() {
  return useQuery<DeskBook>({
    queryKey: ["book", live ? "live" : "fixture"],
    queryFn: () => (live ? readBook(sepoliaConfig, RPC) : Promise.resolve(fixtureBook(NOW))),
    refetchInterval: live ? 15_000 : false,
  });
}
