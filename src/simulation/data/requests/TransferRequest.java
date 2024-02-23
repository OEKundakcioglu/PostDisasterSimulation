package simulation.data.requests;

import data.Camp;
import data.Item;

public class TransferRequest {

    private Camp toCamp;
    private Item item;
    private int quantity;

    public TransferRequest() {
    }

    public TransferRequest(Camp toCamp, Item item, int quantity) {
        this.toCamp = toCamp;
        this.item = item;
        this.quantity = quantity;
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
