import { Commit, DefaultCommit } from "../../types/Commit";
import { CommitBuilder } from "../../types/CommitBuilder";
import { DomainEvent, toQualified } from "../../types/DomainEvent";
import { CommitLocation, EventLocation } from "../../types/Location";

export interface EventCollector {
    add(event: DomainEvent): void;
};

export class EventBasket implements EventCollector, CommitBuilder {
    private events: DomainEvent[];
    constructor() {
        this.events = [];
    }
    add(event: DomainEvent) {
        this.events.push(event);
    }

    buildCommit(commitLocation: CommitLocation, start: EventLocation): Commit {
        return new DefaultCommit(
            commitLocation,
            this.events.map((event, offset) => toQualified(event, {
                sequence: start.sequence,
                index: start.index + offset
            }))
        );
    }
};
