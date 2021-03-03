import { generateID } from "../implementations/common/generateID";
import { EventLocation } from "./Location";

export interface DomainEvent {
    type: string;
    payload: object;
};

export interface QualifiedDomainEvent extends DomainEvent {
    id: string;
    location: EventLocation;
};

export const GENERATE_ID = Symbol('id generator for new QualifiedEvents');
export interface IDGenerator {
    [GENERATE_ID]: () => string;
};
function isIDGenerator(object: any): object is IDGenerator {
    return (object && typeof object[GENERATE_ID] === 'function');
}

export function toQualified(event: DomainEvent, location: EventLocation): QualifiedDomainEvent {
    let id;
    if (isIDGenerator(event)) {
        id = event[GENERATE_ID]();
    } else {
        id = generateID();
    }
    return {
        ...event,
        id,
        location
    };
};
