/**
 * Update logic for the OpenSwarm Asset Simulator Module
 * 
 * This file contains the main update logic for processing asset simulations
 * including PV systems, EV chargers, battery systems, and grid sensors.
 */

import { 
    DataFrame, 
    TModuleContext,
    Log                             } from 'bifrost-zero-common'
import { BifrostZeroModule          } from 'bifrost-zero-sdk'
import { updateBatterySystem        } from './components/battery-system.js'
import { updateGridSensors          } from './components/sensor.js'
import { 
    CHARGING_STATION_POWER_MAPPING,
    PV_SYSTEM_POWER_MAPPING         } from '../data/fragment/local_types.js'
import { 
    carAssignmentObject, 
    localStorage                    } from './init.js'
import { csvData                    } from './tools.js'
import { config                     } from './config.js'
import { CarObj                     } from './types.js'

export function update(
    storyId      : string, 
    experimentId : string, 
    startAt      : number, 
    simulationAt : number, 
    replayAt     : number, 
    data         : DataFrame, 
    context      : TModuleContext,
    m            : BifrostZeroModule
) : DataFrame {
    
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
            context.log.write('Processing PCG components update (load, pv, ev, battery)', Log.level.DEBUG)
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

                // except for EV-IDs, which cannot be interpolated
                for (let slotIndex = 1; slotIndex <= 3; slotIndex++) {
                    const evIdKey = "EV-ID_Slot" + slotIndex;
                    wData[evIdKey] = lowerData[evIdKey];
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

                    let chgPowerSetPoint = dynamicsById[pStruct.evMaxApId]
                    
                    // check if ev-station is in the struct from the mc
                    if (Object.keys(carAssignmentObject[experimentId]).includes(pStruct.parentBuildingId)){
                        const carObj = carAssignmentObject[experimentId][pStruct.parentBuildingId] as CarObj
                        pStruct.evCharger.chargingSlots = carObj.ecar_assignment_slots_number
                        let slotIndex = 0
                        for (const carinSlot of carObj.ecar_assignment_slots){
                            slotIndex += 1
                            if (process.env.REALITY_TWIN_MODE !== "true"){
                                // get the car id for this slot from the csv data
                                const ecar_id = wData["EV-ID_Slot"+slotIndex]
                                if (carinSlot.ecar_id != ecar_id){
                                    carinSlot.ecar_id = ecar_id
                                    carinSlot.charge_max = Number(carStats[ecar_id].carMaxCap)
                                    carinSlot.charge_power_max = carStats[ecar_id].carPower*6
                                    carinSlot.charge = carStats[ecar_id].carMaxCap*0.15
                                    carinSlot.shifted_energy = 0
                                }
                            }
                            // calculate the charging power for this car
                            let curCarPower = Number(carStats[carinSlot.ecar_id].carPower)*4
                            const curCarCharge = carinSlot.charge
                            if (curCarCharge >= carinSlot.charge_max){
                                curCarPower = 0
                                carinSlot.shifted_energy = 0
                            }
                            chgPowerList.push(curCarPower)
                            chgPowerDemand  += curCarPower
                            if (Number.isNaN(carinSlot.shifted_energy)){
                                carinSlot.shifted_energy = 0
                            }
                            chgPowerShifted += carinSlot.shifted_energy
                            chgPowerLimit   += carinSlot.charge_power_max
                        }
                        pStruct.evCharger.shiftedEnergy = chgPowerShifted + chgPowerDemand - chgPowerSetPoint
                    } else {
                        // calculate the charging power of each of the charging slots for non-ev-stations
                        for (let i = 0; i < pStruct.evCharger.chargingSlots; i++){
                            chgPowerDemand  += wData["EV"]
                            chgPowerShifted += wData["EV"]
                            chgPowerLimit   += pStruct.evCharger.maxPowerPerSlot
                        }
                        pStruct.evCharger.shiftedEnergy += chgPowerShifted - chgPowerSetPoint
                    }
                    
                    if (pStruct.evCharger.shiftedEnergy > 0){
                        let newChgPower = chgPowerSetPoint + pStruct.evCharger.shiftedEnergy
                        if (newChgPower > chgPowerLimit){
                            newChgPower = chgPowerLimit
                        }
                        // pStruct.evCharger.shiftedEnergy = pStruct.evCharger.shiftedEnergy + chgPowerShifted
                        // pStruct.evCharger.shiftedEnergy = pStruct.evCharger.shiftedEnergy - (newChgPower - chgPowerShifted)
                        chgPowerShifted = newChgPower
                    
                    }
                    // check if the resulting charging power is higher than the max power of the charging station
                    if (chgPowerShifted > chgPowerSetPoint){
                        chgPowerActual = chgPowerSetPoint
                        // pStruct.evCharger.shiftedEnergy += chgPowerShifted - chgPowerSetPoint
                    } else {
                        chgPowerActual = chgPowerShifted
                        if (pStruct.evCharger.shiftedEnergy < 0){
                            chgPowerActual = pStruct.evCharger.shiftedEnergy + chgPowerSetPoint
                            pStruct.evCharger.shiftedEnergy = 0
                        }
                    }

                    chgPowerResult[CHARGING_STATION_POWER_MAPPING.Power_Demand]   = chgPowerDemand
                    chgPowerResult[CHARGING_STATION_POWER_MAPPING.Actual_Power]   = chgPowerActual
                    if (chgPowerShifted > (pStruct.evCharger.shiftedEnergy + chgPowerDemand)){
                        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Shifted_Demand] = pStruct.evCharger.shiftedEnergy + chgPowerDemand
                    }else{
                        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Shifted_Demand] = chgPowerShifted
                    }
                    
                    // Update the car charges in the carAssignmentObject
                    if (Object.keys(carAssignmentObject[experimentId]).includes(pStruct.parentBuildingId)){
                        const sumPower = chgPowerList.reduce((acc, current) => acc + current, 0)
                        const carObj = carAssignmentObject[experimentId][pStruct.parentBuildingId] as CarObj
                        pStruct.evCharger.shiftedEnergy = 0
                        let evSocResult: number[] = []
                        for (let i = 0; i < pStruct.evCharger.chargingSlots; i++){
                            let partPower = 0
                            if (sumPower > 0){
                                partPower = chgPowerList[i]/sumPower
                            }
                            const carId = carObj.ecar_assignment_slots[i].ecar_id
                            let curCarPower = Number(carStats[carId].carPower)*4
                            const chargedPower = chgPowerActual * partPower
                            carObj.ecar_assignment_slots[i].shifted_energy += curCarPower - chargedPower
                            carObj.ecar_assignment_slots[i].charge += chargedPower*m.samplingRate/3600
                            if (carObj.ecar_assignment_slots[i].charge >= carObj.ecar_assignment_slots[i].charge_max){
                                carObj.ecar_assignment_slots[i].charge = carObj.ecar_assignment_slots[i].charge_max
                                carObj.ecar_assignment_slots[i].shifted_energy = 0
                            }
                            // calculate SOC for each car slot and prepare result array
                            let slotSOC = (carObj.ecar_assignment_slots[i].charge / carObj.ecar_assignment_slots[i].charge_max) * 100
                            if (isNaN(slotSOC)){
                                slotSOC = 0
                            }
                            evSocResult.push(slotSOC)
                        }
                        result.addSeries({dynamicId:pStruct.evSocId,values:[evSocResult]})
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
            updateGridSensors (dynamicsById, experimentId, result, context)
        }
        
    } catch (error) {
        context.log.write(`Error: ${error}`, Log.level.ERROR)
    }
    
    return result
}
