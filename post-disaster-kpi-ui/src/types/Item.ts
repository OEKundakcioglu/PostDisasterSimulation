export interface Item {
  name: string;
  isPerishable: boolean;
  price: string;
  orderingCost: string;
  holdingCost: string;
  deprivationRate: string;
  deprivationCoefficient: string;
  referralCost: string;
  durationData?: {
    distributionType: string;
    distParameters: {
      min: string;
      max: string;
    };
  };
  leadTimeData: {
    distributionType: string;
    distParameters: {
      min?: string;
      mode?: string;
      max?: string;
      mean?: string;
    };
  };
}
