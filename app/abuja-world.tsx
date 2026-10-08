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
};

const places=[
 ["CBD Office",-8,-9,7,6,6],["Wuse Shop",8,-10,6,5,6],
 ["Garki Shop",-9,9,6,4.4,6],["Jabi Apartment",9,10,7,6,5],
 ["Street Kiosk",-13,-1,4,3.4,5]
] as const;

function Player({move,cameraYaw,playerRef,onPositionChange}:{move?:Props["move"];cameraYaw:number;playerRef:RefObject<THREE.Group|null>;onPositionChange?:Props["onPositionChange"]}){
 const g=useRef<THREE.Group>(null),la=useRef<THREE.Group>(null),ra=useRef<THREE.Group>(null),ll=useRef<THREE.Group>(null),rl=useRef<THREE.Group>(null);
 const walk=useRef(0),velocity=useRef(new THREE.Vector2());
 useFrame((_,d)=>{
   const p=g.current;if(!p)return;
   playerRef.current=p;
   const target=new THREE.Vector2(move?.x??0,move?.z??0);
   const accel=1-Math.pow(.00005,d);
   velocity.current.lerp(target,accel);
   const moving=velocity.current.lengthSq()>.004;
   if(moving){
     const v=velocity.current.clone().clampLength(0,1);
     const forward=new THREE.Vector2(-Math.sin(cameraYaw),-Math.cos(cameraYaw));
     const right=new THREE.Vector2(Math.cos(cameraYaw),-Math.sin(cameraYaw));
     const worldMove=right.multiplyScalar(v.x).add(forward.multiplyScalar(-v.y));
     if(worldMove.lengthSq()>.001){
       worldMove.normalize();
       const speed=7.5;
       const n=p.position.clone();
       n.x=THREE.MathUtils.clamp(n.x+worldMove.x*speed*d,-36,36);
       n.z=THREE.MathUtils.clamp(n.z+worldMove.y*speed*d,-36,36);
       p.position.copy(n);
       const targetRot=Math.atan2(worldMove.x,worldMove.y);
       p.rotation.y=THREE.MathUtils.lerp(p.rotation.y,targetRot,1-Math.pow(.0001,d));
       onPositionChange?.(n.x,n.z);
       walk.current+=d*12;
     }
   }
   const swing=moving?Math.sin(walk.current)*.7:0;
   if(la.current)la.current.rotation.x=swing;if(ra.current)ra.current.rotation.x=-swing;
   if(ll.current)ll.current.rotation.x=-swing;if(rl.current)rl.current.rotation.x=swing;
 });
 return <group ref={g} position={[0,.05,6]}>
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

function Scene({move,cameraYaw=0,cameraPitch=.48,onPositionChange,onNearbyChange}:{move?:Props["move"];cameraYaw?:number;cameraPitch?:number;onPositionChange?:Props["onPositionChange"];onNearbyChange?:Props["onNearbyChange"]}){
 const pr=useRef<THREE.Group|null>(null),{camera}=useThree(),last=useRef<string|null>(null),lookTarget=useRef(new THREE.Vector3()),smoothPos=useRef(new THREE.Vector3());
 useFrame((_,d)=>{
   const p=pr.current;if(!p)return;
   const dist=8.2;
   const off=new THREE.Vector3(Math.sin(cameraYaw)*dist,3.2+cameraPitch*3.8,Math.cos(cameraYaw)*dist);
   const desired=p.position.clone().add(off);
   const follow=1-Math.pow(.0008,d);
   camera.position.lerp(desired,follow);
   const forward=new THREE.Vector3(-Math.sin(cameraYaw),0,-Math.cos(cameraYaw));
   const target=p.position.clone().add(new THREE.Vector3(0,1.15,0)).add(forward.multiplyScalar(1.2));
   lookTarget.current.lerp(target,1-Math.pow(.0004,d));
   camera.lookAt(lookTarget.current);
   smoothPos.current.lerp(p.position,1-Math.pow(.0002,d));
   let hit:string|null=null,best=99;
   for(const a of places){
     const[name,x,z,w,,dd]=a,q=Math.hypot(p.position.x-x,p.position.z-z),r=Math.max(w,dd)*.75+2.2;
     if(q<r&&q<best){hit=name;best=q}
   }
   if(hit!==last.current){last.current=hit;onNearbyChange?.(hit)}
 });
 return <>
   <ambientLight intensity={1.15}/>
   <directionalLight position={[8,14,6]} intensity={2.6} castShadow/>
   <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[80,80]}/><meshStandardMaterial color="#68705f"/></mesh>
   <mesh position={[0,.02,0]}><boxGeometry args={[8,.04,80]}/><meshStandardMaterial color="#252825"/></mesh>
   <mesh position={[0,.03,0]}><boxGeometry args={[80,.04,8]}/><meshStandardMaterial color="#252825"/></mesh>
   {places.map(a=><Building key={a[0]} a={a}/>)}<Player move={move} cameraYaw={cameraYaw} onPositionChange={onPositionChange} playerRef={pr}/>
 </>
}

export default function AbujaWorld(p:Props){
 return <div className="world-canvas"><Canvas shadows dpr={[1,1.5]} camera={{position:[0,7,15],fov:55}}><Scene {...p}/></Canvas></div>
}
