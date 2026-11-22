# Steadfast Stack

[![make.fun](https://img.shields.io/badge/make.fun-bounty-7c3aed)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node 22](https://img.shields.io/badge/Node-22-green.svg)](https://nodejs.org)

A tiny stack virtual machine for [make.fun's bounty](https://make.fun/bounty/tiny-stack-vm-01-run-20261122): one run of `node main.ts` answers all 40 instances, reading `/input/<id>/program.bin` and `input.bin`, writing `/output/<id>/stdout.bin` and `exit.txt`.

Faithful to the ISA: wrapping 32-bit arithmetic (`Math.imul` for MUL), signed and unsigned division, shifts masked to 5 bits, all ten traps with their own exit codes, and the step (1,000,000) and output (65,536 bytes) limits.
