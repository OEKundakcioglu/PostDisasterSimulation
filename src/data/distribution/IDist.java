package data.distribution;
import java.util.Random;

public interface IDist {

    public double mean = 0;

    public double generate(Random rng);

    public double getMean();

}
