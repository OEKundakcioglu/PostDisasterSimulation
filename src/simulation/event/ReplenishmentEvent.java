package simulation.event;

import data.Item;
import simulation.State;
import simulation.data.InventoryItem;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public class ReplenishmentEvent implements IEvent {
    public Item item;
    public ArrayList<InventoryItem> inventoryToSend;
    public double time;

    public ReplenishmentEvent(Item item, ArrayList<InventoryItem> inventoryToSend, InterarrivalGenerator interarrivalGenerator, double tNow) {
        this.item = item;
        this.time = tNow + interarrivalGenerator.generateReplenishment(item);
        this.inventoryToSend = inventoryToSend;
    }

    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator) {
        System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime());

        // Update ordering cost
        state.replenishInventory(this.item, this.inventoryToSend);
        return null;
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }
    public double getTime() {
        return time;
    }

    
}
