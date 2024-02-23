package data;

import data.distribution.ProbabilityData;
import data.event_info.Demand;
import enums.CampExternalDemandSatisfactionType;
import enums.PopulationType;

import java.util.ArrayList;

public class Camp {
    private String name;
    private Demand[] demands;
    private CampExternalDemandSatisfactionType campExternalDemandSatisfactionType;
    private PopulationType populationType;
    private int initialInternalPopulation;
    private int initialExternalPopulation;
    private double externalDemandSatisfactionThreshold;
    private ProbabilityData leadTimeData;


    public Camp(String name) {
        this.name = name;
    }

    public Camp(){

    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Demand[] getDemands() {
        return demands;
    }

    public void setDemands(Demand[] demands) {
        this.demands = demands;
    }

    public CampExternalDemandSatisfactionType getCampExternalDemandSatisfactionType() {
        return campExternalDemandSatisfactionType;
    }

    public void setCampExternalDemandSatisfactionType(CampExternalDemandSatisfactionType campExternalDemandSatisfactionType) {
        this.campExternalDemandSatisfactionType = campExternalDemandSatisfactionType;
    }

    public PopulationType getPopulationType() {
        return populationType;
    }

    public void setPopulationType(PopulationType populationType) {
        this.populationType = populationType;
    }

    public int getInitialInternalPopulation() {
        return initialInternalPopulation;
    }

    public void setInitialInternalPopulation(int initialInternalPopulation) {
        this.initialInternalPopulation = initialInternalPopulation;
    }

    public int getInitialExternalPopulation() {
        return initialExternalPopulation;
    }

    public void setInitialExternalPopulation(int initialExternalPopulation) {
        this.initialExternalPopulation = initialExternalPopulation;
    }

    public double getExternalDemandSatisfactionThreshold() {
        return externalDemandSatisfactionThreshold;
    }

    public void setExternalDemandSatisfactionThreshold(double externalDemandSatisfactionThreshold) {
        this.externalDemandSatisfactionThreshold = externalDemandSatisfactionThreshold;
    }

    public ProbabilityData getLeadTimeData() {
        return leadTimeData;
    }

    public void setLeadTimeData(ProbabilityData leadTimeData) {
        this.leadTimeData = leadTimeData;
    }


}
