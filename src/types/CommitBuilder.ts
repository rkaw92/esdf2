import { Commit } from "./Commit";
import { CommitLocation, EventLocation } from "./Location";

export interface CommitBuilder {
    buildCommit(commitLocation: CommitLocation, eventStart: EventLocation): Commit;
};

// By convention, the commit builder is found under a symbol property
//  in aggregate root instances:
export const EVENTS = Symbol('pending events');
export interface CommitBuilderProvider {
    [EVENTS]: CommitBuilder;
};
