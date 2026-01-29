package simulation.decision;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.stream.Collectors;

import data.Camp;
import data.Environment;
import data.Item;
import data.event_info.Demand;
import enums.CampExternalDemandSatisfactionType;
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

    /** Default buffer factor for demand-driven target levels when not set in config (e.g. 1.2 = 20% buffer). */
    private static final double DEFAULT_BUFFER_FACTOR = 1.2;
    /** Default review period (time units) for demand-driven target levels when not set. */
    private static final double DEFAULT_REVIEW_PERIOD = 2.0;

    @Override
    public void initialize(Environment environment, State state) {
        this.environment = environment;
        this.state = state;

        if (this.campTargetLevels == null) this.campTargetLevels = new HashMap<>();
        if (this.campRationingThresholds == null) this.campRationingThresholds = new HashMap<>();
        if (this.centralTargetLevels == null) this.centralTargetLevels = new HashMap<>();

        // Ensure demand-driven default target levels so that with enough funding we can satisfy both internal and external demand.
        // If central or camp S is missing or 0, compute from demand (like OrderUpToPolicy).
        ensureCentralTargetLevelsFromDemand();
        ensureCampTargetLevelsFromDemand();
    }

    /** Compute default central target level S for each item from total demand * (leadTime + review) * buffer when S is missing or 0. */
    private void ensureCentralTargetLevelsFromDemand() {
        for (Item item : environment.getItems()) {
            int currentS = centralTargetLevels.getOrDefault(item, 0);
            if (currentS > 0) continue;

            double totalDemandRate = 0.0;
            double leadTime = 0.0;
            if (item.getLeadTimeData() != null && item.getLeadTimeData().getDistParameters() != null) {
                leadTime = item.getLeadTimeData().getDistParameters().getMean();
            }

            for (Camp camp : environment.getCamps()) {
                Demand demand = environment.getCorrespondingDemand(item, camp);
                if (demand == null || demand.getArrivalData() == null || demand.getArrivalData().getDistParameters() == null) continue;

                double meanArrival = demand.getArrivalData().getDistParameters().getMean();
                double internalPop = state.getInternalPopulation().getOrDefault(camp, 0) * demand.getInternalRatio();
                double externalPop = state.getExternalPopulation().getOrDefault(camp, 0) * demand.getExternalRatio();
                if (camp.getCampExternalDemandSatisfactionType() == CampExternalDemandSatisfactionType.NONE) {
                    externalPop = 0;
                }
                totalDemandRate += meanArrival * (internalPop + externalPop);

                if (demand.getLeadTimeData() != null && demand.getLeadTimeData().getDistParameters() != null) {
                    leadTime = Math.max(leadTime, demand.getLeadTimeData().getDistParameters().getMean());
                }
            }

            int S = (int) Math.ceil(totalDemandRate * (DEFAULT_REVIEW_PERIOD + leadTime) * DEFAULT_BUFFER_FACTOR);
            if (S > 0) centralTargetLevels.put(item, S);
        }
    }

    /** Compute default camp target level S for each camp-item from demand * (leadTime + review) * buffer when S is missing or 0. */
    private void ensureCampTargetLevelsFromDemand() {
        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                Map<Item, Integer> campLevels = campTargetLevels.get(camp);
                int currentS = (campLevels != null && campLevels.containsKey(item)) ? campLevels.get(item) : 0;
                if (currentS > 0) continue;

                Demand demand = environment.getCorrespondingDemand(item, camp);
                if (demand == null || demand.getArrivalData() == null || demand.getArrivalData().getDistParameters() == null) continue;

                double meanArrival = demand.getArrivalData().getDistParameters().getMean();
                double internalPop = state.getInternalPopulation().getOrDefault(camp, 0) * demand.getInternalRatio();
                double externalPop = state.getExternalPopulation().getOrDefault(camp, 0) * demand.getExternalRatio();
                if (camp.getCampExternalDemandSatisfactionType() == CampExternalDemandSatisfactionType.NONE) {
                    externalPop = 0;
                }
                double demandRate = meanArrival * (internalPop + externalPop);

                double leadTime = 0.0;
                if (demand.getLeadTimeData() != null && demand.getLeadTimeData().getDistParameters() != null) {
                    leadTime = demand.getLeadTimeData().getDistParameters().getMean();
                } else if (item.getLeadTimeData() != null && item.getLeadTimeData().getDistParameters() != null) {
                    leadTime = item.getLeadTimeData().getDistParameters().getMean();
                }

                int S = (int) Math.ceil(demandRate * (DEFAULT_REVIEW_PERIOD + leadTime) * DEFAULT_BUFFER_FACTOR);
                if (S > 0) {
                    campTargetLevels.computeIfAbsent(camp, k -> new HashMap<>()).put(item, S);
                    if (!campRationingThresholds.containsKey(camp)) campRationingThresholds.put(camp, new HashMap<>());
                    campRationingThresholds.get(camp).putIfAbsent(item, 0);
                }
            }
        }
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
            // Use position (on-hand + in-transit) to make ordering decisions
            // Position reflects what we have now plus what's already ordered
            int currentPosition = state.getCentralWarehousePosition().getOrDefault(item, 0);

            // Pure target level policy: order when position < S, bring up to S
            if (currentPosition < S) {
                int quantityNeeded = S - currentPosition;
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
            // When cash is constrained, avoid ordering 0 when we have funds for at least 1 unit (policy awareness of state)
            if (finalQuantity == 0 && quantityNeeded > 0 && ratio > 0
                    && state.getAvailableFunds() >= item.getPrice() + item.getOrderingCost()) {
                finalQuantity = 1;
            }

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
                int currentPosition = state.getInventoryPosition().get(camp).getOrDefault(item, 0);

                // Pure target level policy: transfer when position < S, bring up to S
                // Position = on-hand + in-transit inventory
                if (currentPosition < S) {
                    int quantity = S - currentPosition;
                    if (quantity > 0) {
                        TransferRequest req = new TransferRequest(camp, item, quantity);
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
                    // Note: Position updates happen in InventoryControlEvent when transfer is ordered
                    // Central position decreases (items leave central warehouse)
                    // Camp position increases (items become in-transit to camp)

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
        if (campRationingThresholds == null || camp == null || item == null) {
            return 0;
        }
        Map<Item, Integer> campThresholds = campRationingThresholds.get(camp);
        if (campThresholds == null) {
            return 0;
        }
        return campThresholds.getOrDefault(item, 0);
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