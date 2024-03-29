package data.distribution;

import java.util.Random;

public class DistBernoulli implements IDist {
    public double mean;
    public double arrivalInterval;
    public boolean initialArrival;

    public DistBernoulli(){

    }
    public double generate(Random rng){
        double value = arrivalInterval;
        while (true){
            if (rng.nextDouble() < this.mean){
                return value;
            }
            else {
                value += this.arrivalInterval;
            }
        }
    }

    public double getMean(){
        return this.mean;
    }

}
