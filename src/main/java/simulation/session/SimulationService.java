package simulation.session;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import data.Environment;
import data.Item;
import data.Camp;
import data.config.SimulationWebSocketHandler;
import simulation.Simulate;
import simulation.State;
import simulation.decision.IPolicy;
import simulation.generator.InterarrivalGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class SimulationService {
    private final Map<String, SimulationSession> sessions = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private static final int MAX_ACTIVE_SESSIONS = 10;
    private final SimulationWebSocketHandler wsHandler;
    private final ObjectMapper mapper = new ObjectMapper();
    private final Timer logTimer = new Timer(true);
    private final ConcurrentMap<String, TimerTask> logTasks = new ConcurrentHashMap<>();
    private static final Logger log = LoggerFactory.getLogger(SimulationService.class);
    private static final long LOG_PUSH_PERIOD_MS = 50; // was 100 -> faster streaming

    public SimulationService(SimulationWebSocketHandler wsHandler){
        this.wsHandler = wsHandler;
    }

    public SimulationSession createSession(Environment env) {
        // Debug logging for input data
        log.info("=== Creating New Simulation Session ===");
        logEnvironmentDetails(env);
        
        SimulationSession session = new SimulationSession(env);
        sessions.put(session.getId(), session);
        return session;
    }
    public SimulationSession createSession(Environment env, Map<String,Object> raw){
        // Debug logging for input data (including raw payload)
        log.info("=== Creating New Simulation Session (with raw payload) ===");
        logEnvironmentDetails(env);
        
        SimulationSession session = new SimulationSession(env, raw);
        sessions.put(session.getId(), session);
        return session;
    }

    public List<SimulationSession> listSessions() {
        return Collections.unmodifiableList(new ArrayList<>(sessions.values()));
    }

    public SimulationSession getSession(String id) { return sessions.get(id); }

    public void startSession(String id) {
        SimulationSession session = sessions.get(id);
        if (session == null) throw new IllegalArgumentException("Session not found");
        long running = sessions.values().stream().filter(s -> s.getStatus() == SimulationStatus.RUNNING).count();
        if (running >= MAX_ACTIVE_SESSIONS) throw new IllegalStateException("Max active sessions reached");
        if (session.getStatus() != SimulationStatus.PENDING) throw new IllegalStateException("Session already started");

        try {
            Environment env = session.getEnvironment();
            
            // Validate environment before starting
            validateEnvironment(env);
            
            InterarrivalGenerator interGen = new InterarrivalGenerator(env.getSimulationConfig());
            env.getInitialState().projectInitialState(interGen);
            State initial = env.getInitialState();
            initial.initialize(env);
            IPolicy policy = env.getInventoryPolicy();
            policy.initialize(env, initial);
            initial.setInventoryPolicy((IPolicy) policy.clone());
        } catch (ValidationException e) {
            log.error("Validation failed for session {}: {}", id, e.getMessage());
            session.setStatus(SimulationStatus.FAILED);
            session.setErrorMessage(e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Environment initialization failed for session {}", id, e);
            session.setStatus(SimulationStatus.FAILED);
            session.setErrorMessage("Simulation setup failed: " + e.getMessage());
            throw new ValidationException("Failed to initialize simulation: " + e.getMessage());
        }

        session.setStatus(SimulationStatus.RUNNING);
        session.setStartedAt(java.time.Instant.now());
        Future<?> future = executor.submit(() -> {
            Simulate simulate = new Simulate(session.getEnvironment(), () -> session.getCancelRequested().get());
            // Make the instance visible to the log streamer immediately (before prepare/run)
            session.setSimulateInstance(simulate);
            try {
                // Run at full speed (no artificial throttling) for faster progression
                simulate.prepare();
                simulate.run();
                if (!session.getCancelRequested().get()) simulate.finalizeSimulation();
                if (session.getStatus() == SimulationStatus.RUNNING && !session.getCancelRequested().get()) session.setStatus(SimulationStatus.COMPLETED);
                if (session.getCancelRequested().get()) session.setStatus(SimulationStatus.CANCELLED);
            } catch (Exception e) {
                session.setStatus(SimulationStatus.FAILED);
                log.error("Simulation execution failed for session {}", session.getId(), e);
            } finally {
                simulate.cleanup();
                session.setEndedAt(java.time.Instant.now());
            }
        });
        session.setFuture(future);

        // schedule log push
        TimerTask task = new TimerTask(){
            @Override public void run(){
                SimulationSession s = sessions.get(session.getId());
                if (s == null) { cancelSelf(); return; }
                SimulationStatus st = s.getStatus();
                if (st == SimulationStatus.CANCELLED || st == SimulationStatus.FAILED) { cancelSelf(); return; }
                if (s.getSimulateInstance()==null) return;
                var kpiManager = s.getSimulateInstance().getState().getKpiManager();
                var logs = kpiManager.getTimeStepLogs();
                int idx = s.getLastSentLogIndex();
                int basePruned = kpiManager.getPrunedCount();
                int sent = 0;
                while (idx < logs.size() && sent < 20) { // was 10 -> larger batch per tick
                    try {
                        var logEntry = logs.get(idx);
                        int globalIndex = basePruned + idx; // stable index accounting for pruning
                        var payload = new java.util.HashMap<String,Object>();
                        payload.put("index", globalIndex);
                        payload.put("log", logEntry);
                        wsHandler.sendMessageToSession(s.getId(), mapper.writeValueAsString(payload));
                        idx++; sent++;
                    } catch (Exception ex) {
                        log.warn("Failed sending log for session {} at index {}", s.getId(), idx, ex);
                        break;
                    }
                }
                s.setLastSentLogIndex(idx);
                // If completed and nothing left to send, cancel task
                if (st == SimulationStatus.COMPLETED && idx >= logs.size()) {
                    cancelSelf();
                }
            }
            private void cancelSelf(){
                this.cancel();
                logTasks.remove(session.getId());
                log.debug("Cancelled log TimerTask for session {}", session.getId());
            }
        };
        logTasks.put(session.getId(), task);
        logTimer.scheduleAtFixedRate(task, 300, LOG_PUSH_PERIOD_MS); // was 500 initial delay
    }

    public boolean cancelSession(String id) {
        SimulationSession session = sessions.get(id);
        if (session == null) return false;
        if (session.getStatus() != SimulationStatus.RUNNING) return false;
        session.getCancelRequested().set(true);
        boolean cancelled = session.getFuture().cancel(true);
        if (cancelled) {
            session.setStatus(SimulationStatus.CANCELLED);
            session.setEndedAt(java.time.Instant.now());
            TimerTask task = logTasks.remove(id);
            if (task != null) { task.cancel(); log.debug("Cancelled log task on explicit cancel for session {}", id); }
        }
        return cancelled;
    }

    public boolean deleteSession(String id){
        SimulationSession s = sessions.get(id);
        if (s == null) return false;
        if (s.getStatus() == SimulationStatus.RUNNING) return false; // do not delete active
        TimerTask task = logTasks.remove(id);
        if (task != null) { task.cancel(); log.debug("Cancelled log task on delete for session {}", id); }
        return sessions.remove(id) != null;
    }

    // Custom exception class for validation errors
    public static class ValidationException extends RuntimeException {
        public ValidationException(String message) {
            super(message);
        }
    }

    private void validateEnvironment(Environment environment) throws ValidationException {
        List<String> errors = new ArrayList<>();
        
        // Check inventory policy completeness
        if (environment.getInventoryPolicy() == null) {
            errors.add("Inventory policy is missing");
        } else {
            validateInventoryPolicy(environment, errors);
        }
        
        // Check initial state completeness
        if (environment.getInitialState() == null) {
            errors.add("Initial state configuration is missing");
        } else {
            validateInitialState(environment, errors);
        }
        
        if (!errors.isEmpty()) {
            throw new ValidationException("Configuration errors found:\n• " + String.join("\n• ", errors));
        }
    }

    private void validateInventoryPolicy(Environment environment, List<String> errors) {
        var policy = environment.getInventoryPolicy();
        
        // Only validate if the policy is OrderUpToPolicy
        if (!(policy instanceof simulation.decision.OrderUpToPolicy)) {
            return; // Skip validation for other policy types
        }
        
        simulation.decision.OrderUpToPolicy orderUpToPolicy = (simulation.decision.OrderUpToPolicy) policy;
        
        // Check camp-level policies
        for (Camp camp : environment.getCamps()) {
            if (!orderUpToPolicy.getPeriodicCounts().containsKey(camp)) {
                errors.add("Missing inventory policy for camp: " + camp.getName());
                continue;
            }
            
            var campPolicy = orderUpToPolicy.getPeriodicCounts().get(camp);
            for (Item item : environment.getItems()) {
                if (!campPolicy.containsKey(item)) {
                    errors.add("Missing periodic count for camp '" + camp.getName() + "' and item '" + item.getName() + "'");
                }
            }
            
            // Check buffer ratios
            if (!orderUpToPolicy.getBufferRatios().containsKey(camp)) {
                errors.add("Missing buffer ratios for camp: " + camp.getName());
            } else {
                var campBuffers = orderUpToPolicy.getBufferRatios().get(camp);
                for (Item item : environment.getItems()) {
                    if (!campBuffers.containsKey(item)) {
                        errors.add("Missing buffer ratio for camp '" + camp.getName() + "' and item '" + item.getName() + "'");
                    }
                }
            }
        }
        
        // Check central policies
        for (Item item : environment.getItems()) {
            if (!orderUpToPolicy.getCentralPeriodicCounts().containsKey(item)) {
                errors.add("Missing central warehouse periodic count for item: " + item.getName());
            }
            if (!orderUpToPolicy.getCentralBufferRatios().containsKey(item)) {
                errors.add("Missing central warehouse buffer ratio for item: " + item.getName());
            }
        }
    }

    private void validateInitialState(Environment environment, List<String> errors) {
        var initialState = environment.getInitialState();
        
        // Check initial inventory structure
        for (Camp camp : environment.getCamps()) {
            if (!initialState.getInitialInventory().containsKey(camp)) {
                errors.add("Missing initial inventory setup for camp: " + camp.getName());
                continue;
            }
            
            var campInventory = initialState.getInitialInventory().get(camp);
            for (Item item : environment.getItems()) {
                if (!campInventory.containsKey(item)) {
                    errors.add("Missing initial inventory for camp '" + camp.getName() + "' and item '" + item.getName() + "'");
                }
            }
        }
        
        // Check central warehouse inventory
        for (Item item : environment.getItems()) {
            if (!initialState.getInitialCentralWarehouseInventory().containsKey(item)) {
                errors.add("Missing initial central warehouse inventory for item: " + item.getName());
            }
        }
        
        // Check item availability flags
        for (Item item : environment.getItems()) {
            if (!initialState.getIsItemAvailable().containsKey(item)) {
                errors.add("Missing availability setting for item: " + item.getName());
            }
        }
    }
    
    private void logEnvironmentDetails(Environment env) {
        try {
            log.info("📋 SIMULATION CONFIGURATION DEBUG DATA:");
            
            // Log simulation config
            if (env.getSimulationConfig() != null) {
                log.info("🔧 Simulation Config: Duration={}, Seeds: demand={}, quantity={}, duration={}", 
                    env.getSimulationConfig().getSeedItemDuration(),
                    env.getSimulationConfig().getSeedDemandTime(),
                    env.getSimulationConfig().getSeedDemandQuantity(),
                    env.getSimulationConfig().getSeedItemDuration());
            }
            
            // Log camps
            log.info("🏕️ CAMPS ({} total):", env.getCamps().length);
            for (Camp camp : env.getCamps()) {
                log.info("  - Camp: '{}' (Internal: {}, External: {})", 
                    camp.getName(), 
                    camp.getInitialInternalPopulation(),
                    camp.getInitialExternalPopulation());
            }
            
            // Log items
            log.info("📦 ITEMS ({} total):", env.getItems().length);
            for (Item item : env.getItems()) {
                log.info("  - Item: '{}' (Perishable: {})", 
                    item.getName(), 
                    item.getIsPerishable());
            }
            
            // Log initial state details
            if (env.getInitialState() != null) {
                logInitialStateDetails(env);
            }
            
            // Log inventory policy details
            if (env.getInventoryPolicy() != null) {
                logInventoryPolicyDetails(env);
            }
            
            log.info("=== END DEBUG DATA ===");
            
        } catch (Exception e) {
            log.error("Error while logging environment details", e);
        }
    }
    
    private void logInitialStateDetails(Environment env) {
        var initialState = env.getInitialState();
        
        log.info("🏪 INITIAL INVENTORY:");
        // Log camp initial inventory
        if (initialState.getInitialInventory() != null) {
            for (Camp camp : env.getCamps()) {
                if (initialState.getInitialInventory().containsKey(camp)) {
                    var campInventory = initialState.getInitialInventory().get(camp);
                    log.info("  Camp '{}' has {} items configured:", camp.getName(), campInventory.size());
                    for (Item item : env.getItems()) {
                        Integer quantity = campInventory.get(item);
                        if (quantity != null) {
                            log.info("    - {}: {}", item.getName(), quantity);
                        } else {
                            log.warn("    - {}: MISSING ❌", item.getName());
                        }
                    }
                } else {
                    log.warn("  Camp '{}': NO INVENTORY CONFIGURED ❌", camp.getName());
                }
            }
        }
        
        // Log central warehouse inventory
        log.info("🏢 CENTRAL WAREHOUSE INVENTORY:");
        if (initialState.getInitialCentralWarehouseInventory() != null) {
            for (Item item : env.getItems()) {
                Integer quantity = initialState.getInitialCentralWarehouseInventory().get(item);
                if (quantity != null) {
                    log.info("  - {}: {}", item.getName(), quantity);
                } else {
                    log.warn("  - {}: MISSING ❌", item.getName());
                }
            }
        }
        
        // Log item availability
        log.info("✅ ITEM AVAILABILITY:");
        if (initialState.getIsItemAvailable() != null) {
            for (Item item : env.getItems()) {
                Boolean available = initialState.getIsItemAvailable().get(item);
                log.info("  - {}: {}", item.getName(), available != null ? available : "MISSING ❌");
            }
        }
    }
    
    private void logInventoryPolicyDetails(Environment env) {
        var policy = env.getInventoryPolicy();
        
    if (policy instanceof simulation.decision.OrderUpToPolicy orderUpToPolicy) {
            
            log.info("📊 INVENTORY POLICY (OrderUpToPolicy):");
            
            // Log periodic counts
            log.info("  📅 PERIODIC COUNTS:");
            for (Camp camp : env.getCamps()) {
                if (orderUpToPolicy.getPeriodicCounts().containsKey(camp)) {
                    var campCounts = orderUpToPolicy.getPeriodicCounts().get(camp);
                    log.info("    Camp '{}' has {} items configured:", camp.getName(), campCounts.size());
                    for (Item item : env.getItems()) {
                        Integer count = campCounts.get(item);
                        if (count != null) {
                            log.info("      - {}: {}", item.getName(), count);
                        } else {
                            log.warn("      - {}: MISSING ❌", item.getName());
                        }
                    }
                } else {
                    log.warn("    Camp '{}': NO PERIODIC COUNTS ❌", camp.getName());
                }
            }
            
            // Log buffer ratios
            log.info("  📈 BUFFER RATIOS:");
            for (Camp camp : env.getCamps()) {
                if (orderUpToPolicy.getBufferRatios().containsKey(camp)) {
                    var campRatios = orderUpToPolicy.getBufferRatios().get(camp);
                    log.info("    Camp '{}' has {} items configured:", camp.getName(), campRatios.size());
                    for (Item item : env.getItems()) {
                        Double ratio = campRatios.get(item);
                        if (ratio != null) {
                            log.info("      - {}: {}", item.getName(), ratio);
                        } else {
                            log.warn("      - {}: MISSING ❌", item.getName());
                        }
                    }
                } else {
                    log.warn("    Camp '{}': NO BUFFER RATIOS ❌", camp.getName());
                }
            }
            
            // Log central policies
            log.info("  🏢 CENTRAL POLICIES:");
            log.info("    Central Periodic Counts:");
            for (Item item : env.getItems()) {
                Integer count = orderUpToPolicy.getCentralPeriodicCounts().get(item);
                if (count != null) {
                    log.info("      - {}: {}", item.getName(), count);
                } else {
                    log.warn("      - {}: MISSING ❌", item.getName());
                }
            }
            
            log.info("    Central Buffer Ratios:");
            for (Item item : env.getItems()) {
                Double ratio = orderUpToPolicy.getCentralBufferRatios().get(item);
                if (ratio != null) {
                    log.info("      - {}: {}", item.getName(), ratio);
                } else {
                    log.warn("      - {}: MISSING ❌", item.getName());
                }
            }
        } else if (policy != null) {
            log.info("📊 INVENTORY POLICY: {}", policy.getClass().getSimpleName());
        }
    }
}
