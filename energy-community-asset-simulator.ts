/**
 * OpenSwarm Asset Simulator Module
 *
 * This file implements a BifrostZero module for simulating energy community assets
 * (such as batteries, PV systems, EV chargers, and grid sensors) in the OpenSwarm PoC1 environment.
 * It provides initialization and update logic, loads CSV profile data, and exposes module configuration.
 */

import { 
    DataFrame, 
    TModuleContext, 
    TState,
    Log                    } from 'bifrost-zero-common'
import { BifrostZeroModule } from 'bifrost-zero-sdk'
import { TYPEID_LOCAL      } from './data/fragment/local_types.js'
import { 
    CarAssignment,
    CarObj,
    TYPEID                 } from './src/types.js'
import { 
    readCSVtoDict, 
    updateDynamic          } from './src/tools.js'
import { 
    carAssignmentObject,
    localStorage, 
    init,                   
    storageDynToValueMap} from './src/init.js'
import { update            } from './src/update.js'
import { config            } from './src/config.js'
import { loadConfig        } from './src/config.js'

const csvFilePath = 'data/csv/profile-data.csv'

// Module logic
const logic = { 
    initFn: (storyId: string, experimentId: string, state: TState, context: TModuleContext) => { 
        context.log.write(`Init from [${storyId}/${experimentId}]`)
        const initResult: DataFrame = init(storyId, experimentId, state, context)
        return initResult
    },

    updateFn: (storyId: string, experimentId: string, startAt:number, simulationAt: number, replayAt: number, data: DataFrame, context: TModuleContext) => {
        context.log.write(`Update from [${storyId}/${experimentId}] @ ${simulationAt}`)
        const updateResult: DataFrame = update(storyId, experimentId, startAt, simulationAt, replayAt, data, context, m)
        return updateResult
    }
}

// Create the BifrostZero module instance
const m = new BifrostZeroModule({
    author         : 'anonymous',
    label          : 'OpenSwarm Asset Simulator',
    about          : 'Module to simulate assest in OpenSwarm PoC1.',
    initCallback   : logic.initFn,
    updateCallback : logic.updateFn,
    fragmentFile   : './data/fragment/Module.Fragment.yaml',
    subscriptions  : [
        TYPEID.CABLE_POWER,
        TYPEID_LOCAL.CHGSTATION_MAX_POWER,
        TYPEID_LOCAL.PV_SYSTEM_MAX_POWER,
        TYPEID_LOCAL.WIND_SPEED_SELECTION,
        TYPEID_LOCAL.BATTERY_SOC,
        TYPEID_LOCAL.BATTERY_CAPACITY,
        TYPEID_LOCAL.BATTERY_MAX_POWER,
        TYPEID_LOCAL.GRID_SENSOR_DIRECTION,
        TYPEID_LOCAL.GRID_SENSOR_NAME
    ],
    samplingRate   : process.env.SAMPLING_RATE ? Number(process.env.SAMPLING_RATE) : 60,
    docURL         : '',
    moduleURL      : process.env.MODULE_URL  || 'http://localhost:7032',
    bifrostURL     : process.env.BIFROST_URL || 'http://localhost:9091',
    hook           : process.env.HOOK ? JSON.parse(process.env.HOOK) : [100, 910]
})

// REST endpoint accessed by the RealityTwin hardware module "STORAGE BUILDING"
m.app.post("/rest/updateCapacity", async (request, reply) => {
    m.context.log.write(`Got external REST request for updating "STORAGE BUILDING"...`)

    const body = request.body as object
    try {
            const storyId = body["storyId"]
            const expId = body["experimentId"]
            const dynId = body["dynamicId"]
            const dynVal = parseFloat(body["dynamicValue"])
            const bifrostURL = process.env.BIFROST_URL || 'http://localhost:9091'
            const status = await updateDynamic(bifrostURL, storyId, expId, dynId, dynVal, m.context.log, Log)
            storageDynToValueMap[dynId] = dynVal
            reply.status(status).send(JSON.stringify({
                message: "success"
            }))
    } catch (e) {
        var msg = "Error parsing capacity update: "
        m.context.log.write(msg + e, Log.level.ERROR)
        reply.status(400).send(JSON.stringify({
                message: "fail"
            }))
    }
    
    const batteryStationId = body["dynamicId"].split('->')[1].split('>')[0] + '@' + body["dynamicId"].split('@')[1];
    m.context.log.write(`Rest Call '/rest/updateCapacitys' for: ${batteryStationId}`, Log.level.DEBUG)
    m.context.log.write(`Requested capacity: ${body["dynamicValue"]}`, Log.level.DEBUG)
})

// REST endpoint accessed by the RealityTwin hardware module "E-CAR CHARGING STATION"
m.app.post("/rest/updateCars", (request, reply) => {
    m.context.log.write(`Got external REST request for updating "E-CAR CHARGING STATION"...`)

    const body = request.body as object
    // get key from object
    const evStationId = Object.keys(body)[0]
    const experimentId = body["expId"][0] as string
    m.context.log.write(`Rest Call '/rest/updateCars' for: ${evStationId}`, Log.level.DEBUG)
    m.context.log.write(`Requested car occupation: ${body[evStationId]}`, Log.level.DEBUG)
    if(!body[evStationId]){
        reply.status(200).send(JSON.stringify({
            message: "failure, malformed request"
        }))
        return
    }
    if(!Array.isArray(body[evStationId])){
        reply.status(200).send(JSON.stringify({
            message: "failure, request is not an array"
        }))
        return
    }
    if(body[evStationId].length < 3){
        reply.status(200).send(JSON.stringify({
            message: "failure, cannot access array content"
        }))    
        return
    }

    if (carAssignmentObject[experimentId] == undefined){
        carAssignmentObject[experimentId] = [] as CarAssignment
        let carObj:CarObj = {
            ecar_assignment_slots_number: 3,
            ecar_assignment_slots : [],
            pgc_id: ""
        }
        // update occupation for all slots
        for(var j = 0; j < 3; j++){
            carObj.ecar_assignment_slots.push({
                ecar_id        : body[evStationId][j],
                ecar_color     : config.structureTypes.evStation.carStats[body[evStationId][j]].carColor,
                charge         : config.structureTypes.evStation.carStats[body[evStationId][j]].carMaxCap * config.structureTypes.evStation.evCharger.initialChargePercent,
                charge_max     : config.structureTypes.evStation.carStats[body[evStationId][j]].carMaxCap,
                charge_power_max : config.structureTypes.evStation.carStats[body[evStationId][j]].carPower * config.structureTypes.evStation.evCharger.increasedChargePower,
                shifted_energy : 0
            })
        }
        carAssignmentObject[experimentId][evStationId] = carObj
    }
    
    let carObj: CarObj
    // if another station was created already and the carAssignmentObject exists but the other stuff does not
    if (carAssignmentObject[experimentId][evStationId] == undefined){
        carObj = {
            ecar_assignment_slots_number: 3,
            ecar_assignment_slots : [],
            pgc_id: ""
        }
        // update occupation for all slots
        for(var j = 0; j < 3; j++){
            carObj.ecar_assignment_slots.push({
                ecar_id        : body[evStationId][j],
                ecar_color     : config.structureTypes.evStation.carStats[body[evStationId][j]].carColor,
                charge         : config.structureTypes.evStation.carStats[body[evStationId][j]].carMaxCap * config.structureTypes.evStation.evCharger.initialChargePercent,
                charge_max     : config.structureTypes.evStation.carStats[body[evStationId][j]].carMaxCap,
                charge_power_max : config.structureTypes.evStation.carStats[body[evStationId][j]].carPower * config.structureTypes.evStation.evCharger.increasedChargePower,
                shifted_energy : 0
            })
        }
        carAssignmentObject[experimentId][evStationId] = carObj
    }else{
        carObj = carAssignmentObject[experimentId][evStationId] as CarObj
    }
    
    let i = 0
    let slotShiftedSum = 0
    for (const slot of carObj.ecar_assignment_slots){
        // if the car in the slot changed, then reset charge
        if( slot.ecar_id != body[evStationId][i]){
            slot.ecar_id = body[evStationId][i]
            slot.ecar_color = config.structureTypes.evStation.carStats[body[evStationId][i]].carColor
            slot.charge_max = config.structureTypes.evStation.carStats[body[evStationId][i]].carMaxCap
            slot.charge = slot.charge_max * config.structureTypes.evStation.evCharger.initialChargePercent
            slot.charge_power_max = config.structureTypes.evStation.carStats[body[evStationId][i]].carPower * config.structureTypes.evStation.evCharger.increasedChargePower
            if(localStorage[experimentId].byPGC[carObj.pgc_id] != undefined){
                // reset the shifted energy when it disconnects and also subtract it from the internal struct
                if(slot.ecar_id == -1){
                    const pStruct = localStorage[experimentId].byPGC[carObj.pgc_id]
                    pStruct.evCharger.shiftedEnergy -= slot.shifted_energy
                    // if there was nothing loaded at all because of no PV
                    slot.shifted_energy = 0
                }
            }
        }
        slotShiftedSum += slot.shifted_energy
        i += 1
    }
    if (localStorage[experimentId] != undefined){
        // if there was nothing loaded at all because of no PV, proper reset
        if (slotShiftedSum == 0){
            localStorage[experimentId].byPGC[carObj.pgc_id].evCharger.shiftedEnergy = 0
        }
    }
    // Reply to the frontend
    reply.status(200).send(JSON.stringify({
        message: "success"
    }))
});

// Load the module config
loadConfig(m.context);

// Load CSV profile data
readCSVtoDict(csvFilePath, m.context).catch((error) => {});

// Start the module
m.start()