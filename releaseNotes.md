# Release Notes

This document contains the release history and changelog for the **OpenSwarm Energy Community Asset Simulator**. The **RealityTwin Asset Simulator** version has own tags, but which reflect also releases of the **OpenSwarm Energy Community Asset Simulator**. Therefore the first version number reflects the version of the **RealityTwin Asset Simulator**, the second to the corresponding version of the **OpenSwarm Energy Community Asset Simulator**.

## [v2.0.0][v3.0.0] - 2025-11-18 🚗

### Enhancements
- **Slot Simulation**: A new simulation mode was introduced: E-Car charging stations have now a column in the profiles csv where a arrival of cars is defined over their IDs.
- **ENV for Reality-Twin**: With the environment variable `REALITY_TWIN_MODE` is controlled, if the above slot simulation is used or the input of the hardware modules is used. Set it to "true" if the asset simulator is running within the reality twin set up.

### Configuration
- **Configurable Initial Charge**: Added `initialChargePercent` configuration parameter for EV charging stations to control the initial charge level of newly connected vehicles (default: 15%)
- **Configurable Increased Charge Power**: Added `increasedChargePower` configuration parameter to control the increased charging power multiplier (default: 1.2 for 120% of nominal power)
- Applied initial charge and max power configurations across all car slot initialization points
- **Environment Variable Support**: Added environment variables:
  - `EV_STATION_INITIAL_CHARGE_PERCENT` to override initial charge percentage (e.g., `0.20` for 20%)
  - `EV_STATION_INCREASED_CHARGE_POWER` to override increased charge power multiplier (e.g., `1.5` for 150%)

---

## [v1.0.1][v2.2.3] - 2025-08-22 🔧

### Enhancements
- **Enhanced Configuration Handling**: Improved configuration loading with validation and dynamic reloading capabilities
- **Improved Logging**: Enhanced logging for configuration loading and component updates for better debugging
- **Code Organization**: Refactored update logic into separate `updateAssets` function for better maintainability
- **Grid Sensor Improvements**: Extracted grid sensor update logic into separate function and standardized enum naming

### Bug Fixes
- **CSV Reading**: Improved CSV reading error handling and logging
- **Configuration**: Fixed wrong values in provided config file

### Technical Improvements
- Moved `init` function and CSV reading functionality to improve code organization
- Enhanced configuration loading and CSV reading with context logging

---

## [v1.0.0][v2.2.2] - 2025-08-14 🔋

### Major Features
- **Battery System Configuration**: Implemented comprehensive battery system configuration with defaults and deep merge functionality
- **Enhanced Battery Calculations**: Restructured battery system calculations for better accuracy

### Bug Fixes
- **Battery Storage**: Fixed battery system stored energy handling when capacity changes
- **Zero Capacity Handling**: Fixed handling of 0 capacity value
- **Configuration**: Corrected typo in battery storage capacity name in `Module.Fragment.yaml`

### Documentation
- Added instructions for pushing to RealityTwin branch of OpenSwarm GitHub

---

## [X][v2.2.1] - 2025-08-12 📄

### Features
- **Configuration Management**: Added file-based configuration management for the asset simulator

---

## [X][v2.2.0] - 2025-07-17 🔋

### Major Features
- **Battery Systems**: Added comprehensive battery system support to asset simulation
- **YAML Configuration**: Implemented configuration management for asset simulator with YAML support

This version marks a significant milestone with the introduction of battery systems into the simulation framework.

---

## [X][v2.1.0] - 2025-07-15 🌐

### Major Features
- **Grid Sensor Flow Direction**: Added GRID-SENSOR-FLOW-DIRECTION structure and integrated power flow direction handling in grid sensor logic
- **Enhanced Load Simulation**: Added scaleFactor handling for small and huge houses in load simulator logic
- **Debug Logging**: Added debug logging for processed hooks in asset update logic

### Improvements
- **Script Enhancement**: Enhanced script commands in `package.json` for improved environment variable handling
- **Git Handling**: Adjusted git push commands in README to handle version tags correctly
- **Code Cleanup**: Removed unused nodeVoltageId and cableCurrentId from gridSensorType and logic

### Technical Changes
- Changed module script to directly run the simulator instead of starting it via npm
- Improved release script with better clarity and `package.json` version updates
- Fixed various syntax errors in script commands

---

## [X][v2.0.0] - 2025-06-18 🚀

### Major Release
This version represents a significant milestone prepared for extended demonstration purposes. It includes major architectural improvements and feature additions that warranted a major version bump.

### Key Highlights
- Major refactoring and code organization improvements
- Enhanced simulation capabilities
- Improved module structure and functionality

---

## [X][v1.2.0] - 2025-06-11 📈

### Features
- **Linear Interpolation**: Enhanced asset value updates with linear interpolation for missing data points
- **Household Load**: Added household load simulation capabilities

### Improvements
- Better handling of missing data in asset simulations
- More accurate value interpolation between data points

---

## [X][v1.1.0] - 2025-06-04 ⭐

### Features
- **Enhanced Simulation**: Enhanced simulation capabilities for PV systems and charging stations
- **EV Charger Logic**: Enhanced EV charger logic with shifted energy calculations
- **Grid Sensor Assignment**: Added GRID-SENSOR-ASSIGNMENT structure for cascading functionality
- **Multiple Profiles**: Added new load profiles for more realistic simulations

### Infrastructure
- **CI/CD Pipeline**: Implemented CI/CD pipeline configuration in `.gitlab-ci.yml` and `Dockerfile`
- **Documentation**: Updated README with comprehensive release instructions

### Technical Improvements
- Introduced GRID-SENSOR and SOLAR-FARM structures
- Enhanced logic for multiple hooks support
- Improved sampling rate configuration with environment variables

---

## [X][v1.0.0] - Initial Release 🎉

The first stable release of the Energy Community Asset Simulator.