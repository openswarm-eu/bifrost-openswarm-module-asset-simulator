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
    init                   } from './src/init.js'
import { update            } from './src/update.js'
import { config            } from './src/config.js'

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
    const body = request.body as object
    try {
            const storyId = body["storyId"]
            const expId = body["experimentId"]
            const dynId = body["dynamicId"]
            const dynVal = parseFloat(body["dynamicValue"])
            const bifrostURL = process.env.BIFROST_URL || 'http://localhost:9091'
            const status = await updateDynamic(bifrostURL, storyId, expId, dynId, dynVal, m.context.log, Log)
            reply.status(status).send(JSON.stringify({
                message: "success"
            }))
    } catch (e) {
        var msg = "Error parsing capacity update"
        m.context.log.write(msg + e, Log.level.ERROR)
        reply.status(400).send(JSON.stringify({
                message: "fail"
            }))
    }
})

// REST endpoint accessed by the RealityTwin hardware module "E-CAR CHARGING STATION"
m.app.post("/rest/updateCars", (request, reply) => {
    const body = request.body as object
    // get key from object
    const evStationId = Object.keys(body)[0]
    const experimentId = body["expId"][0] as string
    if (carAssignmentObject[experimentId] == undefined){
        carAssignmentObject[experimentId] = [] as CarAssignment
        let carObj:CarObj = {
                        ecar_assignment_slots_number: 3,
                        ecar_assignment_slots : [],
                        pgc_id: ""
                        }
                        // init occupation for all slots
        for(var j = 0; j < 3; j++){
            carObj.ecar_assignment_slots.push({ecar_id: body[evStationId][j],
                                            charge: config.structureTypes.evStation.carStats[body[evStationId][j]].carMaxCap*0.15,
                                            charge_max:config.structureTypes.evStation.carStats[body[evStationId][j]].carMaxCap,
                                            shifted_energy: 0
            })
        }
        carAssignmentObject[experimentId][evStationId] = carObj
    }
    m.context.log.write(`experimentId: ${body[evStationId]}`)
    m.context.log.write(`/rest/updateCars for: ${evStationId}`)
    m.context.log.write(`car occupation: ${body[evStationId]}`)
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
    // remove carAssignment for same element, TODO: MAYBE CHANGE IT SO THAT WE CAN SAVE THE CURRENT SOC AND CHARGING STUFF 
    // if (carAssignmentObject[experimentId].length){
    //     for (var evStationKey in Object.keys(carAssignmentObject[experimentId])){
    //         if (evStationKey === evStationId){
    //             // remove this element from array carAssignment
    //             delete carAssignmentObject[experimentId][evStationKey]
    //         }
    //     }
    // }
    const carObj = carAssignmentObject[experimentId][evStationId] as CarObj
    let i = 0
    let slotShiftedSum = 0
    for (const slot of carObj.ecar_assignment_slots){
        // if the car in the slot changed, then reset charge
        if( slot.ecar_id != body[evStationId][i]){
            slot.ecar_id = body[evStationId][i]
            slot.charge_max = config.structureTypes.evStation.carStats[body[evStationId][i]].carMaxCap
            slot.charge = slot.charge_max*0.15
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
//     let length = 3;
//     let carObj:CarObj = {
//         ecar_assignment_slots_number: 3,
//         ecar_assignment_slots : []
//     }
//    // register occupation for all slots
//     for(var i = 0; i < 3; i++){
//         carObj.ecar_assignment_slots.push({"ecar_id": parseInt(body[evStationId][i])})
//     }
//     if (carAssignmentObject[experimentId].length == 0){
//         carAssignmentObject[experimentId] = [carObj]
//     }else{
//         carAssignmentObject[experimentId][evStationId] = carObj
//     }
//     carObj["ecar_assignment_slots_number"] = length
    // try{
    //     m.context.log.write('writing')
    //     fs.writeFileSync(`./data/ev_files/ecar_assignment_${experimentId}.json`, JSON.stringify(carAssignmentObject[experimentId]));
    //     m.context.log.write(`car assignment for experiment ${experimentId} successfully written`)
    // }catch(e){
    //     m.context.log.write(e)
    //     reply.status(200).send(JSON.stringify({
    //         message: "failure, try and catch failure"
    //     }))
    //     return
    // }
    // Reply to the frontend
    reply.status(200).send(JSON.stringify({
        message: "success"
    }))
});

// Load CSV profile data
const csvFilePath = 'data/csv/profile-data.csv';
readCSVtoDict(csvFilePath)
    .then(() => {
        m.context.log.write("CSV Data loaded!");
    })
    .catch((error) => {
        m.context.log.write('Error reading CSV Data:', error);
    });

m.start()