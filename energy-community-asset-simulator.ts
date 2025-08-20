/**
 * OpenSwarm Asset Simulator Module
 *
 * This file implements a BifrostZero module for simulating energy community assets
 * (such as batteries, PV systems, EV chargers, and grid sensors) in the OpenSwarm PoC1 environment.
 * It provides initialization and update logic, loads CSV profile data, and exposes module configuration.
 */

import  { 
    DataFrame, 
    TModuleContext, 
    TState,
    Log
        } from 'bifrost-zero-common'
import  { 
    CarAssignment,
    CarObj,
    TYPEID, 
        } from './src/types.js'
import { 
    readCSVtoDict, 
    csvData, 
    updateDynamic
        } from './src/tools.js'
import  { BifrostZeroModule } from 'bifrost-zero-sdk'
import  { 
    CHARGING_STATION_POWER_MAPPING,
    PV_SYSTEM_POWER_MAPPING,
    SENSOR_DIRECTIONS,
    SENSOR_NAMES, 
    TYPEID_LOCAL 
        } from './data/fragment/local_types.js'
import { updateBatterySystem } from './src/components/battery-system.js'
import { 
    carAssignmentObject, 
    localStorage, 
    init 
        } from './src/init.js'
import { config } from './src/config.js'

const logic = { 
    initFn: (storyId: string, experimentId: string, state: TState, context: TModuleContext) => { 
        context.log.write(`Init from [${storyId}/${experimentId}]`)
        const initResult: DataFrame = init(storyId, experimentId, state, context)
        return initResult
    },

    updateFn: (storyId: string, experimentId: string, startAt:number, simulationAt: number, replayAt: number, data: DataFrame, context: TModuleContext) => {
        context.log.write(`Update from [${storyId}/${experimentId}] @ ${simulationAt}`)
        // extract subscriptionData out of dataFrame
        var dynamicsById = {}
        if(!data.isEmpty()){
            for (const dynamicObj of data.series) {
                dynamicsById[dynamicObj.dynamicId] = dynamicObj.values[0]
            }
        }
        const result: DataFrame = new DataFrame()
        result.setTime(simulationAt)
        if (localStorage[experimentId].lastUpdate !== simulationAt){
            localStorage[experimentId].lastUpdate = simulationAt
            localStorage[experimentId].numberUpdate = 1
        } else {
            localStorage[experimentId].numberUpdate += 1
        }
        
        try {
            // update asset values
            if (localStorage[experimentId].numberUpdate == 1){
                // give as debug information the hook which is processed here
                context.log.write(`Processing hook ${m.hook[localStorage[experimentId].numberUpdate-1]}`, Log.level.DEBUG)
                let   wData = {};
                //  time modulo so day repeats
                const dataTime = (startAt + simulationAt) % 86400
                // check if the dataTime is in the csvData
                if (!csvData.hasOwnProperty(dataTime)) {
                    // if not, make a linear interpolation
                    const keys = Object.keys(csvData).map(Number).sort((a, b) => a - b);
                    let lowerKey = keys[0];
                    let upperKey = keys[keys.length - 1];
                    for (let i = 0; i < keys.length; i++) {
                        if (keys[i] <= dataTime) {
                            lowerKey = keys[i];
                        }
                        if (keys[i] > dataTime) {
                            upperKey = keys[i];
                            break;
                        }
                    }
                    if (lowerKey === undefined || upperKey === undefined) {
                        context.log.write(`No data available for time ${dataTime}`, Log.level.WARNING);
                        return result; // No data available for this time
                    }
                    // perform linear interpolation
                    const lowerData = csvData[lowerKey];
                    const upperData = csvData[upperKey];
                    const interpolationFactor = (dataTime - lowerKey) / (upperKey - lowerKey);
                    for (const key in lowerData) {
                        if (lowerData.hasOwnProperty(key) && upperData.hasOwnProperty(key)) {
                            wData[key] = lowerData[key] + interpolationFactor * (upperData[key] - lowerData[key]);
                        }
                    }
                } else {
                    wData = csvData[dataTime]
                }
                
                // check, if summer or winter
                let SW = ""
                const SUMMER_START = 6739200;   // ~March 21st in seconds
                const SUMMER_END = 22809600;    // ~September 21st in seconds
                if (startAt > SUMMER_START && startAt < SUMMER_END){
                    SW = "S"
                }else{
                    SW = "W"
                }
                
                for (const pgcId of localStorage[experimentId].allPGCs){
                    const pStruct = localStorage[experimentId].byPGC[pgcId]
                    let sumLoad = 0
                    
                    // add load power
                    let loadPowerResult = wData["LD-"+SW] * pStruct.load.scaleFactor
                    sumLoad += loadPowerResult
                    
                    // add PV power
                    if(pStruct.pvApId){
                        let pvInfeedResult    = [0, 0]
                        let pvInfeedPotential = wData["PV-"+SW] * pStruct.solarSystem.scaleFactor
                        let pvInfeedActual    = pvInfeedPotential
                        
                        if (-pvInfeedPotential > dynamicsById[pStruct.pvMaxApId]){
                            pvInfeedActual = -dynamicsById[pStruct.pvMaxApId]
                        }
                        // write the values to the result DataFrame
                        pvInfeedResult[PV_SYSTEM_POWER_MAPPING.Infeed_Potential] = -pvInfeedPotential
                        pvInfeedResult[PV_SYSTEM_POWER_MAPPING.Actual_Infeed]    = -pvInfeedActual
                        result.addSeries({dynamicId:pStruct.pvApId,values:[pvInfeedResult]})
                        sumLoad += pvInfeedActual
                    }

                    // add EV charging power
                    if(pStruct.evApId){
                        let chgPowerResult  = [0, 0]
                        let chgPowerDemand  = 0
                        let chgPowerActual  = 0
                        let chgPowerShifted = 0
                        let chgPowerLimit   = 0
                        let carStats = config.structureTypes.evStation.carStats
                        const chgPowerList: number[] = []
                        // check if ev-station is in the struct from the mc
                        if (Object.keys(carAssignmentObject[experimentId]).includes(pStruct.parentBuildingId)){
                            const carObj = carAssignmentObject[experimentId][pStruct.parentBuildingId] as CarObj
                            pStruct.evCharger.chargingSlots = carObj.ecar_assignment_slots_number
                            for (const carinSlot of carObj.ecar_assignment_slots){
                                const carId = carinSlot.ecar_id
                                let curCarPower = Number(carStats[carId].carPower)
                                const curCarCharge = carinSlot.charge
                                if (curCarCharge >= carinSlot.charge_max){
                                    curCarPower = 0
                                }
                                chgPowerList.push(curCarPower)
                                chgPowerDemand  += curCarPower
                                chgPowerShifted += curCarPower
                                chgPowerLimit   += pStruct.evCharger.maxPowerPerSlot
                            }
                        }else{
                            // calculate the charging power of each of the charging slots for non-ev-stations
                            for (let i = 0; i < pStruct.evCharger.chargingSlots; i++){
                                chgPowerDemand  += wData["EV"]
                                chgPowerShifted += wData["EV"]
                                chgPowerLimit   += pStruct.evCharger.maxPowerPerSlot
                            }
                        }
                        
                        let chgPowerSetPoint = dynamicsById[pStruct.evMaxApId]
                        pStruct.evCharger.shiftedEnergy += chgPowerShifted - chgPowerSetPoint
                        if (pStruct.evCharger.shiftedEnergy > 0){
                            let newChgPower = chgPowerShifted + pStruct.evCharger.shiftedEnergy
                            if (newChgPower > chgPowerLimit){
                                newChgPower = chgPowerLimit
                            } 
                            // pStruct.evCharger.shiftedEnergy = pStruct.evCharger.shiftedEnergy + chgPowerShifted
                            //pStruct.evCharger.shiftedEnergy = pStruct.evCharger.shiftedEnergy - (newChgPower - chgPowerShifted)
                            chgPowerShifted = newChgPower
                        
                        }
                        // check if the resulting charging power is higher than the max power of the charging station
                        if (chgPowerShifted > chgPowerSetPoint){
                            chgPowerActual = chgPowerSetPoint
                            // pStruct.evCharger.shiftedEnergy += chgPowerShifted - chgPowerSetPoint
                        } else {
                            chgPowerActual = chgPowerShifted
                        }

                        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Power_Demand]   = chgPowerDemand
                        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Actual_Power]   = chgPowerActual
                        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Shifted_Demand] = chgPowerShifted
                        // again, check if it was 
                        if (Object.keys(carAssignmentObject[experimentId]).includes(pStruct.parentBuildingId)){
                            const sumPower = chgPowerList.reduce((acc, current) => acc + current, 0)
                            const partPower = chgPowerActual/sumPower || 1 
                            const carObj = carAssignmentObject[experimentId][pStruct.parentBuildingId] as CarObj
                            // need to reduce the power which can be actually charged for the evcars
                            // if partPower != 1 then it should be reduced
                            for (let i = 0; i < pStruct.evCharger.chargingSlots; i++){
                                const carId = carObj.ecar_assignment_slots[i].ecar_id
                                let curCarPower = Number(carStats[carId].carPower)
                                const chargedPower = chgPowerSetPoint * partPower
                                carObj.ecar_assignment_slots[i].shifted_energy += curCarPower - chargedPower
                                carObj.ecar_assignment_slots[i].charge += chargedPower*m.samplingRate/3600
                            }
                        }
                        result.addSeries({dynamicId:pStruct.evApId,values:[chgPowerResult]})
                        sumLoad += chgPowerActual
                    }

                    // add battery power
                    if(pStruct.batterySystem.dynamicId.activePower){
                        const batPowerActual = updateBatterySystem (dynamicsById, pStruct.batterySystem, m, result);
                        sumLoad += batPowerActual;
                    }
                    
                    // calculate the resulting load value
                    const resultLoad = (sumLoad/3)
                    result.addSeries({dynamicId:pStruct.pgcApId,values:[[resultLoad,resultLoad,resultLoad]]})
                }
            }
            
            // update the grid sensor values
            if (localStorage[experimentId].numberUpdate == 2){
                context.log.write(`Processing hook ${m.hook[localStorage[experimentId].numberUpdate-1]}`, Log.level.DEBUG)
                for (const sensorId of localStorage[experimentId].allGridSensors){
                    const sStruct = localStorage[experimentId].byGridSensor[sensorId]
                    
                    // if sensor is conected to more than 2 cables, then skip this sensor
                    if (!sStruct.isActive){
                        // set the sensor name to "Inactive"
                        result.addSeries({dynamicId:sStruct.nameId,values:[SENSOR_NAMES.INACTIVE]})
                        result.addSeries({dynamicId:sStruct.powerMeasurementId,values:[0]})
                        continue
                    }
                    
                    // get the value of the sensor name
                    const sensorName = dynamicsById[sStruct.nameId]
                    if (sensorName == SENSOR_NAMES.INACTIVE){
                        result.addSeries({dynamicId:sStruct.powerMeasurementId,values:[0]})
                        continue
                    } else { 
                        const cablePower = dynamicsById[sStruct.cablePowerId]
                        
                        // get the power flow scaling factor, which is -1 if powerFlowDirection is "DOWN" and 1 if it is "UP"
                        const powerFlowDirection = dynamicsById[sStruct.powerFlowDirectionId]
                        let powerFlowScalingFactor = 1
                        if (powerFlowDirection === SENSOR_DIRECTIONS.DOWN){ 
                            powerFlowScalingFactor = -1
                        }
                        
                        // calculate the power value 
                        const measuredPower = powerFlowScalingFactor * (
                                            cablePower[0] + 
                                            cablePower[1] + 
                                            cablePower[2] ) / 3
                        // write the sensor value
                        result.addSeries({dynamicId:sStruct.powerMeasurementId,values:[measuredPower]})
                    } 
                }
            }
            
        } catch (error) {
            context.log.write(`Error: ${error}`, Log.level.ERROR)
        }
        return result
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

const csvFilePath = 'data/csv/profile-data.csv';
readCSVtoDict(csvFilePath)
    .then(() => {
        m.context.log.write("CSV Data loaded!");
    })
    .catch((error) => {
        m.context.log.write('Error reading CSV Data:', error);
    });

m.start()