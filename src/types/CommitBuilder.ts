import { Commit } from "./Commit";

export interface CommitBuilder {
    buildCommit(): Commit;
};
