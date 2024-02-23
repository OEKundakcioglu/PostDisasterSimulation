package simulation.event;

import data.Camp;
import data.event_info.Migration;
import enums.DemandTimingType;
import enums.MigrationType;
import simulation.KPIManager;
import simulation.State;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public class MigrationEvent implements IEvent {

    public State state;
    public Migration migration;
    public Camp fromCamp;
    public Camp toCamp;
    public MigrationType migrationType;
    public double time;
    public int quantity;


    public MigrationEvent(State state, Migration migration, InterarrivalGenerator interarrivalGenerator,
                          QuantityGenerator quantityGenerator, double tNow) {
        this.state = state;
        this.migration = migration;
        this.fromCamp = migration.getFromCamp();
        this.toCamp = migration.getToCamp();
        this.migrationType = migration.getMigrationType();
        this.time = tNow + interarrivalGenerator.generateMigration(migration);
        this.quantity = quantityGenerator.generateMigrationQuantity(state, migration);
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }
    public double getTime() {
        return time;
    }

    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator) {

        ArrayList<IEvent> returnEvents = new ArrayList<>();

        // Report what it is
        System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime() + " Quantity: " +
                this.quantity);

        // Update the state (camp inventories)
        state.updatePopulation(this.fromCamp, this.toCamp, this.quantity, this.migrationType);

        // Generate Event
        MigrationEvent migrationEvent = new MigrationEvent(state, this.migration, interarrivalGenerator,
                                                            quantityGenerator, this.getTime());

        returnEvents.add(migrationEvent);

        return returnEvents;
    }
}














