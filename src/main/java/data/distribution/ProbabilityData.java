package data.distribution;

import enums.DistributionType;

public class ProbabilityData {
    public DistributionType distributionType;
    public IDist distParameters;

    public ProbabilityData(){

    }

    public ProbabilityData(DistributionType distributionType, IDist distParameters) {
        this.distributionType = distributionType;
        this.distParameters = distParameters;
    }

    public DistributionType getDistributionType() {
        return distributionType;
    }

    public void setDistributionType(DistributionType distributionType) {
        this.distributionType = distributionType;
    }

    public IDist getDistParameters() {
        return distParameters;
    }

    public void setDistParameters(IDist distParameters) {
        this.distParameters = distParameters;
    }
}