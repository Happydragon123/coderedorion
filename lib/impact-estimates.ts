export const IMPACT_ASSUMPTIONS = {
  poundsPerPortion: 0.5,
  poundsPerMealEquivalent: 1.2,
} as const;

export function estimateCollectedImpact(collectedPortions: number) {
  if (!Number.isInteger(collectedPortions) || collectedPortions < 0) {
    throw new RangeError('Collected portions must be a nonnegative integer');
  }

  const poundsRedistributed = collectedPortions * IMPACT_ASSUMPTIONS.poundsPerPortion;

  return {
    poundsRedistributed,
    mealEquivalents: poundsRedistributed / IMPACT_ASSUMPTIONS.poundsPerMealEquivalent,
  };
}
