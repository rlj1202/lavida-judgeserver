# lavida-judgeserver

Lavida judge server

## API
### POST /judge
#### Request
```json
{
    "problemId": 1000,
    "sourceCode": "#include <cstdio>...",
    "language": "cpp",
    "timeLimit": 1,
    "memoryLimit": 268435456,
}
```

#### Response
```json
[
    {
        "cputime": 873,
        "realtime": 2202,
        "memory": 1658880,
        "exitcode": 0,
        "signal": 0,
        "graderesult": 0
    },
    {
        "cputime": 624,
        "realtime": 1031,
        "memory": 1724416,
        "exitcode": 0,
        "signal": 0,
        "graderesult": 0
    }
]
```
