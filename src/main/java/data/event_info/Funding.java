package data.event_info;

import com.fasterxml.jackson.annotation.JsonProperty;

import data.Camp;
import data.Item;
import data.distribution.ProbabilityData;
import enums.FundingType;


public class Funding {
    @JsonProperty("item")
    private Item item;
    
    @JsonProperty("camp")
    private Camp camp;
    
    @JsonProperty("fundingType")
    private FundingType fundingType;
    
    @JsonProperty("arrivalData")
    private ProbabilityData arrivalData;
    
    @JsonProperty("amountData")
    private ProbabilityData amountData;

    public Funding() {
    }

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }

    public Camp getCamp() {
        return camp;
    }

    public void setCamp(Camp camp) {
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
