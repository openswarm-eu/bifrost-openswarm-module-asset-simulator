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
    TYPEID, 
        } from './src/types.js'
import { 
    readCSVtoDict, 
    csvData 
        } from './src/tools.js'
import  { BifrostZeroModule } from 'bifrost-zero-sdk'
import  { 
    CHARGING_STATION_POWER_MAPPING,
    PV_SYSTEM_POWER_MAPPING,
    TYPEID_LOCAL 
        } from './data/fragment/local_types.js'
import { updateBatterySystem } from './src/components/battery-system.js'
import { updateGridSensors } from './src/components/sensor.js'
import { 
    init, 
    localStorage 
        } from './src/init.js'

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

                        // calculate the charging power of each of the charging slots
                        for (let i = 0; i < pStruct.evCharger.chargingSlots; i++){
                            chgPowerDemand  += wData["EV"]
                            chgPowerShifted += wData["EV"]
                            chgPowerLimit   += pStruct.evCharger.maxPowerPerSlot
                        }

                        if (pStruct.evCharger.shiftedEnergy > 0){
                            let newChgPower = chgPowerShifted + pStruct.evCharger.shiftedEnergy
                            if (newChgPower > chgPowerLimit){
                                newChgPower = chgPowerLimit
                            } 

                            pStruct.evCharger.shiftedEnergy = pStruct.evCharger.shiftedEnergy - (newChgPower - chgPowerShifted)
                            chgPowerShifted = newChgPower
                        
                        }
                        // check if the resulting charging power is higher than the max power of the charging station
                        let chgPowerSetPoint = dynamicsById[pStruct.evMaxApId]
                        if (chgPowerShifted > chgPowerSetPoint){
                            chgPowerActual = chgPowerSetPoint
                            pStruct.evCharger.shiftedEnergy += chgPowerShifted - chgPowerSetPoint
                        } else {
                            chgPowerActual = chgPowerShifted
                        }

                        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Power_Demand]   = chgPowerDemand
                        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Actual_Power]   = chgPowerActual
                        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Shifted_Demand] = chgPowerShifted
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
    moduleURL      : process.env.MODULE_URL  || 'http://localhost:1808',
    bifrostURL     : process.env.BIFROST_URL || 'http://localhost:9091',
    hook           : process.env.HOOK ? JSON.parse(process.env.HOOK) : [100, 910]
})

const csvFilePath = 'data/csv/profile-data.csv';
readCSVtoDict(csvFilePath)
    .then(() => {
        m.context.log.write("CSV Data loaded!");
    })
    .catch((error) => {
        m.context.log.write('Error reading CSV Data:', error);
    });

m.start()