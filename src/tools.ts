import * as fs from 'fs'
import csv from 'csv-parser'
import { 
    Log, 
    TModuleContext } from 'bifrost-zero-common'

    // CSV data storage
    export const csvData: { [key: string]: any } = {};

    // CSV reading function
    export async function readCSVtoDict(filePath: string, context: TModuleContext): Promise<{ [key: string]: any }> {
        return new Promise((resolve, reject) => {
            // First check if file exists
            if (!fs.existsSync(filePath)) {
                const error = `CSV file not found: ${filePath}`;
                context.log.write(error, Log.level.ERROR);
                reject(new Error(error));
                return;
            }

            try {
                const stream = fs.createReadStream(filePath);
                
                // Handle stream errors (like permission issues, etc.)
                stream.on('error', (err) => {
                    context.log.write('Error opening CSV file: ' + err.message, Log.level.ERROR);
                    reject(err);
                });

                stream
                    .pipe(csv({separator: ";", }))
                    .on('data', (row) => {
                        const timestamp = row.Time;
                        const [hours, minutes, seconds] = timestamp.split(':').map(Number);
                        delete row.Time; // Remove the timestamp column from the row object
                        const convertedTs = hours*3600 + minutes*60 + seconds
                        const numericRow: Record<string, number> = {};
                        Object.keys(row).forEach(key => {
                        numericRow[key] = parseFloat(row[key]);
                        if (isNaN(numericRow[key])) {
                            numericRow[key] = 0; // or any default value, or keep as null/undefined
                        }
                        });
                        csvData[convertedTs] = numericRow;
                    })
                    .on('end', () => {
                        context.log.write("CSV Data loaded!");
                        resolve(csvData);
                    })
                    .on('error', (err) => {
                        context.log.write('Error parsing CSV Data: ' + err.message, Log.level.ERROR);
                        reject(err);
                    });
            } catch (err) {
                const error = err instanceof Error ? err.message : String(err);
                context.log.write('Unexpected error reading CSV: ' + error, Log.level.ERROR);
                reject(err);
            }
        });
    }

    // Get interpolated data for a given time
    export function getInterpolatedData(dataTime: number, context: TModuleContext): any {
        // check if the dataTime is in the csvData
        if (csvData.hasOwnProperty(dataTime)) {
            return csvData[dataTime];
        }

        // if not, make a linear interpolation
        const keys = Object.keys(csvData).map(Number).sort((a, b) => a - b);
        let lowerKey = keys[0];
        let upperKey = keys[keys.length - 1];
        for (let i = 0; i < keys.length; i++) {
            if (keys[i] <= dataTime) {
                lowerKey = keys[i];
            }
            if (keys[i] > dataTime) {
                upperKey = keys[i];
                break;
            }
        }
        if (lowerKey === undefined || upperKey === undefined) {
            context.log.write(`No data available for time ${dataTime}`, Log.level.WARNING);
            return null; // No data available for this time
        }

        // perform linear interpolation
        const lowerData = csvData[lowerKey];
        const upperData = csvData[upperKey];
        const interpolationFactor = (dataTime - lowerKey) / (upperKey - lowerKey);
        const wData: any = {};
        for (const key in lowerData) {
            if (lowerData.hasOwnProperty(key) && upperData.hasOwnProperty(key)) {
                wData[key] = lowerData[key] + interpolationFactor * (upperData[key] - lowerData[key]);
            }
        }

        // except for EV-IDs, which cannot be interpolated
        for (let slotIndex = 1; slotIndex <= 3; slotIndex++) {
            const evIdKey = "EV-ID_Slot" + slotIndex;
            wData[evIdKey] = lowerData[evIdKey];
        }

        return wData;
    }

    // Data generators.
    export const generators = {
        // Helper functions
        inc: (a: number, by: number) => a + by,
        dec: (a: number, by: number) => a - by,
        clamp: (a: number, bounds: [number, number]) => Math.max(bounds[0], Math.min(a, bounds[1])),
        pickInt: (a: number[]) => a[Math.floor(Math.random() * a.length)],
        pickStr: (a: string[]) => a[Math.floor(Math.random() * a.length)],
        randFloat: (min: number = 0, max: number = 1) => Math.random() * (max - min) + min,
        randInt: (min: number = 0, max: number = 1) => Math.floor(Math.random() * (max - min) + min),
        rand01: (bias: number = 0) => Math.round(Math.random() + bias),
    }

    export async function updateDynamic(bifrostURL, storyId, experimentId, dynId, dynVal, log, Log){
        try {
            const body = JSON.stringify({
                            at: 0,
                            dynamicId: dynId,
                            value: dynVal
                        })
            const response = await fetch(`${bifrostURL}/rest/v2/story/${storyId}/experiment/${experimentId}/dynamics/dynamic?user=robot&robot=true`, {
                method  : 'POST',
                body    : body,
                headers : { 'Content-Type': 'application/json' }
            })
            if (response.status != 200){
                log.write(`Failed to update Dynamic: ${response.statusText}`, Log.level.ERROR)
            }
            return response.status
        } catch (e:any) {
            // this.log.write(`Failed to update Dynamic: ${e.message}`)
            log.write(`Failed to update Dynamic: ${e.message}`, Log.level.ERROR)
            throw (e)
        } 
    }