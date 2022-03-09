import child_process from 'child_process'
import util from 'util'
import fs from 'fs'
import path, { parse } from 'path'

import Koa from 'koa'
import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'
import logger from 'koa-logger'

const app = new Koa()
const router = new Router()
const port = 3080

const PROBLEMS_DIR = './problems'
const TEMP_DIR = '/tmp'

interface JudgeRequestBody {
    submissionId?: string
    problemId?: string
    sourceCode?: string
    language?: string
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

    if (!data.problemId) {
        ctx.body = { error: 'Problem id is not provided' }
        ctx.status = 400
        return
    }

    const problemDir = path.join(PROBLEMS_DIR, data.problemId)

    if (!fs.existsSync(problemDir)) {
        ctx.body = { error: 'Problem doesnt exist' }
        ctx.status = 400
        return
    }

    if (!data.sourceCode) {
        ctx.body = { error: 'No source code' }
        ctx.status = 400
        return
    }

    // Compile source code
    // TODO: multiple langs
    const sourcecodePath = path.join(TEMP_DIR, 'source.cpp')
    const compiledPath = path.join(TEMP_DIR, 'exec')

    fs.writeFileSync(sourcecodePath, data.sourceCode, { encoding: 'utf8' })
    await util.promisify(child_process.exec)(`g++ -o ${compiledPath} ${sourcecodePath}`)

    // Test per test cases
    const cpuLimit = 1
    const realLimit = 1
    const memLimit = 256*1024*1024

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
            try {
                const result = await lavidajudger({
                    execPath: '/tmp/exec',
                    inputPath: path.join(problemDir, inputFile),
                    outputPath: path.join(problemDir, outputFile),
                    cpuLimit,
                    realLimit,
                    memLimit,
                })
                return result
            } catch (error) {
                return {
                    error
                }
            }
        })
    )

    ctx.body = results
})

// Middlewares
app.use(bodyParser())
app.use(logger())

// Routes
app.use(router.routes())
app.use(router.allowedMethods())

app.listen(port, () => {
    console.log(`> judge server listening port at ${port}`)
})
