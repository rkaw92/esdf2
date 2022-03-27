import { Commit, CommitBuilder, CommitLocation, DomainEvent, EventLocation } from "esdf2-interfaces";
import { DefaultCommit } from "../../types/Commit";
import { toQualified } from "../../types/DomainEvent";

export interface EventCollector {
    add(event: DomainEvent): void;
};

export class EventBasket implements EventCollector, CommitBuilder {
    private events: DomainEvent[] = [];
    constructor(private aggregateName: string) {}
    add(event: DomainEvent) {
        this.events.push(event);
    }

    buildCommit(commitLocation: CommitLocation, start: EventLocation): Commit {
        return new DefaultCommit(
            // Enrich CommitLocation to become an AggregateCommitLocation:
            { ...commitLocation, aggregateName: this.aggregateName },
            // Enrich EventLocation for each event to become an AggregateEventLocation:
            this.events.map((event, offset) => toQualified(event, {
                aggregateName: this.aggregateName,
                sequence: start.sequence,
                // Give each event a unique index within the aggregate timeline:
                index: start.index + offset
            }))
        );
    }
};
