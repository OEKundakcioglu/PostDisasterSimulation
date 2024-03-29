package simulation.event;
import data.Camp;
import data.Item;
import data.event_info.Funding;
import enums.DistributionType;
import enums.FundingType;
import simulation.KPIManager;
import simulation.State;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public class FundingEvent implements IEvent {

    public Funding funding;
    public Item item;
    public Camp camp;
    public FundingType fundingType;
    public double time;
    public double amount;

    public FundingEvent(Funding funding, QuantityGenerator quantityGenerator, double time) {
        this.funding = funding;
        this.item = funding.getItems();
        this.camp = funding.getCamp();
        this.fundingType = funding.getFundingType();
        this.time = time;
        this.amount = quantityGenerator.generateFundingAmount(funding);
    }

    public FundingEvent(Funding funding, double time, double amount) {
        this.funding = funding;
        this.item = funding.getItems();
        this.camp = funding.getCamp();
        this.fundingType = funding.getFundingType();
        this.time = time;
        this.amount = amount;
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }
    public double getTime() {
        return time;
    }

    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator) {
        if (state.getKpiManager().isReportEvents())
            System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime() + " Amount: " +
                this.amount);

        // Update the state
        if (this.fundingType == FundingType.INKIND_EARMARKED || this.fundingType == FundingType.INKIND_REGULAR) {
            state.updateFunds(this.camp, this.item, this.fundingType, this.amount, this.getTime(), this.getTime());
        }
        else {
            state.updateFunds(this.camp, this.item, this.fundingType, this.amount, this.getTime(), this.getTime());
        }
        return null;

    }
}
