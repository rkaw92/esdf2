import { Commit } from "../../types/Commit";
import { CommitBuilder } from "../../types/CommitBuilder";
import { DomainEvent } from "../../types/DomainEvent";
import { ExclusiveLocation } from "../../types/ExclusiveLocation";

export interface EventCollector {
    add(event: DomainEvent): void;
};

export class EventBasket implements EventCollector, CommitBuilder {
    private readonly context: ExclusiveLocation;
    private events: DomainEvent[];
    constructor(context: ExclusiveLocation) {
        this.context = context;
        this.events = [];
    }
    add(event: DomainEvent) {
        this.events.push(event);
    }

    buildCommit(): Commit {
        return {
            location: this.context,
            events: this.events
        };
    }
};
