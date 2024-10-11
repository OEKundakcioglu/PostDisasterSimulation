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

    public ReplenishmentEvent(Item item, ArrayList<InventoryItem> inventoryToSend, InterarrivalGenerator interarrivalGenerator, double arrival) {
        this.item = item;
        this.time = arrival;
        this.inventoryToSend = inventoryToSend;
    }

    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator) {
        if (state.getKpiManager().isReportEvents())
            System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime() + " Item: " + this.item.getName() + " Quantity: " + this.inventoryToSend.get(0).getQuantity());

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
