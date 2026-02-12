package simulation;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import data.Camp;
import data.Environment;
import data.Item;
import data.event_info.Demand;
import enums.DemandClass;
import enums.DemandQuantityType;
import simulation.data.DeprivingPerson;
import simulation.data.InventoryItem;

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

    /** Total demand quantity arrived (internal) per camp — for verification report. */
    HashMap<Camp, Integer> totalInternalDemandArrived;
    /** Total demand quantity arrived (external) per camp — for verification report. */
    HashMap<Camp, Integer> totalExternalDemandArrived;
    /** Total funding amount received by the system — for verification report. */
    double totalFundingReceived;
    /** Total replenishment quantity received at each camp per item — for verification report. */
    HashMap<Camp, HashMap<Item, Integer>> replenishmentQuantityByCampItem;

    boolean reportEvents;
    boolean reportKPIs;
    boolean useReactUI;
    String fileName;

    private final List<TimeStepLog> timeStepLogs = new ArrayList<>();
    private final Object logLock = new Object();
    private final State state;

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
        totalInternalDemandArrived = new HashMap<>();
        totalExternalDemandArrived = new HashMap<>();
        totalFundingReceived = 0.0;
        replenishmentQuantityByCampItem = new HashMap<>();

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

        ensureSeedLog();
    }

    /**
     * Computes current hourly demand rate (units/hour) for a camp-item from demand config and current population.
     * Rate can change over time when population changes (e.g. migration).
     */
    private double computeDemandRatePerHour(State stateRef, Camp camp, Item item) {
        double[] internalExternal = computeDemandRatePerHourInternalExternal(stateRef, camp, item);
        return internalExternal[0] + internalExternal[1];
    }

    /** Returns { internalRate, externalRate } in units/hour. */
    private double[] computeDemandRatePerHourInternalExternal(State stateRef, Camp camp, Item item) {
        double internalRate = 0.0;
        double externalRate = 0.0;
        if (camp.getDemands() == null) return new double[] { internalRate, externalRate };
        int internalPop = stateRef.getCurrentInternalPopulation(camp);
        int externalPop = stateRef.getCurrentExternalPopulation(camp);
        for (Demand d : camp.getDemands()) {
            if (d == null || d.getItem() == null || !d.getItem().equals(item) || d.getArrivalData() == null
                    || d.getArrivalData().getDistParameters() == null) continue;
            double meanMin = d.getArrivalData().getDistParameters().getMean();
            if (meanMin <= 0) continue;
            double eventsPerHour = 60.0 / meanMin;
            double expectedQty;
            if (d.getDemandQuantityType() == DemandQuantityType.BATCH) {
                if (d.getDemandClass() == DemandClass.INTERNAL) {
                    expectedQty = internalPop * d.getInternalRatio();
                } else {
                    expectedQty = externalPop * d.getExternalRatio();
                }
            } else {
                expectedQty = 1.0;
            }
            double contribution = eventsPerHour * expectedQty;
            if (d.getDemandClass() == DemandClass.INTERNAL) {
                internalRate += contribution;
            } else {
                externalRate += contribution;
            }
        }
        return new double[] { internalRate, externalRate };
    }

    private void ensureSeedLog() {
        if (!useReactUI) return;
        synchronized (logLock) {
            if (!timeStepLogs.isEmpty()) return;
            try {
                TimeStepLog seed = new TimeStepLog();
                seed.time = 0.0;
                seed.planningHorizon = state.getEnvironment() != null
                        ? state.getEnvironment().getSimulationConfig().getPlanningHorizon()
                        : 0.0;
                for (Camp camp : state.getInitialInventory().keySet()) {
                    String campName = camp.getName();
                    seed.cumulativeHoldingCosts.put(campName, 0.0);
                    seed.cumulativeReferralCosts.put(campName, 0.0);
                    seed.cumulativeDeprivationCosts.put(campName, 0.0);
                    seed.cumulativeReplenishmentCosts.put(campName, 0.0);
                    seed.itemQuantities.put(campName, new HashMap<>());
                    seed.demandRatePerHour.put(campName, new HashMap<>());
                    seed.demandRatePerHourInternal.put(campName, new HashMap<>());
                    seed.demandRatePerHourExternal.put(campName, new HashMap<>());
                    for (Item item : state.getInitialInventory().get(camp).keySet()) {
                        seed.itemQuantities.get(campName).put(item.getName(), state.getInventoryPosition().get(camp).get(item));
                        double[] ie = computeDemandRatePerHourInternalExternal(state, camp, item);
                        seed.demandRatePerHour.get(campName).put(item.getName(), ie[0] + ie[1]);
                        seed.demandRatePerHourInternal.get(campName).put(item.getName(), ie[0]);
                        seed.demandRatePerHourExternal.get(campName).put(item.getName(), ie[1]);
                    }
                }
                timeStepLogs.add(seed);
            } catch (Exception ignored) {}
        }
    }

    public void calculateFinalCosts(Environment environment, State stateRef) {
        double finalTime = environment.getSimulationConfig().getPlanningHorizon();
        for (Camp camp : stateRef.getDeprivingPopulation().keySet()){
            for (Item item : stateRef.getDeprivingPopulation().get(camp).keySet()){
                while (!stateRef.getDeprivingPopulation().get(camp).get(item).isEmpty()) {
                    DeprivingPerson deprivingPerson = stateRef.getDeprivingPopulation().get(camp).get(item).peek();
                    assert deprivingPerson != null;
                    // Deprivation time unit is days (simulation time for deprivation is in days)
                    double totalTimeDays = finalTime - deprivingPerson.getArrivalTime();
                    double previousCost = stateRef.getKpiManager().totalDeprivationCost.get(camp).get(item);
                    // Linear + Exponential form (tangent at zero): linearTerm + exponentialTerm
                    double rate = item.getDeprivationRate();   // per day
                    double coeff = item.getDeprivationCoefficient();
                    double linearTerm = coeff * rate * totalTimeDays;
                    double exponentialTerm = coeff * (Math.exp(totalTimeDays * rate) - 1);
                    double currentCost = (linearTerm + exponentialTerm) * deprivingPerson.getQuantity();
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
                    System.out.println("Average deprivation time (days) for camp " + campObj.getName() + " and item " + itemObj.getName() + " is " + avgDepTime);
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

    /** Records demand arrived at a camp (for verification report). */
    public void recordDemandArrived(Camp camp, boolean isInternal, int quantity) {
        if (camp == null || quantity <= 0) return;
        if (isInternal) {
            totalInternalDemandArrived.merge(camp, quantity, Integer::sum);
        } else {
            totalExternalDemandArrived.merge(camp, quantity, Integer::sum);
        }
    }

    /** Records funding received by the system (for verification report). */
    public void recordFundingReceived(double amount) {
        totalFundingReceived += amount;
    }

    /** Records replenishment quantity received at a camp for an item (for verification report). */
    public void recordReplenishmentAtCamp(Camp camp, Item item, int quantity) {
        if (camp == null || item == null || quantity <= 0) return;
        replenishmentQuantityByCampItem.computeIfAbsent(camp, c -> new HashMap<>()).merge(item, quantity, Integer::sum);
    }

    public Environment getEnvironment() {
        return state != null ? state.getEnvironment() : null;
    }

    public boolean isReportEvents() { return reportEvents; }
    public void setReportEvents(boolean reportEvents) { this.reportEvents = reportEvents; }
    public boolean isReportKPIs() { return reportKPIs; }
    public void setReportKPIs(boolean reportKPIs) { this.reportKPIs = reportKPIs; }
    public double getTotalOrderingCostSum() { return totalOrderingCostSum; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public String getFileName() { return fileName; }
    public boolean isUseReactUI() { return useReactUI; }
    public void setUseReactUI(boolean useReactUI) { 
        this.useReactUI = useReactUI; 
        ensureSeedLog();
    }

    public static class TimeStepLog {
        public double time;
        public double planningHorizon;
        public HashMap<String, Double> cumulativeHoldingCosts = new HashMap<>();
        public HashMap<String, Double> cumulativeReferralCosts = new HashMap<>();
        public HashMap<String, Double> cumulativeDeprivationCosts = new HashMap<>();
        public HashMap<String, Double> cumulativeReplenishmentCosts = new HashMap<>();
        public HashMap<String, HashMap<String, Integer>> itemQuantities = new HashMap<>();
        public double fundingReceived = 0.0;
        /** Hourly demand rate per camp and item (units/hour). May change over time (e.g. with population). */
        public HashMap<String, HashMap<String, Double>> demandRatePerHour = new HashMap<>();
        /** Internal demand rate per camp and item (units/hour). */
        public HashMap<String, HashMap<String, Double>> demandRatePerHourInternal = new HashMap<>();
        /** External demand rate per camp and item (units/hour). */
        public HashMap<String, HashMap<String, Double>> demandRatePerHourExternal = new HashMap<>();
    }

    public void logState(State stateRef, double currentTime, double samplingInterval) {
           if (!useReactUI) {
               // System.out.println("DEBUG: logState skipped. useReactUI=" + useReactUI);  
               return;
           }

           ensureSeedLog();
        
        double lastTime;
        synchronized (logLock) {
            // If this is the very first log, create a seed entry without looking at getLast()
            if (timeStepLogs.isEmpty()) {
                TimeStepLog seed = new TimeStepLog();
                seed.time = 0.0;
                seed.planningHorizon = stateRef.getEnvironment().getSimulationConfig().getPlanningHorizon();
                seed.fundingReceived = 0.0;
                timeStepLogs.add(seed);
            }

            lastTime = timeStepLogs.get(timeStepLogs.size() - 1).time;
        }

        // Prefer an epsilon check for doubles instead of == 0.0 or % exact comparisons
        double invCtrl = stateRef.getEnvironment().getSimulationConfig().getInventoryControlPeriod();
        boolean onControlBoundary = Math.abs(currentTime / invCtrl - Math.rint(currentTime / invCtrl)) < 1e-9;

        // Use provided samplingInterval; if <=0, log every call
        double effectiveInterval = samplingInterval > 0 ? samplingInterval : 0.0;

        boolean conditionToLog;
        if (effectiveInterval <= 0.0) {
            conditionToLog = true;
        } else {
            // Log at least every effectiveInterval OR on inventory-control boundary
            conditionToLog = (currentTime - lastTime) >= effectiveInterval || onControlBoundary || lastTime == currentTime;
        }

        if (conditionToLog) {
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
                log.demandRatePerHour.putIfAbsent(campName, new HashMap<>());
                log.demandRatePerHourInternal.putIfAbsent(campName, new HashMap<>());
                log.demandRatePerHourExternal.putIfAbsent(campName, new HashMap<>());
                for (var itemEntry : stateRef.getInventory().get(camp).entrySet()) {
                    Item item = itemEntry.getKey();
                    var inventoryQueue = itemEntry.getValue();
                    int totalQuantity = inventoryQueue.stream().mapToInt(InventoryItem::getQuantity).sum();
                    log.itemQuantities.get(campName).put(item.getName(), totalQuantity);
                    double[] ie = computeDemandRatePerHourInternalExternal(stateRef, camp, item);
                    log.demandRatePerHour.get(campName).put(item.getName(), ie[0] + ie[1]);
                    log.demandRatePerHourInternal.get(campName).put(item.getName(), ie[0]);
                    log.demandRatePerHourExternal.get(campName).put(item.getName(), ie[1]);

                    // Calculate holding cost for current inventory items (still in inventory)
                    double currentInventoryHoldingCost = inventoryQueue.stream()
                        .mapToDouble(inv -> (currentTime - inv.getArrivalTime()) * inv.getQuantity() * item.getHoldingCost())
                        .sum();
                    
                    // Add both accumulated costs (from consumed/expired items) and current inventory costs
                    double totalAccumulatedCost = totalHoldingCost.get(camp).get(item);
                    double combinedCost = totalAccumulatedCost + currentInventoryHoldingCost;
                    log.cumulativeHoldingCosts.put(campName, log.cumulativeHoldingCosts.get(campName) + combinedCost);
                    double referralCostAcc = totalReferralCost.get(camp).get(item);
                    log.cumulativeReferralCosts.put(campName, log.cumulativeReferralCosts.get(campName) + referralCostAcc);


                    // Deprivation cost: time unit is days
                    double deprivationCostAcc = 0.0;
                    for (DeprivingPerson deprivingPerson : stateRef.getDeprivingPopulation().get(camp).get(item)) {
                        double totalTimeDays = currentTime - deprivingPerson.getArrivalTime();
                        double rate = item.getDeprivationRate();   // per day
                        double coeff = item.getDeprivationCoefficient();
                        double linearTerm = coeff * rate * totalTimeDays;
                        double exponentialTerm = coeff * (Math.exp(totalTimeDays * rate) - 1);
                        deprivationCostAcc += (linearTerm + exponentialTerm) * deprivingPerson.getQuantity();
                    }
                    log.cumulativeDeprivationCosts.put(campName, totalDeprivationCost.get(camp).get(item)
                            + log.cumulativeDeprivationCosts.get(campName) + deprivationCostAcc);

                    if (currentTime % this.state.getEnvironment().getSimulationConfig().getInventoryControlPeriod() == 0.0)
                        log.cumulativeReplenishmentCosts.put(campName, log.cumulativeReplenishmentCosts.get(campName) + campReplenishmentCost.get(camp).get(item));
                }
            }
            synchronized (logLock) {
                timeStepLogs.add(log);
            }
        }
    }

    public List<TimeStepLog> getTimeStepLogs() {
        synchronized (logLock) {
            return new ArrayList<>(timeStepLogs);
        }
    }
    public int getPrunedCount() { return prunedCount; }
    public void updateTimeStepLogs(double time) { 
        logState(this.state, time, 0); // Let logState determine the interval
    }
}


