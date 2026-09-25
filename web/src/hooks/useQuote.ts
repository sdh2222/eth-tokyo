import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import type { Address, QuoteInput, StrategyInfo } from "../desk/types";
import { useDeskPort } from "./useDesk";
import { emptyConfig } from "../desk/fixture/state";

export function useQuote(input: {
  strategy: StrategyInfo | null;
  mm: Address | null;
  side: "buy" | "sell";
  leg: "weth" | "usdc";
  amount: bigint | null;
}) {
  const port = useDeskPort();
  const client = usePublicClient();
  const [amount, setAmount] = useState(input.amount);
  const [side, setSide] = useState(input.side);
  const [leg, setLeg] = useState(input.leg);
  const [mm, setMm] = useState(input.mm);
  const [left, setLeft] = useState(15);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAmount(input.amount);
      setSide(input.side);
      setLeg(input.leg);
      setMm(input.mm);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [input.amount, input.side, input.leg, input.mm]);

  const query = useQuery({
    queryKey: ["quote", input.strategy?.strategyHash, mm, side, leg, amount?.toString()],
    queryFn: () => {
      if (!input.strategy || !mm || amount === null) throw new Error("quote missing");
      const q: QuoteInput = { mm, side, leg, amount };
      return port.quoteFor({ client, cfg: emptyConfig() }, input.strategy, q);
    },
    enabled: input.strategy !== null && mm !== null && amount !== null,
  });

  useEffect(() => {
    if (!query.dataUpdatedAt) return;
    setLeft(15);
    const timer = window.setInterval(() => {
      setLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [query.dataUpdatedAt]);

  return { ...query, secondsLeft: left };
}
