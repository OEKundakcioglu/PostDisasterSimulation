package simulation;
import data.Agency;
import data.Camp;
import data.Environment;
import data.Item;
import data.event_info.Demand;
import data.event_info.Funding;
import data.event_info.Migration;
import data.event_info.SupplyStatusSwitch;
import enums.DistributionType;
import enums.InventoryControlType;
import enums.MigrationType;
import simulation.data.InventoryItem;
import simulation.decision.IPolicy;
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

    private HashMap<Camp, PriorityQueue<IEvent>> demandEventQueue;


    public Simulate(Environment environment) throws CloneNotSupportedException {
        this.environment = environment;
        this.interarrivalGenerator = new InterarrivalGenerator(this.environment.getSimulationConfig());
        this.quantityGenerator = new QuantityGenerator(this.environment.getSimulationConfig());
        this.environment.getInitialState().projectInitialState(this.interarrivalGenerator);
        this.state = environment.getInitialState();
        this.state.initialize(this.environment);
        this.environment.getInventoryPolicy().initialize(environment, this.state);
        this.state.setInventoryPolicy((IPolicy) environment.getInventoryPolicy().clone());
        this.eventQueue = new PriorityQueue<>(IEvent::compareTo);
        this.demandEventQueue = new HashMap<>();
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

            // If population changes, generate new demand events with the new population, deleting the old demand events
            if (event.getClass().getSimpleName().equals("MigrationEvent")) {
                MigrationEvent migrationEvent = (MigrationEvent) event;
                controlStateChange(migrationEvent);
            }

            if(event.getClass().getSimpleName().equals("DemandEvent")){
               // If demand event, get the earliest demand event from the queue
                DemandEvent demandEvent = (DemandEvent) event;
                Camp camp = demandEvent.camp;
                PriorityQueue<IEvent> demandQueue = this.demandEventQueue.get(camp);
                if (!demandQueue.isEmpty()){
                    this.eventQueue.add(demandQueue.poll());
                }
            }

            // Continuously generate inventory control events for the continuous inventory control type
            if (!event.getClass().getSimpleName().equals("InventoryControlEvent") &&
                this.environment.getSimulationConfig().getInventoryControlType() == InventoryControlType.CONTINUOUS) {
                InventoryControlEvent ice = new InventoryControlEvent(event.getTime());
                this.eventQueue.add(ice);
            }

            // Add the new events to the event queue
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
        generateFundingEvents();
        generateSupplyStatusSwitchEvents();
        generateMigrationEvents();
        generateInventoryControlEvents();
        generateInitialDemandEvents();
    }

    private void generateInitialDemandEvents() {
        for (Camp camp : this.environment.getCamps()) {
            for (Demand demand : camp.getDemands()) {
                generateDemandEvents(camp, demand, 0.0);
            }
        }
    }

    private void generateFundingEvents() {
        if (this.environment.getAgencies() == null){
            return;
        }
        for (Agency agency : this.environment.getAgencies()) {
            for (Funding funding: agency.getFundingArray()){
                double currentTime = 0.0;
                int count = 1;

                ArrayList<Double> arrivalTimes = new ArrayList<>();
                arrivalTimes.add(currentTime);

                double arrivalInterval = this.interarrivalGenerator.generateFunding(funding);
                currentTime += arrivalInterval;

                while (!(currentTime >= this.environment.getSimulationConfig().getPlanningHorizon())) {
                    arrivalTimes.add(currentTime);
                    count++;
                    currentTime += this.interarrivalGenerator.generateFunding(funding);
                }

                // If we equally distribute the funding amount for each event
                if (funding.getAmountData().distributionType == DistributionType.EQUAL_SHARE)
                {
                    double totalFunding = funding.getAmountData().getDistParameters().getMean();

                    for (double arrivalTime : arrivalTimes){
                        FundingEvent fe = new FundingEvent(funding, arrivalTime, totalFunding/count);
                        this.eventQueue.add(fe);
                    }
                }
                // Else we generate a random amount for each event
                else{
                    for (double arrivalTime : arrivalTimes){
                        FundingEvent fe = new FundingEvent(funding, quantityGenerator, arrivalTime);
                        this.eventQueue.add(fe);
                    }
                }
            }
        }
    }

    private void generateSupplyStatusSwitchEvents(){
        if (this.environment.getSupplyStatusSwitches() == null){
            return;
        }
        for (SupplyStatusSwitch supplyStatusSwitch : this.environment.getSupplyStatusSwitches()){
            double currentTime = 0.0;
            while (!(currentTime >= this.environment.getSimulationConfig().getPlanningHorizon())) {
                SupplyDisruptionEvent sde = new SupplyDisruptionEvent(supplyStatusSwitch, this.interarrivalGenerator, currentTime);
                currentTime = sde.getTime();
                if (currentTime >= this.environment.getSimulationConfig().getPlanningHorizon()) {
                    continue;
                }
                this.eventQueue.add(sde);

                SupplyRecoveryEvent sre = new SupplyRecoveryEvent(supplyStatusSwitch, this.interarrivalGenerator, currentTime);
                currentTime = sre.getTime();

                this.eventQueue.add(sre);
            }
        }
    }

    private void generateMigrationEvents(){
        if (this.environment.getMigrations() == null){
            return;
        }
        for (Migration migration : this.environment.getMigrations()) {
            double currentTime = 0.0;
            MigrationEvent me = new MigrationEvent(state, migration, this.interarrivalGenerator, currentTime);
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

    private void generateDemandEvents(Camp camp, Demand demand, double currentTime){
        PriorityQueue<IEvent> demandQueue = new PriorityQueue<>(IEvent::compareTo);
        for (int i = 0; i < this.state.getInternalPopulation().get(camp); i++){
            if (this.quantityGenerator.rngDemand.nextDouble() < demand.getInternalRatio()){
                DemandEvent de_internal =
                        new DemandEvent(this.state, camp, demand, true, this.interarrivalGenerator, this.quantityGenerator, currentTime);
                if (de_internal.getTime() <=  this.environment.getSimulationConfig().getPlanningHorizon()){
                    demandQueue.add(de_internal);
                }
            }
        }
        for (int i = 0; i < this.state.getExternalPopulation().get(camp); i++){
            if (this.quantityGenerator.rngDemand.nextDouble() < demand.getExternalRatio()){
                DemandEvent de_external =
                        new DemandEvent(this.state, camp, demand, false, this.interarrivalGenerator, this.quantityGenerator, currentTime);
                if (de_external.getTime() <=  this.environment.getSimulationConfig().getPlanningHorizon()){
                    demandQueue.add(de_external);
                }
            }
        }
        // pick the first event from the queue
        if (!demandQueue.isEmpty()){
            this.eventQueue.add(demandQueue.poll());
        }
        this.demandEventQueue.put(camp, demandQueue);
    }

    private void controlStateChange(MigrationEvent migrationEvent){
        if (migrationEvent.migrationType == MigrationType.EXTERNAL_TO_SYSTEM ||
                migrationEvent.migrationType == MigrationType.INTERNAL_TO_SYSTEM) {
            if (migrationEvent.quantity > 0) {
                for (Demand demand : migrationEvent.toCamp.getDemands()) {
                    generateDemandEvents(migrationEvent.toCamp, demand, migrationEvent.getTime());
                }
            }

        }
        else if (migrationEvent.migrationType == MigrationType.INTERNAL_FROM_SYSTEM ||
                migrationEvent.migrationType == MigrationType.INTERNAL_WITHIN_SYSTEM) {
            if (migrationEvent.quantity > 0) {
                for (Demand demand : migrationEvent.toCamp.getDemands()) {
                    generateDemandEvents(migrationEvent.toCamp, demand, migrationEvent.getTime());
                }
            }
        }
        else if (migrationEvent.migrationType == MigrationType.EXTERNAL_FROM_SYSTEM ||
                migrationEvent.migrationType == MigrationType.EXTERNAL_WITHIN_SYSTEM) {
            if (migrationEvent.quantity > 0) {
                for (Demand demand : migrationEvent.toCamp.getDemands()) {
                    generateDemandEvents(migrationEvent.toCamp, demand, migrationEvent.getTime());
                }
            }
        }
    }

}
