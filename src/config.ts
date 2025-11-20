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
    // Default wind turbine configuration for PGC (Power Grid Connector) components
    windTurbine: {
        windSpeedScaleFactor: number;
        windSpeedToPowerFactor: number;
        maxWindSpeed: number;
        minWindSpeed: number;
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
                initialChargePercent: number;
                increasedChargePower: number;
            };
            load: {
                scaleFactor: number;
            };
            carStats: {
                [key: string]: {
                    carColor: string
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
        windPlant: {
            windTurbine: {
                windSpeedScaleFactor: number;
                windSpeedToPowerFactor: number;
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
    windTurbine: {
        windSpeedScaleFactor: 2.5,
        windSpeedToPowerFactor: 10,
        maxWindSpeed: 25,
        minWindSpeed: 0
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
                chargingSlots: 3,
                initialChargePercent: 0.15,
                increasedChargePower: 1.2
            },
            load: {
                scaleFactor: 0
            },
            carStats: {
                "-1": {
                    carColor: "0x000000", // #000000 # No car
                    carPower:0,
                    carMaxCap:0
                },
                "0": {
                    carColor: "0xFF0000", // #FF0000 # Red car
                    carPower:1,
                    carMaxCap:10
                },
                "1": {
                    carColor: "0x808080", // #808080 # Grey car
                    carPower:2,
                    carMaxCap:20
                },
                "2": {
                    carColor: "0x000000", // #000000 # No car
                    carPower:3,
                    carMaxCap:30
                },
                "3": {
                    carColor: "0x787878", // #FFFFFF # White car
                    carPower:4,
                    carMaxCap:40
                },
                "4": {
                    carColor: "0x000000", // #000000 # No car
                    carPower:5,
                    carMaxCap:50
                },
                "5": {
                    carColor: "0x0000FF", // #0000FF # Blue car
                    carPower:6,
                    carMaxCap:60
                },
                "6": {
                    carColor: "0x00FFFF", // #00FFFF # Light blue car
                    carPower:7,
                    carMaxCap:70
                },
                "7": {
                    carColor: "0x00FF00", // #00FF00 # Green car
                    carPower:8,
                    carMaxCap:80
                },
                "8": {
                    carColor: "0x000000", // #000000 # No car
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
                chargePower: 20,
                dischargePower: 20
            },
            load: {
                scaleFactor: 0
            }
        },
        windPlant: {
            windTurbine: {
                windSpeedScaleFactor: 1,
                windSpeedToPowerFactor: 10
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
 * Validate that a configuration object has basic required structure
 * This helps catch corrupted or malformed YAML files
 */
function isValidConfigStructure(config: any): boolean {
    if (!config || typeof config !== 'object') {
        return false;
    }
    
    // Check for at least one of the main configuration sections
    const hasValidSection = 
        (config.batterySystem && typeof config.batterySystem === 'object') ||
        (config.load && typeof config.load === 'object') ||
        (config.solarSystem && typeof config.solarSystem === 'object') ||
        (config.evCharger && typeof config.evCharger === 'object') ||
        (config.structureTypes && typeof config.structureTypes === 'object');
    
    return hasValidSection;
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
 * This function can be called multiple times to reload configuration dynamically
 */
export function loadConfig(context: TModuleContext): AssetConfig {
    
    // Reset config to defaults before loading new values
    config = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone of defaults
    context.log.write('Configuration reset to defaults',Log.level.DEBUG);
        
    try {
        const configDir = path.join(process.cwd(), 'config');
        const localYamlPath = path.join(configDir, 'asset-config.local.yaml');
        const mainYamlPath = path.join(configDir, 'asset-config.yaml');
        
        let configLoaded = false;
        
        // Try local YAML first (for testing/development)
        if (fs.existsSync(localYamlPath)) {
            try {
                const yamlContent = fs.readFileSync(localYamlPath, 'utf8');
                const yamlConfig = yaml.load(yamlContent) as Partial<AssetConfig>;
                
                if (yamlConfig && isValidConfigStructure(yamlConfig)) {
                    config = deepMerge(config, yamlConfig);
                    context.log.write('Successfully loaded local YAML configuration from: ' + localYamlPath);
                    configLoaded = true;
                } else {
                    context.log.write('Local YAML config file is empty or has invalid structure, using defaults', Log.level.WARNING);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
                    context.log.write('Local YAML config file was deleted or moved during read, trying main config', Log.level.WARNING);
                } else {
                    context.log.write('Failed to load local YAML config: ' + errorMsg, Log.level.ERROR);
                }
                context.log.write('Falling back to main config or defaults', Log.level.INFO);
            }
        }
        
        // Try main YAML config (if local wasn't loaded successfully)
        if (!configLoaded && fs.existsSync(mainYamlPath)) {
            try {
                const yamlContent = fs.readFileSync(mainYamlPath, 'utf8');
                const yamlConfig = yaml.load(yamlContent) as Partial<AssetConfig>;
                
                if (yamlConfig && isValidConfigStructure(yamlConfig)) {
                    config = deepMerge(config, yamlConfig);
                    context.log.write('Successfully loaded main YAML configuration from: ' + mainYamlPath);
                    configLoaded = true;
                } else {
                    context.log.write('Main YAML config file is empty or has invalid structure, using defaults', Log.level.WARNING);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                if (errorMsg.includes('ENOENT') || errorMsg.includes('no such file')) {
                    context.log.write('Main YAML config file was deleted during read, using defaults', Log.level.WARNING);
                } else {
                    context.log.write('Failed to load main YAML config: ' + errorMsg, Log.level.ERROR);
                }
                context.log.write('Using default configuration only', Log.level.WARNING);
            }
        }
        
        // Log final status
        if (!configLoaded) {
            if (!fs.existsSync(localYamlPath) && !fs.existsSync(mainYamlPath)) {
                context.log.write('No YAML configuration files found, using built-in defaults', Log.level.WARNING);
            } else {
                context.log.write('All YAML config loading attempts failed, using built-in defaults', Log.level.WARNING);
            }
        }
        
    } catch (error) {
        context.log.write('Critical error in configuration loading: ' + (error instanceof Error ? error.message : String(error)), Log.level.ERROR);
        context.log.write('Using built-in default configuration as fallback', Log.level.ERROR);
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
    
    if (process.env.DEFAULT_WIND_TURBINE_WIND_SPEED_SCALE_FACTOR) {
        config.windTurbine.windSpeedScaleFactor = Number(process.env.DEFAULT_WIND_TURBINE_WIND_SPEED_SCALE_FACTOR);
    }

    if (process.env.DEFAULT_WIND_TURBINE_WIND_SPEED_TO_POWER_FACTOR) {
        config.windTurbine.windSpeedToPowerFactor = Number(process.env.DEFAULT_WIND_TURBINE_WIND_SPEED_TO_POWER_FACTOR);
    }

    if (process.env.SOLAR_FARM_SCALE_FACTOR) {
        config.structureTypes.solarFarm.solarSystem.scaleFactor = Number(process.env.SOLAR_FARM_SCALE_FACTOR);
    }
    
    if (process.env.EV_STATION_CHARGING_SLOTS) {
        config.structureTypes.evStation.evCharger.chargingSlots = Number(process.env.EV_STATION_CHARGING_SLOTS);
    }
    
    if (process.env.EV_STATION_INITIAL_CHARGE_PERCENT) {
        config.structureTypes.evStation.evCharger.initialChargePercent = Number(process.env.EV_STATION_INITIAL_CHARGE_PERCENT);
    }
    
    if (process.env.EV_STATION_INCREASED_CHARGE_POWER) {
        config.structureTypes.evStation.evCharger.increasedChargePower = Number(process.env.EV_STATION_INCREASED_CHARGE_POWER);
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