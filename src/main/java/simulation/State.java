package simulation;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.PriorityQueue;

import com.fasterxml.jackson.annotation.JsonIgnore;

import data.Camp;
import data.Environment;
import data.Item;
import data.event_info.Demand;
import data.event_info.Migration;
import enums.DemandClass;
import enums.FundingType;
import enums.MigrationType;
import simulation.data.DeprivingPerson;
import simulation.data.InventoryItem;
import simulation.decision.IPolicy;
import simulation.generator.InterarrivalGenerator;

public class State implements Cloneable {

    private HashMap<Camp, HashMap<Item, Integer>> initialInventory= new HashMap<>();
    private HashMap<Camp, HashMap<Item, PriorityQueue<InventoryItem>>> inventory= new HashMap<>();
    private HashMap<Camp, HashMap<Item, Integer>> inventoryPosition= new HashMap<>();

    private HashMap<Item, Integer> initialCentralWarehouseInventory= new HashMap<>();
    private HashMap<Item, PriorityQueue<InventoryItem>> centralWarehouseInventory= new HashMap<>();
    private HashMap<Item, Integer> centralWarehousePosition= new HashMap<>();

    private double availableFunds;
    private HashMap<Camp, Double> earmarkedFunds= new HashMap<>();

    private HashMap<Camp, HashMap<Item, Integer>> initialEarmarkedInKind= new HashMap<>();

    private HashMap<Camp, HashMap<Item, PriorityQueue<DeprivingPerson>>> deprivingPopulation= new HashMap<>();
    private HashMap<Camp, HashMap<Item, Integer>> referralPopulation= new HashMap<>();

    private HashMap<Item, Boolean> isItemAvailable= new HashMap<>();

    private HashMap<Camp, Integer> internalPopulation;
    private HashMap<Camp, Integer> externalPopulation;

    /** Effective mean interarrival in minutes per (camp, item, demandClass). Key: campName|itemName|INTERNAL|EXTERNAL */
    private HashMap<String, Double> effectiveMeanInterarrivalMinutes = new HashMap<>();

    private HashMap<Camp, HashMap<Item, Double>> thresholdExternalDemand;

    private KPIManager kpiManager;

    @JsonIgnore
    private IPolicy inventoryPolicy;

    private double lastFundingReceived = 0.0;

    private Environment environment;

    public State () {

    }

    public void initialize(Environment environment) {
        this.environment = environment;
        this.kpiManager = new KPIManager(this);
        this.kpiManager.setReportEvents(environment.getSimulationConfig().isReportEvents());
        this.kpiManager.setReportKPIs(environment.getSimulationConfig().isReportKPIs());
        this.kpiManager.setFileName(environment.getSimulationConfig().getFileName());
        this.kpiManager.setUseReactUI(environment.getSimulationConfig().isUseReactUI());

        this.deprivingPopulation = new HashMap<>();
        this.referralPopulation = new HashMap<>();

        for (var camp : this.initialInventory.keySet()) {
            this.referralPopulation.put(camp, new HashMap<>());
            this.deprivingPopulation.put(camp, new HashMap<>());
            for (var item : this.initialInventory.get(camp).keySet()) {
                this.deprivingPopulation.get(camp).put(item, new PriorityQueue<>(Comparator.comparingDouble(DeprivingPerson::getArrivalTime)));
                this.referralPopulation.get(camp).put(item, 0);
                System.out.println("Initializing camp: " + camp.getName() + ", item: " + item.getName() + ", quantity: " + initialInventory.get(camp).get(item));
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
                
                if (inventory.get(camp) == null) {
                    throw new IllegalStateException(String.format(
                        "No inventory initialized for camp '%s'. Please ensure initial inventory is properly configured.",
                        camp.getName()
                    ));
                }
                
                if (inventory.get(camp).get(item) == null) {
                    throw new IllegalStateException(String.format(
                        "No inventory initialized for camp '%s' and item '%s'. Please ensure initial inventory is properly configured for all camp-item combinations.",
                        camp.getName(), item.getName()
                    ));
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
        int totalQuantity = inventoryToSend.stream().mapToInt(InventoryItem::getQuantity).sum();
        if (totalQuantity > 0) kpiManager.recordReplenishmentAtCamp(camp, item, totalQuantity);
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

            // Deprivation time in days (simulation time unit for deprivation is days)
            double totalTimeDays = time - deprivingPerson.getArrivalTime();
            kpiManager.totalDeprivedPopulation.get(camp).put(item, kpiManager.totalDeprivedPopulation.get(camp).get(item) + deprivingPerson.getQuantity());
            kpiManager.averageDeprivationTime.get(camp).put(item, kpiManager.averageDeprivationTime.get(camp).get(item) + totalTimeDays * deprivingPerson.getQuantity());

            var previousCost = kpiManager.totalDeprivationCost.get(camp).get(item);

            if (deprivingPerson.getQuantity() <= inventoryToSend.get(0).getQuantity()) {
                var deprivation = calculateDeprivation(item, deprivingPerson.getQuantity(), totalTimeDays);
                kpiManager.totalDeprivationCost.get(camp).put(item, previousCost + deprivation);
                
                // Calculate holding cost for consumed inventory
                InventoryItem inventoryItem = inventoryToSend.get(0);
                double holdingTime = time - inventoryItem.getArrivalTime();
                double holdingCostIncrement = holdingTime * item.getHoldingCost() * deprivingPerson.getQuantity();
                var previousHoldingCost = kpiManager.totalHoldingCost.get(camp).get(item);
                kpiManager.totalHoldingCost.get(camp).put(item, previousHoldingCost + holdingCostIncrement);
                
                inventoryToSend.get(0).setQuantity(inventoryToSend.get(0).getQuantity() - deprivingPerson.getQuantity());
                deprivingPopulation.get(camp).get(item).poll();
            }
            else {
                // Since we are not able to satisfy all depriving population, we use available inventory
                var deprivation = calculateDeprivation(item, inventoryToSend.get(0).getQuantity(), totalTimeDays);
                kpiManager.totalDeprivationCost.get(camp).put(item, previousCost + deprivation);
                
                // Calculate holding cost for consumed inventory
                InventoryItem inventoryItem = inventoryToSend.get(0);
                double holdingTime = time - inventoryItem.getArrivalTime();
                double holdingCostIncrement = holdingTime * item.getHoldingCost() * inventoryItem.getQuantity();
                var previousHoldingCost = kpiManager.totalHoldingCost.get(camp).get(item);
                kpiManager.totalHoldingCost.get(camp).put(item, previousHoldingCost + holdingCostIncrement);
                
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
        // Note: Positions were already updated when the transfer was ordered (in InventoryControlEvent)
        // Position = on-hand + in-transit, so it stays the same when inventory arrives
    }

    /**
     * Deprivation cost for a given number of people deprived for a given time.
     * Uses the same formula as KPIManager.calculateFinalCosts: linear + exponential term
     * so that in-simulation and end-of-horizon costs are consistent.
     *
     * @param time duration deprived, in <b>days</b> (simulation time unit for deprivation is days)
     */
    public double calculateDeprivation(Item item, int totalNumberOfPeople, double time){
        double rate = item.getDeprivationRate();   // per day
        double coeff = item.getDeprivationCoefficient();
        double linearTerm = coeff * rate * time;
        double exponentialTerm = coeff * (Math.exp(rate * time) - 1);
        return (linearTerm + exponentialTerm) * totalNumberOfPeople;
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
        // Note: Position was already updated when the order was placed (in InventoryControlEvent)
        // Position = on-hand + in-transit, so it stays the same when inventory arrives
        // Now update the ordering cost
        kpiManager.totalOrderingCost.put(item, kpiManager.totalOrderingCost.get(item) + item.getOrderingCost());
    }

    /**
     * Returns the on-hand (physical) inventory quantity at a camp for an item.
     * Does not include in-transit. Use this to cap how much demand we can actually satisfy.
     */
    private int getOnHandQuantity(Camp camp, Item item) {
        if (!inventory.containsKey(camp) || !inventory.get(camp).containsKey(item)) return 0;
        return inventory.get(camp).get(item).stream().mapToInt(InventoryItem::getQuantity).sum();
    }

    public void consumeInventory(Camp camp, Item item, boolean isInternal, int quantity, double tNow) {
        kpiManager.recordDemandArrived(camp, isInternal, quantity);
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
                        double costIncrement = totalTime * item.getHoldingCost() * inventoryItem.getQuantity();

                        kpiManager.totalHoldingCost.get(camp).put(item, kpiManager.totalHoldingCost.get(camp).get(item) + costIncrement);
                        inventoryPosition.get(camp).put(item, inventoryPosition.get(camp).get(item) - inventoryItem.getQuantity());
                        quantity -= inventoryItem.getQuantity();
                        items.poll();
                    } else {
                        double totalTime = tNow - inventoryItem.getArrivalTime();
                        double costIncrement = totalTime * item.getHoldingCost() * quantity;

                        kpiManager.totalHoldingCost.get(camp).put(item, kpiManager.totalHoldingCost.get(camp).get(item) + costIncrement);
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
        // External consumption: allow only what we can actually give (on-hand), not position (on-hand + in-transit)
        else {
            int threshold = inventoryPolicy.getThreshold(camp, item);
            int onHand = getOnHandQuantity(camp, item);
            int availableAboveThreshold = Math.max(0, onHand - threshold);
            int allowedQuantity = Math.min(quantity, availableAboveThreshold);

            int deniedDueToThreshold = quantity - allowedQuantity;


            int quantityToProcess = allowedQuantity;

            if (inventory.containsKey(camp) && inventory.get(camp).containsKey(item)) {
                HashMap<Item, PriorityQueue<InventoryItem>> innerMap = inventory.get(camp);
                PriorityQueue<InventoryItem> items = innerMap.get(item);

                while (quantityToProcess > 0 && !items.isEmpty()) {
                    InventoryItem inventoryItem = items.peek();

                    if (inventoryItem.getQuantity() <= quantityToProcess) {
                        double totalTime = tNow - inventoryItem.getArrivalTime();
                        kpiManager.totalHoldingCost.get(camp).put(item, kpiManager.totalHoldingCost.get(camp).get(item) + (totalTime * item.getHoldingCost() * inventoryItem.getQuantity()));

                        quantityToProcess -= inventoryItem.getQuantity(); // İşlenecek miktarı düş
                        this.inventoryPosition.get(camp).put(item, this.inventoryPosition.get(camp).get(item) - inventoryItem.getQuantity());
                        items.poll();
                    }
                    else {
                        double totalTime = tNow - inventoryItem.getArrivalTime();
                        kpiManager.totalHoldingCost.get(camp).put(item, kpiManager.totalHoldingCost.get(camp).get(item) + (totalTime * item.getHoldingCost() * quantityToProcess));

                        inventoryItem.setQuantity(inventoryItem.getQuantity() - (int) quantityToProcess);
                        this.inventoryPosition.get(camp).put(item, this.inventoryPosition.get(camp).get(item) - (int) quantityToProcess);
                        quantityToProcess = 0; // Exit the loop
                    }
                }
            }

            int totalUnmetDemand = quantityToProcess + deniedDueToThreshold;

            if (totalUnmetDemand > 0) {
                if (!referralPopulation.containsKey(camp)) {
                    referralPopulation.put(camp, new HashMap<>());
                }
                if (!referralPopulation.get(camp).containsKey(item)) {
                    referralPopulation.get(camp).put(item, totalUnmetDemand);
                } else {
                    int val = referralPopulation.get(camp).get(item) + totalUnmetDemand;
                    referralPopulation.get(camp).put(item, val);
                }

                // Update referral cost: total = cumulative referred people * unit referral cost (no double-count)
                if (kpiManager.totalReferralCost.containsKey(camp)) {
                    int cumulativeReferred = referralPopulation.get(camp).get(item);
                    kpiManager.totalReferralCost.get(camp).put(item, cumulativeReferred * item.getReferralCost());
                }
            }
        }
    }

    public void updateItemAvailability(Item item, boolean isAvailable) {
        this.isItemAvailable.put(item, isAvailable);
    }

    private static String demandKey(String campName, String itemName, DemandClass demandClass) {
        return campName + "|" + itemName + "|" + demandClass.name();
    }

    /**
     * Returns effective mean interarrival in minutes for (camp, demand).
     * If migration has modified demand rates, returns the effective value; otherwise null (use base from demand config).
     */
    public Double getEffectiveMeanInterarrivalMinutes(Camp camp, Demand demand) {
        if (camp == null || demand == null || demand.getItem() == null) return null;
        return effectiveMeanInterarrivalMinutes.get(demandKey(camp.getName(), demand.getItem().getName(), demand.getDemandClass()));
    }

    /**
     * Updates demand rates when a migration event occurs. Transfers a fraction of demand rate
     * from source to destination (or out of / into system). Migration is demand-based, not population-based.
     */
    public void updateDemandRates(Migration migration, double demandRatio) {
        if (migration == null || demandRatio <= 0 || demandRatio > 1) return;
        MigrationType mt = migration.getMigrationType();
        Camp fromCamp = migration.getFromCamp();
        Camp toCamp = migration.getToCamp();

        if (mt == MigrationType.INTERNAL_WITHIN_SYSTEM || mt == MigrationType.EXTERNAL_WITHIN_SYSTEM) {
            if (fromCamp == null || toCamp == null) return;
            boolean internal = (mt == MigrationType.INTERNAL_WITHIN_SYSTEM);
            DemandClass dc = internal ? DemandClass.INTERNAL : DemandClass.EXTERNAL;
            for (Demand d : fromCamp.getDemands()) {
                if (d == null || d.getDemandClass() != dc) continue;
                Item item = d.getItem();
                if (item == null) continue;
                Demand toDemand = getMatchingDemand(toCamp, item, dc);
                if (toDemand == null) continue;
                double fromMean = getEffectiveOrBaseMean(fromCamp, d);
                double toMean = getEffectiveOrBaseMean(toCamp, toDemand);
                if (fromMean <= 0) continue;
                double fromRatePerHour = 60.0 / fromMean;
                double transferRate = fromRatePerHour * demandRatio;
                double fromNewRate = fromRatePerHour * (1.0 - demandRatio);
                double toCurrentRate = (toMean > 0) ? 60.0 / toMean : 0;
                double toNewRate = toCurrentRate + transferRate;
                setEffectiveMean(fromCamp.getName(), item.getName(), dc, fromNewRate > 0 ? 60.0 / fromNewRate : Double.MAX_VALUE);
                setEffectiveMean(toCamp.getName(), item.getName(), dc, toNewRate > 0 ? 60.0 / toNewRate : 1.0);
            }
        } else if (mt == MigrationType.INTERNAL_FROM_SYSTEM || mt == MigrationType.EXTERNAL_FROM_SYSTEM) {
            if (fromCamp == null) return;
            boolean internal = (mt == MigrationType.INTERNAL_FROM_SYSTEM);
            DemandClass dc = internal ? DemandClass.INTERNAL : DemandClass.EXTERNAL;
            for (Demand d : fromCamp.getDemands()) {
                if (d == null || d.getDemandClass() != dc) continue;
                Item item = d.getItem();
                if (item == null) continue;
                double fromMean = getEffectiveOrBaseMean(fromCamp, d);
                if (fromMean <= 0) continue;
                double fromRatePerHour = 60.0 / fromMean;
                double fromNewRate = fromRatePerHour * (1.0 - demandRatio);
                setEffectiveMean(fromCamp.getName(), item.getName(), dc, fromNewRate > 0 ? 60.0 / fromNewRate : Double.MAX_VALUE);
            }
        } else if (mt == MigrationType.INTERNAL_TO_SYSTEM || mt == MigrationType.EXTERNAL_TO_SYSTEM) {
            if (toCamp == null) return;
            boolean internal = (mt == MigrationType.INTERNAL_TO_SYSTEM);
            DemandClass dc = internal ? DemandClass.INTERNAL : DemandClass.EXTERNAL;
            for (Demand d : toCamp.getDemands()) {
                if (d == null || d.getDemandClass() != dc) continue;
                Item item = d.getItem();
                if (item == null) continue;
                double toMean = getEffectiveOrBaseMean(toCamp, d);
                double toRate = (toMean > 0) ? 60.0 / toMean : 0;
                double toNewRate = toRate * (1.0 + demandRatio);
                setEffectiveMean(toCamp.getName(), item.getName(), dc, toNewRate > 0 ? 60.0 / toNewRate : 1.0);
            }
        }
    }

    private Demand getMatchingDemand(Camp camp, Item item, DemandClass demandClass) {
        if (camp.getDemands() == null) return null;
        for (Demand d : camp.getDemands()) {
            if (d != null && d.getItem() != null && d.getItem().equals(item) && d.getDemandClass() == demandClass)
                return d;
        }
        return null;
    }

    private double getEffectiveOrBaseMean(Camp camp, Demand demand) {
        Double eff = getEffectiveMeanInterarrivalMinutes(camp, demand);
        if (eff != null) return eff;
        if (demand.getArrivalData() != null && demand.getArrivalData().getDistParameters() != null) {
            double m = demand.getArrivalData().getDistParameters().getMean();
            return m > 0 ? m : 0;
        }
        return 0;
    }

    private void setEffectiveMean(String campName, String itemName, DemandClass dc, double meanMinutes) {
        effectiveMeanInterarrivalMinutes.put(demandKey(campName, itemName, dc), meanMinutes);
    }

    /** @deprecated Migration is now demand-based; use updateDemandRates instead. Kept for backward compatibility. */
    public void updatePopulation(Camp fromCamp, Camp toCamp, double quantity, MigrationType migrationType) {
        // No-op: migration now uses updateDemandRates (demand-based, not population-based)
    }

    public void updateFunds(Camp camp, Item item, FundingType fundingType, double amount, double expiration, double arrivalTime){
        if (fundingType == FundingType.MONETARY_REGULAR){
            this.availableFunds += amount;
        }
        else if (fundingType == FundingType.MONETARY_EARMARKED){
            if (camp == null) {
                System.out.println("Warning: Trying to add earmarked funds to null camp. Adding to available funds instead.");
                this.availableFunds += amount;
                return;
            }
            
            if (!earmarkedFunds.containsKey(camp)) {
                earmarkedFunds.put(camp, 0.0);
            }
            this.earmarkedFunds.put(camp, this.earmarkedFunds.get(camp) + amount);
        }
        else if (fundingType == FundingType.INKIND_REGULAR){
            if (item == null) {
                System.out.println("Warning: Trying to add in-kind funding with null item. Ignoring this funding.");
                return;
            }
            
            if (!centralWarehouseInventory.containsKey(item)) {
                centralWarehouseInventory.put(item, new PriorityQueue<>(Comparator.comparingDouble(InventoryItem::getExpiration)));
            }
            
            if (!centralWarehousePosition.containsKey(item)) {
                centralWarehousePosition.put(item, 0);
            }
            
            centralWarehouseInventory.get(item).offer(new InventoryItem((int) amount, expiration, arrivalTime));
            centralWarehousePosition.put(item, centralWarehousePosition.get(item) + (int) amount);
        }
        else if (fundingType == FundingType.INKIND_EARMARKED){
            if (camp == null || item == null) {
                System.out.println("Warning: Trying to add earmarked in-kind to null camp or with null item. Adding to central warehouse instead.");
                if (item != null) {
                    if (!centralWarehouseInventory.containsKey(item)) {
                        centralWarehouseInventory.put(item, new PriorityQueue<>(Comparator.comparingDouble(InventoryItem::getExpiration)));
                    }
                    if (!centralWarehousePosition.containsKey(item)) {
                        centralWarehousePosition.put(item, 0);
                    }
                    centralWarehouseInventory.get(item).offer(new InventoryItem((int) amount, expiration, arrivalTime));
                    centralWarehousePosition.put(item, centralWarehousePosition.get(item) + (int) amount);
                }
                return;
            }
            
            if (!inventory.containsKey(camp)) {
                inventory.put(camp, new HashMap<>());
            }
            
            HashMap<Item, PriorityQueue<InventoryItem>> campInventory = inventory.get(camp);

            if (!campInventory.containsKey(item)) {
                campInventory.put(item, new PriorityQueue<>(Comparator.comparingDouble(InventoryItem::getExpiration)));
            }
            
            if (!inventoryPosition.containsKey(camp)) {
                inventoryPosition.put(camp, new HashMap<>());
            }
            if (!inventoryPosition.get(camp).containsKey(item)) {
                inventoryPosition.get(camp).put(item, 0);
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

    public int getCurrentInternalPopulation(Camp camp) {
        return internalPopulation.getOrDefault(camp, 0);
    }

    public int getCurrentExternalPopulation(Camp camp) {
        return externalPopulation.getOrDefault(camp, 0);
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

    public double getLastFundingReceived() {
        return lastFundingReceived;
    }

    public void setLastFundingReceived(double amount) {
        this.lastFundingReceived = amount;
    }

    public Environment getEnvironment() {
        return environment;
    }

    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

}
