import { DomainEvent } from '../../types/DomainEvent';
import { EventCollector } from './EventBasket';

const BASKET = Symbol('pending events');

export abstract class MutableAggregateRoot<EmittedEventType extends DomainEvent> {
    protected [BASKET]: EventCollector;
    constructor(basket: EventCollector) {
        this[BASKET] = basket;
    }
    public abstract apply(event: EmittedEventType): void;
    protected emit(event: EmittedEventType) {
        this[BASKET].add(event);
        this.apply(event);
    }
};

export interface MutableAggregateRootFactory<AggregateRootType extends MutableAggregateRoot<any>> {
    (basket: EventCollector): AggregateRootType;
};
