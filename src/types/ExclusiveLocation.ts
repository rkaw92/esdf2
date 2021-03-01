export type SequenceID = string;
export type SequenceSlot = number;

export interface ExclusiveLocation {
    sequence: SequenceID;
    slot: SequenceSlot;
};
