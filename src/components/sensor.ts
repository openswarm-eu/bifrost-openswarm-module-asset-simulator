/**
 * Grid Sensor Component
 *
 * This module handles the updating of grid sensor values in the energy community asset simulator.
 * It processes sensor data including power measurements and flow directions.
 */

import { DataFrame, Log, TModuleContext } from 'bifrost-zero-common'
import { SENSOR_NAMES, SENSOR_DIRECTIONS } from '../../data/fragment/local_types.js'
import { localStorage } from '../init.js'

/**
 * Updates all grid sensors with their current power measurements
 * @param dynamicsById - Object containing all dynamic values indexed by their IDs
 * @param experimentId - ID of the current experiment
 * @param result - DataFrame to add the updated sensor values to
 * @param context - Module context for logging
 */
export function updateGridSensors(
    dynamicsById: any,
    experimentId: string,
    result: DataFrame,
    context: TModuleContext
): void {
    
    context.log.write('Processing grid sensors update', Log.level.DEBUG)
    
    for (const sensorId of localStorage[experimentId].allGridSensors) {
        const sStruct = localStorage[experimentId].byGridSensor[sensorId]
        
        // if sensor is not active, set it to inactive state
        if (!sStruct.isActive) {
            // set the sensor name to "Inactive"
            result.addSeries({dynamicId: sStruct.nameId, values: [SENSOR_NAMES.INACTIVE]})
            result.addSeries({dynamicId: sStruct.powerMeasurementId, values: [0]})
            continue
        }
        
        // get the value of the sensor name
        const sensorName = dynamicsById[sStruct.nameId]
        if (sensorName == SENSOR_NAMES.INACTIVE) {
            result.addSeries({dynamicId: sStruct.powerMeasurementId, values: [0]})
            continue
        } else {
            const cablePower = dynamicsById[sStruct.cablePowerId]
            
            // get the power flow scaling factor, which is -1 if powerFlowDirection is "DOWN" and 1 if it is "UP"
            const powerFlowDirection = dynamicsById[sStruct.powerFlowDirectionId]
            let powerFlowScalingFactor = 1
            if (powerFlowDirection === SENSOR_DIRECTIONS.DOWN) {
                powerFlowScalingFactor = -1
            }
            
            // calculate the power value 
            const measuredPower = powerFlowScalingFactor * (
                cablePower[0] + 
                cablePower[1] + 
                cablePower[2]) / 3
            // write the sensor value
            result.addSeries({dynamicId: sStruct.powerMeasurementId, values: [measuredPower]})
        }
    }
}
