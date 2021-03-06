import { CommitBuilder, CommitLocation, Commit, DomainEvent, EventLocation, QualifiedDomainEvent, CommitBuilderProvider, EVENTS } from "esdf2-interfaces";
import { DefaultCommit } from "../../types/Commit";
import { toQualified } from "../../types/DomainEvent";
import { nextEvent } from "../../types/Location";

export const REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT = Symbol('please use { ...base } to construct layer supertype-compatible objects');
export const REDUCER = Symbol('reducer');
export const APPLY = Symbol('get new state without building up event list');

export class EventListRoot implements CommitBuilder {
    buildCommit(commitLocation: CommitLocation): Commit {
        return new DefaultCommit(
            commitLocation,
            []
        );
    }
}

export class EventListNode implements CommitBuilder {
    private event: DomainEvent;
    private previous: EventList | EventListRoot;
    constructor(event: DomainEvent, previous: EventList | EventListRoot) {
        this.event = event;
        this.previous = previous;
    }

    buildCommit(commitLocation: CommitLocation, start: EventLocation): Commit {
        const previousCommit = this.previous.buildCommit(commitLocation, start);
        const lastEvent: QualifiedDomainEvent | undefined = previousCommit.events[previousCommit.events.length - 1];
        const myLocation = lastEvent ? nextEvent(lastEvent.location) : start;
        const myEventAsQualified = toQualified(this.event, myLocation);
        return new DefaultCommit(
            previousCommit.location,
            [ ...previousCommit.events, myEventAsQualified ]
        );
    }
};

export type EventList = EventListNode | EventListRoot;

export interface ImmutableAggregateRootBase<EventType extends DomainEvent> extends CommitBuilderProvider {
    // TODO: Decine whether to keep this development-centric hint.
    [REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT]: typeof REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT;
    [EVENTS]: EventList;
    // NOTE: This (as well as the "as any as T") is required because TypeScript has no real polymorphic "this".
    [APPLY]: <T>(this: T, event: EventType) => T;
};

export interface Reducer<StateType,EventType> {
    (state: StateType, event: EventType): StateType;
};

export interface ImmutableAggregateRoot<
    StateType,
    EmittedEventType extends DomainEvent
> extends ImmutableAggregateRootBase<EmittedEventType> {
    [REDUCER]: Reducer<StateType,EmittedEventType>;
};

export type StateOf<T> = T extends ImmutableAggregateRoot<infer StateType,any> ? StateType : never;
export type EventOf<T> = T extends ImmutableAggregateRoot<any,infer EmittedEventType> ? EmittedEventType : never;

export interface ImmutableAggregateRootConstructor<AggregateType extends ImmutableAggregateRoot<any,any>> {
    (state: StateOf<AggregateType>, change: (event: EventOf<AggregateType>) => AggregateType, base: ImmutableAggregateRootBase<EventOf<AggregateType>>): AggregateType;
};

export interface ImmutableAggregateRootFactory<AggregateType extends ImmutableAggregateRoot<any,any>> {
    (): AggregateType;
};

function reducerNotCallableInConstructor(): any {
    throw new Error('Cannot call change() while creating a new instance');
}

export function make<AggregateType extends ImmutableAggregateRoot<any,any>>(constructor: ImmutableAggregateRootConstructor<AggregateType>, state: StateOf<AggregateType>, events: EventList): AggregateType {
    let reducer: Reducer<StateOf<AggregateType>,EventOf<AggregateType>> = reducerNotCallableInConstructor;
    function change(event: EventOf<AggregateType>): AggregateType {
        const newState = reducer(state, event);
        return make(constructor, newState, new EventListNode(event, events));
    }
    function apply<T>(this: T, event: EventOf<AggregateType>): T {
        const newState = reducer(state, event);
        return make(constructor, newState, new EventListRoot()) as any as T;
    }
    const instance = constructor(state, change, {
        [APPLY]: apply,
        [EVENTS]: events,
        [REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT]: REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT
    });
    reducer = instance[REDUCER];
    return instance;
};

export function makeFactory<AggregateType extends ImmutableAggregateRoot<any,any>>(constructor: ImmutableAggregateRootConstructor<AggregateType>, initialState: StateOf<AggregateType>): ImmutableAggregateRootFactory<AggregateType> {
    return function() {
        return make(constructor, initialState, new EventListRoot());
    };
};
