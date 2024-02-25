package simulation.generator;
import data.*;
import data.config.SimulationConfig;
import data.event_info.*;

import java.util.Random;

public class InterarrivalGenerator {
    private final Random rngDemand;
    private final Random rngFunding;
    private final Random rngSupplySwitch;
    private final Random rngMigration;
    private final Random rngItemDuration;
    private final Random rngReplenishment;
    private final Random rngTransferTime;
    private final Random rngTransshipmentTime;

    public InterarrivalGenerator(SimulationConfig simulationConfig) {
        this.rngDemand = new Random(simulationConfig.getSeedDemandTime());
        this.rngFunding = new Random(simulationConfig.getSeedFundingTime());
        this.rngSupplySwitch = new Random(simulationConfig.getSeedSupplyDisruptionTime());
        this.rngMigration = new Random(simulationConfig.getSeedMigrationTime());
        this.rngItemDuration = new Random(simulationConfig.getSeedItemDuration());
        this.rngReplenishment = new Random(simulationConfig.getSeedReplenishmentTime());
        this.rngTransferTime = new Random(simulationConfig.getSeedTransferTime());
        this.rngTransshipmentTime = new Random(simulationConfig.getSeedTransshipmentTime());
    }
    public double generateDemand(Demand demand) {
        return demand.getArrivalData().distParameters.generate(this.rngDemand);
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
    public double genereteItemDuration(Item item){
        return item.getDurationData().distParameters.generate(this.rngReplenishment);
    }
    public double generateReplenishment(Item item){
        return item.getLeadTimeData().distParameters.generate(this.rngReplenishment);
    }
    public double generateTransferTime(Camp camp){
        return camp.getLeadTimeData().distParameters.generate(this.rngTransferTime);
    }
    public double generateTransshipmentTime(Transshipment transshipment){
        return transshipment.getLeadTimeData().distParameters.generate(this.rngTransshipmentTime);
    }

}

