export const TYPEID = {
    LOADING     : "LOADING",
    TRANSFORMER : "LV-TRANSFORMER",
    CABLE       : "CABLE-UNDERGROUND-SD"
}

export type loadingMapType = {
    [Key: string]: {
        stackedLoadingId: string
    }
}

export type localStorageType = {
    [Key: string]: {
        loading2StackedLoadingMap: loadingMapType
    }
}
