// Validation helpers for simulation input
// Extracted / refactored from original InputParameters component logic.

import { DistBlock, DistParams } from "./types";

/**
 * Validate a stochastic distribution specification.
 * Returns list of human-readable issue strings (empty if none).
 */
export const validateDistribution = (
  block: DistBlock | undefined,
  ctx: string,
  required: (keyof DistParams)[] = []
): string[] => {
  const errs: string[] = [];
  if (!block) {
    errs.push(`${ctx}: distribution missing`);
    return errs;
  }
  const dt = block.distributionType;
  if (!dt) errs.push(`${ctx}: distributionType missing`);
  const p = block.distParameters || {};

  // For these types a mean is generally required.
  const needMean = [
    "EXPONENTIAL",
    "FIXED",
    "EQUAL_SHARE",
    "NORMAL",
    "BERNOULLI",
  ].includes(dt);
  if (needMean && (p.mean === undefined || p.mean === ""))
    errs.push(`${ctx}: mean missing`);

  switch (dt) {
    case "TRIANGULAR": {
      (["min", "mode", "max"] as (keyof DistParams)[]).forEach((k) => {
        const val = p[k];
        if (val === undefined || val === "") errs.push(`${ctx}: ${k} missing`);
      });
      const { min, mode, max } = p;
      if (min !== undefined && mode !== undefined && max !== undefined) {
        const nMin = Number(min),
          nMode = Number(mode),
          nMax = Number(max);
        if ([nMin, nMode, nMax].some((v) => isNaN(v)))
          errs.push(`${ctx}: triangular params must be numeric`);
        else if (!(nMin <= nMode && nMode <= nMax))
          errs.push(`${ctx}: require min <= mode <= max`);
      }
      break;
    }
    case "UNIFORM": {
      (["min", "max"] as (keyof DistParams)[]).forEach((k) => {
        const val = p[k];
        if (val === undefined || val === "") errs.push(`${ctx}: ${k} missing`);
      });
      const { min, max } = p;
      if (min !== undefined && max !== undefined) {
        const nMin = Number(min),
          nMax = Number(max);
        if (isNaN(nMin) || isNaN(nMax))
          errs.push(`${ctx}: uniform params must be numeric`);
        else if (nMin > nMax) errs.push(`${ctx}: min must be <= max`);
      }
      break;
    }
    case "NORMAL": {
      if (p.stdDev === undefined || p.stdDev === "")
        errs.push(`${ctx}: stdDev missing`);
      if (
        p.stdDev !== undefined &&
        (isNaN(Number(p.stdDev)) || Number(p.stdDev) <= 0)
      )
        errs.push(`${ctx}: stdDev must be > 0`);
      if (p.mean !== undefined && (isNaN(Number(p.mean)) || Number(p.mean) < 0))
        errs.push(`${ctx}: mean must be >= 0`);
      break;
    }
    case "BERNOULLI": {
      if (p.mean !== undefined) {
        const mean = Number(p.mean);
        if (isNaN(mean) || mean < 0 || mean > 1)
          errs.push(`${ctx}: mean must be 0-1`);
      }
      if (
        p.arrivalInterval !== undefined &&
        (isNaN(Number(p.arrivalInterval)) || Number(p.arrivalInterval) <= 0)
      )
        errs.push(`${ctx}: arrivalInterval must be > 0`);
      break;
    }
    case "EXPONENTIAL":
    case "FIXED":
    case "EQUAL_SHARE": {
      if (p.mean !== undefined && (isNaN(Number(p.mean)) || Number(p.mean) < 0))
        errs.push(`${ctx}: mean must be >= 0`);
      break;
    }
    default:
      break; // Unknown types tolerated; caller may further validate.
  }

  // Generic caller-specified required params.
  required.forEach((rk) => {
    const val = p[rk];
    if (val === undefined || val === "") errs.push(`${ctx}: ${rk} missing`);
  });

  return errs;
};

export default validateDistribution;
