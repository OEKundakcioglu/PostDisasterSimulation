package simulation.decision;

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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.stream.Collectors;

public class OrderUpToPolicy implements IPolicy, Cloneable {
    private Environment environment;
    private State state;
    private HashMap<Camp, HashMap<Item, Integer>> reorderPoints;
    private HashMap<Camp, HashMap<Item, Integer>> orderUpToLevels;

    private HashMap<Item, Integer> centralReorderPoints;
    private HashMap<Item, Integer> centralOrderUpToLevels;

    private HashMap<Camp, HashMap<Item, Double>> bufferRatios;
    private HashMap<Item, Double> centralBufferRatios;

    private HashMap<Camp, HashMap<Item, Integer>> periodicCounts;
    private HashMap<Item, Integer> centralPeriodicCounts;


    public OrderUpToPolicy() {

    }

    public void initialize(Environment environment, State state) {

        this.environment = environment;
        this.state = state;

        this.reorderPoints = new HashMap<>();
        this.orderUpToLevels = new HashMap<>();

        this.centralReorderPoints = new HashMap<>();
        this.centralOrderUpToLevels = new HashMap<>();


        setCampLevels();
        setCentralLevels();
    }

    private void setCampLevels() {
        for (Camp camp : environment.getCamps()) {
            reorderPoints.put(camp, new HashMap<>());
            orderUpToLevels.put(camp, new HashMap<>());

            for (Item item : environment.getItems()) {
                Demand onePeriodDemand = this.environment.getCorrespondingDemand(item, camp);
                if (onePeriodDemand == null) {
                    reorderPoints.get(camp).put(item, 0);
                    orderUpToLevels.get(camp).put(item, 0);
                    continue;
                }

                var leadTime = camp.getLeadTimeData().distParameters.getMean();
                var mean = onePeriodDemand.getArrivalData().getDistParameters().getMean();

                var internalPopulation = state.getInternalPopulation().get(camp) * onePeriodDemand.getInternalRatio();
                var externalPopulation = state.getExternalPopulation().get(camp) * onePeriodDemand.getExternalRatio();

                if (camp.getCampExternalDemandSatisfactionType() == CampExternalDemandSatisfactionType.NONE) {
                    externalPopulation = 0;
                }
                var bufferRatio = bufferRatios.get(camp).get(item);
                var periodicCount = periodicCounts.get(camp).get(item);

                reorderPoints.get(camp).put(item, (int) (mean * (internalPopulation + externalPopulation) * (leadTime) * (1 + bufferRatio)));
                orderUpToLevels.get(camp).put(item, (int) (mean * (internalPopulation + externalPopulation) * (periodicCount + leadTime) * (1 + bufferRatio)));
            }
        }
    }

    private void setCentralLevels() {
        for (Item item : environment.getItems()) {
            double totalDemand = 0.0;
            double leadTime = item.getLeadTimeData().distParameters.getMean();

            for (Camp camp : environment.getCamps()) {
                Demand onePeriodDemand = this.environment.getCorrespondingDemand(item, camp);

                if (onePeriodDemand == null) {
                    centralReorderPoints.put(item, 0);
                    centralOrderUpToLevels.put(item, 0);
                    continue;
                }

                var internalPopulation = state.getInternalPopulation().get(camp) * onePeriodDemand.getInternalRatio();
                var externalPopulation = state.getExternalPopulation().get(camp) * onePeriodDemand.getExternalRatio();

                if (camp.getCampExternalDemandSatisfactionType() == CampExternalDemandSatisfactionType.NONE) {
                    externalPopulation = 0;
                }

                var population = (internalPopulation + externalPopulation);
                totalDemand += (this.environment.getCorrespondingDemand(item, camp).getArrivalData().getDistParameters().getMean() * population);
            }

            centralReorderPoints.put(item, (int) (totalDemand * leadTime * (1 + centralBufferRatios.get(item))));
            centralOrderUpToLevels.put(item, (int) (totalDemand * (centralPeriodicCounts.get(item) + leadTime) * (1 + centralBufferRatios.get(item))));
        }
    }

    public ArrayList<IEvent> generateReplenishmentEvents(InterarrivalGenerator interarrivalGenerator, double time) {
        // First of all, we need to find the requests for replenishment
        double totalCashNeededForItem = 0;
        double totalCashNeededForOrdering = 0;

        for (Item item : state.getCentralWarehousePosition().keySet()) {
            // If the item is not available, we will not consider it since we cannot order it
            if (!state.getIsItemAvailable().get(item)) continue;

            int totalInventory = state.getCentralWarehousePosition().get(item);

            for (Camp camp : environment.getCamps()) {
                if (state.getInventoryPosition().get(camp).get(item) < 0)
                    totalInventory += state.getInventoryPosition().get(camp).get(item);
            }

            int reorderPoint = centralReorderPoints.get(item);
            int orderUpToLevel = centralOrderUpToLevels.get(item);

            if (totalInventory < reorderPoint) {
                totalCashNeededForItem += (orderUpToLevel - totalInventory) * item.getPrice();
                totalCashNeededForOrdering += item.getOrderingCost();
            }
        }
        // Now we need to find the cash available
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

                int reorderPoint = centralReorderPoints.get(item);
                int orderUpToLevel = centralOrderUpToLevels.get(item);

                if (totalInventory < reorderPoint) {
                    int quantity = orderUpToLevel - totalInventory;
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

                int reorderPoint = centralReorderPoints.get(item);
                int orderUpToLevel = centralOrderUpToLevels.get(item);

                if (totalInventory < reorderPoint) {
                    int quantity = (int) Math.ceil((orderUpToLevel - totalInventory) * ratio);

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
                int reorderPoint = reorderPoints.get(camp).get(item);
                int orderUpToLevel = orderUpToLevels.get(camp).get(item);

                if (totalInventory < reorderPoint) {
                    int quantity = orderUpToLevel - totalInventory;
                    transferRequest.add(new TransferRequest(camp, item, quantity));
                }
            }
        }

        ArrayList<IEvent> transferEvents = new ArrayList<>();

        for (Item item : environment.getItems()) {
            // filter one item from the request
            ArrayList<TransferRequest> filteredRequest = (ArrayList<TransferRequest>) transferRequest.stream().filter(tr -> tr.getItem().equals(item)).collect(Collectors.toList());
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
                        boolean fulfilled = false; // Flag to track if the request is fulfilled
                        for (Iterator<InventoryItem> iterator = state.getCentralWarehouseInventory().get(item).iterator(); iterator.hasNext(); ) {
                            InventoryItem ie = iterator.next();
                            ArrayList<InventoryItem> inventoryItems = new ArrayList<>();
                            if (ie.getQuantity() >= tr.getQuantity()) {
                                inventoryItems.add(new InventoryItem(tr.getQuantity(), ie.getExpiration(), ie.getArrivalTime()));
                                ie.setQuantity(ie.getQuantity() - tr.getQuantity());
                                transferEvents.add(new TransferEvent(tr.getToCamp(), item, inventoryItems, interarrivalGenerator, time));
                                tr.setQuantity(0); // Request quantity fulfilled
                                fulfilled = true;
                                break;
                            } else {
                                inventoryItems.add(new InventoryItem(ie.getQuantity(), ie.getExpiration(), ie.getArrivalTime()));
                                tr.setQuantity(tr.getQuantity() - ie.getQuantity());
                                iterator.remove(); // Remove the inventory item from the list
                                transferEvents.add(new TransferEvent(tr.getToCamp(), item, inventoryItems, interarrivalGenerator, time));
                            }
                        }
                        if (!fulfilled) {
                            break; // Break out of the while loop if request not fulfilled
                        }
                    }

                }
            }
        }
        return transferEvents;
    }



    @Override
    public Object clone() throws CloneNotSupportedException {
        return super.clone();
    }

    public Environment getEnvironment() {
        return environment;
    }

    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    public State getState() {
        return state;
    }

    public void setState(State state) {
        this.state = state;
    }

    public HashMap<Camp, HashMap<Item, Integer>> getReorderPoints() {
        return reorderPoints;
    }

    public void setReorderPoints(HashMap<Camp, HashMap<Item, Integer>> reorderPoints) {
        this.reorderPoints = reorderPoints;
    }

    public HashMap<Camp, HashMap<Item, Integer>> getOrderUpToLevels() {
        return orderUpToLevels;
    }

    public void setOrderUpToLevels(HashMap<Camp, HashMap<Item, Integer>> orderUpToLevels) {
        this.orderUpToLevels = orderUpToLevels;
    }

    public HashMap<Item, Integer> getCentralReorderPoints() {
        return centralReorderPoints;
    }

    public void setCentralReorderPoints(HashMap<Item, Integer> centralReorderPoints) {
        this.centralReorderPoints = centralReorderPoints;
    }

    public HashMap<Item, Integer> getCentralOrderUpToLevels() {
        return centralOrderUpToLevels;
    }

    public void setCentralOrderUpToLevels(HashMap<Item, Integer> centralOrderUpToLevels) {
        this.centralOrderUpToLevels = centralOrderUpToLevels;
    }

    public HashMap<Camp, HashMap<Item, Double>> getBufferRatios() {
        return bufferRatios;
    }

    public void setBufferRatios(HashMap<Camp, HashMap<Item, Double>> bufferRatios) {
        this.bufferRatios = bufferRatios;
    }

    public HashMap<Item, Double> getCentralBufferRatios() {
        return centralBufferRatios;
    }

    public void setCentralBufferRatios(HashMap<Item, Double> centralBufferRatios) {
        this.centralBufferRatios = centralBufferRatios;
    }

    public HashMap<Camp, HashMap<Item, Integer>> getPeriodicCounts() {
        return periodicCounts;
    }

    public void setPeriodicCounts(HashMap<Camp, HashMap<Item, Integer>> periodicCounts) {
        this.periodicCounts = periodicCounts;
    }

    public HashMap<Item, Integer> getCentralPeriodicCounts() {
        return centralPeriodicCounts;
    }

    public void setCentralPeriodicCounts(HashMap<Item, Integer> centralPeriodicCounts) {
        this.centralPeriodicCounts = centralPeriodicCounts;
    }
}