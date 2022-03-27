import { MutableAggregateRoot } from '..';
import { AGGREGATE_NAME, APPLY, DomainEvent, EVENTS } from 'esdf2-interfaces';
import * as assert from 'assert';

// Our test implements a simple stock tracker aggregate root
//  using Event Sourcing and checks basic state mutations.

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

    getTotalQuantity() {
        return this.totalQuantity;
    }
}

const itemFactory = () => new StockItem();

// Actual test starts here:
describe('MutableAggregateRoot', function() {
    it('should mutate state as side effect of events', function() {
        const item = itemFactory();
        item.define('1231231231230');
        assert.strictEqual(item.getEAN(), '1231231231230');
    });
    it('should support many subsequent behaviors on an instance', function() {
        const item = itemFactory();
        item.define('1231231231230');
        item.deposit(100);
        assert.strictEqual(item.getTotalQuantity(), 100);
    });
    it('should be able to produce a Commit', function() {
        const item = itemFactory();
        item.define('1231231231230');
        item.deposit(100);
        const commit = item[EVENTS].buildCommit({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 }, { sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', index: 1 });
        assert.strictEqual(commit.events.length, 2);
        assert.deepStrictEqual(commit.location, { aggregateName: 'StockItem', sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 });
    });
    it('should support rehydrating using existing events', function() {
        const original = itemFactory();
        original.define('1231231231230');
        original.deposit(100);
        const commit = original[EVENTS].buildCommit({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 }, { sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', index: 1 });
        let clone = itemFactory();
        // Note the idiomatic assignment on every iteration: infrastructure that
        //  interacts with an Aggregate Root instance doesn't really need to know
        //  what kind of implementation it's dealing with and whether it's mutable.
        for (let event of commit.events) {
            clone = clone[APPLY](event as StockItemEvent);
        }
        assert.strictEqual(clone.getTotalQuantity(), 100);
        clone.deposit(50);
        assert.strictEqual(clone.getTotalQuantity(), 150);
        // Make sure the original is unmodified:
        assert.strictEqual(original.getTotalQuantity(), 100);
        // Run an additional behavior to verify business logic that relies on "this":
        assert.throws(function() {
            clone.dispatch(200);
        });
    });
});
