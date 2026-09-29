const API="https://gen.pollinations.ai/v1/chat/completions";
const TTS="https://gen.pollinations.ai/v1/audio/speech";
const IMG="https://gen.pollinations.ai/v1/images/generations";
const STT="https://gen.pollinations.ai/v1/audio/transcriptions";
const $=id=>document.getElementById(id);
const HOST_VOICE="onyx";
let G=null, revealIdx=0, voteIdx=0, votes=[], timerId=null, rec=null, muted=false;

$("apikey").value=localStorage.getItem("pollen_key")||"";
$("apikey").onchange=e=>localStorage.setItem("pollen_key",e.target.value);
$("mute").onchange=e=>muted=e.target.checked;
const key=()=>$("apikey").value.trim();
function show(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("on"));$(id).classList.add("on");window.scrollTo(0,0);}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

async function call(messages,json){
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key()},
    body:JSON.stringify({model:"openai",messages,max_tokens:1200,...(json?{response_format:{type:"json_object"}}:{})})});
  const d=await r.json();
  if(!r.ok)throw new Error((d.error&&d.error.message)||("HTTP "+r.status));
  return d.choices[0].message.content;
}
async function speak(text,voice){
  if(muted||!key())return;
  try{
    const r=await fetch(TTS,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key()},
      body:JSON.stringify({model:"tts-1",voice:voice||HOST_VOICE,input:text})});
    if(!r.ok)return;
    const b=await r.blob();
    const a=document.createElement("audio");a.src=URL.createObjectURL(b);a.autoplay=true;a.controls=true;
    $("chat").appendChild(a);$("chat").scrollTop=1e6;
  }catch(e){}
}
function hostLine(text,voice){ // host speaks in chat + aloud
  const d=document.createElement("div");d.className="msg host";
  d.innerHTML="<small>🎭 The Curator</small>"+esc(text).replace(/\n/g,"<br>");
  $("chat").appendChild(d);$("chat").scrollTop=1e6;
  speak(text,voice);
}

/* ---------- SETUP ---------- */
$("start").onclick=async()=>{
  if(!key())return alert("Enter your Pollen key first (top right). The host is billed to your own Pollen.");
  const n=Math.max(4,Math.min(10,parseInt($("nplayers").value)||6));
  let names=($("names").value||"").split(",").map(s=>s.trim()).filter(Boolean);
  const def=["Ava","Ben","Cleo","Dorian","Elsa","Felix","Greta","Hugo","Iris","Jonas"];
  while(names.length<n)names.push(def[names.length%def.length]+(names.length>=def.length?(" "+names.length):""));
  names=names.slice(0,n);
  const traitors=n<=6?1:2;
  $("status").textContent="The Curator is writing tonight's scenario…";
  $("start").disabled=true;
  try{
    const raw=await call([{role:"system",content:
`You are "The Curator", the host of a social-deduction party game. Invent a FRESH secret-society scenario.
Return JSON only:
{"title":string, "setting":string (1 sentence), "premise":string (2-3 vivid sentences read aloud), 
 "loyalTeam":{"name":string (in-fiction name),"goal":string (so they can pose as it)},
 "traitorTeam":{"name":string,"goal":string (their hidden win condition)},
 "cast":[{"name":string,"persona":string (1 sentence, how they speak),"secret":string (a private agenda or quirk, 1 sentence)}],
 "rounds":[{"title":string,"text":string (2-3 sentences: a twist or clue The Curator narrates aloud, ambiguous, raises suspicion without naming a traitor)}]}
Exactly ${n} cast members. Exactly 3 rounds. Use these player names in order: ${names.join(", ")}.
Make teams, factions and flavor original and evocative (not "mafia"/"werewolf" clichés). Respond ONLY with JSON.`}],true);
    const g=JSON.parse(raw);
    // assign teams randomly
    const idx=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
    const traitorSet=new Set(idx.slice(0,traitors));
    G={...g,players:g.cast.map((c,i)=>({...c,team:traitorSet.has(i)?"traitor":"loyal"})),traitors,round:0};
    $("status").textContent="Scenario ready.";
    revealIdx=0;show("s-reveal");renderReveal();
  }catch(e){$("status").textContent="Error: "+e.message;}
  $("start").disabled=false;
};

/* ---------- REVEAL ---------- */
function renderReveal(){
  const p=G.players[revealIdx];
  $("reveal-pass").innerHTML="Pass the device to<br><b style='color:var(--gold)'>"+esc(p.name)+"</b><br><span class='muted'>Nobody else should look.</span>";
  const card=$("reveal-card");card.classList.add("hidden");card.innerHTML="";
  $("reveal-card").dataset.ready="0";
  $("reveal-pass").innerHTML+="<div style='margin-top:22px'><button class='bigbtn' onclick='showRole()'>I am "+esc(p.name)+" — show my role</button></div>";
}
function showRole(){
  const p=G.players[revealIdx],t=p.team;
  const teamName=t==="loyal"?G.loyalTeam.name:G.traitorTeam.name;
  const goal=t==="loyal"?G.loyalTeam.goal:G.traitorTeam.goal;
  let accomplices="";
  if(t==="traitor"&&G.traitors>1){
    const others=G.players.filter(x=>x.team==="traitor"&&x.name!==p.name).map(x=>x.name);
    accomplices="<p class='muted' style='margin-top:10px'><b>Your accomplices:</b> "+esc(others.join(", "))+" — keep each other's cover.</p>";
  }
  const card=$("reveal-card");
  card.innerHTML="<div class='card'><div class='muted'>"+esc(p.name)+", your secret role</div>"+
    "<div class='team "+(t==="loyal"?"loyal":"traitor")+"'>"+esc(teamName)+"</div>"+
    "<p class='muted'>You are the <b>"+esc(p.role||"guest")+"</b>. "+esc(p.persona)+"</p>"+
    "<p class='muted' style='margin-top:8px'><b>Your objective:</b> "+esc(goal)+"</p>"+
    "<p class='muted' style='margin-top:8px'><b>Private note:</b> "+esc(p.secret)+"</p>"+accomplices+
    "<div style='margin-top:16px'><button class='bigbtn' onclick='nextReveal()'>Hide & pass on</button></div></div>";
  card.classList.remove("hidden");
}
function nextReveal(){
  revealIdx++;
  if(revealIdx<G.players.length){renderReveal();return;}
  show("s-round");startRound();
}

/* ---------- ROUNDS ---------- */
function startRound(){
  const r=G.rounds[G.round], p=G.round>0;
  $("round-title").textContent=r.title||("Round "+(G.round+1));
  $("round-badge").textContent="Round "+(G.round+1)+" / "+G.rounds.length;
  $("round-text").textContent=r.text;
  $("chat").innerHTML="";
  if(!p){ // first round gets the opening premise
    $("chat").innerHTML="";
    hostLine(G.premise+"\n\nSetting: "+G.setting);
  }
  hostLine(r.text);
  resetTimer();
}
function resetTimer(){clearInterval(timerId);timerId=null;$("timer").textContent=String($("secs").value).padStart(2,"0");}
$("tstart").onclick=()=>{
  clearInterval(timerId);let t=parseInt($("secs").value);
  $("timer").textContent=t;
  timerId=setInterval(()=>{t--;$("timer").textContent=t;
    if(t<=0){clearInterval(timerId);timerId=null;hostLine("Time is up. Suspicions should be sharp by now.");}
  },1000);
};
$("tskip").onclick=()=>{clearInterval(timerId);timerId=null;$("timer").textContent="--";};
$("ask").onclick=askHost;
$("q").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();askHost();}};
async function askHost(){
  const q=$("q").value.trim()||await listenOnce();
  if(!q)return;
  $("q").value="";
  const d=document.createElement("div");d.className="msg player";d.textContent=q;$("chat").appendChild(d);$("chat").scrollTop=1e6;
  $("qstatus").textContent="The Curator considers…";
  const publicInfo="Premise: "+G.premise+" Setting: "+G.setting+" Teams are: "+G.loyalTeam.name+" (a loyal society) and a hidden minority among them. Round: "+(G.round+1)+" of "+G.rounds.length+".";
  const secrets=G.players.map(p=>p.name+": "+p.persona).join(" | ");
  try{
    const a=await call([{role:"system",content:
`You are The Curator, an enigmatic host of a masked secret society. ${publicInfo}
Guests (public personas only): ${secrets}.
Answer the guest's question IN CHARACTER, 2-4 sentences, atmospheric and elegant. You MAY hint obliquely or misdirect, but NEVER state or confirm any player's secret team, never reveal who is in the hidden minority, and never break character or mention being an AI.`},
    {role:"user",content:q}]);
    hostLine(a);
    $("qstatus").textContent="";
  }catch(e){$("qstatus").textContent="Error: "+e.message;}
}
$("mic").onclick=async()=>{const t=await listenOnce();if(t){$("q").value=t;askHost();}};
let micStop=null;
function listenOnce(){
  return new Promise(res=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(SR){
      if(rec){try{rec.stop()}catch(e){}return res("");}
      rec=new SR();rec.lang="en-US";rec.interimResults=false;
      $("mic").textContent="🔴";$("qstatus").textContent="Listening…";
      rec.onresult=e=>{res(e.results[0][0].transcript);};
      rec.onend=()=>{rec=null;$("mic").textContent="🎤";$("qstatus").textContent="";};
      rec.onerror=()=>{$("qstatus").textContent="Mic unavailable — type instead.";};
      rec.start();return;
    }
    if(micStop){micStop();return res("");}
    if(!navigator.mediaDevices){$("qstatus").textContent="Mic unavailable — type instead.";return res("");}
    navigator.mediaDevices.getUserMedia({audio:true}).then(st=>{
      const mr=new MediaRecorder(st),chunks=[];
      mr.ondataavailable=e=>chunks.push(e.data);
      mr.onstop=async()=>{st.getTracks().forEach(t=>t.stop());micStop=null;$("mic").textContent="🎤";
        try{const fd=new FormData();fd.append("model","openai/whisper-large-v3");fd.append("file",new Blob(chunks,{type:"audio/webm"}),"q.webm");
          const r=await fetch(STT,{method:"POST",headers:{Authorization:"Bearer "+key()},body:fd});
          const d=await r.json();res((d.text||"").trim());
        }catch(e){res("");}
      };
      micStop=()=>{try{mr.stop()}catch(e){}};
      mr.start();$("mic").textContent="🔴";$("qstatus").textContent="Recording… tap again to stop";
    }).catch(()=>{$("qstatus").textContent="Mic blocked — type instead.";res("");});
  });
}
$("portraits").onclick=async()=>{
  $("portraits").disabled=true;$("qstatus").textContent="Painting portraits…";
  const gal=document.createElement("div");gal.id="gallery-inline";gal.style.cssText="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:12px";
  $("chat").appendChild(gal);
  for(const p of G.players){
    try{
      const r=await fetch(IMG,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key()},
        body:JSON.stringify({model:"flux",prompt:"Renaissance oil portrait of a masked secret-society guest named "+p.name+", "+p.persona+", candlelit, ornate attire, painterly, no text",n:1,size:"512x512"})});
      const d=await r.json();
      const b64=d.data&&d.data[0]&&(d.data[0].b64_json||null);
      const url=b64?("data:image/jpeg;base64,"+b64):(d.data&&d.data[0]&&d.data[0].url);
      if(url){const f=document.createElement("figure");f.innerHTML="<img src='"+url+"'><figcaption>"+esc(p.name)+"</figcaption>";gal.appendChild(f);}
    }catch(e){}
  }
  $("qstatus").textContent="";$("portraits").disabled=false;
};
$("tovote").onclick=()=>{
  if(G.round<G.rounds.length-1){G.round++;startRound();return;}
  clearInterval(timerId);votes=[];voteIdx=0;show("s-vote");renderVote();
};

/* ---------- VOTE ---------- */
function renderVote(){
  const v=G.players[voteIdx];
  $("vote-pass").innerHTML="Pass the device to<br><b style='color:var(--gold)'>"+esc(v.name)+"</b><br><span class='muted'>Who do you banish from the society?</span>";
  const c=$("vote-card");c.innerHTML="";
  G.players.forEach((p,i)=>{
    if(p.name===v.name)return;
    const b=document.createElement("button");b.className="vote-opt";b.textContent="🕯️ "+p.name;
    b.onclick=()=>{
      votes.push({voter:v.name,target:i});
      voteIdx++;
      if(voteIdx<G.players.length){renderVote();}
      else{verdict();}
    };
    c.appendChild(b);
  });
  c.classList.remove("hidden");
}
async function verdict(){
  const tally={};votes.forEach(x=>tally[x.target]=(tally[x.target]||0)+1);
  let top=-1,tc=0;for(const k in tally){if(tally[k]>tc){tc=tally[k];top=+k;}}
  const banished=G.players[top];
  const win=banished.team==="traitor"?"loyal":"traitor";
  const tie=Object.values(tally).filter(v=>v===tc).length>1;
  show("s-verdict");
  $("v-title").textContent=win==="loyal"?"✅ The society survives":"🎭 The hidden few prevail";
  const summary=G.players.map((p,i)=>p.name+": "+esc(p.team==="loyal"?"loyal":"hidden")).join(" · ");
  const tallyText=G.players.map((p,i)=>p.name+" — "+(tally[i]||0)).join(", ");
  $("v-text").innerHTML=(tie?"<b>The vote was split.</b> ":"")+"The society banished <b>"+esc(banished.name)+"</b>, who was <b>"+(banished.team==="loyal"?"loyal":"of the hidden minority")+"</b>.<br>Votes: "+esc(tallyText);
  $("cast").innerHTML=G.players.map(p=>"<span class='pill' style='border-color:"+(p.team==="traitor"?"var(--traitor)":"var(--loyal)")+"'>"+esc(p.name)+" — "+(p.team==="traitor"?"hidden":"loyal")+"</span>").join("");
  $("status").textContent="";
  try{
    const outro=await call([{role:"system",content:
`You are The Curator closing a social-deduction party. The society banished ${banished.name}, who was ${banished.team==="loyal"?"actually LOYAL":"secretly of the hidden minority"}. The ${win==="loyal"?"loyal society":"hidden minority"} won. Team names: loyal = ${G.loyalTeam.name}, hidden = ${G.traitorTeam.name}. Write a dramatic 3-4 sentence epilogue, in character, and name the winning faction.`},
    {role:"user",content:"Close the game."}]);
    hostLine(outro);
  }catch(e){}
}
$("again").onclick=()=>{show("s-setup");$("start").disabled=false;};
