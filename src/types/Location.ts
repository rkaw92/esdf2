import { CommitLocation, EventLocation, AggregateCommitLocation, AggregateEventLocation } from 'esdf2-interfaces';

export function nextCommit(location: CommitLocation | AggregateCommitLocation): typeof location {
    return {
        sequence: location.sequence,
        slot: location.slot + 1
    };
};

export function nextAggregateCommit(location: AggregateCommitLocation): AggregateCommitLocation {
    return {
        sequence: location.sequence,
        slot: location.slot + 1,
        aggregateName: location.aggregateName
    };
};

export function nextEvent(location: EventLocation): EventLocation {
    return {
        sequence: location.sequence,
        index: location.index + 1
    };
};

export function nextAggregateEvent(location: AggregateEventLocation): AggregateEventLocation {
    return {
        sequence: location.sequence,
        index: location.index + 1,
        aggregateName: location.aggregateName
    };
};
