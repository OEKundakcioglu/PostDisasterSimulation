package simulation.decision;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
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

    private HashMap<Camp, HashMap<Item, TargetLevelDefinition>> targetLevelDefinitions;
    private HashMap<Item, TargetLevelDefinition> centralTargetLevelDefinitions;
    private HashMap<Camp, HashMap<Item, Double>> thresholdRatios;

    private HashMap<Camp, HashMap<Item, Integer>> thresholdLevels;

    public static class TargetLevelDefinition implements Cloneable {
        public double internalRatio;
        public double externalRatio;

        public TargetLevelDefinition(double internalRatio, double externalRatio) {
            this.internalRatio = internalRatio;
            this.externalRatio = externalRatio;
        }

        @Override
        public Object clone() {
            return new TargetLevelDefinition(this.internalRatio, this.externalRatio);
        }

        @Override
        public String toString() {
            return String.format("{int: %.2f, ext: %.2f}", internalRatio, externalRatio);
        }
    }

    public TargetLevelPolicy() {
    }

    @Override
    public void initialize(Environment environment, State state) {
        this.environment = environment;
        this.state = state;

        if (this.targetLevelDefinitions == null) this.targetLevelDefinitions = new HashMap<>();
        if (this.centralTargetLevelDefinitions == null) this.centralTargetLevelDefinitions = new HashMap<>();
        if (this.thresholdRatios == null) this.thresholdRatios = new HashMap<>();
        if (this.thresholdLevels == null) this.thresholdLevels = new HashMap<>();

    }


    private int calculateCampTargetLevel(Camp camp, Item item) {
        if (!targetLevelDefinitions.containsKey(camp) || !targetLevelDefinitions.get(camp).containsKey(item)) {
            return 0;
        }
        TargetLevelDefinition def = targetLevelDefinitions.get(camp).get(item);

        double internalTarget = this.state.getCurrentInternalPopulation(camp) * def.internalRatio;
        double externalTarget = this.state.getCurrentExternalPopulation(camp) * def.externalRatio;
        int targetLevel = (int) Math.ceil(internalTarget + externalTarget);

        double ratio = 0.0;
        if (thresholdRatios.containsKey(camp) && thresholdRatios.get(camp).containsKey(item)) {
            ratio = thresholdRatios.get(camp).get(item);
        }

        int calcThreshold = (int) Math.floor(targetLevel * ratio);
        this.setThreshold(camp, item, calcThreshold);

        return targetLevel;
    }

    private int calculateCentralTargetLevel(Item item) {
        if (!centralTargetLevelDefinitions.containsKey(item)) {
            return 0;
        }
        TargetLevelDefinition def = centralTargetLevelDefinitions.get(item);

        long totalInternalPop = 0;
        long totalExternalPop = 0;

        for (Camp camp : environment.getCamps()) {
            totalInternalPop += this.state.getCurrentInternalPopulation(camp);
            totalExternalPop += this.state.getCurrentExternalPopulation(camp);
        }

        double internalTarget = totalInternalPop * def.internalRatio;
        double externalTarget = totalExternalPop * def.externalRatio;

        return (int) Math.ceil(internalTarget + externalTarget);
    }

    // --- CENTRAL REPLENISHMENT (Supplier -> Central) ---
    @Override
    public ArrayList<IEvent> generateReplenishmentEvents(InterarrivalGenerator interarrivalGenerator, double time) {
        double totalCashNeededForItem = 0;
        double totalCashNeededForOrdering = 0;

        for (Item item : state.getCentralWarehousePosition().keySet()) {
            if (!state.getIsItemAvailable().get(item)) continue;

            int currentInventory = state.getCentralWarehousePosition().get(item);

            for (Camp camp : environment.getCamps()) {
                int campInv = state.getInventoryPosition().get(camp).get(item);
                if (campInv < 0) {
                    currentInventory += campInv;
                }
            }

            int targetLevel = calculateCentralTargetLevel(item);

            if (currentInventory < targetLevel) {
                totalCashNeededForItem += (targetLevel - currentInventory) * item.getPrice();
                totalCashNeededForOrdering += item.getOrderingCost();
            }
        }

        double cashAvailable = state.getAvailableFunds() - totalCashNeededForOrdering;
        double ratio = (totalCashNeededForItem > 0) ? Math.min(cashAvailable / totalCashNeededForItem, 1.0) : 0;

        ArrayList<IEvent> replenishmentEvents = new ArrayList<>();

        if (cashAvailable <= 0 && totalCashNeededForOrdering > 0) {
            return replenishmentEvents;
        }

        for (Item item : state.getCentralWarehousePosition().keySet()) {
            if (!state.getIsItemAvailable().get(item)) continue;

            int currentInventory = state.getCentralWarehousePosition().get(item);
            for (Camp camp : environment.getCamps()) {
                int campInv = state.getInventoryPosition().get(camp).get(item);
                if (campInv < 0) currentInventory += campInv;
            }

            int targetLevel = calculateCentralTargetLevel(item);

            if (currentInventory < targetLevel) {
                int quantityNeeded = targetLevel - currentInventory;
                int quantity = (int) Math.floor(quantityNeeded * ratio);

                if (quantity > 0) {
                    ArrayList<InventoryItem> inventoryItems = new ArrayList<>();
                    double arrivalTime = time + interarrivalGenerator.generateReplenishment(item);
                    double expiration = 0;
                    if (item.getIsPerishable()) {
                        expiration = arrivalTime + interarrivalGenerator.generateItemDuration(item);
                    }
                    inventoryItems.add(new InventoryItem(quantity, expiration, arrivalTime));
                    replenishmentEvents.add(new ReplenishmentEvent(item, inventoryItems, interarrivalGenerator, arrivalTime));

                    state.setAvailableFunds(state.getAvailableFunds() - (quantity * item.getPrice() + item.getOrderingCost()));
                }
            }
        }
        return replenishmentEvents;
    }

    // --- CAMP REPLENISHMENT (Central -> Camp) ---
    @Override
    public ArrayList<IEvent> generateTransferEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time) {
        ArrayList<TransferRequest> transferRequests = new ArrayList<>();

        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                int currentInventory = state.getInventoryPosition().get(camp).get(item);
                if (currentInventory < 0) {
                    currentInventory = 0;
                }

                // Bu metod çağrıldığında Threshold Level da arka planda güncellenmiş olur.
                int targetLevel = calculateCampTargetLevel(camp, item);

                // Sipariş verme kuralı: Stok < Hedef ise tamamla
                if (currentInventory < targetLevel) {
                    int quantity = targetLevel - currentInventory;
                    transferRequests.add(new TransferRequest(camp, item, quantity));
                }
            }
        }

        ArrayList<IEvent> transferEvents = new ArrayList<>();

        // 2. Fair Share
        for (Item item : environment.getItems()) {
            ArrayList<TransferRequest> itemRequests = (ArrayList<TransferRequest>) transferRequests.stream()
                    .filter(tr -> tr.getItem().equals(item))
                    .collect(Collectors.toList());

            if (itemRequests.isEmpty()) continue;

            int totalDemand = 0;
            double totalCentralInventory = 0;

            for (TransferRequest tr : itemRequests) {
                totalDemand += tr.getQuantity();
            }

            if (state.getCentralWarehouseInventory().containsKey(item)) {
                for (var ie : state.getCentralWarehouseInventory().get(item)) {
                    totalCentralInventory += ie.getQuantity();
                }
            }

            double fulfillmentRatio = (totalDemand > 0) ? Math.min(totalCentralInventory / totalDemand, 1.0) : 0;

            if (fulfillmentRatio <= 0) continue;

            for (TransferRequest tr : itemRequests) {
                tr.setQuantity((int) Math.floor(tr.getQuantity() * fulfillmentRatio));
            }

            for (TransferRequest tr : itemRequests) {
                int remainingQty = tr.getQuantity();

                if (state.getCentralWarehouseInventory().containsKey(item)) {
                    Iterator<InventoryItem> iterator = state.getCentralWarehouseInventory().get(item).iterator();

                    while (iterator.hasNext() && remainingQty > 0) {
                        InventoryItem stockItem = iterator.next();
                        int takeQty = Math.min(stockItem.getQuantity(), remainingQty);

                        ArrayList<InventoryItem> shipmentItems = new ArrayList<>();
                        shipmentItems.add(new InventoryItem(takeQty, stockItem.getExpiration(), stockItem.getArrivalTime()));

                        stockItem.setQuantity(stockItem.getQuantity() - takeQty);
                        if (stockItem.getQuantity() <= 0) {
                            iterator.remove();
                        }

                        remainingQty -= takeQty;

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

    // --- Standard Getters, Setters & Clone ---
    @Override
    public Object clone() throws CloneNotSupportedException {
        TargetLevelPolicy cloned = (TargetLevelPolicy) super.clone();

        // Deep clone maps
        cloned.targetLevelDefinitions = new HashMap<>();
        for (var entry : this.targetLevelDefinitions.entrySet()) {
            HashMap<Item, TargetLevelDefinition> itemMap = new HashMap<>();
            for (var itemEntry : entry.getValue().entrySet()) {
                itemMap.put(itemEntry.getKey(), (TargetLevelDefinition) itemEntry.getValue().clone());
            }
            cloned.targetLevelDefinitions.put(entry.getKey(), itemMap);
        }

        cloned.centralTargetLevelDefinitions = new HashMap<>();
        for (var entry : this.centralTargetLevelDefinitions.entrySet()) {
            cloned.centralTargetLevelDefinitions.put(entry.getKey(), (TargetLevelDefinition) entry.getValue().clone());
        }

        cloned.thresholdRatios = new HashMap<>(this.thresholdRatios);

        // Threshold Levels da klonlanmalı
        cloned.thresholdLevels = new HashMap<>();
        for (var entry : this.thresholdLevels.entrySet()) {
            cloned.thresholdLevels.put(entry.getKey(), new HashMap<>(entry.getValue()));
        }

        return cloned;
    }

    @Override
    public Environment getEnvironment() { return environment; }
    @Override
    public void setEnvironment(Environment environment) { this.environment = environment; }

    public HashMap<Camp, HashMap<Item, TargetLevelDefinition>> getTargetLevels() { return targetLevelDefinitions; }
    public void setTargetLevels(HashMap<Camp, HashMap<Item, TargetLevelDefinition>> targetLevels) { this.targetLevelDefinitions = targetLevels; }

    public HashMap<Item, TargetLevelDefinition> getCentralTargetLevels() { return centralTargetLevelDefinitions; }
    public void setCentralTargetLevels(HashMap<Item, TargetLevelDefinition> centralTargetLevels) { this.centralTargetLevelDefinitions = centralTargetLevels; }

    public HashMap<Camp, HashMap<Item, Double>> getThresholdRatios() { return thresholdRatios; }
    public void setThresholdRatios(HashMap<Camp, HashMap<Item, Double>> thresholdRatios) { this.thresholdRatios = thresholdRatios; }

    public State getState() { return state; }
    public void setState(State state) { this.state = state; }

    public HashMap<Camp, HashMap<Item, Integer>> getThresholdLevels() {
        return thresholdLevels;
    }
    public void setThresholdLevels(HashMap<Camp, HashMap<Item, Integer>> thresholdLevels) {
        this.thresholdLevels = thresholdLevels;
    }

    public int getThreshold(Camp camp, Item item) {
        if (thresholdLevels.containsKey(camp) && thresholdLevels.get(camp).containsKey(item)) {
            return this.thresholdLevels.get(camp).get(item);
        }
        return 0;
    }

    public void setThreshold(Camp camp, Item item, int level) {
        this.thresholdLevels.computeIfAbsent(camp, k -> new HashMap<>()).put(item, level);
    }
}