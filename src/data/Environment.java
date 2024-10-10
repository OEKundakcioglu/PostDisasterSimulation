package data;

import data.config.RandomConfig;
import data.config.SimulationConfig;
import data.event_info.Demand;
import data.event_info.Migration;
import data.event_info.SupplyStatusSwitch;
import simulation.State;
import simulation.decision.IPolicy;
import simulation.decision.OrderUpToPolicy;

public class Environment {

    private State initialState;
    private Item[] items;
    private Camp[] camps;
    private Agency[] agencies;
    private Migration[] migrations;
    private SupplyStatusSwitch[] supplyStatusSwitches;
    private SimulationConfig simulationConfig;
    private IPolicy inventoryPolicy;


    public Environment() {

    }

    // TODO: Random environment generation
    public Environment(RandomConfig randomConfig) {

    }

    public State getInitialState() {
        return initialState;
    }

    public void setInitialState(State initialState) {
        this.initialState = initialState;
    }

    public Camp[] getCamps() {
        return camps;
    }

    public Demand getCorrespondingDemand(Item item, Camp camp) {
        for (Camp c : camps) {
            if (c.equals(camp)) {
                for (Demand d : c.getDemands()) {
                    if (d.getItem().equals(item)) {
                        return d;
                    }
                }
            }
        }
        return null;
    }

    public void setCamps(Camp[] camps) {
        this.camps = camps;
    }

    public Agency[] getAgencies() {
        return agencies;
    }

    public void setAgencies(Agency[] agencies) {
        this.agencies = agencies;
    }

    public Migration[] getMigrations() {
        return migrations;
    }

    public void setMigrations(Migration[] migrations) {
        this.migrations = migrations;
    }

    public SupplyStatusSwitch[] getSupplyStatusSwitches() {
        return supplyStatusSwitches;
    }

    public void setSupplyStatusSwitches(SupplyStatusSwitch[] supplyStatusSwitches) {
        this.supplyStatusSwitches = supplyStatusSwitches;
    }

    public SimulationConfig getSimulationConfig() {
        return simulationConfig;
    }

    public void setSimulationConfig(SimulationConfig simulationConfig) {
        this.simulationConfig = simulationConfig;
    }

    public Item[] getItems() {
        return items;
    }

    public void setItems(Item[] items) {
        this.items = items;
    }

    public IPolicy getInventoryPolicy() {
        return inventoryPolicy;
    }

    public void setInventoryPolicy(IPolicy inventoryPolicy) {
        this.inventoryPolicy = inventoryPolicy;
    }

}



