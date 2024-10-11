package data.distribution;

import java.util.Random;

public class DistNormal implements IDist {
    private double mean;
    private double stdDev;

    public DistNormal(double mean, double stdDev) {
        this.mean = mean;
        this.stdDev = stdDev;
    }

    public double generate(Random rng) {
        double value;
        do {
            value = rng.nextGaussian() * this.stdDev + this.mean;
        } while (value < 0);
        return value;
    }

    public double getMean() {
        return this.mean;
    }

}
