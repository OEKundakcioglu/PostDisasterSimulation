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

        if (state.getKpiManager().isReportEvents())
            System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime());

        state.transferInventory(this.camp, this.item, this.inventoryToSend, this.time);
        return null;
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }
    public double getTime() {
        return time;
    }


}
