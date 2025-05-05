export interface Item {
  name: string;
  isPerishable: boolean;
  price: string;
  orderingCost: string;
  holdingCost: string;
  deprivationRate: string;
  deprivationCoefficient: string;
  referralCost: string;
  leadTimeData: {
    distributionType:
      | "TRIANGULAR"
      | "EXPONENTIAL"
      | "BERNOULLI"
      | "FIXED"
      | "NORMAL"
      | "EQUAL_SHARE"
      | "UNIFORM";
    distParameters: DistParameters;
  };
  durationData?: {
    distributionType: "UNIFORM" | "NORMAL";
    distParameters: DistParameters;
  };
}

// Create a discriminated union type for different distribution parameters
export type DistParameters =
  | { min: string; mode: string; max: string } // TRIANGULAR
  | { mean: string } // EXPONENTIAL, FIXED, EQUAL_SHARE
  | { mean: string; arrivalInterval: string; initialArrival: boolean } // BERNOULLI
  | { min: string; max: string } // UNIFORM
  | { mean: string; stdDev: string }; // NORMAL
