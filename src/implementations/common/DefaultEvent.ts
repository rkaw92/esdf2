import * as uuid from 'uuid';
import { DomainEvent } from '../../types/DomainEvent';

export abstract class DefaultEvent implements Pick<DomainEvent,"id"> {
    public readonly id: string;
    constructor() {
        this.id = DefaultEvent.generateID();
    }
    static generateID() {
        return uuid.v4();
    }
};
