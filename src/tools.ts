import * as fs from 'fs'
import csv from 'csv-parser'

    // CSV data storage
    export const csvData: { [key: string]: any } = {};

    // CSV reading function
    export async function readCSVtoDict(filePath: string): Promise<{ [key: string]: any }> {
        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
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
                    resolve(csvData);
                })
                .on('error', (err) => {
                    reject(err);
                });
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