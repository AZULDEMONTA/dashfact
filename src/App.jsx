import { useState, useEffect, useCallback, useRef } from "react"
import * as XLSX from "xlsx"
import { dbGet, dbSet, dbDelete } from "./lib/supabase.js"

const SK="cube",AK="arts",MK="meta"
const CAT_FIELDS=["proveedor","rubro","vendedor","rentabilidad","provincia","cliente","empresa","localidad","zona"]

function compressCube(cube){
  const tables={}
  CAT_FIELDS.forEach(f=>{tables[f]=[...new Set(cube.map(r=>r[f]).filter(v=>v!=null))]})
  const ix={}
  CAT_FIELDS.forEach(f=>{ix[f]=Object.fromEntries(tables[f].map((v,i)=>[v,i]))})
  const rows=cube.map(r=>[
    r.y,r.m,Math.round(r.precio),r.cantidad,Math.round(r.costo),r.rows,
    r.proveedor    !=null?(ix.proveedor[r.proveedor]       ??-1):-1,
    r.rubro        !=null?(ix.rubro[r.rubro]               ??-1):-1,
    r.vendedor     !=null?(ix.vendedor[r.vendedor]         ??-1):-1,
    r.rentabilidad !=null?(ix.rentabilidad[r.rentabilidad] ??-1):-1,
    r.provincia    !=null?(ix.provincia[r.provincia]       ??-1):-1,
    r.cliente      !=null?(ix.cliente[r.cliente]           ??-1):-1,
    r.empresa      !=null?(ix.empresa[r.empresa]           ??-1):-1,
    r.localidad    !=null?(ix.localidad[r.localidad]       ??-1):-1,
    r.zona         !=null?(ix.zona[r.zona]                 ??-1):-1,
  ])
  return{tables,rows}
}
function decompressCube({tables,rows}){
  return rows.map(r=>({
    y:r[0],m:r[1],precio:r[2],cantidad:r[3],costo:r[4],rows:r[5],
    proveedor:    r[6] >=0?tables.proveedor[r[6]]    :null,
    rubro:        r[7] >=0?tables.rubro[r[7]]        :null,
    vendedor:     r[8] >=0?tables.vendedor[r[8]]     :null,
    rentabilidad: r[9] >=0?tables.rentabilidad[r[9]] :null,
    provincia:    r[10]>=0?tables.provincia[r[10]]   :null,
    cliente:      r[11]>=0?tables.cliente[r[11]]     :null,
    empresa:      r[12]>=0?tables.empresa[r[12]]     :null,
    localidad:    r[13]>=0?tables.localidad[r[13]]   :null,
    zona:         r[14]>=0?tables.zona[r[14]]         :null,
  }))
}
function compressArts(arts){return arts.map(a=>[a.name,Math.round(a.precio),a.cantidad,Math.round(a.costo),a.rows,a.rentabilidad??null])}
function decompressArts(rows){return rows.map(r=>({name:r[0],precio:r[1],cantidad:r[2],costo:r[3],rows:r[4],rentabilidad:r[5]}))}

function buildCube(rawRecords){
  const cm={},am={}
  for(const r of rawRecords){
    const ck=`${r.y}|${r.m}|${r.proveedor??''}|${r.rubro??''}|${r.vendedor??''}|${r.rentabilidad??''}|${r.provincia??''}|${r.cliente??''}|${r.empresa??''}|${r.localidad??''}|${r.zona??''}`
    if(!cm[ck]) cm[ck]={y:r.y,m:r.m,precio:0,cantidad:0,costo:0,rows:0,proveedor:r.proveedor,rubro:r.rubro,vendedor:r.vendedor,rentabilidad:r.rentabilidad,provincia:r.provincia,cliente:r.cliente,empresa:r.empresa,localidad:r.localidad,zona:r.zona}
    const c=cm[ck];c.precio+=r.precio;c.cantidad+=r.cantidad;c.costo+=r.costo;c.rows++
    if(r.articulo){
      if(!am[r.articulo]) am[r.articulo]={name:r.articulo,precio:0,cantidad:0,costo:0,rows:0,rentabilidad:r.rentabilidad}
      const a=am[r.articulo];a.precio+=r.precio;a.cantidad+=r.cantidad;a.costo+=r.costo;a.rows++
    }
  }
  return{cube:Object.values(cm),articulos:Object.values(am)}
}
function mergeCubes(a,b){
  const m={}
  const add=r=>{
    const k=`${r.y}|${r.m}|${r.proveedor??''}|${r.rubro??''}|${r.vendedor??''}|${r.rentabilidad??''}|${r.provincia??''}|${r.cliente??''}|${r.empresa??''}|${r.localidad??''}|${r.zona??''}`
    if(!m[k]) m[k]={...r};else{m[k].precio+=r.precio;m[k].cantidad+=r.cantidad;m[k].costo+=r.costo;m[k].rows+=r.rows}
  }
  a.forEach(add);b.forEach(add);return Object.values(m)
}
function mergeArts(a,b){
  const m={}
  const add=r=>{if(!m[r.name]) m[r.name]={...r};else{m[r.name].precio+=r.precio;m[r.name].cantidad+=r.cantidad;m[r.name].costo+=r.costo;m[r.name].rows+=r.rows}}
  a.forEach(add);b.forEach(add);return Object.values(m)
}

async function loadData(){
  try{
    const[cv,av,mv]=await Promise.all([dbGet(SK),dbGet(AK),dbGet(MK)])
    return{cube:cv?decompressCube(JSON.parse(cv)):null,articulos:av?decompressArts(JSON.parse(av)):null,meta:mv?JSON.parse(mv):null}
  }catch(e){return{cube:null,articulos:null,meta:null,error:String(e)}}
}
async function saveData(cube,arts,meta){
  const cs=JSON.stringify(compressCube(cube)),as=JSON.stringify(compressArts(arts)),ms=JSON.stringify(meta)
  const kb=Math.round((cs.length+as.length+ms.length)/1024)
  await Promise.all([dbSet(SK,cs),dbSet(AK,as),dbSet(MK,ms)])
  return kb
}
async function clearData(){await Promise.all([dbDelete(SK),dbDelete(AK),dbDelete(MK)])}

const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const CAMPOS=[
  {key:"fecha",       label:"Fecha",        req:true,  syn:["fecha","date","dia","día"]},
  {key:"precio",      label:"Venta",        req:true,  syn:["venta","precio","price","importe","total","monto","pvta","pventa","ingreso","venta neta"]},
  {key:"cantidad",    label:"Cantidad",     req:false, syn:["cantidad","qty","cant","unidades","q","unid"]},
  {key:"costo",       label:"Costo",        req:false, syn:["costo","cost","cto","pcosto"]},
  {key:"cliente",     label:"Cliente",      req:false, syn:["cliente","client","cte"]},
  {key:"empresa",     label:"Empresa",      req:false, syn:["empresa","company","dempresa"]},
  {key:"proveedor",   label:"Proveedor",    req:false, syn:["proveedor","supplier","supp","prov","dgrupo"]},
  {key:"rubro",       label:"Rubro",        req:false, syn:["rubro","drubro","categoria","categoría","cat","linea","grupo"]},
  {key:"articulo",    label:"Artículo",     req:false, syn:["articulo","artículo","producto","item","descripcion","art"]},
  {key:"vendedor",    label:"Vendedor",     req:false, syn:["vendedor","seller","vend","comercial"]},
  {key:"rentabilidad",label:"Rentabilidad", req:false, syn:["rentabilidad","rent","rentab","nivel","tier","tipo rentabilidad","tiporentabilidad"]},
  {key:"provincia",   label:"Provincia",    req:false, syn:["provincia","region","región"]},
  {key:"localidad",   label:"Localidad",    req:false, syn:["localidad","localidad","ciudad"]},
  {key:"zona",        label:"Zona",         req:false, syn:["zona","sucursal","canal","area","área"]},
]
function autoMap(headers){
  const map={}
  const norm=s=>s?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()
  CAMPOS.forEach(({key,syn})=>{const h=headers.find(h=>syn.some(x=>norm(h)?.includes(x)));if(h) map[key]=h})
  return map
}
function parseDate(v){
  if(!v) return null
  if(typeof v==="number"){const d=XLSX.SSF.parse_date_code(v);if(d) return{y:d.y,m:d.m-1}}
  const s=String(v);let mm
  if((mm=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/))) return{y:+mm[3],m:+mm[2]-1}
  if((mm=s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/))) return{y:+mm[1],m:+mm[2]-1}
  const d=new Date(v);if(!isNaN(d)) return{y:d.getFullYear(),m:d.getMonth()}
  return null
}

function fmtM(n){
  if(n==null) return"$0"
  const abs=Math.abs(n)
  if(abs>=1e9) return`$${(n/1e9).toFixed(1)}B`
  if(abs>=1e6) return`$${(n/1e6).toFixed(1)}M`
  if(abs>=1e3) return`$${new Intl.NumberFormat("es-AR").format(Math.round(n/1e3))}K`
  return`$${Math.round(n)}`
}
function fmtU(n){
  if(n==null) return"0"
  if(Math.abs(n)>=1e3) return`${new Intl.NumberFormat("es-AR").format(Math.round(n/1e3))}K`
  return new Intl.NumberFormat("es-AR").format(Math.round(n))
}
const fmtN=n=>new Intl.NumberFormat("es-AR").format(n??0)
const fmtPct=n=>`${(n??0).toFixed(1)}%`
const toPeriod=(y,m)=>y*100+m
const periodLabel=(p,short=false)=>{const y=Math.floor(p/100),m=p%100;return short?`${MESES[m]?.slice(0,3)} ${y}`:`${MESES[m]} ${y}`}

const BG="#0d1117",CARD="#161b22",CARD2="#1a2030",BORDER="#21262d",TEXT="#e6edf3",MUTED="#8b949e"
const CYAN="#00e5ff",CORAL="#ff6b6b",MINT="#00ffb3",PURPLE="#bf5af2",GOLD="#ffd60a",ORANGE="#ff9f0a",BLUE="#3b82f6",VIOLET="#a78bfa",TEAL="#14b8a6"
const RENT_COLOR={Alta:"#22c55e",Media:ORANGE,Baja:CORAL,"Sin dato":MUTED}
const RENT_BG={Alta:"#22c55e22",Media:`${ORANGE}22`,Baja:`${CORAL}22`,"Sin dato":`${MUTED}22`}
const VENDOR_COLORS=[CYAN,CORAL,MINT,PURPLE,GOLD,ORANGE,BLUE,VIOLET,"#f43f5e","#84cc16","#06b6d4","#d946ef"]

function RentBadge({nivel}){const n=nivel||"Sin dato";return<span style={{color:RENT_COLOR[n],fontSize:10,padding:"2px 8px",background:RENT_BG[n],borderRadius:20,whiteSpace:"nowrap",fontWeight:600}}>{n}</span>}
function KpiCard({icon,label,value,sub,accent}){return(
  <div style={{flex:1,minWidth:150,background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:accent}}/>
    <div style={{fontSize:18,marginBottom:6}}>{icon}</div>
    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:4}}>{label}</div>
    <div style={{fontSize:22,fontWeight:800,color:TEXT,lineHeight:1,wordBreak:"break-word"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:accent,fontWeight:600,marginTop:4}}>{sub}</div>}
  </div>
)}
function Dropdown({label,value,options,onChange}){
  const norm=options.map(o=>typeof o==="string"?{val:o,label:o}:o)
  return(
    <div style={{display:"flex",flexDirection:"column",gap:3,minWidth:110}}>
      <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:MUTED}}>{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:6,color:TEXT,padding:"5px 8px",fontSize:12,outline:"none",cursor:"pointer"}}>
        <option value="__ALL__">Todos</option>
        {norm.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
      </select>
    </div>
  )
}
function MetricToggle({value,onChange}){return(
  <div style={{display:"flex",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,padding:3,gap:3}}>
    {["pesos","unidades"].map(v=>(
      <button key={v} onClick={()=>onChange(v)} style={{padding:"5px 14px",background:value===v?CARD:"transparent",border:`1px solid ${value===v?BORDER:"transparent"}`,borderRadius:6,color:value===v?TEXT:MUTED,cursor:"pointer",fontSize:12,fontWeight:value===v?600:400}}>
        {v==="pesos"?"$ Pesos":"📦 Unidades"}
      </button>
    ))}
  </div>
)}
function SaveBar({stage,progress,msg}){
  if(stage==="idle") return null
  const label=stage==="merging"?"⚙️ Fusionando...":stage==="compressing"?"🗜️ Comprimiendo...":stage==="saving"?"☁️ Guardando en Supabase...":stage==="saved"?`✓ ${msg}`:`⚠️ ${msg}`
  const color=stage==="error"?CORAL:stage==="saved"?MINT:MUTED
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:220,maxWidth:300}}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:11,color}}>{label.slice(0,60)}</span>
        {stage!=="error"&&stage!=="saved"&&<span style={{fontSize:10,color:MUTED}}>{progress}%</span>}
      </div>
      {stage!=="error"&&<div style={{height:4,background:BORDER,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:stage==="saved"?MINT:CYAN,borderRadius:2,transition:"width 0.35s ease"}}/></div>}
    </div>
  )
}

function MappingModal({headers,onConfirm,onCancel}){
  const[mapping,setMapping]=useState(()=>autoMap(headers))
  const[pet,setPet]=useState(true)
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:28,width:520,maxWidth:"96vw",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontSize:15,fontWeight:700,color:TEXT,marginBottom:4}}>Mapear columnas del Excel</div>
        <div style={{fontSize:12,color:MUTED,marginBottom:20}}>Columnas detectadas automáticamente. Ajustá si es necesario.</div>
        {CAMPOS.map(({key,label,req})=>(
          <div key={key} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
            <span style={{color:req?CYAN:MUTED,width:130,fontSize:12,flexShrink:0}}>{label}{req?" *":""}</span>
            <select value={mapping[key]||""} onChange={e=>setMapping(m=>({...m,[key]:e.target.value||undefined}))}
              style={{flex:1,background:mapping[key]?"#1f2937":BG,border:`1px solid ${mapping[key]?CYAN:BORDER}`,borderRadius:6,color:mapping[key]?TEXT:MUTED,padding:"5px 9px",fontSize:12,outline:"none"}}>
              <option value="">— no mapear —</option>
              {headers.map(h=><option key={h} value={h}>{h}</option>)}
            </select>
            {mapping[key]&&<span style={{color:MINT,fontSize:13}}>✓</span>}
          </div>
        ))}
        <div style={{padding:"12px 14px",background:"#0d1117",border:`1px solid ${BORDER}`,borderRadius:8}}>
          <div style={{fontSize:11,color:MUTED,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>¿Cómo viene el precio?</div>
          {[{v:true,l:"Ya es el total de la fila",d:"El importe incluye la cantidad"},{v:false,l:"Es precio unitario",d:"Se multiplica precio × cantidad"}].map(opt=>(
            <div key={String(opt.v)} onClick={()=>setPet(opt.v)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 10px",borderRadius:6,cursor:"pointer",background:pet===opt.v?CARD2:"transparent",border:`1px solid ${pet===opt.v?CYAN:"transparent"}`,marginBottom:5}}>
              <div style={{width:13,height:13,borderRadius:"50%",border:`2px solid ${pet===opt.v?CYAN:MUTED}`,background:pet===opt.v?CYAN:"transparent",flexShrink:0,marginTop:2}}/>
              <div><div style={{fontSize:12,color:TEXT,fontWeight:600}}>{opt.l}</div><div style={{fontSize:11,color:MUTED,marginTop:1}}>{opt.d}</div></div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{padding:"7px 18px",background:"transparent",border:`1px solid ${BORDER}`,borderRadius:6,color:MUTED,cursor:"pointer",fontSize:12}}>Cancelar</button>
          <button onClick={()=>onConfirm(mapping,pet)} style={{padding:"7px 18px",background:CYAN,border:"none",borderRadius:6,color:"#000",cursor:"pointer",fontWeight:700,fontSize:12}}>Siguiente →</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmImportModal({stats,onConfirm,onCancel}){
  const{rows,ventas,unidades,hasCantidad,periods,existingRows,cubeKB}=stats
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:CARD,border:`2px solid ${CYAN}40`,borderRadius:14,padding:32,width:480,maxWidth:"96vw"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:22}}>📋</span>
          <div><div style={{fontSize:16,fontWeight:800,color:TEXT}}>Confirmar importación</div><div style={{fontSize:12,color:MUTED}}>Revisá los datos antes de agregar</div></div>
        </div>
        <div style={{height:1,background:BORDER,margin:"16px 0"}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[["Filas a importar",fmtN(rows),CYAN],["Importe total",fmtM(ventas),ORANGE],...(hasCantidad?[["Unidades",fmtU(unidades),MINT]]:[]),["Períodos",String(periods.length),PURPLE]].map(([l,v,c])=>(
            <div key={l} style={{background:BG,border:`1px solid ${BORDER}`,borderRadius:8,padding:"12px 14px"}}>
              <div style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>{l}</div>
              <div style={{fontSize:26,fontWeight:800,color:c}}>{v}</div>
            </div>
          ))}
        </div>
        {cubeKB!=null&&(
          <div style={{background:BG,border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 14px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:11,color:MUTED}}>🗜️ Tamaño estimado del cubo</span>
              <span style={{fontSize:11,fontWeight:700,color:cubeKB>400000?CORAL:cubeKB>200000?ORANGE:MINT}}>{fmtN(cubeKB)} KB</span>
            </div>
            <div style={{height:5,background:BORDER,borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(cubeKB/500000*100,100)}%`,background:cubeKB>400000?CORAL:cubeKB>200000?ORANGE:MINT,borderRadius:3}}/>
            </div>
          </div>
        )}
        {periods.length>0&&(
          <div style={{background:BG,border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 14px",marginBottom:16}}>
            <div style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:1.5,marginBottom:8}}>Períodos incluidos</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {periods.map(p=><span key={p} style={{fontSize:11,fontWeight:600,color:TEXT,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:6,padding:"3px 10px"}}>{periodLabel(p)}</span>)}
            </div>
          </div>
        )}
        {existingRows>0&&(
          <div style={{background:`${ORANGE}11`,border:`1px solid ${ORANGE}40`,borderRadius:8,padding:"10px 14px",marginBottom:16,display:"flex",gap:8}}>
            <span style={{fontSize:16}}>⚠️</span>
            <div style={{fontSize:12,color:ORANGE}}>Ya hay <strong>{fmtN(existingRows)}</strong> registros. Los nuevos se <strong>agregarán</strong>.</div>
          </div>
        )}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{padding:"8px 20px",background:"transparent",border:`1px solid ${BORDER}`,borderRadius:6,color:MUTED,cursor:"pointer",fontSize:13}}>← Volver</button>
          <button onClick={onConfirm} style={{padding:"8px 22px",background:CYAN,border:"none",borderRadius:6,color:"#000",cursor:"pointer",fontWeight:700,fontSize:13}}>✓ Confirmar</button>
        </div>
      </div>
    </div>
  )
}

function DualRanking({title,data,colorPesos,colorUnid,totalVentas,totalUnidades,hasCantidad,compact=false}){
  const[metric,setMetric]=useState("pesos")
  const[expanded,setExpanded]=useState(false)
  const limit=compact?6:10
  const sorted=metric==="pesos"?[...data].sort((a,b)=>b.ventas-a.ventas):[...data].sort((a,b)=>b.cantidad-a.cantidad)
  const maxV=sorted[0]?.[metric==="pesos"?"ventas":"cantidad"]||1
  const total=metric==="pesos"?totalVentas:totalUnidades
  const color=metric==="pesos"?colorPesos:colorUnid
  const valFn=d=>metric==="pesos"?fmtM(d.ventas):fmtU(d.cantidad)
  const shown=expanded?sorted:sorted.slice(0,limit)
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"16px 18px",flex:1,minWidth:280}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div><span style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED}}>{title}</span><span style={{fontSize:11,color:MUTED,marginLeft:8}}>{data.length} cat.</span></div>
        {hasCantidad&&<MetricToggle value={metric} onChange={setMetric}/>}
      </div>
      {shown.map((d,i)=>(
        <div key={d.name} style={{marginBottom:9}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <span style={{fontSize:11,color:MUTED,width:16,textAlign:"right",flexShrink:0}}>{i+1}.</span>
            <span style={{fontSize:12,color:TEXT,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.name}</span>
            <span style={{fontSize:12,fontWeight:700,color,whiteSpace:"nowrap"}}>{valFn(d)}</span>
            <span style={{fontSize:11,color:MUTED,width:38,textAlign:"right"}}>{fmtPct(total>0?(metric==="pesos"?d.ventas:d.cantidad)/total*100:0)}</span>
          </div>
          <div style={{height:3,background:BORDER,borderRadius:2,marginLeft:24}}>
            <div style={{height:"100%",width:`${(metric==="pesos"?d.ventas:d.cantidad)/maxV*100}%`,background:color,borderRadius:2}}/>
          </div>
        </div>
      ))}
      {!expanded&&data.length>limit&&<button onClick={()=>setExpanded(true)} style={{fontSize:11,color:CYAN,background:"none",border:"none",cursor:"pointer",marginTop:4,padding:0}}>+ Ver {data.length-limit} más</button>}
      {expanded&&<button onClick={()=>setExpanded(false)} style={{fontSize:11,color:MUTED,background:"none",border:"none",cursor:"pointer",marginTop:4,padding:0}}>Ver menos ▲</button>}
    </div>
  )
}

function DetailTab({data,hasCantidad,totalVentas,totalUnidades,dimLabel,colorPesos,colorUnid}){
  const[metric,setMetric]=useState("pesos")
  const[expanded,setExpanded]=useState(false)
  const sorted=metric==="pesos"?[...data].sort((a,b)=>b.ventas-a.ventas):[...data].sort((a,b)=>b.cantidad-a.cantidad)
  const maxV=sorted[0]?.[metric==="pesos"?"ventas":"cantidad"]||1
  const total=metric==="pesos"?totalVentas:totalUnidades
  const color=metric==="pesos"?colorPesos:colorUnid
  const valFn=d=>metric==="pesos"?fmtM(d.ventas):fmtU(d.cantidad)
  const shown=expanded?sorted:sorted.slice(0,15)
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div><span style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED}}>Ranking por {dimLabel}</span><span style={{fontSize:11,color:MUTED,marginLeft:8}}>{data.length} {dimLabel.toLowerCase()}s</span></div>
        {hasCantidad&&<MetricToggle value={metric} onChange={setMetric}/>}
      </div>
      {shown.map((d,i)=>(
        <div key={d.name} style={{marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <span style={{fontSize:11,color:MUTED,width:18,textAlign:"right",flexShrink:0}}>{i+1}.</span>
            <span style={{fontSize:12,color:TEXT,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.name}</span>
            <span style={{fontSize:13,fontWeight:700,color,whiteSpace:"nowrap",minWidth:64,textAlign:"right"}}>{valFn(d)}</span>
            <span style={{fontSize:11,color:MUTED,width:38,textAlign:"right"}}>{fmtPct(total>0?(metric==="pesos"?d.ventas:d.cantidad)/total*100:0)}</span>
            {hasCantidad&&<span style={{fontSize:11,color:MUTED,minWidth:60,textAlign:"right",whiteSpace:"nowrap"}}>{metric==="pesos"?`${fmtU(d.cantidad)} u.`:fmtM(d.ventas)}</span>}
          </div>
          <div style={{height:3,background:BORDER,borderRadius:2,marginLeft:26}}>
            <div style={{height:"100%",width:`${(metric==="pesos"?d.ventas:d.cantidad)/maxV*100}%`,background:color,borderRadius:2}}/>
          </div>
        </div>
      ))}
      {!expanded&&sorted.length>15&&<button onClick={()=>setExpanded(true)} style={{fontSize:11,color:CYAN,background:"none",border:"none",cursor:"pointer",marginTop:4,padding:0}}>+ Ver {sorted.length-15} más</button>}
      {expanded&&<button onClick={()=>setExpanded(false)} style={{fontSize:11,color:MUTED,background:"none",border:"none",cursor:"pointer",marginTop:4,padding:0}}>Ver menos ▲</button>}
    </div>
  )
}

function ArticulosTable({data,hasCantidad,hasRentabilidad,totalVentas}){
  const[metric,setMetric]=useState("pesos")
  const[expanded,setExpanded]=useState(false)
  const sorted=metric==="pesos"?[...data].sort((a,b)=>b.precio-a.precio):[...data].sort((a,b)=>b.cantidad-a.cantidad)
  const shown=expanded?sorted:sorted.slice(0,10)
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div><span style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED}}>Por Artículo</span><span style={{fontSize:11,color:MUTED,marginLeft:8}}>{data.length} artículos</span></div>
        {hasCantidad&&<MetricToggle value={metric} onChange={setMetric}/>}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["#","Artículo","$ Ventas",...(hasCantidad?["Unidades"]:[]),...(hasRentabilidad?["Rentabilidad"]:[]),"Part. %"].map(h=>(
            <th key={h} style={{padding:"6px 8px",textAlign:h==="Artículo"?"left":"right",color:MUTED,fontSize:10,textTransform:"uppercase",letterSpacing:1,borderBottom:`1px solid ${BORDER}`,whiteSpace:"nowrap"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{shown.map((d,i)=>(
            <tr key={d.name} onMouseEnter={e=>e.currentTarget.style.background=CARD2} onMouseLeave={e=>e.currentTarget.style.background="transparent"} style={{borderBottom:`1px solid #1a1f2a`}}>
              <td style={{padding:"8px",color:MUTED,fontSize:11,textAlign:"right",width:24}}>{i+1}</td>
              <td style={{padding:"8px",color:TEXT,maxWidth:180,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.name}</td>
              <td style={{padding:"8px",color:CYAN,textAlign:"right",fontWeight:600}}>{fmtM(d.precio)}</td>
              {hasCantidad&&<td style={{padding:"8px",color:MINT,textAlign:"right",fontWeight:600}}>{fmtU(d.cantidad)}</td>}
              {hasRentabilidad&&<td style={{padding:"8px",textAlign:"right"}}><RentBadge nivel={d.rentabilidad||"Sin dato"}/></td>}
              <td style={{padding:"8px",color:MUTED,textAlign:"right"}}>{fmtPct(totalVentas>0?d.precio/totalVentas*100:0)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {!expanded&&data.length>10&&<button onClick={()=>setExpanded(true)} style={{fontSize:11,color:CYAN,background:"none",border:"none",cursor:"pointer",marginTop:8,padding:0}}>+ Ver {data.length-10} más</button>}
      {expanded&&<button onClick={()=>setExpanded(false)} style={{fontSize:11,color:MUTED,background:"none",border:"none",cursor:"pointer",marginTop:8,padding:0}}>Ver menos ▲</button>}
    </div>
  )
}

function RentabilidadSection({data,artData,hasCantidad}){
  const total=data.reduce((s,r)=>s+r.ventas,0)||1
  return(
    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
      {["Alta","Media","Baja"].map(n=>{
        const d=data.find(x=>x.name===n)
        return(
          <div key={n} style={{flex:1,minWidth:150,background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:RENT_COLOR[n]}}/>
            <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:6}}>Rent. {n}</div>
            <div style={{fontSize:24,fontWeight:800,color:RENT_COLOR[n]}}>{d?fmtM(d.ventas):"$0"}</div>
            <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
              {hasCantidad&&d&&<div><div style={{fontSize:10,color:MUTED}}>Unidades</div><div style={{fontSize:13,fontWeight:700,color:MINT}}>{fmtU(d.cantidad)}</div></div>}
              <div><div style={{fontSize:10,color:MUTED}}>Participación</div><div style={{fontSize:13,fontWeight:700,color:TEXT}}>{d?fmtPct(d.ventas/total*100):"0%"}</div></div>
              <div><div style={{fontSize:10,color:MUTED}}>Artículos</div><div style={{fontSize:13,fontWeight:700,color:TEXT}}>{artData.filter(a=>a.rentabilidad===n).length}</div></div>
            </div>
            <div style={{height:3,background:BORDER,borderRadius:2,marginTop:10}}>
              {d&&<div style={{height:"100%",width:`${d.ventas/total*100}%`,background:RENT_COLOR[n],borderRadius:2}}/>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── CLIENTES TAB ──────────────────────────────────────────────────────────── */
function ClientesTab({filteredRecords,meta,totalVentas,totalUnidades}){
  const[sel,setSel]=useState(null)
  const[metric,setMetric]=useState("pesos")
  const[search,setSearch]=useState("")
  const cliMap={}
  filteredRecords.forEach(r=>{
    const k=r.cliente||"Sin cliente"
    if(!cliMap[k]) cliMap[k]={name:k,ventas:0,cantidad:0,rows:0,periodos:new Set(),rubros:{},proveedores:{},vendedores:{},empresas:{},rentMix:{Alta:0,Media:0,Baja:0}}
    const c=cliMap[k]
    c.ventas+=r.precio;c.cantidad+=r.cantidad;c.rows+=(r.rows||1)
    if(r.y&&r.m!==undefined) c.periodos.add(toPeriod(r.y,r.m))
    if(r.rubro)     c.rubros[r.rubro]         =(c.rubros[r.rubro]         ||0)+r.precio
    if(r.proveedor) c.proveedores[r.proveedor]=(c.proveedores[r.proveedor]||0)+r.precio
    if(r.vendedor)  c.vendedores[r.vendedor]  =(c.vendedores[r.vendedor]  ||0)+r.precio
    if(r.empresa)   c.empresas[r.empresa]     =(c.empresas[r.empresa]     ||0)+r.precio
    if(["Alta","Media","Baja"].includes(r.rentabilidad)) c.rentMix[r.rentabilidad]+=r.precio
  })
  const cliList=Object.values(cliMap).sort((a,b)=>b.ventas-a.ventas)
  cliList.forEach((c,i)=>{c.color=VENDOR_COLORS[i%VENDOR_COLORS.length];c.periodos=c.periodos.size})
  const maxV=cliList[0]?.ventas||1
  const filtered=search?cliList.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())):cliList
  const topCliente=cliList[0]
  const ticketProm=cliList.length>0?totalVentas/cliList.length:0

  // Evolución mes a mes por cliente top
  const perMap={}
  filteredRecords.forEach(r=>{
    if(r.y===undefined||r.m===undefined||!r.cliente) return
    const p=toPeriod(r.y,r.m)
    if(!perMap[p]) perMap[p]={p,total:0}
    perMap[p][r.cliente]=(perMap[p][r.cliente]||0)+r.precio
    perMap[p].total+=r.precio
  })
  const perData=Object.values(perMap).sort((a,b)=>a.p-b.p)
  const perMax=Math.max(...perData.map(m=>m.total),1)
  const topClientes=cliList.slice(0,6)

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* KPIs */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <KpiCard icon="🏢" label="Clientes activos" value={fmtN(cliList.length)} sub="en el período" accent={TEAL}/>
        <KpiCard icon="💰" label="Ventas totales" value={fmtM(totalVentas)} sub="período filtrado" accent={CYAN}/>
        {meta?.hasCantidad&&<KpiCard icon="📦" label="Unidades" value={fmtU(totalUnidades)} sub="período" accent={MINT}/>}
        {topCliente&&<KpiCard icon="🥇" label="Top cliente" value={topCliente.name} sub={`${fmtM(topCliente.ventas)} — ${fmtPct(totalVentas>0?topCliente.ventas/totalVentas*100:0)}`} accent={GOLD}/>}
        <KpiCard icon="📊" label="Ticket promedio" value={fmtM(ticketProm)} sub="por cliente" accent={PURPLE}/>
      </div>

      {/* Ranking con búsqueda */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"18px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,fontWeight:600}}>Ranking de clientes ({cliList.length})</div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:6,color:TEXT,padding:"5px 10px",fontSize:12,outline:"none",width:180}}/>
            {meta?.hasCantidad&&<MetricToggle value={metric} onChange={setMetric}/>}
          </div>
        </div>
        {filtered.map((c,i)=>(
          <div key={c.name} onClick={()=>setSel(sel===c.name?null:c.name)}
            style={{marginBottom:10,cursor:"pointer",padding:"10px 12px",borderRadius:8,border:`1px solid ${sel===c.name?TEAL:BORDER}`,background:sel===c.name?TEAL+"11":"transparent",transition:"all .15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
              <span style={{fontSize:11,color:MUTED,width:24,textAlign:"right",flexShrink:0}}>{cliList.indexOf(c)+1}.</span>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:600,color:TEXT,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</span>
              <span style={{fontSize:13,fontWeight:800,color:metric==="pesos"?TEAL:MINT,minWidth:70,textAlign:"right"}}>{metric==="pesos"?fmtM(c.ventas):fmtU(c.cantidad)}</span>
              <span style={{fontSize:11,color:MUTED,width:44,textAlign:"right"}}>{fmtPct(totalVentas>0?c.ventas/totalVentas*100:0)}</span>
              {meta?.hasCantidad&&<span style={{fontSize:11,color:MINT,minWidth:60,textAlign:"right"}}>{fmtU(c.cantidad)} u.</span>}
              <span style={{fontSize:11,color:MUTED,minWidth:56,textAlign:"right"}}>{fmtN(c.rows)} ops.</span>
              {c.periodos>0&&<span style={{fontSize:11,color:MUTED,minWidth:50,textAlign:"right"}}>{c.periodos} per.</span>}
            </div>
            <div style={{height:4,background:BORDER,borderRadius:2,marginLeft:42}}>
              <div style={{height:"100%",width:`${(metric==="pesos"?c.ventas:c.cantidad)/maxV*100}%`,background:TEAL,borderRadius:2,opacity:.8}}/>
            </div>

            {/* Detalle expandido */}
            {sel===c.name&&(
              <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap"}}>
                {Object.keys(c.rubros).length>0&&(
                  <div style={{flex:1,minWidth:170}}>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:8}}>Rubros que compra</div>
                    {Object.entries(c.rubros).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([r,val])=>(
                      <div key={r} style={{marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{r}</span><span style={{fontSize:11,fontWeight:600,color:CORAL,flexShrink:0,marginLeft:4}}>{fmtM(val)}</span></div>
                        <div style={{height:2,background:BORDER,borderRadius:1}}><div style={{height:"100%",width:`${val/c.ventas*100}%`,background:CORAL,borderRadius:1}}/></div>
                      </div>
                    ))}
                  </div>
                )}
                {Object.keys(c.proveedores).length>0&&(
                  <div style={{flex:1,minWidth:170}}>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:8}}>Proveedores</div>
                    {Object.entries(c.proveedores).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([p,val])=>(
                      <div key={p} style={{marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{p}</span><span style={{fontSize:11,fontWeight:600,color:CYAN,flexShrink:0,marginLeft:4}}>{fmtM(val)}</span></div>
                        <div style={{height:2,background:BORDER,borderRadius:1}}><div style={{height:"100%",width:`${val/c.ventas*100}%`,background:CYAN,borderRadius:1}}/></div>
                      </div>
                    ))}
                  </div>
                )}
                {Object.keys(c.vendedores).length>0&&(
                  <div style={{flex:1,minWidth:150}}>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:8}}>Atendido por</div>
                    {Object.entries(c.vendedores).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([v,val])=>(
                      <div key={v} style={{marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110}}>{v}</span><span style={{fontSize:11,fontWeight:600,color:PURPLE,flexShrink:0,marginLeft:4}}>{fmtM(val)}</span></div>
                        <div style={{height:2,background:BORDER,borderRadius:1}}><div style={{height:"100%",width:`${val/c.ventas*100}%`,background:PURPLE,borderRadius:1}}/></div>
                      </div>
                    ))}
                  </div>
                )}
                {(c.rentMix.Alta+c.rentMix.Media+c.rentMix.Baja)>0&&(
                  <div style={{flex:1,minWidth:150}}>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:8}}>Mix rentabilidad</div>
                    {["Alta","Media","Baja"].map(n=>{const val=c.rentMix[n];if(!val) return null;return(
                      <div key={n} style={{marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><RentBadge nivel={n}/><span style={{fontSize:11,fontWeight:600,color:RENT_COLOR[n]}}>{fmtPct(c.ventas>0?val/c.ventas*100:0)}</span></div>
                        <div style={{height:2,background:BORDER,borderRadius:1}}><div style={{height:"100%",width:`${val/c.ventas*100}%`,background:RENT_COLOR[n],borderRadius:1}}/></div>
                      </div>
                    )})}
                  </div>
                )}
                {Object.keys(c.empresas).length>1&&(
                  <div style={{flex:1,minWidth:150}}>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:8}}>Empresas</div>
                    {Object.entries(c.empresas).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([e,val])=>(
                      <div key={e} style={{marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110}}>{e}</span><span style={{fontSize:11,fontWeight:600,color:ORANGE,flexShrink:0,marginLeft:4}}>{fmtM(val)}</span></div>
                        <div style={{height:2,background:BORDER,borderRadius:1}}><div style={{height:"100%",width:`${val/c.ventas*100}%`,background:ORANGE,borderRadius:1}}/></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div style={{fontSize:11,color:MUTED,marginTop:4}}>💡 Hacé clic en un cliente para ver qué compra, quién lo atiende y su mix de rentabilidad.</div>
      </div>

      {/* Evolución mes a mes */}
      {perData.length>0&&(
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"18px 20px"}}>
          <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:14,fontWeight:600}}>Evolución de top clientes por período</div>
          {perData.map(per=>(
            <div key={per.p} style={{marginBottom:14}}>
              <div style={{fontSize:12,color:TEXT,fontWeight:600,marginBottom:6}}>{periodLabel(per.p)}</div>
              {topClientes.map(c=>{const val=per[c.name]||0;if(!val) return null;return(
                <div key={c.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
                  <span style={{fontSize:11,color:MUTED,width:160,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</span>
                  <div style={{flex:1,height:6,background:BORDER,borderRadius:3}}><div style={{height:"100%",width:`${val/perMax*100}%`,background:c.color,borderRadius:3,opacity:.8}}/></div>
                  <span style={{fontSize:11,fontWeight:600,color:c.color,minWidth:64,textAlign:"right"}}>{fmtM(val)}</span>
                  <span style={{fontSize:10,color:MUTED,minWidth:40,textAlign:"right"}}>{fmtPct(per.total>0?val/per.total*100:0)}</span>
                </div>
              )})}
            </div>
          ))}
        </div>
      )}

      {/* Barra de participación */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"18px 20px"}}>
        <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:14,fontWeight:600}}>Participación de clientes</div>
        <div style={{display:"flex",height:28,borderRadius:6,overflow:"hidden",gap:1}}>
          {cliList.map(c=><div key={c.name} title={`${c.name}: ${fmtM(c.ventas)} (${fmtPct(totalVentas>0?c.ventas/totalVentas*100:0)})`} style={{flex:c.ventas,background:c.color,minWidth:2,opacity:.85}}/>)}
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10}}>
          {topClientes.map(c=><div key={c.name} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:c.color}}/><span style={{fontSize:11,color:MUTED,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span><span style={{fontSize:11,fontWeight:700,color:c.color}}>{fmtPct(totalVentas>0?c.ventas/totalVentas*100:0)}</span></div>)}
          {cliList.length>6&&<span style={{fontSize:11,color:MUTED}}>+ {cliList.length-6} más</span>}
        </div>
      </div>
    </div>
  )
}

function VendedoresTab({filteredRecords,meta,totalVentas,totalUnidades}){
  const[sel,setSel]=useState(null)
  const vendMap={}
  filteredRecords.forEach(r=>{
    const k=r.vendedor||"Sin vendedor"
    if(!vendMap[k]) vendMap[k]={name:k,ventas:0,cantidad:0,rows:0,periodos:new Set(),proveedores:{},rubros:{},provincias:{},rentMix:{Alta:0,Media:0,Baja:0}}
    const v=vendMap[k]
    v.ventas+=r.precio;v.cantidad+=r.cantidad;v.rows+=(r.rows||1)
    if(r.y&&r.m!==undefined) v.periodos.add(toPeriod(r.y,r.m))
    if(r.proveedor) v.proveedores[r.proveedor]=(v.proveedores[r.proveedor]||0)+r.precio
    if(r.rubro) v.rubros[r.rubro]=(v.rubros[r.rubro]||0)+r.precio
    if(r.provincia) v.provincias[r.provincia]=(v.provincias[r.provincia]||0)+r.precio
    if(["Alta","Media","Baja"].includes(r.rentabilidad)) v.rentMix[r.rentabilidad]+=r.precio
  })
  const vendList=Object.values(vendMap).sort((a,b)=>b.ventas-a.ventas)
  vendList.forEach((v,i)=>{v.color=VENDOR_COLORS[i%VENDOR_COLORS.length];v.periodos=v.periodos.size})
  const maxV2=vendList[0]?.ventas||1
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <KpiCard icon="👥" label="Vendedores activos" value={vendList.length} sub="en el período" accent={PURPLE}/>
        <KpiCard icon="💰" label="Ventas totales" value={fmtM(totalVentas)} sub="período filtrado" accent={CYAN}/>
        {meta?.hasCantidad&&<KpiCard icon="📦" label="Unidades" value={fmtU(totalUnidades)} sub="período" accent={MINT}/>}
        {vendList[0]&&<KpiCard icon="🏆" label="Líder de ventas" value={vendList[0].name} sub={`${fmtM(vendList[0].ventas)} — ${fmtPct(totalVentas>0?vendList[0].ventas/totalVentas*100:0)}`} accent={GOLD}/>}
        {vendList.length>1&&<KpiCard icon="📉" label="Menor performance" value={vendList[vendList.length-1].name} sub={fmtM(vendList[vendList.length-1].ventas)} accent={CORAL}/>}
      </div>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"18px 20px"}}>
        <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:14,fontWeight:600}}>Ranking de vendedores</div>
        {vendList.map((v,i)=>(
          <div key={v.name} onClick={()=>setSel(sel===v.name?null:v.name)}
            style={{marginBottom:12,cursor:"pointer",padding:"10px 12px",borderRadius:8,border:`1px solid ${sel===v.name?v.color:BORDER}`,background:sel===v.name?v.color+"11":"transparent",transition:"all .15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <span style={{fontSize:12,color:MUTED,width:22,textAlign:"right",flexShrink:0}}>{i+1}.</span>
              <div style={{width:8,height:8,borderRadius:"50%",background:v.color,flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:600,color:TEXT,flex:1}}>{v.name}</span>
              <span style={{fontSize:13,fontWeight:800,color:v.color,minWidth:70,textAlign:"right"}}>{fmtM(v.ventas)}</span>
              <span style={{fontSize:11,color:MUTED,width:44,textAlign:"right"}}>{fmtPct(totalVentas>0?v.ventas/totalVentas*100:0)}</span>
              {meta?.hasCantidad&&<span style={{fontSize:11,color:MINT,minWidth:60,textAlign:"right"}}>{fmtU(v.cantidad)} u.</span>}
              <span style={{fontSize:11,color:MUTED,minWidth:64,textAlign:"right"}}>{fmtN(v.rows)} ops.</span>
            </div>
            <div style={{height:4,background:BORDER,borderRadius:2,marginLeft:40}}>
              <div style={{height:"100%",width:`${v.ventas/maxV2*100}%`,background:v.color,borderRadius:2,opacity:.85}}/>
            </div>
            {sel===v.name&&(
              <div style={{marginTop:14,display:"flex",gap:10,flexWrap:"wrap"}}>
                {meta?.hasProveedor&&Object.keys(v.proveedores).length>0&&(
                  <div style={{flex:1,minWidth:180}}>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:8}}>Proveedores</div>
                    {Object.entries(v.proveedores).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([p,val])=>(
                      <div key={p} style={{marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{p}</span><span style={{fontSize:11,fontWeight:600,color:CYAN,flexShrink:0,marginLeft:4}}>{fmtM(val)}</span></div>
                        <div style={{height:2,background:BORDER,borderRadius:1}}><div style={{height:"100%",width:`${val/v.ventas*100}%`,background:CYAN,borderRadius:1}}/></div>
                      </div>
                    ))}
                  </div>
                )}
                {meta?.hasRubro&&Object.keys(v.rubros).length>0&&(
                  <div style={{flex:1,minWidth:180}}>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:8}}>Rubros</div>
                    {Object.entries(v.rubros).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([r,val])=>(
                      <div key={r} style={{marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{r}</span><span style={{fontSize:11,fontWeight:600,color:CORAL,flexShrink:0,marginLeft:4}}>{fmtM(val)}</span></div>
                        <div style={{height:2,background:BORDER,borderRadius:1}}><div style={{height:"100%",width:`${val/v.ventas*100}%`,background:CORAL,borderRadius:1}}/></div>
                      </div>
                    ))}
                  </div>
                )}
                {meta?.hasRentabilidad&&(v.rentMix.Alta+v.rentMix.Media+v.rentMix.Baja)>0&&(
                  <div style={{flex:1,minWidth:160}}>
                    <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:8}}>Mix rentabilidad</div>
                    {["Alta","Media","Baja"].map(n=>{const val=v.rentMix[n];if(!val) return null;return(
                      <div key={n} style={{marginBottom:5}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><RentBadge nivel={n}/><span style={{fontSize:11,fontWeight:600,color:RENT_COLOR[n]}}>{fmtPct(v.ventas>0?val/v.ventas*100:0)}</span></div>
                        <div style={{height:2,background:BORDER,borderRadius:1}}><div style={{height:"100%",width:`${val/v.ventas*100}%`,background:RENT_COLOR[n],borderRadius:1}}/></div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div style={{fontSize:11,color:MUTED,marginTop:4}}>💡 Hacé clic en un vendedor para ver su desglose.</div>
      </div>
    </div>
  )
}

function EvolucionTab({filteredRecords,meta}){
  const[dim,setDim]=useState(()=>meta?.hasProveedor?"proveedor":meta?.hasRubro?"rubro":"vendedor")
  const[metric,setMetric]=useState("pesos")
  const dims=[...(meta?.hasProveedor?[{key:"proveedor",label:"Proveedores",color:CYAN}]:[]),...(meta?.hasRubro?[{key:"rubro",label:"Rubros",color:CORAL}]:[]),...(meta?.hasVendedor?[{key:"vendedor",label:"Vendedores",color:PURPLE}]:[]),...(meta?.hasCliente?[{key:"cliente",label:"Clientes",color:TEAL}]:[])]
  const activeDim=dims.find(d=>d.key===dim)||dims[0]
  const periods=[...new Set(filteredRecords.map(r=>toPeriod(r.y,r.m)).filter(v=>!isNaN(v)&&v>0))].sort((a,b)=>a-b)
  const matrix={}
  filteredRecords.forEach(r=>{
    const k=r[dim];if(!k) return
    const p=toPeriod(r.y,r.m)
    if(!matrix[k]) matrix[k]={}
    if(!matrix[k][p]) matrix[k][p]={ventas:0,cantidad:0}
    matrix[k][p].ventas+=r.precio;matrix[k][p].cantidad+=r.cantidad
  })
  const entities=Object.keys(matrix).sort((a,b)=>Object.values(matrix[b]).reduce((s,x)=>s+x.ventas,0)-Object.values(matrix[a]).reduce((s,x)=>s+x.ventas,0))
  const valFn=(e,p)=>{const d=matrix[e]?.[p];return d?(metric==="pesos"?d.ventas:d.cantidad):0}
  const momPct=(e,pi)=>{if(pi===0) return null;const prev=valFn(e,periods[pi-1]),curr=valFn(e,periods[pi]);return prev>0?((curr-prev)/prev)*100:null}
  const periodTotals=periods.map(p=>({p,val:filteredRecords.filter(r=>toPeriod(r.y,r.m)===p).reduce((s,r)=>s+(metric==="pesos"?r.precio:r.cantidad),0)}))
  const maxBar=Math.max(...periodTotals.map(x=>x.val),1)
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {dims.map(d=><button key={d.key} onClick={()=>setDim(d.key)} style={{padding:"5px 14px",background:dim===d.key?d.color+"22":"transparent",border:`1px solid ${dim===d.key?d.color:BORDER}`,borderRadius:6,color:dim===d.key?d.color:MUTED,cursor:"pointer",fontSize:12,fontWeight:600}}>{d.label}</button>)}
        </div>
        {meta?.hasCantidad&&<MetricToggle value={metric} onChange={setMetric}/>}
      </div>
      {periods.length>0&&(
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"18px 20px"}}>
          <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:14}}>Evolución total por período</div>
          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:110,overflowX:"auto"}}>
            {periodTotals.map((pt,i)=>{
              const h=Math.max(pt.val/maxBar*80,2),prev=i>0?periodTotals[i-1].val:null,pct=prev&&prev>0?((pt.val-prev)/prev)*100:null
              return(
                <div key={pt.p} style={{minWidth:64,flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:10,fontWeight:700,color:pct==null?MUTED:pct>=0?MINT:CORAL}}>{pct==null?"—":pct>=0?`+${pct.toFixed(0)}%`:`${pct.toFixed(0)}%`}</span>
                  <div style={{width:"100%",height:80,display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",height:h,background:activeDim?.color||CYAN,borderRadius:"3px 3px 0 0",opacity:.8}}/></div>
                  <span style={{fontSize:9,color:MUTED,whiteSpace:"nowrap"}}>{periodLabel(pt.p,true)}</span>
                  <span style={{fontSize:10,fontWeight:700,color:TEXT,whiteSpace:"nowrap"}}>{metric==="pesos"?fmtM(pt.val):fmtU(pt.val)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {periods.length>0&&entities.length>0&&(
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"18px 20px",overflowX:"auto"}}>
          <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:14}}>Tabla período a período — {activeDim?.label}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:520}}>
            <thead><tr>
              <th style={{padding:"6px 10px",textAlign:"left",color:MUTED,fontSize:10,textTransform:"uppercase",borderBottom:`1px solid ${BORDER}`,minWidth:130}}>{activeDim?.label?.replace(/s$/,"")}</th>
              {periods.map(p=><th key={p} style={{padding:"6px 8px",textAlign:"right",color:MUTED,fontSize:10,borderBottom:`1px solid ${BORDER}`,whiteSpace:"nowrap",minWidth:88}}>{periodLabel(p,true)}</th>)}
              <th style={{padding:"6px 8px",textAlign:"right",color:MUTED,fontSize:10,borderBottom:`1px solid ${BORDER}`,whiteSpace:"nowrap"}}>Total</th>
            </tr></thead>
            <tbody>
              {entities.slice(0,20).map(entity=>{
                const tot=Object.values(matrix[entity]).reduce((s,x)=>s+(metric==="pesos"?x.ventas:x.cantidad),0)
                return(
                  <tr key={entity} onMouseEnter={e=>e.currentTarget.style.background=CARD2} onMouseLeave={e=>e.currentTarget.style.background="transparent"} style={{borderBottom:`1px solid #1a1f2a`}}>
                    <td style={{padding:"8px 10px",color:TEXT,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:130}}>{entity}</td>
                    {periods.map((p,pi)=>{const val=valFn(entity,p),pct=momPct(entity,pi);return(
                      <td key={p} style={{padding:"8px",textAlign:"right",verticalAlign:"top"}}>
                        <div style={{color:val>0?(activeDim?.color||CYAN):MUTED,fontWeight:val>0?700:400}}>{val>0?(metric==="pesos"?fmtM(val):fmtU(val)):"—"}</div>
                        {pi>0&&val>0&&pct!==null&&<div style={{fontSize:10,color:pct>=0?MINT:CORAL,marginTop:1}}>{pct>=0?`▲ +${pct.toFixed(0)}%`:`▼ ${pct.toFixed(0)}%`}</div>}
                        {pi>0&&val>0&&pct===null&&<div style={{fontSize:10,color:MUTED,marginTop:1}}>nuevo</div>}
                      </td>
                    )})}
                    <td style={{padding:"8px",textAlign:"right",color:activeDim?.color||CYAN,fontWeight:800}}>{metric==="pesos"?fmtM(tot):fmtU(tot)}</td>
                  </tr>
                )
              })}
              <tr style={{borderTop:`2px solid ${BORDER}`,background:CARD2}}>
                <td style={{padding:"8px 10px",color:TEXT,fontWeight:700,fontSize:12}}>TOTAL</td>
                {periodTotals.map((pt,i)=>{const prev=i>0?periodTotals[i-1].val:null,pct=prev&&prev>0?((pt.val-prev)/prev)*100:null;return(
                  <td key={pt.p} style={{padding:"8px",textAlign:"right",verticalAlign:"top"}}>
                    <div style={{color:TEXT,fontWeight:800}}>{metric==="pesos"?fmtM(pt.val):fmtU(pt.val)}</div>
                    {pct!==null&&<div style={{fontSize:10,color:pct>=0?MINT:CORAL,marginTop:1}}>{pct>=0?`▲ +${pct.toFixed(0)}%`:`▼ ${pct.toFixed(0)}%`}</div>}
                  </td>
                )})}
                <td style={{padding:"8px",textAlign:"right",color:TEXT,fontWeight:800}}>{metric==="pesos"?fmtM(periodTotals.reduce((s,x)=>s+x.val,0)):fmtU(periodTotals.reduce((s,x)=>s+x.val,0))}</td>
              </tr>
            </tbody>
          </table>
          {entities.length>20&&<div style={{fontSize:11,color:MUTED,marginTop:8}}>Mostrando top 20 de {entities.length}</div>}
        </div>
      )}
    </div>
  )
}

/* ─── MAIN APP ───────────────────────────────────────────────────────────────── */
export default function App(){
  const[cube,setCube]=useState(null)
  const[articulos,setArticulos]=useState(null)
  const[meta,setMeta]=useState(null)
  const[storageInfo,setStorageInfo]=useState(null)
  const[rawHeaders,setRawHeaders]=useState(null)
  const[rawRows,setRawRows]=useState(null)
  const[pendingImport,setPendingImport]=useState(null)
  const[saveStage,setSaveStage]=useState("idle")
  const[saveProgress,setSaveProgress]=useState(0)
  const[saveMsg,setSaveMsg]=useState("")
  const[activeTab,setActiveTab]=useState("resumen")
  const[fileKey,setFileKey]=useState(0)
  const fileRef=useRef()
  const[fYear,setFYear]=useState("__ALL__")
  const[fMes,setFMes]=useState("__ALL__")
  const[fProv,setFProv]=useState("__ALL__")
  const[fRubro,setFRubro]=useState("__ALL__")
  const[fVend,setFVend]=useState("__ALL__")
  const[fRentab,setFRentab]=useState("__ALL__")
  const[fPcia,setFPcia]=useState("__ALL__")
  const[fCliente,setFCliente]=useState("__ALL__")
  const[fEmpresa,setFEmpresa]=useState("__ALL__")
  const[fZona,setFZona]=useState("__ALL__")
  const[fLocalidad,setFLocalidad]=useState("__ALL__")

  useEffect(()=>{
    const t0=Date.now()
    loadData().then(({cube:c,articulos:a,meta:m,error})=>{
      setCube(c||[]);setArticulos(a||[]);setMeta(m||{})
      setStorageInfo(error?{ok:false,error}:{ok:true,loaded:c!==null,rows:m?.totalRows||0,cells:c?.length||0,arts:a?.length||0,ms:Date.now()-t0})
    })
  },[])

  const records=cube||[]

  const handleFile=useCallback(e=>{
    const file=e.target.files?.[0];if(!file) return
    const reader=new FileReader()
    reader.onload=ev=>{
      const wb=XLSX.read(ev.target.result,{type:"array"})
      const ws=wb.Sheets[wb.SheetNames[0]]
      const json=XLSX.utils.sheet_to_json(ws,{header:1,defval:""})
      setRawHeaders(json[0]?.map(s => String(s).trim()) ?? [])
      setRawRows(json.slice(1).filter(r=>r.some(c=>c!=="")))
    }
    reader.readAsArrayBuffer(file);setFileKey(k=>k+1)
  },[])

  const handleMappingConfirm=useCallback((mapping,pet=true)=>{
    const hi={}
    Object.entries(mapping).forEach(([k,col])=>{if(col) hi[k]=rawHeaders.indexOf(col)})
    const has=k=>hi[k]!==undefined
    const toN=v=>{
      if(v==null||v==="") return 0
      if(typeof v==="number") return v
      let s=String(v).trim().replace(/[$\s]/g,"")
      const lc=s.lastIndexOf(","),ld=s.lastIndexOf(".")
      if(lc>ld) s=s.replace(/\./g,"").replace(",",".")
      else if(ld>lc) s=s.replace(/,/g,"")
      else s=s.replace(/,/g,"")
      return parseFloat(s)||0
    }
    const get=(row,k)=>has(k)?row[hi[k]]:undefined
    const newMeta={
      hasProveedor:has("proveedor"),hasRubro:has("rubro"),hasArticulo:has("articulo"),
      hasVendedor:has("vendedor"),hasCantidad:has("cantidad"),hasProvincia:has("provincia"),
      hasRentabilidad:has("rentabilidad"),hasCosto:has("costo"),
      hasCliente:has("cliente"),hasEmpresa:has("empresa"),
      hasLocalidad:has("localidad"),hasZona:has("zona"),
      precioEsTotal:pet,mappedCols:mapping
    }
    const parsed=rawRows.map(row=>{
      const dt=parseDate(get(row,"fecha"))
      const rp=toN(get(row,"precio")),rc=has("costo")?toN(get(row,"costo")):0,rq=has("cantidad")?toN(get(row,"cantidad")):1
      const precio=pet?rp:rp*(rq||1),costo=pet?rc:rc*(rq||1),cantidad=rq||1
      let rentabilidad=null
      if(has("rentabilidad")){
        const rv=String(get(row,"rentabilidad")??"").trim()
        const rn=rv.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
        rentabilidad=rn==="alta"?"Alta":rn==="media"?"Media":rn==="baja"?"Baja":(rv||"Sin dato")
      }
      return{
        y:dt?.y??0,m:dt?.m??0,precio,costo,cantidad,rentabilidad,
        proveedor: has("proveedor")?(String(get(row,"proveedor")??"").trim()||"Sin proveedor"):null,
        rubro:     has("rubro")    ?(String(get(row,"rubro")    ??"").trim()||"Sin rubro")    :null,
        articulo:  has("articulo") ?(String(get(row,"articulo") ??"").trim()||"Sin artículo") :null,
        vendedor:  has("vendedor") ?(String(get(row,"vendedor") ??"").trim()||"Sin vendedor") :null,
        provincia: has("provincia")?(String(get(row,"provincia")??"").trim()||"Sin provincia"):null,
        cliente:   has("cliente")  ?(String(get(row,"cliente")  ??"").trim()||"Sin cliente")  :null,
        empresa:   has("empresa")  ?(String(get(row,"empresa")  ??"").trim()||"Sin empresa")  :null,
        localidad: has("localidad")?(String(get(row,"localidad")??"").trim()||"Sin localidad"):null,
        zona:      has("zona")     ?(String(get(row,"zona")     ??"").trim()||"Sin zona")     :null,
      }
    }).filter(r=>r.y>0||r.precio>0)
    const{cube:nc,articulos:na}=buildCube(parsed)
    const mc=mergeCubes(records,nc),ma=mergeArts(articulos||[],na)
    const cubeKB=Math.round(JSON.stringify(compressCube(mc)).length/1024)
    const ventas=parsed.reduce((s,r)=>s+r.precio,0)
    const unidades=parsed.reduce((s,r)=>s+r.cantidad,0)
    const periods=[...new Set(parsed.map(r=>toPeriod(r.y,r.m)).filter(v=>v>0))].sort((a,b)=>a-b)
    setRawHeaders(null);setRawRows(null)
    setPendingImport({newCube:nc,newArts:na,meta:newMeta,stats:{rows:parsed.length,ventas,unidades,hasCantidad:has("cantidad"),periods,existingRows:meta?.totalRows||0,cubeKB}})
  },[rawHeaders,rawRows,records,articulos,meta])

  const handleImportConfirm=useCallback(async()=>{
    if(!pendingImport) return
    setPendingImport(null);setActiveTab("resumen")
    setSaveStage("merging");setSaveProgress(15)
    await new Promise(r=>setTimeout(r,0))
    const mc=mergeCubes(records,pendingImport.newCube)
    const ma=mergeArts(articulos||[],pendingImport.newArts)
    const nm={...pendingImport.meta,totalRows:(meta?.totalRows||0)+pendingImport.stats.rows}
    setSaveStage("compressing");setSaveProgress(40)
    await new Promise(r=>setTimeout(r,0))
    setCube(mc);setArticulos(ma);setMeta(nm)
    setSaveStage("saving");setSaveProgress(70)
    await new Promise(r=>setTimeout(r,0))
    try{
      const kb=await saveData(mc,ma,nm)
      setSaveStage("saved");setSaveProgress(100);setSaveMsg(`Guardado en Supabase · ${fmtN(kb)} KB`)
      setTimeout(()=>{setSaveStage("idle");setSaveProgress(0);setSaveMsg("")},5000)
    }catch(e){setSaveStage("error");setSaveProgress(0);setSaveMsg(`Error: ${String(e)}`)}
  },[pendingImport,records,articulos,meta])

  const handleClear=async()=>{
    if(!confirm("¿Eliminar todos los datos?")) return
    await clearData();setCube([]);setArticulos([]);setMeta({})
  }

  if(cube===null) return(
    <div style={{background:BG,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:MUTED,fontFamily:"system-ui"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:40,marginBottom:12,fontWeight:900,color:CYAN,letterSpacing:-1}}>DashFact</div><div style={{fontSize:14,color:MUTED}}>Cargando datos…</div></div>
    </div>
  )

  const yearsDisp=[...new Set(records.map(r=>r.y).filter(v=>v>0))].sort((a,b)=>a-b)
  const mesesDisp=[...new Set(records.filter(r=>fYear==="__ALL__"||r.y===parseInt(fYear)).map(r=>r.m).filter(v=>v!==undefined))].sort((a,b)=>a-b)
  const uniq=key=>[...new Set(records.map(r=>r[key]).filter(Boolean))].sort()

  const filtered=records.filter(r=>{
    if(fYear!=="__ALL__"   &&r.y            !==parseInt(fYear)) return false
    if(fMes!=="__ALL__"    &&r.m            !==parseInt(fMes))  return false
    if(fProv!=="__ALL__"   &&r.proveedor    !==fProv)           return false
    if(fRubro!=="__ALL__"  &&r.rubro        !==fRubro)          return false
    if(fVend!=="__ALL__"   &&r.vendedor     !==fVend)           return false
    if(fRentab!=="__ALL__" &&r.rentabilidad !==fRentab)         return false
    if(fPcia!=="__ALL__"   &&r.provincia    !==fPcia)           return false
    if(fCliente!=="__ALL__"&&r.cliente      !==fCliente)        return false
    if(fEmpresa!=="__ALL__"&&r.empresa      !==fEmpresa)        return false
    if(fZona!=="__ALL__"   &&r.zona         !==fZona)           return false
    if(fLocalidad!=="__ALL__"&&r.localidad  !==fLocalidad)      return false
    return true
  })

  const filteredRows=filtered.reduce((s,r)=>s+(r.rows||1),0)
  const totalRows=meta?.totalRows||records.reduce((s,r)=>s+(r.rows||1),0)

  function groupBy(arr,key){
    const map={}
    arr.forEach(r=>{
      const k=r[key]||"Sin dato"
      if(!map[k]) map[k]={name:k,ventas:0,costo:0,cantidad:0,rows:0,rentabilidad:r.rentabilidad}
      map[k].ventas+=r.precio;map[k].costo+=r.costo;map[k].cantidad+=r.cantidad;map[k].rows+=(r.rows||1)
    })
    return Object.values(map).sort((a,b)=>b.ventas-a.ventas)
  }

  const totalVentas=filtered.reduce((s,r)=>s+r.precio,0)
  const totalUnidades=filtered.reduce((s,r)=>s+r.cantidad,0)
  const provData=meta?.hasProveedor?groupBy(filtered,"proveedor"):[]
  const rubroData=meta?.hasRubro?groupBy(filtered,"rubro"):[]
  const vendData=meta?.hasVendedor?groupBy(filtered,"vendedor"):[]
  const rentData=meta?.hasRentabilidad?groupBy(filtered,"rentabilidad"):[]
  const pciaData=meta?.hasProvincia?groupBy(filtered,"provincia"):[]
  const zonaData=meta?.hasZona?groupBy(filtered,"zona"):[]
  const cliData=meta?.hasCliente?groupBy(filtered,"cliente"):[]
  const artData=meta?.hasArticulo?[...(articulos||[])].sort((a,b)=>b.precio-a.precio):[]
  const topProv=provData[0],topVend=vendData[0],topPcia=pciaData[0],topCli=cliData[0]
  const hasData=records.length>0

  const tabs=[
    {key:"resumen",label:"Resumen"},
    ...(meta?.hasCliente?    [{key:"clientes",     label:"🏢 Clientes"}]    :[]),
    ...(meta?.hasProveedor?  [{key:"proveedores",  label:"Proveedores"}]    :[]),
    ...(meta?.hasRubro?      [{key:"rubros",       label:"Rubros"}]         :[]),
    ...(meta?.hasVendedor?   [{key:"vendedores",   label:"Vendedores"}]     :[]),
    ...((meta?.hasProveedor||meta?.hasRubro||meta?.hasVendedor||meta?.hasCliente)?[{key:"evolucion",label:"📅 Mes a Mes"}]:[]),
    ...(meta?.hasArticulo?   [{key:"articulos",    label:"Artículos"}]      :[]),
    ...(meta?.hasRentabilidad?[{key:"rentabilidad",label:"Rentabilidad"}]   :[]),
    ...(meta?.hasZona?       [{key:"zonas",        label:"Zonas"}]          :[]),
    ...(meta?.hasProvincia?  [{key:"provincias",   label:"Provincias"}]     :[]),
  ]
  const safeTab=tabs.find(t=>t.key===activeTab)?activeTab:"resumen"

  return(
    <div style={{background:BG,minHeight:"100vh",color:TEXT,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{background:CARD,borderBottom:`1px solid ${BORDER}`,padding:"10px 16px"}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginRight:8}}>
            <span style={{fontSize:18,fontWeight:900,color:CYAN,letterSpacing:-0.5}}>DashFact</span>
          </div>
          {yearsDisp.length>1&&<Dropdown label="AÑO" value={fYear} options={yearsDisp.map(y=>({val:String(y),label:String(y)}))} onChange={v=>{setFYear(v);setFMes("__ALL__")}}/>}
          <Dropdown label="MES" value={fMes} options={mesesDisp.map(m=>({val:String(m),label:MESES[m]??`Mes ${m}`}))} onChange={setFMes}/>
          {meta?.hasEmpresa&&    <Dropdown label="EMPRESA"      value={fEmpresa}   options={uniq("empresa")}      onChange={setFEmpresa}/>}
          {meta?.hasCliente&&    <Dropdown label="CLIENTE"      value={fCliente}   options={uniq("cliente")}      onChange={setFCliente}/>}
          {meta?.hasProveedor&&  <Dropdown label="PROVEEDOR"    value={fProv}      options={uniq("proveedor")}    onChange={setFProv}/>}
          {meta?.hasRubro&&      <Dropdown label="RUBRO"        value={fRubro}     options={uniq("rubro")}        onChange={setFRubro}/>}
          {meta?.hasVendedor&&   <Dropdown label="VENDEDOR"     value={fVend}      options={uniq("vendedor")}     onChange={setFVend}/>}
          {meta?.hasRentabilidad&&<Dropdown label="RENTABILIDAD" value={fRentab}   options={["Alta","Media","Baja"]} onChange={setFRentab}/>}
          {meta?.hasZona&&       <Dropdown label="ZONA"         value={fZona}      options={uniq("zona")}         onChange={setFZona}/>}
          {meta?.hasProvincia&&  <Dropdown label="PROVINCIA"    value={fPcia}      options={uniq("provincia")}    onChange={setFPcia}/>}
          <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
            <SaveBar stage={saveStage} progress={saveProgress} msg={saveMsg}/>
            {hasData&&<button onClick={handleClear} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${BORDER}`,borderRadius:6,color:MUTED,cursor:"pointer",fontSize:11}}>Limpiar</button>}
            <button onClick={()=>fileRef.current?.click()} style={{padding:"6px 14px",background:CYAN,border:"none",borderRadius:6,color:"#000",cursor:"pointer",fontWeight:700,fontSize:12}}>↑ Importar Excel</button>
            <input key={fileKey} ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{display:"none"}}/>
          </div>
        </div>
        {storageInfo&&(
          <div style={{marginTop:5,fontSize:10,color:!storageInfo.ok?CORAL:storageInfo.loaded&&storageInfo.rows>0?MINT:MUTED}}>
            {!storageInfo.ok?`⚠️ Error Supabase: ${storageInfo.error}`:storageInfo.loaded&&storageInfo.rows>0?`✓ ${fmtN(storageInfo.rows)} filas · ${storageInfo.cells} celdas · ${storageInfo.arts} artículos · ${storageInfo.ms}ms`:"ℹ️ Supabase conectado · sin datos previos"}
          </div>
        )}
        {hasData&&(
          <div style={{textAlign:"right",fontSize:11,color:MUTED,marginTop:4}}>
            {fmtN(filteredRows)} / {fmtN(totalRows)} filas
            {fYear!=="__ALL__"&&<span style={{color:CYAN,marginLeft:8}}>· Año {fYear}</span>}
            {fMes!=="__ALL__"&&<span style={{color:CYAN,marginLeft:4}}>· {MESES[parseInt(fMes)]}</span>}
            {fCliente!=="__ALL__"&&<span style={{color:TEAL,marginLeft:4}}>· {fCliente}</span>}
          </div>
        )}
      </div>

      {rawHeaders&&<MappingModal headers={rawHeaders} onConfirm={handleMappingConfirm} onCancel={()=>{setRawHeaders(null);setRawRows(null)}}/>}
      {pendingImport&&<ConfirmImportModal stats={pendingImport.stats} onConfirm={handleImportConfirm} onCancel={()=>setPendingImport(null)}/>}

      {!hasData?(
        <div style={{textAlign:"center",padding:"100px 20px"}}>
          <div style={{fontSize:48,marginBottom:12,fontWeight:900,color:CYAN,letterSpacing:-2}}>DashFact</div>
          <div style={{fontSize:16,fontWeight:700,color:TEXT,marginBottom:8}}>Sin datos cargados</div>
          <div style={{fontSize:13,color:MUTED,lineHeight:1.9}}>
            Importá un Excel con columnas: FECHA, VENTA, CLIENTE, ARTICULO, CANTIDAD, RUBRO, PROVEEDOR, EMPRESA, RENTABILIDAD, VENDEDOR, PROVINCIA.<br/>
            Los datos se guardan en Supabase y quedan disponibles para todos.
          </div>
          <button onClick={()=>fileRef.current?.click()} style={{marginTop:24,padding:"10px 28px",background:CYAN,border:"none",borderRadius:8,color:"#000",cursor:"pointer",fontWeight:700,fontSize:14}}>↑ Importar Excel</button>
          <input key={fileKey} ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{display:"none"}}/>
        </div>
      ):(
        <>
          <div style={{background:CARD,borderBottom:`1px solid ${BORDER}`,padding:"0 16px",display:"flex",gap:0,overflowX:"auto"}}>
            {tabs.map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                style={{padding:"12px 18px",background:"transparent",border:"none",borderBottom:`2px solid ${safeTab===t.key?CYAN:"transparent"}`,color:safeTab===t.key?CYAN:MUTED,cursor:"pointer",fontSize:13,fontWeight:safeTab===t.key?600:400,whiteSpace:"nowrap"}}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{padding:"16px"}}>
            {safeTab==="resumen"&&(
              <>
                <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                  <KpiCard icon="🗂️" label="Registros"     value={fmtN(filteredRows)}   sub="filas"                accent={CYAN}/>
                  <KpiCard icon="💰" label="Total Ventas"   value={fmtM(totalVentas)}    sub="en pesos"             accent={ORANGE}/>
                  {meta?.hasCantidad&&<KpiCard icon="📦" label="Unidades"      value={fmtU(totalUnidades)} sub="vendidas"             accent={MINT}/>}
                  {topCli&&           <KpiCard icon="🏢" label="Top Cliente"   value={topCli.name}         sub={fmtM(topCli.ventas)}  accent={TEAL}/>}
                  {topProv&&          <KpiCard icon="🏆" label="Top Proveedor" value={topProv.name}         sub={fmtM(topProv.ventas)} accent={GOLD}/>}
                  {topVend&&          <KpiCard icon="⭐" label="Top Vendedor"  value={topVend.name}         sub={fmtM(topVend.ventas)} accent={CORAL}/>}
                  {topPcia&&          <KpiCard icon="📍" label="Top Provincia" value={topPcia.name}         sub={fmtM(topPcia.ventas)} accent={BLUE}/>}
                </div>
                <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:2,color:MUTED,marginBottom:12}}>Comparativa general</div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
                  {cliData.length>0&&  <DualRanking title="Por Cliente"   data={cliData}   colorPesos={TEAL}   colorUnid={MINT}   totalVentas={totalVentas} totalUnidades={totalUnidades} hasCantidad={meta?.hasCantidad} compact/>}
                  {provData.length>0&& <DualRanking title="Por Proveedor" data={provData}  colorPesos={CYAN}   colorUnid={BLUE}   totalVentas={totalVentas} totalUnidades={totalUnidades} hasCantidad={meta?.hasCantidad} compact/>}
                </div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  {rubroData.length>0&&<DualRanking title="Por Rubro"     data={rubroData} colorPesos={CORAL}  colorUnid={ORANGE} totalVentas={totalVentas} totalUnidades={totalUnidades} hasCantidad={meta?.hasCantidad} compact/>}
                  {vendData.length>0&& <DualRanking title="Por Vendedor"  data={vendData}  colorPesos={PURPLE} colorUnid={GOLD}   totalVentas={totalVentas} totalUnidades={totalUnidades} hasCantidad={meta?.hasCantidad} compact/>}
                </div>
              </>
            )}
            {safeTab==="clientes"&&    <ClientesTab filteredRecords={filtered} meta={meta} totalVentas={totalVentas} totalUnidades={totalUnidades}/>}
            {safeTab==="proveedores"&& <DetailTab data={provData}  hasCantidad={meta?.hasCantidad} totalVentas={totalVentas} totalUnidades={totalUnidades} dimLabel="Proveedor"  colorPesos={CYAN}   colorUnid={MINT}/>}
            {safeTab==="rubros"&&      <DetailTab data={rubroData} hasCantidad={meta?.hasCantidad} totalVentas={totalVentas} totalUnidades={totalUnidades} dimLabel="Rubro"      colorPesos={CORAL}  colorUnid={ORANGE}/>}
            {safeTab==="vendedores"&&  <VendedoresTab filteredRecords={filtered} meta={meta} totalVentas={totalVentas} totalUnidades={totalUnidades}/>}
            {safeTab==="evolucion"&&   <EvolucionTab filteredRecords={filtered} meta={meta}/>}
            {safeTab==="articulos"&&   <ArticulosTable data={artData} hasCantidad={meta?.hasCantidad} hasRentabilidad={meta?.hasRentabilidad} totalVentas={totalVentas}/>}
            {safeTab==="rentabilidad"&&<RentabilidadSection data={rentData} artData={artData} hasCantidad={meta?.hasCantidad}/>}
            {safeTab==="zonas"&&       <DetailTab data={zonaData}  hasCantidad={meta?.hasCantidad} totalVentas={totalVentas} totalUnidades={totalUnidades} dimLabel="Zona"       colorPesos={VIOLET} colorUnid={PURPLE}/>}
            {safeTab==="provincias"&&  <DetailTab data={pciaData}  hasCantidad={meta?.hasCantidad} totalVentas={totalVentas} totalUnidades={totalUnidades} dimLabel="Provincia"  colorPesos={BLUE}   colorUnid={VIOLET}/>}
          </div>
        </>
      )}
    </div>
  )
}
