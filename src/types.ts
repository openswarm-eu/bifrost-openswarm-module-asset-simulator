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

export type overlaodingDetectionMapType = {
    [Key: string] : {
        overlaodingTimeId: string
        checkedLastTime: number
        overloading070Time: number
        overloading100Time: number
    }
    
}

export type localStorageType = {
    [Key: string]: {
        loading2StackedLoading: loadingMapType
        overlaodingDetection: overlaodingDetectionMapType
    }
}
