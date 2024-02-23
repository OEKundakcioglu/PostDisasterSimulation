package data.distribution;

import java.util.Random;

public class DistNormal implements IDist {
    public double mean;
    public double stdDev;

    public DistNormal(){

    }

    public double generate(Random rng){
        return rng.nextGaussian() * this.stdDev + this.mean;
    }

    public double getMean(){
        return this.mean;
    }
}
