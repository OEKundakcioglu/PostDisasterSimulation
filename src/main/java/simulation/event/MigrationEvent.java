package simulation.event;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import data.Camp;
import data.Item;
import data.event_info.Migration;
import enums.MigrationType;
import simulation.State;
import simulation.decision.TargetLevelPolicy;
import simulation.generator.InterarrivalGenerator;

public class MigrationEvent implements IEvent {

    public State state;
    public Migration migration;
    public Camp fromCamp;
    public Camp toCamp;
    public MigrationType migrationType;
    public double time;


    public MigrationEvent(State state, Migration migration, InterarrivalGenerator interarrivalGenerator, double tNow) {
        this.state = state;
        this.migration = migration;
        this.fromCamp = migration.getFromCamp();
        this.toCamp = migration.getToCamp();
        this.migrationType = migration.getMigrationType();
        this.time = tNow + interarrivalGenerator.generateMigration(migration);
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }
    public double getTime() {
        return time;
    }

    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, simulation.generator.QuantityGenerator quantityGenerator) {
        // Migration is demand-based: update effective demand rates per camp/item/demandClass
        if (this.migration == null) return null;
        if ((this.migrationType == MigrationType.INTERNAL_WITHIN_SYSTEM || this.migrationType == MigrationType.EXTERNAL_WITHIN_SYSTEM)
                && (this.fromCamp == null || this.toCamp == null)) {
            System.err.println("Warning: MigrationEvent has null camps. fromCamp: " + this.fromCamp + ", toCamp: " + this.toCamp + ". Skipping migration.");
            return null;
        }
        double demandRatio = this.migration.getDemandRatio();
        if (demandRatio <= 0 || demandRatio > 1) return null;

        if (state.getKpiManager().isReportEvents())
            System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime() + " Demand ratio: " + demandRatio);

        var policy = state.getInventoryPolicy();
        Map<Camp, Map<Item, Double>> oldRates = null;
        List<Camp> affectedCamps = null;
        if (policy instanceof TargetLevelPolicy tlp) {
            affectedCamps = getAffectedCamps();
            if (affectedCamps != null && !affectedCamps.isEmpty()) {
                oldRates = new HashMap<>();
                for (Camp camp : state.getEnvironment().getCamps()) {
                    Map<Item, Double> byItem = new HashMap<>();
                    for (Item item : state.getEnvironment().getItems()) {
                        byItem.put(item, tlp.getDailyDemandRate(camp, item));
                    }
                    oldRates.put(camp, byItem);
                }
            }
        }

        state.updateDemandRates(this.migration, demandRatio);

        if (policy instanceof TargetLevelPolicy tlp && affectedCamps != null && oldRates != null) {
            Map<Camp, Map<Item, Double>> newRates = new HashMap<>();
            for (Camp camp : state.getEnvironment().getCamps()) {
                Map<Item, Double> byItem = new HashMap<>();
                for (Item item : state.getEnvironment().getItems()) {
                    byItem.put(item, tlp.getDailyDemandRate(camp, item));
                }
                newRates.put(camp, byItem);
            }
            tlp.scaleTargetLevelsForMigration(affectedCamps, oldRates, newRates);
        }
        return null;
    }

    private List<Camp> getAffectedCamps() {
        if (migrationType == MigrationType.INTERNAL_WITHIN_SYSTEM || migrationType == MigrationType.EXTERNAL_WITHIN_SYSTEM) {
            if (fromCamp != null && toCamp != null) {
                return List.of(fromCamp, toCamp);
            }
        } else if (migrationType == MigrationType.INTERNAL_TO_SYSTEM || migrationType == MigrationType.EXTERNAL_TO_SYSTEM) {
            if (toCamp != null) return List.of(toCamp);
        } else if (migrationType == MigrationType.INTERNAL_FROM_SYSTEM || migrationType == MigrationType.EXTERNAL_FROM_SYSTEM) {
            if (fromCamp != null) return List.of(fromCamp);
        }
        return null;
    }
}














