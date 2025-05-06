import { ChartType } from "bifrost-zero-common"

export const TYPEID = {
    // Structures
    TRANSFORMER    : "LV-TRANSFORMER",
    PGC 	       : "POWERGRID-CONNECTOR",
    CABLE          : "CABLE-UNDERGROUND-SD",
    NODE           : "POWERGRID-NODE",

    // Dynamics
    LOADING        : "LOADING",
    VOLTAGE        : "VOLTAGE-3P",
    CURRENT        : "CURRENT-3P",
    ACTIVE_POWER   : "ACTIVE-POWER-3P",
    POWERED        : "POWERED",
}

export type powerGridConnectorType = {
    [Key: string]:{
        pgcApId   : string
        pvApId    : string
        pvMaxApId : string
        evApId    : string
        evMaxApId : string
    }
}

export type gridSensorType = {
    [Key: string]:{
        nameId             : string
        isActive           : boolean
        nodeVoltageId      : string
        cableCurrentId     : string
        powerMeasurementId : string
        powerLimitId       : string
    }
}

export type localStorageType = {
    [Key: string]: {
        lastUpdate     : number,
        numberUpdate   : number,
        allPGCs        : string[],
        byPGC          : powerGridConnectorType,
        allGridSensors : string[],
        byGridSensor   : gridSensorType,
    }
}