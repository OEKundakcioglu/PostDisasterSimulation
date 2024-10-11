package data.event_info;

import data.Item;
import data.distribution.ProbabilityData;

public class SupplyStatusSwitch {
    private Item item;
    private ProbabilityData disruptionArrivalData;
    private ProbabilityData recoveryArrivalData;

    public SupplyStatusSwitch() {
    }

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }

    public ProbabilityData getDisruptionArrivalData() {
        return disruptionArrivalData;
    }

    public void setDisruptionArrivalData(ProbabilityData disruptionArrivalData) {
        this.disruptionArrivalData = disruptionArrivalData;
    }

    public ProbabilityData getRecoveryArrivalData() {
        return recoveryArrivalData;
    }

    public void setRecoveryArrivalData(ProbabilityData recoveryArrivalData) {
        this.recoveryArrivalData = recoveryArrivalData;
    }
}
