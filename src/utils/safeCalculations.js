/**
 * Safe calculation utilities to prevent floating point errors and NaN issues
 */

/**
 * Safely convert value to number, returning 0 if invalid
 */
export function safeNumber(val) {
  const num = Number(val);
  return isNaN(num) || !isFinite(num) ? 0 : num;
}

/**
 * Round number to specified decimal places with proper rounding
 */
export function roundToDecimal(num, decimals = 1) {
  if (!isFinite(num)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Safely divide with divisor, handling edge cases
 */
export function safeDivide(value, divisor) {
  const num = safeNumber(value);
  if (divisor === 0) return 0;
  return num / divisor;
}

/**
 * Safely sum array of numbers, filtering out NaN values
 */
export function safeSum(arr) {
  return arr.reduce((sum, val) => {
    const num = safeNumber(val);
    return sum + num;
  }, 0);
}

/**
 * Calculate weight from input value with proper validation
 */
export function calculateWeight(
  inputValue,
  digitDivisor,
  maxWeightPerBag = 200,
) {
  const num = safeNumber(inputValue);
  const weight = safeDivide(num, digitDivisor);

  // Validate range
  if (weight > maxWeightPerBag) {
    console.warn(`Weight ${weight} exceeds max ${maxWeightPerBag} kg`);
    return maxWeightPerBag;
  }

  return weight;
}

/**
 * Calculate total amount with overflow protection
 */
export function calculateAmount(unitPrice, netWeight) {
  const MAX_SAFE_AMOUNT = 1_000_000_000_000; // 1 trillion

  const price = safeNumber(unitPrice);
  const weight = safeNumber(netWeight);
  const amount = price * weight;

  if (amount > MAX_SAFE_AMOUNT) {
    console.warn('Amount exceeds safe limit');
    return MAX_SAFE_AMOUNT;
  }

  return roundToDecimal(amount, 0); // Round to whole number for money
}

/**
 * Validate input value
 */
export function validateWeight(value, maxDigits) {
  const num = safeNumber(value);
  const divisor = maxDigits === 4 ? 100 : 10;
  const kg = safeDivide(num, divisor);

  if (kg > 200) {
    return { valid: false, error: 'Khối lượng vượt quá 200 kg' };
  }

  return { valid: true, value: num };
}

/**
 * Validate unit price
 */
export function validateUnitPrice(value) {
  const num = safeNumber(value);

  if (num < 0) {
    return { valid: false, error: 'Giá phải lớn hơn 0' };
  }

  if (num > 1000000) {
    return { valid: false, error: 'Giá quá lớn' };
  }

  return { valid: true, value: num };
}
