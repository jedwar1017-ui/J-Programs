import test from "node:test";
import assert from "node:assert/strict";
import {PUBLIC_REPOS,interpretRun,checkOne} from "../github-status.mjs";
const repo=PUBLIC_REPOS[1];
const valid={status:"completed",conclusion:"success",head_sha:"a".repeat(40),created_at:"2026-10-25T17:10:55Z",
 html_url:"https://github.com/"+repo.slug+"/actions/runs/40215215178"};
test("four known public repos",()=>{assert.equal(PUBLIC_REPOS.length,4);assert.equal(new Set(PUBLIC_REPOS.map(x=>x.slug)).size,4);});
test("only completed successful CI is passed",()=>{
 assert.equal(interpretRun({workflow_runs:[valid]},repo.slug).state,"passed");
 assert.equal(interpretRun({workflow_runs:[{...valid,status:"in_progress"}]},repo.slug).state,"pending");
 assert.equal(interpretRun({workflow_runs:[{...valid,conclusion:"failure"}]},repo.slug).state,"failed");
});
test("missing results are unknown",()=>assert.equal(interpretRun({workflow_runs:[]},repo.slug).state,"unknown"));
test("strange run URLs never become links",()=>{
 assert.equal(interpretRun({workflow_runs:[{...valid,html_url:"https://bad.example/steal"}]},repo.slug).href,null);
});
test("network error is unavailable, not failed",async()=>{
 const output=await checkOne(repo,async()=>{throw Error("offline");});
 assert.equal(output.state,"unknown");assert.match(output.detail,/offline/);
});
test("HTTP 403 is not a false failure",async()=>{
 const output=await checkOne(repo,async()=>({ok:false,status:403}));
 assert.equal(output.state,"unknown");
});
test("uses public GitHub Actions endpoint only",async()=>{
 let called="";
 await checkOne(repo,async url=>{called=url;return {ok:true,json:async()=>({workflow_runs:[valid]})};});
 assert.equal(called,"https://api.github.com/repos/"+repo.slug+"/actions/runs?branch=main&per_page=1");
});
