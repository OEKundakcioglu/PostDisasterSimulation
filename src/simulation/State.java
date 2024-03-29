package simulation;

import java.util.*;

import data.Camp;
import data.Environment;
import data.Item;
import enums.CampExternalDemandSatisfactionType;
import enums.FundingType;
import enums.MigrationType;
import simulation.data.*;
import simulation.decision.IPolicy;
import simulation.decision.OrderUpToPolicy;
import simulation.generator.InterarrivalGenerator;

public class State implements Cloneable {

    private HashMap<Camp, HashMap<Item, Integer>> initialInventory;
    private HashMap<Camp, HashMap<Item, PriorityQueue<InventoryItem>>> inventory;
    private HashMap<Camp, HashMap<Item, Integer>> inventoryPosition;

    private HashMap<Item, Integer> initialCentralWarehouseInventory;
    private HashMap<Item, PriorityQueue<InventoryItem>> centralWarehouseInventory;
    private HashMap<Item, Integer> centralWarehousePosition;

    private double availableFunds;
    private HashMap<Camp, Double> earmarkedFunds;

    private HashMap<Camp, HashMap<Item, Integer>> initialEarmarkedInKind;

    private HashMap<Camp, HashMap<Item, PriorityQueue<DeprivingPerson>>> deprivingPopulation;
    private HashMap<Camp, HashMap<Item, Integer>> referralPopulation;

    private HashMap<Item, Boolean> isItemAvailable;

    private HashMap<Camp, Integer> internalPopulation;
    private HashMap<Camp, Integer> externalPopulation;

    private HashMap<Camp, HashMap<Item, Double>> thresholdExternalDemand;

    private KPIManager kpiManager;

    private IPolicy inventoryPolicy;


    public State () {

    }

    public void initialize(Environment environment) {
        this.kpiManager = new KPIManager(this);
        this.kpiManager.setReportEvents(environment.getSimulationConfig().isReportEvents());
        this.kpiManager.setReportKPIs(environment.getSimulationConfig().isReportKPIs());
        this.kpiManager.setFileName(environment.getSimulationConfig().getFileName());

        this.deprivingPopulation = new HashMap<>();
        this.referralPopulation = new HashMap<>();

        for (var camp : this.initialInventory.keySet()) {
            this.referralPopulation.put(camp, new HashMap<>());
            this.deprivingPopulation.put(camp, new HashMap<>());
            for (var item : this.initialInventory.get(camp).keySet()) {
                this.deprivingPopulation.get(camp).put(item, new PriorityQueue<>(Comparator.comparingDouble(DeprivingPerson::getArrivalTime)));
                this.referralPopulation.get(camp).put(item, 0);
            }
        }
    }

    public void projectInitialState(InterarrivalGenerator interarrivalGenerator) {
        HashMap<Camp, HashMap<Item, PriorityQueue<InventoryItem>>> newInventory = new HashMap<>();
        HashMap<Item, PriorityQueue<InventoryItem>> newCentralWarehouseInventory = new HashMap<>();

        // Initialize initialCentralWarehousePosition
        centralWarehousePosition = new HashMap<>(initialCentralWarehouseInventory);

        // Initialize inventoryPosition
        inventoryPosition = new HashMap<>();

        for (var camp : this.initialInventory.keySet()) {
            newInventory.put(camp, new HashMap<>());
            inventoryPosition.put(camp, new HashMap<>());
            for (var item : this.initialInventory.get(camp).keySet()) {
                PriorityQueue<InventoryItem> newInventoryItem = new PriorityQueue<>(Comparator.comparingDouble(InventoryItem::getExpiration));

                int quantity = this.initialInventory.get(camp).get(item);
                double expiration = 0.0;

                newInventory.get(camp).put(item, newInventoryItem);
                inventoryPosition.get(camp).put(item, quantity);

                if (item.getIsPerishable()){
                    expiration = interarrivalGenerator.generateItemDuration(item);
                }
                newInventory.get(camp).get(item).offer(new InventoryItem(quantity, expiration, 0.0));
            }
        }

        this.inventory = newInventory;

        for (var item : this.initialCentralWarehouseInventory.keySet()) {
            int quantity = this.initialCentralWarehouseInventory.get(item);
            double expiration = 0.0;
            PriorityQueue<InventoryItem> newInventoryItem = new PriorityQueue<>(Comparator.comparingDouble(InventoryItem::getExpiration));
            newCentralWarehouseInventory.put(item, newInventoryItem);

            if (item.getIsPerishable()){
                expiration = interarrivalGenerator.generateItemDuration(item);
            }

            newCentralWarehouseInventory.get(item).offer(new InventoryItem(quantity, expiration, 0.0));
        }

        this.centralWarehouseInventory = newCentralWarehouseInventory;

        for (var camp : this.initialEarmarkedInKind.keySet()) {
            for (var item : this.initialEarmarkedInKind.get(camp).keySet()) {
                int quantity = this.initialEarmarkedInKind.get(camp).get(item);
                double expiration = 0.0;
                if (item.getIsPerishable()){
                    expiration = interarrivalGenerator.generateItemDuration(item);
                }
                inventory.get(camp).get(item).offer(new InventoryItem(quantity, expiration, 0.0));
            }
        }

        // Initialize the population
        this.internalPopulation = new HashMap<>();
        this.externalPopulation = new HashMap<>();
        for (var camp : this.initialInventory.keySet()) {
            this.internalPopulation.put(camp, camp.getInitialInternalPopulation());
            this.externalPopulation.put(camp, camp.getInitialExternalPopulation());
        }
    }

    public void transferInventory(Camp camp, Item item, ArrayList<InventoryItem> inventoryToSend, double time) {
        var totalCost = kpiManager.campReplenishmentCost.get(camp).get(item);
        for (var inventoryItem : inventoryToSend) {
            totalCost += inventoryItem.getQuantity() * item.getPrice();
        }
        // If replenishment, then update the cost
        kpiManager.campReplenishmentCost.get(camp).put(item, totalCost);

        if (!inventory.get(camp).containsKey(item)) {
            inventory.get(camp).put(item, new PriorityQueue<>(Comparator.comparingDouble(InventoryItem::getExpiration)));
        }
        // First we need to check depriving population and satisfy the demand immediately!
        while (!inventoryToSend.isEmpty() && !deprivingPopulation.get(camp).get(item).isEmpty()) {
            DeprivingPerson deprivingPerson = deprivingPopulation.get(camp).get(item).peek();
            assert deprivingPerson != null;

            double totalTime = time - deprivingPerson.getArrivalTime();
            kpiManager.totalDeprivedPopulation.get(camp).put(item, kpiManager.totalDeprivedPopulation.get(camp).get(item) + deprivingPerson.getQuantity());
            kpiManager.averageDeprivationTime.get(camp).put(item, kpiManager.averageDeprivationTime.get(camp).get(item) + totalTime * deprivingPerson.getQuantity());

            var previousCost = kpiManager.totalDeprivationCost.get(camp).get(item);

            if (deprivingPerson.getQuantity() <= inventoryToSend.get(0).getQuantity()) {
                var deprivation = calculateDeprivation(item, deprivingPerson.getQuantity());
                kpiManager.totalDeprivationCost.get(camp).put(item, previousCost + deprivation);
                inventoryToSend.get(0).setQuantity(inventoryToSend.get(0).getQuantity() - deprivingPerson.getQuantity());
                deprivingPopulation.get(camp).get(item).poll();
            }
            else {
                // Since we are not able to satisfy all depriving population, we use available inventory
                var deprivation = calculateDeprivation(item, inventoryToSend.get(0).getQuantity());
                kpiManager.totalDeprivationCost.get(camp).put(item, previousCost + deprivation);
                deprivingPerson.setQuantity(deprivingPerson.getQuantity() - inventoryToSend.get(0).getQuantity());
                inventoryToSend.remove(0);
            }
        }
        // If there is an available item, then transfer it to the camp.
        if (!inventoryToSend.isEmpty()) {
            for (InventoryItem inventoryItem : inventoryToSend) {
                inventory.get(camp).get(item).offer(inventoryItem);
            }
        }
    }

    public double calculateDeprivation(Item item, int totalNumberOfPeople){
        return item.getDeprivationCoefficient() * (Math.exp(item.getDeprivationRate()) - 1) * totalNumberOfPeople;
    }

    public void replenishInventory(Item item, ArrayList<InventoryItem> inventoryToSend) {
        if (!centralWarehouseInventory.containsKey(item)) {
            centralWarehouseInventory.put(item, new PriorityQueue<>(Comparator.comparingDouble(InventoryItem::getExpiration)));
        }
        for (InventoryItem inventoryItem : inventoryToSend) {
            var cost = item.getPrice() * inventoryItem.getQuantity() + kpiManager.totalReplenishmentCost.get(item);
            kpiManager.totalReplenishmentCost.put(item, cost);
            centralWarehouseInventory.get(item).offer(inventoryItem);
        }
        // Now update the ordering cost
        kpiManager.totalOrderingCost.put(item, kpiManager.totalOrderingCost.get(item) + item.getOrderingCost());
    }

    public void consumeInventory(Camp camp, Item item, boolean isInternal, int quantity, double tNow) {
        // Internal consumption
        if (isInternal){
            // Consume from inventory
            if (inventory.containsKey(camp) && inventory.get(camp).containsKey(item)) {
                HashMap<Item, PriorityQueue<InventoryItem>> innerMap = inventory.get(camp);
                PriorityQueue<InventoryItem> items = innerMap.get(item);
                while (quantity > 0 && !items.isEmpty()) {
                    InventoryItem inventoryItem = items.peek();
                    if (inventoryItem.getQuantity() <= quantity) {
                        double totalTime = tNow - inventoryItem.getArrivalTime();
                        kpiManager.totalHoldingCost.get(camp).put(item, kpiManager.totalHoldingCost.get(camp).get(item) + (totalTime * item.getHoldingCost() * inventoryItem.getQuantity()));
                        inventoryPosition.get(camp).put(item, inventoryPosition.get(camp).get(item) - inventoryItem.getQuantity());
                        quantity -= inventoryItem.getQuantity();
                        items.poll();
                    } else {
                        double totalTime = tNow - inventoryItem.getArrivalTime();
                        kpiManager.totalHoldingCost.get(camp).put(item, kpiManager.totalHoldingCost.get(camp).get(item) + (totalTime * item.getHoldingCost() * quantity));
                        inventoryItem.setQuantity(inventoryItem.getQuantity() - (int) quantity);
                        inventoryPosition.get(camp).put(item, inventoryPosition.get(camp).get(item) - (int) quantity);
                        quantity = 0; // Exit the loop
                    }
                }
            }
            // If no inventory is available, then add it to the depriving
            if (quantity > 0) {
                if (!deprivingPopulation.containsKey(camp)) {
                    deprivingPopulation.put(camp, new HashMap<>());
                }
                if (!deprivingPopulation.get(camp).containsKey(item)) {
                    deprivingPopulation.get(camp).put(item, new PriorityQueue<>(Comparator.comparingDouble(DeprivingPerson::getArrivalTime)));
                }
                deprivingPopulation.get(camp).get(item).offer(new DeprivingPerson(quantity, tNow));
                inventoryPosition.get(camp).put(item, inventoryPosition.get(camp).get(item) - (int) quantity);
            }
        }
        // External consumption
        else {
            // No need to satisfy the demand
            if (camp.getCampExternalDemandSatisfactionType() == CampExternalDemandSatisfactionType.NONE) {
                int val = referralPopulation.get(camp).get(item) + quantity;
                referralPopulation.get(camp).put(item, val);
            }
            // Fully satisfy the demand
            else if (camp.getCampExternalDemandSatisfactionType() == CampExternalDemandSatisfactionType.FULLY){
                if (inventory.containsKey(camp) && inventory.get(camp).containsKey(item)) {
                    HashMap<Item, PriorityQueue<InventoryItem>> innerMap = inventory.get(camp);
                    PriorityQueue<InventoryItem> items = innerMap.get(item);
                    while (quantity > 0 && !items.isEmpty()) {
                        InventoryItem inventoryItem = items.peek();
                        if (inventoryItem.getQuantity() <= quantity) {
                            double totalTime = tNow - inventoryItem.getArrivalTime();
                            kpiManager.totalHoldingCost.get(camp).put(item, kpiManager.totalHoldingCost.get(camp).get(item) + (totalTime * item.getHoldingCost() * inventoryItem.getQuantity()));
                            quantity -= inventoryItem.getQuantity();
                            this.inventoryPosition.get(camp).put(item, this.inventoryPosition.get(camp).get(item) - inventoryItem.getQuantity());
                            items.poll();
                        }
                        else {
                            double totalTime = tNow - inventoryItem.getArrivalTime();
                            kpiManager.totalHoldingCost.get(camp).put(item, kpiManager.totalHoldingCost.get(camp).get(item) + (totalTime * item.getHoldingCost() * quantity));
                            inventoryItem.setQuantity(inventoryItem.getQuantity() - (int) quantity);
                            this.inventoryPosition.get(camp).put(item, this.inventoryPosition.get(camp).get(item) - (int) quantity);
                            quantity = 0; // Exit the loop
                        }
                    }
                }
                // If no inventory is available, then add it to the referral
                if (quantity > 0) {
                    if (!referralPopulation.containsKey(camp)) {
                        referralPopulation.put(camp, new HashMap<>());
                    }
                    if (!referralPopulation.get(camp).containsKey(item)) {
                        referralPopulation.get(camp).put(item, quantity);
                    } else {
                        int val = referralPopulation.get(camp).get(item) + quantity;
                        referralPopulation.get(camp).put(item, val);
                    }
                }
            }

        }
    }

    public void updateItemAvailability(Item item, boolean isAvailable) {
        this.isItemAvailable.put(item, isAvailable);
    }

    public void updatePopulation(Camp fromCamp, Camp toCamp, double quantity, MigrationType migrationType) {

        if (migrationType == MigrationType.INTERNAL_WITHIN_SYSTEM) {
            this.internalPopulation.put(fromCamp, this.internalPopulation.get(fromCamp) - (int) quantity);
            this.internalPopulation.put(toCamp, this.internalPopulation.get(toCamp) + (int) quantity);
        }
        else if(migrationType == MigrationType.INTERNAL_TO_SYSTEM) {
            this.internalPopulation.put(toCamp, this.internalPopulation.get(toCamp) + (int) quantity);
        }
        else if (migrationType == MigrationType.INTERNAL_FROM_SYSTEM) {
            this.externalPopulation.put(fromCamp, this.externalPopulation.get(fromCamp) - (int) quantity);
        }
        else if (migrationType == MigrationType.EXTERNAL_WITHIN_SYSTEM) {
            this.externalPopulation.put(fromCamp, this.externalPopulation.get(fromCamp) - (int) quantity);
            this.externalPopulation.put(toCamp, this.externalPopulation.get(toCamp) + (int) quantity);
        }
        else if (migrationType == MigrationType.EXTERNAL_TO_SYSTEM) {
            this.externalPopulation.put(toCamp, this.externalPopulation.get(toCamp) + (int) quantity);
        }
        else if (migrationType == MigrationType.EXTERNAL_FROM_SYSTEM) {
            this.externalPopulation.put(fromCamp, this.externalPopulation.get(fromCamp) - (int) quantity);
        }
    }

    public void updateFunds(Camp camp, Item item, FundingType fundingType, double amount, double expiration, double arrivalTime){
        if (fundingType == FundingType.MONETARY_REGULAR){
            this.availableFunds += amount;
        }
        else if (fundingType == FundingType.MONETARY_EARMARKED){
            this.earmarkedFunds.put(camp, this.earmarkedFunds.get(camp) + amount);
        }
        else if (fundingType == FundingType.INKIND_REGULAR){
            if (!centralWarehouseInventory.containsKey(item)) {
                centralWarehouseInventory.put(item, new PriorityQueue<>(Comparator.comparingDouble(InventoryItem::getExpiration)));
            }
            centralWarehouseInventory.get(item).offer(new InventoryItem((int) amount, expiration, arrivalTime));
            centralWarehousePosition.put(item, centralWarehousePosition.get(item) + (int) amount);
        }
        else if (fundingType == FundingType.INKIND_EARMARKED){
            HashMap<Item, PriorityQueue<InventoryItem>> campInventory = inventory.get(camp);

            if (!campInventory.containsKey(item)) {
                campInventory.put(item, new PriorityQueue<>(Comparator.comparingDouble(InventoryItem::getExpiration)));
            }
            campInventory.get(item).offer(new InventoryItem((int) amount, expiration, arrivalTime));
            inventoryPosition.get(camp).put(item, inventoryPosition.get(camp).get(item) + (int) amount);
        }
    }

    @Override
    protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    public HashMap<Camp, HashMap<Item, Integer>> getInitialInventory() {
        return initialInventory;
    }

    public void setInitialInventory(HashMap<Camp, HashMap<Item, Integer>> initialInventory) {
        this.initialInventory = initialInventory;
    }

    public HashMap<Camp, HashMap<Item, PriorityQueue<InventoryItem>>> getInventory() {
        return inventory;
    }

    public void setInventory(HashMap<Camp, HashMap<Item, PriorityQueue<InventoryItem>>> inventory) {
        this.inventory = inventory;
    }

    public HashMap<Item, Integer> getInitialCentralWarehouseInventory() {
        return initialCentralWarehouseInventory;
    }

    public void setInitialCentralWarehouseInventory(HashMap<Item, Integer> initialCentralWarehouseInventory) {
        this.initialCentralWarehouseInventory = initialCentralWarehouseInventory;
    }

    public HashMap<Item, PriorityQueue<InventoryItem>> getCentralWarehouseInventory() {
        return centralWarehouseInventory;
    }

    public void setCentralWarehouseInventory(HashMap<Item, PriorityQueue<InventoryItem>> centralWarehouseInventory) {
        this.centralWarehouseInventory = centralWarehouseInventory;
    }

    public double getAvailableFunds() {
        return availableFunds;
    }

    public void setAvailableFunds(double availableFunds) {
        this.availableFunds = availableFunds;
    }

    public HashMap<Camp, Double> getEarmarkedFunds() {
        return earmarkedFunds;
    }

    public void setEarmarkedFunds(HashMap<Camp, Double> earmarkedFunds) {
        this.earmarkedFunds = earmarkedFunds;
    }

    public HashMap<Camp, HashMap<Item, Integer>> getInitialEarmarkedInKind() {
        return initialEarmarkedInKind;
    }

    public void setInitialEarmarkedInKind(HashMap<Camp, HashMap<Item, Integer>> initialEarmarkedInKind) {
        this.initialEarmarkedInKind = initialEarmarkedInKind;
    }

    public HashMap<Camp, HashMap<Item, PriorityQueue<DeprivingPerson>>> getDeprivingPopulation() {
        return deprivingPopulation;
    }

    public void setDeprivingPopulation(HashMap<Camp, HashMap<Item, PriorityQueue<DeprivingPerson>>> deprivingPopulation) {
        this.deprivingPopulation = deprivingPopulation;
    }

    public HashMap<Camp, HashMap<Item, Integer>> getReferralPopulation() {
        return referralPopulation;
    }

    public void setReferralPopulation(HashMap<Camp, HashMap<Item, Integer>> referralPopulation) {
        this.referralPopulation = referralPopulation;
    }

    public HashMap<Item, Boolean> getIsItemAvailable() {
        return isItemAvailable;
    }

    public void setIsItemAvailable(HashMap<Item, Boolean> isItemAvailable) {
        this.isItemAvailable = isItemAvailable;
    }

    public HashMap<Camp, Integer> getInternalPopulation() {
        return internalPopulation;
    }

    public void setInternalPopulation(HashMap<Camp, Integer> internalPopulation) {
        this.internalPopulation = internalPopulation;
    }

    public HashMap<Camp, Integer> getExternalPopulation() {
        return externalPopulation;
    }

    public void setExternalPopulation(HashMap<Camp, Integer> externalPopulation) {
        this.externalPopulation = externalPopulation;
    }

    public HashMap<Camp, HashMap<Item, Double>> getThresholdExternalDemand() {
        return thresholdExternalDemand;
    }

    public void setThresholdExternalDemand(HashMap<Camp, HashMap<Item, Double>> thresholdExternalDemand) {
        this.thresholdExternalDemand = thresholdExternalDemand;
    }

    public KPIManager getKpiManager() {
        return kpiManager;
    }

    public void setKpiManager(KPIManager kpiManager) {
        this.kpiManager = kpiManager;
    }

    public IPolicy getInventoryPolicy() {
        return inventoryPolicy;
    }

    public void setInventoryPolicy(IPolicy inventoryPolicy) {
        this.inventoryPolicy = inventoryPolicy;
    }

    public HashMap<Camp, HashMap<Item, Integer>> getInventoryPosition() {
        return inventoryPosition;
    }

    public void setInventoryPosition(HashMap<Camp, HashMap<Item, Integer>> inventoryPosition) {
        this.inventoryPosition = inventoryPosition;
    }

    public HashMap<Item, Integer> getCentralWarehousePosition() {
        return centralWarehousePosition;
    }

    public void setCentralWarehousePosition(HashMap<Item, Integer> centralWarehousePosition) {
        this.centralWarehousePosition = centralWarehousePosition;
    }

}
