package simulation.generator;
import java.util.Random;

import data.Camp;
import data.Environment;
import data.Item;
import data.config.SimulationConfig;
import data.event_info.Demand;
import data.event_info.Funding;
import data.event_info.Migration;
import data.event_info.SupplyStatusSwitch;

public class InterarrivalGenerator {
    private final Random rngDemand;
    private final Random rngFunding;
    private final Random rngSupplySwitch;
    private final Random rngMigration;
    private final Random rngItemDuration;
    private final Random rngReplenishment;
    private final Random rngTransferTime;

    public InterarrivalGenerator(SimulationConfig simulationConfig) {
        this.rngDemand = new Random(simulationConfig.getSeedDemandTime());
        this.rngFunding = new Random(simulationConfig.getSeedFundingTime());
        this.rngSupplySwitch = new Random(simulationConfig.getSeedSupplyDisruptionTime());
        this.rngMigration = new Random(simulationConfig.getSeedMigrationTime());
        this.rngItemDuration = new Random(simulationConfig.getSeedItemDuration());
        this.rngReplenishment = new Random(simulationConfig.getSeedReplenishmentTime());
        this.rngTransferTime = new Random(simulationConfig.getSeedTransferTime());
    }
    public double generateDemand(Demand demand, int population) {
        // Base interarrival time from distribution (in minutes)
        double baseInterarrival = demand.getArrivalData().distParameters.generate(this.rngDemand);
        
        // Adjust interarrival time based on population: as population increases, demand arrives more frequently
        // Formula: adjusted_time = base_time / population_factor
        // This means higher population = shorter time between demands = higher demand rate
        if (population > 0) {
            // Normalize by a reference population (e.g., 100) to keep the base rate meaningful
            double populationFactor = population / 100.0;
            baseInterarrival = baseInterarrival / populationFactor;
        }
        
        return baseInterarrival / 1440.0; // Convert minutes to days
    }
    public double generateFunding(Funding funding) {
        return funding.getArrivalData().distParameters.generate(this.rngFunding);
    }
    public double generateMigration(Migration migration) {
        return migration.getArrivalData().distParameters.generate(this.rngMigration);
    }
    public double generateSupplyDisruption(SupplyStatusSwitch supplyStatusSwitch) {
        return supplyStatusSwitch.getDisruptionArrivalData().distParameters.generate(this.rngSupplySwitch);
    }
    public double generateSupplyDisruptionDuration(SupplyStatusSwitch supplyStatusSwitch) {
        return supplyStatusSwitch.getRecoveryArrivalData().distParameters.generate(this.rngSupplySwitch);
    }
    public double generateItemDuration(Item item){
        return item.getDurationData().distParameters.generate(this.rngItemDuration);
    }
    public double generateReplenishment(Item item){
        return item.getLeadTimeData().distParameters.generate(this.rngReplenishment);
    }
    public double generateTransferTime(Camp camp, Item item, Environment environment){
        Demand demand = environment.getCorrespondingDemand(item, camp);
        if (demand == null || demand.getLeadTimeData() == null) {
            // Fallback to 0 if no demand or lead time data exists
            return 0.0;
        }
        return demand.getLeadTimeData().distParameters.generate(this.rngTransferTime);
    }

    public Random getRngDemand() {
        return rngDemand;
    }
}

