package simulation.event;

import data.Item;
import data.event_info.SupplyStatusSwitch;
import simulation.KPIManager;
import simulation.State;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public class SupplyRecoveryEvent implements IEvent {
    public Item item;
    double time;

    public SupplyRecoveryEvent(SupplyStatusSwitch supplyStatusSwitch,
                               InterarrivalGenerator interarrivalGenerator, double disruptionTime) {
        this.item = supplyStatusSwitch.getItem();
        this.time = disruptionTime + interarrivalGenerator.generateSupplyDisruptionDuration(supplyStatusSwitch);
    }

    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator) {

        if (state.getKpiManager().isReportEvents())
            System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime());

        // Update the state (camp inventories)
        state.updateItemAvailability(this.item, true);

        return null;
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }
    public double getTime() {
        return time;
    }


}
