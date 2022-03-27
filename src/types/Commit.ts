import { Commit, AggregateCommitLocation, QualifiedDomainEvent } from 'esdf2-interfaces';

export class DefaultCommit implements Commit {
    public readonly location: AggregateCommitLocation;
    public readonly events: QualifiedDomainEvent[];
    constructor(location: AggregateCommitLocation, events: QualifiedDomainEvent[]) {
        this.location = location;
        this.events = events;
    }

    toString() {
        return [
            `${this.location.sequence}/${this.location.slot} {`,
            ...this.events.map((event) => `  ${event.location.index}: ${event.type} ${JSON.stringify(event.payload)}`),
            '}'
        ].join('\n');
    }
}
