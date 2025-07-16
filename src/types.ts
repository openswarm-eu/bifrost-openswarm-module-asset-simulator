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
export type CarAssignmentObject = { [Key: string]: CarAssignment }

export type CarAssignment = [CarObj] | []

export type CarObj = {
    ecar_assignment_slots_number: number,
    ecar_assignment_slots : assignmentSlots[],
    pgc_id: string
}

export type assignmentSlots = {
    ecar_id: number
    charge: number
    charge_max: number
    shifted_energy: number
}

export type powerGridConnectorType = {
    [Key: string]:{
        pgcApId     : string
        pvApId      : string
        pvMaxApId   : string
        load        : loadSimulatorType
        solarSystem : solarSimulatorType
        evApId      : string
        evMaxApId   : string
        evCharger   : evChargerSimulatorType
        parentBuildingId: string
    }
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