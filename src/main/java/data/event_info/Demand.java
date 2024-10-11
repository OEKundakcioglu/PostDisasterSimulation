package data.event_info;

import data.Item;
import data.distribution.ProbabilityData;
import enums.DemandQuantityType;
import enums.DemandTimingType;

public class Demand {
    private Item item;
    private DemandTimingType demandTimingType;
    private DemandQuantityType demandQuantityType;
    private ProbabilityData arrivalData;
    private ProbabilityData quantityData;
    private double internalRatio;
    private double externalRatio;


    public Demand() {
    }

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }

    public DemandTimingType getDemandTimingType() {
        return demandTimingType;
    }

    public void setDemandTimingType(DemandTimingType demandTimingType) {
        this.demandTimingType = demandTimingType;
    }

    public DemandQuantityType getDemandQuantityType() {
        return demandQuantityType;
    }

    public void setDemandQuantityType(DemandQuantityType demandQuantityType) {
        this.demandQuantityType = demandQuantityType;
    }

    public ProbabilityData getArrivalData() {
        return arrivalData;
    }

    public void setArrivalData(ProbabilityData arrivalData) {
        this.arrivalData = arrivalData;
    }

    public ProbabilityData getQuantityData() {
        return quantityData;
    }

    public void setQuantityData(ProbabilityData quantityData) {
        this.quantityData = quantityData;
    }

    public double getInternalRatio() {
        return internalRatio;
    }

    public void setInternalRatio(double internalRatio) {
        this.internalRatio = internalRatio;
    }

    public double getExternalRatio() {
        return externalRatio;
    }

    public void setExternalRatio(double externalRatio) {
        this.externalRatio = externalRatio;
    }


}
