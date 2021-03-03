import { EventBasket } from './implementations/mutable/EventBasket';
import { MutableAggregateRoot } from './implementations/mutable';
import { DomainEvent } from './types/DomainEvent';

class Defined implements DomainEvent {
    public readonly type: "Defined" = 'Defined';
    public readonly payload: {
        EAN: string;
    };
    constructor(EAN: string) {
        this.payload = { EAN };
    }
}

class Deposited implements DomainEvent {
    public readonly type: "Deposited" = 'Deposited';
    public readonly payload: {
        quantity: number;
    };
    constructor(quantity: number) {
        this.payload = { quantity };
    }
}

class Dispatched implements DomainEvent {
    public readonly type: "Dispatched" = 'Dispatched';
    public readonly payload: {
        quantity: number;
    };
    constructor(quantity: number) {
        this.payload = { quantity };
    }
}

type StockItemEvent = Defined | Deposited | Dispatched;

class StockItem extends MutableAggregateRoot<StockItemEvent> {
    private defined: boolean = false;
    private totalQuantity: number = 0;
    private EAN: string = '';

    define(EAN: string) {
        this.emit(new Defined(EAN));
    }

    deposit(quantity: number) {
        if (!this.defined) {
            throw new Error('Need to define the EAN first');
        }
        this.emit(new Deposited(quantity));
    }

    dispatch(quantity: number) {
        if (!this.defined) {
            throw new Error('Need to define the EAN first');
        }
        if (this.totalQuantity < quantity) {
            throw new Error('Out of stock');
        }
        this.emit(new Dispatched(quantity));
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

const basket = new EventBasket();
const itemFactory = (myBasket: typeof basket) => new StockItem(myBasket);
const item = itemFactory(basket);

item.define('1231231231230');
item.deposit(100);
console.log('commit: %s', basket.buildCommit({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 }, { sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', index: 1 }));

// This should crash:
item.dispatch(200);
