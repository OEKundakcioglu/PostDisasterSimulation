package simulation.event;

import simulation.KPIManager;
import simulation.State;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public interface IEvent extends Comparable<IEvent>{
    public double time = 0;

    public int compareTo(IEvent other);

    public double getTime();

    ArrayList<IEvent> processEvent(State state, InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator);
}
