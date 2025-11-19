package simulation.decision;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
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
    
    private HashMap<Camp, HashMap<Item, Integer>> targetLevels;
    private HashMap<Item, Integer> centralTargetLevels;
    
    private HashMap<Camp, HashMap<Item, Double>> thresholdRatios;
    private HashMap<Item, Double> centralThresholdRatios;

    public TargetLevelPolicy() {
    }

    public void initialize(Environment environment, State state) {
        this.environment = environment;
        this.state = state;

        this.targetLevels = new HashMap<>();
        this.centralTargetLevels = new HashMap<>();
        this.thresholdRatios = new HashMap<>();
        this.centralThresholdRatios = new HashMap<>();

        setCampLevels();
        setCentralLevels();
    }

    private void setCampLevels() {
        for (Camp camp : environment.getCamps()) {
            if (!targetLevels.containsKey(camp)) {
                targetLevels.put(camp, new HashMap<>());
            }
            
            for (Item item : environment.getItems()) {
                // If target levels are not set, initialize to 0
                if (!targetLevels.get(camp).containsKey(item)) {
                    targetLevels.get(camp).put(item, 0);
                }
            }
        }
    }

    private void setCentralLevels() {
        for (Item item : environment.getItems()) {
            // If central target levels are not set, initialize to 0
            if (!centralTargetLevels.containsKey(item)) {
                centralTargetLevels.put(item, 0);
            }
        }
    }

    public ArrayList<IEvent> generateReplenishmentEvents(InterarrivalGenerator interarrivalGenerator, double time) {
        double totalCashNeededForItem = 0;
        double totalCashNeededForOrdering = 0;

        for (Item item : state.getCentralWarehousePosition().keySet()) {
            if (!state.getIsItemAvailable().get(item)) continue;

            int totalInventory = state.getCentralWarehousePosition().get(item);

            for (Camp camp : environment.getCamps()) {
                if (state.getInventoryPosition().get(camp).get(item) < 0)
                    totalInventory += state.getInventoryPosition().get(camp).get(item);
            }

            int targetLevel = centralTargetLevels.get(item);
            double thresholdRatio = centralThresholdRatios.getOrDefault(item, 0.0);
            int minimumLevel = (int) (targetLevel * thresholdRatio);

            // Order up to target level if below minimum threshold
            if (totalInventory < minimumLevel) {
                totalCashNeededForItem += (targetLevel - totalInventory) * item.getPrice();
                totalCashNeededForOrdering += item.getOrderingCost();
            }
        }

        double cashAvailable = state.getAvailableFunds() - totalCashNeededForOrdering;
        double ratio = Math.min(cashAvailable / (totalCashNeededForItem), 1.0);
        ArrayList<IEvent> replenishmentEvents = new ArrayList<>();

        if (cashAvailable <= 0) {
            return replenishmentEvents;
        }
        else if (cashAvailable >= (totalCashNeededForItem + totalCashNeededForOrdering)) {
            for (Item item : state.getCentralWarehousePosition().keySet()) {
                int totalInventory = state.getCentralWarehousePosition().get(item);
                for (Camp camp : environment.getCamps()) {
                    if (state.getInventoryPosition().get(camp).get(item) < 0)
                        totalInventory += state.getInventoryPosition().get(camp).get(item);
                }

                int targetLevel = centralTargetLevels.get(item);
                double thresholdRatio = centralThresholdRatios.getOrDefault(item, 0.0);
                int minimumLevel = (int) (targetLevel * thresholdRatio);

                if (totalInventory < minimumLevel) {
                    int quantity = targetLevel - totalInventory;
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
        else {
            for (Item item : state.getCentralWarehousePosition().keySet()) {
                int totalInventory = state.getCentralWarehousePosition().get(item);

                int targetLevel = centralTargetLevels.get(item);
                double thresholdRatio = centralThresholdRatios.getOrDefault(item, 0.0);
                int minimumLevel = (int) (targetLevel * thresholdRatio);

                if (totalInventory < minimumLevel) {
                    int quantity = (int) Math.ceil((targetLevel - totalInventory) * ratio);

                    ArrayList<InventoryItem> inventoryItems = new ArrayList<>();
                    double arrivalTime = time + interarrivalGenerator.generateReplenishment(item);
                    double expiration = 0.0;

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

    public ArrayList<IEvent> generateTransferEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time) {
        ArrayList<TransferRequest> transferRequest = new ArrayList<>();

        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                int totalInventory = state.getInventoryPosition().get(camp).get(item);
                if (totalInventory < 0){
                    totalInventory = 0;
                }
                
                int targetLevel = targetLevels.get(camp).get(item);
                double thresholdRatio = thresholdRatios.getOrDefault(camp, new HashMap<>()).getOrDefault(item, 0.0);
                int minimumLevel = (int) (targetLevel * thresholdRatio);

                // Transfer if below minimum threshold
                if (totalInventory <= minimumLevel) {
                    int quantity = targetLevel - totalInventory;
                    transferRequest.add(new TransferRequest(camp, item, quantity));
                }
            }
        }

        ArrayList<IEvent> transferEvents = new ArrayList<>();

        for (Item item : environment.getItems()) {
            ArrayList<TransferRequest> filteredRequest = (ArrayList<TransferRequest>) transferRequest.stream()
                    .filter(tr -> tr.getItem().equals(item))
                    .collect(Collectors.toList());
            if (filteredRequest.isEmpty()) continue;

            int totalDemand = 0;
            double totalInventory = 0;

            for (TransferRequest tr : filteredRequest) {
                totalDemand += tr.getQuantity();
            }

            for (var ie : state.getCentralWarehouseInventory().get(item)) {
                totalInventory += ie.getQuantity();
            }

            double ratio = Math.min(totalInventory / totalDemand, 1.0);
            if (ratio == 0) {
                continue;
            }
            else {
                for (TransferRequest tr : filteredRequest) {
                    tr.setQuantity((int) Math.ceil(tr.getQuantity() * ratio));
                }
                for (TransferRequest tr : filteredRequest) {
                    while (tr.getQuantity() > 0) {
                        boolean fulfilled = false;
                        for (Iterator<InventoryItem> iterator = state.getCentralWarehouseInventory().get(item).iterator(); iterator.hasNext(); ) {
                            InventoryItem ie = iterator.next();
                            ArrayList<InventoryItem> inventoryItems = new ArrayList<>();
                            if (ie.getQuantity() >= tr.getQuantity()) {
                                inventoryItems.add(new InventoryItem(tr.getQuantity(), ie.getExpiration(), ie.getArrivalTime()));
                                ie.setQuantity(ie.getQuantity() - tr.getQuantity());
                                transferEvents.add(new TransferEvent(tr.getToCamp(), item, inventoryItems, interarrivalGenerator, environment, time));
                                tr.setQuantity(0);
                                fulfilled = true;
                                break;
                            } else {
                                inventoryItems.add(new InventoryItem(ie.getQuantity(), ie.getExpiration(), ie.getArrivalTime()));
                                tr.setQuantity(tr.getQuantity() - ie.getQuantity());
                                iterator.remove();
                                transferEvents.add(new TransferEvent(tr.getToCamp(), item, inventoryItems, interarrivalGenerator, environment, time));
                            }
                        }
                        if (!fulfilled) {
                            break;
                        }
                    }
                }
            }
        }
        return transferEvents;
    }

    public ArrayList<IEvent> generateTransshipmentEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time) {
        ArrayList<IEvent> transshipmentRequest = new ArrayList<>();
        return transshipmentRequest;
    }

    @Override
    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    @Override
    public Environment getEnvironment() {
        return environment;
    }

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    public State getState() {
        return state;
    }

    public void setState(State state) {
        this.state = state;
    }

    public HashMap<Camp, HashMap<Item, Integer>> getTargetLevels() {
        return targetLevels;
    }

    public void setTargetLevels(HashMap<Camp, HashMap<Item, Integer>> targetLevels) {
        this.targetLevels = targetLevels;
    }

    public HashMap<Item, Integer> getCentralTargetLevels() {
        return centralTargetLevels;
    }

    public void setCentralTargetLevels(HashMap<Item, Integer> centralTargetLevels) {
        this.centralTargetLevels = centralTargetLevels;
    }

    public HashMap<Camp, HashMap<Item, Double>> getThresholdRatios() {
        return thresholdRatios;
    }

    public void setThresholdRatios(HashMap<Camp, HashMap<Item, Double>> thresholdRatios) {
        this.thresholdRatios = thresholdRatios;
    }

    public HashMap<Item, Double> getCentralThresholdRatios() {
        return centralThresholdRatios;
    }

    public void setCentralThresholdRatios(HashMap<Item, Double> centralThresholdRatios) {
        this.centralThresholdRatios = centralThresholdRatios;
    }
}

