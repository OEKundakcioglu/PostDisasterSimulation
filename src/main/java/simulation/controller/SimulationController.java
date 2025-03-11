package simulation.controller;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import data.Environment;
import data.config.FilePath;
import data.config.RandomConfig;
import simulation.Simulate;
import data.config.SimulationWebSocketHandler;
import jakarta.annotation.PreDestroy;


@RestController
@RequestMapping("/simulate")
public class SimulationController {
    private Simulate simulateInstance;
    private ExecutorService executorService = Executors.newSingleThreadExecutor();
    private volatile boolean isSimulationRunning = false;

    @Autowired
    private SimulationWebSocketHandler webSocketHandler;

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

            // Start WebSocket log broadcasting
            startLogBroadcaster();

            // Run simulation in separate thread
            isSimulationRunning = true;
            executorService.submit(() -> {
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

    private int lastSentIndex = 0;

    private void startLogBroadcaster() {
        Timer timer = new Timer(true);
        timer.scheduleAtFixedRate(new TimerTask() {
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