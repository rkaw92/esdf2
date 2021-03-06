import { DomainEvent, EventLocation, QualifiedDomainEvent } from 'esdf2-interfaces';
import { generateID } from "../implementations/common/generateID";

export const GENERATE_ID = Symbol('id generator for new Qualified Events');
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
