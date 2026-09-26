export async function deployLocal(rpc: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "forge",
      ["script", "script/Deploy.s.sol", "--rpc-url", rpc, "--broadcast"],
      {
        cwd: new URL("../../../contracts", import.meta.url),
        env: { ...process.env, DEPLOYER_PK: anvilKey() },
      },
    );
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`forge script exited ${code}`)),
    );
  });
}

function anvilKey(): string {
  return "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
}
