import { DomainEvent } from '../../types/DomainEvent';
import { DefaultEvent } from '../common/DefaultEvent';
import { EventCollector } from '../common/EventBasket';

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

type WithID<T> = T & {
    id: string;
};
export type BareDomainEvent = Omit<DomainEvent, "id">;

export abstract class EasyAggregateRoot<ConstructedEventType extends BareDomainEvent> extends MutableAggregateRoot<ConstructedEventType & { id: string; }> {
    protected emit(event: ConstructedEventType) {
        const id = DefaultEvent.generateID();
        const eventWithID: WithID<ConstructedEventType> = Object.assign({}, { id }, event);
        super.emit(eventWithID);
    }
};
