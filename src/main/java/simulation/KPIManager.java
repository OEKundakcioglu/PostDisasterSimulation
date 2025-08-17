package simulation;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import data.Camp;
import data.Environment;
import data.Item;
import simulation.data.DeprivingPerson;
import simulation.data.InventoryItem;

public class KPIManager {
    private static final double DEFAULT_SAMPLING_INTERVAL = 5; // was 10 -> faster day progression
    // Aggregate counters (fields)
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

    HashMap<Camp, HashMap<Item, Integer>> totalDeprivedPopulation; // per camp-item count
    HashMap<Camp, HashMap<Item, Double>> averageDeprivationTime;   // cumulative deprivation time per camp-item

    HashMap<Camp, HashMap<Item, Integer>> totalDemand;
    HashMap<Camp, HashMap<Item, Integer>> totalUnsatisfiedInternalDemand;
    HashMap<Camp, HashMap<Item, Integer>> totalUnsatisfiedExternalDemand;

    HashMap<Camp, HashMap<Item, Integer>> totalExpiredInventory;
    HashMap<Item, Integer> totalCentralExpiredInventory;

    boolean reportEvents;
    boolean reportKPIs;
    boolean useReactUI;
    String fileName;

    private final List<TimeStepLog> timeStepLogs = new ArrayList<>();
    private final State state;

    private static final int MAX_TIME_STEP_LOGS = 5000;
    private int prunedCount = 0;

    public KPIManager(State state){
        this.state = state;
        this.useReactUI = false;
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

    public void calculateFinalCosts(Environment environment, State stateRef) {
        double finalTime = environment.getSimulationConfig().getPlanningHorizon();
        for (Camp camp : stateRef.getDeprivingPopulation().keySet()){
            for (Item item : stateRef.getDeprivingPopulation().get(camp).keySet()){
                while (!stateRef.getDeprivingPopulation().get(camp).get(item).isEmpty()) {
                    DeprivingPerson deprivingPerson = stateRef.getDeprivingPopulation().get(camp).get(item).peek();
                    assert deprivingPerson != null;
                    double totalTime = finalTime - deprivingPerson.getArrivalTime();
                    double previousCost = stateRef.getKpiManager().totalDeprivationCost.get(camp).get(item);
                    double currentCost = item.getDeprivationCoefficient() * (Math.exp(totalTime * item.getDeprivationRate()) - 1) * deprivingPerson.getQuantity();
                    stateRef.getKpiManager().totalUnsatisfiedInternalDemand.get(camp).put(item, stateRef.getKpiManager().totalUnsatisfiedInternalDemand.get(camp).get(item) + deprivingPerson.getQuantity());
                    stateRef.getKpiManager().totalDeprivationCost.get(camp).put(item, previousCost + currentCost);
                    stateRef.getDeprivingPopulation().get(camp).get(item).poll();
                }
                stateRef.getKpiManager().totalReferralCost.get(camp).put(item, stateRef.getReferralPopulation().get(camp).get(item) * item.getReferralCost());
            }
        }
        for (Camp camp : stateRef.getInventory().keySet()){
            for (Item item : stateRef.getInventory().get(camp).keySet()){
                while (!stateRef.getInventory().get(camp).get(item).isEmpty()) {
                    InventoryItem inventoryItem = stateRef.getInventory().get(camp).get(item).peek();
                    double previousCost = stateRef.getKpiManager().totalHoldingCost.get(camp).get(item);
                    assert inventoryItem != null;
                    double currentCost = (finalTime - inventoryItem.getArrivalTime()) * inventoryItem.getQuantity() * item.getHoldingCost();
                    stateRef.getKpiManager().totalHoldingCost.get(camp).put(item, previousCost + currentCost);
                    stateRef.getInventory().get(camp).get(item).poll();
                }
            }
        }
        for (Camp camp : this.averageDeprivationTime.keySet()){
            for (Item item : this.averageDeprivationTime.get(camp).keySet()){
                double deprivedCount = stateRef.getKpiManager().totalDeprivedPopulation.get(camp).get(item);
                double totalDepTime = stateRef.getKpiManager().averageDeprivationTime.get(camp).get(item);
                if (deprivedCount != 0) {
                    stateRef.getKpiManager().averageDeprivationTime.get(camp).put(item, totalDepTime / deprivedCount);
                }
            }
        }
    }

    public String generateJSONReport() {
        KPIData kpiData = new KPIData();
        for (Camp camp : this.totalDeprivationCost.keySet()) {
            KPIData.CampKPI campKPI = new KPIData.CampKPI();
            for (Item item : this.totalDeprivationCost.get(camp).keySet()) {
                String itemName = item.getName();
                if (campKPI.deprivationCost == null) campKPI.deprivationCost = new HashMap<>();
                if (campKPI.replenishmentCost == null) campKPI.replenishmentCost = new HashMap<>();
                if (campKPI.holdingCost == null) campKPI.holdingCost = new HashMap<>();
                if (campKPI.referralCost == null) campKPI.referralCost = new HashMap<>();
                if (campKPI.orderingCost == null) campKPI.orderingCost = new HashMap<>();
                if (campKPI.averageDeprivationTime == null) campKPI.averageDeprivationTime = new HashMap<>();

                Double deprivationCostVal = this.totalDeprivationCost.get(camp).get(item);
                Double replenishmentCostVal = this.campReplenishmentCost.get(camp).get(item);
                Double holdingCostVal = this.totalHoldingCost.get(camp).get(item);
                Double referralCostVal = this.totalReferralCost.get(camp).get(item);
                Double orderingCostVal = this.totalOrderingCost.get(item);
                Integer deprivedPopVal = this.totalDeprivedPopulation.get(camp).get(item);
                Double avgDeprivationTimeVal = this.averageDeprivationTime.get(camp).get(item);

                if (deprivationCostVal == null) deprivationCostVal = 0.0;
                if (replenishmentCostVal == null) replenishmentCostVal = 0.0;
                if (holdingCostVal == null) holdingCostVal = 0.0;
                if (referralCostVal == null) referralCostVal = 0.0;
                if (orderingCostVal == null) orderingCostVal = 0.0;
                if (deprivedPopVal == null) deprivedPopVal = 0;
                if (avgDeprivationTimeVal == null) avgDeprivationTimeVal = 0.0;

                campKPI.deprivationCost.put(itemName, deprivationCostVal);
                campKPI.replenishmentCost.put(itemName, replenishmentCostVal);
                campKPI.holdingCost.put(itemName, holdingCostVal);
                campKPI.referralCost.put(itemName, referralCostVal);
                campKPI.orderingCost.put(itemName, orderingCostVal);
                campKPI.deprivedPopulation += deprivedPopVal;
                campKPI.averageDeprivationTime.put(itemName, avgDeprivationTimeVal);
                int referralPopulationVal = (int) (referralCostVal / item.getReferralCost());
                campKPI.referralPopulation += referralPopulationVal;
            }
            kpiData.camps.put(camp.getName(), campKPI);
        }
        kpiData.globalKPIs.totalReplenishmentCostSummation = this.totalFundingSpent;
        kpiData.globalKPIs.totalOrderingCostSummation = this.totalOrderingCostSum;
        kpiData.globalKPIs.totalDeprivationCostSummation = this.totalDeprivationCostSum;
        kpiData.globalKPIs.totalReferralCostSummation = this.totalReferralCostSum;
        kpiData.globalKPIs.totalHoldingCostSummation = this.totalHoldingCostSum;
        kpiData.globalKPIs.totalFundingSpent = this.totalFundingSpent;
        int deprivedPopulationAggregate = this.totalDeprivedPopulation.values().stream()
            .flatMap(map -> map.values().stream())
            .mapToInt(Integer::intValue)
            .sum();
        kpiData.globalKPIs.totalDeprivedPopulation = deprivedPopulationAggregate;
        kpiData.globalKPIs.totalReferralPopulation = this.totalReferralPopulation;
        Gson gson = new GsonBuilder().setPrettyPrinting().create();
        return gson.toJson(kpiData);
    }

    public void reportKPIs(Environment environment) {
        reportKPIs = true;
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
            String jsonReport = generateJSONReport();
            System.out.println("JSON_OUTPUT_START");
            System.out.println(jsonReport);
        }
    }

    public void reportCashSpent(Environment environment) {
        for (Item itemObj : environment.getItems()) {
            double replCost = this.totalReplenishmentCost.get(itemObj);
            if (replCost != 0) {
                totalFundingSpent += replCost;
                System.out.println("Total replenishment cost for item " + itemObj.getName() + " is " + replCost);
            }
        }
        System.out.println("Total replenishment cost summation is " + totalFundingSpent);
        System.out.println();
        totalOrderingCostSum = 0.0;
        for (Item itemObj : environment.getItems()) {
            double ordCost = this.totalOrderingCost.get(itemObj);
            if (ordCost != 0) {
                totalFundingSpent += ordCost;
                totalOrderingCostSum += ordCost;
                System.out.println("Total ordering cost for item " + itemObj.getName() + " is " + ordCost);
            }
        }
        System.out.println("Total ordering cost summation is " + totalOrderingCostSum);
        System.out.println();
        System.out.println("Total funding spent! " + totalFundingSpent);
        System.out.println();
    }

    public void reportDeprivingPopulationStatistics(Environment environment) {
        totalDeprivationCostSum = 0.0;
        for (Camp campObj : environment.getCamps()) {
            for (Item itemObj : environment.getItems()) {
                double deprCost = this.totalDeprivationCost.get(campObj).get(itemObj);
                if (deprCost != 0) {
                    totalDeprivationCostSum += deprCost;
                    System.out.println("Total deprivation cost for camp " + campObj.getName() + " and item " + itemObj.getName() + " is " + deprCost);
                }
            }
        }
        System.out.println("Total deprivation cost summation is " + totalDeprivationCostSum);
        System.out.println();
        double deprivedPopSum = 0.0;
        for (Camp campObj : environment.getCamps()) {
            for (Item itemObj : environment.getItems()) {
                double deprPop = this.totalDeprivedPopulation.get(campObj).get(itemObj);
                if (deprPop != 0) {
                    deprivedPopSum += deprPop;
                    System.out.println("Total deprived population for camp " + campObj.getName() + " and item " + itemObj.getName() + " is " + deprPop);
                }
            }
        }
        System.out.println("Total deprived population is " + deprivedPopSum);
        System.out.println();
        for (Camp campObj : environment.getCamps()) {
            for (Item itemObj : environment.getItems()) {
                double avgDepTime = this.averageDeprivationTime.get(campObj).get(itemObj);
                if (avgDepTime != 0) {
                    System.out.println("Average deprivation time for camp " + campObj.getName() + " and item " + itemObj.getName() + " is " + avgDepTime);
                }
            }
        }
        System.out.println();
    }

    public void reportHoldingCosts(Environment environment) {
        totalHoldingCostSum = 0.0;
        for (Camp campObj : environment.getCamps()) {
            for (Item itemObj : environment.getItems()) {
                double holdCost = this.totalHoldingCost.get(campObj).get(itemObj);
                if (holdCost != 0) {
                    totalHoldingCostSum += holdCost;
                    System.out.println("Total holding cost for camp " + campObj.getName() + " and item " + itemObj.getName() + " is " + holdCost);
                }
            }
        }
        System.out.println("Total holding cost summation is " + totalHoldingCostSum);
        System.out.println();
    }

    public void reportReferralPopulationStatistics(Environment environment) {
        totalReferralCostSum = 0.0;
        for (Camp campObj : environment.getCamps()) {
            for (Item itemObj : environment.getItems()) {
                double refCost = this.totalReferralCost.get(campObj).get(itemObj);
                if (refCost != 0) {
                    totalReferralCostSum += refCost;
                    System.out.println("Total referral cost for camp " + campObj.getName() + " and item " + itemObj.getName() + " is " + refCost);
                }
            }
        }
        System.out.println("Total referral cost summation is " + totalReferralCostSum);
        System.out.println();
        totalReferralPopulation = 0;
        for (Camp campObj : environment.getCamps()) {
            for (Item itemObj : environment.getItems()) {
                double refCost = this.totalReferralCost.get(campObj).get(itemObj);
                if (refCost != 0) {
                    int refPop = (int)(refCost / itemObj.getReferralCost());
                    totalReferralPopulation += refPop;
                    System.out.println("Total referral population for camp " + campObj.getName() + " and item " + itemObj.getName() + " is " + refPop);
                }
            }
        }
        System.out.println("Total referral population is " + totalReferralPopulation);
        System.out.println();
    }

    public void reportExpiredInventory(Environment environment) {
        for (Item itemObj : environment.getItems()) {
            double centralExpired = this.totalCentralExpiredInventory.get(itemObj);
            if (centralExpired != 0) {
                System.out.println("Total central expired inventory for item " + itemObj.getName() + " is " + centralExpired);
            }
        }
        System.out.println();
        for (Camp campObj : environment.getCamps()) {
            for (Item itemObj : environment.getItems()) {
                double expired = this.totalExpiredInventory.get(campObj).get(itemObj);
                if (expired != 0) {
                    System.out.println("Total expired inventory for camp " + campObj.getName() + " and item " + itemObj.getName() + " is " + expired);
                }
            }
        }
        System.out.println();
    }

    public void reportTotalReplenishment(Environment environment) {
        for (Item itemObj : environment.getItems()) {
            double replCost = this.totalReplenishmentCost.get(itemObj);
            if (replCost != 0) {
                System.out.println("Total replenishment cost for item " + itemObj.getName() + " is " + replCost);
            }
        }
        System.out.println();
    }

    public boolean isReportEvents() { return reportEvents; }
    public void setReportEvents(boolean reportEvents) { this.reportEvents = reportEvents; }
    public boolean isReportKPIs() { return reportKPIs; }
    public void setReportKPIs(boolean reportKPIs) { this.reportKPIs = reportKPIs; }
    public double getTotalOrderingCostSum() { return totalOrderingCostSum; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getFileName() { return fileName; }
    public boolean isUseReactUI() { return useReactUI; }
    public void setUseReactUI(boolean useReactUI) { this.useReactUI = useReactUI; }

    public static class TimeStepLog {
        public double time;
        public double planningHorizon;
        public HashMap<String, Double> cumulativeHoldingCosts = new HashMap<>();
        public HashMap<String, Double> cumulativeReferralCosts = new HashMap<>();
        public HashMap<String, Double> cumulativeDeprivationCosts = new HashMap<>();
        public HashMap<String, Double> cumulativeReplenishmentCosts = new HashMap<>();
        public HashMap<String, HashMap<String, Integer>> itemQuantities = new HashMap<>();
        public double fundingReceived = 0.0;
    }

    public void logState(State stateRef, double currentTime, double samplingInterval) {
        if (!useReactUI) return;
        if (samplingInterval <= 0) samplingInterval = DEFAULT_SAMPLING_INTERVAL;
        if (timeStepLogs.isEmpty() || currentTime - timeStepLogs.get(timeStepLogs.size() - 1).time >= samplingInterval) {
            TimeStepLog log = new TimeStepLog();
            log.time = currentTime;
            log.planningHorizon = stateRef.getEnvironment().getSimulationConfig().getPlanningHorizon();
            log.fundingReceived = stateRef.getLastFundingReceived();
            for (var campEntry : stateRef.getInventory().entrySet()) {
                Camp camp = campEntry.getKey();
                if (camp == null) continue;
                String campName = camp.getName();
                log.cumulativeHoldingCosts.putIfAbsent(campName, 0.0);
                log.cumulativeReferralCosts.putIfAbsent(campName, 0.0);
                log.cumulativeDeprivationCosts.putIfAbsent(campName, 0.0);
                log.cumulativeReplenishmentCosts.putIfAbsent(campName, 0.0);
                log.itemQuantities.putIfAbsent(campName, new HashMap<>());
                for (var itemEntry : stateRef.getInventory().get(camp).entrySet()) {
                    Item item = itemEntry.getKey();
                    var inventoryQueue = itemEntry.getValue();
                    int totalQuantity = inventoryQueue.stream().mapToInt(InventoryItem::getQuantity).sum();
                    log.itemQuantities.get(campName).put(item.getName(), totalQuantity);
                    double holdingCostAcc = inventoryQueue.stream().mapToDouble(inv -> (currentTime - inv.getArrivalTime()) * inv.getQuantity() * item.getHoldingCost()).sum();
                    log.cumulativeHoldingCosts.put(campName, log.cumulativeHoldingCosts.get(campName) + holdingCostAcc);
                    double referralCostAcc = totalReferralCost.get(camp).get(item);
                    double deprivationCostAcc = totalDeprivationCost.get(camp).get(item);
                    log.cumulativeReferralCosts.put(campName, log.cumulativeReferralCosts.get(campName) + referralCostAcc);
                    log.cumulativeDeprivationCosts.put(campName, log.cumulativeDeprivationCosts.get(campName) + deprivationCostAcc);
                    double replCostAcc = campReplenishmentCost.get(camp).get(item);
                    log.cumulativeReplenishmentCosts.put(campName, log.cumulativeReplenishmentCosts.get(campName) + replCostAcc);
                }
            }
            timeStepLogs.add(log);
            if (timeStepLogs.size() > MAX_TIME_STEP_LOGS) {
                int removeCount = (int)(MAX_TIME_STEP_LOGS * 0.1);
                for (int i = 0; i < removeCount; i++) timeStepLogs.remove(0);
                prunedCount += removeCount;
            }
        }
    }

    public List<TimeStepLog> getTimeStepLogs() { return timeStepLogs; }
    public int getPrunedCount() { return prunedCount; }
    public void updateTimeStepLogs(double time) { logState(this.state, time, DEFAULT_SAMPLING_INTERVAL); }
}


