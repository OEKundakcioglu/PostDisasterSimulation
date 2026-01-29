package simulation.event;

import simulation.State;
import simulation.data.InventoryItem;
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

        if (state.getKpiManager().isReportEvents())
            System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime());

        // Generate replenishment
        ArrayList<IEvent> replenishmentEvents = state.getInventoryPolicy().generateReplenishmentEvents(interarrivalGenerator, this.time);
        if (replenishmentEvents != null) returnEvents.addAll(replenishmentEvents);

        // Update positions immediately when orders are placed (position = on-hand + in-transit)
        // Inventory will be updated later when items actually arrive
        if (replenishmentEvents != null) {
            for (IEvent event : replenishmentEvents) {
                var replenishmentEvent = (ReplenishmentEvent) event;
                for (InventoryItem inventoryItem : replenishmentEvent.inventoryToSend) {
                    int quantity = inventoryItem.getQuantity();
                    var item = replenishmentEvent.item;
                    // Position increases immediately when order is placed
                    if (!state.getCentralWarehousePosition().containsKey(item)) {
                        state.getCentralWarehousePosition().put(item, 0);
                    }
                    state.getCentralWarehousePosition().put(item, state.getCentralWarehousePosition().get(item) + quantity);
                }
            }
        }

        // Generate transfer
        ArrayList<IEvent> transferEvents = state.getInventoryPolicy().generateTransferEvents(interarrivalGenerator, quantityGenerator, this.time);
        if (transferEvents != null) returnEvents.addAll(transferEvents);

        // Update positions immediately when transfers are ordered (position = on-hand + in-transit)
        // Inventory will be updated later when items actually arrive
        if (transferEvents != null) {
            for (IEvent event : transferEvents) {
                var transferEvent = (TransferEvent) event;
                for (InventoryItem inventoryItem : transferEvent.inventoryToSend) {
                    int quantity = inventoryItem.getQuantity();
                    var item = transferEvent.item;
                    var camp = transferEvent.camp;
                    // Camp position increases immediately when transfer is ordered (items become in-transit to camp)
                    if (!state.getInventoryPosition().containsKey(camp)) {
                        state.getInventoryPosition().put(camp, new java.util.HashMap<>());
                    }
                    if (!state.getInventoryPosition().get(camp).containsKey(item)) {
                        state.getInventoryPosition().get(camp).put(item, 0);
                    }
                    state.getInventoryPosition().get(camp).put(item, state.getInventoryPosition().get(camp).get(item) + quantity);
                    // Central position decreases when items leave central warehouse (they become in-transit to camp)
                    if (!state.getCentralWarehousePosition().containsKey(item)) {
                        state.getCentralWarehousePosition().put(item, 0);
                    }
                    state.getCentralWarehousePosition().put(item, Math.max(0, state.getCentralWarehousePosition().get(item) - quantity));
                }
            }
        }
        return returnEvents;
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }

    public double getTime() {
        return time;
    }

}
