package data;

import data.event_info.Funding;

public class Agency {
    private String name;
    private Funding[] fundingArray;

    public Agency() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Funding[] getFundingArray() {
        return fundingArray;
    }

    public void setFundingArray(Funding[] fundingArray) {
        this.fundingArray = fundingArray;
    }
}
