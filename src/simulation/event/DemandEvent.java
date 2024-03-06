package simulation.event;

import data.Camp;
import data.Item;
import data.event_info.Demand;
import enums.DemandTimingType;
import simulation.KPIManager;
import simulation.State;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public class DemandEvent implements IEvent {
    public Camp camp;
    public Item item;
    public Demand demand;
    public double time;
    public boolean isInternal;
    public int quantity;


    public DemandEvent(State state, Camp camp, Demand demand, boolean isInternal, InterarrivalGenerator interarrivalGenerator,
                       QuantityGenerator quantityGenerator, double tNow){
        this.camp = camp;
        this.isInternal = isInternal;
        this.demand = demand;
        this.item = demand.getItem();

        if (isInternal) {
            this.time = tNow + (interarrivalGenerator.generateDemand(demand)) / (state.getInternalPopulation().get(this.camp) * demand.getInternalRatio());
            this.quantity = quantityGenerator.generateDemandQuantity(demand, state.getInternalPopulation().get(this.camp), isInternal);
        } else {
            this.time = tNow + interarrivalGenerator.generateDemand(demand) / (state.getExternalPopulation().get(this.camp) * demand.getExternalRatio());
            this.quantity = quantityGenerator.generateDemandQuantity(demand, state.getExternalPopulation().get(this.camp), isInternal);
        }
    }

    public int compareTo(IEvent other) {
        return Double.compare(this.getTime(), other.getTime());
    }

    public double getTime() {
        return time;
    }

    public ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator){

        ArrayList<IEvent> returnEvents = new ArrayList<>();

        if (state.getKpiManager().isReportEvents())
            System.out.println(this.getClass().getSimpleName() + " Time: " + this.getTime() + " Quantity: " +
                this.quantity);

        // Update the state (camp inventories)
        state.consumeInventory(this.camp, this.item, this.isInternal, this.quantity, this.time);

        if (this.demand.getDemandTimingType() == DemandTimingType.ONETIME) {
            return null;
        }
        else{
            DemandEvent newEvent = new DemandEvent(state, this.camp, this.demand, this.isInternal, interarrivalGenerator,
                    quantityGenerator, this.getTime());
            returnEvents.add(newEvent);
            return returnEvents;
        }

    }
}
