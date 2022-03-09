# lavida-judgeserver

Lavida judge server

## API
### POST /judge
#### Request
```json
{
    "submission_id": 0,
    "problem_id": 0,
    "sourceCode": "#include <cstdio>...",
    "language": "c++"
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
