import { 
    DataFrame, 
    TModuleContext, 
    TState,
    Log
} from 'bifrost-zero-common'
import { 
    localStorageType,
    TYPEID 
} from './types.js'
import { config } from './config.js'
import { 
    sensorNames, 
    TYPEID_LOCAL 
} from '../data/fragment/local_types.js'

export function init(
    storyId: string, 
    experimentId: string, 
    state: TState, 
    context: TModuleContext,
    localStorage: localStorageType
): DataFrame {
        
    // initialize the result DataFrame of the init function
    const initResult: DataFrame = new DataFrame()
    initResult.setTime(0)
    
    // initialize the local storage for this experiment
    localStorage[experimentId] = {
        lastUpdate     : -1,
        numberUpdate   : 0,
        allPGCs        : [],
        byPGC          : {},
        allGridSensors : [],
        byGridSensor   : {}
    }	
    try {
        for (const structureId of state.structures.ids){
            const entity = state.structures.entities[structureId]
            if(entity.experimentId === experimentId){
                                
                // get all needed information for the power grid connectors
                if(entity.typeId === TYPEID.PGC){
                    localStorage[experimentId].allPGCs.push(structureId)
                    localStorage[experimentId].byPGC[structureId] = {
                        pgcApId   : "",
                        pvApId    : "",
                        pvMaxApId : "",
                        load      : {
                            scaleFactor : 1  // Default load scale factor
                        },
                        solarSystem : {
                            scaleFactor : 1  // Default solar scale factor
                        },
                        evApId    : "",
                        evMaxApId : "",
                        evCharger : {
                            chargingSlots   : 1,  // Default charging slots
                            maxPowerPerSlot : 4,  // Default max power per slot in kW
                            shiftedEnergy   : 0
                        },
                        batterySystem     : {
                            chargePower    : config.batterySystem.chargePower,
                            dischargePower : config.batterySystem.dischargePower,
                            storedEnergy   : -1, // will be updated in the update function, -1 indicates to use the starting values for a initial calculation
                            dynamicId : {
                                activePower : "",
                                maxPower    : "",
                                soc         : "",
                                capacity    : ""
                            }
                        },
                    }
                    
                    // get apId of pgc
                    const pgcDynIds:string[] = entity.dynamicIds
                    for (const dynId of pgcDynIds){
                        if (state.dynamics.entities[dynId].typeId == TYPEID.ACTIVE_POWER){
                            localStorage[experimentId].byPGC[structureId].pgcApId = dynId
                        }
                    }
                    
                    // got through the childs
                    const pgcChildIds:string[] = entity.childIds
                    for (const childId of pgcChildIds){
                        const dynIds = state.structures.entities[childId]?.dynamicIds
                        if (dynIds === undefined){
                            continue
                        }
                        if (state.structures.entities[childId].typeId == TYPEID_LOCAL.SOLAR_PANEL){
                            for (const dynId of dynIds){
                                if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.PV_SYSTEM_POWER){
                                    localStorage[experimentId].byPGC[structureId].pvApId = dynId
                                }
                                if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.PV_SYSTEM_MAX_POWER){
                                    localStorage[experimentId].byPGC[structureId].pvMaxApId = dynId
                                }
                            }
                        } else if (state.structures.entities[childId].typeId == TYPEID_LOCAL.CHARGING_POLE){
                            for (const dynId of dynIds){
                                if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.CHGSTATION_POWER){
                                    localStorage[experimentId].byPGC[structureId].evApId = dynId
                                }
                                if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.CHGSTATION_MAX_POWER){
                                    localStorage[experimentId].byPGC[structureId].evMaxApId = dynId
                                }
                            }
                        } else if (state.structures.entities[childId].typeId == TYPEID_LOCAL.BATTERY_SYSTEM){
                            for (const dynId of dynIds){
                                if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.BATTERY_POWER){
                                    localStorage[experimentId].byPGC[structureId].batterySystem.dynamicId.activePower = dynId
                                }
                                if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.BATTERY_MAX_POWER){
                                    localStorage[experimentId].byPGC[structureId].batterySystem.dynamicId.maxPower = dynId
                                }
                                if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.BATTERY_SOC){
                                    localStorage[experimentId].byPGC[structureId].batterySystem.dynamicId.soc = dynId
                                }
                                if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.BATTERY_CAPACITY){
                                    localStorage[experimentId].byPGC[structureId].batterySystem.dynamicId.capacity = dynId
                                }
                            }
                        }
                    }

                    // go throught the parents
                    const pgcParentIds:string[] = entity.parentIds
                    for (const parentId of pgcParentIds){
                        // identfiy Solar-Farms
                        if (state.structures.entities[parentId].typeId == TYPEID_LOCAL.SOLAR_FARM){
                            // set the scaleFactor for the solar system simulator to a higher value
                            localStorage[experimentId].byPGC[structureId].solarSystem.scaleFactor = config.structureTypes.solarFarm.solarSystem.scaleFactor
                            // switch off the load simulator for the solar farm
                            localStorage[experimentId].byPGC[structureId].load.scaleFactor = config.structureTypes.solarFarm.load.scaleFactor
                        }
                        // identify EV-Station
                        if (state.structures.entities[parentId].typeId == TYPEID_LOCAL.EV_STATION){
                            // set the scaleFactor for the EV-Charger simulator to a higher value
                            localStorage[experimentId].byPGC[structureId].evCharger.chargingSlots = config.structureTypes.evStation.evCharger.chargingSlots
                            //switch off the load simulator for the EV-Station
                            localStorage[experimentId].byPGC[structureId].load.scaleFactor = config.structureTypes.evStation.load.scaleFactor
                        }
                        // identify Battery-Station
                        if (state.structures.entities[parentId].typeId == TYPEID_LOCAL.BATTERY_STATION){
                            // set the charge and discharge power and capacity to a higher value
                            localStorage[experimentId].byPGC[structureId].batterySystem.chargePower = config.structureTypes.batteryStation.batterySystem.chargePower
                            localStorage[experimentId].byPGC[structureId].batterySystem.dischargePower = config.structureTypes.batteryStation.batterySystem.dischargePower
                            // switch off the load simulator for the Battery-Station
                            localStorage[experimentId].byPGC[structureId].load.scaleFactor = config.structureTypes.batteryStation.load.scaleFactor
                        }
                        // is it a small house?
                        if (state.structures.entities[parentId].typeId == TYPEID.SMALL_HOUSE){
                            // set the scaleFactor for the load simulator
                            localStorage[experimentId].byPGC[structureId].load.scaleFactor = config.structureTypes.smallHouse.load.scaleFactor
                        }
                        // is it a huge house?
                        if (state.structures.entities[parentId].typeId == TYPEID.HUGE_HOUSE){
                            // set the scaleFactor for the load simulator
                            localStorage[experimentId].byPGC[structureId].load.scaleFactor = config.structureTypes.hugeHouse.load.scaleFactor
                        }
                    }
                }

                // get all needed information for the grid sensors
                if(entity.typeId === TYPEID_LOCAL.GRID_SENSOR){
                    localStorage[experimentId].allGridSensors.push(structureId)
                    localStorage[experimentId].byGridSensor[structureId] = {
                        nameId               : "",
                        isActive             : true,
                        cablePowerId         : "",
                        powerFlowDirectionId : "",
                        powerMeasurementId   : "",
                        powerLimitId         : ""
                    }
                    // get the sensor dynamicIds
                    const gridDynIds:string[] = entity.dynamicIds
                    for (const dynId of gridDynIds){
                        if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.GRID_SENSOR_NAME){
                            localStorage[experimentId].byGridSensor[structureId].nameId = dynId
                        } else if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.GRID_SENSOR_DIRECTION){
                            localStorage[experimentId].byGridSensor[structureId].powerFlowDirectionId = dynId
                        } else if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.GRID_SENSOR_POWERMEASUREMENT){
                            localStorage[experimentId].byGridSensor[structureId].powerMeasurementId = dynId
                        } else if (state.dynamics.entities[dynId].typeId == TYPEID_LOCAL.GRID_SENSOR_POWERLIMIT){
                            localStorage[experimentId].byGridSensor[structureId].powerLimitId = dynId
                        }
                    }
                    // get now the dynamics of the needed values for calculation of the sensor measurements
                    const parentIds:string[] = entity.parentIds
                    for (const parentId of parentIds){
                        if (state.structures.entities[parentId].typeId == TYPEID.NODE){
                            const nodeEntity = state.structures.entities[parentId]
                            // get the childs of the node
                            const nodeChildIds:string[] = nodeEntity.childIds
                            let cableCounter = 0
                            for (const childId of nodeChildIds){
                                // skip non connnection entities
                                if (state.connections.entities[childId] === undefined){
                                    continue
                                }
                                if (state.connections.entities[childId].typeId == TYPEID.CABLE){
                                    cableCounter++
                                    if (cableCounter > 2){
                                        // more than 2 cables connected to the node
                                        context.log.write(`Error: More than 2 cables connected to the node ${parentId}`, Log.level.ERROR)
                                        context.log.write(`Sensor ${localStorage[experimentId].byGridSensor[structureId].nameId} set to inactive`, Log.level.INFO)
                                        // set this sensor to inactive
                                        localStorage[experimentId].byGridSensor[structureId].isActive = false
                                        // set the sensor name to "Inactive"
                                        initResult.addSeries({dynamicId:localStorage[experimentId].byGridSensor[structureId].nameId,values:[sensorNames.INACTIVE]})
                                        continue
                                    }
                                    if (cableCounter > 1){
                                        continue
                                    }
                                    // get the cable current id of the cable
                                    const cableEntity = state.connections.entities[childId]
                                    const cableDynIds:string[] = cableEntity.dynamicIds
                                    for (const cableDynId of cableDynIds){
                                        if (state.dynamics.entities[cableDynId].typeId == TYPEID.CABLE_POWER){
                                            localStorage[experimentId].byGridSensor[structureId].cablePowerId = cableDynId
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        context.log.write(`Error in init ${error}`, Log.level.ERROR)
    }
    
    return initResult
}
