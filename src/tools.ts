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