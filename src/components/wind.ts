/**
 * Wind Turbine Component
 * 
 * This file contains the logic for updating wind turbines,
 * including power calculation and wind speed determination.
 */

import { DataFrame           } from 'bifrost-zero-common'
import { 
    INFEED_POWER_MAPPING,
    WIND_TURBINE_WIND_SPEEDS } from '../../data/fragment/local_types.js'
import { config              } from '../config.js'

export function updateWindTurbine(
    dynamicsById: any,
    pStruct: any,
    wData: any,
    result: DataFrame
): number {
    let windPowerResult    = [0, 0]
    let windPowerPotential = 0
    let windPowerActual    = 0

    const windSpeedSelected = dynamicsById[pStruct.windSpeedSelectionId]
    if (windSpeedSelected !== WIND_TURBINE_WIND_SPEEDS.NONE){
        windPowerPotential = wData["WIND-"+windSpeedSelected] * pStruct.windTurbine.windSpeedScaleFactor * pStruct.windTurbine.windSpeedToPowerFactor
        windPowerActual    = windPowerPotential
    }
    
    if (windPowerActual > dynamicsById[pStruct.windMaxApId]){
        windPowerActual = dynamicsById[pStruct.windMaxApId]
    }

    // Calculate the resulting wind speed based on actual power (includes than scaling of windspeed with windSpeedScaleFactor)
    let resultingWindSpeed = windPowerActual / (pStruct.windTurbine.windSpeedToPowerFactor)
    if (resultingWindSpeed > config.windTurbine.maxWindSpeed){
        // Limit to max wind speed
        resultingWindSpeed = config.windTurbine.maxWindSpeed
    }
    if ((windPowerActual > 0) && (resultingWindSpeed < config.windTurbine.minWindSpeed)){
        // Ensure minimum wind speed if there is any power
        resultingWindSpeed = config.windTurbine.minWindSpeed
    }
    
    // write the values to the result DataFrame
    result.addSeries({dynamicId:pStruct.windVelocityId,values:[resultingWindSpeed]})
    windPowerResult[INFEED_POWER_MAPPING.Infeed_Potential] = windPowerPotential
    windPowerResult[INFEED_POWER_MAPPING.Actual_Infeed]    = windPowerActual
    result.addSeries({dynamicId:pStruct.windApId,values:[windPowerResult]})

    return windPowerActual
}
