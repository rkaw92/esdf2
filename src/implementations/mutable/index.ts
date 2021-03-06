import { EVENTS, APPLY, DomainEvent, AggregateRoot } from 'esdf2-interfaces';
import { EventBasket } from './EventBasket';

export abstract class MutableAggregateRoot<EmittedEventType extends DomainEvent> implements AggregateRoot<EmittedEventType> {
    public readonly [EVENTS]: EventBasket;
    constructor() {
        this[EVENTS] = new EventBasket();
    }
    public abstract apply(event: EmittedEventType): void;
    public [APPLY]<T>(event: EmittedEventType): T {
        this.apply(event);
        // This is, unfortunately, an ugly hack as TypeScript has no native
        //  suport for polymorphic "this" at the moment.
        return this as any as T;
    }
    protected emit(event: EmittedEventType) {
        this[EVENTS].add(event);
        this.apply(event);
    }
};

export interface MutableAggregateRootFactory<AggregateRootType extends MutableAggregateRoot<any>> {
    (): AggregateRootType;
};
