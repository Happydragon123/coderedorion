import assert from 'node:assert/strict';
import test from 'node:test';
import { estimateCollectedImpact, IMPACT_ASSUMPTIONS } from '../lib/impact-estimates';

test('impact estimates use the documented project-wide averages', () => {
  assert.deepEqual(IMPACT_ASSUMPTIONS, {
    poundsPerPortion: 0.5,
    poundsPerMealEquivalent: 1.2,
  });
  assert.deepEqual(estimateCollectedImpact(0), {
    poundsRedistributed: 0,
    mealEquivalents: 0,
  });
  assert.deepEqual(estimateCollectedImpact(12), {
    poundsRedistributed: 6,
    mealEquivalents: 5,
  });
  assert.deepEqual(estimateCollectedImpact(1), {
    poundsRedistributed: 0.5,
    mealEquivalents: 0.5 / 1.2,
  });
});

test('impact estimates reject invalid collection totals', () => {
  assert.throws(() => estimateCollectedImpact(-1), /nonnegative integer/);
  assert.throws(() => estimateCollectedImpact(1.5), /nonnegative integer/);
  assert.throws(() => estimateCollectedImpact(Number.NaN), /nonnegative integer/);
});
