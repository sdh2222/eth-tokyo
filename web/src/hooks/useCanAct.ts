import { getAddress, isAddress } from "viem";
import { useAccount, useChainId } from "wagmi";
import { useRole } from "../app/role";
import { FIXTURE_DEPLOYER, FIXTURE_MMS, FIXTURE_OWNERS } from "../desk/fixture/state";

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
  const isOwner = account.address !== undefined && FIXTURE_OWNERS.some((owner) => sameAddress(owner, account.address));
  const isMm =
    account.address !== undefined && FIXTURE_MMS.some((mm) => sameAddress(mm.address, account.address));
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
  if (status !== "connected" || !address) return "";
  return labelFor(address, FIXTURE_OWNERS, FIXTURE_MMS);
}

function sameAddress(left: string | undefined, right: string | undefined): boolean {
  if (!left || !right || !isAddress(left) || !isAddress(right)) return false;
  return getAddress(left) === getAddress(right);
}
