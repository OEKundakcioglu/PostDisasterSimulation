package data.distribution;

import java.util.Random;

public class DistEqualShare implements IDist {
    public double mean;
    public int totalCount;


    public DistEqualShare() {

    }

    @Override
    public double generate(Random rng) {
        return mean;
    }

    public double getMean() {
        return this.mean;
    }
}
