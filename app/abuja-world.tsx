`use client`;

import {Canvas,useFrame,useThree} from "@react-three/fiber";
import {useRef,type RefObject} from "react";
import * as THREE from "three";

type Props={
 onPositionChange?:(x:number,z:number)=>void;
 onNearbyChange?:(name:string|null)=>void;
 move?:{x:number;z:number};
 cameraYaw?:number;
 cameraPitch?:number;
 jump?:number;
};

const WORLD_ORIGIN={lat:9.055,lon:7.49};
const METERS_PER_LAT=111320;
const METERS_PER_LON=111320*Math.cos(WORLD_ORIGIN.lat*Math.PI/180);
function G(lat:number,lon:number){return [
 (lon-WORLD_ORIGIN.lon)*METERS_PER_LON,
 (WORLD_ORIGIN.lat-lat)*METERS_PER_LAT
] as const;}

// Real-world Abuja anchor points. Coordinates are map references; building footprints are game-scaled.
const places=[
 ["CBD Office",...G(9.055,7.495),70,24,70],["Wuse Shop",...G(9.076,7.476),60,20,55],
 ["Garki Shop",...G(9.032,7.483),60,18,55],["Jabi Apartment",...G(9.069,7.429),70,22,60],
 ["STREET KIOSK",...G(9.052,7.487),28,8,22],
 ["CBD Tower",...G(9.052,7.501),50,70,50],["Wuse Plaza",...G(9.071,7.474),75,20,60],
 ["Garki Market",...G(9.022,7.492),85,18,70],["Garki Office",...G(9.035,7.482),60,25,55],
 ["National Mosque",...G(9.0602,7.4898),90,45,90],["National Christian Centre",...G(9.0517,7.4945),80,55,70],
 ["Eagle Square",...G(9.055,7.490),180,4,110],["Wuse Market",...G(9.06862,7.46601),110,22,90],
 ["Abuja ICC",...G(9.038,7.482),95,25,80],["Garki Post Office",...G(9.031,7.485),55,16,45],
 ["Radio House",...G(9.058,7.482),55,45,55],["Abuja City Gate",...G(9.016,7.449),60,28,45]
] as const;

type Collider={x:number;z:number;w:number;d:number};
type UrbanBuilding={x:number;z:number;w:number;d:number;h:number};
const districtCenters=[
  {x:G(9.055,7.49)[0],z:G(9.055,7.49)[1],rows:6,cols:7},
  {x:G(9.076,7.476)[0],z:G(9.076,7.476)[1],rows:6,cols:8},
  {x:G(9.032,7.483)[0],z:G(9.032,7.483)[1],rows:7,cols:7}
] as const;

const urbanBuildings:UrbanBuilding[]=[];
for(const dc of districtCenters){
  for(let r=0;r<dc.rows;r++) for(let col=0;col<dc.cols;col++){
    const x=dc.x+(col-(dc.cols-1)/2)*260;
    const z=dc.z+(r-(dc.rows-1)/2)*260;
    const w=72+((r*17+col*29)%48);
    const d=62+((r*23+col*11)%44);
    const h=10+((r*31+col*13)%55);
    urbanBuildings.push({x,z,w,d,h});
  }
}
const urbanColliders:Collider[]=urbanBuildings.map(b=>({x:b.x,z:b.z,w:b.w,d:b.d}));
const colliders:Collider[]=[...places.filter(([name])=>name!=="Eagle Square").map(([,x,z,w,,d])=>({x,z,w,d})),...urbanColliders];
const PLAYER_RADIUS=.65;

function blocked(x:number,z:number){
 for(const c of colliders){
   const cx=Math.max(c.x-c.w/2,Math.min(x,c.x+c.w/2));
   const cz=Math.max(c.z-c.d/2,Math.min(z,c.z+c.d/2));
   const dx=x-cx,dz=z-cz;
   if(dx*dx+dz*dz<PLAYER_RADIUS*PLAYER_RADIUS)return true;
 }
 return false;
}

function tryMove(pos:THREE.Vector3,dx:number,dz:number){
 const nx=THREE.MathUtils.clamp(pos.x+dx,-6000,6000);
 const nz=THREE.MathUtils.clamp(pos.z+dz,-6000,6000);
 let x=pos.x,z=pos.z;
 if(!blocked(nx,pos.z))x=nx;
 if(!blocked(x,nz))z=nz;
 return {x,z};
}

function Player({move,cameraYaw,jump,playerRef,onPositionChange}:{move?:Props["move"];cameraYaw:number;jump:number;playerRef:RefObject<THREE.Group|null>;onPositionChange?:Props["onPositionChange"]}){
 const g=useRef<THREE.Group>(null),la=useRef<THREE.Group>(null),ra=useRef<THREE.Group>(null),ll=useRef<THREE.Group>(null),rl=useRef<THREE.Group>(null);
 const torso=useRef<THREE.Group>(null),velocity=useRef(new THREE.Vector2()),vertical=useRef(0),grounded=useRef(true),lastJump=useRef(0),walk=useRef(0),ray=useRef(new THREE.Raycaster());
 const lastPosition=useRef(new THREE.Vector3(...G(9.055,7.49),.45));

 useFrame((_,delta)=>{
   const p=g.current;if(!p)return;
   playerRef.current=p;
   const d=Math.min(delta,.05);
   const input=new THREE.Vector2(move?.x??0,move?.z??0).clampLength(0,1);
   const hasInput=input.lengthSq()>.0025;
   const accel=1-Math.exp(-12*d);
   const decel=1-Math.exp(-18*d);
   velocity.current.x=THREE.MathUtils.lerp(velocity.current.x,input.x,hasInput?accel:decel);
   velocity.current.y=THREE.MathUtils.lerp(velocity.current.y,input.y,hasInput?accel:decel);

   if(jump!==lastJump.current){
     lastJump.current=jump;
     if(grounded.current){vertical.current=6.4;grounded.current=false;}
   }

   const v=velocity.current;
   const forward=new THREE.Vector2(-Math.sin(cameraYaw),-Math.cos(cameraYaw));
   const right=new THREE.Vector2(Math.cos(cameraYaw),-Math.sin(cameraYaw));
   const worldMove=right.multiplyScalar(v.x).add(forward.multiplyScalar(-v.y));
   const speed=5.2;
   const distance=worldMove.length()*speed*d;
   const steps=Math.max(1,Math.ceil(distance/.32));
   let moved=false;

   for(let i=0;i<steps;i++){
     const stepScale=1/steps;
     const sx=worldMove.x*speed*d*stepScale;
     const sz=worldMove.y*speed*d*stepScale;
     const next=tryMove(p.position,sx,sz);
     if(next.x!==p.position.x||next.z!==p.position.z){
       p.position.x=next.x;p.position.z=next.z;moved=true;
     }
   }

   if(moved){
     const dir=new THREE.Vector2(worldMove.x,worldMove.y);
     if(dir.lengthSq()>.001){
       dir.normalize();
       const targetRot=Math.atan2(dir.x,dir.y);
       const rot=1-Math.exp(-14*d);
       p.rotation.y=THREE.MathUtils.lerp(p.rotation.y,targetRot,rot);
     }
     walk.current+=d*(hasInput?13:0);
     onPositionChange?.(p.position.x,p.position.z);
   }

   ray.current.set(new THREE.Vector3(p.position.x,p.position.y+1,p.position.z),new THREE.Vector3(0,-1,0));
   const groundDistance=p.position.y+1;
   const onGround=groundDistance<=1.02&&vertical.current<=0;
   if(onGround){p.position.y=.45;vertical.current=0;grounded.current=true;}
   else{
     grounded.current=false;
     vertical.current-=18*d;
     p.position.y+=vertical.current*d;
     if(p.position.y<=.45){p.position.y=.45;vertical.current=0;grounded.current=true;}
   }

   const moving=velocity.current.lengthSq()>.015;
   const swing=moving?Math.sin(walk.current)*.72:0;
   const idle=Math.sin(performance.now()/520)*.025;
   if(la.current)la.current.rotation.x=swing;
   if(ra.current)ra.current.rotation.x=-swing;
   if(ll.current)ll.current.rotation.x=-swing;
   if(rl.current)rl.current.rotation.x=swing;
   if(torso.current){
     torso.current.rotation.z=THREE.MathUtils.lerp(torso.current.rotation.z,moving?Math.sin(walk.current*2)*.035:0,1-Math.exp(-8*d));
     torso.current.position.y=1.08+idle;
   }
   lastPosition.current.copy(p.position);
 });
 return <group ref={g} position={[...G(9.055,7.49),.45]}>
   <mesh castShadow position={[0,1.72,0]}><sphereGeometry args={[.34,20,16]}/><meshStandardMaterial color="#7b4b32"/></mesh>
   <mesh castShadow position={[0,1.95,0]}><sphereGeometry args={[.36,20,16]}/><meshStandardMaterial color="#17130f"/></mesh>
   <group ref={torso} position={[0,1.08,0]}>
     <mesh castShadow><boxGeometry args={[.68,.82,.4]}/><meshStandardMaterial color="#17834b"/></mesh>
   </group>
   <group ref={la} position={[-.43,1.28,0]}><mesh castShadow position={[0,-.35,0]}><capsuleGeometry args={[.12,.48,6,10]}/><meshStandardMaterial color="#7b4b32"/></mesh></group>
   <group ref={ra} position={[.43,1.28,0]}><mesh castShadow position={[0,-.35,0]}><capsuleGeometry args={[.12,.48,6,10]}/><meshStandardMaterial color="#7b4b32"/></mesh></group>
   <group ref={ll} position={[-.19,.62,0]}><mesh castShadow position={[0,-.42,0]}><capsuleGeometry args={[.14,.62,6,10]}/><meshStandardMaterial color="#222b3a"/></mesh></group>
   <group ref={rl} position={[.19,.62,0]}><mesh castShadow position={[0,-.42,0]}><capsuleGeometry args={[.14,.62,6,10]}/><meshStandardMaterial color="#222b3a"/></mesh></group>
 </group>
}
const roads=[
 {x:0,z:0,w:24,d:12000},
 {x:0,z:0,w:12000,d:24},
 {x:-1200,z:900,w:18,d:5000},
 {x:1200,z:-500,w:18,d:5000},
 {x:-2500,z:1200,w:18,d:4200},
 {x:2500,z:-1200,w:18,d:4200}
] as const;
const districtBounds=[
 {name:"CENTRAL AREA",x:G(9.055,7.49)[0],z:G(9.055,7.49)[1],w:3200,d:3000},
 {name:"WUSE",x:G(9.076,7.476)[0],z:G(9.076,7.476)[1],w:4200,d:3600},
 {name:"GARKI",x:G(9.032,7.483)[0],z:G(9.032,7.483)[1],w:3600,d:4000}
] as const;
function CityStreets(){return <group>
 {districtCenters.flatMap((dc,di)=>Array.from({length:dc.rows+1},(_,i)=>
   <mesh key={"h"+di+"-"+i} position={[dc.x,.055,dc.z+(i-dc.rows/2)*260]} receiveShadow>
     <boxGeometry args={[dc.cols*260, .06, 22]}/><meshStandardMaterial color="#30332f"/>
   </mesh>
 ))}
 {districtCenters.flatMap((dc,di)=>Array.from({length:dc.cols+1},(_,i)=>
   <mesh key={"v"+di+"-"+i} position={[dc.x+(i-dc.cols/2)*260,.055,dc.z]} receiveShadow>
     <boxGeometry args={[22,.06,dc.rows*260]}/><meshStandardMaterial color="#30332f"/>
   </mesh>
 ))}
 </group>}

function UrbanBuildings(){return <group>
 {urbanBuildings.map((b,i)=><group key={i} position={[b.x,b.h/2,b.z]}>
   <mesh castShadow receiveShadow><boxGeometry args={[b.w,b.h,b.d]}/><meshStandardMaterial color={i%5===0?"#8f897d":i%3===0?"#a79c8c":"#958d80"}/></mesh>
   <mesh position={[0,.2,b.d/2+.04]}><boxGeometry args={[Math.min(18,b.w*.3),Math.min(10,b.h*.18),.08]}/><meshStandardMaterial color="#4b91b5"/></mesh>
 </group>)}
 </group>}
function RoadNetwork(){return <group>
 {roads.map((r,i)=><mesh key={i} position={[r.x,.025,r.z]} receiveShadow><boxGeometry args={[r.w,.05,r.d]}/><meshStandardMaterial color="#252825"/></mesh>}
 <mesh position={[0,.085,0]}><cylinderGeometry args={[6,6,.03,48]}/><meshStandardMaterial color="#3b3d36"/></mesh>
 <mesh position={[0,.1,0]}><cylinderGeometry args={[3.2,3.2,.04,48]}/><meshStandardMaterial color="#68705f"/></mesh>
 </group>}
function DistrictBoundary({x,z,w,d}:{x:number;z:number;w:number;d:number}){return <mesh position={[x,.045,z]}><boxGeometry args={[w,.02,d]}/><meshStandardMaterial color="#d8f36b" transparent opacity={.035}/></mesh>}
function DistrictSign({name,position}:{name:string;position:[number,number,number]}){return <group position={position}>
 <mesh position={[0,1.35,0]}><boxGeometry args={[2.8,.75,.12]}/><meshStandardMaterial color="#18231d"/></mesh>
 <mesh position={[0,1.35,.07]}><boxGeometry args={[2.45,.42,.03]}/><meshStandardMaterial color="#d8f36b"/></mesh>
 <mesh position={[-1.15,.55,0]}><cylinderGeometry args={[.06,.06,1.6,8]}/><meshStandardMaterial color="#55564e"/></mesh>
 <mesh position={[1.15,.55,0]}><cylinderGeometry args={[.06,.06,1.6,8]}/><meshStandardMaterial color="#55564e"/></mesh>
 </group>}
function Landmark({a}:{a:typeof places[number]}){const[name,x,z,w,h,d]=a;
 if(name==="National Mosque")return <group position={[x,0,z]}>
   <mesh castShadow position={[0,2.2,0]}><cylinderGeometry args={[3.5,4,.5,32]}/><meshStandardMaterial color="#d8d1bd"/></mesh>
   <mesh castShadow position={[0,4.1,0]}><sphereGeometry args={[1.5,24,16]}/><meshStandardMaterial color="#d8b94e"/></mesh>
   {[[-3,2,0],[3,2,0],[0,2,-3],[0,2,3]].map((p,i)=><mesh key={i} castShadow position={p as [number,number,number]}><cylinderGeometry args={[.45,.65,4.8,12]}/><meshStandardMaterial color="#eee8d8"/></mesh>)}
 </group>;
 if(name==="National Christian Centre")return <group position={[x,0,z]}>
   <mesh castShadow position={[0,2.5,0]} rotation={[0,0,.18]}><boxGeometry args={[2.8,5,1.2]}/><meshStandardMaterial color="#c8c3b6"/></mesh>
   <mesh castShadow position={[0,2.5,0]} rotation={[0,0,-.18]}><boxGeometry args={[2.8,5,1.2]}/><meshStandardMaterial color="#aaa69b"/></mesh>
   <mesh castShadow position={[0,5.4,0]}><sphereGeometry args={[.55,16,12]}/><meshStandardMaterial color="#d8b94e"/></mesh>
 </group>;
 if(name==="Eagle Square")return <group position={[x,.15,z]}>
   <mesh receiveShadow><boxGeometry args={[w,.3,d]}/><meshStandardMaterial color="#68705f"/></mesh>
   <mesh position={[0,1.8,0]}><cylinderGeometry args={[.15,.28,3.6,10]}/><meshStandardMaterial color="#c7c1a9"/></mesh>
   <mesh position={[0,3.65,0]}><boxGeometry args={[2,.15,.15]}/><meshStandardMaterial color="#c7c1a9"/></mesh>
 </group>;
 if(name==="Abuja City Gate")return <group position={[x,0,z]}>
   <mesh castShadow position={[-1.6,2,0]} rotation={[0,0,-.35]}><boxGeometry args={[.8,4.5,.9]}/><meshStandardMaterial color="#d6d0be"/></mesh>
   <mesh castShadow position={[1.6,2,0]} rotation={[0,0,.35]}><boxGeometry args={[.8,4.5,.9]}/><meshStandardMaterial color="#d6d0be"/></mesh>
   <mesh castShadow position={[0,3.8,0]}><boxGeometry args={[4.2,.7,1]}/><meshStandardMaterial color="#b9b09b"/></mesh>
 </group>;
 return <group position={[x,h/2,z]}>
   <mesh castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color="#9a8f80"/></mesh>
   <mesh position={[0,-h/2+1,d/2+.03]}><boxGeometry args={[1.2,1.4,.08]}/><meshStandardMaterial color="#4c2c1e"/></mesh>
   <mesh position={[0,0,d/2+.04]}><boxGeometry args={[2,.9,.06]}/><meshStandardMaterial color="#4e9bc7"/></mesh>
   {name==="Wuse Market"&&<group>{[-2.8,0,2.8].map((px,i)=><mesh key={i} position={[px,h+.7,0]}><coneGeometry args={[1.3,.9,4]}/><meshStandardMaterial color="#b88a52"/></mesh>)}</group>}
 </group>;
}

function Building({a}:{a:typeof places[number]}){const[,x,z,w,h,d]=a;
 return <group position={[x,h/2,z]}>
   <mesh castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color="#9a8f80"/></mesh>
   <mesh position={[0,-h/2+1,d/2+.03]}><boxGeometry args={[1.2,1.4,.08]}/><meshStandardMaterial color="#4c2c1e"/></mesh>
   <mesh position={[0,0,d/2+.04]}><boxGeometry args={[2,.9,.06]}/><meshStandardMaterial color="#4e9bc7"/></mesh>
   {a[0]==="STREET KIOSK"&&<group position={[0,0,d/2+.08]}>
     <mesh position={[0,.95,0]}><boxGeometry args={[2.55,.48,.08]}/><meshStandardMaterial color="#18231d"/></mesh>
     <mesh position={[0,.95,.05]}><boxGeometry args={[2.35,.25,.03]}/><meshStandardMaterial color="#d8f36b"/></mesh>
   </group>}
 </group>
}

function Scene({move,cameraYaw=0,cameraPitch=.48,jump=0,onPositionChange,onNearbyChange}:{move?:Props["move"];cameraYaw?:number;cameraPitch?:number;jump?:number;onPositionChange?:Props["onPositionChange"];onNearbyChange?:Props["onNearbyChange"]}){
 const pr=useRef<THREE.Group|null>(null),{camera}=useThree(),last=useRef<string|null>(null),lookTarget=useRef(new THREE.Vector3());
 useFrame((_,d)=>{
   const p=pr.current;if(!p)return;
   const dist=8.2;
   const off=new THREE.Vector3(Math.sin(cameraYaw)*dist,3.2+cameraPitch*3.8,Math.cos(cameraYaw)*dist);
   camera.position.lerp(p.position.clone().add(off),1-Math.pow(.0008,d));
   const forward=new THREE.Vector3(-Math.sin(cameraYaw),0,-Math.cos(cameraYaw));
   const target=p.position.clone().add(new THREE.Vector3(0,1.15,0)).add(forward.multiplyScalar(1.2));
   lookTarget.current.lerp(target,1-Math.pow(.0004,d));
   camera.lookAt(lookTarget.current);
   let hit:string|null=null,best=99;
   for(const a of places){
     const[name,x,z,w,,dd]=a,q=Math.hypot(p.position.x-x,p.position.z-z),rr=Math.max(w,dd)*.75+2.2;
     if(q<rr&&q<best){hit=name;best=q}
   }
   if(hit!==last.current){last.current=hit;onNearbyChange?.(hit)}
 });
 return <>
   <ambientLight intensity={1.15}/>
   <directionalLight position={[8,14,6]} intensity={2.6} castShadow/>
   <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[12000,12000]}/><meshStandardMaterial color="#68705f"/></mesh>
   <RoadNetwork/>
   <CityStreets/>
   <UrbanBuildings/>
   {districtBounds.map(b=><DistrictBoundary key={b.name} {...b}/>}
   <DistrictSign name="CENTRAL AREA" position={[...G(9.055,7.49),.1]}/>
   <DistrictSign name="WUSE" position={[...G(9.081,7.476),.1]}/>
   <DistrictSign name="GARKI" position={[...G(9.029,7.483),.1]}/>
   {places.map(a=>a[0].includes("National")||a[0]==="Eagle Square"||a[0]==="Abuja City Gate"||a[0]==="Wuse Market"?<Landmark key={a[0]} a={a}/>:<Building key={a[0]} a={a}/>)}
   <Player move={move} cameraYaw={cameraYaw} jump={jump} onPositionChange={onPositionChange} playerRef={pr}/>
 </>
}

export default function AbujaWorld(p:Props){
 return <div className="world-canvas"><Canvas shadows dpr={[1,1.5]} camera={{position:[0,7,15],fov:55}}><Scene {...p}/></Canvas></div>
}
