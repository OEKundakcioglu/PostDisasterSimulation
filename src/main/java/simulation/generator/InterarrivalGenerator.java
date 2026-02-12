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
import simulation.State;

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
    /**
     * Generates the next demand interarrival time from the demand's arrival distribution or effective mean.
     * Uses effective mean interarrival (modified by migration) if present in state; otherwise base from demand config.
     * Input mean is in minutes; returns time in simulation units (days).
     */
    public double generateDemand(State state, Camp camp, Demand demand) {
        Double effectiveMean = state != null && camp != null ? state.getEffectiveMeanInterarrivalMinutes(camp, demand) : null;
        double baseInterarrivalMinutes = demand.getArrivalData().distParameters.generate(this.rngDemand);
        if (effectiveMean != null && effectiveMean > 0) {
            double baseMean = demand.getArrivalData().getDistParameters().getMean();
            if (baseMean > 0) {
                baseInterarrivalMinutes *= (effectiveMean / baseMean);
            }
        }
        return baseInterarrivalMinutes / 1440.0;
    }

    /**
     * Legacy overload: uses base demand config only (no effective mean from migration).
     */
    public double generateDemand(Demand demand) {
        double baseInterarrivalMinutes = demand.getArrivalData().distParameters.generate(this.rngDemand);
        return baseInterarrivalMinutes / 1440.0;
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

