package simulation.generator;
import data.Camp;
import data.config.SimulationConfig;
import data.event_info.*;
import enums.DemandQuantityType;
import enums.DistributionType;
import enums.MigrationType;
import simulation.State;

import java.util.Objects;
import java.util.Random;

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
        if (demand.getDemandQuantityType() == DemandQuantityType.BATCH) {
            int count = 0;
            if (isInternal){
                for (int i = 0; i < campPopulation; i++){
                    if (rngDemand.nextDouble() < demand.getInternalRatio())
                        count++;
                }
            }
            else{
                for (int i = 0; i < campPopulation; i++){
                    if (rngDemand.nextDouble() < demand.getExternalRatio())
                        count++;
                }
                return count;
            }
        }
        return 1;
    }

    public int generateFundingAmount(Funding funding){
        return (int) Math.round(funding.getAmountData().distParameters.generate(this.rngFunding));
    }

    public int generateMigrationQuantity(State state, Migration migration){

        if (migration.getMigrationType() == MigrationType.EXTERNAL_TO_SYSTEM || migration.getMigrationType() == MigrationType.INTERNAL_TO_SYSTEM){
            return (int) (migration.getQuantityData().distParameters.generate(this.rngMigration));
        }
        else if (migration.getMigrationType() == MigrationType.INTERNAL_FROM_SYSTEM || migration.getMigrationType() == MigrationType.INTERNAL_WITHIN_SYSTEM)
        {
            var population = state.getInternalPopulation().get(migration.getFromCamp());
            int count = 0;
            for (int i = 0; i < population; i++){
                if (rngMigration.nextDouble() < migration.getMigrationRatio())
                    count++;
            }
            return count;
        }
        else if (migration.getMigrationType() == MigrationType.EXTERNAL_FROM_SYSTEM || migration.getMigrationType() == MigrationType.EXTERNAL_WITHIN_SYSTEM)
        {
            var population = state.getExternalPopulation().get(migration.getFromCamp());
            int count = 0;
            for (int i = 0; i < population; i++){
                if (rngMigration.nextDouble() < migration.getMigrationRatio())
                    count++;
            }
            return count;
        }
        else {
            return 0;
        }
    }
}


