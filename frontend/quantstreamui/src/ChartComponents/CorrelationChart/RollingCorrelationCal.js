export function calculateCorrelation(x, y) {
  // 1. Basic validation
  if (!x || !y || x.length !== y.length || x.length === 0) {
    return null; // Cannot calculate if arrays are invalid or different lengths
  }

  const n = x.length;

  // 2. Calculate the sums required by the formula
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXSquare = 0;
  let sumYSquare = 0;

  for (let i = 0; i < n; i++) {
    const currentX = x[i];
    const currentY = y[i];

    sumX += currentX;
    sumY += currentY;
    sumXY += currentX * currentY;
    sumXSquare += currentX * currentX;
    sumYSquare += currentY * currentY;
  }

  // 3. Calculate the numerator
  const numerator = n * sumXY - sumX * sumY;

  // 4. Calculate the denominator
  const denominatorPart1 = n * sumXSquare - sumX * sumX;
  const denominatorPart2 = n * sumYSquare - sumY * sumY;

  const denominator = Math.sqrt(denominatorPart1 * denominatorPart2);

  // 5. Final calculation and edge case handling
  if (denominator === 0) {
    // This happens if all X values are the same or all Y values are the same.
    // The correlation is undefined, so we return 0 or null.
    return 0;
  }

  const correlation = numerator / denominator;

  return correlation;
}
