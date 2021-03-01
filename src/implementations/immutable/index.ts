import { Commit } from "../../types/Commit";
import { CommitBuilder } from "../../types/CommitBuilder";
import { DomainEvent } from "../../types/DomainEvent";
import { ExclusiveLocation } from "../../types/ExclusiveLocation";

export const REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT = Symbol('please use { ...base } to construct layer supertype-compatible objects');
export const EVENTS = Symbol('event collector');

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

export interface ImmutableAggregateRoot<EmittedEventType extends DomainEvent> {
    // TODO: Decine whether to keep this development-centric hint.
    [REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT]: typeof REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT;
    [EVENTS]: EventList;
};

export interface Reducer<StateType,EventType> {
    (state: StateType, event: EventType): StateType;
};

export interface Factory<StateType,EmittedEventType extends DomainEvent,AggregateType extends ImmutableAggregateRoot<EmittedEventType>> {
    (state: StateType, change: (event: EmittedEventType) => AggregateType, base: ImmutableAggregateRoot<EmittedEventType>): AggregateType;
};

export function make<EmittedEventType extends DomainEvent,AggregateType extends ImmutableAggregateRoot<EmittedEventType>,StateType>(factory: Factory<StateType,EmittedEventType,AggregateType>, state: StateType, reducer: Reducer<StateType,EmittedEventType>, events: EventList): AggregateType {
    function change(event: EmittedEventType) {
        const newState = reducer(state, event);
        return make(factory, newState, reducer, new EventListNode(event, events));
    }
    return factory(state, change, {
        [EVENTS]: events,
        [REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT]: REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT
    });
};
