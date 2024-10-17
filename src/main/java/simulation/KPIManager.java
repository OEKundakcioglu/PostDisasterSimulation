package simulation;

import data.Camp;
import data.Environment;
import data.Item;
import simulation.data.DeprivingPerson;
import simulation.data.InventoryItem;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.math.BigDecimal;
import java.util.HashMap;

public class KPIManager {

    int totalReferralPopulation;
    double totalReferralCostSum;
    double totalHoldingCostSum;
    double totalDeprivationCostSum;
    double totalOrderingCostSum;
    double totalFundingSpent;

    HashMap<Camp, HashMap<Item, Double>> campReplenishmentCost;
    HashMap<Item, Double> totalReplenishmentCost;
    HashMap<Item, Double> totalOrderingCost;

    HashMap<Camp, HashMap<Item, Double>> totalHoldingCost;
    HashMap<Camp, HashMap<Item, Double>> totalDeprivationCost;
    HashMap<Camp, HashMap<Item, Double>> totalReferralCost;

    HashMap<Camp, HashMap<Item, Integer>> totalDeprivedPopulation;
    HashMap<Camp, HashMap<Item, Double>> averageDeprivationTime;

    HashMap<Camp, HashMap<Item, Integer>> totalDemand;
    HashMap<Camp, HashMap<Item, Integer>> totalUnsatisfiedInternalDemand;
    HashMap<Camp, HashMap<Item, Integer>> totalUnsatisfiedExternalDemand;

    HashMap<Camp, HashMap<Item, Integer>> totalExpiredInventory;
    HashMap<Item, Integer> totalCentralExpiredInventory;

    boolean reportEvents;
    boolean reportKPIs;
    String fileName;



    public KPIManager(State state){
        totalReplenishmentCost = new HashMap<>();
        campReplenishmentCost = new HashMap<>();
        totalOrderingCost = new HashMap<>();
        totalHoldingCost = new HashMap<>();
        totalDeprivationCost = new HashMap<>();
        totalReferralCost = new HashMap<>();
        totalDeprivedPopulation = new HashMap<>();
        averageDeprivationTime = new HashMap<>();
        totalDemand = new HashMap<>();
        totalUnsatisfiedInternalDemand = new HashMap<>();
        totalUnsatisfiedExternalDemand = new HashMap<>();
        totalExpiredInventory = new HashMap<>();
        totalCentralExpiredInventory = new HashMap<>();
        totalFundingSpent = 0.0;

        for (Camp camp : state.getInitialInventory().keySet()){
            totalHoldingCost.put(camp, new HashMap<>());
            campReplenishmentCost.put(camp, new HashMap<>());
            totalDeprivationCost.put(camp, new HashMap<>());
            totalReferralCost.put(camp, new HashMap<>());
            totalDeprivedPopulation.put(camp, new HashMap<>());
            averageDeprivationTime.put(camp, new HashMap<>());
            totalDemand.put(camp, new HashMap<>());
            totalUnsatisfiedInternalDemand.put(camp, new HashMap<>());
            totalUnsatisfiedExternalDemand.put(camp, new HashMap<>());
            totalExpiredInventory.put(camp, new HashMap<>());

            for (Item item : state.getInitialInventory().get(camp).keySet()){
                totalReplenishmentCost.put(item, 0.0);
                campReplenishmentCost.get(camp).put(item, 0.0);
                totalOrderingCost.put(item, 0.0);
                totalHoldingCost.get(camp).put(item, 0.0);
                totalDeprivationCost.get(camp).put(item, 0.0);
                totalReferralCost.get(camp).put(item, 0.0);
                totalDeprivedPopulation.get(camp).put(item, 0);
                averageDeprivationTime.get(camp).put(item, 0.0);
                totalDemand.get(camp).put(item, 0);
                totalUnsatisfiedInternalDemand.get(camp).put(item, 0);
                totalUnsatisfiedExternalDemand.get(camp).put(item, 0);
                totalExpiredInventory.get(camp).put(item, 0);
                totalCentralExpiredInventory.put(item, 0);
            }
        }
    }

    public void calculateFinalCosts(Environment environment, State state) {
        double finalTime = environment.getSimulationConfig().getPlanningHorizon();
        for (Camp camp : state.getDeprivingPopulation().keySet()){
            for (Item item : state.getDeprivingPopulation().get(camp).keySet()){

                while (!state.getDeprivingPopulation().get(camp).get(item).isEmpty()) {
                    DeprivingPerson deprivingPerson = state.getDeprivingPopulation().get(camp).get(item).peek();
                    assert deprivingPerson != null;
                    double totalTime = finalTime - deprivingPerson.getArrivalTime();
                    double previousCost = state.getKpiManager().totalDeprivationCost.get(camp).get(item);
                    double currentCost = item.getDeprivationCoefficient() * (Math.exp(totalTime * item.getDeprivationRate()) - 1) * deprivingPerson.getQuantity();
                    state.getKpiManager().totalUnsatisfiedInternalDemand.get(camp).put(item, state.getKpiManager().totalUnsatisfiedInternalDemand.get(camp).get(item) + deprivingPerson.getQuantity());
                    state.getKpiManager().totalDeprivationCost.get(camp).put(item, previousCost + currentCost);
                    state.getDeprivingPopulation().get(camp).get(item).poll();
                }
                state.getKpiManager().totalReferralCost.get(camp).put(item, state.getReferralPopulation().get(camp).get(item) * item.getReferralCost());
            }
        }

        for (Camp camp : state.getInventory().keySet()){
            for (Item item : state.getInventory().get(camp).keySet()){
                while (!state.getInventory().get(camp).get(item).isEmpty()) {
                    InventoryItem inventoryItem = state.getInventory().get(camp).get(item).peek();
                    double previousCost = state.getKpiManager().totalHoldingCost.get(camp).get(item);
                    assert inventoryItem != null;
                    double currentCost = (finalTime - inventoryItem.getArrivalTime()) * inventoryItem.getQuantity() * item.getHoldingCost();
                    state.getKpiManager().totalHoldingCost.get(camp).put(item, previousCost + currentCost);
                    state.getInventory().get(camp).get(item).poll();
                }
            }
        }
        // Calculate average deprivation time
        for (Camp camp : this.averageDeprivationTime.keySet()){
            for (Item item : this.averageDeprivationTime.get(camp).keySet()){
                double totalDeprivedPopulation = state.getKpiManager().totalDeprivedPopulation.get(camp).get(item);
                double totalDeprivationTime = state.getKpiManager().averageDeprivationTime.get(camp).get(item);
                if (totalDeprivedPopulation != 0) {
                    state.getKpiManager().averageDeprivationTime.get(camp).put(item, totalDeprivationTime / totalDeprivedPopulation);
                }
            }
        }
    }
    public String generateJSONReport() {
    KPIData kpiData = new KPIData();

    // Populate camp data
    for (Camp camp : this.totalDeprivationCost.keySet()) {
        KPIData.CampKPI campKPI = new KPIData.CampKPI();

        for (Item item : this.totalDeprivationCost.get(camp).keySet()) {
            String itemName = item.getName();

            // Initialize maps if they are null
            if (campKPI.deprivationCost == null) campKPI.deprivationCost = new HashMap<>();
            if (campKPI.replenishmentCost == null) campKPI.replenishmentCost = new HashMap<>();
            if (campKPI.holdingCost == null) campKPI.holdingCost = new HashMap<>();
            if (campKPI.referralCost == null) campKPI.referralCost = new HashMap<>();
            if (campKPI.orderingCost == null) campKPI.orderingCost = new HashMap<>();
            if (campKPI.averageDeprivationTime == null) campKPI.averageDeprivationTime = new HashMap<>();

            // Get KPI values
            Double deprivationCost = this.totalDeprivationCost.get(camp).get(item);
            Double replenishmentCost = this.campReplenishmentCost.get(camp).get(item);
            Double holdingCost = this.totalHoldingCost.get(camp).get(item);
            Double referralCost = this.totalReferralCost.get(camp).get(item);
            Double orderingCost = this.totalOrderingCost.get(item);
            Integer deprivedPopulation = this.totalDeprivedPopulation.get(camp).get(item);
            Double averageDeprivationTime = this.averageDeprivationTime.get(camp).get(item);

            // Handle nulls (if any)
            if (deprivationCost == null) deprivationCost = 0.0;
            if (replenishmentCost == null) replenishmentCost = 0.0;
            if (holdingCost == null) holdingCost = 0.0;
            if (referralCost == null) referralCost = 0.0;
            if (orderingCost == null) orderingCost = 0.0;
            if (deprivedPopulation == null) deprivedPopulation = 0;
            if (averageDeprivationTime == null) averageDeprivationTime = 0.0;

            // Populate campKPI
            campKPI.deprivationCost.put(itemName, deprivationCost);
            campKPI.replenishmentCost.put(itemName, replenishmentCost);
            campKPI.holdingCost.put(itemName, holdingCost);
            campKPI.referralCost.put(itemName, referralCost);
            campKPI.orderingCost.put(itemName, orderingCost);
            campKPI.deprivedPopulation += deprivedPopulation;
            campKPI.averageDeprivationTime.put(itemName, averageDeprivationTime);

            // Calculate referral population
            int referralPopulation = (int) (referralCost / item.getReferralCost());
            campKPI.referralPopulation += referralPopulation;
        }
        // Add campKPI to kpiData
        kpiData.camps.put(camp.getName(), campKPI);
    }

    // Populate global KPIs
    kpiData.globalKPIs.totalReplenishmentCostSummation = this.totalFundingSpent;
    kpiData.globalKPIs.totalOrderingCostSummation = this.totalOrderingCostSum;
    kpiData.globalKPIs.totalDeprivationCostSummation = this.totalDeprivationCostSum;
    kpiData.globalKPIs.totalReferralCostSummation = this.totalReferralCostSum;
    kpiData.globalKPIs.totalHoldingCostSummation = this.totalHoldingCostSum;
    kpiData.globalKPIs.totalFundingSpent = this.totalFundingSpent;

    // Calculate total deprived population
    int totalDeprivedPopulation = this.totalDeprivedPopulation.values().stream()
        .flatMap(map -> map.values().stream())
        .mapToInt(Integer::intValue)
        .sum();
    kpiData.globalKPIs.totalDeprivedPopulation = totalDeprivedPopulation;

    // Use the totalReferralPopulation variable
    kpiData.globalKPIs.totalReferralPopulation = this.totalReferralPopulation;

    // Serialize to JSON
    Gson gson = new GsonBuilder().setPrettyPrinting().create();
    return gson.toJson(kpiData);
}



    public void reportKPIs(Environment environment) {
        if (reportKPIs){
        System.out.println("""
                Final KPIs
                -------------------""");
        reportCashSpent(environment);
        reportDeprivingPopulationStatistics(environment);
        reportHoldingCosts(environment);
        reportReferralPopulationStatistics(environment);
        reportExpiredInventory(environment);
        reportTotalReplenishment(environment);

        System.out.println(Math.round(totalOrderingCostSum));
        System.out.println(Math.round(totalDeprivationCostSum));
        System.out.println(Math.round(totalHoldingCostSum));
        System.out.println(Math.round(totalReferralCostSum));
        var totalObj = totalOrderingCostSum + totalDeprivationCostSum + totalHoldingCostSum + totalReferralCostSum;
        System.out.println(Math.round(totalObj));
        System.out.println(Math.round(totalFundingSpent));

        ExcelReportGenerator excelReportGenerator = new ExcelReportGenerator(this);
                // Generate and output JSON
        String jsonReport = generateJSONReport();
        System.out.println("JSON_OUTPUT_START");
        System.out.println(jsonReport);
        }
    }

    public void reportCashSpent(Environment environment) {
        // Report ordering costs and calculate total ordering cost
        for (Item item : environment.getItems()) {
            double replenishmentCost = this.totalReplenishmentCost.get(item);
            if (replenishmentCost != 0) {
                totalFundingSpent += replenishmentCost;
                System.out.println("Total replenishment cost for item " + item.getName() + " is " + replenishmentCost);
            }
        }
        // Print total ordering cost summation
        System.out.println("Total replenishment cost summation is " + totalFundingSpent);
        System.out.println();

        // Report ordering costs and calculate total ordering cost
        totalOrderingCostSum = 0.0;
        for (Item item : environment.getItems()) {
            double totalOrderingCost = this.totalOrderingCost.get(item);
            if (totalOrderingCost != 0) {
                totalFundingSpent += totalOrderingCost;
                totalOrderingCostSum += totalOrderingCost;
                System.out.println("Total ordering cost for item " + item.getName() + " is " + totalOrderingCost);
            }
        }
        // Print total ordering cost summation
        System.out.println("Total ordering cost summation is " + totalOrderingCostSum);
        System.out.println();

        System.out.println("Total funding spent! " + totalFundingSpent);
        System.out.println();
    }

    public void reportDeprivingPopulationStatistics(Environment environment) {
        // Report deprivation costs and calculate total deprivation cost
        totalDeprivationCostSum = 0.0;
        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                double totalDeprivationCost = this.totalDeprivationCost.get(camp).get(item);
                if (totalDeprivationCost != 0) {
                    totalDeprivationCostSum += totalDeprivationCost;
                    System.out.println("Total deprivation cost for camp " + camp.getName() + " and item " + item.getName() + " is " + totalDeprivationCost);
                }
            }
        }

        // Print total deprivation cost summation
        System.out.println("Total deprivation cost summation is " + totalDeprivationCostSum);
        System.out.println();

        // Report deprivation costs and calculate total deprivation cost
        double totalDeprivedPopulation = 0.0;
        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                double deprivedPopulation = this.totalDeprivedPopulation.get(camp).get(item);
                if (deprivedPopulation != 0) {
                    totalDeprivedPopulation += deprivedPopulation;
                    System.out.println("Total deprived population for camp " + camp.getName() + " and item " + item.getName() + " is " + deprivedPopulation);
                }
            }
        }

        // Print total deprivation cost summation
        System.out.println("Total deprived population is " + totalDeprivedPopulation);
        System.out.println();

        // Report average deprivation time
        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                double averageDeprivationTime = this.averageDeprivationTime.get(camp).get(item);
                if (averageDeprivationTime != 0) {
                    System.out.println("Average deprivation time for camp " + camp.getName() + " and item " + item.getName() + " is " + averageDeprivationTime);
                }
            }
        }
        System.out.println();
    }

    public void reportHoldingCosts(Environment environment) {
        // Report holding costs and calculate total holding cost
        totalHoldingCostSum = 0.0;
        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                double totalHoldingCost = this.totalHoldingCost.get(camp).get(item);
                if (totalHoldingCost != 0) {
                    totalHoldingCostSum += totalHoldingCost;
                    System.out.println("Total holding cost for camp " + camp.getName() + " and item " + item.getName() + " is " + totalHoldingCost);
                }
            }
        }
        // Print total holding cost summation
        System.out.println("Total holding cost summation is " + totalHoldingCostSum);
        System.out.println();
    }

    public void reportReferralPopulationStatistics(Environment environment) {
        // Report referral costs and calculate total referral cost
        totalReferralCostSum = 0.0;
        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                double totalReferralCost = this.totalReferralCost.get(camp).get(item);
                if (totalReferralCost != 0) {
                    totalReferralCostSum += totalReferralCost;
                    System.out.println("Total referral cost for camp " + camp.getName() + " and item " + item.getName() + " is " + totalReferralCost);
                }
            }
        }
        // Print total referral cost summation
        System.out.println("Total referral cost summation is " + totalReferralCostSum);
        System.out.println();

        // Report referral costs and calculate total referral cost
        totalReferralPopulation = 0;
        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                double totalReferralCost = this.totalReferralCost.get(camp).get(item);
                if (totalReferralCost != 0) {
                    totalReferralPopulation += (int) (totalReferralCost / item.getReferralCost());
                    System.out.println("Total referral population for camp " + camp.getName() + " and item " + item.getName() + " is " + (int) (totalReferralCost / item.getReferralCost()));
                }
            }
        }
        // Print total referral cost summation
        System.out.println("Total referral population is " + totalReferralPopulation);
        System.out.println();
    }

    public void reportExpiredInventory(Environment environment) {
        // Report total central expired inventory
        for (Item item : environment.getItems()) {
            double totalCentralExpiredInventory = this.totalCentralExpiredInventory.get(item);
            if (totalCentralExpiredInventory != 0) {
                System.out.println("Total central expired inventory for item " + item.getName() + " is " + totalCentralExpiredInventory);
            }
        }
        System.out.println();

        // Report total expired inventory for each camp and item
        for (Camp camp : environment.getCamps()) {
            for (Item item : environment.getItems()) {
                double totalExpiredInventory = this.totalExpiredInventory.get(camp).get(item);
                if (totalExpiredInventory != 0) {
                    System.out.println("Total expired inventory for camp " + camp.getName() + " and item " + item.getName() + " is " + totalExpiredInventory);
                }
            }
        }
        System.out.println();
    }

    public void reportTotalReplenishment(Environment environment) {
        // Report total replenishment cost for each item
        for (Item item : environment.getItems()) {
            double totalReplenishmentCost = this.totalReplenishmentCost.get(item);
            if (totalReplenishmentCost != 0) {
                System.out.println("Total replenishment cost for item " + item.getName() + " is " + totalReplenishmentCost);
            }
        }
        System.out.println();
    }

    public boolean isReportEvents() {
        return reportEvents;
    }

    public void setReportEvents(boolean reportEvents) {
        this.reportEvents = reportEvents;
    }

    public boolean isReportKPIs() {
        return reportKPIs;
    }

    public void setReportKPIs(boolean reportKPIs) {
        this.reportKPIs = reportKPIs;
    }

    public double getTotalOrderingCostSum() {
        return totalOrderingCostSum;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileName() {
        return fileName;
    }
}

