import { ChartType } from "bifrost-zero-common"

export const TYPEID = {
    // Structures
    TRANSFORMER    : "LV-TRANSFORMER",
    PGC 	       : "POWERGRID-CONNECTOR",
    CABLE          : "CABLE-UNDERGROUND-SD",
    NODE           : "POWERGRID-NODE",

    CHARGING_POLE  : "CHARGING-POLE",
    SOLAR_PANEL    : "SOLAR-PANEL",
    HOUSEHOLD_BAT  : "HOUSEHOLD-BATTERY",
    CHP_STACK      : "CHP-STACK",

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
        chpApId   : string
        hbatApId  : string
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
        allPGCs        : string[],
        byPGC          : powerGridConnectorType,
        allGridSensors : string[],
        byGridSensor   : gridSensorType,
    }
}