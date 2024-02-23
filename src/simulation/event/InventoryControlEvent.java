package simulation.event;

import simulation.State;
import simulation.decision.OrderUpToPolicy;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public class InventoryControlEvent implements IEvent{
    public double time;

    public InventoryControlEvent(double time) {
        this.time = time;
    }

    @Override
    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator) {
        ArrayList<IEvent> returnEvents = new ArrayList<>();

        System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime());

        // Generate replenishment
        ArrayList<IEvent> replenishmentEvents = state.getOrderUpToPolicy().generateReplenishmentEvents(interarrivalGenerator, quantityGenerator, this.time);
        if (replenishmentEvents != null) returnEvents.addAll(replenishmentEvents);

        // Generate transfer
        ArrayList<IEvent> transferEvents = state.getOrderUpToPolicy().generateTransferEvents(interarrivalGenerator, quantityGenerator, this.time);
        if (transferEvents != null) returnEvents.addAll(transferEvents);

        // TODO: Transshipment Event

        return returnEvents;
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }

    public double getTime() {
        return time;
    }

}
