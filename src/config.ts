/**
 * Configuration file for Energy Community Asset Simulator
 * Contains all configurable values used throughout the simulation
 */

export interface AssetConfig {
    // General battery system defaults
    batterySystem: {
        chargePower: number;
        dischargePower: number;
    };
    // Default load configuration for PGC (Power Grid Connector) components
    load: {
        scaleFactor: number;
    };
    // Default solar system configuration for PGC (Power Grid Connector) components
    solarSystem: {
        scaleFactor: number;
    };
    // Default EV charger configuration for PGC (Power Grid Connector) components
    evCharger: {
        chargingSlots: number;
        maxPowerPerSlot: number;
    };
    // Structure-specific configurations
    structureTypes: {
        solarFarm: {
            solarSystem: {
                scaleFactor: number;
            };
            load: {
                scaleFactor: number;
            };
        };
        evStation: {
            evCharger: {
                chargingSlots: number;
            };
            load: {
                scaleFactor: number;
            };
            carStats: {
                [key: string]: {
                    carPower: number,
                    carMaxCap: number
                }
            }
        };
        smallHouse: {
            load: {
                scaleFactor: number;
            };
        };
        hugeHouse: {
            load: {
                scaleFactor: number;
            };
        };
        batteryStation: {
            batterySystem: {
                chargePower: number;
                dischargePower: number;
            };
            load: {
                scaleFactor: number;
            };
        };
    };
}

/**
 * Default configuration values
 * These can be overridden by YAML config file or environment variables
 */
export const defaultConfig: AssetConfig = {
    batterySystem: {
        chargePower: 5,
        dischargePower: 5
    },
    load: {
        scaleFactor: 1
    },
    solarSystem: {
        scaleFactor: 1
    },
    evCharger: {
        chargingSlots: 1,
        maxPowerPerSlot: 4
    },
    structureTypes: {
        solarFarm: {
            solarSystem: {
                scaleFactor: 8
            },
            load: {
                scaleFactor: 0
            }
        },
        evStation: {
            evCharger: {
                chargingSlots: 3
            },
            load: {
                scaleFactor: 0
            },
            carStats: {
                "-1": {
                    carPower:0,
                    carMaxCap:0
                },
                "0": {
                    carPower:1,
                    carMaxCap:10
                },
                "1": {
                    carPower:2,
                    carMaxCap:20
                },
                "2": {
                    carPower:3,
                    carMaxCap:30
                },
                "3": {
                    carPower:4,
                    carMaxCap:40
                },
                "4": {
                    carPower:5,
                    carMaxCap:50
                },
                "5": {
                    carPower:6,
                    carMaxCap:60
                },
                "6": {
                    carPower:7,
                    carMaxCap:70
                },
                "7": {
                    carPower:8,
                    carMaxCap:80
                },
                "8": {
                    carPower:9,
                    carMaxCap:90
                },
            }
        },
        smallHouse: {
            load: {
                scaleFactor: 2
            }
        },
        hugeHouse: {
            load: {
                scaleFactor: 10
            }
        },
        batteryStation: {
            batterySystem: {
                chargePower: 10,
                dischargePower: 10
            },
            load: {
                scaleFactor: 0
            }
        }
    }
};

// config storage
export let config: AssetConfig = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone of defaults

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { 
    Log, 
    TModuleContext } from 'bifrost-zero-common';

/**
 * Deep merge two objects, with values from the source object taking precedence
 * This ensures that missing properties in the source object retain their default values
 */
function deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                // Recursively merge nested objects
                result[key] = deepMerge(target[key] || {}, source[key]);
            } else {
                // Directly assign primitive values, arrays, or null values
                result[key] = source[key];
            }
        }
    }
    
    return result;
}

/**
 * Load configuration from YAML file and environment variables
 * Priority order:
 * 1. Environment Variables (highest priority)
 * 2. Local YAML config file (config/asset-config.local.yaml) - for testing
 * 3. Main YAML config file (config/asset-config.yaml)
 * 4. Default values (lowest priority)
 * 
 * Missing properties in YAML files will automatically fall back to default values
 */
export function loadConfig(context: TModuleContext): AssetConfig {
        
    try {
        const configDir = path.join(process.cwd(), 'config');
        const localYamlPath = path.join(configDir, 'asset-config.local.yaml');
        const mainYamlPath = path.join(configDir, 'asset-config.yaml');
        
        // Try local YAML first (for testing/development)
        if (fs.existsSync(localYamlPath)) {
            try {
                const yamlContent = fs.readFileSync(localYamlPath, 'utf8');
                const yamlConfig = yaml.load(yamlContent) as Partial<AssetConfig>;
                config = deepMerge(config, yamlConfig);
                context.log.write('Loaded local YAML configuration from: ' + localYamlPath);
            } catch (error) {
                context.log.write('Failed to load local YAML config: ' + (error instanceof Error ? error.message : String(error)), Log.level.ERROR);
            }
        }
        // Try main YAML config
        else if (fs.existsSync(mainYamlPath)) {
            try {
                const yamlContent = fs.readFileSync(mainYamlPath, 'utf8');
                const yamlConfig = yaml.load(yamlContent) as Partial<AssetConfig>;
                config = deepMerge(config, yamlConfig);
                context.log.write('Loaded main YAML configuration from: ' + mainYamlPath);
            } catch (error) {
                context.log.write('Failed to load YAML config: ' + (error instanceof Error ? error.message : String(error)), Log.level.ERROR);
                context.log.write('Using default configuration');
            }
        } else {
            context.log.write('No YAML configuration file found, using defaults', Log.level.WARNING);
        }
        
    } catch (error) {
        context.log.write('Error loading configuration: ' + (error instanceof Error ? error.message : String(error)), Log.level.ERROR);
        context.log.write('Using default configuration');
    }
    
    return applyEnvironmentOverrides(config);
}

/**
 * Apply environment variable overrides to configuration
 */
function applyEnvironmentOverrides(config: AssetConfig): AssetConfig {
    // Override with environment variables if present (highest priority)

    if (process.env.DEFAULT_LOAD_SCALE_FACTOR) {
        config.load.scaleFactor = Number(process.env.DEFAULT_LOAD_SCALE_FACTOR);
    }
    
    if (process.env.DEFAULT_SOLAR_SCALE_FACTOR) {
        config.solarSystem.scaleFactor = Number(process.env.DEFAULT_SOLAR_SCALE_FACTOR);
    }
    
    if (process.env.DEFAULT_EV_CHARGING_SLOTS) {
        config.evCharger.chargingSlots = Number(process.env.DEFAULT_EV_CHARGING_SLOTS);
    }
    
    if (process.env.DEFAULT_EV_MAX_POWER_PER_SLOT) {
        config.evCharger.maxPowerPerSlot = Number(process.env.DEFAULT_EV_MAX_POWER_PER_SLOT);
    }
    
    if (process.env.BATTERY_CHARGE_POWER) {
        config.batterySystem.chargePower = Number(process.env.BATTERY_CHARGE_POWER);
    }
    
    if (process.env.BATTERY_DISCHARGE_POWER) {
        config.batterySystem.dischargePower = Number(process.env.BATTERY_DISCHARGE_POWER);
    }
    
    if (process.env.SOLAR_FARM_SCALE_FACTOR) {
        config.structureTypes.solarFarm.solarSystem.scaleFactor = Number(process.env.SOLAR_FARM_SCALE_FACTOR);
    }
    
    if (process.env.EV_STATION_CHARGING_SLOTS) {
        config.structureTypes.evStation.evCharger.chargingSlots = Number(process.env.EV_STATION_CHARGING_SLOTS);
    }
    
    if (process.env.SMALL_HOUSE_LOAD_SCALE) {
        config.structureTypes.smallHouse.load.scaleFactor = Number(process.env.SMALL_HOUSE_LOAD_SCALE);
    }
    
    if (process.env.HUGE_HOUSE_LOAD_SCALE) {
        config.structureTypes.hugeHouse.load.scaleFactor = Number(process.env.HUGE_HOUSE_LOAD_SCALE);
    }
    
    if (process.env.BATTERY_STATION_CHARGE_POWER) {
        config.structureTypes.batteryStation.batterySystem.chargePower = Number(process.env.BATTERY_STATION_CHARGE_POWER);
    }
    
    if (process.env.BATTERY_STATION_DISCHARGE_POWER) {
        config.structureTypes.batteryStation.batterySystem.dischargePower = Number(process.env.BATTERY_STATION_DISCHARGE_POWER);
    }
    
    return config;
}