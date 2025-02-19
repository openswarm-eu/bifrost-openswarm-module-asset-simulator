export interface Dictionary<T> {
    [Key: string]: T;
}

export type oStruct = {
    ids: string[],
    min: number,
    max: number
}
