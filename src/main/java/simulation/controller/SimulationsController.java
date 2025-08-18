package simulation.controller;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;

import data.Environment;
import simulation.mapper.SimulationEnvironmentMapper;
import simulation.session.SimulationService;
import simulation.session.SimulationSession;
import simulation.session.SimulationStatus;

@RestController
@RequestMapping("/api/simulations")
public class SimulationsController {
    private final SimulationService simulationService;
    private static final Logger log = LoggerFactory.getLogger(SimulationsController.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SimulationsController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    @PostMapping
    public ResponseEntity<?> createSimulation(@RequestBody Map<String,Object> payload) {
        try {
            // Log the raw JSON payload for debugging
            log.info("🚀 === NEW SIMULATION REQUEST ===");
            log.info("📨 Raw JSON Payload received:");
            log.info(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload));
            log.info("=== END RAW PAYLOAD ===");
            
            // Validate simulation size before processing
            String validationError = validateSimulationSize(payload);
            if (validationError != null) {
                log.warn("❌ Simulation validation failed: {}", validationError);
                return ResponseEntity.badRequest().body(Map.of("error", validationError));
            }
            
            Environment env = SimulationEnvironmentMapper.fromPayload(payload);
            if (env.getSimulationConfig() != null) {
                env.getSimulationConfig().setUseReactUI(true); // enable realtime UI usage
            }
            SimulationSession session = simulationService.createSession(env, payload); // store raw
            return ResponseEntity.ok(Map.of(
                "id", session.getId(),
                "status", session.getStatus()
            ));
        } catch (OutOfMemoryError e) {
            log.error("❌ Out of memory error during simulation creation", e);
            return ResponseEntity.status(507).body(Map.of("error", "Simulation too large for available memory. Please reduce population sizes or planning horizon."));
        } catch (Exception e) {
            log.error("❌ Error creating simulation", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<?> startSimulation(@PathVariable String id) {
        try {
            simulationService.startSession(id);
            return ResponseEntity.ok(Map.of("id", id, "status", SimulationStatus.RUNNING));
        } catch (OutOfMemoryError e) {
            log.error("❌ Out of memory error during simulation start", e);
            return ResponseEntity.status(507).body(Map.of("error", "Simulation ran out of memory during execution. Please reduce population sizes, planning horizon, or number of camps/items."));
        } catch (Exception e) {
            log.error("❌ Error starting simulation: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelSimulation(@PathVariable String id) {
        boolean cancelled = simulationService.cancelSession(id);
        return ResponseEntity.ok(Map.of("id", id, "cancelled", cancelled));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSimulation(@PathVariable String id) {
        SimulationSession session = simulationService.getSession(id);
        if (session == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of(
            "id", session.getId(),
            "status", session.getStatus(),
            "createdAt", session.getCreatedAt(),
            "startedAt", session.getStartedAt(),
            "endedAt", session.getEndedAt()
        ));

    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<?> getLogs(@PathVariable String id, @RequestParam(name = "from", required = false, defaultValue = "0") int from) {
        SimulationSession session = simulationService.getSession(id);
        if (session == null) return ResponseEntity.notFound().build();
        if (session.getSimulateInstance() == null) return ResponseEntity.ok(Map.of("logs", List.of(), "offset", 0, "next", 0));
        var kpi = session.getSimulateInstance().getState().getKpiManager();
        var allLogs = kpi.getTimeStepLogs();
        int offset = 0;
        try { offset = (int)kpi.getPrunedCount(); } catch (Exception ignored) {}
        if (from < offset) from = offset; // cannot request before pruned
        int localFrom = from - offset;
        if (localFrom < 0) localFrom = 0;
        if (localFrom > allLogs.size()) localFrom = allLogs.size();
        var slice = allLogs.subList(localFrom, allLogs.size());
        int next = offset + allLogs.size();
        return ResponseEntity.ok(Map.of(
            "from", from,
            "offset", offset,
            "next", next,
            "logs", slice
        ));
    }

    @GetMapping("/{id}/environment")
    public ResponseEntity<?> getEnvironment(@PathVariable String id, @RequestParam(name="raw", required=false, defaultValue="false") boolean raw){
        SimulationSession session = simulationService.getSession(id);
        if (session == null) return ResponseEntity.notFound().build();
        Object body = raw && session.getRawPayload()!=null ? session.getRawPayload() : session.getEnvironment();
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSimulation(@PathVariable String id){
        boolean removed = simulationService.deleteSession(id);
        return ResponseEntity.ok(Map.of("id", id, "removed", removed));
    }
    
    /**
     * Validates simulation size to prevent memory issues
     */
    private String validateSimulationSize(Map<String, Object> payload) {
        try {
            // Extract simulation config
            Map<String, Object> simConfig = (Map<String, Object>) payload.get("simulationConfig");
            if (simConfig != null) {
                Object horizonObj = simConfig.get("planningHorizon");
                if (horizonObj != null) {
                    int planningHorizon = Integer.parseInt(horizonObj.toString());
                    if (planningHorizon > 2000) {
                        return "Planning horizon too large (" + planningHorizon + "). Maximum allowed: 2000 time units.";
                    }
                }
            }
            
            // Extract camps and check population sizes
            List<Map<String, Object>> camps = (List<Map<String, Object>>) payload.get("camps");
            if (camps != null) {
                long totalPopulation = 0;
                int campCount = camps.size();
                
                if (campCount > 20) {
                    return "Too many camps (" + campCount + "). Maximum allowed: 20 camps.";
                }
                
                for (Map<String, Object> camp : camps) {
                    Object internalPop = camp.get("initialInternalPopulation");
                    Object externalPop = camp.get("initialExternalPopulation");
                    
                    if (internalPop != null) {
                        long internal = Long.parseLong(internalPop.toString());
                        if (internal > 1000000) {
                            return "Camp '" + camp.get("name") + "' internal population too large (" + internal + "). Maximum allowed: 1,000,000.";
                        }
                        totalPopulation += internal;
                    }
                    
                    if (externalPop != null) {
                        long external = Long.parseLong(externalPop.toString());
                        if (external > 10000000) {
                            return "Camp '" + camp.get("name") + "' external population too large (" + external + "). Maximum allowed: 10,000,000.";
                        }
                        totalPopulation += external;
                    }
                }
                
                if (totalPopulation > 50000000) {
                    return "Total population too large (" + totalPopulation + "). Maximum allowed: 50,000,000.";
                }
            }
            
            // Extract items count
            List<Map<String, Object>> items = (List<Map<String, Object>>) payload.get("items");
            if (items != null && items.size() > 10) {
                return "Too many items (" + items.size() + "). Maximum allowed: 10 items.";
            }
            
            return null; // No validation errors
            
        } catch (Exception e) {
            log.warn("Error during size validation: {}", e.getMessage());
            return null; // Allow processing to continue
        }
    }
}
