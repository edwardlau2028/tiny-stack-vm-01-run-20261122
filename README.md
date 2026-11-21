[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

# tiny-stack-vm

A tiny stack VM for [this make.fun bounty](https://make.fun/bounty/tiny-stack-vm-01-run-20261122). One run of `main.ts` answers all 40 instances of a set: it runs each program of the tiny stack ISA (32-bit wrapping integers, 256-value stack, calls, 256 words of memory, input/output, ten traps, step and output limits) and writes `/output/<id>/stdout.bin` and `/output/<id>/exit.txt`.

```
MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

No dependencies, no network. MIT licensed.
