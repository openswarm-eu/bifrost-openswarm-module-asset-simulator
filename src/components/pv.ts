/**
 * PV System Component
 * 
 * This file contains the logic for updating PV (photovoltaic) systems,
 * including potential and actual power infeed calculations.
 */

import { DataFrame            } from 'bifrost-zero-common'
import { INFEED_POWER_MAPPING } from '../../data/fragment/local_types.js'

export function updatePvSystem(
    dynamicsById: any,
    pStruct: any,
    wData: any,
    seasonCode: string,
    result: DataFrame
): number {
    let pvInfeedResult    = [0, 0]
    let pvInfeedPotential = wData["PV-"+seasonCode] * pStruct.solarSystem.scaleFactor * dynamicsById[pStruct.pvInstalledPowerApId]
    let pvInfeedActual    = pvInfeedPotential
    
    if (-pvInfeedPotential > dynamicsById[pStruct.pvMaxApId]){
        pvInfeedActual = -dynamicsById[pStruct.pvMaxApId]
    }
    // write the values to the result DataFrame
    pvInfeedResult[INFEED_POWER_MAPPING.Infeed_Potential] = -pvInfeedPotential
    pvInfeedResult[INFEED_POWER_MAPPING.Actual_Infeed]    = -pvInfeedActual
    result.addSeries({dynamicId:pStruct.pvApId,values:[pvInfeedResult]})

    return pvInfeedActual
}
