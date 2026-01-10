package simulation.decision;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.stream.Collectors;

import data.Camp;
import data.Environment;
import data.Item;
import simulation.State;
import simulation.data.InventoryItem;
import simulation.data.requests.TransferRequest;
import simulation.event.IEvent;
import simulation.event.ReplenishmentEvent;
import simulation.event.TransferEvent;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

public class TargetLevelPolicy implements IPolicy, Cloneable {
    private Environment environment;
    private State state;

    // Removed reorder points - using pure target level policy
    private Map<Camp, Map<Item, Integer>> campTargetLevels;
    private Map<Camp, Map<Item, Integer>> campRationingThresholds;

    private Map<Item, Integer> centralTargetLevels;

    public TargetLevelPolicy() {
        this.campTargetLevels = new HashMap<>();
        this.campRationingThresholds = new HashMap<>();
        this.centralTargetLevels = new HashMap<>();
    }

    @Override
    public void initialize(Environment environment, State state) {
        this.environment = environment;
        this.state = state;

        if (this.campTargetLevels == null) this.campTargetLevels = new HashMap<>();
        if (this.campRationingThresholds == null) this.campRationingThresholds = new HashMap<>();
        if (this.centralTargetLevels == null) this.centralTargetLevels = new HashMap<>();
    }

    // --- 1. CENTRAL WAREHOUSE REPLENISHMENT (Supplier -> Central) ---
    @Override
    public ArrayList<IEvent> generateReplenishmentEvents(InterarrivalGenerator interarrivalGenerator, double time) {
        ArrayList<IEvent> replenishmentEvents = new ArrayList<>();
        double totalCashNeededForItem = 0;
        double totalCashNeededForOrdering = 0;

        Map<Item, Integer> orderQuantities = new HashMap<>();

        for (Item item : environment.getItems()) {
            if (!centralTargetLevels.containsKey(item)) continue;

            int S = centralTargetLevels.get(item);
            int currentInventory = state.getCentralWarehousePosition().getOrDefault(item, 0);

            // Pure target level policy: order when inventory < S, bring up to S
            if (currentInventory < S) {
                int quantityNeeded = S - currentInventory;
                if (quantityNeeded > 0) {
                    orderQuantities.put(item, quantityNeeded);
                    totalCashNeededForItem += quantityNeeded * item.getPrice();
                    totalCashNeededForOrdering += item.getOrderingCost();
                }
            }
        }

        double cashAvailable = state.getAvailableFunds() - totalCashNeededForOrdering;
        double ratio = (totalCashNeededForItem > 0) ? Math.min(cashAvailable / totalCashNeededForItem, 1.0) : 0;

        if (cashAvailable <= 0 && totalCashNeededForOrdering > 0) {
            return replenishmentEvents;
        }

        for (Map.Entry<Item, Integer> entry : orderQuantities.entrySet()) {
            Item item = entry.getKey();
            int quantityNeeded = entry.getValue();
            int finalQuantity = (int) Math.floor(quantityNeeded * ratio);

            if (finalQuantity > 0) {
                ArrayList<InventoryItem> inventoryItems = new ArrayList<>();
                double arrivalTime = time + interarrivalGenerator.generateReplenishment(item);
                double expiration = item.getIsPerishable() ? arrivalTime + interarrivalGenerator.generateItemDuration(item) : 0;

                inventoryItems.add(new InventoryItem(finalQuantity, expiration, arrivalTime));
                replenishmentEvents.add(new ReplenishmentEvent(item, inventoryItems, interarrivalGenerator, arrivalTime));

                state.setAvailableFunds(state.getAvailableFunds() - (finalQuantity * item.getPrice() + item.getOrderingCost()));
            }
        }
        return replenishmentEvents;
    }

    @Override
    public ArrayList<IEvent> generateTransferEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time) {
        ArrayList<TransferRequest> transferRequests = new ArrayList<>();
        ArrayList<IEvent> transferEvents = new ArrayList<>();

        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                if (!campTargetLevels.containsKey(camp) || !campTargetLevels.get(camp).containsKey(item)) continue;

                int S = campTargetLevels.get(camp).get(item);
                int currentInventory = state.getInventoryPosition().get(camp).getOrDefault(item, 0);

                // Pure target level policy: transfer when inventory < S, bring up to S
                if (currentInventory < S) {
                    int quantity = S - currentInventory;
                    if (quantity > 0) {
                        TransferRequest req = new TransferRequest(camp, item, quantity);

                        int threshold = campRationingThresholds.get(camp).getOrDefault(item, 0);
                        if (currentInventory <= threshold) {
                            // Threshold logic for rationing - kept as is
                        }

                        transferRequests.add(req);
                    }
                }
            }
        }

        // Fair Share
        for (Item item : environment.getItems()) {
            ArrayList<TransferRequest> itemRequests = (ArrayList<TransferRequest>) transferRequests.stream()
                    .filter(tr -> tr.getItem().equals(item))
                    .collect(Collectors.toList());

            if (itemRequests.isEmpty()) continue;

            int totalDemand = itemRequests.stream().mapToInt(TransferRequest::getQuantity).sum();

            double totalCentralInventory = 0;
            if (state.getCentralWarehouseInventory().containsKey(item)) {
                totalCentralInventory = state.getCentralWarehouseInventory().get(item).stream()
                        .mapToDouble(InventoryItem::getQuantity).sum();
            }

            double fulfillmentRatio = (totalDemand > 0) ? Math.min(totalCentralInventory / totalDemand, 1.0) : 0;

            if (fulfillmentRatio <= 0) continue;

            for (TransferRequest tr : itemRequests) {
                int approvedQty = (int) Math.floor(tr.getQuantity() * fulfillmentRatio);

                if (approvedQty > 0) {
                    ArrayList<InventoryItem> shipmentItems = new ArrayList<>();
                    int remainingQty = approvedQty;

                    if (state.getCentralWarehouseInventory().containsKey(item)) {
                        Iterator<InventoryItem> iterator = state.getCentralWarehouseInventory().get(item).iterator();
                        while (iterator.hasNext() && remainingQty > 0) {
                            InventoryItem stockItem = iterator.next();
                            int takeQty = Math.min(stockItem.getQuantity(), remainingQty);

                            shipmentItems.add(new InventoryItem(takeQty, stockItem.getExpiration(), stockItem.getArrivalTime()));

                            stockItem.setQuantity(stockItem.getQuantity() - takeQty);
                            if (stockItem.getQuantity() <= 0) iterator.remove();

                            remainingQty -= takeQty;
                        }
                    }

                    if (!shipmentItems.isEmpty()) {
                        transferEvents.add(new TransferEvent(tr.getToCamp(), item, shipmentItems, interarrivalGenerator, environment, time));
                    }
                }
            }
        }
        return transferEvents;
    }

    @Override
    public ArrayList<IEvent> generateTransshipmentEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time) {
        return new ArrayList<>();
    }

    // --- CONFIGURATION SETTERS ---
    // Removed 's' (reorder point) parameter - using pure target level policy
    public void setCampPolicy(Camp camp, Item item, int S, int threshold) {
        if (campTargetLevels == null) campTargetLevels = new HashMap<>();
        if (campRationingThresholds == null) campRationingThresholds = new HashMap<>();
        campTargetLevels.computeIfAbsent(camp, k -> new HashMap<>()).put(item, S);
        campRationingThresholds.computeIfAbsent(camp, k -> new HashMap<>()).put(item, threshold);
    }

    public void setCentralPolicy(Item item, int S) {
        if (centralTargetLevels == null) centralTargetLevels = new HashMap<>();
        centralTargetLevels.put(item, S);
    }


    @Override
    public Object clone() throws CloneNotSupportedException {
        TargetLevelPolicy cloned = (TargetLevelPolicy) super.clone();

        cloned.campTargetLevels = cloneMap(this.campTargetLevels);
        cloned.campRationingThresholds = cloneMap(this.campRationingThresholds);
        cloned.centralTargetLevels = new HashMap<>(this.centralTargetLevels);

        return cloned;
    }

    @Override
    public int getThreshold(Camp camp, Item item) {
        return 0;
    }

    private Map<Camp, Map<Item, Integer>> cloneMap(Map<Camp, Map<Item, Integer>> original) {
        Map<Camp, Map<Item, Integer>> copy = new HashMap<>();
        for (var entry : original.entrySet()) {
            copy.put(entry.getKey(), new HashMap<>(entry.getValue()));
        }
        return copy;
    }

    @Override
    public Environment getEnvironment() { return environment; }
    @Override
    public void setEnvironment(Environment environment) { this.environment = environment; }
    @Override
    public State getState() { return state; }

    @Override
    public void setState(State state) {this.state = state;}
    @Override
    public void setThreshold(Camp camp, Item item, int level) {
        campRationingThresholds.computeIfAbsent(camp, k -> new HashMap<>()).put(item, level);
    }
}