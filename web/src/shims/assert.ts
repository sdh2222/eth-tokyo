// A browser stand-in for Node's assert, aliased in vite.config.ts. @1inch/swap-vm-sdk and
// @1inch/byte-utils (behind main's quoteFor, ts/src/lib/client/quote.ts) only call assert(cond, msg)
// and assert.ok; Vite would otherwise swap the Node builtin for an empty module that throws.
function assert(value: unknown, message?: string | Error): asserts value {
  if (!value) throw message instanceof Error ? message : new Error(message ?? "Assertion failed");
}

assert.ok = assert;
assert.strict = assert;
assert.equal = (actual: unknown, expected: unknown, message?: string) => assert(actual == expected, message);
assert.strictEqual = (actual: unknown, expected: unknown, message?: string) => assert(actual === expected, message);

export default assert;
export { assert as ok, assert as strict };
