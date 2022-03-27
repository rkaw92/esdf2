import { EVENTS, APPLY, DomainEvent, AggregateRoot, AGGREGATE_NAME } from 'esdf2-interfaces';
import { EventBasket } from './EventBasket';

export abstract class MutableAggregateRoot<EmittedEventType extends DomainEvent> implements AggregateRoot<EmittedEventType> {
    public readonly [EVENTS]: EventBasket;
    public readonly [AGGREGATE_NAME]: string;
    constructor() {
        this[AGGREGATE_NAME] = this.getAggregateName();
        this[EVENTS] = new EventBasket(this[AGGREGATE_NAME]);
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
    protected getAggregateName() {
        return this.constructor.name;
    }
};

export interface MutableAggregateRootFactory<AggregateRootType extends MutableAggregateRoot<any>> {
    (): AggregateRootType;
};
