package data.event_info;

import data.Camp;
import data.Item;
import data.distribution.ProbabilityData;
import enums.FundingType;


public class Funding {
    private Item item;
    private Camp camp;
    private FundingType fundingType;
    private ProbabilityData arrivalData;
    private ProbabilityData amountData;

    public Funding() {
    }

    public Item getItems() {
        return item;
    }

    public void setItems(Item items) {
        this.item = items;
    }

    public Camp getCamp() {
        return camp;
    }

    public void setCamps(Camp camp) {
        this.camp = camp;
    }

    public FundingType getFundingType() {
        return fundingType;
    }

    public void setFundingType(FundingType fundingType) {
        this.fundingType = fundingType;
    }

    public ProbabilityData getArrivalData() {
        return arrivalData;
    }

    public void setArrivalData(ProbabilityData arrivalData) {
        this.arrivalData = arrivalData;
    }

    public ProbabilityData getAmountData() {
        return amountData;
    }

    public void setAmountData(ProbabilityData amountData) {
        this.amountData = amountData;
    }
}
