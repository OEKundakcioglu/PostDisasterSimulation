package simulation.event;

import data.Camp;
import data.Item;
import data.Transshipment;
import simulation.State;
import simulation.data.InventoryItem;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public class TransshipmentEvent implements  IEvent{
    public Camp fromCamp;
    public Camp toCamp;
    public Item item;
    public ArrayList<InventoryItem> inventoryToSend;
    public double time;

    public TransshipmentEvent(Camp fromCamp, Camp toCamp, Item item, ArrayList<InventoryItem> inventoryToSend,
                              InterarrivalGenerator interarrivalGenerator, double tNow) {
        this.fromCamp = fromCamp;
        this.toCamp = toCamp;
        this.item = item;
        this.inventoryToSend = inventoryToSend;
        this.time = tNow + interarrivalGenerator.generateTransshipmentTime(new Transshipment());
    }

    @Override
    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator) {
        state.transshipmentInventory(this.fromCamp, this.toCamp, this.item, inventoryToSend, this.time);
        return null;
    }

    @Override
    public int compareTo(IEvent other) {
        return 0;
    }

    @Override
    public double getTime() {
        return 0;
    }

}
