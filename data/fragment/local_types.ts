export const TYPEID_LOCAL = {
    // Structures
    SOLAR_FARM                   : "SOLAR-FARM",
    EV_STATION                   : "EV-STATION",
    CHARGING_POLE                : "CHARGING-POLE",
    SOLAR_PANEL                  : "SOLAR-PANEL",
    GRID_SENSOR                  : "GRID-SENSOR",

    // Dynamics
    CHGSTATION_POWER             : "CHGSTATION-POWER",
    CHGSTATION_MAX_POWER         : "CHGSTATION-MAX-POWER",
    PV_SYSTEM_POWER              : "PV-SYSTEM-POWER",
    PV_SYSTEM_MAX_POWER          : "PV-SYSTEM-MAX-POWER",
    GRID_SENSOR_POWERMEASUREMENT : "GRID-SENSOR-POWERMEASUREMENT",
    GRID_SENSOR_POWERLIMIT       : "GRID-SENSOR-POWERLIMIT",
    GRID_SENSOR_NAME             : "GRID-SENSOR-NAME",
    GRID_SENSOR_DIRECTION        : "GRID-SENSOR-FLOW-DIRECTION"
}

export const enum sensorNames {
    S1       = "S1",
    S2       = "S2",
    S3       = "S3",
    S4       = "S4",
    S5       = "S5",
    S6       = "S6",
    S7       = "S7",
    S8       = "S8",
    S9       = "S9",
    INACTIVE = "Inactive",
}

export const enum sensorDirections {
    UP   = "UP",
    DOWN = "DOWN",
}

export const PV_SYSTEM_POWER_MAPPING = {
    Infeed_Potential : 0,
    Actual_Infeed    : 1,   
}

export const CHARGING_STATION_POWER_MAPPING = {
    Power_Demand   : 0,
    Actual_Power   : 1,
    Shifted_Demand : 2,
}
