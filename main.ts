// Steadfast Stack: tiny stack VM for make.fun ISA v1. One run answers all
// 40 instances under /input/<id>/, writing /output/<id>/stdout.bin + exit.txt.
// MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR override /input and /output locally.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const IN = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
function run(p, inp) {
  const S = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let cp = 0;
  const M = new Int32Array(256);
  const O = new Uint8Array(65536);
  let ol = 0, pc = 0, ip = 0, st = 0;
  const end = (c) => ({ o: O.slice(0, ol), c });
  for (;;) {
    if (st === 1000000) return end(10);
    if (pc < 0 || pc >= p.length) return end(9);
    const op = p[pc];
    let im;
    if (op === 0x01) im = 1;
    else if (op === 0x02) im = 4;
    else if (op === 0x30 || op === 0x31 || op === 0x32 || op === 0x33) im = 2;
    else if (
      op === 0x00 || op === 0x03 || op === 0x04 || op === 0x05 || op === 0x06 ||
      op === 0x07 || (op >= 0x10 && op <= 0x1e) || op === 0x20 || op === 0x21 ||
      op === 0x22 || op === 0x34 || op === 0x40 || op === 0x41 || op === 0x50 ||
      op === 0x51 || op === 0x52 || op === 0x53
    ) im = 0;
    else return end(5);
    if (pc + im >= p.length) return end(9);
    st++;
    const nx = pc + 1 + im;
    pc = nx;
    switch (op) {
      case 0x00: return end(0);
      case 0x01:
        if (sp >= 256) return end(3);
        S[sp++] = (p[nx - 1] << 24) >> 24;
        break;
      case 0x02:
        if (sp >= 256) return end(3);
        S[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24);
        break;
      case 0x03: if (sp < 1) return end(2); sp--; break;
      case 0x04:
        if (sp < 1) return end(2);
        if (sp >= 256) return end(3);
        S[sp] = S[sp - 1]; sp++;
        break;
      case 0x05: {
        if (sp < 2) return end(2);
        const t = S[sp - 1]; S[sp - 1] = S[sp - 2]; S[sp - 2] = t;
        break;
      }
      case 0x06:
        if (sp < 2) return end(2);
        if (sp >= 256) return end(3);
        S[sp] = S[sp - 2]; sp++;
        break;
      case 0x07: {
        if (sp < 3) return end(2);
        const a = S[sp - 3]; S[sp - 3] = S[sp - 2]; S[sp - 2] = S[sp - 1]; S[sp - 1] = a;
        break;
      }
      case 0x17: if (sp < 1) return end(2); S[sp - 1] = -S[sp - 1] | 0; break;
      case 0x1b: if (sp < 1) return end(2); S[sp - 1] = ~S[sp - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
      case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
      case 0x1e: case 0x20: case 0x21: case 0x22: {
        if (sp < 2) return end(2);
        const b = S[sp - 1], a = S[sp - 2];
        let r;
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) {
          if (b === 0) return end(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) {
          if (b === 0) return end(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 0x15) {
          if (b === 0) return end(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) {
          if (b === 0) return end(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        S[sp - 2] = r; sp--;
        break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        if (op !== 0x30) {
          if (sp < 1) return end(2);
          const v = S[--sp];
          if ((op === 0x31) !== (v === 0)) break;
        }
        pc = nx + rel;
        break;
      }
      case 0x33:
        if (cp === 64) return end(7);
        C[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return end(8);
        pc = C[--cp];
        break;
      case 0x40: {
        if (sp < 1) return end(2);
        const a = S[sp - 1];
        if (a < 0 || a > 255) return end(6);
        S[sp - 1] = M[a];
        break;
      }
      case 0x41: {
        if (sp < 2) return end(2);
        const a = S[sp - 1], v = S[sp - 2];
        if (a < 0 || a > 255) return end(6);
        sp -= 2; M[a] = v;
        break;
      }
      case 0x50: {
        if (sp < 1) return end(2);
        const v = S[sp - 1];
        const d = new Uint8Array(12);
        let dl = 0, u = v < 0 ? -v : v;
        if (u === 0) d[dl++] = 48;
        else while (u > 0) { d[dl++] = 48 + (u % 10); u = Math.floor(u / 10); }
        if (v < 0) d[dl++] = 45;
        if (ol + dl > 65536) return end(11);
        sp--;
        for (let i = dl - 1; i >= 0; i--) O[ol++] = d[i];
        break;
      }
      case 0x51:
        if (sp < 1) return end(2);
        if (ol + 1 > 65536) return end(11);
        O[ol++] = S[--sp] & 255;
        break;
      case 0x52:
        if (sp >= 256) return end(3);
        S[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 0x53:
        if (sp < 1) return end(2);
        return end(S[--sp] & 255);
    }
  }
}
for (const id of readdirSync(IN).sort()) {
  const r = run(
    new Uint8Array(readFileSync(join(IN, id, 'program.bin'))),
    new Uint8Array(readFileSync(join(IN, id, 'input.bin'))),
  );
  mkdirSync(join(OUT, id), { recursive: true });
  writeFileSync(join(OUT, id, 'stdout.bin'), r.o);
  writeFileSync(join(OUT, id, 'exit.txt'), `${r.c}\n`);
}
