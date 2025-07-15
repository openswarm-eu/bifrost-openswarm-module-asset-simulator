/**
 * Configuration file for Energy Community Asset Simulator
 * Contains all configurable values used throughout the simulation
 */

export interface AssetConfig {
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
    };
}

/**
 * Default configuration values
 * These can be overridden by YAML config file or environment variables
 */
export const defaultConfig: AssetConfig = {
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
        }
    }
};

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Load configuration from YAML file and environment variables
 * Priority order:
 * 1. Environment Variables (highest priority)
 * 2. Local YAML config file (config/asset-config.local.yaml) - for testing
 * 3. Main YAML config file (config/asset-config.yaml)
 * 4. Default values (lowest priority)
 */
export function loadConfig(): AssetConfig {
    const config = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone
    
    try {
        const configDir = path.join(process.cwd(), 'config');
        const localYamlPath = path.join(configDir, 'asset-config.local.yaml');
        const mainYamlPath = path.join(configDir, 'asset-config.yaml');
        
        // Try local YAML first (for testing/development)
        if (fs.existsSync(localYamlPath)) {
            try {
                const yamlContent = fs.readFileSync(localYamlPath, 'utf8');
                const yamlConfig = yaml.load(yamlContent) as AssetConfig;
                Object.assign(config, yamlConfig);
                console.log('Loaded local YAML configuration from:', localYamlPath);
            } catch (error) {
                console.warn('Failed to load local YAML config:', error instanceof Error ? error.message : String(error));
            }
        }
        // Try main YAML config
        else if (fs.existsSync(mainYamlPath)) {
            try {
                const yamlContent = fs.readFileSync(mainYamlPath, 'utf8');
                const yamlConfig = yaml.load(yamlContent) as AssetConfig;
                Object.assign(config, yamlConfig);
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
    
    return config;
}

// Export a singleton instance
export const config = loadConfig();
