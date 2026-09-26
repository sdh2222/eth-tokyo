import sepoliaConfig from "@config";

// How long fills stay open after an oracle update. Main counts it in blocks: the program takes
// a fill while the oracle is at most maxBlocks old, and the book reader (ts/src/lib/book.ts)
// turns seconds into blocks at 12 s each, with the same 600 s as its MAX_AGE.
export const SECONDS_PER_BLOCK = 12;
export const PRICE_WINDOW_SECONDS = sepoliaConfig.desk.maxBlocks * SECONDS_PER_BLOCK;
