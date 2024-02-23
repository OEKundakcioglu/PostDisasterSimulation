package data.distribution;

import java.util.Random;

public class DistTriangular implements IDist {
    public double min,max,mode, mean;

    public DistTriangular(){
    }

    public double generate(Random rng) {
        double u = rng.nextDouble();
        double c = (this.mode - this.min) / (this.max - this.min);
        if (u <= c) {
            return this.min + Math.sqrt(u * (this.max - this.min) * (this.mode - this.min));
        } else {
            return this.max - Math.sqrt((1 - u) * (this.max - this.min) * (this.max - this.mode));
        }
    }

    public double getMean(){
        return (min + max + mode) / 3;
    }
}
