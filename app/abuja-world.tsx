"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type Props = { onPositionChange?: (x:number,z:number)=>void; move?: {x:number;z:number} };

function Player({onPositionChange,move,playerRef}:{onPositionChange?:Props["onPositionChange"];move?:{x:number;z:number};playerRef:React.RefObject<THREE.Group|null>}) {
  const ref=useRef<THREE.Group>(null);
  const previous=useRef(new THREE.Vector3());
  
  useFrame((_,delta)=>{
    if(!ref.current)return;
    playerRef.current=ref.current;
    const speed=4.2;
    const x=move?.x ?? 0;
    const z=move?.z ?? 0;
    const v=new THREE.Vector2(x,z);
    if(v.length()>0){v.normalize(); const next=ref.current.position.clone(); next.x+=v.x*speed*delta; next.z+=v.y*speed*delta; const blocked=next.x < -15.5 || next.x > 15.5 || next.z < -37 || next.z > 37 || (next.x > -4.5 && next.x < 4.5 && Math.abs(next.z) > 3.8); if(!blocked){ref.current.position.copy(next); ref.current.rotation.y=Math.atan2(v.x,v.y); onPositionChange?.(ref.current.position.x,ref.current.position.z);}}
  });
  return <group ref={ref} position={[0,.7,6]}
    onPointerDown={()=>{}}
    onCreated={()=>{}}
  >
    <mesh castShadow position={[0,.55,0]}><capsuleGeometry args={[.34,.75,6,12]}/><meshStandardMaterial color="#8b5a3c"/></mesh>
    <mesh castShadow position={[0,1.22,0]}><sphereGeometry args={[.34,16,16]}/><meshStandardMaterial color="#5b3525"/></mesh>
    <mesh position={[0,1.3,.02]}><boxGeometry args={[.48,.08,.4]}/><meshStandardMaterial color="#222"/></mesh>
    <mesh position={[0,.35,.0]}><boxGeometry args={[.7,.45,.45]}/><meshStandardMaterial color="#d8f36b"/></mesh>
    {Object.entries({}).map(([k])=><group key={k}/>)}
  </group>;
}

function Building({position,size,label}:{position:[number,number,number],size:[number,number,number],label:string}){
 return <group position={position}>
  <mesh castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color="#9a8f80"/></mesh>
  <mesh position={[0,size[1]/2+.04,0]}><boxGeometry args={[size[0]*.9,.12,size[2]*.9]}/><meshStandardMaterial color="#3b3b35"/></mesh>
  <mesh position={[0,1,0]}><boxGeometry args={[Math.min(size[0]*.55,2.4),.5,.08]}/><meshStandardMaterial color="#1b241e"/></mesh>
 </group>
}

function WorldScene({onPositionChange,move}:{onPositionChange?:Props["onPositionChange"];move?:{x:number;z:number}}){
 const playerRef=useRef<THREE.Group|null>(null);
 const {camera}=useThree();
 useFrame((_,delta)=>{ const p=playerRef.current; if(!p)return; const target=new THREE.Vector3(p.position.x,0,p.position.z); const desired=new THREE.Vector3(p.position.x,8,p.position.z+11); camera.position.lerp(desired,1-Math.pow(0.001,delta)); camera.lookAt(target); });
 return <>
  <ambientLight intensity={1.4}/>
  <directionalLight position={[8,14,6]} intensity={2} castShadow/>
  <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[80,80]}/><meshStandardMaterial color="#68705f"/></mesh>
  <mesh position={[0,.02,0]}><boxGeometry args={[8,.04,80]}/><meshStandardMaterial color="#252825"/></mesh>
  <mesh position={[0,.03,0]}><boxGeometry args={[80,.04,8]}/><meshStandardMaterial color="#252825"/></mesh>
  {Array.from({length:9}).map((_,i)=><mesh key={"line"+i} position={[0,.045,-32+i*8]}><boxGeometry args={[.12,.02,3]}/><meshStandardMaterial color="#d8d1a0"/></mesh>)}
  <Building position={[-8,3,-9]} size={[7,6,6]} label="CBD"/>
  <Building position={[8,2.5,-10]} size={[6,5,6]} label="Office"/>
  <Building position={[-9,2.2,9]} size={[6,4.4,6]} label="Shop"/>
  <Building position={[9,3,10]} size={[7,6,5]} label="Apartment"/>
  <Building position={[-13,1.7,-1]} size={[4,3.4,5]} label="Kiosk"/>
  <Player onPositionChange={onPositionChange} move={move} playerRef={playerRef}/>
 </>;
}

export default function AbujaWorld({onPositionChange,move}:Props){
 return <div className="world-canvas"><Canvas shadows camera={{position:[0,9,13],fov:55}}><WorldScene onPositionChange={onPositionChange} move={move}/></Canvas></div>;
}
