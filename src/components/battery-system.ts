// src/components/update-battery-system.ts
import { BifrostZeroModule } from 'bifrost-zero-sdk';
import { BATTERY_SYSTEM_POWER_MAPPING, BATTERY_SYSTEM_MAX_POWER_MAPPING } from '../../data/fragment/local_types.js';
import { DataFrame } from 'bifrost-zero-common';
import { batterySimulatorType } from '../types.js';

export function updateBatterySystem(dynamicsById, batterySystem: batterySimulatorType, m: BifrostZeroModule, result: DataFrame) {
    let batSocCurrent  = dynamicsById[batterySystem.dynamicId.soc];
    let batCapacity    = dynamicsById[batterySystem.dynamicId.capacity];
    let batPowerLimit  = dynamicsById[batterySystem.dynamicId.maxPower];
    let batPowerResult = [0, 0, 0];
    let batPowerActual = 0;

    // adjust the current SOC in case, the capacity was changed
    if (batterySystem.storedEnergy >= 0) {
        // calculate the stored energy based on the dynamics
        let batStoredEnergyCurrent = batSocCurrent * batCapacity / 100;
        // compare it with the stored energy in the battery system from the previous simulation step
        if (batStoredEnergyCurrent !== batterySystem.storedEnergy) {
            // adjust the current SOC of the battery to the stored energy level. This happens, when the capacity of the battery system was changed.
            if (batCapacity <= 0) {
                batSocCurrent = 0;
            } else {
                batSocCurrent = (batterySystem.storedEnergy / batCapacity) * 100;
                // limit the SoC to 0-100%
                if (batSocCurrent > 100) {
                    batSocCurrent = 100;
                } else if (batSocCurrent < 0) {
                    batSocCurrent = 0;
                }
            }
        }
    }

    // calculate the possible charge and discharge power in the current simulation step based on the current SoC and capacity
    let batPossibleChargePowerSimulationStep = ( batCapacity * ( (100 - batSocCurrent) / 100 )) / ( m.samplingRate / 3600 );
    if (batPossibleChargePowerSimulationStep > batterySystem.chargePower){
        batPossibleChargePowerSimulationStep = batterySystem.chargePower;
    }
    let batPossibleDischargePowerSimulationStep = ( batCapacity * ( batSocCurrent / 100 )) / (m.samplingRate / 3600);
    if (batPossibleDischargePowerSimulationStep > batterySystem.dischargePower){
        batPossibleDischargePowerSimulationStep = batterySystem.dischargePower;
    }

    // perform the battery operation based on the given power limits
    batPowerActual = batPowerLimit[BATTERY_SYSTEM_MAX_POWER_MAPPING.Charge_Limit] + batPowerLimit[BATTERY_SYSTEM_MAX_POWER_MAPPING.Discharge_Limit];
    if ((batPowerActual > 0) && (batPowerActual > batPossibleChargePowerSimulationStep)){
        batPowerActual = batPossibleChargePowerSimulationStep;
    } else if ((batPowerActual < 0) && (Math.abs(batPowerActual) > batPossibleDischargePowerSimulationStep)){
        batPowerActual = -batPossibleDischargePowerSimulationStep;
    }
    batPowerResult[BATTERY_SYSTEM_POWER_MAPPING.Actual_Power] = batPowerActual;

    // update the SoC based on the actual power and the capacity
    if (batCapacity <= 0) {
        batSocCurrent = 0;
    } else {
        batSocCurrent += (batPowerActual / batCapacity) * (m.samplingRate / 3600) * 100;
    }

    // limit the SoC to 0-100%
    if (batSocCurrent > 100){
        batSocCurrent = 100;
    } else if (batSocCurrent < 0){
        batSocCurrent = 0;
    }

    // again calculate the possible charge and discharge power, now for the next simulation step
    batPossibleChargePowerSimulationStep = ( batCapacity * ( (100 - batSocCurrent) / 100 )) / ( m.samplingRate / 3600 );
    if (batPossibleChargePowerSimulationStep > batterySystem.chargePower){
        batPossibleChargePowerSimulationStep = batterySystem.chargePower;
    }
    batPossibleDischargePowerSimulationStep = ( batCapacity * ( batSocCurrent / 100 )) / (m.samplingRate / 3600);
    if (batPossibleDischargePowerSimulationStep > batterySystem.dischargePower){
        batPossibleDischargePowerSimulationStep = batterySystem.dischargePower;
    }
    batPowerResult[BATTERY_SYSTEM_POWER_MAPPING.Charge_Potential] = batPossibleChargePowerSimulationStep;
    batPowerResult[BATTERY_SYSTEM_POWER_MAPPING.Discharge_Potential] = -batPossibleDischargePowerSimulationStep;

    result.addSeries({dynamicId:batterySystem.dynamicId.soc,values:[batSocCurrent]});
    result.addSeries({dynamicId:batterySystem.dynamicId.activePower,values:[batPowerResult]});
    
    // update the stored energy based on the current SoC and capacity
    batterySystem.storedEnergy = batSocCurrent * batCapacity / 100; 

    return batPowerActual; // if you need to use it for sumLoad
}