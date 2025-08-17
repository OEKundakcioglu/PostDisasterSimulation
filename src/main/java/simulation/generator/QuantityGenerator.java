package simulation.generator;
import java.util.Random;

import data.config.SimulationConfig;
import data.event_info.Demand;
import data.event_info.Funding;
import data.event_info.Migration;
import enums.DemandQuantityType;
import simulation.State;

public class QuantityGenerator {
    public final Random rngDemand;
    private final Random rngFunding;
    private final Random rngMigration;

    public QuantityGenerator(SimulationConfig simulationConfig){
        this.rngDemand = new Random(simulationConfig.getSeedDemandQuantity());
        this.rngFunding = new Random(simulationConfig.getSeedFundingAmount());
        this.rngMigration = new Random(simulationConfig.getSeedMigrationQuantity());
    }

    public int generateDemandQuantity(Demand demand, int campPopulation, boolean isInternal){
        if (demand == null) return 0;
        if (demand.getDemandQuantityType() != DemandQuantityType.BATCH) {
            return 1; // SINGLE demand => quantity always 1 (could extend later)
        }
        if (campPopulation <= 0) return 0;
        double p = isInternal ? demand.getInternalRatio() : demand.getExternalRatio();
        return sampleBinomialApprox(campPopulation, p, this.rngDemand);
    }

    public int generateFundingAmount(Funding funding){
        return (int) Math.round(funding.getAmountData().distParameters.generate(this.rngFunding));
    }

    public int generateMigrationQuantity(State state, Migration migration){
        if (migration == null) return 0;
        switch (migration.getMigrationType()) {
            case EXTERNAL_TO_SYSTEM:
            case INTERNAL_TO_SYSTEM:
                return (int) (migration.getQuantityData().distParameters.generate(this.rngMigration));
            case INTERNAL_FROM_SYSTEM:
            case INTERNAL_WITHIN_SYSTEM: {
                Integer population = state.getInternalPopulation().get(migration.getFromCamp());
                if (population == null || population <= 0) return 0;
                return sampleBinomialApprox(population, migration.getMigrationRatio(), this.rngMigration);
            }
            case EXTERNAL_FROM_SYSTEM:
            case EXTERNAL_WITHIN_SYSTEM: {
                Integer population = state.getExternalPopulation().get(migration.getFromCamp());
                if (population == null || population <= 0) return 0;
                return sampleBinomialApprox(population, migration.getMigrationRatio(), this.rngMigration);
            }
            default:
                return 0;
        }
    }

    // Fast approximate binomial sampler (mirrors logic in Simulate) to avoid O(n) loops.
    private static int sampleBinomialApprox(int n, double p, Random rng) {
        if (p <= 0) return 0;
        if (p >= 1) return n;
        if (n < 5000) {
            int c = 0; for (int i=0;i<n;i++) if (rng.nextDouble() < p) c++; return c; }
        double mean = n * p;
        double var = mean * (1 - p);
        double std = Math.sqrt(var);
        double u1 = rng.nextDouble();
        double u2 = rng.nextDouble();
        double z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        int val = (int)Math.round(mean + std * z);
        if (val < 0) val = 0; else if (val > n) val = n;
        return val;
    }
}


