import { getAddress, isAddress } from "viem";
import { useAccount, useChainId, useReadContract } from "wagmi";
import sepoliaConfig from "@config";
import { useRole } from "../app/role";
import type { DeskConfig } from "../desk/types";
import { FIXTURE_DEPLOYER, FIXTURE_MMS, FIXTURE_OWNERS } from "../desk/fixture/state";

const SEPOLIA = 11155111;
const live = import.meta.env.VITE_DESK_MODE === "live";
const cfg = sepoliaConfig as DeskConfig;
const getOwnersAbi = [
  { type: "function", name: "getOwners", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
] as const;

// The Safe's owners (live: read from the Safe; fixture: the fixture owners).
export function useSafeOwners(): readonly string[] {
  const owners = useReadContract({
    address: cfg.safe as `0x${string}`,
    abi: getOwnersAbi,
    functionName: "getOwners",
    query: { enabled: live && isAddress(cfg.safe) },
  });
  return live ? (owners.data ?? []) : FIXTURE_OWNERS;
}

// The desk's client names (live: config/sepolia.json mms; fixture: the fixture names).
function clientNames(): readonly { name: string; address: string }[] {
  return live ? cfg.mms : FIXTURE_MMS;
}

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
  const owners = useSafeOwners();
  const isOwner = account.address !== undefined && owners.some((owner) => sameAddress(owner, account.address));
  const isMm =
    account.address !== undefined && clientNames().some((mm) => sameAddress(mm.address, account.address));
  const isDeployer = account.address !== undefined && sameAddress(FIXTURE_DEPLOYER, account.address);
  const wrongNetwork = account.status === "connected" && chainId !== SEPOLIA;

  return {
    wrongNetwork,
    isOwner,
    isMm,
    isDeployer,
    readOnlyTreasury: role === "treasury" && account.status === "connected" && !isOwner,
  };
}

export function labelFor(
  address: string,
  owners: readonly string[],
  mms: readonly { name: string; address: string }[],
): string {
  const ownerIndex = owners.findIndex((owner) => sameAddress(owner, address));
  if (ownerIndex >= 0) return `Safe owner ${ownerIndex + 1}/3`;
  const mm = mms.find((item) => sameAddress(item.address, address));
  if (mm) return mm.name;
  return "Not on the desk";
}

export function useWalletLabel(): string {
  const { address, status } = useAccount();
  const owners = useSafeOwners();
  if (status !== "connected" || !address) return "";
  return labelFor(address, owners, clientNames());
}

function sameAddress(left: string | undefined, right: string | undefined): boolean {
  if (!left || !right || !isAddress(left) || !isAddress(right)) return false;
  return getAddress(left) === getAddress(right);
}
