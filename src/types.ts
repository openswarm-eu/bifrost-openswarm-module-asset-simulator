import { ChartType } from "bifrost-zero-common"

export const TYPEID = {
    LOADING      : "LOADING",
    TRANSFORMER  : "LV-TRANSFORMER",
    VOLTAGE_3P   : "VOLTAGE-3P",
    CABLE        : "CABLE-UNDERGROUND-SD",
    PGC 	     : "POWERGRID-CONNECTOR",
    ACTIVE_POWER : "ACTIVE-POWER-3P",
    REACTIVE_POWER : "REACTIVE-POWER-3P",
    CHARGING_POLE: "CHARGING-POLE",
    SOLAR_PANEL  : "SOLAR-PANEL",
    HOUSEHOLD_BAT: "HOUSEHOLD-BATTERY",
    CHP_STACK    : "CHP-STACK",
    POWERED      : "POWERED",
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

export type powerGridConnectorDictType = {
    [Key: string]:{
        pgcApId: string
        pgcRpId: string
        pvApId: string
        evApId: string
        chpApId: string
        hbatApId: string
        evPoweredId: string
    }
}

export type typeLocalStorage = {
    [Key: string]: {
        allPGCs: string[],
        byPGC : powerGridConnectorDictType
    }
}