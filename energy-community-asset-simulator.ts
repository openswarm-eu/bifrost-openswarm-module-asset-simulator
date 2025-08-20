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
    TState                 } from 'bifrost-zero-common'
import { BifrostZeroModule } from 'bifrost-zero-sdk'
import { TYPEID_LOCAL      } from './data/fragment/local_types.js'
import { TYPEID            } from './src/types.js'
import { readCSVtoDict     } from './src/tools.js'
import { init              } from './src/init.js'
import { update            } from './src/update.js'
import { loadConfig        } from './src/config.js'

const csvFilePath = 'data/csv/profile-data.csv'

// Module logic
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

// Create the BifrostZero module instance
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

// Load the module config
loadConfig(m.context);

// Load CSV profile data
readCSVtoDict(csvFilePath, m.context)

// Start the module
m.start()