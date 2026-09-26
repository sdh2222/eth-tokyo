import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { readEnsDesk } from "../ens/read";

export function useEnsDesk() {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["ens-desk"],
    queryFn: () => readEnsDesk(client!),
    enabled: client !== undefined,
  });
}
