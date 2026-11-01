import test from "node:test";
import assert from "node:assert/strict";
import {readProjects,writeProjects} from "../storage.mjs";
import {SEED} from "../registry.mjs";

test("blocked storage access returns a visible warning",()=>{
 const denied=()=>{throw Error("blocked");};
 assert.match(readProjects(denied).warning,/not been overwritten/);
 assert.equal(writeProjects(denied,SEED).ok,false);
});
test("corrupt saved data is never overwritten on load",()=>{
 let writes=0;
 const storage={getItem:()=>"{broken",setItem:()=>writes++};
 assert.match(readProjects(()=>storage).warning,/could not be loaded/);
 assert.equal(writes,0);
});
test("quota failures keep edits available for export",()=>{
 const items=structuredClone(SEED);items[0].evidence="Unsaved work";
 const before=structuredClone(items);
 const result=writeProjects(()=>({setItem(){throw Error("quota");}}),items);
 assert.equal(result.ok,false);assert.match(result.warning,/Export a backup/);
 assert.deepEqual(items,before);
});
test("valid Unicode project data round trips through storage",()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(key,value)=>{raw=value;}};
 const items=structuredClone(SEED);items[0].evidence="Solar ☀️ / 日本語";
 assert.equal(writeProjects(()=>storage,items).ok,true);
 assert.deepEqual(readProjects(()=>storage),{items,warning:""});
});
