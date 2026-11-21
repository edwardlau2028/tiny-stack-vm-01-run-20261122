// Tiny stack VM: make.fun tiny stack ISA v1. One run answers i001-i040.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; code: number } {
  const D = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let cp = 0;
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let ol = 0, ip = 0, pc = 0, steps = 0;
  const enc = new TextEncoder();
  const done = (code: number) => ({ out: out.slice(0, ol), code });
  for (;;) {
    // One step, in ISA order: step limit, pc range, opcode, immediate fit.
    if (steps === 1e6) return done(10);
    if (pc < 0 || pc >= p.length) return done(9);
    const op = p[pc];
    const known = op < 8 || (op >= 16 && op <= 30) || (op >= 32 && op <= 34) ||
      (op >= 48 && op <= 52) || op === 64 || op === 65 || (op >= 80 && op <= 83);
    if (!known) return done(5);
    const imm = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
    if (pc + imm >= p.length) return done(9);
    const pops = op === 7 ? 3 : op === 5 || op === 6 || op === 65 ||
      (op >= 16 && op <= 22) || (op >= 24 && op <= 26) || (op >= 28 && op <= 30) ||
      (op >= 32 && op <= 34) ? 2 : op === 3 || op === 4 || op === 23 || op === 27 ||
      op === 49 || op === 50 || op === 64 || op === 80 || op === 81 || op === 83 ? 1 : 0;
    const push = op === 6 || op === 7 ? 3 : op === 4 || op === 5 ? 2 :
      op === 1 || op === 2 || op === 64 || op === 82 ||
      (op >= 16 && op <= 34) ? 1 : 0;
    steps++;
    // Stack needs are checked before the instruction's own traps/effect.
    if (sp < pops) return done(2);
    if (sp - pops + push > 256) return done(3);
    const nx = pc + 1 + imm;
    pc = nx;
    switch (op) {
      case 0: return done(0); // HALT
      case 1: D[sp++] = (p[nx - 1] << 24) >> 24; break; // PUSH8, sign-extended
      case 2: D[sp++] = p[nx - 4] | p[nx - 3] << 8 | p[nx - 2] << 16 | p[nx - 1] << 24; break; // PUSH32
      case 3: sp--; break; // POP
      case 4: D[sp] = D[sp - 1]; sp++; break; // DUP
      case 5: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; } // SWAP
      case 6: D[sp] = D[sp - 2]; sp++; break; // OVER
      case 7: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; } // ROT
      case 23: D[sp - 1] = -D[sp - 1] | 0; break; // NEG, wraps at -2147483648
      case 27: D[sp - 1] = ~D[sp - 1]; break; // NOT
      case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 24:
      case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        const b = D[sp - 1], a = D[sp - 2];
        let r = 0;
        if (op === 16) r = a + b | 0;
        else if (op === 17) r = a - b | 0;
        else if (op === 18) r = Math.imul(a, b); // exact low 32 bits
        else if (op === 19) {
          if (!b) return done(4);
          r = a === -2147483648 && b === -1 ? a : a / b | 0; // trunc toward zero
        } else if (op === 20) {
          if (!b) return done(4);
          r = b === -1 ? 0 : a % b | 0; // sign of a
        } else if (op === 21) {
          if (!b) return done(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0; // unsigned
        } else if (op === 22) {
          if (!b) return done(4);
          r = (a >>> 0) % (b >>> 0) | 0; // unsigned
        } else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31); // arithmetic
        else if (op === 30) r = a >>> (b & 31) | 0; // logical
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU, unsigned
        sp -= 2;
        D[sp++] = r;
        break;
      }
      case 48: case 49: case 50: { // JMP / JZ / JNZ
        const rel = (p[nx - 2] | p[nx - 1] << 8) << 16 >> 16;
        let take = op === 48;
        if (op !== 48) { const v = D[--sp]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) pc = nx + rel;
        break;
      }
      case 51: // CALL, unsigned absolute target
        if (cp === 64) return done(7);
        C[cp++] = nx;
        pc = p[nx - 2] | p[nx - 1] << 8;
        break;
      case 52: // RET
        if (!cp) return done(8);
        pc = C[--cp];
        break;
      case 64: { // LOAD
        const a = D[sp - 1];
        if (a < 0 || a >= 256) return done(6);
        D[sp - 1] = M[a];
        break;
      }
      case 65: { // STORE: (v addr --)
        const a = D[sp - 1], v = D[sp - 2];
        if (a < 0 || a >= 256) return done(6);
        sp -= 2;
        M[a] = v;
        break;
      }
      case 80: { // PRINT: decimal ASCII, no newline
        const b = enc.encode(String(D[sp - 1]));
        if (ol + b.length > 65536) return done(11); // writes nothing
        sp--;
        out.set(b, ol);
        ol += b.length;
        break;
      }
      case 81: // PUTC: low byte
        if (ol + 1 > 65536) return done(11);
        out[ol++] = D[--sp] & 255;
        break;
      case 82: // IN: -1 once the input is used up
        D[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 83: // EXIT: low byte of the code
        return done(D[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const d of readdirSync(I, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const id = d.name;
  let prog: Buffer = Buffer.alloc(0), inp: Buffer = Buffer.alloc(0);
  try { prog = readFileSync(join(I, id, 'program.bin')); } catch { /* empty */ }
  try { inp = readFileSync(join(I, id, 'input.bin')); } catch { /* empty */ }
  const r = run(new Uint8Array(prog), new Uint8Array(inp));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
