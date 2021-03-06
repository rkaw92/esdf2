import { CommitBuilderProvider, EVENTS, DomainEvent } from 'esdf2-interfaces';
import { EventBasket } from './EventBasket';

export abstract class MutableAggregateRoot<EmittedEventType extends DomainEvent> implements CommitBuilderProvider {
    public readonly [EVENTS]: EventBasket;
    constructor() {
        this[EVENTS] = new EventBasket();
    }
    public abstract apply(event: EmittedEventType): void;
    protected emit(event: EmittedEventType) {
        this[EVENTS].add(event);
        this.apply(event);
    }
};

export interface MutableAggregateRootFactory<AggregateRootType extends MutableAggregateRoot<any>> {
    (): AggregateRootType;
};
