import child_process from 'child_process'
import util from 'util'
import fs from 'fs'
import path from 'path'

import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import logger from 'koa-logger'

import Config from './config'

const app = new Koa()
const router = new Router()

interface JudgeRequestBody {
    problemId?: string
    sourceCode?: string
    language?: string
    /** in seconds */
    timeLimit?: string
    /** in bytes */
    memoryLimit?: string
}

async function lavidajudger(options: {
    execPath?: fs.PathLike,
    inputPath?: fs.PathLike,
    outputPath?: fs.PathLike,
    validatorPath?: fs.PathLike,

    /** in seconds */
    cpuLimit?: number,
    /** in seconds */
    realLimit?: number,
    /** in bytes */
    memLimit?: number,
}): Promise<{
    cputime?: number,
    realtime?: number,
    memory?: number,
    exitcode?: number,
    signal?: number,
    graderesult?: number,
}> {
    const {
        execPath, inputPath, outputPath, validatorPath,
        cpuLimit, realLimit, memLimit,
    } = options

    const { stdout } = await util.promisify(child_process.exec)(
        `lavidajudger-cli \
            ${execPath ? `--exec-path ${execPath}` : ''} \
            ${inputPath ? `--input-path ${inputPath}` : ''} \
            ${outputPath ? `--output-path ${outputPath}` : ''} \
            ${validatorPath ? `--validator-path ${validatorPath}` : ''} \
            \
            ${cpuLimit ? `--cpu-limit ${cpuLimit}` : ''} \
            ${realLimit ? `--real-limit ${realLimit}` : ''} \
            ${memLimit ? `--mem-limit ${memLimit}` : ''} \
            \
            --json \
            `,
        {
            encoding: 'utf8',
            timeout: 0,
        })

    return JSON.parse(stdout)
}

router.post('/judge', async (ctx, next) => {
    const data = ctx.request.body as JudgeRequestBody

    try {
        if (!data.problemId) {
            throw new Error('Problem id is not provided')
        }
        if (!data.sourceCode) {
            throw new Error('No source code')
        }
        if (!data.timeLimit) {
            throw new Error('No time limit')
        }
        if (!data.memoryLimit) {
            throw new Error('No memory limit')
        }
        if (!data.language) {
            throw new Error('No language provided')
        }
 
        const problemDir = path.join(Config.problemsDir, data.problemId)
 
        if (!fs.existsSync(problemDir)) {
            throw new Error('Problem doesnt exist')
        }
 
        // Compile source code
        var extension: string
        var compileCMD: (compiledPath: string, sourcecodePath: string) => string

        if (data.language == 'cpp') {
            extension = '.cpp'
            compileCMD = (compiledPath: string, sourcecodePath: string) =>
                `g++ -o ${compiledPath} ${sourcecodePath}`
        } else {
            throw new Error(`Not supported language: ${data.language}`)
        }

        const sourcecodePath = path.join(Config.tempDir, `source${extension}`)
        const compiledPath = path.join(Config.tempDir, 'exec')
 
        fs.writeFileSync(sourcecodePath, data.sourceCode, { encoding: 'utf8' })
        await util.promisify(child_process.exec)(compileCMD(compiledPath, sourcecodePath))
 
        // Test per test cases
        const cpuLimit = parseInt(data.timeLimit)
        const realLimit = parseInt(data.timeLimit)
        const memLimit = parseInt(data.memoryLimit)

        if (isNaN(cpuLimit)) {
            throw new Error('Failed to parse time limit')
        }
        if (isNaN(memLimit)) {
            throw new Error('Failed to parse memory limit')
        }
 
        const files = fs.readdirSync(problemDir)
        const results = await Promise.all(
            files.filter((file) => {
                return /^.+\.in$/.test(file);
            }).map((file) => {
                const testcaseId = file.slice(0, -3)
                const outputFile = `${testcaseId}.out`
        
                return {
                    inputFile: file,
                    outputFile,
                }
            }).map(async ({ inputFile, outputFile }) => {
                const result = await lavidajudger({
                    execPath: compiledPath,
                    inputPath: path.join(problemDir, inputFile),
                    outputPath: path.join(problemDir, outputFile),
                    cpuLimit,
                    realLimit,
                    memLimit,
                })
                return result
            })
        )
 
        ctx.body = results
    } catch (e) {
        ctx.body = {
            error: e
        }
        ctx.status = 400
    }
})

// Middlewares
app.use(bodyParser())
app.use(logger())

// Routes
app.use(router.routes())
app.use(router.allowedMethods())

app.listen(Config.port, () => {
    console.log(`> judge server listening port at ${Config.port}`)
})
