import { Commit, CommitBuilder, CommitLocation, DomainEvent, EventLocation } from "esdf2-interfaces";
import { DefaultCommit } from "../../types/Commit";
import { toQualified } from "../../types/DomainEvent";

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
