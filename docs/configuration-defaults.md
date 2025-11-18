# Configuration System - Default Value Fallback

## Overview

The Energy Community Asset Simulator configuration system now supports **automatic fallback to default values** for any parameters not defined in the `asset-config.yaml` file. Additionally, the system supports **dynamic configuration reloading** - configuration changes are automatically picked up for each new simulation without requiring a module restart.

## Dynamic Configuration Reloading

The configuration system automatically reloads the `asset-config.yaml` file at the start of each simulation (when the `init` function is called). This means:


## How It Works

The configuration loading follows this priority order:
1. **Environment Variables** (highest priority)
2. **Local YAML config** (`config/asset-config.local.yaml`) - for testing
3. **Main YAML config** (`config/asset-config.yaml`)
4. **Default values** (`src/config.ts`) - lowest priority

### Supported Environment Variables

The following environment variables can override configuration values:

- `DEFAULT_LOAD_SCALE_FACTOR` - Default load scale factor
- `DEFAULT_SOLAR_SCALE_FACTOR` - Default solar system scale factor
- `DEFAULT_EV_CHARGING_SLOTS` - Default EV charging slots
- `DEFAULT_EV_MAX_POWER_PER_SLOT` - Default max power per EV slot
- `BATTERY_CHARGE_POWER` - Default battery charge power
- `BATTERY_DISCHARGE_POWER` - Default battery discharge power
- `SOLAR_FARM_SCALE_FACTOR` - Solar farm scale factor
- `EV_STATION_CHARGING_SLOTS` - EV station charging slots
- `EV_STATION_INITIAL_CHARGE_PERCENT` - Initial charge percentage for EVs (e.g., `0.15` for 15%)
- `SMALL_HOUSE_LOAD_SCALE` - Small house load scale factor
- `HUGE_HOUSE_LOAD_SCALE` - Huge house load scale factor
- `BATTERY_STATION_CHARGE_POWER` - Battery station charge power
- `BATTERY_STATION_DISCHARGE_POWER` - Battery station discharge power

### Deep Merge Behavior

When loading YAML configuration files, the system performs a **deep merge** with the default configuration. This means:

- ✅ **Missing sections** will use complete defaults
- ✅ **Partially defined sections** will merge with defaults
- ✅ **Missing properties** within existing sections fall back to defaults
- ✅ **Nested objects** are properly merged at all levels

## Examples

### Example 1: Partial Battery System Configuration

```yaml
# Only define chargePower in YAML
batterySystem:
  chargePower: 15
  # dischargePower and storedEnergy will use defaults (5, 5)
```

**Result**: `chargePower: 15`, `dischargePower: 5`, `storedEnergy: 5`

### Example 2: Missing Structure Types

```yaml
structureTypes:
  solarFarm:
    solarSystem:
      scaleFactor: 12
    # load section missing - uses default scaleFactor: 0
  
  # evStation completely missing - uses all defaults
  # hugeHouse completely missing - uses all defaults
```

**Result**: 
- Solar farm uses YAML `scaleFactor: 12` for solar, default `scaleFactor: 0` for load
- EV station uses all defaults: `chargingSlots: 3`, `load.scaleFactor: 0`
- Huge house uses default: `load.scaleFactor: 10`

### Example 3: Minimal Configuration

```yaml
# Minimal YAML with just one value
structureTypes:
  smallHouse:
    load:
      scaleFactor: 3
```

**Result**: All other configuration sections (battery system, other structure types) use their complete default configurations.

## Default Values Reference

See `src/config.ts` for the complete list of default values:

```typescript
export const defaultConfig: AssetConfig = {
    load: {
        scaleFactor: 1       // Default load scale factor in p.u.
    },
    solarSystem: {
        scaleFactor: 1       // Default solar system scale factor in p.u.
    },
    evCharger: {
        chargingSlots: 1,         // Default charging slots
        maxPowerPerSlot: 4,       // Default max power per slot in kW
        initialChargePercent: 0.15 // Default initial charge percentage (15%)
    },
    batterySystem: {
        chargePower: 5,     // Default maximum charge power for battery systems in kW
        dischargePower: 5,  // Default maximum discharge power for battery systems in kW  
    },
    structureTypes: {
        solarFarm: {
            solarSystem: { scaleFactor: 8 },
            load: { scaleFactor: 0 }
        },
        evStation: {
            evCharger: { chargingSlots: 3, initialChargePercent: 0.15 },
            load: { scaleFactor: 0 }
        },
        smallHouse: {
            load: { scaleFactor: 2 }
        },
        hugeHouse: {
            load: { scaleFactor: 10 }
        },
        batteryStation: {
            batterySystem: { chargePower: 10, dischargePower: 10 },
            load: { scaleFactor: 0 }
        }
    }
};
```
