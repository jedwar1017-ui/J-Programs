// Read-only, opt-in monitor for the four PUBLIC project repositories.
// No credentials, private repositories, deployment claims, or token storage.
export const PUBLIC_REPOS = Object.freeze([
  {label:"Nexus Shortcuts",slug:"jedwar1017-ui/-jedwar1017-ui-nexus-shortcuts"},
  {label:"J-Programs",slug:"jedwar1017-ui/J-Programs"},
  {label:"J Creative Studio",slug:"jedwar1017-ui/J-Creative-Studio"},
  {label:"@Pets Playground",slug:"jedwar1017-ui/pets-playground"}
]);
export function interpretRun(payload, slug){
  const run=Array.isArray(payload?.workflow_runs)?payload.workflow_runs[0]:null;
  if(!run) return {text:"No workflow run reported",detail:"No CI result available",state:"unknown",href:null};
  let state="pending",text="Running or queued";
  if(run.status==="completed"){
    if(run.conclusion==="success"){state="passed";text="Unit tests passed";}
    else if(run.conclusion==="failure"||run.conclusion==="timed_out"){state="failed";text="Checks failed";}
    else {state="unknown";text="Check finished: "+String(run.conclusion||"unknown");}
  }
  const sha=typeof run.head_sha==="string" && /^[a-f0-9]{40}$/.test(run.head_sha)?run.head_sha.slice(0,7):"unknown";
  const href=typeof run.html_url==="string" &&
     run.html_url.startsWith("https://github.com/"+slug+"/actions/runs/") &&
     /^https:\/\/github\.com\/[^\s]+\/actions\/runs\/\d+$/.test(run.html_url)?run.html_url:null;
  const when=typeof run.created_at==="string" && !Number.isNaN(Date.parse(run.created_at))
    ? new Date(run.created_at).toLocaleString(): "unknown time";
  return {state,text,detail:"Commit "+sha+" · run "+when,href};
}
export async function checkOne(repo, fetcher=fetch){
  const url="https://api.github.com/repos/"+repo.slug+"/actions/runs?branch=main&per_page=1";
  try{
    const res=await fetcher(url,{headers:{Accept:"application/vnd.github+json"}});
    if(!res.ok) throw new Error(res.status===403?"GitHub rate limit or access restriction":"HTTP "+res.status);
    return interpretRun(await res.json(),repo.slug);
  }catch(error){return {state:"unknown",text:"Status unavailable",detail:String(error.message||error),href:null};}
}
if(typeof document!=="undefined"){
  const trigger=document.getElementById("refresh-ci");
  const host=document.getElementById("ci-results");
  if(trigger && host){
    trigger.addEventListener("click",async()=>{
      trigger.disabled=true;host.replaceChildren();
      const working=document.createElement("p");working.textContent="Checking public GitHub Actions results…";host.append(working);
      const results=await Promise.all(PUBLIC_REPOS.map(repo=>checkOne(repo)));
      host.replaceChildren();
      results.forEach((status,i)=>{
        const row=document.createElement("article");row.className="card";
        const heading=document.createElement("h3");heading.textContent=PUBLIC_REPOS[i].label;
        const result=document.createElement("p");result.textContent=status.text;
        result.style.fontWeight="800";
        result.style.color=status.state==="passed"?"#91f2c3":status.state==="failed"?"#ffb0aa":"#c8d5f1";
        const detail=document.createElement("p");detail.className="hint";detail.textContent=status.detail;
        row.append(heading,result,detail);
        if(status.href){const a=document.createElement("a");a.href=status.href;a.rel="noopener noreferrer";a.target="_blank";a.textContent="Inspect GitHub run";a.style.color="#89d6ff";row.append(a);}
        host.append(row);
      });
      trigger.disabled=false;
    });
  }
}
