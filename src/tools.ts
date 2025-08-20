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