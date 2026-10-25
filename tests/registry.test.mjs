import test from "node:test";import assert from "node:assert/strict";
import {SEED,STAGES,validate,summarize,nextGate} from "../registry.mjs";
test("seed has unique project ids",()=>assert.equal(new Set(SEED.map(x=>x.id)).size,SEED.length));
test("seed loads",()=>assert.equal(validate(SEED).length,11));
test("no project is initially claimed verified",()=>assert.equal(summarize(SEED).verified,0));
test("verified means evidence plus final gate",()=>{const p={...SEED[0],stage:"real-task-verified",evidence:"Checked on real device"};assert.equal(summarize([p]).verified,1);assert.equal(summarize([{...p,evidence:""}]).verified,0);});
test("unrecognized stage rejected",()=>assert.throws(()=>validate([{...SEED[0],stage:"released"}]),/Invalid/));
test("duplicate ids rejected",()=>assert.throws(()=>validate([SEED[0],SEED[0]]),/Invalid/));
test("next gate cannot exceed verified",()=>{assert.equal(nextGate("source-ready"),"static-checked");assert.equal(nextGate(STAGES.at(-1)),STAGES.at(-1));});
