package data.event_info;

import data.Camp;
import data.distribution.ProbabilityData;
import enums.MigrationType;

public class Migration {
    private Camp fromCamp;
    private Camp toCamp;
    private MigrationType migrationType;
    private ProbabilityData arrivalData;
    private ProbabilityData quantityData;
    private double migrationRatio;

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

    public ProbabilityData getQuantityData() {
        return quantityData;
    }

    public void setQuantityData(ProbabilityData quantityData) {
        this.quantityData = quantityData;
    }
    public double getMigrationRatio() {
        return migrationRatio;
    }

    public void setMigrationRatio(double migrationRatio) {
        this.migrationRatio = migrationRatio;
    }
}
