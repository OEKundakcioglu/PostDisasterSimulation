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
            
            Environment env = SimulationEnvironmentMapper.fromPayload(payload);
            if (env.getSimulationConfig() != null) {
                env.getSimulationConfig().setUseReactUI(true); // enable realtime UI usage
            }
            SimulationSession session = simulationService.createSession(env, payload); // store raw
            return ResponseEntity.ok(Map.of(
                "id", session.getId(),
                "status", session.getStatus()
            ));
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
        } catch (Exception e) {
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
}
