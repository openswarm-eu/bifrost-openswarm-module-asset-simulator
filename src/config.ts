/**
 * Configuration file for Energy Community Asset Simulator
 * Contains all configurable values used throughout the simulation
 */

export interface AssetConfig {
    // General battery system defaults
    batterySystem: {
        chargePower: number;
        dischargePower: number;
        storedEnergy: number;
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
        dischargePower: 5,
        storedEnergy: 5
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

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

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
export function loadConfig(): AssetConfig {
    let config = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone of defaults
    
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
                console.log('Loaded local YAML configuration from:', localYamlPath);
            } catch (error) {
                console.warn('Failed to load local YAML config:', error instanceof Error ? error.message : String(error));
            }
        }
        // Try main YAML config
        else if (fs.existsSync(mainYamlPath)) {
            try {
                const yamlContent = fs.readFileSync(mainYamlPath, 'utf8');
                const yamlConfig = yaml.load(yamlContent) as Partial<AssetConfig>;
                config = deepMerge(config, yamlConfig);
                console.log('Loaded YAML configuration from:', mainYamlPath);
            } catch (error) {
                console.warn('Failed to load YAML config:', error instanceof Error ? error.message : String(error));
                console.log('Using default configuration');
            }
        } else {
            console.log('No YAML configuration file found, using defaults');
        }
        
    } catch (error) {
        console.warn('Error loading configuration:', error instanceof Error ? error.message : String(error));
        console.log('Using default configuration');
    }
    
    return applyEnvironmentOverrides(config);
}

/**
 * Apply environment variable overrides to configuration
 */
function applyEnvironmentOverrides(config: AssetConfig): AssetConfig {
    // Override general battery system values with environment variables if present
    if (process.env.BATTERY_CHARGE_POWER) {
        config.batterySystem.chargePower = Number(process.env.BATTERY_CHARGE_POWER);
    }
    
    if (process.env.BATTERY_DISCHARGE_POWER) {
        config.batterySystem.dischargePower = Number(process.env.BATTERY_DISCHARGE_POWER);
    }
    
    if (process.env.BATTERY_STORED_ENERGY) {
        config.batterySystem.storedEnergy = Number(process.env.BATTERY_STORED_ENERGY);
    }
    
    // Override with environment variables if present (highest priority)
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

// Export a singleton instance
export const config = loadConfig();
