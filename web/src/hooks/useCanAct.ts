import { useAccount, useChainId } from "wagmi";
import { useRole } from "../app/role";

const SEPOLIA = 11155111;

export function useCanAct(): {
  wrongNetwork: boolean;
  isOwner: boolean;
  isMm: boolean;
  isDeployer: boolean;
  readOnlyTreasury: boolean;
} {
  const account = useAccount();
  const configChainId = useChainId();
  const chainId =
    account.status === "connected" && account.chainId != null ? account.chainId : configChainId;
  const [role] = useRole();
  const isOwner = false;
  const wrongNetwork = account.status === "connected" && chainId !== SEPOLIA;

  return {
    wrongNetwork,
    isOwner,
    isMm: false,
    isDeployer: false,
    readOnlyTreasury: role === "treasury" && account.status === "connected" && !isOwner,
  };
}
