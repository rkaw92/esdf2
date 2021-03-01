import { EventBasket } from './implementations/mutable/EventBasket';
import { EasyAggregateRoot } from './implementations/mutable';

interface Defined {
    type: "Defined";
    payload: {
        EAN: string;
    };
}

interface Deposited {
    type: "Deposited";
    payload: {
        quantity: number;
    };
}

interface Dispatched {
    type: "Dispatched";
    payload: {
        quantity: number;
    };
}

type StockItemEvent = Defined | Deposited | Dispatched;

class StockItem extends EasyAggregateRoot<StockItemEvent> {
    private defined: boolean = false;
    private totalQuantity: number = 0;
    private EAN: string = '';

    define(EAN: string) {
        this.emit({ type: 'Defined', payload: { EAN } });
    }

    deposit(quantity: number) {
        if (!this.defined) {
            throw new Error('Need to define the EAN first');
        }
        this.emit({ type: 'Deposited', payload: { quantity } });
    }

    dispatch(quantity: number) {
        if (!this.defined) {
            throw new Error('Need to define the EAN first');
        }
        if (this.totalQuantity < quantity) {
            throw new Error('Out of stock');
        }
        this.emit({ type: 'Dispatched', payload: { quantity } });
    }

    apply(event: StockItemEvent) {
        switch (event.type) {
            case 'Defined': {
                this.defined = true;
                this.EAN = event.payload.EAN;
            }
            break;
            case 'Deposited': {
                this.totalQuantity += event.payload.quantity;
            }
            break;
            case 'Dispatched': {
                this.totalQuantity -= event.payload.quantity;
            }
        }
    }

    getEAN() {
        return this.EAN;
    }
}

// Example:

const basket = new EventBasket({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 });
const itemFactory = (myBasket: typeof basket) => new StockItem(myBasket);
const item = itemFactory(basket);

item.define('1231231231230');
item.deposit(100);
console.log('commit:', basket.buildCommit());

// This should crash:
item.dispatch(200);
