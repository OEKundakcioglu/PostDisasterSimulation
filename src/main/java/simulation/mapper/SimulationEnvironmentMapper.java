package simulation.mapper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import data.Agency;
import data.Camp;
import data.Environment;
import data.Item;
import data.config.SimulationConfig;
import data.distribution.DistEqualShare;
import data.distribution.DistExponential;
import data.distribution.DistFixed;
import data.distribution.DistNormal;
import data.distribution.DistTriangular;
import data.distribution.DistUniform;
import data.distribution.IDist;
import data.distribution.ProbabilityData;
import data.event_info.Demand;
import data.event_info.Funding;
import data.event_info.Migration;
import data.event_info.SupplyStatusSwitch;
import enums.CampExternalDemandSatisfactionType;
import enums.DemandClass;
import enums.DemandQuantityType;
import enums.DemandTimingType;
import enums.DistributionType;
import enums.FundingType;
import enums.InventoryControlType;
import enums.MigrationType;
import enums.PopulationType;
import simulation.State;
import simulation.decision.IPolicy;
import simulation.decision.OrderUpToPolicy;
import simulation.decision.TargetLevelPolicy;

/**
 * Maps a JSON-like Map (deserialized request body) into an Environment graph.
 */
@SuppressWarnings("unchecked")
public final class SimulationEnvironmentMapper {
    private SimulationEnvironmentMapper() {}

    public static Environment fromPayload(Map<String, Object> root) {
        // 1. Items
        List<Map<String, Object>> itemsJson = list(root.get("items"));
        Map<String, Item> itemByName = new LinkedHashMap<>();
        for (Map<String, Object> m : itemsJson) {
            Item item = new Item();
            item.setName(str(m.get("name")));
            item.setIsPerishable(bool(m.get("isPerishable")));
            item.setPrice(dbl(m.get("price")));
            item.setOrderingCost(dbl(m.get("orderingCost")));
            item.setHoldingCost(dbl(m.get("holdingCost")));
            item.setDeprivationRate(dbl(m.get("deprivationRate")));
            item.setDeprivationCoefficient(dbl(m.get("deprivationCoefficient")));
            item.setReferralCost(dbl(m.get("referralCost")));
            if (m.containsKey("leadTimeData")) item.setLeadTimeData(probabilityData(map(m.get("leadTimeData"))));
            if (m.containsKey("durationData")) item.setDurationData(probabilityData(map(m.get("durationData"))));
            itemByName.put(item.getName(), item);
        }
        Item[] items = itemByName.values().toArray(Item[]::new);

        // 2. Camps & Demands
        List<Map<String, Object>> campsJson = list(root.get("camps"));
        Map<String, Camp> campByName = new LinkedHashMap<>();
        for (Map<String, Object> cm : campsJson) {
            Camp camp = new Camp();
            camp.setName(str(cm.get("name")));
            if (cm.containsKey("campExternalDemandSatisfactionType")) camp.setCampExternalDemandSatisfactionType(enumVal(CampExternalDemandSatisfactionType.class, cm.get("campExternalDemandSatisfactionType")));
            if (cm.containsKey("populationType")) camp.setPopulationType(enumVal(PopulationType.class, cm.get("populationType")));
            if (cm.containsKey("initialInternalPopulation")) camp.setInitialInternalPopulation(intVal(cm.get("initialInternalPopulation")));
            if (cm.containsKey("initialExternalPopulation")) camp.setInitialExternalPopulation(intVal(cm.get("initialExternalPopulation")));
            // Demands
            List<Map<String, Object>> demandsJson = list(cm.get("demands"));
            List<Demand> demandObjs = new ArrayList<>();
            for (Map<String, Object> dm : demandsJson) {
                Demand d = new Demand();
                if (!dm.containsKey("demandClass")) {
                    continue;
                }
                String itemName = str(dm.get("item"));
                d.setItem(itemByName.get(itemName));
                if (dm.containsKey("demandClass")) d.setDemandClass(enumVal(DemandClass.class, dm.get("demandClass")));
                if (dm.containsKey("demandTimingType")) d.setDemandTimingType(enumVal(DemandTimingType.class, dm.get("demandTimingType")));
                if (dm.containsKey("demandQuantityType")) d.setDemandQuantityType(enumVal(DemandQuantityType.class, dm.get("demandQuantityType")));
                if (dm.containsKey("arrivalData")) d.setArrivalData(probabilityData(map(dm.get("arrivalData"))));
                if (dm.containsKey("quantityData")) d.setQuantityData(probabilityData(map(dm.get("quantityData"))));
                if (dm.containsKey("leadTimeData")) d.setLeadTimeData(probabilityData(map(dm.get("leadTimeData"))));
                demandObjs.add(d);
            }
            camp.setDemands(demandObjs.toArray(Demand[]::new));
            campByName.put(camp.getName(), camp);
        }
        Camp[] camps = campByName.values().toArray(Camp[]::new);

        // 3. Agencies & Funding
        List<Map<String, Object>> agenciesJson = list(root.get("agencies"));
        List<Agency> agencies = new ArrayList<>();
        for (Map<String, Object> am : agenciesJson) {
            Agency ag = new Agency();
            ag.setName(str(am.get("name")));
            List<Map<String, Object>> fundingsJson = list(am.get("fundingArray"));
            List<Funding> fundingObjs = new ArrayList<>();
            for (Map<String, Object> fm : fundingsJson) {
                Funding f = new Funding();
                if (fm.containsKey("item")) f.setItem(itemByName.get(str(fm.get("item"))));
                if (fm.containsKey("camp")) f.setCamp(campByName.get(str(fm.get("camp"))));
                if (fm.containsKey("fundingType")) f.setFundingType(enumVal(FundingType.class, fm.get("fundingType")));
                if (fm.containsKey("arrivalData")) f.setArrivalData(probabilityData(map(fm.get("arrivalData"))));
                if (fm.containsKey("amountData")) f.setAmountData(probabilityData(map(fm.get("amountData"))));
                fundingObjs.add(f);
            }
            ag.setFundingArray(fundingObjs.toArray(Funding[]::new));
            agencies.add(ag);
        }
        Agency[] agenciesArr = agencies.toArray(Agency[]::new);

        // 4. Migrations
        List<Map<String, Object>> migrationsJson = list(root.get("migrations"));
        List<Migration> migrations = new ArrayList<>();
        for (Map<String, Object> mm : migrationsJson) {
            Migration mg = new Migration();
            if (mm.containsKey("fromCamp")) mg.setFromCamp(campByName.get(str(mm.get("fromCamp"))));
            if (mm.containsKey("toCamp")) mg.setToCamp(campByName.get(str(mm.get("toCamp"))));
            if (mm.containsKey("migrationType")) mg.setMigrationType(enumVal(MigrationType.class, mm.get("migrationType")));
            if (mm.containsKey("arrivalData")) mg.setArrivalData(probabilityData(map(mm.get("arrivalData"))));
            if (mm.containsKey("quantityData")) mg.setQuantityData(probabilityData(map(mm.get("quantityData"))));
            if (mm.containsKey("migrationRatio")) mg.setMigrationRatio(dbl(mm.get("migrationRatio")));
            migrations.add(mg);
        }
        Migration[] migrationsArr = migrations.toArray(Migration[]::new);

        // Override distributions to EXPONENTIAL if migrations exist (to maintain theoretical consistency)
        if (migrationsArr.length > 0) {
            System.out.println("INFO: Migrations detected. Converting all demand distributions to EXPONENTIAL while preserving expectations.");
            for (Camp camp : camps) {
                for (Demand demand : camp.getDemands()) {
                    if (demand.getArrivalData() != null) {
                        ProbabilityData arrivalData = demand.getArrivalData();
                        double originalMean = arrivalData.distParameters.getMean();
                        // Create new exponential distribution with same mean
                        DistExponential expDist = new DistExponential();
                        expDist.mean = originalMean;
                        demand.setArrivalData(new ProbabilityData(DistributionType.EXPONENTIAL, expDist));
                    }
                }
            }
        }

        // 5. SupplyStatusSwitches
        List<Map<String, Object>> switchesJson = list(root.get("supplyStatusSwitches"));
        List<SupplyStatusSwitch> switches = new ArrayList<>();
        for (Map<String, Object> sm : switchesJson) {
            SupplyStatusSwitch sw = new SupplyStatusSwitch();
            if (sm.containsKey("item")) sw.setItem(itemByName.get(str(sm.get("item"))));
            if (sm.containsKey("disruptionArrivalData")) sw.setDisruptionArrivalData(probabilityData(map(sm.get("disruptionArrivalData"))));
            if (sm.containsKey("recoveryArrivalData")) sw.setRecoveryArrivalData(probabilityData(map(sm.get("recoveryArrivalData"))));
            switches.add(sw);
        }
        SupplyStatusSwitch[] switchesArr = switches.toArray(SupplyStatusSwitch[]::new);

        // 6. SimulationConfig
        SimulationConfig config = new SimulationConfig();
        Map<String,Object> sc = map(root.get("simulationConfig"));
        if (sc != null) {
            optInt(sc, "seedDemandTime", config::setSeedDemandTime);
            optInt(sc, "seedFundingTime", config::setSeedFundingTime);
            optInt(sc, "seedSupplyDisruptionTime", config::setSeedSupplyDisruptionTime);
            optInt(sc, "seedMigrationTime", config::setSeedMigrationTime);
            optInt(sc, "seedItemDuration", config::setSeedItemDuration);
            optInt(sc, "seedReplenishmentTime", config::setSeedReplenishmentTime);
            optInt(sc, "seedTransferTime", config::setSeedTransferTime);
            optInt(sc, "seedTransshipmentTime", config::setSeedTransshipmentTime);
            optInt(sc, "seedDemandQuantity", config::setSeedDemandQuantity);
            optInt(sc, "seedFundingAmount", config::setSeedFundingAmount);
            optInt(sc, "seedMigrationQuantity", config::setSeedMigrationQuantity);
            optInt(sc, "seedSupplyDisruptionDuration", config::setSeedSupplyDisruptionDuration);
            if (sc.containsKey("inventoryControlType")) config.setInventoryControlType(enumVal(InventoryControlType.class, sc.get("inventoryControlType")));
            optInt(sc, "inventoryControlPeriod", config::setInventoryControlPeriod);
            if (sc.containsKey("planningHorizon")) config.setPlanningHorizon(dbl(sc.get("planningHorizon")));
            if (sc.containsKey("reportEvents")) config.setReportEvents(bool(sc.get("reportEvents")));
            if (sc.containsKey("reportKPIs")) config.setReportKPIs(bool(sc.get("reportKPIs")));
            if (sc.containsKey("fileName")) config.setFileName(str(sc.get("fileName")));
            if (sc.containsKey("campBuffer")) config.setCampBuffer(dbl(sc.get("campBuffer")));
            if (sc.containsKey("centralBuffer")) config.setCentralBuffer(dbl(sc.get("centralBuffer")));
        }

        // 7. Inventory Policy
        IPolicy policy = null;
        Map<String,Object> ip = map(root.get("inventoryPolicy"));
        int fallbackInventoryControlPeriod = 0;
        if (ip != null) {
            String policyType = str(ip.get("policyType"));
            if (policyType == null) {
                policyType = "ORDER_UP_TO";
            }

            if (ip.containsKey("inventoryControlPeriod")) {
                fallbackInventoryControlPeriod = intVal(ip.get("inventoryControlPeriod"));
            }

            if ("TARGET_LEVEL".equals(policyType)) {
                TargetLevelPolicy targetPolicy = new TargetLevelPolicy();
                // YENİ HELPER ÇAĞRISI
                configureTargetLevelPolicy(targetPolicy, ip, campByName, itemByName);
                policy = targetPolicy;

            } else if ("ORDER_UP_TO".equals(policyType)) {
                OrderUpToPolicy orderPolicy = new OrderUpToPolicy();
                orderPolicy.setBufferRatios(convertNestedCampItemDouble(ip.get("bufferRatios"), campByName, itemByName));
                orderPolicy.setCentralBufferRatios(convertItemDouble(ip.get("centralBufferRatios"), itemByName));
                orderPolicy.setPeriodicCounts(convertNestedCampItemInt(ip.get("periodicCounts"), campByName, itemByName));
                orderPolicy.setCentralPeriodicCounts(convertItemInt(ip.get("centralPeriodicCounts"), itemByName));
                policy = orderPolicy;
            }
        } else {
            policy = new OrderUpToPolicy();
        }

            if (config.getInventoryControlType() == null) {
                config.setInventoryControlType(InventoryControlType.PERIODIC);
            }
            if (config.getInventoryControlPeriod() <= 0) {
                int icp = fallbackInventoryControlPeriod > 0 ? fallbackInventoryControlPeriod : 1;
                config.setInventoryControlPeriod(icp);
            }

        // 8. Initial State
        State initialState = new State();
        Map<String,Object> is = map(root.get("initialState"));
        if (is != null) {
            if (is.containsKey("availableFunds")) initialState.setAvailableFunds(dbl(is.get("availableFunds")));
            initialState.setInitialInventory(convertNestedCampItemInt(is.get("initialInventory"), campByName, itemByName));
            initialState.setInitialCentralWarehouseInventory(convertItemInt(is.get("initialCentralWarehouseInventory"), itemByName));
            initialState.setEarmarkedFunds(convertCampDouble(is.get("earmarkedFunds"), campByName));
            initialState.setInitialEarmarkedInKind(convertNestedCampItemInt(is.get("initialEarmarkedInKind"), campByName, itemByName));
            initialState.setIsItemAvailable(convertItemBoolean(is.get("isItemAvailable"), itemByName));
        }

        return Environment.of(initialState, items, camps, agenciesArr, migrationsArr, switchesArr, config, policy);
    }

    private static void configureTargetLevelPolicy(TargetLevelPolicy policy, Map<String, Object> ipNode, Map<String, Camp> camps, Map<String, Item> items) {

        // 1. Camp Parameters (Nested Map: Camp -> Item -> {s, S, threshold})
        Map<String, Object> campLevels = map(ipNode.get("targetLevels"));
        Map<String, Object> thresholdLevels = map(ipNode.get("thresholdLevels"));

        if (campLevels != null) {
            for (var cEntry : campLevels.entrySet()) {
                Camp camp = camps.get(cEntry.getKey());
                if (camp == null) continue;
                Map<String, Object> itemMap = map(cEntry.getValue());
                if (itemMap == null) continue;

                for (var iEntry : itemMap.entrySet()) {
                    Item item = items.get(iEntry.getKey());
                    if (item == null) continue;

                    Object val = iEntry.getValue();
                    int s = 0;
                    int S = 0;
                    int threshold = 0;

                    if (val instanceof Map) {
                        Map<String, Object> vMap = (Map<String, Object>) val;
                        s = intVal(vMap.getOrDefault("s", vMap.getOrDefault("s_reorderPoint", 0)));
                        S = intVal(vMap.getOrDefault("S", vMap.getOrDefault("S_targetLevel", 0)));
                        threshold = intVal(vMap.getOrDefault("threshold", vMap.getOrDefault("rationingThreshold", 0)));
                    }

                    if (threshold == 0 && thresholdLevels != null) {
                        Map<String, Object> cThresh = map(thresholdLevels.get(camp.getName()));
                        if (cThresh != null) {
                            threshold = intVal(cThresh.get(item.getName()));
                        }
                    }

                    policy.setCampPolicy(camp, item, s, S, threshold);
                }
            }
        }

        Map<String, Object> centralLevels = map(ipNode.get("centralTargetLevels"));
        if (centralLevels != null) {
            for (var entry : centralLevels.entrySet()) {
                Item item = items.get(entry.getKey());
                if (item == null) continue;

                Object val = entry.getValue();
                int s = 0;
                int S = 0;

                if (val instanceof Map) {
                    Map<String, Object> vMap = (Map<String, Object>) val;
                    s = intVal(vMap.getOrDefault("s", vMap.getOrDefault("s_reorderPoint", 0)));
                    S = intVal(vMap.getOrDefault("S", vMap.getOrDefault("S_targetLevel", 0)));
                }

                policy.setCentralPolicy(item, s, S);
            }
        }
    }

    private static ProbabilityData probabilityData(Map<String,Object> pd) {
        if (pd == null) return null;
        DistributionType dt = enumVal(DistributionType.class, pd.get("distributionType"));
        Map<String,Object> params = map(pd.get("distParameters"));
        IDist impl;
        switch (dt) {
            case EXPONENTIAL -> { DistExponential d = new DistExponential(); d.mean = dbl(params.get("mean")); impl = d; }
            case NORMAL -> { double mean = dbl(params.get("mean")); double std = params.containsKey("std")? dbl(params.get("std")) : dbl(params.getOrDefault("stdDev",0)); impl = new DistNormal(mean, std); }
            case UNIFORM -> { DistUniform d = new DistUniform(); d.min = dbl(params.get("min")); d.max = dbl(params.get("max")); impl = d; }
            case TRIANGULAR -> { DistTriangular d = new DistTriangular(); d.min = dbl(params.get("min")); d.max = dbl(params.get("max")); d.mode = dbl(params.get("mode")); impl = d; }
            case FIXED -> { DistFixed d = new DistFixed(); d.mean = dbl(params.get("mean")); impl = d; }
            case EQUAL_SHARE -> { DistEqualShare d = new DistEqualShare(); d.mean = dbl(params.get("mean")); impl = d; }
            default -> throw new IllegalArgumentException("Unsupported distribution: " + dt);
        }
        return new ProbabilityData(dt, impl);
    }

    private static <E extends Enum<E>> E enumVal(Class<E> cls, Object o) { return o==null? null: Enum.valueOf(cls, str(o)); }
    private static String str(Object o) { return o==null? null : String.valueOf(o); }
    private static double dbl(Object o) { if(o==null) return 0; if(o instanceof Number n) return n.doubleValue(); return Double.parseDouble(o.toString()); }
    private static int intVal(Object o){
        if(o==null) return 0;
        if(o instanceof Number n) return n.intValue();
        String s = o.toString();
        if(s.startsWith("{")) return 0;
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            try {
                return (int) Double.parseDouble(s);
            } catch (NumberFormatException e2) {
                return 0;
            }
        }
    }
    private static boolean bool(Object o){ if(o==null) return false; if(o instanceof Boolean b) return b; return Boolean.parseBoolean(o.toString()); }
    private static Map<String,Object> map(Object o){ return o instanceof Map ? (Map<String,Object>) o : null; }
    private static List<Map<String,Object>> list(Object o){ if(o instanceof List<?> l){ List<Map<String,Object>> out=new ArrayList<>(); for(Object v:l) if(v instanceof Map<?,?> m) out.add((Map<String,Object>)m); return out;} return Collections.emptyList(); }
    private static void optInt(Map<String,Object> m, String key, java.util.function.IntConsumer c){ if(m.containsKey(key)) c.accept(intVal(m.get(key))); }

    private static HashMap<Camp, HashMap<Item, Integer>> convertNestedCampItemInt(Object o, Map<String,Camp> camps, Map<String,Item> items){
        HashMap<Camp, HashMap<Item, Integer>> result = new HashMap<>();
        if(!(o instanceof Map<?,?> outer)) return result;
        for (var e : outer.entrySet()) {
            Camp camp = camps.get(str(e.getKey())); if(camp==null) continue;
            HashMap<Item,Integer> innerMap = new HashMap<>();
            if (e.getValue() instanceof Map<?,?> inner) {
                for (var ie : inner.entrySet()) {
                    Item item = items.get(str(ie.getKey())); if(item==null) continue;
                    innerMap.put(item, intVal(ie.getValue()));
                }
            }
            result.put(camp, innerMap);
        }
        return result;
    }

    private static HashMap<Camp, HashMap<Item, Double>> convertNestedCampItemDouble(Object o, Map<String,Camp> camps, Map<String,Item> items){
        HashMap<Camp, HashMap<Item, Double>> result = new HashMap<>();
        if(!(o instanceof Map<?,?> outer)) return result;
        for (var e : outer.entrySet()) {
            Camp camp = camps.get(str(e.getKey())); if(camp==null) continue;
            HashMap<Item,Double> innerMap = new HashMap<>();
            if (e.getValue() instanceof Map<?,?> inner) {
                for (var ie : inner.entrySet()) {
                    Item item = items.get(str(ie.getKey())); if(item==null) continue;
                    innerMap.put(item, dbl(ie.getValue()));
                }
            }
            result.put(camp, innerMap);
        }
        return result;
    }
    private static HashMap<Item, Double> convertItemDouble(Object o, Map<String,Item> items){
        HashMap<Item,Double> result = new HashMap<>();
        if(!(o instanceof Map<?,?> m)) return result;
        for (var e : m.entrySet()) { Item item = items.get(str(e.getKey())); if(item!=null) result.put(item, dbl(e.getValue())); }
        return result;
    }
    private static HashMap<Item, Integer> convertItemInt(Object o, Map<String,Item> items){
        HashMap<Item,Integer> result = new HashMap<>();
        if(!(o instanceof Map<?,?> m)) return result;
        for (var e : m.entrySet()) { Item item = items.get(str(e.getKey())); if(item!=null) result.put(item, intVal(e.getValue())); }
        return result;
    }
    private static HashMap<Camp, Double> convertCampDouble(Object o, Map<String,Camp> camps){
        HashMap<Camp,Double> result = new HashMap<>();
        if(!(o instanceof Map<?,?> m)) return result;
        for (var e : m.entrySet()) { Camp camp = camps.get(str(e.getKey())); if(camp!=null) result.put(camp, dbl(e.getValue())); }
        return result;
    }
    private static HashMap<Item, Boolean> convertItemBoolean(Object o, Map<String,Item> items){
        HashMap<Item,Boolean> result = new HashMap<>();
        if(!(o instanceof Map<?,?> m)) return result;
        for (var e : m.entrySet()) { Item item = items.get(str(e.getKey())); if(item!=null) result.put(item, bool(e.getValue())); }
        return result;
    }
}