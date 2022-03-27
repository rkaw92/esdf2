import { CommitBuilder, CommitLocation, Commit, DomainEvent, EventLocation, QualifiedDomainEvent, AggregateRoot, EventOf, EVENTS, APPLY, AGGREGATE_NAME, AggregateCommitLocation, AggregateEventLocation } from "esdf2-interfaces";
import { DefaultCommit } from "../../types/Commit";
import { toQualified } from "../../types/DomainEvent";
import { nextAggregateEvent } from "../../types/Location";

export const REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT = Symbol('please use { ...base } to construct layer supertype-compatible objects');
export const REDUCER = Symbol('reducer');

export class EventListRoot implements CommitBuilder {
    constructor(private aggregateName: string) {}
    buildCommit(commitLocation: CommitLocation): Commit {
        return new DefaultCommit(
            { ...commitLocation, aggregateName: this.aggregateName },
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
        const myAggregateLocation: AggregateEventLocation = lastEvent ?
            nextAggregateEvent(lastEvent.location) :
            { ...start, aggregateName: previousCommit.location.aggregateName };
        const myEventAsQualified = toQualified(this.event, myAggregateLocation);
        return new DefaultCommit(
            previousCommit.location,
            [ ...previousCommit.events, myEventAsQualified ]
        );
    }
};

export type EventList = EventListNode | EventListRoot;

export interface ImmutableAggregateRootBase<EventType extends DomainEvent> extends AggregateRoot<EventType> {
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
> extends ImmutableAggregateRootBase<EmittedEventType> {
    [REDUCER]: Reducer<StateType,EmittedEventType>;
};

export type StateOf<T> = T extends ImmutableAggregateRoot<infer StateType,any> ? StateType : never;


export interface ImmutableAggregateRootConstructor<AggregateRootType extends ImmutableAggregateRoot<any,any>> {
    (state: StateOf<AggregateRootType>, change: (event: EventOf<AggregateRootType>) => AggregateRootType, base: ImmutableAggregateRootBase<EventOf<AggregateRootType>>): AggregateRootType;
};

export interface ImmutableAggregateRootFactory<AggregateRootType extends ImmutableAggregateRoot<any,any>> {
    (): AggregateRootType;
};

function reducerNotCallableInConstructor(): any {
    throw new Error('Cannot call change() while creating a new instance');
}

export function make<AggregateRootType extends ImmutableAggregateRoot<any,any>>(aggregateName: string, constructor: ImmutableAggregateRootConstructor<AggregateRootType>, state: StateOf<AggregateRootType>, events: EventList): AggregateRootType {
    let reducer: Reducer<StateOf<AggregateRootType>,EventOf<AggregateRootType>> = reducerNotCallableInConstructor;
    function change(event: EventOf<AggregateRootType>): AggregateRootType {
        const newState = reducer(state, event);
        return make(aggregateName, constructor, newState, new EventListNode(event, events));
    }
    function apply<T>(this: T, event: EventOf<AggregateRootType>): T {
        const newState = reducer(state, event);
        return make(aggregateName, constructor, newState, new EventListRoot(aggregateName)) as any as T;
    }
    const instance = constructor(state, change, {
        [APPLY]: apply,
        [EVENTS]: events,
        [AGGREGATE_NAME]: aggregateName,
        [REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT]: REMEMBER_TO_INCLUDE_BASE_PROPERTIES_IN_RETURNED_OBJECT
    });
    reducer = instance[REDUCER];
    return instance;
};

// When you call .bind() on an anonymous function whose .name property is empty, the resulting function's name
//  becomes non-empty. This prevents the developer forgetting to set an aggregateName.
const EMPTY_BOUND_FUNCTION_NAME = (function() {}).bind({}).name;

export function makeFactory<AggregateRootType extends ImmutableAggregateRoot<any,any>>(constructor: ImmutableAggregateRootConstructor<AggregateRootType>, initialState: StateOf<AggregateRootType>, aggregateName?: string): ImmutableAggregateRootFactory<AggregateRootType> {
    const effectiveAggregateName = aggregateName || constructor.name;
    if (!effectiveAggregateName || effectiveAggregateName === EMPTY_BOUND_FUNCTION_NAME) {
        throw new Error('Immutable aggregate root has no name - please name the constructor function or pass aggregateName explicitly');
    }
    return function() {
        return make(effectiveAggregateName, constructor, initialState, new EventListRoot(effectiveAggregateName));
    };
};
