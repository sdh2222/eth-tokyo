export type WizardState = {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  targetPct: number;
  kappa: 100 | 200 | 400;
  sMin: number;
  sMax: number;
  maxAgeSec: number;
  ttlDays: number;
  weth: string;
  usdc: string;
};

export const INITIAL_WIZARD: WizardState = {
  step: 1,
  targetPct: 70,
  kappa: 200,
  sMin: 5,
  sMax: 200,
  maxAgeSec: 3600,
  ttlDays: 30,
  weth: "900",
  usdc: "400000",
};
