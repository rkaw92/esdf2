import { Commit } from "./Commit";
import { CommitLocation, EventLocation } from "./Location";

export interface CommitBuilder {
    buildCommit(commitLocation: CommitLocation, eventStart: EventLocation): Commit;
};
