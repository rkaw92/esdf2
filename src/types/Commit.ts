import { DomainEvent } from './DomainEvent';
import { ExclusiveLocation } from './ExclusiveLocation';

export interface Commit {
    location: ExclusiveLocation;
    events: DomainEvent[];
}
