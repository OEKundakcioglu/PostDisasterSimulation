package simulation.data.requests;

import data.Camp;
import data.Item;

public class TransshipmentRequest {

    private Camp fromCamp;
    private Camp toCamp;
    private Item item;
    private int quantity;

    public TransshipmentRequest() {

    }

    public TransshipmentRequest(Camp fromCamp, Camp toCamp, Item item, int quantity) {
        this.fromCamp = fromCamp;
        this.toCamp = toCamp;
        this.item = item;
        this.quantity = quantity;
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

    public Item getItem() {
        return item;
    }

    public void setItem(Item item) {
        this.item = item;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }
}
