package simulation.decision;

import data.Environment;
import simulation.State;
import simulation.event.IEvent;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public interface IPolicy {

    public void initialize(Environment environment, State state);

    public ArrayList<IEvent> generateReplenishmentEvents(InterarrivalGenerator interarrivalGenerator, double time);

    public ArrayList<IEvent> generateTransferEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time);

    public Environment getEnvironment();

    public void setEnvironment(Environment environment);

    public State getState();

    public void setState(State state);
    Object clone() throws CloneNotSupportedException;

}
