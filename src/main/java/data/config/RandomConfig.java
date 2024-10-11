package data.config;

public class RandomConfig {
    private int seedNumberEnvironment;
    private int numberOfProblemInstances;
    private int numberOfCamps;
    private String prefix;


    public int getSeedNumberEnvironment() {
        return seedNumberEnvironment;
    }
    public void setSeedNumberEnvironment(int seedNumberEnvironment) {
        this.seedNumberEnvironment = seedNumberEnvironment;
    }
    public int getNumberOfProblemInstances() {
        return numberOfProblemInstances;
    }
    public void setNumberOfProblemInstances(int numberOfProblemInstances) {
        this.numberOfProblemInstances = numberOfProblemInstances;
    }
    public int getNumberOfCamps() {
        return numberOfCamps;
    }
    public void setNumberOfCamps(int numberOfCamps) {
        this.numberOfCamps = numberOfCamps;
    }
    public String getPrefix() {
        return prefix;
    }
    public void setPrefix(String prefix) {
        this.prefix = prefix;
    }

}
