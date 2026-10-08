"use client";
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

const places=[
 ["CBD Office",-8,-9,7,6,6],["Wuse Shop",8,-10,6,5,6],
 ["Garki Shop",-9,9,6,4.4,6],["Jabi Apartment",9,10,7,6,5],
 ["Street Kiosk",-13,-1,4,3.4,5]
] as const;

type Collider={x:number;z:number,w:number,d:number};
const colliders:Collider[]=places.map(([,x,z,w,,d])=>({x,z,w,d}));
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
 const nx=THREE.MathUtils.clamp(pos.x+dx,-38,38);
 const nz=THREE.MathUtils.clamp(pos.z+dz,-38,38);
 let x=pos.x,z=pos.z;
 if(!blocked(nx,pos.z))x=nx;
 if(!blocked(x,nz))z=nz;
 return {x,z};
}

function Player({move,cameraYaw,jump,playerRef,onPositionChange}:{move?:Props["move"];cameraYaw:number;jump:number;playerRef:RefObject<THREE.Group|null>;onPositionChange?:Props["onPositionChange"]}){
 const g=useRef<THREE.Group>(null),la=useRef<THREE.Group>(null),ra=useRef<THREE.Group>(null),ll=useRef<THREE.Group>(null),rl=useRef<THREE.Group>(null);
 const walk=useRef(0),velocity=useRef(new THREE.Vector2()),vertical=useRef(0),grounded=useRef(true),lastJump=useRef(0);
 useFrame((_,d)=>{
   const p=g.current;if(!p)return;
   playerRef.current=p;
   const target=new THREE.Vector2(move?.x??0,move?.z??0);
   velocity.current.lerp(target,1-Math.pow(.00005,d));
   const moving=velocity.current.lengthSq()>.004;
   if(jump!==lastJump.current&&grounded.current){
     lastJump.current=jump;vertical.current=6.2;grounded.current=false;
   } else if(jump!==lastJump.current) lastJump.current=jump;

   if(moving){
     const v=velocity.current.clone().clampLength(0,1);
     const forward=new THREE.Vector2(-Math.sin(cameraYaw),-Math.cos(cameraYaw));
     const right=new THREE.Vector2(Math.cos(cameraYaw),-Math.sin(cameraYaw));
     const worldMove=right.multiplyScalar(v.x).add(forward.multiplyScalar(-v.y));
     if(worldMove.lengthSq()>.001){
       worldMove.normalize();
       const speed=7.5;
       const next=tryMove(p.position,worldMove.x*speed*d,worldMove.y*speed*d);
       if(next.x!==p.position.x||next.z!==p.position.z){
         p.position.x=next.x;p.position.z=next.z;
         const targetRot=Math.atan2(worldMove.x,worldMove.y);
         p.rotation.y=THREE.MathUtils.lerp(p.rotation.y,targetRot,1-Math.pow(.0001,d));
         onPositionChange?.(next.x,next.z);
         walk.current+=d*12;
       }
     }
   }
   vertical.current-=18*d;
   p.position.y+=vertical.current*d;
   if(p.position.y<=.45){p.position.y=.45;vertical.current=0;grounded.current=true}
   const swing=moving?Math.sin(walk.current)*.7:0;
   if(la.current)la.current.rotation.x=swing;
   if(ra.current)ra.current.rotation.x=-swing;
   if(ll.current)ll.current.rotation.x=-swing;
   if(rl.current)rl.current.rotation.x=swing;
 });
 return <group ref={g} position={[0,.45,6]}>
   <mesh castShadow position={[0,1.72,0]}><sphereGeometry args={[.34,20,16]}/><meshStandardMaterial color="#7b4b32"/></mesh>
   <mesh castShadow position={[0,1.95,0]}><sphereGeometry args={[.36,20,16]}/><meshStandardMaterial color="#17130f"/></mesh>
   <mesh castShadow position={[0,1.08,0]}><boxGeometry args={[.68,.82,.4]}/><meshStandardMaterial color="#17834b"/></mesh>
   <group ref={la} position={[-.43,1.28,0]}><mesh position={[0,-.35,0]}><capsuleGeometry args={[.12,.48,6,10]}/><meshStandardMaterial color="#7b4b32"/></mesh></group>
   <group ref={ra} position={[.43,1.28,0]}><mesh position={[0,-.35,0]}><capsuleGeometry args={[.12,.48,6,10]}/><meshStandardMaterial color="#7b4b32"/></mesh></group>
   <group ref={ll} position={[-.19,.62,0]}><mesh position={[0,-.42,0]}><capsuleGeometry args={[.14,.62,6,10]}/><meshStandardMaterial color="#222b3a"/></mesh></group>
   <group ref={rl} position={[.19,.62,0]}><mesh position={[0,-.42,0]}><capsuleGeometry args={[.14,.62,6,10]}/><meshStandardMaterial color="#222b3a"/></mesh></group>
 </group>
}

function Building({a}:{a:typeof places[number]}){
 const[,x,z,w,h,d]=a;
 return <group position={[x,h/2,z]}>
   <mesh castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color="#9a8f80"/></mesh>
   <mesh position={[0,-h/2+1,d/2+.03]}><boxGeometry args={[1.2,1.4,.08]}/><meshStandardMaterial color="#4c2c1e"/></mesh>
   <mesh position={[0,0,d/2+.04]}><boxGeometry args={[2,.9,.06]}/><meshStandardMaterial color="#4e9bc7"/></mesh>
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
   <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[80,80]}/><meshStandardMaterial color="#68705f"/></mesh>
   <mesh position={[0,.02,0]}><boxGeometry args={[8,.04,80]}/><meshStandardMaterial color="#252825"/></mesh>
   <mesh position={[0,.03,0]}><boxGeometry args={[80,.04,8]}/><meshStandardMaterial color="#252825"/></mesh>
   {places.map(a=><Building key={a[0]} a={a}/>)}
   <Player move={move} cameraYaw={cameraYaw} jump={jump} onPositionChange={onPositionChange} playerRef={pr}/>
 </>
}

export default function AbujaWorld(p:Props){
 return <div className="world-canvas"><Canvas shadows dpr={[1,1.5]} camera={{position:[0,7,15],fov:55}}><Scene {...p}/></Canvas></div>
}
