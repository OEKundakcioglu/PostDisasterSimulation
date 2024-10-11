package data.distribution;

import java.util.Random;

public class DistFixed implements IDist{
    public double mean;

    public DistFixed(){

    }

    public double generate(Random rng){
        return this.mean;
    }

    public double getMean(){
        return this.mean;
    }
}
