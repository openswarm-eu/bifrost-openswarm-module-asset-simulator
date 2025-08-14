import { ChartType } from "bifrost-zero-common"

export const TYPEID = {
    // Structures
    TRANSFORMER    : "LV-TRANSFORMER",
    PGC 	       : "POWERGRID-CONNECTOR",
    CABLE          : "CABLE-UNDERGROUND-SD",
    NODE           : "POWERGRID-NODE",
    HUGE_HOUSE     : "RESIDENTIAL-MULTI-LARGE",
    SMALL_HOUSE    : "RESIDENTIAL-SINGLE",

    // Dynamics
    LOADING        : "LOADING",
    VOLTAGE        : "VOLTAGE-3P",
    CURRENT        : "CURRENT-3P",
    ACTIVE_POWER   : "ACTIVE-POWER-3P",
    POWERED        : "POWERED",
    CABLE_POWER    : "CABLE-POWER-3PF"
}

export type loadSimulatorType = {
    scaleFactor : number
}

export type solarSimulatorType = {
    scaleFactor : number
}

export type evChargerSimulatorType = {
    chargingSlots   : number
    maxPowerPerSlot : number
    shiftedEnergy   : number
}

export type batterySimulatorType = {
    chargePower     : number
    dischargePower  : number
    storedEnergy    : number
    dynamicId : {
        activePower : string
        maxPower    : string
        soc         : string
        capacity    : string
    }
}

export type powerGridConnectorType = {
    [Key: string]:{
        pgcApId           : string
        pvApId            : string
        pvMaxApId         : string
        load              : loadSimulatorType
        solarSystem       : solarSimulatorType
        evApId            : string
        evMaxApId         : string
        evCharger         : evChargerSimulatorType
        batterySystem     : batterySimulatorType
    }
}

export type gridSensorType = {
    [Key: string]:{
        nameId               : string
        isActive             : boolean
        cablePowerId         : string
        powerFlowDirectionId : string
        powerMeasurementId   : string
        powerLimitId         : string
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