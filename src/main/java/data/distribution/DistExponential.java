package data.distribution;

import java.util.Random;

public class DistExponential implements IDist {
    public double mean;

    public DistExponential() {

    }

    public double generate(Random rng){
        return -Math.log(1.0 - rng.nextDouble()) / this.mean;
    }

    public double getMean(){
        return this.mean;
    }
}
