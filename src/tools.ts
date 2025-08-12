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