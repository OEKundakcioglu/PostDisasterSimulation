package simulation;
import java.util.HashMap;
import java.util.Map;

public class KPIData {
    public Map<String, CampKPI> camps = new HashMap<>();
    public GlobalKPIs globalKPIs = new GlobalKPIs();

    public static class CampKPI {
        public Map<String, Double> deprivationCost = new HashMap<>();
        public Map<String, Double> replenishmentCost = new HashMap<>();
        public Map<String, Double> holdingCost = new HashMap<>();
        public Map<String, Double> referralCost = new HashMap<>();
        public Map<String, Double> orderingCost = new HashMap<>();
        public int deprivedPopulation;
        public int referralPopulation;
        public Map<String, Double> averageDeprivationTime = new HashMap<>();
    }

    public static class GlobalKPIs {
        public double totalReplenishmentCostSummation;
        public double totalOrderingCostSummation;
        public double totalDeprivationCostSummation;
        public double totalReferralCostSummation;
        public double totalHoldingCostSummation;
        public int totalDeprivedPopulation;
        public int totalReferralPopulation;
        public double totalFundingSpent;
    }
}
