package simulation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"simulation", "data"})
public class SimulationApplication {
    public static void main(String[] args) {
        SpringApplication.run(SimulationApplication.class, args);
    }
}