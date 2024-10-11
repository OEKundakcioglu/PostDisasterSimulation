package simulation.data;

public class DeprivingPerson {
    private int quantity;
    private double arrivalTime;

    public DeprivingPerson(int quantity, double arrivalTime){
        this.quantity = quantity;
        this.arrivalTime = arrivalTime;
    }


    public double getArrivalTime() {
        return arrivalTime;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public void setArrivalTime(double arrivalTime) {
        this.arrivalTime = arrivalTime;
    }
}
