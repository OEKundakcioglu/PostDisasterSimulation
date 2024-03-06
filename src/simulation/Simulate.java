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
        this.environment.getInitialState().projectInitialState();
        this.state = environment.getInitialState();
        this.state.initialize(this.environment);
        this.environment.getOrderUpToPolicy().initialize(environment, this.state);
        this.state.setOrderUpToPolicy((OrderUpToPolicy) environment.getOrderUpToPolicy().clone());
        this.interarrivalGenerator = new InterarrivalGenerator(this.environment.getSimulationConfig());
        this.quantityGenerator = new QuantityGenerator(this.environment.getSimulationConfig());
        this.eventQueue = new PriorityQueue<>();
        this.run();
        this.state.getKpiManager().calculateFinalCosts(this.environment, this.state);
        this.state.getKpiManager().reportKPIs(this.environment);
    }


    public void run() {
        generateInitialEvents();

        while (!this.eventQueue.isEmpty()) {
            IEvent event = this.eventQueue.poll();

            deleteExpiredItems(this.state, event.getTime());
            ArrayList<IEvent> eventSet = event.processEvent(this.state, this.interarrivalGenerator, this.quantityGenerator);

            if (!event.getClass().getSimpleName().equals("InventoryControlEvent") && this.environment.getSimulationConfig().getInventoryControlType() == InventoryControlType.CONTINUOUS) {
                InventoryControlEvent ice = new InventoryControlEvent(event.getTime());
                this.eventQueue.add(ice);
            }

            if (eventSet == null) {
                continue;
            }

            for (IEvent e : eventSet) {
                if (e.getTime() > this.environment.getSimulationConfig().getPlanningHorizon()) {
                    continue;
                }
                this.eventQueue.add(e);
            }
        }
    }

    public void deleteExpiredItems(State state, double currentTime) {
        // Delete from camp inventory
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
                        this.state.getInventoryPosition().get(campEntry.getKey()).put(itemEntry.getKey(), this.state.getInventoryPosition().get(campEntry.getKey()).get(itemEntry.getKey()) - item.getQuantity());
                        iterator.remove(); // Remove the expired item
                    }
                }
            }
        }

        // Delete from central inventory
        for (Map.Entry<Item, PriorityQueue<InventoryItem>> itemEntry : state.getCentralWarehouseInventory().entrySet()) {
            PriorityQueue<InventoryItem> itemQueue = itemEntry.getValue();

            Iterator<InventoryItem> iterator = itemQueue.iterator();
            while (iterator.hasNext()) {
                InventoryItem item = iterator.next();
                if (item.getExpiration() != 0 && item.getExpiration() <= currentTime) {
                    this.state.getKpiManager().totalCentralExpiredInventory.put(itemEntry.getKey(),
                            this.state.getKpiManager().totalCentralExpiredInventory.get(itemEntry.getKey()) + item.getQuantity());
                    this.state.getCentralWarehousePosition().put(itemEntry.getKey(), this.state.getCentralWarehousePosition().get(itemEntry.getKey()) - item.getQuantity());
                    iterator.remove(); // Remove the expired item
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
                DemandEvent de_external =
                        new DemandEvent(this.state, camp, demand, false, this.interarrivalGenerator, this.quantityGenerator, currentTime);
                if (de_internal.getTime() <=  this.environment.getSimulationConfig().getPlanningHorizon()){
                    this.eventQueue.add(de_internal);
                }
                if (de_external.getTime() <=  this.environment.getSimulationConfig().getPlanningHorizon()){
                    this.eventQueue.add(de_external);
                }
            }
        }
    }

    private void generateInitialFundingEvents() {
        if (this.environment.getSupplyStatusSwitches() == null){
            return;
        }
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
        if (this.environment.getSupplyStatusSwitches() == null){
            return;
        }
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
        if (this.environment.getMigrations() == null){
            return;
        }
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
            for (int i = 0; i < this.environment.getSimulationConfig().getPlanningHorizon(); i += this.environment.getSimulationConfig().getInventoryControlPeriod()){
                InventoryControlEvent ice = new InventoryControlEvent(i);
                this.eventQueue.add(ice);
            }
        }
        else if (this.environment.getSimulationConfig().getInventoryControlType() == InventoryControlType.CONTINUOUS){
            InventoryControlEvent ice = new InventoryControlEvent(0);
            this.eventQueue.add(ice);
        }
    }


}
