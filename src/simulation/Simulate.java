package simulation;
import data.Agency;
import data.Camp;
import data.Environment;
import data.Item;
import data.event_info.Demand;
import data.event_info.Funding;
import data.event_info.Migration;
import data.event_info.SupplyStatusSwitch;
import enums.InventoryControlType;
import simulation.data.DeprivingPerson;
import simulation.data.InventoryItem;
import simulation.decision.OrderUpToPolicy;
import simulation.event.*;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.*;


public class Simulate {
    private final Environment environment;
    private State state;

    private final InterarrivalGenerator interarrivalGenerator;
    private final QuantityGenerator quantityGenerator;
    private PriorityQueue<IEvent> eventQueue;


    public Simulate(Environment environment) throws CloneNotSupportedException {
        this.environment = environment;
        environment.getInitialState().projectInitialState();
        this.state = environment.getInitialState();
        this.state.initializations();
        environment.getOrderUpToPolicy().intialize(environment, this.state);
        this.state.setOrderUpToPolicy((OrderUpToPolicy) environment.getOrderUpToPolicy().clone());
        this.interarrivalGenerator = new InterarrivalGenerator(this.environment.getSimulationConfig());
        this.quantityGenerator = new QuantityGenerator(this.environment.getSimulationConfig());
        this.eventQueue = new PriorityQueue<>();
        this.run();
        reportKPIs();
    }

    private void reportKPIs() {
        System.out.println('\n' + "Final KPIs" + '\n' + "-------------------");
        // Report costs
        for (Item item : this.environment.getItems()) {
            System.out.println("Total ordering cost for item " + item.getName() + " is " + this.state.getKpiManager().totalOrderingCost.get(item));
        }

        System.out.println();

        for (Camp camp : this.environment.getCamps()) {
            for (Item item : this.environment.getItems()) {
                System.out.println("Total deprivation cost for camp " + camp.getName() + " and item " + item.getName() + " is " + this.state.getKpiManager().totalDeprivationCost.get(camp).get(item));
            }
        }

        System.out.println();

        for (Camp camp : this.environment.getCamps()) {
            for (Item item : this.environment.getItems()) {
                System.out.println("Total holding cost for camp " + camp.getName() + " and item " + item.getName() + " is " + this.state.getKpiManager().totalHoldingCost.get(camp).get(item));
            }
        }

        System.out.println();

        for (Camp camp : this.environment.getCamps()) {
            for (Item item : this.environment.getItems()) {
                System.out.println("Total referral cost for camp " + camp.getName() + " and item " + item.getName() + " is " + this.state.getKpiManager().totalReferralCost.get(camp).get(item));
            }
        }

        System.out.println();

        // Total replenishment
        for (Item item : this.environment.getItems()) {
            System.out.println("Total replenishment for item " + item.getName() + " is " + this.state.getKpiManager().totalOrderingCost.get(item) / item.getOrderingCost());
        }

        System.out.println();

        for (Item item : this.environment.getItems()) {
            System.out.println("Total central expired inventory for item " + item.getName() + " is " + this.state.getKpiManager().totalCentralExpiredInventory.get(item));
        }

        System.out.println();

        for (Camp camp : this.environment.getCamps()) {
            for (Item item : this.environment.getItems()) {
                System.out.println("Total expired inventory for camp " + camp.getName() + " and item " + item.getName() + " is " + this.state.getKpiManager().totalExpiredInventory.get(camp).get(item));
            }
        }

        System.out.println();

        for (Camp camp : this.environment.getCamps()) {
            for (Item item : this.environment.getItems()) {
                System.out.println("Total unsatisfied internal demand for camp " + camp.getName() + " and item " + item.getName() + " is " + this.state.getKpiManager().totalUnsatisfiedInternalDemand.get(camp).get(item));
            }
        }
    }

    public void run() {
        generateInitialEvents();

        while (!this.eventQueue.isEmpty()) {
            IEvent event = this.eventQueue.poll();

            deleteExpiredItems(this.state, event.getTime());
            ArrayList<IEvent> eventSet = event.processEvent(this.state, this.interarrivalGenerator, this.quantityGenerator);

            if (eventSet == null) {
                continue;
            }

            for (IEvent e : eventSet) {
                if (e.getTime() >= this.environment.getSimulationConfig().getPlanningHorizon()) {
                    continue;
                }
                this.eventQueue.add(e);
            }
        }

        // At the end of the simulation, calculate the final costs
        calculateFinalCosts();
    }

    public void deleteExpiredItems(State state, double currentTime) {
        for (Map.Entry<Camp, HashMap<Item, PriorityQueue<InventoryItem>>> campEntry : state.getInventory().entrySet()) {
            HashMap<Item, PriorityQueue<InventoryItem>> campInventory = campEntry.getValue();

            for (Map.Entry<Item, PriorityQueue<InventoryItem>> itemEntry : campInventory.entrySet()) {
                PriorityQueue<InventoryItem> itemQueue = itemEntry.getValue();

                Iterator<InventoryItem> iterator = itemQueue.iterator();
                while (iterator.hasNext()) {
                    InventoryItem item = iterator.next();
                    if (item.getExpiration() != 0 && item.getExpiration() <= currentTime) {
                        this.state.getKpiManager().totalExpiredInventory.get(campEntry.getKey()).put(itemEntry.getKey(),
                                this.state.getKpiManager().totalExpiredInventory.get(campEntry.getKey()).get(itemEntry.getKey()) + item.getQuantity());
                        iterator.remove(); // Remove the expired item
                    }
                }
            }
        }

        // Delete also from central inventory
        for (Map.Entry<Item, PriorityQueue<InventoryItem>> itemEntry : state.getCentralWarehouseInventory().entrySet()) {
            PriorityQueue<InventoryItem> itemQueue = itemEntry.getValue();

            Iterator<InventoryItem> iterator = itemQueue.iterator();
            while (iterator.hasNext()) {
                InventoryItem item = iterator.next();
                if (item.getExpiration() != 0 && item.getExpiration() <= currentTime) {
                    this.state.getKpiManager().totalCentralExpiredInventory.put(itemEntry.getKey(),
                            this.state.getKpiManager().totalCentralExpiredInventory.get(itemEntry.getKey()) + item.getQuantity());
                    iterator.remove(); // Remove the expired item
                }
            }
        }
    }

    public void calculateFinalCosts() {
        double finalTime = this.environment.getSimulationConfig().getPlanningHorizon();
        for (Camp camp : this.state.getDeprivingPopulation().keySet()){
            for (Item item : this.state.getDeprivingPopulation().get(camp).keySet()){
                while (!this.state.getDeprivingPopulation().get(camp).get(item).isEmpty()) {
                    DeprivingPerson deprivingPerson = this.state.getDeprivingPopulation().get(camp).get(item).peek();
                    double totalTime = finalTime - deprivingPerson.getArrivalTime();
                    double previousCost = this.state.getKpiManager().totalDeprivationCost.get(camp).get(item);
                    double currentCost = (Math.exp(totalTime * item.getDeprivationCoefficient()) - 1) * deprivingPerson.getQuantity();
                    this.state.getKpiManager().totalUnsatisfiedInternalDemand.get(camp).put(item, this.state.getKpiManager().totalUnsatisfiedInternalDemand.get(camp).get(item) + deprivingPerson.getQuantity());
                    this.state.getKpiManager().totalDeprivationCost.get(camp).put(item, previousCost + currentCost);
                    this.state.getDeprivingPopulation().get(camp).get(item).poll();
                }
            }
        }

        for (Camp camp : this.state.getInventory().keySet()){
            for (Item item : this.state.getInventory().get(camp).keySet()){
                while (!this.state.getInventory().get(camp).get(item).isEmpty()) {
                    InventoryItem inventoryItem = this.state.getInventory().get(camp).get(item).peek();
                    double previousCost = this.state.getKpiManager().totalHoldingCost.get(camp).get(item);
                    double currentCost = (finalTime - inventoryItem.getArrivalTime()) * inventoryItem.getQuantity() * item.getHoldingCost();
                    this.state.getKpiManager().totalHoldingCost.get(camp).put(item, previousCost + currentCost);
                    this.state.getInventory().get(camp).get(item).poll();
                }
            }
        }
    }


    // This method generates the initial events for the simulation
    private void generateInitialEvents() {
        generateInitialFundingEvents();
        generateInitialSupplyStatusSwitchEvents();
        generateInitialDemandEvents();
        generateInitialMigrationEvents();
        generateInventoryControlEvents();
    }


    private void generateInitialDemandEvents() {
        for (Camp camp : this.environment.getCamps()) {
            for (Demand demand : camp.getDemands()) {
                double currentTime = 0.0;
                DemandEvent de_internal =
                        new DemandEvent(this.state, camp, demand, true, this.interarrivalGenerator, this.quantityGenerator, currentTime);
                currentTime = de_internal.getTime();
                if (currentTime >=  this.environment.getSimulationConfig().getPlanningHorizon()){
                    continue;
                }
                this.eventQueue.add(de_internal);
            }
        }

    }

    private void generateInitialFundingEvents() {
        for (Agency agency : this.environment.getAgencies()) {
            for (Funding funding: agency.getFundings()){
                double currentTime = 0.0;
                FundingEvent fe = new FundingEvent(funding, this.interarrivalGenerator, this.quantityGenerator, currentTime);
                currentTime = fe.getTime();
                if (currentTime >=  this.environment.getSimulationConfig().getPlanningHorizon()){
                    continue;
                }
                this.eventQueue.add(fe);
            }
        }
    }

    private void generateInitialSupplyStatusSwitchEvents(){
        for (SupplyStatusSwitch supplyStatusSwitch : this.environment.getSupplyStatusSwitches()){
            double currentTime = 0.0;

            SupplyDisruptionEvent sde = new SupplyDisruptionEvent(supplyStatusSwitch, this.interarrivalGenerator, currentTime);
            currentTime = sde.getTime();
            if (currentTime >=  this.environment.getSimulationConfig().getPlanningHorizon()){
                continue;
            }
            this.eventQueue.add(sde);

            SupplyRecoveryEvent sre = new SupplyRecoveryEvent(supplyStatusSwitch, this.interarrivalGenerator, currentTime);
            currentTime = sre.getTime();
            if (currentTime >=  this.environment.getSimulationConfig().getPlanningHorizon()){
                continue;
            }
            this.eventQueue.add(sre);
        }
    }

    private void generateInitialMigrationEvents(){
        for (Migration migration : this.environment.getMigrations()) {
            double currentTime = 0.0;
            MigrationEvent me = new MigrationEvent(state, migration, this.interarrivalGenerator, this.quantityGenerator, currentTime);
            currentTime = me.getTime();

            if (currentTime >=  this.environment.getSimulationConfig().getPlanningHorizon()){
                break;
            }
            this.eventQueue.add(me);
        }
    }

    private void generateInventoryControlEvents(){
        if (this.environment.getSimulationConfig().getInventoryControlType() == InventoryControlType.PERIODIC){
            for (int i = 0; i < this.environment.getSimulationConfig().getPlanningHorizon(); i += this.environment.getSimulationConfig().getSimulationResolution()){
                InventoryControlEvent ice = new InventoryControlEvent(i);
                this.eventQueue.add(ice);
            }
        }
    }
}
