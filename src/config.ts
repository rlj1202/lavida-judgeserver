import dotenv from 'dotenv'

dotenv.config({})

const isDev = process.env.NODE_ENV !== 'production'

const Config = {
    port: process.env.PORT ?? 3080,

    problemsDir: './problems',
    tempDir: '/tmp',
}

export default Config
