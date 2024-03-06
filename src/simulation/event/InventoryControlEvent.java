package simulation.event;

import simulation.State;
import simulation.data.InventoryItem;
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

        if (state.getKpiManager().isReportEvents())
            System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime());

        // Generate replenishment
        ArrayList<IEvent> replenishmentEvents = state.getOrderUpToPolicy().generateReplenishmentEvents(interarrivalGenerator, quantityGenerator, this.time);
        if (replenishmentEvents != null) returnEvents.addAll(replenishmentEvents);

        // From replenishment events, update the inventory positions
        if (replenishmentEvents != null){
            for (IEvent event : replenishmentEvents) {
                var replenishmentEvent = (ReplenishmentEvent) event;
                for (InventoryItem inventoryItem : replenishmentEvent.inventoryToSend) {
                    // increase state.getCentralWarehousePosition().get(replenishmentEvent.item) by inventoryItem.quantity
                    int quantity = inventoryItem.getQuantity();
                    var item = replenishmentEvent.item;
                    state.getCentralWarehousePosition().put(item, state.getCentralWarehousePosition().get(item) + quantity);
                }
            }
        }

        // Generate transfer
        ArrayList<IEvent> transferEvents = state.getOrderUpToPolicy().generateTransferEvents(interarrivalGenerator, quantityGenerator, this.time);
        if (transferEvents != null) returnEvents.addAll(transferEvents);

        // From replenishment events, update the inventory positions
        if (transferEvents != null){
            for (IEvent event : transferEvents) {
                var transferEvent = (TransferEvent) event;
                for (InventoryItem inventoryItem : transferEvent.inventoryToSend) {
                    // increase state.getCentralWarehousePosition().get(replenishmentEvent.item) by inventoryItem.quantity
                    int quantity = inventoryItem.getQuantity();
                    var item = transferEvent.item;
                    var camp = transferEvent.camp;
                    state.getInventoryPosition().get(camp).put(item, state.getInventoryPosition().get(camp).get(item) + quantity);
                    state.getCentralWarehousePosition().put(item, state.getCentralWarehousePosition().get(item) - quantity);
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
