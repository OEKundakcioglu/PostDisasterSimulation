package data;

import data.distribution.ProbabilityData;

public class Item {
    private String name;
    private double price;
    private double orderingCost;
    private double holdingCost;
    private double deprivationCoefficient;
    private double referralCost;
    private boolean isPerishable;
    private ProbabilityData durationData;
    private ProbabilityData leadTimeData;


    public Item() {

    }

    public Item(String name, boolean isPerishable) {
        this.name = name;
        this.isPerishable = isPerishable;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public double getOrderingCost() {
        return orderingCost;
    }

    public void setOrderingCost(double orderingCost) {
        this.orderingCost = orderingCost;
    }

    public double getHoldingCost() {
        return holdingCost;
    }

    public void setHoldingCost(double holdingCost) {
        this.holdingCost = holdingCost;
    }

    public double getDeprivationCoefficient() {
        return deprivationCoefficient;
    }

    public void setDeprivationCoefficient(double deprivationCoefficient) {
        this.deprivationCoefficient = deprivationCoefficient;
    }

    public double getReferralCost() {
        return referralCost;
    }

    public void setReferralCost(double referralCost) {
        this.referralCost = referralCost;
    }

    public boolean getIsPerishable() {
        return isPerishable;
    }

    public void setIsPerishable(boolean perishable) {
        isPerishable = perishable;
    }

    public ProbabilityData getDurationData() {
        return durationData;
    }

    public void setDurationData(ProbabilityData durationData) {
        this.durationData = durationData;
    }

    public ProbabilityData getLeadTimeData() {
        return leadTimeData;
    }
    public void setLeadTimeData(ProbabilityData leadTimeData) {
        this.leadTimeData = leadTimeData;
    }
}

