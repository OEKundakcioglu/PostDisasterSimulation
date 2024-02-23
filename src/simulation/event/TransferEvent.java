package simulation.event;

import data.Camp;
import data.Item;
import simulation.KPIManager;
import simulation.State;
import simulation.data.InventoryItem;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public class TransferEvent implements IEvent {
    public Camp camp;
    public Item item;
    public ArrayList<InventoryItem> inventoryToSend;
    public double time;

    public TransferEvent(Camp camp, Item item, ArrayList<InventoryItem> inventoryToSend, InterarrivalGenerator interarrivalGenerator, double tNow) {
        this.camp = camp;
        this.item = item;
        this.inventoryToSend = inventoryToSend;
        this.time = tNow + interarrivalGenerator.generateTransferTime(camp);
    }

    @Override
    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator) {
        state.transferInventory(this.camp, this.item, this.inventoryToSend, this.time);
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
