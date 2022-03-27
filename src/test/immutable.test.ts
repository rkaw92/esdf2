import { v4 } from 'uuid';
import { ImmutableAggregateRootConstructor, ImmutableAggregateRoot, Reducer, REDUCER, makeFactory } from '..';
import { EVENTS, APPLY } from 'esdf2-interfaces';
import * as assert from 'assert';

interface Defined {
    id: string;
    type: "Defined";
    payload: {
        EAN: string;
    };
}

interface Deposited {
    id: string;
    type: "Deposited";
    payload: {
        quantity: number;
    };
}

interface Dispatched {
    id: string;
    type: "Dispatched";
    payload: {
        quantity: number;
    };
}

type StockItemEvent = Defined | Deposited | Dispatched;

type StockItemState = Readonly<{
    defined: boolean;
    totalQuantity: number;
    EAN: string;
}>;

const reducer: Reducer<StockItemState,StockItemEvent> = function reducer(state, event) {
    // Record<StockItemEvent['type'],Reducer<StockItemState,StockItemEvent>>
    const eventHandlers = {
        Defined: (state: StockItemState, event: Defined) => Object.assign({}, state, {
            defined: true,
            EAN: event.payload.EAN
        }),
        Deposited: (state: StockItemState, event: Deposited) => Object.assign({}, state, {
            totalQuantity: state.totalQuantity + event.payload.quantity
        }),
        Dispatched: (state: StockItemState, event: Dispatched) => Object.assign({}, state, {
            totalQuantity: state.totalQuantity - event.payload.quantity
        })
    };
    const handler = eventHandlers[event.type];
    if (handler) {
        // TODO: Find a way to prevent "any" here.
        return handler(state, event as any);
    } else {
        throw new Error(`Handler not found for event "${event.type}"`);
    }
};

const initialState: StockItemState = {
    defined: false,
    totalQuantity: 0,
    EAN: ''
};

interface StockItem extends ImmutableAggregateRoot<StockItemState,StockItemEvent> {
    define(EAN: string): StockItem;
    deposit(quantity: number): StockItem;
    dispatch(quantity: number): StockItem;
    isDefined(): boolean;
    getEAN(): string;
    getTotalQuantity(): number;
};

const itemConstructor: ImmutableAggregateRootConstructor<StockItem> = function StockItem(state, change, base) {
    return {
        ...base,
        [REDUCER]: reducer,
        define(EAN: string) {
            if (state.defined) {
                return this;
            }
            return change({
                id: v4(),
                type: 'Defined',
                payload: { EAN }
            });
        },
        deposit(quantity: number) {
            if (!state.defined) {
                throw new Error('Need to define the EAN first');
            }
            return change({
                id: v4(),
                type: 'Deposited',
                payload: { quantity }
            });
        },
        dispatch(quantity: number) {
            if (!state.defined) {
                throw new Error('Need to define the EAN first');
            }
            if (state.totalQuantity < quantity) {
                throw new Error('Out of stock');
            }
            return change({
                id: v4(),
                type: 'Dispatched',
                payload: { quantity }
            });
        },
        isDefined() {
            return state.defined;
        },
        getEAN() {
            return state.EAN;
        },
        getTotalQuantity() {
            return state.totalQuantity;
        }
    };
};

const itemFactory = makeFactory<StockItem>(itemConstructor, initialState);

// Actual test starts here:
describe('ImmutableAggregateRoot', function() {
    it('should produce a changed version of itself', function() {
        const item = itemFactory();
        const definedItem = item.define('1231231231230');
        assert.strictEqual(definedItem.getEAN(), '1231231231230');
    });
    it('should not mutate object state', function() {
        const item = itemFactory();
        // NOTE: We're calling a method, but discarding the return value (the new instance).
        item.define('1231231231230');
        assert.strictEqual(item.isDefined(), false);
        const commitFromOriginal = item[EVENTS].buildCommit({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 }, { sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', index: 1 })
        assert.strictEqual(commitFromOriginal.events.length, 0);
    });
    it('should support chainable method calls', function() {
        const item = itemFactory()
            .define('1231231231230')
            .deposit(100);
        assert.strictEqual(item.getTotalQuantity(), 100);
    });
    it('should be able to produce a Commit', function() {
        let item = itemFactory().define('1231231231230').deposit(300);
        const commit = item[EVENTS].buildCommit({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 }, { sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', index: 1 });
        assert.strictEqual(commit.events.length, 2);
        assert.deepStrictEqual(commit.location, { aggregateName: 'StockItem', sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 });
        assert.strictEqual(commit.events[0].type, 'Defined');
        assert.strictEqual(commit.events[1].type, 'Deposited');
    });
    it('should support rehydrating using existing events', function() {
        const original = itemFactory().define('1231231231230').deposit(100);
        const commit = original[EVENTS].buildCommit({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 }, { sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', index: 1 });
        let clone = itemFactory();
        for (let event of commit.events) {
            clone = clone[APPLY](event as StockItemEvent);
        }
        assert.strictEqual(clone.getTotalQuantity(), 100);
        clone = clone.deposit(50);
        assert.strictEqual(clone.getTotalQuantity(), 150);
        // Make sure the original is unmodified:
        assert.strictEqual(original.getTotalQuantity(), 100);
        // Run an additional behavior to verify business logic that relies on "this":
        assert.throws(function() {
            clone = clone.dispatch(200);
        });
    });
});
