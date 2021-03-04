import { basename } from 'path';
import { v4 } from 'uuid';
import { EventListRoot, ImmutableAggregateRootConstructor, ImmutableAggregateRoot, make, Reducer, REDUCER, makeFactory, APPLY } from './implementations/immutable';
import { EVENTS } from './types/CommitBuilder';

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
    getEAN(): string;
};

const itemConstructor: ImmutableAggregateRootConstructor<StockItem> = function(state, change, base) {
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
};

const itemFactory = makeFactory<StockItem>(itemConstructor, initialState);

// Example:
const item = itemFactory();
const itemWithStock = item.define('1231231231230').deposit(100);
const commit = itemWithStock[EVENTS].buildCommit({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 }, { sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', index: 1 });
console.log('commit: %s', commit);

let clone = itemFactory();
for (let event of commit.events) {
    clone = clone[APPLY](event as StockItemEvent);
}
console.log('clone\'s EAN:', clone.getEAN());
const commit2 = clone[EVENTS].buildCommit({ sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', slot: 1 }, { sequence: '9fb1d62a-91ff-4906-926f-ad4e9e139dc7', index: 1 });
console.log('commit2: %s', commit2);

// This should crash:
itemWithStock.dispatch(200);
