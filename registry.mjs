export const STAGES = Object.freeze(["idea", "source-ready", "static-checked", "native-built", "installed", "real-task-verified"]);
export const SEED = Object.freeze([
  ["Earn Now", "income"], ["AI Collaboration", "build"], ["GitHub Pipeline", "build"],
  ["Movie Assistant", "build"], ["@Pets", "create"], ["MediaBridge", "build"],
  ["PC Remote", "build"], ["Nexus Shortcuts", "build"], ["J Creative Studio", "create"],
  ["Solar Projects", "create"], ["Maintenance & Skills", "maintain"]
].map(([name,lane],index)=>({id:"seed-"+index,name,lane,stage:"idea",evidence:""})));
export const STORAGE_KEY="j-programs-v1";
export function validate(input){
  if (!Array.isArray(input) || input.length>200) throw Error("Expected an array of at most 200 projects");
  const ids = new Set();
  return input.map(x=>{
    if (!x || typeof x!=="object" || Array.isArray(x) ||
      typeof x.id!=="string" || !x.id || x.id.length>80 || ids.has(x.id) ||
      typeof x.name!=="string" || !x.name.trim() || x.name.length>100 ||
      !["income","build","create","maintain"].includes(x.lane) ||
      !STAGES.includes(x.stage) || typeof x.evidence!=="string" || x.evidence.length>2000)
       throw Error("Invalid or duplicate project record");
    ids.add(x.id);
    return {id:x.id,name:x.name,lane:x.lane,stage:x.stage,evidence:x.evidence};
  });
}
export function summarize(items){
  const records = validate(items);
  return {total:records.length,verified:records.filter(x=>x.stage==="real-task-verified"&&x.evidence.trim().length>0).length,
    inProgress:records.filter(x=>x.stage!=="idea"&&x.stage!=="real-task-verified").length};
}
export function nextGate(stage){const i=STAGES.indexOf(stage);return i<0?null:STAGES[Math.min(i+1,STAGES.length-1)];}
