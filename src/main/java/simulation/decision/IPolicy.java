package simulation.decision;

import data.Environment;
import simulation.State;
import simulation.event.IEvent;
import simulation.generator.InterarrivalGenerator;
import simulation.generator.QuantityGenerator;

import java.util.ArrayList;

public interface IPolicy extends Cloneable {

    /**
     * Initialize the policy with the given environment and state.
     * @param environment The environment to initialize with.
     * @param state The state to initialize with.
     */
    public void initialize(Environment environment, State state);

    public ArrayList<IEvent> generateReplenishmentEvents(InterarrivalGenerator interarrivalGenerator, double time);

    public ArrayList<IEvent> generateTransferEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time);

    public ArrayList<IEvent> generateTransshipmentEvents(InterarrivalGenerator interarrivalGenerator, QuantityGenerator quantityGenerator, double time);

    /**
     * Get the environment.
     * @return The environment.
     */
    public Environment getEnvironment();

    /**
     * Set the environment.
     * @param environment The environment to set.
     */
    public void setEnvironment(Environment environment);

    public State getState();

    public void setState(State state);

    public Object clone() throws CloneNotSupportedException;
}
