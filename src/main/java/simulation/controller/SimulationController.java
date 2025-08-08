package simulation.controller;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.Map;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

import com.fasterxml.jackson.databind.ObjectMapper;

import data.Environment;
import data.config.FilePath;
import data.config.RandomConfig;
import data.config.SimulationWebSocketHandler;
import jakarta.annotation.PreDestroy;
import simulation.Simulate;
@RestController
@RequestMapping("/simulate")
public class SimulationController {
    private Simulate simulateInstance;
    private ExecutorService executorService = Executors.newSingleThreadExecutor();
    private volatile boolean isSimulationRunning = false;
    private Timer logBroadcastTimer;
    private Future<?> simulationFuture;

    @Autowired
    private SimulationWebSocketHandler webSocketHandler;
    
    @GetMapping("/downloadYaml")
    public ResponseEntity<Resource> downloadYamlFile() {
        try {
            File yamlFile = new File(FilePath.INPUT_CONFIG);
            
            // Print the file path and last modified time for debugging
            System.out.println("Serving YAML file from: " + yamlFile.getAbsolutePath());
            System.out.println("File last modified: " + new java.util.Date(yamlFile.lastModified()));
            
            InputStreamResource resource = new InputStreamResource(new FileInputStream(yamlFile));
            
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=simulation-config.yaml")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .contentLength(yamlFile.length())
                .contentType(MediaType.parseMediaType("application/yaml"))
                .body(resource);
        } catch (FileNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }

    @GetMapping("/logs")
    public String runSimulation() {
        try {
            if (isSimulationRunning) {
                return "Simulation is already running!";
            }
    
            // Generate environment
            Environment environment = generateEnvironmentFromFile();
            if (environment == null) {
                return "Simulation environment could not be loaded!";
            }
            
            // Set this flag to true to enable real-time logging
            environment.getSimulationConfig().setUseReactUI(true);
            

            // Start WebSocket log broadcasting
            startLogBroadcaster();

            // Run simulation in separate thread
            isSimulationRunning = true;
            simulationFuture = executorService.submit(() -> {
                try {
                    simulateInstance = new Simulate(environment);
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    isSimulationRunning = false;
                }
            });

            return "Simulation started. Logs are being broadcasted via WebSocket.";
        } catch (Exception e) {
            e.printStackTrace();
            return "Simulation failed: " + e.getMessage();
        }
    }

        
    
    @PostMapping("/stop")
    public ResponseEntity<?> stopSimulation() {
        System.out.println("\n🔴 STOP SIMULATION ENDPOINT CALLED 🔴");
        try {
            System.out.println("🔹 Checking if simulation can be stopped...");
            // Consider simulation running if either flag is true OR we have a simulation instance
            boolean canBeStopped = isSimulationRunning || simulateInstance != null;
            
            if (!canBeStopped) {
                System.out.println("❌ No simulation is active to stop");
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "No simulation is active to stop"
                ));
            }

            System.out.println("🔹 Setting flag to false to signal the simulation to stop");
            isSimulationRunning = false;
            
            System.out.println("🔹 Cancelling simulation future if running");
            if (simulationFuture != null && !simulationFuture.isDone()) {
                boolean cancelResult = simulationFuture.cancel(true);
                System.out.println("🔹 Future cancel result: " + cancelResult);
            }
            
            System.out.println("🔹 Cancelling log broadcaster timer");
            if (logBroadcastTimer != null) {
                logBroadcastTimer.cancel();
                logBroadcastTimer = null;
                System.out.println("✅ Log broadcaster timer cancelled");
            }
            
            System.out.println("🔹 Resetting log index");
            lastSentIndex = 0;
            
            System.out.println("🔹 Cleaning up simulate instance");
            simulateInstance = null;
            simulationFuture = null;
            
            System.out.println("🔹 Shutting down old executor service");
            executorService.shutdownNow();
            
            try {
                // Wait a moment for tasks to terminate
                if (!executorService.awaitTermination(2, TimeUnit.SECONDS)) {
                    System.out.println("⚠️ Executor did not terminate in the specified time.");
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
            
            System.out.println("🔹 Creating new executor service for future simulations");
            executorService = Executors.newSingleThreadExecutor();
            
            System.out.println("✅ Simulation stopped successfully - server remains available");
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Simulation stopped successfully. Server remains available for new simulations."
            ));
        } catch (Exception e) {
            System.out.println("❌ Error in stop simulation endpoint: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false, 
                "error", "Failed to stop simulation: " + e.getMessage()
            ));
        }
    }

    private int lastSentIndex = 0;

    private void startLogBroadcaster() {
        logBroadcastTimer = new Timer(true);
        logBroadcastTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                try {
                    if (simulateInstance != null) {
                        var allLogs = simulateInstance.getState().getKpiManager().getTimeStepLogs();
                        if (allLogs.size() > lastSentIndex) {
                            var newLog = allLogs.get(lastSentIndex);
                            ObjectMapper mapper = new ObjectMapper();
                            String logAsJson = mapper.writeValueAsString(newLog);
                            webSocketHandler.sendMessage(logAsJson);
                            lastSentIndex++;
                            System.out.println("Broadcasting new log: " + logAsJson);
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }, 0, 1000); // Broadcast logs every second
    }
    
    
    public static Environment generateEnvironmentFromFile() throws FileNotFoundException {
        if (!FilePath.isReadFromInputFile) {
            throw new FileNotFoundException("Input file is not specified. Check FilePath configuration.");
        }
        LoaderOptions loaderOptions = new LoaderOptions();
        loaderOptions.setMaxAliasesForCollections(1000);
        Yaml yaml = new Yaml(loaderOptions);

        File file = new File(FilePath.INPUT_CONFIG);
        FileInputStream inputStream = new FileInputStream(file);

        System.out.println("Loading input file from: " + file.getAbsolutePath());
        return yaml.loadAs(inputStream, Environment.class);
    }
    
    public static Environment generateRandomEnvironment(Environment environment) throws FileNotFoundException {
        if (environment == null) {
            Yaml yaml = new Yaml();

            File file = new File(FilePath.RANDOM_CONFIG);
            FileInputStream inputStream = new FileInputStream(file);

            System.out.println("Loading config file from: " + file.getAbsolutePath());
            RandomConfig randomConfig = yaml.loadAs(inputStream, RandomConfig.class);
            return new Environment(randomConfig);
        }
        return environment;
    }

    @PreDestroy
    public void cleanup() {
        if (logBroadcastTimer != null) {
            logBroadcastTimer.cancel();
        }
        executorService.shutdown();
    }

    @GetMapping("/config")
    public ResponseEntity<?> getSimulationConfig() {
        try {
            Environment environment = generateEnvironmentFromFile();
            return ResponseEntity.ok(environment);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Error loading simulation configuration: " + e.getMessage());
        }
    }
}