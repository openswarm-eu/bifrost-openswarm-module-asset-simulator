/**
 * Update logic for the OpenSwarm Asset Simulator Module
 * 
 * This file contains the main update logic for processing asset simulations
 * including PV systems, EV chargers, battery systems, and grid sensors.
 */

import { 
    DataFrame, 
    TModuleContext,
    Log                      } from 'bifrost-zero-common'
import { BifrostZeroModule   } from 'bifrost-zero-sdk'
import { updateBatterySystem } from './components/battery-system.js'
import { updateGridSensors   } from './components/sensor.js'
import { updateEvCharger     } from './components/ev.js'
import { updateWindTurbine   } from './components/wind.js'
import { updatePvSystem      } from './components/pv.js'
import { localStorage        } from './init.js'
import { getInterpolatedData } from './tools.js'

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
            context.log.write('Processing PCG components update (load, pv, wind, ev, battery)', Log.level.DEBUG)
            
            //  time modulo so day repeats
            const dataTime = (startAt + simulationAt) % 86400
            // get the interpolated data for this time
            const wData = getInterpolatedData(dataTime, context)
            if (wData === null) {
                return result; // No data available for this time
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
            
            // loop over all PGCs
            for (const pgcId of localStorage[experimentId].allPGCs){
                const pStruct = localStorage[experimentId].byPGC[pgcId]
                let sumLoad = 0
                
                // add load power
                let loadPowerActual = wData["LD-"+SW] * pStruct.load.scaleFactor
                sumLoad += loadPowerActual
                
                // add PV power
                let pvInfeedActual = 0
                const hasPV = !!pStruct.pvApId
                if(hasPV){
                    pvInfeedActual = updatePvSystem(dynamicsById, pStruct, wData, SW, result)
                    // add to total active power
                    sumLoad += pvInfeedActual
                }

                // add wind power
                let windInfeedActual = 0
                const hasWind = !!pStruct.windApId
                if(hasWind){
                    windInfeedActual = updateWindTurbine(dynamicsById, pStruct, wData, result)
                    // add to total active power (windpower = infeed -> subtract from current power!)
                    sumLoad -= windInfeedActual
                }

                // add EV charging power
                let evChgPowerActual = 0
                const hasEV = !!pStruct.evApId
                if(hasEV){
                    evChgPowerActual = updateEvCharger(dynamicsById, pStruct, wData, experimentId, m, result)
                    sumLoad += evChgPowerActual
                }

                // add battery power
                let batPowerActual = 0
                const hasBattery = !!pStruct.batterySystem.dynamicId.activePower
                if(hasBattery){
                    batPowerActual = updateBatterySystem (dynamicsById, pStruct.batterySystem, m, result);
                    sumLoad += batPowerActual;
                }
                
                // check if sumLoad is not NaN or infinite or undefined. If so, set to 0 and give a warning
                if (Number.isNaN(sumLoad) || !Number.isFinite(sumLoad) || sumLoad === undefined){
                    context.log.write(`Warning: sumLoad for PGC ${pgcId} is invalid (${sumLoad}). Setting to 0.`, Log.level.WARNING)
                    // print detailed information about the contributing powers
                    context.log.write(`Detailed power contributions:`, Log.level.WARNING)
                    context.log.write(`  Load: ${loadPowerActual} W`, Log.level.WARNING)
                    context.log.write(`  PV (${hasPV ? 'enabled' : 'disabled'}): ${pvInfeedActual} W`, Log.level.WARNING)
                    context.log.write(`  Wind (${hasWind ? 'enabled' : 'disabled'}): ${windInfeedActual} W`, Log.level.WARNING)
                    context.log.write(`  EV (${hasEV ? 'enabled' : 'disabled'}): ${evChgPowerActual} W`, Log.level.WARNING)
                    context.log.write(`  Battery (${hasBattery ? 'enabled' : 'disabled'}): ${batPowerActual} W`, Log.level.WARNING)
                    sumLoad = 0
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
