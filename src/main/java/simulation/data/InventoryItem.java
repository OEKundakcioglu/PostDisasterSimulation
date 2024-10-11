package simulation.data;

public class InventoryItem {
    private int quantity;
    private double expiration;
    private double arrivalTime;

    public InventoryItem(int quantity, double expiration, double arrivalTime) {
        this.quantity = quantity;
        this.expiration = expiration;
        this.arrivalTime = arrivalTime;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public double getExpiration() {
        return expiration;
    }

    public void setExpiration(double expiration) {
        this.expiration = expiration;
    }

    public double getArrivalTime() {
        return arrivalTime;
    }

    public void setArrivalTime(double arrivalTime) {
        this.arrivalTime = arrivalTime;
    }


}
