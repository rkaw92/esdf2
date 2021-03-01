import { Commit } from "../../types/Commit";
import { CommitBuilder } from "../../types/CommitBuilder";
import { DomainEvent } from "../../types/DomainEvent";
import { ExclusiveLocation } from "../../types/ExclusiveLocation";

export const REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT = Symbol('please use { ...base } to construct layer supertype-compatible objects');
export const EVENTS = Symbol('event collector');
export const REDUCER = Symbol('reducer');
export const INITIAL = Symbol('initial');

export class EventListRoot implements CommitBuilder {
    private readonly context: ExclusiveLocation;
    constructor(context: ExclusiveLocation) {
        this.context = context;
    }

    buildCommit(): Commit {
        return {
            location: this.context,
            events: []
        };
    }
}

export class EventListNode implements CommitBuilder {
    
    private event: DomainEvent;
    private previous: EventList | EventListRoot;
    constructor(event: DomainEvent, previous: EventList | EventListRoot) {
        this.event = event;
        this.previous = previous;
    }

    buildCommit(): Commit {
        const previousCommit = this.previous.buildCommit();
        return {
            ...previousCommit,
            events: [ ...previousCommit.events, this.event ]
        };
    }
};

export type EventList = EventListNode | EventListRoot;

export interface ImmutableAggregateRootBase {
    // TODO: Decine whether to keep this development-centric hint.
    [REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT]: typeof REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT;
    [EVENTS]: EventList;
};

export interface ImmutableAggregateRoot<
    StateType,
    EmittedEventType extends DomainEvent
> extends ImmutableAggregateRootBase {
    [REDUCER]: Reducer<StateType,EmittedEventType>
};

export interface Reducer<StateType,EventType> {
    (state: StateType, event: EventType): StateType;
};

export interface ImmutableAggregateRootConstructor<StateType,EmittedEventType extends DomainEvent,AggregateType extends ImmutableAggregateRoot<StateType,EmittedEventType>> {
    (state: StateType, change: (event: EmittedEventType) => AggregateType, base: ImmutableAggregateRootBase): AggregateType;
};

function reducerNotCallableInFactory(): any {
    throw new Error('Cannot call change() while creating a new instance');
}

export function make<EmittedEventType extends DomainEvent,AggregateType extends ImmutableAggregateRoot<StateType,EmittedEventType>,StateType>(factory: ImmutableAggregateRootConstructor<StateType,EmittedEventType,AggregateType>, state: StateType, events: EventList): AggregateType {
    let reducer: Reducer<StateType,EmittedEventType> = reducerNotCallableInFactory;
    function change(event: EmittedEventType) {
        const newState = reducer(state, event);
        return make(factory, newState, new EventListNode(event, events));
    }
    const instance = factory(state, change, {
        [EVENTS]: events,
        [REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT]: REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT
    });
    reducer = instance[REDUCER];
    return instance;
};
