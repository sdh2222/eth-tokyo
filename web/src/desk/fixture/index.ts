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
