import {
    DataFrame,
    Log,
    TFragment,
    TGlobalModule,
    TInitFn,
    TLogFn,
    TModuleContext,
    TModuleSettings,
    TState,
    TUpdateFn,
    TDynamicInfo
} from 'bifrost-zero-common'
import fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { readFileSync } from 'fs'
import yaml from 'js-yaml'
import fetch from 'node-fetch'
import { io, Socket } from 'socket.io-client'

const cDefaultLabel = 'BifrostZeroModule'
const cDefaultAbout = `This is the BIFROST ZERO module template, blissfully doing nothing at all.`
const cDefaultAuthor = `anonymous module developer`
const cRegisterRetryS = 5
const cDefaultHook = [1000]
const cDefaultSamplingRate = 1
const cDefaultPort = 8085
const cDefaultBifrostURL = `http://127.0.0.1:9091`

const cRestBasePath = '/rest'
const cInitPath = `${cRestBasePath}/init`
const cUpdatePath = `${cRestBasePath}/update`
const cFragmentPath = `${cRestBasePath}/fragment`
const cLogPath = `${cRestBasePath}/log`
const cPingPath = `${cRestBasePath}/ping`

type rQuery = {
    experimentId: string
    storyId: string
    startAt: string
    simulationAt: string
    replayAt: string
    message: string
}

export class BifrostZeroModule {
    log: Log

    // The module ID, which must be unique per BIFROST instance
    moduleId: string = ``

    // The module author
    author: string = cDefaultAuthor

    // A human-readable module label
    label: string = cDefaultLabel

    // A basic description of the module
    about: string = cDefaultAbout

    initCallback: TInitFn
    updateCallback: TUpdateFn
    logCallback: TLogFn

    // The module hook numbers
    hook: Array<number> = cDefaultHook

    // The sampling rate, determining the rate of update calls
    samplingRate: number = 1

    // The data subscriptions
    subscriptions: Array<string> = []

    // Additional directory input
    fragment: TFragment[] | TFragment

    // A fragment data file
    fragmentFile: string | null = null

    docURL: string | undefined = undefined

    context: TModuleContext

    app: FastifyInstance

    socket: Socket | null = null

    // Module and BIFROST urls
    moduleURL: string = process.env.MODULE_URL || ''
    bifrostURL: string = process.env.BIFROST_URL || ''

    httpPort = cDefaultPort
    startedAt = 0
    started = false

    constructor(settings: TModuleSettings) {
        this.author = settings.author ?? cDefaultAuthor
        this.label = settings.label ?? cDefaultLabel
        this.about = settings.about ?? cDefaultAbout
        this.moduleId = settings.moduleId ?? `${this.label}`.replace('\\s+', '')
        this.hook = settings.hook ?? cDefaultHook
        this.samplingRate = settings.samplingRate ?? cDefaultSamplingRate
        this.subscriptions = settings.subscriptions ?? []
        this.bifrostURL = process.env.BIFROST_URL ?? settings.bifrostURL ?? cDefaultBifrostURL
        this.moduleURL = process.env.MODULE_URL ?? settings.moduleURL ?? `http://127.0.0.1:${cDefaultPort}`
        this.httpPort = parseInt(this.moduleURL.split(':')[2])
        this.fragment = settings.fragment ?? []
        this.fragmentFile = settings.fragmentFile ?? null
        this.docURL = settings.docURL ?? undefined

        this.initCallback = settings.initCallback ?? this.defaultInit
        this.updateCallback = settings.updateCallback ?? this.defaultUpdate
        this.logCallback = settings.logCallback ?? this.defaultLog

        this.log = new Log(`${this.label}`, `${this.moduleId}`, {})

        // Read the fragment file, if any

        if (this.fragmentFile !== null) {
            try {
                let loadedFragment = yaml.load(readFileSync(this.fragmentFile))
                if (isFragment(loadedFragment)) {
                    if (!Array.isArray(this.fragment)) {
                        this.fragment = [this.fragment, loadedFragment]
                    } else {
                        this.fragment.push(loadedFragment)
                    }
                } else {
                    this.log.write(
                        `Data loaded from fragment file '${this.fragmentFile}' does not correspond to a valid fragment, ignoring.`,
                        Log.level.WARNING
                    )
                }
            } catch (e) {
                let message = `Unknown error`
                if (e instanceof Error) {
                    message = e.message
                }
                this.log.write(`Could not read fragment file from '${this.fragmentFile}': ${message}`, Log.level.ERROR)
            }
        }

        // Save the fragment in the context

        this.context = {
            ...settings,
            fragment: this.fragment,
            log: this.log,
            state: {} as TState
        }

        // Set up server application and endpoints

        this.app = fastify({
            bodyLimit: 10485760
        })
        this.app.register(cors, {})

        this.setupEndpoints()
    }

    /**
     * Map of all avaliable enpoints
     */
    get endpoints() {
        return {
            init: `${this.moduleURL}${cInitPath}`,
            update: `${this.moduleURL}${cUpdatePath}`,
            fragment: `${this.moduleURL}${cFragmentPath}`,
            log: `${this.moduleURL}${cLogPath}`,
            ping: `${this.moduleURL}${cPingPath}`,
            doc: this.docURL
        }
    }

    /**
     * Map of the endpoint parameters
     */
    get parameters() {
        return {
            init: [],
            update: [],
            log: []
        }
    }

    /**
     * Initialize the application endpoints.
     */
    setupEndpoints() {
        this.app.get(cRestBasePath, (request, reply) => {
            reply.send({
                moduleId: this.moduleId,
                label: this.label,
                about: this.about
            })
        })

        this.app.post(cInitPath, async (request, reply) => {
            const state = request.body as TState
            const rQuery = request.query as rQuery
            const storyId = rQuery.storyId
            const experimentId = rQuery.experimentId

            const response = await this.initCallback(storyId, experimentId, state, this.context)

            this.context.state = state

            reply.status(200).send(response)
        })

        this.app.get(cFragmentPath, async (request, reply) => {
            reply.status(200).send(this.fragment)
        })

        this.app.post(cUpdatePath, async (request, reply) => {
            const rQuery = request.query as rQuery
            const storyId = rQuery.storyId
            const experimentId = rQuery.experimentId
            const startAt = parseInt(rQuery.startAt)
            const simulationAt = parseInt(rQuery.simulationAt)
            const replayAt = parseInt(rQuery.replayAt)

            // parse req.body as DataFrame - if there is an error while parsing create a new empty DataFrame with current time
            let data: DataFrame
            try {
                data = DataFrame.fromJSON(request.body as DataFrame)
            } catch (e) {
                data = new DataFrame()
                data.setTime(simulationAt)
            }

            const response = await this.updateCallback(
                storyId,
                experimentId,
                startAt,
                simulationAt,
                replayAt,
                data,
                this.context
            )

            reply.status(200).send(response)
        })

        this.app.post(cLogPath, async (request, reply) => {
            const rQuery = request.query as rQuery
            const storyId = rQuery.storyId as string
            const experimentId = rQuery.experimentId as string
            const message = rQuery.message as string

            this.logCallback(storyId, experimentId, message, this.context)

            reply.status(200).send()
        })

        this.app.get(cPingPath, (request, reply) => {
            reply.status(200).send({ message: 'pong' })
        })
    }

    defaultInit: TInitFn = (storyId, experimentId, state, context) => {
        this.log.write(
            `[default init callback] Init (storyId: ${storyId}, experimentId: ${experimentId})`,
            Log.level.DEBUG
        )

        const frame = new DataFrame()
        return frame
    }

    defaultUpdate: TUpdateFn = (storyId, experimentId, startAt, simulationAt, replayAt, data, context) => {
        this.log.write(
            `[default update callback] Update (storyId: ${storyId}, experimentId: ${experimentId}, simulationAt: ${simulationAt})`,
            Log.level.DEBUG
        )

        const frame = new DataFrame()
        return frame
    }

    defaultLog: TLogFn = (storyId, experimentId, message, context): void => {
        this.log.write(
            `[default log callback] New message (storyId: ${storyId}, experimentId: ${experimentId}): ${message}`
        )
    }

    /**
     * Register the module with BIFROST, making it part of the simulation loop.
     */
    async register() {
        this.log.write(`Registering with BIFROST ZERO at ${this.bifrostURL}`)

        const provides: string[] = []
        for (const fragment of this.fragment as TFragment[]) {
            for (const dynamicId of Object.keys(fragment.dynamics)) {
                provides.push(dynamicId)
            }
        }

        const requires: TDynamicInfo[] = []
        for (const dynamicId of this.subscriptions) {
            if (!provides.includes(dynamicId)) {
                requires.push({ dynamicId, providedBy: [] as string[] })
            }
        }

        const sub: TGlobalModule = {
            moduleId: this.moduleId,
            label: this.label,
            about: this.about,
            hook: this.hook,
            endpoints: this.endpoints,
            parameters: this.parameters,
            samplingRate: this.samplingRate,
            subscriptions: this.subscriptions,
            provides,
            requires
        }

        const response = await fetch(`${this.bifrostURL}/rest/v2/module?user=${this.author}&robot=false`, {
            method: 'post',
            body: JSON.stringify({ ...sub }),
            headers: { 'content-type': 'application/json' }
        })

        if (response.status >= 200 && response.status <= 299) {
            this.log.write(`Registration successful, ready for operations`)

            if (!this.socket) {
                this.socket = io(this.bifrostURL)
            }

            this.socket.io.on('open', () => {
                this.log.write(`Socket connection established.`, Log.level.DEBUG)
            })

            this.socket.io.once('error', () => {
                this.log.write(`Failed to establish socket connection.`, Log.level.WARNING)
            })

            this.socket.io.once('close', async () => {
                this.log.write(`Lost connection to BIFROST, attempting reconnect ...`, Log.level.WARNING)
                await this.attemptRegistration()
            })
        } else {
            throw new Error(`Non-2xx response from BIFROST: ${response.statusText}`)
        }
    }

    async attemptRegistration(backoff?: number) {
        let success = false
        while (!success) {
            try {
                await this.register()
                success = true
            } catch (e) {
                if (e instanceof Error) {
                    this.log.write(`${e.message}, retrying in ${cRegisterRetryS} seconds`, Log.level.WARNING)
                }
            }
            await sleep(1e3 * (backoff ?? cRegisterRetryS))
        }
    }

    /**
     * Start the module's HTTP server and issue a register request to BIFROST. Registration is attempted
     * infinitely with a fixed backoff in case BIFROST does not answer the request.
     */
    async start() {
        this.startedAt = Date.now()

        // Open the HTTP server port and listen
        this.app.listen({ port: this.httpPort, host: '0.0.0.0' }, (err, address) => {
            if (err) {
                this.app.log.error(err)
                process.exit(1)
            }
            this.log.write(`Listening on *:${this.httpPort} ... `)
        })

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

        await this.attemptRegistration()

        this.started = true
    }
}

/**
 * Predicate to determine if something is a directory fragment.
 * @param data Any object
 * @returns Whether the parameter conforms to a fragment.
 */
const isFragment = (data: object): data is TFragment => {
    return (
        (data as TFragment).type !== undefined &&
        (data as TFragment).name !== undefined &&
        (data as TFragment).structures !== undefined &&
        (data as TFragment).dynamics !== undefined &&
        (data as TFragment).mappings !== undefined
    )
}

/**
 * This is a simple promisify wrapper around setTimeout
 *
 * @param {number} sleepTimeMs The duration of the sleep
 */
function sleep(sleepTimeMs: number) {
    return new Promise((resolve) => setTimeout(resolve, sleepTimeMs))
}
