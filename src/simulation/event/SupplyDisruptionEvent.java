package simulation.event;

import data.event_info.SupplyStatusSwitch;
import data.Item;
import simulation.KPIManager;
import simulation.State;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public class SupplyDisruptionEvent implements IEvent {
    public SupplyStatusSwitch supplyStatusSwitch;

    public Item item;
    double time;

    public SupplyDisruptionEvent(SupplyStatusSwitch supplyStatusSwitch,
                                 InterarrivalGenerator interarrivalGenerator, double tNow) {
        this.supplyStatusSwitch = supplyStatusSwitch;
        this.item = supplyStatusSwitch.getItem();
        this.time = tNow + interarrivalGenerator.generateSupplyDisruption(supplyStatusSwitch);
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }
    public double getTime() {
        return time;
    }

    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator,
                                                         QuantityGenerator quantityGenerator) {

        ArrayList<IEvent> returnEvents = new ArrayList<>();

        // Trigger the recovery event
        SupplyRecoveryEvent recoveryEvent = new SupplyRecoveryEvent(this.supplyStatusSwitch, interarrivalGenerator, this.getTime());
        returnEvents.add(recoveryEvent);

        // Report what it is
        System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime()
                + " Total Disruption Time for " + this.item.getName() + ": " + (recoveryEvent.getTime() - this.getTime()));

        // Update the state (camp inventories)
        state.updateItemAvailability(this.item, false);

        // Generate new event
        SupplyDisruptionEvent newEvent = new SupplyDisruptionEvent(this.supplyStatusSwitch, interarrivalGenerator, this.getTime());
        returnEvents.add(newEvent);

        return returnEvents;

    }
}
