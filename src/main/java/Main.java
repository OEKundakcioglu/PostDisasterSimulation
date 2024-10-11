import data.Environment;
import data.config.RandomConfig;
import data.config.FilePath;

import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import simulation.Simulate;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;

public class Main {
    public static void main(String[] args) throws IOException, CloneNotSupportedException {

        Environment environment = generateEnvironmentFromFile();
        environment = generateRandomEnvironment(environment);

        Simulate simulate = new Simulate(environment);
    }

    public static Environment generateEnvironmentFromFile() throws FileNotFoundException {
        if (!FilePath.isReadFromInputFile) {
            return null;
        }
        LoaderOptions loaderOptions = new LoaderOptions();
        loaderOptions.setMaxAliasesForCollections(1000); // Increase limit to 1000 or any reasonable value
        Yaml yaml = new Yaml(loaderOptions);

        File file = new File(FilePath.INPUT_CONFIG);
        FileInputStream inputStream = new FileInputStream(file);

        System.out.println("Loading input file from: " + file.getAbsolutePath());
        return yaml.loadAs(inputStream, Environment.class);
    }

    // TODO: This method is used to generate a random problem main.java.data.
    public static Environment generateRandomEnvironment(Environment environment) throws FileNotFoundException {
        if (environment == null) {
            Yaml yaml = new Yaml();

            File file = new File(FilePath.RANDOM_CONFIG);
            FileInputStream inputStream = new FileInputStream(file);

            System.out.println("Loading config file from: " + file.getAbsolutePath());
            RandomConfig randomConfig = yaml.loadAs(inputStream, RandomConfig.class);
            return new Environment(randomConfig);
        }
        else {
            return environment;
        }
    }
}
