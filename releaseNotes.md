# Release Notes

This document contains the release history and changelog for the Energy Community Asset Simulator.

## [v3.0.0] - 2025-11-18  🚗

- **Slot Simulation**: A new simulation mode was introduced: E-Car charging stations have now a column in the profiles csv where a arrival of cars is defined over their IDs.
- **ENV for Reality-Twin**: With the environment variable `REALITY_TWIN_MODE` is controlled, if the above slot simulation is used or the input of the hardware modules is used. Set it to "true" if the asset simulator is running within the reality twin set up.

## [v2.2.3] - 2025-08-22 🔧

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

## [v2.2.2] - 2025-08-14 🔋

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

## [v2.2.1] - 2025-08-12 📄

### Features
- **Configuration Management**: Added file-based configuration management for the asset simulator

---

## [v2.2.0] - 2025-07-17 🔋

### Major Features
- **Battery Systems**: Added comprehensive battery system support to asset simulation
- **YAML Configuration**: Implemented configuration management for asset simulator with YAML support

This version marks a significant milestone with the introduction of battery systems into the simulation framework.

---

## [v2.1.0] - 2025-07-15 🌐

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

## [v2.0.0] - 2025-06-18 🚀

### Major Release
This version represents a significant milestone prepared for extended demonstration purposes. It includes major architectural improvements and feature additions that warranted a major version bump.

### Key Highlights
- Major refactoring and code organization improvements
- Enhanced simulation capabilities
- Improved module structure and functionality

---

## [v1.2.0] - 2025-06-11 📈

### Features
- **Linear Interpolation**: Enhanced asset value updates with linear interpolation for missing data points
- **Household Load**: Added household load simulation capabilities

### Improvements
- Better handling of missing data in asset simulations
- More accurate value interpolation between data points

---

## [v1.1.0] - 2025-06-04 ⭐

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

## [v1.0.0] - Initial Release 🎉

The first stable release of the Energy Community Asset Simulator.