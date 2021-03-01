import { v4 } from 'uuid';
import { EventListRoot, EVENTS, ImmutableAggregateRootConstructor, ImmutableAggregateRoot, make, Reducer, REDUCER, makeFactory } from './implementations/immutable';

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
        Defined: (state: StockItemState, event: Defined) => Object.assign(state, {
            defined: true,
            EAN: event.payload.EAN
        }),
        Deposited: (state: StockItemState, event: Deposited) => Object.assign(state, {
            totalQuantity: state.totalQuantity + event.payload.quantity
        }),
        Dispatched: (state: StockItemState, event: Dispatched) => Object.assign(state, {
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

interface Item extends ImmutableAggregateRoot<StockItemState,StockItemEvent> {
    define(EAN: string): Item;
    deposit(quantity: number): Item;
    dispatch(quantity: number): Item;
    getEAN(): string;
};

const itemFactory = makeFactory<Item>(function(state, change, base) {
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
        getEAN() {
            return state.EAN;
        }
    };
}, initialState);

// Example:
const item = itemFactory(new EventListRoot({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 }));
const itemWithStock = item.define('1231231231230').deposit(100);
console.log('commit:', itemWithStock[EVENTS].buildCommit());

// This should crash:
itemWithStock.dispatch(200);
