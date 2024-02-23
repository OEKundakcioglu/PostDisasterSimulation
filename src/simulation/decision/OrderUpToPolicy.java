package simulation.decision;

import data.Camp;
import data.Environment;
import data.Item;
import data.event_info.Demand;
import simulation.State;
import simulation.data.InventoryItem;
import simulation.data.requests.TransferRequest;
import simulation.event.IEvent;
import simulation.event.ReplenishmentEvent;
import simulation.event.TransferEvent;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Random;
import java.util.stream.Collectors;

public class OrderUpToPolicy implements Cloneable {

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


    public OrderUpToPolicy(){

    }

    public void intialize(Environment environment, State state) {

        this.environment = environment;
        this.state = state;

        this.reorderPoints = new HashMap<>();
        this.orderUpToLevels = new HashMap<>();

        this.centralReorderPoints = new HashMap<>();
        this.centralOrderUpToLevels = new HashMap<>();


        for (Camp camp : environment.getCamps()) {
            reorderPoints.put(camp, new HashMap<>());
            orderUpToLevels.put(camp, new HashMap<>());

            for (Item item : environment.getItems()) {
                Demand onePeriodDemand = this.environment.getCorrespondingDemand(item, camp);
                var leadTime = camp.getLeadTimeData().distParameters.getMean();
                reorderPoints.get(camp).put(item, (int) (onePeriodDemand.getArrivalData().getDistParameters().getMean() * camp.getInitialInternalPopulation()
                        * leadTime * (1 + bufferRatios.get(camp).get(item))));
                orderUpToLevels.get(camp).put(item, (int) (onePeriodDemand.getArrivalData().getDistParameters().getMean() * camp.getInitialInternalPopulation()
                        * (periodicCounts.get(camp).get(item) + leadTime ) * (1 + bufferRatios.get(camp).get(item))));
            }
        }

        for (Item item : environment.getItems()) {
            int totalDemand = 0;
            double leadTime = item.getLeadTimeData().distParameters.getMean();

            for (Camp camp : environment.getCamps()) {
                totalDemand += (int)(this.environment.getCorrespondingDemand(item, camp).getArrivalData().getDistParameters().getMean() * camp.getInitialInternalPopulation());
            }

            centralReorderPoints.put(item, (int) (totalDemand * leadTime * (1 + centralBufferRatios.get(item))));
            centralOrderUpToLevels.put(item, (int) (totalDemand * (centralPeriodicCounts.get(item) + leadTime) * (1 + centralBufferRatios.get(item))));
        }
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

    public ArrayList<IEvent> generateReplenishmentEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time)
    {
        // First of all, we need to find the requests for replenishment
        double totalCashNeededForItem = 0;
        double totalCashNeededForOrdering = 0;
        for (Item item : state.getCentralWarehouseInventory().keySet()) {

            // If the item is not available, we will not consider it since we cannot order it
            if (!state.getIsItemAvailable().get(item)) continue;

            int totalInventory = 0;
            for (var ie : state.getCentralWarehouseInventory().get(item)){
                totalInventory += ie.getQuantity();
            }
            int reorderPoint = centralReorderPoints.get(item);
            int orderUpToLevel = centralOrderUpToLevels.get(item);
            if (totalInventory < reorderPoint) {
                totalCashNeededForItem += (orderUpToLevel - totalInventory) * item.getPrice();
                totalCashNeededForOrdering += item.getOrderingCost();
            }
        }
        // Now we need to find the cash available
        double cashAvailable = state.getAvailableFunds();

        double ratio = Math.min(cashAvailable / totalCashNeededForItem , 1);
        ArrayList<IEvent> replenishmentEvents = new ArrayList<>();

        if (ratio == 0)
        {
            return replenishmentEvents;
        }
        else if (ratio == 1)
        {
            for (Item item : state.getCentralWarehouseInventory().keySet()) {
                int totalInventory = 0;
                for (var ie : state.getCentralWarehouseInventory().get(item)) {
                    totalInventory += ie.getQuantity();
                }
                int reorderPoint = centralReorderPoints.get(item);
                int orderUpToLevel = centralOrderUpToLevels.get(item);
                if (totalInventory < reorderPoint) {
                    int quantity = orderUpToLevel - totalInventory;
                    ArrayList<InventoryItem> inventoryItems = new ArrayList<>();
                    double expiration = 0;
                    if (item.getIsPerishable()) {
                        expiration = time + interarrivalGenerator.generateReplenishment(item);
                    }
                    inventoryItems.add(new InventoryItem(quantity, expiration, time));
                    replenishmentEvents.add(new ReplenishmentEvent(item, inventoryItems, interarrivalGenerator, time));
                }
            }
        }
        else
        {
            for (Item item : state.getCentralWarehouseInventory().keySet()) {
                int totalInventory = 0;
                for (var ie : state.getCentralWarehouseInventory().get(item)) {
                    totalInventory += ie.getQuantity();
                }
                int reorderPoint = centralReorderPoints.get(item);
                int orderUpToLevel = centralOrderUpToLevels.get(item);
                if (totalInventory < reorderPoint) {
                    int quantity = (int) Math.ceil((orderUpToLevel - totalInventory) * ratio);
                    ArrayList<InventoryItem> inventoryItems = new ArrayList<>();
                    double expiration = time + interarrivalGenerator.generateReplenishment(item);
                    inventoryItems.add(new InventoryItem(quantity, expiration, time));
                    replenishmentEvents.add(new ReplenishmentEvent(item, inventoryItems, interarrivalGenerator, time));
                }
            }
        }
        return replenishmentEvents;
    }

    public ArrayList<IEvent> generateTransferEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time) {

        ArrayList<TransferRequest> transferRequest = new ArrayList<>();

        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                int totalInventory = 0;

                for (var ie : state.getInventory().get(camp).get(item)) {
                    totalInventory += ie.getQuantity();
                }
                // total depriving person
                for (var dp: state.getDeprivingPopulation().get(camp).get(item)) {
                    totalInventory -= dp.getQuantity();
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

            int totalDemand = 0;
            int totalInventory = 0;

            for (TransferRequest tr : filteredRequest) {
                totalDemand += tr.getQuantity();
            }

            for (var ie : state.getCentralWarehouseInventory().get(item)) {
                totalInventory += ie.getQuantity();
            }

            if (totalDemand == 0) continue;

            int ratio = Math.min(totalInventory / totalDemand, 1);
            if (ratio == 0) {
                return transferEvents;
            }
            else
            {
                for (TransferRequest tr : filteredRequest) {
                    tr.setQuantity((int) Math.ceil(tr.getQuantity() * ratio));
                }
                for (TransferRequest tr : filteredRequest) {
                    while (tr.getQuantity() > 0) {
                        for (Iterator<InventoryItem> iterator = state.getCentralWarehouseInventory().get(item).iterator(); iterator.hasNext(); ) {
                            InventoryItem ie = iterator.next();
                            if (ie.getQuantity() >= tr.getQuantity()) {
                                ArrayList<InventoryItem> inventoryItems = new ArrayList<>();
                                inventoryItems.add(new InventoryItem(tr.getQuantity(), ie.getExpiration(), ie.getArrivalTime()));
                                ie.setQuantity(ie.getQuantity() - tr.getQuantity());
                                transferEvents.add(new TransferEvent(tr.getToCamp(), item, inventoryItems, interarrivalGenerator, ie.getArrivalTime()));
                                tr.setQuantity(0); // Request quantity fulfilled
                                break;
                            } else {
                                ArrayList<InventoryItem> inventoryItems = new ArrayList<>();
                                inventoryItems.add(new InventoryItem(ie.getQuantity(), ie.getExpiration(), time));
                                tr.setQuantity(tr.getQuantity() - ie.getQuantity());
                                iterator.remove(); // Remove the inventory item from the list
                                transferEvents.add(new TransferEvent(tr.getToCamp(), item, inventoryItems, interarrivalGenerator, ie.getArrivalTime()));
                            }
                        }
                    }
                }
            }
        }
        return null;
    }
}
