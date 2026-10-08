"use client";
import dynamic from "next/dynamic";
import {useEffect,useRef,useState,type PointerEvent} from "react";
import {supabase} from "../lib/supabase";
import WorkPanel from "./work-panel";

const AbujaWorld=dynamic(()=>import("./abuja-world"),{ssr:false});
type PlayerState={location_id:string;cash_kobo:number;bank_kobo:number;energy:number;hunger:number;health:number;happiness:number;reputation:number;game_day:number;minutes_today:number};
type PlayerProfile={display_name:string;avatar_key:string};
type GameJob={id:string;name:string;category:string;energy_cost:number;minutes_cost:number;min_pay_kobo:number;max_pay_kobo:number;required_reputation:number};

const locationNames:Record<string,string>={"central-area":"Central Area, Abuja",wuse:"Wuse, Abuja",garki:"Garki, Abuja",jabi:"Jabi, Abuja"};
function formatNaira(k:number){return new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(k/100)}
function formatTime(n:number){const h=Math.floor(n/60),m=n%60;return(h%12||12)+":"+m.toString().padStart(2,"0")+" "+(h>=12?"PM":"AM")}
const MINI_POINTS=[
 {name:"Central Area",x:0,z:0},{name:"Wuse",x:2340,z:-2340},{name:"Garki",x:-770,z:2560},
 {name:"Jabi",x:-2230,z:-1560},{name:"National Mosque",x:-190,z:-580},{name:"National Christian Centre",x:540,z:367},
 {name:"Wuse Market",x:-2200,z:-1510},{name:"Abuja ICC",x:-2930,z:1890}
];
function MiniMap({x,z,yaw}:{x:number;z:number;yaw:number}){
 const scale=.055,size=190;
 const tx=-x*scale+size/2,ty=-z*scale+size/2,rot=yaw*180/Math.PI;
 return <div className="minimap" aria-label="Minimap">
   <div className="minimap-title">ABUJA <span>MAP</span></div>
   <div className="minimap-world" style={{transform:"translate("+tx+"px,"+ty+"px)"}}>
     <div className="minimap-road minimap-road-h" style={{top:92}}/><div className="minimap-road minimap-road-v" style={{left:92}}/>
     <div className="minimap-road minimap-road-h" style={{top:65}}/><div className="minimap-road minimap-road-v" style={{left:65}}/>
     {MINI_POINTS.map(p=><div key={p.name} className="minimap-point" style={{left:p.x*scale+size/2,top:p.z*scale+size/2}} title={p.name}/>)}
   </div>
   <div className="minimap-player" style={{transform:"translate(-50%,-50%) rotate("+rot+"deg)"}}><span/></div>
   <div className="minimap-label">● PLAYER</div>
 </div>;
}

export default function GameHome(){
 const[profile,setProfile]=useState<PlayerProfile|null>(null),[state,setState]=useState<PlayerState|null>(null),[jobs,setJobs]=useState<GameJob[]>([]);
 const[loading,setLoading]=useState(true),[showWork,setShowWork]=useState(false),[message,setMessage]=useState("");
 const[move,setMove]=useState({x:0,z:0}),[nearby,setNearby]=useState<string|null>(null),[playerPos,setPlayerPos]=useState({x:0,z:0});
 const[cameraYaw,setCameraYaw]=useState(0),[cameraPitch,setCameraPitch]=useState(.48),[jump,setJump]=useState(0),[running,setRunning]=useState(false);
 const[joystickPos,setJoystickPos]=useState({x:0,y:0}),[lookActive,setLookActive]=useState(false);
 const lookStart=useRef({x:0,y:0}),keys=useRef({x:0,z:0}),keyTimer=useRef<number|null>(null);

 const setKeyboardMove=()=>{const k=keys.current;setMove(v=>v.x===k.x&&v.z===k.z?v:{x:k.x,z:k.z});};
 useEffect(()=>{
   const down=(e:KeyboardEvent)=>{
     if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d","W","A","S","D","Shift"].includes(e.key))e.preventDefault();
     const k=keys.current;
     if(e.key==="w"||e.key==="W"||e.key==="ArrowUp")k.z=-1;
     if(e.key==="s"||e.key==="S"||e.key==="ArrowDown")k.z=1;
     if(e.key==="a"||e.key==="A"||e.key==="ArrowLeft")k.x=-1;
     if(e.key==="d"||e.key==="D"||e.key==="ArrowRight")k.x=1;
     if(e.key==="Shift")setRunning(true);
     setKeyboardMove();
   };
   const up=(e:KeyboardEvent)=>{
     const k=keys.current;
     if(["w","W","ArrowUp","s","S","ArrowDown"].includes(e.key))k.z=0;
     if(["a","A","ArrowLeft","d","D","ArrowRight"].includes(e.key))k.x=0;
     if(e.key==="Shift")setRunning(false);
     setKeyboardMove();
   };
   window.addEventListener("keydown",down,{passive:false});window.addEventListener("keyup",up);
   return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)};
 },[]);

 const joystickMove=(e:PointerEvent<HTMLDivElement>)=>{
   const r=e.currentTarget.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),radius=Math.min(r.width,r.height)*.38,len=Math.hypot(dx,dy)||1,scale=Math.min(1,radius/len),x=dx/radius*scale,y=dy/radius*scale;
   setJoystickPos({x:x*radius,y:y*radius});setMove({x,z:y});
 };
 const resetJoystick=()=>{setJoystickPos({x:0,y:0});setMove(v=>keys.current.x||keys.current.z?v:{x:0,z:0})};
 const startLook=(e:PointerEvent<HTMLDivElement>)=>{e.currentTarget.setPointerCapture(e.pointerId);lookStart.current={x:e.clientX,y:e.clientY};setLookActive(true)};
 const moveLook=(e:PointerEvent<HTMLDivElement>)=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const dx=e.clientX-lookStart.current.x,dy=e.clientY-lookStart.current.y;if(Math.abs(dx)+Math.abs(dy)<.5)return;setCameraYaw(y=>y-dx*.012);setCameraPitch(p=>Math.max(.18,Math.min(1.15,p+dy*.009)));lookStart.current={x:e.clientX,y:e.clientY}};
 const endLook=()=>setLookActive(false);

 useEffect(()=>{
   async function load(){
     let{data:{session}}=await supabase.auth.getSession();
     if(!session){const{error}=await supabase.auth.signInAnonymously();if(error){setMessage("Enable Anonymous Sign-Ins in Supabase Auth.");setLoading(false);return}({data:{session}}=await supabase.auth.getSession())}
     const user=session?.user;if(!user){setMessage("Could not create a game session.");setLoading(false);return}
     const[{data:p},{data:s,error:se}]=await Promise.all([supabase.from("player_profiles").select("display_name,avatar_key").eq("user_id",user.id).single(),supabase.from("player_state").select("*").eq("user_id",user.id).single()]);
     if(se||!s){setMessage("Could not load your game state.");setLoading(false);return}
     setProfile(p);setState(s);
     const{data:j}=await supabase.from("game_jobs").select("id,name,category,energy_cost,minutes_cost,min_pay_kobo,max_pay_kobo,required_reputation").eq("location_id",s.location_id).eq("is_active",true).order("name");
     setJobs(j??[]);setLoading(false);
   }
   load();
 },[]);

 function applyJobResult(r:Record<string,unknown>){setState(c=>c?({...c,cash_kobo:Number(r.cash_kobo),energy:Number(r.energy),hunger:Number(r.hunger),game_day:Number(r.game_day),minutes_today:Number(r.minutes_today)}):c);setMessage("Completed "+String(r.job_name)+" • earned "+formatNaira(Number(r.pay_kobo)));setShowWork(false)}
 function interact(){if(!nearby){setMessage("Walk closer to a building.");return}setShowWork(true)}

 if(loading)return <main className="game-screen"><div className="loading">Loading Abuja...</div></main>;
 if(!state||!profile)return <main className="game-screen"><p>{message}</p></main>;

 return <main className="game-screen">
   <AbujaWorld move={move} cameraYaw={cameraYaw} cameraPitch={cameraPitch} jump={jump} running={running} onNearbyChange={setNearby} onPositionChange={(x,z)=>setPlayerPos({x,z})}/>
   <MiniMap x={playerPos.x} z={playerPos.z} yaw={cameraYaw}/>
   <header className="hud">
     <div><b>NAIJA HUSTLE</b><span>DAY {state.game_day} • {locationNames[state.location_id]??state.location_id}</span></div>
     <div className="hud-money">{formatNaira(state.cash_kobo)}</div>
   </header>
   <div className="hud-stats"><span>⚡ {state.energy}</span><span>🍲 {state.hunger}</span><span>❤ {state.health}</span><span>🕒 {formatTime(state.minutes_today)}</span></div>
   {nearby&&<button className="nearby-action" onClick={interact}>🚪 ENTER {nearby.toUpperCase()}</button>}

   <div className="look-surface" aria-label="Drag to look around" onPointerDown={startLook} onPointerMove={moveLook} onPointerUp={endLook} onPointerCancel={endLook}>
     <div className={"look-hint"+(lookActive?" active":"")}><span>↻</span><small>DRAG TO LOOK</small></div>
   </div>

   <div className="touch-controls">
     <div className="joystick"
       onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);joystickMove(e)}}
       onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))joystickMove(e)}}
       onPointerUp={e=>{e.currentTarget.releasePointerCapture(e.pointerId);resetJoystick()}}
       onPointerCancel={resetJoystick}>
       <div className="joystick-label">MOVE</div>
       <div className="joystick-knob" style={{transform:`translate(calc(-50% + ${joystickPos.x}px),calc(-50% + ${joystickPos.y}px))`}}/>
     </div>
     <div className="action-buttons">
       <button className={"run-button"+(running?" running":"")} aria-label="Run" onPointerDown={e=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);setRunning(true)}} onPointerUp={e=>{e.preventDefault();e.currentTarget.releasePointerCapture(e.pointerId);setRunning(false)}} onPointerCancel={()=>setRunning(false)} onPointerLeave={()=>setRunning(false)}>🏃<small>{running?"RUNNING":"RUN"}</small></button>
       <button onClick={interact}>💼<small>WORK</small></button>
       <button className="jump-button" aria-label="Jump" onPointerDown={e=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);setJump(v=>v+1)}} onClick={e=>e.preventDefault()}>↑<small>JUMP</small></button>
     </div>
   </div>

   {showWork&&<div className="modal"><div className="modal-card"><button className="close-button" onClick={()=>setShowWork(false)}>×</button><span className="muted">{nearby?"AT "+nearby.toUpperCase():"AVAILABLE HERE"}</span><h2>Jobs nearby</h2><WorkPanel jobs={jobs} state={state} onComplete={applyJobResult} formatNaira={formatNaira}/></div></div>}
   {message&&<button className="toast" onClick={()=>setMessage("")}>{message}</button>}
 </main>
}
