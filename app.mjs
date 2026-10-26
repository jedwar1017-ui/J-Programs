import {SEED, STAGES, STORAGE_KEY, validate, summarize} from "./registry.mjs";
import {createWeeklyReview} from "./weekly-review.mjs";
const $ = id=>document.getElementById(id);
const state = {items:read(),query:""};
function read(){
  try {const raw=localStorage.getItem(STORAGE_KEY);return raw?validate(JSON.parse(raw)):validate(SEED);}
  catch {return validate(SEED);}
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.items));render();}
function msg(s){$("notice").textContent=s;}
function element(tag,text,css){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(css)el.className=css;return el;}
function render(){
  // Keep legacy @Pets entries in local storage/exports, but do not count or show them as software projects.
  const softwareItems=state.items.filter(p=>p.name!=="@Pets");
  const s=summarize(softwareItems);
  $("count").textContent=s.total;$("active").textContent=s.inProgress;$("verified").textContent=s.verified;
  const container=$("cards");container.replaceChildren();
  const matching=softwareItems.filter(p=>(p.name+" "+p.lane+" "+p.stage).toLowerCase().includes(state.query));
  for(const p of matching){
    const card=element("article",undefined,"card");const head=element("header");const title=element("h3",p.name);head.append(title,element("span",p.lane,"tag"));card.append(head);
    const stageLabel=element("label","Release stage");const stage=element("select");stage.setAttribute("aria-label","Release stage for "+p.name);
    for(const value of STAGES){const option=element("option",value.replaceAll("-"," "));option.value=value;option.selected=value===p.stage;stage.append(option);}
    stage.addEventListener("change",()=>{if(stage.value==="real-task-verified"&&!p.evidence.trim()){stage.value=p.stage;msg("Add evidence before marking "+p.name+" verified.");return;}p.stage=stage.value;save();msg("Updated stage for "+p.name);});
    const noteLabel=element("label","Evidence or blocker");const note=element("textarea");note.maxLength=2000;note.value=p.evidence;note.setAttribute("aria-label","Evidence or blocker for "+p.name);
    note.addEventListener("change",()=>{p.evidence=note.value.slice(0,2000);if(p.stage==="real-task-verified"&&!p.evidence.trim())p.stage="installed";save();msg("Saved evidence note for "+p.name);});
    const footer=element("p",p.stage==="real-task-verified"?"Verification recorded (user-supplied)":"Status is not independently verified","hint");
    card.append(stageLabel,stage,noteLabel,note,footer);container.append(card);
  }
  if(!matching.length)container.append(element("p","No projects match that filter."));
}
$("add-form").addEventListener("submit",e=>{e.preventDefault();const name=$("new-name").value.trim();if(!name)return;if(state.items.length>=200){msg("200 project limit reached");return;}
  state.items.push({id:"local-"+Date.now()+"-"+Math.random().toString(36).slice(2),name,lane:$("new-lane").value,stage:"idea",evidence:""});$("new-name").value="";save();msg("Created "+name);});
$("search").addEventListener("input",e=>{state.query=e.target.value.trim().toLowerCase();render();});
$("weekly-review").addEventListener("click",()=>{
  let url;
  try{
    // All records, not the on-screen filtered selection; never modifies saved state.
    const markdown=createWeeklyReview(state.items);
    const blob=new Blob([markdown],{type:"text/markdown;charset=utf-8"});
    url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="j-programs-weekly-review.md";a.click();
    msg("Weekly report downloaded. It may contain private notes; store it safely.");
  }catch(err){
    msg("Weekly report failed: "+String(err?.message||"Unknown error"));
  }finally{
    if(url)setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
});
$("backup").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state.items,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="j-programs-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);msg("Backup downloaded; keep it private.");});
$("restore").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>1024*1024)throw Error("Maximum 1 MB");state.items=validate(JSON.parse(await file.text()));save();msg("Imported "+state.items.length+" projects.");}catch(err){msg("Import rejected: "+err.message);}finally{e.target.value="";}});
render();
