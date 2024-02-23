package data.config;

import enums.InventoryControlType;

public class SimulationConfig {
    private int seedDemandTime;
    private int seedFundingTime;
    private int seedSupplyDisruptionTime;
    private int seedMigrationTime;
    private int seedReplenishmentTime;
    private int seedTransferTime;
    private int seedTransshipmentTime;

    private int seedDemandQuantity;
    private int seedFundingAmount;
    private int seedMigrationQuantity;
    private int seedSupplyDisruptionDuration;

    private int simulationResolution;

    private InventoryControlType inventoryControlType;
    private double planningHorizon;


    public int getSeedDemandTime() {
        return seedDemandTime;
    }

    public void setSeedDemandTime(int seedDemandTime) {
        this.seedDemandTime = seedDemandTime;
    }

    public int getSeedFundingTime() {
        return seedFundingTime;
    }

    public void setSeedFundingTime(int seedFundingTime) {
        this.seedFundingTime = seedFundingTime;
    }

    public int getSeedSupplyDisruptionTime() {
        return seedSupplyDisruptionTime;
    }

    public void setSeedSupplyDisruptionTime(int seedSupplyDisruptionTime) {
        this.seedSupplyDisruptionTime = seedSupplyDisruptionTime;
    }

    public int getSeedMigrationTime() {
        return seedMigrationTime;
    }

    public void setSeedMigrationTime(int seedMigrationTime) {
        this.seedMigrationTime = seedMigrationTime;
    }

    public int getSeedReplenishmentTime() {
        return seedReplenishmentTime;
    }

    public void setSeedReplenishmentTime(int seedReplenishmentTime) {
        this.seedReplenishmentTime = seedReplenishmentTime;
    }

    public int getSeedTransferTime() {
        return seedTransferTime;
    }

    public void setSeedTransferTime(int seedTransferTime) {
        this.seedTransferTime = seedTransferTime;
    }

    public int getSeedTransshipmentTime() {
        return seedTransshipmentTime;
    }

    public void setSeedTransshipmentTime(int seedTransshipmentTime) {
        this.seedTransshipmentTime = seedTransshipmentTime;
    }
    public int getSeedDemandQuantity() {
        return seedDemandQuantity;
    }

    public void setSeedDemandQuantity(int seedDemandQuantity) {
        this.seedDemandQuantity = seedDemandQuantity;
    }

    public int getSeedFundingAmount() {
        return seedFundingAmount;
    }

    public void setSeedFundingAmount(int seedFundingAmount) {
        this.seedFundingAmount = seedFundingAmount;
    }

    public int getSeedMigrationQuantity() {
        return seedMigrationQuantity;
    }

    public void setSeedMigrationQuantity(int seedMigrationQuantity) {
        this.seedMigrationQuantity = seedMigrationQuantity;
    }

    public int getSeedSupplyDisruptionDuration() {
        return seedSupplyDisruptionDuration;
    }

    public void setSeedSupplyDisruptionDuration(int seedSupplyDisruptionDuration) {
        this.seedSupplyDisruptionDuration = seedSupplyDisruptionDuration;
    }

    public int getSimulationResolution() {
        return simulationResolution;
    }

    public void setSimulationResolution(int simulationResolution) {
        this.simulationResolution = simulationResolution;
    }

    public double getPlanningHorizon() {
        return planningHorizon;
    }

    public void setPlanningHorizon(double planningHorizon) {
        this.planningHorizon = planningHorizon;
    }

    public InventoryControlType getInventoryControlType() {
        return inventoryControlType;
    }

    public void setInventoryControlType(InventoryControlType inventoryControlType) {
        this.inventoryControlType = inventoryControlType;
    }

}
