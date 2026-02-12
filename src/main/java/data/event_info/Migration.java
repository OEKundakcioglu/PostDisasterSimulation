package data.event_info;

import data.Camp;
import data.distribution.ProbabilityData;
import enums.MigrationType;

public class Migration {
    private Camp fromCamp;
    private Camp toCamp;
    private MigrationType migrationType;
    private ProbabilityData arrivalData;
    /** Fraction of demand rate that migrates (0–1). Replaces population-based migrationRatio. */
    private double demandRatio;

    public Migration() {
    }

    public Camp getFromCamp() {
        return fromCamp;
    }

    public void setFromCamp(Camp fromCamp) {
        this.fromCamp = fromCamp;
    }

    public Camp getToCamp() {
        return toCamp;
    }

    public void setToCamp(Camp toCamp) {
        this.toCamp = toCamp;
    }

    public MigrationType getMigrationType() {
        return migrationType;
    }

    public void setMigrationType(MigrationType migrationType) {
        this.migrationType = migrationType;
    }

    public ProbabilityData getArrivalData() {
        return arrivalData;
    }

    public void setArrivalData(ProbabilityData arrivalData) {
        this.arrivalData = arrivalData;
    }

    /** @deprecated Migration is now demand-based; quantityData is no longer used. Kept for YAML compatibility. */
    public ProbabilityData getQuantityData() {
        return null;
    }

    /** @deprecated Migration is now demand-based; quantityData is no longer used. Kept for YAML compatibility. */
    public void setQuantityData(ProbabilityData quantityData) {
        // no-op: demand-based migration ignores quantityData
    }

    public double getDemandRatio() {
        return demandRatio;
    }

    public void setDemandRatio(double demandRatio) {
        this.demandRatio = demandRatio;
    }

    /** @deprecated Use getDemandRatio() instead. Kept for YAML mapping compatibility. */
    public double getMigrationRatio() {
        return demandRatio;
    }

    /** @deprecated Use setDemandRatio() instead. Kept for YAML mapping compatibility. */
    public void setMigrationRatio(double migrationRatio) {
        this.demandRatio = migrationRatio;
    }
}
