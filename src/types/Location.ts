import { CommitLocation, EventLocation } from 'esdf2-interfaces';

export function nextCommit(location: CommitLocation): CommitLocation {
    return {
        sequence: location.sequence,
        slot: location.slot + 1
    };
};

export function nextEvent(location: EventLocation): EventLocation {
    return {
        sequence: location.sequence,
        index: location.index + 1
    };
};
