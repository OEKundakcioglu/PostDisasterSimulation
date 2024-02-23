package data;

import data.event_info.Funding;

public class Agency {
    private String name;
    private Funding[] fundings;

    public Agency() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Funding[] getFundings() {
        return fundings;
    }

    public void setFundings(Funding[] fundings) {
        this.fundings = fundings;
    }
}
