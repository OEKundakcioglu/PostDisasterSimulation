package data.distribution;

import java.util.Random;

public class DistUniform implements IDist {
    public double min,max,mean;

    public DistUniform(){

    }

    public double generate(Random rng){
        return rng.nextDouble() * (this.max - this.min) + this.min;
    }

    public double getMean(){
        return (min + max) / 2;
    }
}
