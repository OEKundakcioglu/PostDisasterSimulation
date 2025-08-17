package simulation.session;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicBoolean;

import data.Environment;
import simulation.Simulate;

public class SimulationSession {
    private final String id;
    private final Environment environment;
    private volatile SimulationStatus status;
    private final Instant createdAt;
    private Instant startedAt;
    private Instant endedAt;
    private Future<?> future;
    private Simulate simulateInstance;
    private final AtomicBoolean cancelRequested = new AtomicBoolean(false);
    private int lastSentLogIndex = 0;
    private Map<String,Object> rawPayload; // original request payload for download
    private String errorMessage; // stores validation or runtime error messages

    public SimulationSession(Environment environment, Map<String,Object> rawPayload) {
        this.id = UUID.randomUUID().toString();
        this.environment = environment;
        this.status = SimulationStatus.PENDING;
        this.createdAt = Instant.now();
        this.rawPayload = rawPayload;
    }
    public SimulationSession(Environment environment) { this(environment, null); }

    public String getId() { return id; }
    public Environment getEnvironment() { return environment; }
    public SimulationStatus getStatus() { return status; }
    public void setStatus(SimulationStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public void setEndedAt(Instant endedAt) { this.endedAt = endedAt; }
    public Future<?> getFuture() { return future; }
    public void setFuture(Future<?> future) { this.future = future; }
    public Simulate getSimulateInstance() { return simulateInstance; }
    public void setSimulateInstance(Simulate simulateInstance) { this.simulateInstance = simulateInstance; }
    public AtomicBoolean getCancelRequested() { return cancelRequested; }
    public int getLastSentLogIndex() { return lastSentLogIndex; }
    public void setLastSentLogIndex(int idx) { this.lastSentLogIndex = idx; }
    public Map<String,Object> getRawPayload(){ return rawPayload; }
    public void setRawPayload(Map<String,Object> raw){ this.rawPayload = raw; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
}
