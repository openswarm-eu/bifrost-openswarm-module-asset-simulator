/**
 * EV Charging Station Component
 * 
 * This file contains the logic for updating EV charging stations,
 * including power distribution, car charging, and SOC calculations.
 */

import { DataFrame                      } from 'bifrost-zero-common'
import { BifrostZeroModule              } from 'bifrost-zero-sdk'
import { CHARGING_STATION_POWER_MAPPING } from '../../data/fragment/local_types.js'
import { carAssignmentObject            } from '../init.js'
import { config                         } from '../config.js'
import { CarObj                         } from '../types.js'

export function updateEvCharger(
    dynamicsById: any,
    pStruct: any,
    wData: any,
    experimentId: string,
    m: BifrostZeroModule,
    result: DataFrame
): number {
    let chgPowerResult  = [0, 0]
    let chgPowerDemand  = 0
    let chgPowerActual  = 0
    let chgPowerShifted = 0
    let newChargePower  = 0
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
                    carinSlot.shifted_energy = 0
                    carinSlot.ecar_color = carStats[ecar_id].carColor
                    carinSlot.charge_max = Number(carStats[ecar_id].carMaxCap)
                    carinSlot.charge_power_max = carStats[ecar_id].carPower * config.structureTypes.evStation.evCharger.increasedChargePower
                    carinSlot.charge = carStats[ecar_id].carMaxCap * config.structureTypes.evStation.evCharger.initialChargePercent
                }
            }
            // calculate the charging power for this car
            let curCarPower = Number(carStats[carinSlot.ecar_id].carPower)
            const curCarCharge = carinSlot.charge
            // check if the car is already fully charged
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
        pStruct.evCharger.shiftedEnergy += chgPowerDemand - chgPowerSetPoint
    }
    
    if (pStruct.evCharger.shiftedEnergy > 0){
        newChargePower = chgPowerSetPoint + pStruct.evCharger.shiftedEnergy
        if (newChargePower > chgPowerLimit){
            newChargePower = chgPowerLimit
        }
    }

    // ensure that the shifted charging power is not lower than the demand
    if (newChargePower < chgPowerDemand) {
        newChargePower = chgPowerDemand
    }

    // check if the resulting charging power is higher than the max power of the charging station
    if (newChargePower > chgPowerSetPoint){
        chgPowerActual = chgPowerSetPoint
    } else {
        chgPowerActual = newChargePower
        if (pStruct.evCharger.shiftedEnergy < 0){
            chgPowerActual = pStruct.evCharger.shiftedEnergy + chgPowerSetPoint
            pStruct.evCharger.shiftedEnergy = 0
        }
    }

    chgPowerResult[CHARGING_STATION_POWER_MAPPING.Power_Demand]   = chgPowerDemand
    chgPowerResult[CHARGING_STATION_POWER_MAPPING.Actual_Power]       = chgPowerActual
    if (newChargePower > (pStruct.evCharger.shiftedEnergy + chgPowerDemand)){
        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Shifted_Demand] = pStruct.evCharger.shiftedEnergy + chgPowerDemand
    } else {
        chgPowerResult[CHARGING_STATION_POWER_MAPPING.Shifted_Demand] = newChargePower
    }
    
    // Update the car charges in the carAssignmentObject
    if (Object.keys(carAssignmentObject[experimentId]).includes(pStruct.parentBuildingId)){
        const sumPower = chgPowerList.reduce((acc, current) => acc + current, 0)
        const carObj = carAssignmentObject[experimentId][pStruct.parentBuildingId] as CarObj
        let evSocResult: number[] = []
        let evColorResult: string[] = []
        for (let i = 0; i < pStruct.evCharger.chargingSlots; i++){
            let partPower = 0
            if (sumPower > 0){
                partPower = chgPowerList[i]/sumPower
            }
            const carId = carObj.ecar_assignment_slots[i].ecar_id
            let curCarPower = Number(carStats[carId].carPower)
            const chargedPower = chgPowerActual * partPower
            if (pStruct.evCharger.shiftedEnergy == 0) {
                carObj.ecar_assignment_slots[i].shifted_energy = 0
            } else {
                carObj.ecar_assignment_slots[i].shifted_energy += curCarPower - chargedPower
            }
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
            evColorResult.push(carObj.ecar_assignment_slots[i].ecar_color)
        }
        result.addSeries({dynamicId:pStruct.evSocId,values:[evSocResult]})
        result.addSeries({dynamicId:pStruct.evColorId,values:[evColorResult]})
    } else {
        // Update pStruct.evCharger.shiftedEnergy for non EV stations
        pStruct.evCharger.shiftedEnergy += (chgPowerDemand - chgPowerActual)
    }

    result.addSeries({dynamicId:pStruct.evApId,values:[chgPowerResult]})
    
    return chgPowerActual
}
