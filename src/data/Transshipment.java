package data;

import data.distribution.ProbabilityData;

import java.util.HashMap;

public class Transshipment {

    private Camp toCamp;
    private Camp fromCamp;
    private ProbabilityData leadTimeData;
    private HashMap<Item, Double> transshipmentCost;

    public Transshipment() {

    }

    public Transshipment(Camp toCamp) {
        this.toCamp = toCamp;
    }

    public Camp getToCamp() {
        return toCamp;
    }

    public Camp getFromCamp() {
        return fromCamp;
    }

    public void setFromCamp(Camp fromCamp) {
        this.fromCamp = fromCamp;
    }

    public void setToCamp(Camp toCamp) {
        this.toCamp = toCamp;
    }

    public ProbabilityData getLeadTimeData() {
        return leadTimeData;
    }

    public void setLeadTimeData(ProbabilityData leadTimeData) {
        this.leadTimeData = leadTimeData;
    }

    public HashMap<Item, Double> getTransshipmentCost() {
        return transshipmentCost;
    }

    public double getTransshipmentCost(Item item) {
        return transshipmentCost.get(item);
    }

    public void setTransshipmentCost(HashMap<Item, Double> transshipmentCost)
    {
        this.transshipmentCost = transshipmentCost;
    }

    public void setTransshipmentCost(Item item, Double cost)
    {
        this.transshipmentCost.put(item, cost);
    }




}
