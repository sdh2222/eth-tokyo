import { createFixture } from "./state";

const fixture = {
  qa: createFixture("qa"),
  demo: createFixture("demo"),
};

export function fixturePort(which: "qa" | "demo") {
  return fixture[which].port;
}

export function fixtureBlock(which: "qa" | "demo"): bigint {
  return fixture[which].block();
}

export function applyShip(which: "qa" | "demo" = import.meta.env.VITE_FIXTURE === "demo" ? "demo" : "qa") {
  fixture[which].applyShip();
}

export function dockDesk(which: "qa" | "demo" = import.meta.env.VITE_FIXTURE === "demo" ? "demo" : "qa") {
  fixture[which].dock();
}

export function seedTwoDesks(which: "qa" | "demo" = import.meta.env.VITE_FIXTURE === "demo" ? "demo" : "qa") {
  fixture[which].seedTwo();
}

export function seedOneFill(which: "qa" | "demo" = import.meta.env.VITE_FIXTURE === "demo" ? "demo" : "qa") {
  return fixture[which].seedFill();
}

export function setOracle(
  answer: number,
  updatedAt: number,
  which: "qa" | "demo" = import.meta.env.VITE_FIXTURE === "demo" ? "demo" : "qa",
) {
  fixture[which].setOracle(BigInt(Math.trunc(answer)), updatedAt);
}
