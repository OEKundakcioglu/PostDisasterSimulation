package simulation;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.PriorityQueue;

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
import simulation.event.DemandEvent;
import simulation.event.FundingEvent;
import simulation.event.IEvent;
import simulation.event.InventoryControlEvent;
import simulation.event.MigrationEvent;
import simulation.event.SupplyDisruptionEvent;
import simulation.event.SupplyRecoveryEvent;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

public class Simulate {
    private final Environment environment;
    private State state;
    private final InterarrivalGenerator interarrivalGenerator;
    private final QuantityGenerator quantityGenerator;
    private PriorityQueue<IEvent> eventQueue;
    public interface CancelChecker { boolean isCancelled(); }
    private final CancelChecker cancelChecker;
    private HashMap<Camp, PriorityQueue<IEvent>> demandEventQueue;
    private boolean prepared = false;
    private boolean finalized = false;
    // Track last simulation time at which a continuous InventoryControlEvent was enqueued
    private double lastContinuousICEventTime = Double.NaN;

    public Simulate(Environment environment) { this(environment, null); }
    public Simulate(Environment environment, CancelChecker cancelChecker) {
        this.environment = environment;
        this.cancelChecker = cancelChecker;
        this.interarrivalGenerator = new InterarrivalGenerator(this.environment.getSimulationConfig());
        this.quantityGenerator = new QuantityGenerator(this.environment.getSimulationConfig());
    }

    public void prepare() throws CloneNotSupportedException {
        if (prepared) return;
        long t0 = System.nanoTime();
        this.environment.getInitialState().projectInitialState(this.interarrivalGenerator);
        this.state = environment.getInitialState();
        this.state.initialize(this.environment);
        this.environment.getInventoryPolicy().initialize(environment, this.state);
        this.state.setInventoryPolicy((IPolicy) environment.getInventoryPolicy().clone());
        this.eventQueue = new PriorityQueue<>(IEvent::compareTo);
        this.demandEventQueue = new HashMap<>();
        generateInitialEvents();
        long t1 = System.nanoTime();
        double ms = (t1 - t0)/1_000_000.0;
        System.out.println("[Perf] Initial preparation & event generation took " + ms + " ms. Initial event queue size=" + this.eventQueue.size());
        // seed initial log at time 0 so UI starts immediately
        try { this.state.getKpiManager().logState(this.state, 0.0, 0.001); } catch (Exception ignored) {}
        prepared = true;
    }

    public void run() {
        if (!prepared) throw new IllegalStateException("Simulation not prepared");
        long startNano = System.nanoTime();
        long lastReport = startNano;
        long processed = 0;
        double lastLoggedSimTime = -1.0;
        final int LOG_EVERY_N_EVENTS = 100; // throttle expensive KPI logging
        int maxQueue = this.eventQueue.size();
        while (!this.eventQueue.isEmpty()) {
            if (Thread.currentThread().isInterrupted() || (cancelChecker != null && cancelChecker.isCancelled())) {
                System.out.println("Simulation interrupted/cancelled – exiting loop");
                break;
            }
            IEvent event = this.eventQueue.poll();
            deleteExpiredItems(this.state, event.getTime());
            ArrayList<IEvent> eventSet = event.processEvent(this.state, this.interarrivalGenerator, this.quantityGenerator);

            processed++;
            boolean conditionToReport = event.getClass().getSimpleName().equals("InventoryControlEvent");

            if (conditionToReport) {
                state.getKpiManager().logState(state, event.getTime(), 1);
                lastLoggedSimTime = event.getTime();
            }

            if (event.getClass().getSimpleName().equals("MigrationEvent")) {
                MigrationEvent migrationEvent = (MigrationEvent) event;
                migrationStateUpdate(migrationEvent);
            }

            if(event.getClass().getSimpleName().equals("DemandEvent")){
                DemandEvent demandEvent = (DemandEvent) event;
                Camp camp = demandEvent.camp;

                if (eventSet != null) {
                    for (IEvent e : eventSet) {
                        if (e.getTime() > this.environment.getSimulationConfig().getPlanningHorizon()) continue;
                        this.demandEventQueue.get(camp).offer(e);
                    }
                }

                PriorityQueue<IEvent> demandQueue = this.demandEventQueue.get(camp);
                if (!demandQueue.isEmpty()) this.eventQueue.offer(demandQueue.poll());
            }

            // Continuously generate inventory control events for the continuous inventory control type
            if (this.environment.getSimulationConfig().getInventoryControlType() == InventoryControlType.CONTINUOUS &&
                    !event.getClass().getSimpleName().equals("InventoryControlEvent")) {
                // Enqueue at most one inventory control event per unique simulation time to avoid explosion
                if (Double.isNaN(lastContinuousICEventTime) || event.getTime() > lastContinuousICEventTime) {
                    this.eventQueue.offer(new InventoryControlEvent(event.getTime()));
                    lastContinuousICEventTime = event.getTime();
                }
            }
            if (eventSet != null) {
                for (IEvent e : eventSet) {
                    if (e.getClass().getSimpleName().equals("DemandEvent")) continue;
                    if (e.getTime() > this.environment.getSimulationConfig().getPlanningHorizon()) continue;
                    this.eventQueue.offer(e);
                }
            }
            if (processed % LOG_EVERY_N_EVENTS == 0 || (int)event.getTime() > (int)lastLoggedSimTime) {
                state.getKpiManager().updateTimeStepLogs(event.getTime());
            }

            // Lightweight perf reporting (every 1s or every 100k events)
            if (processed % 100_000 == 0) {
                long now = System.nanoTime();
                double elapsedSec = (now - startNano) / 1_000_000_000.0;
                if (this.eventQueue.size() > maxQueue) maxQueue = this.eventQueue.size();
                System.out.println(String.format("[Perf] Events=%d simTime=%.2f queue=%d maxQueue=%d elapsed=%.2fs evt/s=%.0f", processed, event.getTime(), this.eventQueue.size(), maxQueue, elapsedSec, processed/elapsedSec));
                lastReport = now;
            } else {
                long now = System.nanoTime();
                if (now - lastReport > 1_000_000_000L) {
                    double elapsedSec = (now - startNano) / 1_000_000_000.0;
                    if (this.eventQueue.size() > maxQueue) maxQueue = this.eventQueue.size();
                    System.out.println(String.format("[Perf] Events=%d simTime=%.2f queue=%d maxQueue=%d elapsed=%.2fs evt/s=%.0f", processed, event.getTime(), this.eventQueue.size(), maxQueue, elapsedSec, processed/elapsedSec));
                    lastReport = now;
                }
            }

        }
        long endNano = System.nanoTime();
        double totalSec = (endNano - startNano)/1_000_000_000.0;
        System.out.println(String.format("[Perf] Simulation complete. Total events=%d totalTime=%.2fs avgEvt/s=%.0f", processed, totalSec, processed/totalSec));
    }

    public void runWithThrottle(Runnable throttleCallback){
        if (!prepared) throw new IllegalStateException("Simulation not prepared");
        int processed = 0;
        double lastLoggedSimTime = -1.0;
        final int LOG_EVERY_N_EVENTS = 500;
        while (!this.eventQueue.isEmpty()) {
            if (Thread.currentThread().isInterrupted() || (cancelChecker != null && cancelChecker.isCancelled())) {
                System.out.println("Simulation interrupted/cancelled – exiting loop");
                break;
            }
            IEvent event = this.eventQueue.poll();
            deleteExpiredItems(this.state, event.getTime());
            ArrayList<IEvent> eventSet = event.processEvent(this.state, this.interarrivalGenerator, this.quantityGenerator);
            processed++;
            if (processed % LOG_EVERY_N_EVENTS == 0 || (int)event.getTime() > (int)lastLoggedSimTime) {
                state.getKpiManager().logState(state, event.getTime(), 10);
                lastLoggedSimTime = event.getTime();
            }
            if (event.getClass().getSimpleName().equals("MigrationEvent")) migrationStateUpdate((MigrationEvent) event);
            if(event.getClass().getSimpleName().equals("DemandEvent")){
                DemandEvent demandEvent = (DemandEvent) event;
                Camp camp = demandEvent.camp;
                if (eventSet != null) {
                    for (IEvent e : eventSet) { if (e.getTime() > this.environment.getSimulationConfig().getPlanningHorizon()) continue; this.demandEventQueue.get(camp).offer(e); }
                }
                PriorityQueue<IEvent> demandQueue = this.demandEventQueue.get(camp);
                if (!demandQueue.isEmpty()) this.eventQueue.offer(demandQueue.poll());
            }
            if (this.environment.getSimulationConfig().getInventoryControlType() == InventoryControlType.CONTINUOUS &&
                    !event.getClass().getSimpleName().equals("InventoryControlEvent")) {
                if (Double.isNaN(lastContinuousICEventTime) || event.getTime() > lastContinuousICEventTime) {
                    this.eventQueue.offer(new InventoryControlEvent(event.getTime()));
                    lastContinuousICEventTime = event.getTime();
                }
            }
            if (eventSet != null) {
                for (IEvent e : eventSet) {
                    if (e.getClass().getSimpleName().equals("DemandEvent")) continue;
                    if (e.getTime() > this.environment.getSimulationConfig().getPlanningHorizon()) continue;
                    this.eventQueue.offer(e);
                }
            }
            if (processed % LOG_EVERY_N_EVENTS == 0 || (int)event.getTime() > (int)lastLoggedSimTime) {
                state.getKpiManager().updateTimeStepLogs(event.getTime());
            }
            if (throttleCallback != null && processed % 250 == 0) { // was 25 -> fewer sleeps
                throttleCallback.run();
            }
        }
    }

    public void finalizeSimulation() {
        if (finalized) return;
        try {
            this.state.getKpiManager().calculateFinalCosts(this.environment, this.state);
            this.state.getKpiManager().reportKPIs(this.environment);
        } catch (Exception ignored) {}
        finalized = true;
    }

    public void cleanup() {
        if (eventQueue != null) eventQueue.clear();
        if (demandEventQueue != null) demandEventQueue.clear();
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
                        double totalTime = currentTime - item.getArrivalTime();
                        double expiredHoldingCost = totalTime * item.getQuantity() * itemEntry.getKey().getHoldingCost();

                        Camp camp = campEntry.getKey();
                        Item itemType = itemEntry.getKey();
                        this.state.getKpiManager().totalHoldingCost.get(camp).put(itemType,
                                this.state.getKpiManager().totalHoldingCost.get(camp).get(itemType) + expiredHoldingCost);

                        this.state.getKpiManager().totalExpiredInventory.get(campEntry.getKey()).put(itemEntry.getKey(),
                                this.state.getKpiManager().totalExpiredInventory.get(campEntry.getKey()).get(itemEntry.getKey()) + item.getQuantity());
                        this.state.getInventoryPosition().get(campEntry.getKey()).put(itemEntry.getKey(), this.state.getInventoryPosition().get(campEntry.getKey()).get(itemEntry.getKey()) - item.getQuantity());
                        iterator.remove();
                    }
                }
            }
        }

        for (Map.Entry<Item, PriorityQueue<InventoryItem>> itemEntry : state.getCentralWarehouseInventory().entrySet()) {
            PriorityQueue<InventoryItem> itemQueue = itemEntry.getValue();
            Iterator<InventoryItem> iterator = itemQueue.iterator();
            while (iterator.hasNext()) {
                InventoryItem item = iterator.next();
                if (item.getExpiration() != 0 && item.getExpiration() <= currentTime) {
                    this.state.getKpiManager().totalCentralExpiredInventory.put(itemEntry.getKey(),
                            this.state.getKpiManager().totalCentralExpiredInventory.get(itemEntry.getKey()) + item.getQuantity());
                    this.state.getCentralWarehousePosition().put(itemEntry.getKey(), this.state.getCentralWarehousePosition().get(itemEntry.getKey()) - item.getQuantity());
                    iterator.remove();
                }
            }
        }
    }

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

    public Environment getEnvironment() {
        return this.environment;
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

                if (funding.getAmountData().distributionType == DistributionType.EQUAL_SHARE)
                {
                    double totalFunding = funding.getAmountData().getDistParameters().getMean();

                    for (double arrivalTime : arrivalTimes){
                        FundingEvent fe = new FundingEvent(funding, arrivalTime, totalFunding/count);
                        this.eventQueue.offer(fe);
                    }
                }
                else{
                    for (double arrivalTime : arrivalTimes){
                        FundingEvent fe = new FundingEvent(funding, quantityGenerator, arrivalTime);
                        this.eventQueue.offer(fe);
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
                this.eventQueue.offer(sde);

                SupplyRecoveryEvent sre = new SupplyRecoveryEvent(supplyStatusSwitch, this.interarrivalGenerator, currentTime);
                currentTime = sre.getTime();

                this.eventQueue.offer(sre);
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
            this.eventQueue.offer(me);
        }
    }

    private void generateInventoryControlEvents(){
        if (this.environment.getSimulationConfig().getInventoryControlType() == InventoryControlType.PERIODIC){
            for (int i = 0; i < this.environment.getSimulationConfig().getPlanningHorizon(); i += this.environment.getSimulationConfig().getInventoryControlPeriod()){
                InventoryControlEvent ice = new InventoryControlEvent(i);
                this.eventQueue.offer(ice);
            }
        }
        else if (this.environment.getSimulationConfig().getInventoryControlType() == InventoryControlType.CONTINUOUS){
            InventoryControlEvent ice = new InventoryControlEvent(0);
            this.eventQueue.offer(ice);
            lastContinuousICEventTime = 0.0;
        }
    }

    private void generateDemandEvents(Camp camp, Demand demand, double currentTime){
        if (camp == null) {
            System.out.println("Warning: Attempted to generate demand events for null camp. Skipping...");
            return;
        }

        if (demand == null) {
            System.out.println("Warning: Attempted to generate demand events with null demand for camp " + camp.getName() + ". Skipping...");
            return;
        }

        if (!this.demandEventQueue.containsKey(camp)){
            this.demandEventQueue.put(camp, new PriorityQueue<>(IEvent::compareTo));
        }

        if (!this.state.getInternalPopulation().containsKey(camp)) {
            System.out.println("Warning: No internal population data for camp " + camp.getName() + ". Initializing to 0.");
            this.state.getInternalPopulation().put(camp, 0);
        }

        if (!this.state.getExternalPopulation().containsKey(camp)) {
            System.out.println("Warning: No external population data for camp " + camp.getName() + ". Initializing to 0.");
            this.state.getExternalPopulation().put(camp, 0);
        }

        PriorityQueue<IEvent> demandQueue = this.demandEventQueue.get(camp);

        // Internal demand event generation
        DemandEvent demandEvent = new DemandEvent(this.state, camp, demand,
                                    this.interarrivalGenerator, this.quantityGenerator, currentTime); ;
        if (demandEvent.getTime() <= this.environment.getSimulationConfig().getPlanningHorizon()) demandQueue.offer(demandEvent);

        if (!demandQueue.isEmpty()){
            this.eventQueue.offer(demandQueue.poll());
        }
        this.demandEventQueue.put(camp, demandQueue);
    }

    private void migrationStateUpdate(MigrationEvent migrationEvent){
        if (migrationEvent == null) {
            System.out.println("Warning: Null migration event. Skipping state update.");
            return;
        }

        if (migrationEvent.migrationType == MigrationType.EXTERNAL_TO_SYSTEM ||
                migrationEvent.migrationType == MigrationType.INTERNAL_TO_SYSTEM) {
            if (migrationEvent.toCamp == null) {
                System.out.println("Warning: Migration event has null toCamp. Skipping state update.");
                return;
            }

            if (migrationEvent.quantity > 0) {
                this.state.getInventoryPolicy().initialize(environment, this.state);
                for (Demand demand : migrationEvent.toCamp.getDemands()) {
                    if (demand == null) continue; // Skip null demands

                    this.demandEventQueue.put(migrationEvent.toCamp, new PriorityQueue<>(IEvent::compareTo));
                    generateDemandEvents(migrationEvent.toCamp, demand, migrationEvent.getTime());
                }
            }
        }
        else if (migrationEvent.migrationType == MigrationType.INTERNAL_FROM_SYSTEM ||
                migrationEvent.migrationType == MigrationType.EXTERNAL_FROM_SYSTEM
        ) {
            if (migrationEvent.fromCamp == null) {
                System.out.println("Warning: Migration event has null fromCamp. Skipping state update.");
                return;
            }

            if (migrationEvent.quantity > 0) {
                this.state.getInventoryPolicy().initialize(environment, this.state);
                for (Demand demand : migrationEvent.fromCamp.getDemands()) {
                    if (demand == null) continue;

                    this.demandEventQueue.put(migrationEvent.fromCamp, new PriorityQueue<>(IEvent::compareTo));
                    generateDemandEvents(migrationEvent.fromCamp, demand, migrationEvent.getTime());
                }
            }
        }
        else if (migrationEvent.migrationType == MigrationType.INTERNAL_WITHIN_SYSTEM ||
                migrationEvent.migrationType == MigrationType.EXTERNAL_WITHIN_SYSTEM) {
            if (migrationEvent.fromCamp == null || migrationEvent.toCamp == null) {
                System.out.println("Warning: Migration event has null fromCamp or toCamp. Skipping state update.");
                return;
            }

            if (migrationEvent.quantity > 0) {
                this.demandEventQueue.put(migrationEvent.fromCamp, new PriorityQueue<>(IEvent::compareTo));
                this.demandEventQueue.put(migrationEvent.toCamp, new PriorityQueue<>(IEvent::compareTo));
                this.state.getInventoryPolicy().initialize(environment, this.state);

                for (Demand demand : migrationEvent.toCamp.getDemands()) {
                    if (demand == null) continue;
                    generateDemandEvents(migrationEvent.toCamp, demand, migrationEvent.getTime());
                }

                for (Demand demand : migrationEvent.fromCamp.getDemands()) {
                    if (demand == null) continue;
                    generateDemandEvents(migrationEvent.fromCamp, demand, migrationEvent.getTime());
                }
            }
        }
    }
    public State getState() {
        return this.state;
    }

}
