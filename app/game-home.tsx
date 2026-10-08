"use client";
import dynamic from "next/dynamic";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
import WorkPanel from "./work-panel";
const AbujaWorld=dynamic(()=>import("./abuja-world"),{ssr:false});
type PlayerState={location_id:string;cash_kobo:number;bank_kobo:number;energy:number;hunger:number;health:number;happiness:number;reputation:number;game_day:number;minutes_today:number};
type PlayerProfile={display_name:string;avatar_key:string};
type GameJob={id:string;name:string;category:string;energy_cost:number;minutes_cost:number;min_pay_kobo:number;max_pay_kobo:number;required_reputation:number};
const locationNames:Record<string,string>={"central-area":"Central Area, Abuja",wuse:"Wuse, Abuja",garki:"Garki, Abuja",jabi:"Jabi, Abuja"};
function formatNaira(k:number){return new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(k/100)}
function formatTime(n:number){const h=Math.floor(n/60),m=n%60;return(h%12||12)+":"+m.toString().padStart(2,"0")+" "+(h>=12?"PM":"AM")}
export default function GameHome(){
 const[profile,setProfile]=useState<PlayerProfile|null>(null),[state,setState]=useState<PlayerState|null>(null),[jobs,setJobs]=useState<GameJob[]>([]);
 const[loading,setLoading]=useState(true),[showWork,setShowWork]=useState(false),[message,setMessage]=useState(""),[move,setMove]=useState({x:0,z:0}),[nearby,setNearby]=useState<string|null>(null);
 useEffect(()=>{async function load(){let{data:{session}}=await supabase.auth.getSession();if(!session){const{error}=await supabase.auth.signInAnonymously();if(error){setMessage("Enable Anonymous Sign-Ins in Supabase Auth.");setLoading(false);return}({data:{session}}=await supabase.auth.getSession())}const user=session?.user;if(!user){setMessage("Could not create a game session.");setLoading(false);return}const[{data:p},{data:s,error:se}]=await Promise.all([supabase.from("player_profiles").select("display_name,avatar_key").eq("user_id",user.id).single(),supabase.from("player_state").select("*").eq("user_id",user.id).single()]);if(se||!s){setMessage("Could not load your game state.");setLoading(false);return}setProfile(p);setState(s);const{data:j}=await supabase.from("game_jobs").select("id,name,category,energy_cost,minutes_cost,min_pay_kobo,max_pay_kobo,required_reputation").eq("location_id",s.location_id).eq("is_active",true).order("name");setJobs(j??[]);setLoading(false)}load()},[]);
 function applyJobResult(r:Record<string,unknown>){setState(c=>c?({...c,cash_kobo:Number(r.cash_kobo),energy:Number(r.energy),hunger:Number(r.hunger),game_day:Number(r.game_day),minutes_today:Number(r.minutes_today)}):c);setMessage("Completed "+String(r.job_name)+" • earned "+formatNaira(Number(r.pay_kobo)));setShowWork(false)}
 function interact(){if(!nearby){setMessage("Walk closer to a building.");return}setShowWork(true)}
 if(loading)return <main className="game-screen"><div className="loading">Loading Abuja...</div></main>;
 if(!state||!profile)return <main className="game-screen"><p>{message}</p></main>;
 return <main className="game-screen">
  <AbujaWorld move={move} onNearbyChange={setNearby}/>
  <header className="hud"><div><b>NAIJA HUSTLE</b><span>DAY {state.game_day} • {locationNames[state.location_id]??state.location_id}</span></div><div className="hud-money">{formatNaira(state.cash_kobo)}</div></header>
  <div className="hud-stats"><span>⚡ {state.energy}</span><span>🍲 {state.hunger}</span><span>❤ {state.health}</span><span>🕒 {formatTime(state.minutes_today)}</span></div>
  {nearby&&<button className="nearby-action" onClick={interact}>🚪 ENTER {nearby.toUpperCase()}</button>}
  <div className="touch-controls">
   <div className="joystick" onPointerMove={e=>{if(e.buttons){const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-(r.left+r.width/2))/(r.width/2),z=(e.clientY-(r.top+r.height/2))/(r.height/2),l=Math.hypot(x,z)||1;setMove({x:Math.max(-1,Math.min(1,x/l*Math.min(1,l))),z:Math.max(-1,Math.min(1,z/l*Math.min(1)))})}}} onPointerDown={e=>e.currentTarget.setPointerCapture(e.pointerId)} onPointerUp={()=>setMove({x:0,z:0})} onPointerCancel={()=>setMove({x:0,z:0})}><div className="joystick-knob"/></div>
   <div className="action-buttons"><button onClick={interact}>💼<small>WORK</small></button><button onClick={()=>setMessage("Walk to buildings and use ENTER to interact.")}>👋<small>ACT</small></button></div>
  </div>
  {showWork&&<div className="modal"><div className="modal-card"><button className="close-button" onClick={()=>setShowWork(false)}>×</button><span className="muted">{nearby?"AT "+nearby.toUpperCase():"AVAILABLE HERE"}</span><h2>Jobs nearby</h2><WorkPanel jobs={jobs} state={state} onComplete={applyJobResult} formatNaira={formatNaira}/></div></div>}
  {message&&<button className="toast" onClick={()=>setMessage("")}>{message}</button>}
 </main>
}