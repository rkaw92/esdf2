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

export interface Reducer<StateType,EventType> {
    (state: StateType, event: EventType): StateType;
};

export interface ImmutableAggregateRoot<
    StateType,
    EmittedEventType extends DomainEvent
> extends ImmutableAggregateRootBase {
    [REDUCER]: Reducer<StateType,EmittedEventType>
};

export type StateOf<T> = T extends ImmutableAggregateRoot<infer StateType,any> ? StateType : never;
export type EventOf<T> = T extends ImmutableAggregateRoot<any,infer EmittedEventType> ? EmittedEventType : never;

export interface ImmutableAggregateRootConstructor<AggregateType extends ImmutableAggregateRoot<any,any>> {
    (state: StateOf<AggregateType>, change: (event: EventOf<AggregateType>) => AggregateType, base: ImmutableAggregateRootBase): AggregateType;
};

export interface ImmutableAggregateRootFactory<AggregateType extends ImmutableAggregateRoot<any,any>> {
    (events: EventList): AggregateType;
};

function reducerNotCallableInConstructor(): any {
    throw new Error('Cannot call change() while creating a new instance');
}

export function make<AggregateType extends ImmutableAggregateRoot<any,any>>(constructor: ImmutableAggregateRootConstructor<AggregateType>, state: StateOf<AggregateType>, events: EventList): AggregateType {
    let reducer: Reducer<StateOf<AggregateType>,EventOf<AggregateType>> = reducerNotCallableInConstructor;
    function change(event: EventOf<AggregateType>) {
        const newState = reducer(state, event);
        return make(constructor, newState, new EventListNode(event, events));
    }
    const instance = constructor(state, change, {
        [EVENTS]: events,
        [REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT]: REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT
    });
    reducer = instance[REDUCER];
    return instance;
};

export function makeFactory<AggregateType extends ImmutableAggregateRoot<any,any>>(constructor: ImmutableAggregateRootConstructor<AggregateType>, initialState: StateOf<AggregateType>): ImmutableAggregateRootFactory<AggregateType> {
    return function(events: EventList) {
        return make(constructor, initialState, events);
    };
};
