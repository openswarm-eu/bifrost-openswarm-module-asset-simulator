# Configuration System - Default Value Fallback

## Overview

The Energy Community Asset Simulator configuration system now supports **automatic fallback to default values** for any parameters not defined in the `asset-config.yaml` file.

## How It Works

The configuration loading follows this priority order:
1. **Environment Variables** (highest priority)
2. **Local YAML config** (`config/asset-config.local.yaml`) - for testing
3. **Main YAML config** (`config/asset-config.yaml`)
4. **Default values** (`src/config.ts`) - lowest priority

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

## Benefits

1. **Backwards Compatibility**: Existing YAML files continue to work
2. **Flexibility**: You only need to define values you want to change
3. **Maintainability**: Adding new default parameters doesn't break existing configs
4. **Safety**: Missing configurations don't cause runtime errors

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
        chargingSlots: 1,    // Default charging slots
        maxPowerPerSlot: 4   // Default max power per slot in kW
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
            evCharger: { chargingSlots: 3 },
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
