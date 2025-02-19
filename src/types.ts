export interface Dictionary<T> {
    [Key: string]: T;
}

export type occupancyStructType = {
    ids: string[],
    min: number,
    max: number
}

export type localStorageType = {
    [Key: string]: {
        noiseLevelDynamics: string[],
        politicalModelDynamics: string[],
        occupancyStruct: occupancyStructType,
    }
}
