import { useState, useEffect, useCallback, useRef } from "react"
import * as XLSX from "xlsx"
import { dbGet, dbSet, dbDelete } from "./lib/supabase.js"

const SK="cube",AK="arts",MK="meta"
const CAT_FIELDS=["proveedor","rubro","vendedor","rentabilidad","provincia","cliente","empresa","localidad","zona"]
const LOGO_SRC="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAEF0lEQVR4nO1WXWhcRRT+zrl/m8ZEGmpJk6a2IbFQQUIjSA0VimAj2FqDK0bBR31RRBDNJo3TpU3NFhR9sBCVFqxI01CQKhIf7EMREooiQoNik5jSNO0mWJq/3ezeO3N8uEtd0+puuuqL+eA+3JnhnO/75pzDAKtYxcpBue9/h1MWAGyojz23saHr+fy1UsDFHx0RpRT7gYlns4ESEQJGpFQCRULZAFDbGGtbt6lb1tXtl5rNHXvz9+4UxTpglFLsZ0y3GG0EYnxj3oIIATD/MgFlA3Hz8Wd6n4HXRDAM0Szwmmu2xPYAcVNKLRTjQKg+G3QCjlg2Prcs+hJwxTfSVWotFOhnZQPxoLY+1pYJ7NMEEW+NfoBhe+mUfCcguI7/5NRY75nQhWf0SgkUKiCjlOKjx9OdwBohLAxO/py4AADrN3ecFbNml+9nY0Q4IzJCtxbk/QIMANiWc+iA5DTfdOxvHAjVV9fH2oLAPg0JjOfpliujR4YBodr6jl2ZwP2G4MBxUs9OjfX2r1R9IQKsFHD0ePq8oGI708JX05cSewDlAPEsAKzf9OYxtiq2M6eGAfpEB3IfM9UITCVDiC1OQfCb7fK0Y1vXIp6V3FClZ3bswI14PG6Av7yCUH3fiVibwGsmLCESsQ8DECCe3fpwomIxOdcSaIiRRVdn5TFifhQwSRH6AYwLwjQuLEmb3DkjfoYylq/LtclkkC3CgXz1lc3M8yenJxLttY3dDwW+eUEbaWcuX2v0wg3LorPMVkqMP3ttovflf+AK8u/eOS0SLLquxHSAnSJulNgDzMKP7PC7TY2z/T9N3rVlcZZGQC5bdvqJ5Hjka+C6BVT5Ybz48hb90//tCLBSwAfH0t8DXpMgkybAI17LkPmLjkPdV8d7+kX+OH9PXfoLocpWyPzQzOXEToKicEAVxrJBFE69vhPpfaBIk5iMD7HKQB4zLbx3d7Xz4NRYT78IKOz78Lzj8iFICiC3ZWN9Z+tKpuPySWgAxYFP3SLagNgm5pRrB+3JiZ7XRs/H53K9LuHQiQdA1Joa6x1i0oOAC1/rrpBgcdMxj0CopnrL0lMgt0lEE7M1VxbB7qnxt0/mElOY9FaUOe4hSNoYcVvqtnbtLtaFfAeMUoqNYL8Y0Uzke16w9/IvPd8CLzq5xLdRNaCBqHVp7OAQkx4keJJZ8mPhXmEXOF/9R59mnxZT1sSWa9m26Zy8mDgH9DnAh36hQADguNZBkTQJIo9U3/vG48W4wAAIOKBbW9/3tMbrIEpanDqS/DXxTkjspSKSD2hA8ZXRw8NEwSmQsxgIvRqNRq1CLtxsw23blDtPQZ1Xbs+ExbZiEAA0NLzi3shWVBmT5uuTlVeLbcdliJb82LxDKAak1Dc/hTFKjrOK/wa/A3rQ7dfNECyuAAAAAElFTkSuQmCC"

const BG="#f5f6fa",CARD="#ffffff",CARD2="#f0f2f5",BORDER="#e0e3ea",TEXT="#1a2332",MUTED="#8a97a8"
const BRAND="#1a237e",BRAND_DARK="#0d1660",BRAND_LIGHT="#eef0fa"
const ACCENT1="#1565c0",ACCENT2="#00897b",ACCENT3="#6a1b9a",ACCENT4="#b8721a",ACCENT5="#c62828",ACCENT6="#1a6b7a",ACCENT7="#4a148c",ACCENT8="#2e7d32"
const RENT_COLOR={Alta:"#2e7d32",Media:"#b8721a",Baja:"#c62828","Sin dato":"#8a97a8"}
const RENT_BG={Alta:"#e8f5e9",Media:"#fff3e0",Baja:"#ffebee","Sin dato":"#f5f6fa"}
const VENDOR_COLORS=[BRAND,ACCENT1,ACCENT2,ACCENT3,ACCENT4,ACCENT5,ACCENT6,ACCENT7,ACCENT8,"#1a237e","#006064","#4e342e"]
const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function compressCube(cube){
  const tables={};const CAT=["proveedor","rubro","vendedor","rentabilidad","provincia","cliente","empresa","localidad","zona"]
  CAT.forEach(f=>{tables[f]=[...new Set(cube.map(r=>r[f]).filter(v=>v!=null))]})
  const ix={};CAT.forEach(f=>{ix[f]=Object.fromEntries(tables[f].map((v,i)=>[v,i]))})
  const rows=cube.map(r=>[r.y,r.m,Math.round(r.precio),r.cantidad,Math.round(r.costo),r.rows,
    r.proveedor!=null?(ix.proveedor[r.proveedor]??-1):-1,r.rubro!=null?(ix.rubro[r.rubro]??-1):-1,
    r.vendedor!=null?(ix.vendedor[r.vendedor]??-1):-1,r.rentabilidad!=null?(ix.rentabilidad[r.rentabilidad]??-1):-1,
    r.provincia!=null?(ix.provincia[r.provincia]??-1):-1,r.cliente!=null?(ix.cliente[r.cliente]??-1):-1,
    r.empresa!=null?(ix.empresa[r.empresa]??-1):-1,r.localidad!=null?(ix.localidad[r.localidad]??-1):-1,
    r.zona!=null?(ix.zona[r.zona]??-1):-1])
  return{tables,rows}
}
function decompressCube({tables,rows}){
  return rows.map(r=>({y:r[0],m:r[1],precio:r[2],cantidad:r[3],costo:r[4],rows:r[5],
    proveedor:r[6]>=0?tables.proveedor[r[6]]:null,rubro:r[7]>=0?tables.rubro[r[7]]:null,
    vendedor:r[8]>=0?tables.vendedor[r[8]]:null,rentabilidad:r[9]>=0?tables.rentabilidad[r[9]]:null,
    provincia:r[10]>=0?tables.provincia[r[10]]:null,cliente:r[11]>=0?tables.cliente[r[11]]:null,
    empresa:r[12]>=0?tables.empresa[r[12]]:null,localidad:r[13]>=0?tables.localidad[r[13]]:null,
    zona:r[14]>=0?tables.zona[r[14]]:null}))
}
function compressArts(arts){return arts.map(a=>[a.name,Math.round(a.precio),a.cantidad,Math.round(a.costo),a.rows,a.rentabilidad??null])}
function decompressArts(rows){return rows.map(r=>({name:r[0],precio:r[1],cantidad:r[2],costo:r[3],rows:r[4],rentabilidad:r[5]}))}

function buildCube(rawRecords){
  const cm={},am={}
  for(const r of rawRecords){
    const ck=`${r.y}|${r.m}|${r.proveedor??''} |${r.rubro??''} |${r.vendedor??''} |${r.rentabilidad??''} |${r.provincia??''} |${r.cliente??''} |${r.empresa??''} |${r.localidad??''} |${r.zona??''} `
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
    const k=`${r.y}|${r.m}|${r.proveedor??''} |${r.rubro??''} |${r.vendedor??''} |${r.rentabilidad??''} |${r.provincia??''} |${r.cliente??''} |${r.empresa??''} |${r.localidad??''} |${r.zona??''} `
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
  try{const[cv,av,mv]=await Promise.all([dbGet(SK),dbGet(AK),dbGet(MK)]);return{cube:cv?decompressCube(JSON.parse(cv.value??cv)):null,articulos:av?decompressArts(JSON.parse(av.value??av)):null,meta:mv?JSON.parse(mv.value??mv):null}}
  catch(e){return{cube:null,articulos:null,meta:null,error:String(e)}}
}
async function saveData(cube,arts,meta){
  const cs=JSON.stringify(compressCube(cube)),as=JSON.stringify(compressArts(arts)),ms=JSON.stringify(meta)
  const kb=Math.round((cs.length+as.length+ms.length)/1024)
  await Promise.all([dbSet(SK,cs),dbSet(AK,as),dbSet(MK,ms)])
  return kb
}
async function clearData(){await Promise.all([dbDelete(SK),dbDelete(AK),dbDelete(MK)])}

const CAMPOS=[
  {key:"fecha",req:true,syn:["fecha","date","dia","día"]},
  {key:"precio",req:true,syn:["venta","precio","price","importe","total","monto","pvta","pventa","ingreso","venta neta"]},
  {key:"cantidad",req:false,syn:["cantidad","qty","cant","unidades","q","unid"]},
  {key:"costo",req:false,syn:["costo","cost","cto","pcosto"]},
  {key:"cliente",req:false,syn:["cliente","client","cte"]},
  {key:"empresa",req:false,syn:["empresa","company","dempresa"]},
  {key:"proveedor",req:false,syn:["proveedor","supplier","supp","prov","dgrupo"]},
  {key:"rubro",req:false,syn:["rubro","drubro","categoria","categoría","cat","linea","grupo"]},
  {key:"articulo",req:false,syn:["articulo","artículo","producto","item","descripcion","art"]},
  {key:"vendedor",req:false,syn:["vendedor","seller","vend","comercial"]},
  {key:"rentabilidad",req:false,syn:["rentabilidad","rent","rentab","nivel","tier","tipo rentabilidad","tiporentabilidad"]},
  {key:"provincia",req:false,syn:["provincia","region","región"]},
  {key:"localidad",req:false,syn:["localidad","ciudad"]},
  {key:"zona",req:false,syn:["zona","sucursal","canal","area","área"]},
]
const CAMPO_LABELS={fecha:"Fecha",precio:"Venta",cantidad:"Cantidad",costo:"Costo",cliente:"Cliente",empresa:"Empresa",proveedor:"Proveedor",rubro:"Rubro",articulo:"Artículo",vendedor:"Vendedor",rentabilidad:"Rentabilidad",provincia:"Provincia",localidad:"Localidad",zona:"Zona"}
function autoMap(headers){
  const map={};const norm=s=>s?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim()
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
function fmtM(n){if(n==null)return"$0";const a=Math.abs(n);if(a>=1e9)return`$${(n/1e9).toFixed(1)}B`;if(a>=1e6)return`$${(n/1e6).toFixed(1)}M`;if(a>=1e3)return`$${new Intl.NumberFormat("es-AR").format(Math.round(n/1e3))}K`;return`$${Math.round(n)}`}
function fmtU(n){if(n==null)return"0";if(Math.abs(n)>=1e3)return`${new Intl.NumberFormat("es-AR").format(Math.round(n/1e3))}K`;return new Intl.NumberFormat("es-AR").format(Math.round(n))}
const fmtN=n=>new Intl.NumberFormat("es-AR").format(n??0)
const fmtPct=n=>`${(n??0).toFixed(1)}%`
const toPeriod=(y,m)=>y*100+m
const periodLabel=(p,short=false)=>{const y=Math.floor(p/100),m=p%100;return short?`${MESES[m]?.slice(0,3)} ${y}`:`${MESES[m]} ${y}`}

function RentBadge({nivel}){const n=nivel||"Sin dato";return<span style={{color:RENT_COLOR[n],fontSize:10,padding:"2px 8px",background:RENT_BG[n],borderRadius:20,whiteSpace:"nowrap",fontWeight:500}}>{n}</span>}
function KpiCard({label,value,sub,accent}){return(
  <div style={{flex:1,minWidth:140,background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:"14px 16px",borderLeft:`3px solid ${accent}`}}>
    <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:MUTED,marginBottom:3}}>{label}</div>
    <div style={{fontSize:19,fontWeight:500,color:TEXT,lineHeight:1.1,wordBreak:"break-word"}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:accent,fontWeight:500,marginTop:4}}>{sub}</div>}
  </div>
)}
function Dropdown({label,value,options,onChange}){
  const norm=options.map(o=>typeof o==="string"?{val:o,label:o}:o)
  return(
    <div style={{display:"flex",flexDirection:"column",gap:2,minWidth:90}}>
      <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:"rgba(255,255,255,0.45)"}}>{label}</span>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,color:"#fff",padding:"4px 8px",fontSize:11,outline:"none",cursor:"pointer"}}>
        <option value="__ALL__">Todos</option>
        {norm.map(o=><option key={o.val} value={o.val} style={{background:BRAND,color:"#fff"}}>{o.label}</option>)}
      </select>
    </div>
  )
}
function MetricToggle({value,onChange}){return(
  <div style={{display:"flex",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,padding:2,gap:2}}>
    {["pesos","unidades"].map(v=>(
      <button key={v} onClick={()=>onChange(v)} style={{padding:"4px 12px",background:value===v?CARD:"transparent",border:`1px solid ${value===v?BORDER:"transparent"}`,borderRadius:6,color:value===v?TEXT:MUTED,cursor:"pointer",fontSize:11,fontWeight:value===v?500:400}}>
        {v==="pesos"?"$ Pesos":"Unidades"}
      </button>
    ))}
  </div>
)}
function SaveBar({stage,progress,msg}){
  if(stage==="idle") return null
  const label=stage==="merging"?"Fusionando...":stage==="compressing"?"Comprimiendo...":stage==="saving"?"Guardando...":stage==="saved"?`✓ ${msg}`:`Error: ${msg}`
  const color=stage==="error"?ACCENT5:stage==="saved"?ACCENT2:"rgba(255,255,255,0.5)"
  return(
    <div style={{display:"flex",flexDirection:"column",gap:3,minWidth:180}}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:10,color}}>{label.slice(0,45)}</span>
        {stage!=="error"&&stage!=="saved"&&<span style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{progress}%</span>}
      </div>
      {stage!=="error"&&<div style={{height:3,background:"rgba(255,255,255,0.15)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${progress}%`,background:stage==="saved"?ACCENT2:"rgba(255,255,255,0.7)",borderRadius:2,transition:"width 0.35s ease"}}/></div>}
    </div>
  )
}

function BarList({data,colorFn,totalVentas,totalUnidades,hasCantidad,limit=10}){
  const[metric,setMetric]=useState("pesos")
  const[expanded,setExpanded]=useState(false)
  const sorted=metric==="pesos"?[...data].sort((a,b)=>b.ventas-a.ventas):[...data].sort((a,b)=>b.cantidad-a.cantidad)
  const maxV=sorted[0]?.[metric==="pesos"?"ventas":"cantidad"]||1
  const total=metric==="pesos"?totalVentas:totalUnidades
  const color=typeof colorFn==="string"?colorFn:(colorFn?colorFn(metric):BRAND)
  const valFn=d=>metric==="pesos"?fmtM(d.ventas):fmtU(d.cantidad)
  const shown=expanded?sorted:sorted.slice(0,limit)
  return(
    <div>
      {hasCantidad&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}><MetricToggle value={metric} onChange={setMetric}/></div>}
      {shown.map((d,i)=>(
        <div key={d.name} style={{marginBottom:9}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <span style={{fontSize:11,color:MUTED,width:16,textAlign:"right",flexShrink:0}}>{i+1}.</span>
            <span style={{fontSize:12,color:TEXT,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.name}</span>
            <span style={{fontSize:12,fontWeight:500,color,whiteSpace:"nowrap"}}>{valFn(d)}</span>
            <span style={{fontSize:11,color:MUTED,width:38,textAlign:"right"}}>{fmtPct(total>0?(metric==="pesos"?d.ventas:d.cantidad)/total*100:0)}</span>
          </div>
          <div style={{height:3,background:CARD2,borderRadius:2,marginLeft:24}}>
            <div style={{height:"100%",width:`${(metric==="pesos"?d.ventas:d.cantidad)/maxV*100}%`,background:color,borderRadius:2,opacity:0.75}}/>
          </div>
        </div>
      ))}
      {!expanded&&data.length>limit&&<button onClick={()=>setExpanded(true)} style={{fontSize:11,color:BRAND,background:"none",border:"none",cursor:"pointer",marginTop:4,padding:0}}>+ Ver {data.length-limit} más</button>}
      {expanded&&<button onClick={()=>setExpanded(false)} style={{fontSize:11,color:MUTED,background:"none",border:"none",cursor:"pointer",marginTop:4,padding:0}}>Ver menos ▲</button>}
    </div>
  )
}

function ChartCard({title,count,children}){
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:"16px 18px",flex:1,minWidth:280}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:MUTED}}>{title}</span>
        {count&&<span style={{fontSize:11,color:MUTED}}>{count} cat.</span>}
      </div>
      {children}
    </div>
  )
}

function DetailTab({data,hasCantidad,totalVentas,totalUnidades,dimLabel,color}){
  return(
    <ChartCard title={`Ranking por ${dimLabel}`} count={data.length}>
      <BarList data={data} colorFn={color} totalVentas={totalVentas} totalUnidades={totalUnidades} hasCantidad={hasCantidad} limit={15}/>
    </ChartCard>
  )
}

function ArticulosTable({data,hasCantidad,hasRentabilidad,totalVentas}){
  const[metric,setMetric]=useState("pesos")
  const[expanded,setExpanded]=useState(false)
  const sorted=metric==="pesos"?[...data].sort((a,b)=>b.precio-a.precio):[...data].sort((a,b)=>b.cantidad-a.cantidad)
  const shown=expanded?sorted:sorted.slice(0,10)
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div><span style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:MUTED}}>Por Artículo</span><span style={{fontSize:11,color:MUTED,marginLeft:8}}>{data.length} artículos</span></div>
        {hasCantidad&&<MetricToggle value={metric} onChange={setMetric}/>}
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["#","Artículo","$ Ventas",...(hasCantidad?["Unidades"]:[]),...(hasRentabilidad?["Rentabilidad"]:[]),"Part. %"].map(h=>(
            <th key={h} style={{padding:"6px 8px",textAlign:h==="Artículo"?"left":"right",color:MUTED,fontSize:9,textTransform:"uppercase",letterSpacing:1,borderBottom:`1px solid ${BORDER}`,whiteSpace:"nowrap"}}>{h}</th>
          ))}</tr></thead>
          <tbody>{shown.map((d,i)=>(
            <tr key={d.name} onMouseEnter={e=>e.currentTarget.style.background=CARD2} onMouseLeave={e=>e.currentTarget.style.background="transparent"} style={{borderBottom:`1px solid ${BORDER}`}}>
              <td style={{padding:"7px 8px",color:MUTED,fontSize:11,textAlign:"right",width:24}}>{i+1}</td>
              <td style={{padding:"7px 8px",color:TEXT,maxWidth:200,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.name}</td>
              <td style={{padding:"7px 8px",color:BRAND,textAlign:"right",fontWeight:500}}>{fmtM(d.precio)}</td>
              {hasCantidad&&<td style={{padding:"7px 8px",color:ACCENT2,textAlign:"right",fontWeight:500}}>{fmtU(d.cantidad)}</td>}
              {hasRentabilidad&&<td style={{padding:"7px 8px",textAlign:"right"}}><RentBadge nivel={d.rentabilidad||"Sin dato"}/></td>}
              <td style={{padding:"7px 8px",color:MUTED,textAlign:"right"}}>{fmtPct(totalVentas>0?d.precio/totalVentas*100:0)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {!expanded&&data.length>10&&<button onClick={()=>setExpanded(true)} style={{fontSize:11,color:BRAND,background:"none",border:"none",cursor:"pointer",marginTop:8,padding:0}}>+ Ver {data.length-10} más</button>}
      {expanded&&<button onClick={()=>setExpanded(false)} style={{fontSize:11,color:MUTED,background:"none",border:"none",cursor:"pointer",marginTop:8,padding:0}}>Ver menos ▲</button>}
    </div>
  )
}

function RentabilidadSection({data,artData,hasCantidad}){
  const total=data.reduce((s,r)=>s+r.ventas,0)||1
  return(
    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      {["Alta","Media","Baja"].map(n=>{
        const d=data.find(x=>x.name===n)
        return(
          <div key={n} style={{flex:1,minWidth:150,background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:"14px 16px",borderLeft:`3px solid ${RENT_COLOR[n]}`}}>
            <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.2,color:MUTED,marginBottom:6}}>Rent. {n}</div>
            <div style={{fontSize:22,fontWeight:500,color:RENT_COLOR[n]}}>{d?fmtM(d.ventas):"$0"}</div>
            <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
              {hasCantidad&&d&&<div><div style={{fontSize:9,color:MUTED}}>Unidades</div><div style={{fontSize:13,fontWeight:500,color:ACCENT2}}>{fmtU(d.cantidad)}</div></div>}
              <div><div style={{fontSize:9,color:MUTED}}>Participación</div><div style={{fontSize:13,fontWeight:500,color:TEXT}}>{d?fmtPct(d.ventas/total*100):"0%"}</div></div>
              <div><div style={{fontSize:9,color:MUTED}}>Artículos</div><div style={{fontSize:13,fontWeight:500,color:TEXT}}>{artData.filter(a=>a.rentabilidad===n).length}</div></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VendedoresTab({filteredRecords,meta,totalVentas,totalUnidades}){
  const[sel,setSel]=useState(null)
  const vendMap={}
  filteredRecords.forEach(r=>{
    const k=r.vendedor||"Sin vendedor"
    if(!vendMap[k]) vendMap[k]={name:k,ventas:0,cantidad:0,rows:0,proveedores:{},rubros:{},rentMix:{Alta:0,Media:0,Baja:0}}
    const v=vendMap[k];v.ventas+=r.precio;v.cantidad+=r.cantidad;v.rows+=(r.rows||1)
    if(r.proveedor) v.proveedores[r.proveedor]=(v.proveedores[r.proveedor]||0)+r.precio
    if(r.rubro) v.rubros[r.rubro]=(v.rubros[r.rubro]||0)+r.precio
    if(["Alta","Media","Baja"].includes(r.rentabilidad)) v.rentMix[r.rentabilidad]+=r.precio
  })
  const vl=Object.values(vendMap).sort((a,b)=>b.ventas-a.ventas)
  vl.forEach((v,i)=>v.color=VENDOR_COLORS[i%VENDOR_COLORS.length])
  const maxV=vl[0]?.ventas||1
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <KpiCard label="Vendedores" value={vl.length} sub="en el período" accent={ACCENT3}/>
        <KpiCard label="Total Ventas" value={fmtM(totalVentas)} sub="período" accent={BRAND}/>
        {meta?.hasCantidad&&<KpiCard label="Unidades" value={fmtU(totalUnidades)} sub="período" accent={ACCENT2}/>}
        {vl[0]&&<KpiCard label="Líder" value={vl[0].name} sub={`${fmtM(vl[0].ventas)} · ${fmtPct(totalVentas>0?vl[0].ventas/totalVentas*100:0)}`} accent={ACCENT4}/>}
      </div>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:"18px 20px"}}>
        <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:14}}>Ranking de vendedores</div>
        {vl.map((v,i)=>(
          <div key={v.name} onClick={()=>setSel(sel===v.name?null:v.name)}
            style={{marginBottom:10,cursor:"pointer",padding:"10px 12px",borderRadius:8,border:`1px solid ${sel===v.name?v.color:BORDER}`,background:sel===v.name?`${v.color}0f`:CARD,transition:"all .15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
              <span style={{fontSize:12,color:MUTED,width:22,textAlign:"right",flexShrink:0}}>{i+1}.</span>
              <div style={{width:8,height:8,borderRadius:"50%",background:v.color,flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:500,color:TEXT,flex:1}}>{v.name}</span>
              <span style={{fontSize:13,fontWeight:500,color:v.color,minWidth:70,textAlign:"right"}}>{fmtM(v.ventas)}</span>
              <span style={{fontSize:11,color:MUTED,width:44,textAlign:"right"}}>{fmtPct(totalVentas>0?v.ventas/totalVentas*100:0)}</span>
              {meta?.hasCantidad&&<span style={{fontSize:11,color:ACCENT2,minWidth:60,textAlign:"right"}}>{fmtU(v.cantidad)} u.</span>}
              <span style={{fontSize:11,color:MUTED,minWidth:64,textAlign:"right"}}>{fmtN(v.rows)} ops.</span>
            </div>
            <div style={{height:4,background:CARD2,borderRadius:2,marginLeft:40}}>
              <div style={{height:"100%",width:`${v.ventas/maxV*100}%`,background:v.color,borderRadius:2,opacity:0.65}}/>
            </div>
            {sel===v.name&&(
              <div style={{marginTop:12,display:"flex",gap:10,flexWrap:"wrap"}}>
                {Object.keys(v.proveedores).length>0&&<div style={{flex:1,minWidth:160}}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Proveedores</div>{Object.entries(v.proveedores).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([p,val])=><div key={p} style={{marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{p}</span><span style={{fontSize:11,fontWeight:500,color:BRAND}}>{fmtM(val)}</span></div><div style={{height:2,background:CARD2,borderRadius:1}}><div style={{height:"100%",width:`${val/v.ventas*100}%`,background:BRAND,borderRadius:1,opacity:0.6}}/></div></div>)}</div>}
                {Object.keys(v.rubros).length>0&&<div style={{flex:1,minWidth:160}}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Rubros</div>{Object.entries(v.rubros).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([r,val])=><div key={r} style={{marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{r}</span><span style={{fontSize:11,fontWeight:500,color:ACCENT1}}>{fmtM(val)}</span></div><div style={{height:2,background:CARD2,borderRadius:1}}><div style={{height:"100%",width:`${val/v.ventas*100}%`,background:ACCENT1,borderRadius:1,opacity:0.6}}/></div></div>)}</div>}
                {(v.rentMix.Alta+v.rentMix.Media+v.rentMix.Baja)>0&&<div style={{flex:1,minWidth:150}}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Mix rentabilidad</div>{["Alta","Media","Baja"].map(n=>{const val=v.rentMix[n];if(!val) return null;return<div key={n} style={{marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><RentBadge nivel={n}/><span style={{fontSize:11,fontWeight:500,color:RENT_COLOR[n]}}>{fmtPct(v.ventas>0?val/v.ventas*100:0)}</span></div><div style={{height:2,background:CARD2,borderRadius:1}}><div style={{height:"100%",width:`${val/v.ventas*100}%`,background:RENT_COLOR[n],borderRadius:1,opacity:0.7}}/></div></div>})}</div>}
              </div>
            )}
          </div>
        ))}
        <div style={{fontSize:11,color:MUTED,marginTop:4}}>Hacé clic en un vendedor para ver su desglose.</div>
      </div>
    </div>
  )
}

function ClientesTab({filteredRecords,meta,totalVentas,totalUnidades}){
  const[sel,setSel]=useState(null)
  const[search,setSearch]=useState("")
  const[metric,setMetric]=useState("pesos")
  const cm={}
  filteredRecords.forEach(r=>{
    const k=r.cliente||"Sin cliente"
    if(!cm[k]) cm[k]={name:k,ventas:0,cantidad:0,rows:0,rubros:{},proveedores:{},vendedores:{},rentMix:{Alta:0,Media:0,Baja:0}}
    const c=cm[k];c.ventas+=r.precio;c.cantidad+=r.cantidad;c.rows+=(r.rows||1)
    if(r.rubro) c.rubros[r.rubro]=(c.rubros[r.rubro]||0)+r.precio
    if(r.proveedor) c.proveedores[r.proveedor]=(c.proveedores[r.proveedor]||0)+r.precio
    if(r.vendedor) c.vendedores[r.vendedor]=(c.vendedores[r.vendedor]||0)+r.precio
    if(["Alta","Media","Baja"].includes(r.rentabilidad)) c.rentMix[r.rentabilidad]+=r.precio
  })
  const cl=Object.values(cm).sort((a,b)=>b.ventas-a.ventas)
  cl.forEach((c,i)=>c.color=VENDOR_COLORS[i%VENDOR_COLORS.length])
  const maxV=cl[0]?.ventas||1
  const shown=search?cl.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())):cl
  const ticketProm=cl.length>0?totalVentas/cl.length:0
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <KpiCard label="Clientes" value={fmtN(cl.length)} sub="en el período" accent={ACCENT2}/>
        <KpiCard label="Total Ventas" value={fmtM(totalVentas)} sub="período" accent={BRAND}/>
        {meta?.hasCantidad&&<KpiCard label="Unidades" value={fmtU(totalUnidades)} sub="período" accent={ACCENT1}/>}
        {cl[0]&&<KpiCard label="Top cliente" value={cl[0].name} sub={`${fmtM(cl[0].ventas)} · ${fmtPct(totalVentas>0?cl[0].ventas/totalVentas*100:0)}`} accent={ACCENT4}/>}
        <KpiCard label="Ticket promedio" value={fmtM(ticketProm)} sub="por cliente" accent={ACCENT3}/>
      </div>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:"18px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
          <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:MUTED}}>Ranking de clientes ({cl.length})</div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente..." style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:6,color:TEXT,padding:"5px 10px",fontSize:12,outline:"none",width:180}}/>
            {meta?.hasCantidad&&<MetricToggle value={metric} onChange={setMetric}/>}
          </div>
        </div>
        {shown.map((c,i)=>(
          <div key={c.name} onClick={()=>setSel(sel===c.name?null:c.name)}
            style={{marginBottom:10,cursor:"pointer",padding:"10px 12px",borderRadius:8,border:`1px solid ${sel===c.name?BRAND:BORDER}`,background:sel===c.name?BRAND_LIGHT:CARD,transition:"all .15s"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
              <span style={{fontSize:11,color:MUTED,width:24,textAlign:"right",flexShrink:0}}>{cl.indexOf(c)+1}.</span>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:500,color:TEXT,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</span>
              <span style={{fontSize:13,fontWeight:500,color:metric==="pesos"?BRAND:ACCENT2,minWidth:70,textAlign:"right"}}>{metric==="pesos"?fmtM(c.ventas):fmtU(c.cantidad)}</span>
              <span style={{fontSize:11,color:MUTED,width:44,textAlign:"right"}}>{fmtPct(totalVentas>0?c.ventas/totalVentas*100:0)}</span>
              <span style={{fontSize:11,color:MUTED,minWidth:56,textAlign:"right"}}>{fmtN(c.rows)} ops.</span>
            </div>
            <div style={{height:4,background:CARD2,borderRadius:2,marginLeft:42}}>
              <div style={{height:"100%",width:`${(metric==="pesos"?c.ventas:c.cantidad)/maxV*100}%`,background:BRAND,borderRadius:2,opacity:0.55}}/>
            </div>
            {sel===c.name&&(
              <div style={{marginTop:12,display:"flex",gap:10,flexWrap:"wrap"}}>
                {Object.keys(c.rubros).length>0&&<div style={{flex:1,minWidth:160}}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Rubros</div>{Object.entries(c.rubros).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([r,val])=><div key={r} style={{marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{r}</span><span style={{fontSize:11,fontWeight:500,color:ACCENT1}}>{fmtM(val)}</span></div><div style={{height:2,background:CARD2,borderRadius:1}}><div style={{height:"100%",width:`${val/c.ventas*100}%`,background:ACCENT1,borderRadius:1,opacity:0.6}}/></div></div>)}</div>}
                {Object.keys(c.proveedores).length>0&&<div style={{flex:1,minWidth:160}}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Proveedores</div>{Object.entries(c.proveedores).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([p,val])=><div key={p} style={{marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{p}</span><span style={{fontSize:11,fontWeight:500,color:BRAND}}>{fmtM(val)}</span></div><div style={{height:2,background:CARD2,borderRadius:1}}><div style={{height:"100%",width:`${val/c.ventas*100}%`,background:BRAND,borderRadius:1,opacity:0.6}}/></div></div>)}</div>}
                {Object.keys(c.vendedores).length>0&&<div style={{flex:1,minWidth:150}}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Atendido por</div>{Object.entries(c.vendedores).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([v,val])=><div key={v} style={{marginBottom:4}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110}}>{v}</span><span style={{fontSize:11,fontWeight:500,color:ACCENT3}}>{fmtM(val)}</span></div><div style={{height:2,background:CARD2,borderRadius:1}}><div style={{height:"100%",width:`${val/c.ventas*100}%`,background:ACCENT3,borderRadius:1,opacity:0.6}}/></div></div>)}</div>}
              </div>
            )}
          </div>
        ))}
        <div style={{fontSize:11,color:MUTED,marginTop:4}}>Hacé clic en un cliente para ver qué compra.</div>
      </div>
    </div>
  )
}

function EvolucionTab({filteredRecords,meta}){
  const[dim,setDim]=useState(()=>meta?.hasProveedor?"proveedor":meta?.hasRubro?"rubro":"vendedor")
  const[metric,setMetric]=useState("pesos")
  const dims=[...(meta?.hasProveedor?[{key:"proveedor",label:"Proveedores",color:BRAND}]:[]),...(meta?.hasRubro?[{key:"rubro",label:"Rubros",color:ACCENT1}]:[]),...(meta?.hasVendedor?[{key:"vendedor",label:"Vendedores",color:ACCENT3}]:[]),...(meta?.hasCliente?[{key:"cliente",label:"Clientes",color:ACCENT2}]:[])]
  const activeDim=dims.find(d=>d.key===dim)||dims[0]
  const periods=[...new Set(filteredRecords.map(r=>toPeriod(r.y,r.m)).filter(v=>!isNaN(v)&&v>0))].sort((a,b)=>a-b)
  const matrix={}
  filteredRecords.forEach(r=>{const k=r[dim];if(!k) return;const p=toPeriod(r.y,r.m);if(!matrix[k]) matrix[k]={};if(!matrix[k][p]) matrix[k][p]={ventas:0,cantidad:0};matrix[k][p].ventas+=r.precio;matrix[k][p].cantidad+=r.cantidad})
  const entities=Object.keys(matrix).sort((a,b)=>Object.values(matrix[b]).reduce((s,x)=>s+x.ventas,0)-Object.values(matrix[a]).reduce((s,x)=>s+x.ventas,0))
  const valFn=(e,p)=>{const d=matrix[e]?.[p];return d?(metric==="pesos"?d.ventas:d.cantidad):0}
  const momPct=(e,pi)=>{if(pi===0) return null;const prev=valFn(e,periods[pi-1]),curr=valFn(e,periods[pi]);return prev>0?((curr-prev)/prev)*100:null}
  const periodTotals=periods.map(p=>({p,val:filteredRecords.filter(r=>toPeriod(r.y,r.m)===p).reduce((s,r)=>s+(metric==="pesos"?r.precio:r.cantidad),0)}))
  const maxBar=Math.max(...periodTotals.map(x=>x.val),1)
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{dims.map(d=><button key={d.key} onClick={()=>setDim(d.key)} style={{padding:"5px 14px",background:dim===d.key?BRAND_LIGHT:"transparent",border:`1px solid ${dim===d.key?BRAND:BORDER}`,borderRadius:6,color:dim===d.key?BRAND:MUTED,cursor:"pointer",fontSize:12,fontWeight:500}}>{d.label}</button>)}</div>
        {meta?.hasCantidad&&<MetricToggle value={metric} onChange={setMetric}/>}
      </div>
      {periods.length>0&&(
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:"18px 20px"}}>
          <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:14}}>Evolución total por período</div>
          <div style={{display:"flex",gap:6,alignItems:"flex-end",height:110,overflowX:"auto"}}>
            {periodTotals.map((pt,i)=>{
              const h=Math.max(pt.val/maxBar*80,2),prev=i>0?periodTotals[i-1].val:null,pct=prev&&prev>0?((pt.val-prev)/prev)*100:null
              return(
                <div key={pt.p} style={{minWidth:60,flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  <span style={{fontSize:10,fontWeight:500,color:pct==null?MUTED:pct>=0?ACCENT2:ACCENT5}}>{pct==null?"—":pct>=0?`+${pct.toFixed(0)}%`:`${pct.toFixed(0)}%`}</span>
                  <div style={{width:"100%",height:80,display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",height:h,background:activeDim?.color||BRAND,borderRadius:"3px 3px 0 0",opacity:0.7}}/></div>
                  <span style={{fontSize:9,color:MUTED,whiteSpace:"nowrap"}}>{periodLabel(pt.p,true)}</span>
                  <span style={{fontSize:10,fontWeight:500,color:TEXT,whiteSpace:"nowrap"}}>{metric==="pesos"?fmtM(pt.val):fmtU(pt.val)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {periods.length>0&&entities.length>0&&(
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:"18px 20px",overflowX:"auto"}}>
          <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:1.5,color:MUTED,marginBottom:14}}>Tabla período a período — {activeDim?.label}</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:520}}>
            <thead><tr>
              <th style={{padding:"6px 10px",textAlign:"left",color:MUTED,fontSize:9,textTransform:"uppercase",borderBottom:`1px solid ${BORDER}`,minWidth:130}}>{activeDim?.label?.replace(/s$/,"")}</th>
              {periods.map(p=><th key={p} style={{padding:"6px 8px",textAlign:"right",color:MUTED,fontSize:9,borderBottom:`1px solid ${BORDER}`,whiteSpace:"nowrap",minWidth:80}}>{periodLabel(p,true)}</th>)}
              <th style={{padding:"6px 8px",textAlign:"right",color:MUTED,fontSize:9,borderBottom:`1px solid ${BORDER}`,whiteSpace:"nowrap"}}>Total</th>
            </tr></thead>
            <tbody>
              {entities.slice(0,20).map(entity=>{
                const tot=Object.values(matrix[entity]).reduce((s,x)=>s+(metric==="pesos"?x.ventas:x.cantidad),0)
                return(
                  <tr key={entity} onMouseEnter={e=>e.currentTarget.style.background=CARD2} onMouseLeave={e=>e.currentTarget.style.background="transparent"} style={{borderBottom:`1px solid ${BORDER}`}}>
                    <td style={{padding:"7px 10px",color:TEXT,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:130}}>{entity}</td>
                    {periods.map((p,pi)=>{const val=valFn(entity,p),pct=momPct(entity,pi);return(
                      <td key={p} style={{padding:"7px 8px",textAlign:"right",verticalAlign:"top"}}>
                        <div style={{color:val>0?(activeDim?.color||BRAND):MUTED,fontWeight:val>0?500:400}}>{val>0?(metric==="pesos"?fmtM(val):fmtU(val)):"—"}</div>
                        {pi>0&&val>0&&pct!==null&&<div style={{fontSize:10,color:pct>=0?ACCENT2:ACCENT5,marginTop:1}}>{pct>=0?`▲ +${pct.toFixed(0)}%`:`▼ ${pct.toFixed(0)}%`}</div>}
                      </td>
                    )})}
                    <td style={{padding:"7px 8px",textAlign:"right",color:activeDim?.color||BRAND,fontWeight:500}}>{metric==="pesos"?fmtM(tot):fmtU(tot)}</td>
                  </tr>
                )
              })}
              <tr style={{borderTop:`2px solid ${BORDER}`,background:CARD2}}>
                <td style={{padding:"7px 10px",color:TEXT,fontWeight:500,fontSize:12}}>TOTAL</td>
                {periodTotals.map((pt,i)=>{const prev=i>0?periodTotals[i-1].val:null,pct=prev&&prev>0?((pt.val-prev)/prev)*100:null;return(
                  <td key={pt.p} style={{padding:"7px 8px",textAlign:"right",verticalAlign:"top"}}>
                    <div style={{color:TEXT,fontWeight:500}}>{metric==="pesos"?fmtM(pt.val):fmtU(pt.val)}</div>
                    {pct!==null&&<div style={{fontSize:10,color:pct>=0?ACCENT2:ACCENT5,marginTop:1}}>{pct>=0?`▲ +${pct.toFixed(0)}%`:`▼ ${pct.toFixed(0)}%`}</div>}
                  </td>
                )})}
                <td style={{padding:"7px 8px",textAlign:"right",color:TEXT,fontWeight:500}}>{metric==="pesos"?fmtM(periodTotals.reduce((s,x)=>s+x.val,0)):fmtU(periodTotals.reduce((s,x)=>s+x.val,0))}</td>
              </tr>
            </tbody>
          </table>
          {entities.length>20&&<div style={{fontSize:11,color:MUTED,marginTop:8}}>Mostrando top 20 de {entities.length}</div>}
        </div>
      )}
    </div>
  )
}

function MappingModal({headers,onConfirm,onCancel}){
  const[mapping,setMapping]=useState(()=>autoMap(headers))
  const[pet,setPet]=useState(true)
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:28,width:520,maxWidth:"96vw",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}}>
        <div style={{fontSize:15,fontWeight:500,color:TEXT,marginBottom:4}}>Mapear columnas del Excel</div>
        <div style={{fontSize:12,color:MUTED,marginBottom:20}}>Columnas detectadas automáticamente. Ajustá si es necesario.</div>
        {CAMPOS.map(({key,req})=>(
          <div key={key} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
            <span style={{color:req?BRAND:MUTED,width:130,fontSize:12,flexShrink:0}}>{CAMPO_LABELS[key]}{req?" *":""}</span>
            <select value={mapping[key]||""} onChange={e=>setMapping(m=>({...m,[key]:e.target.value||undefined}))}
              style={{flex:1,background:mapping[key]?BRAND_LIGHT:CARD2,border:`1px solid ${mapping[key]?BRAND:BORDER}`,borderRadius:6,color:mapping[key]?TEXT:MUTED,padding:"5px 9px",fontSize:12,outline:"none"}}>
              <option value="">— no mapear —</option>
              {headers.map(h=><option key={h} value={h}>{h}</option>)}
            </select>
            {mapping[key]&&<span style={{color:ACCENT2,fontSize:13}}>✓</span>}
          </div>
        ))}
        <div style={{padding:"12px 14px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8}}>
          <div style={{fontSize:11,color:MUTED,marginBottom:8,fontWeight:500,textTransform:"uppercase",letterSpacing:1}}>¿Cómo viene el precio?</div>
          {[{v:true,l:"Ya es el total de la fila",d:"El importe incluye la cantidad"},{v:false,l:"Es precio unitario",d:"Se multiplica precio × cantidad"}].map(opt=>(
            <div key={String(opt.v)} onClick={()=>setPet(opt.v)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"7px 10px",borderRadius:6,cursor:"pointer",background:pet===opt.v?BRAND_LIGHT:CARD,border:`1px solid ${pet===opt.v?BRAND:BORDER}`,marginBottom:5}}>
              <div style={{width:13,height:13,borderRadius:"50%",border:`2px solid ${pet===opt.v?BRAND:BORDER}`,background:pet===opt.v?BRAND:"transparent",flexShrink:0,marginTop:2}}/>
              <div><div style={{fontSize:12,color:TEXT,fontWeight:500}}>{opt.l}</div><div style={{fontSize:11,color:MUTED,marginTop:1}}>{opt.d}</div></div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:18,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{padding:"7px 18px",background:CARD,border:`1px solid ${BORDER}`,borderRadius:6,color:MUTED,cursor:"pointer",fontSize:12}}>Cancelar</button>
          <button onClick={()=>onConfirm(mapping,pet)} style={{padding:"7px 18px",background:BRAND,border:"none",borderRadius:6,color:"#fff",cursor:"pointer",fontWeight:500,fontSize:12}}>Siguiente →</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmImportModal({stats,onConfirm,onCancel}){
  const{rows,ventas,unidades,hasCantidad,periods,existingRows,cubeKB}=stats
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:12,padding:32,width:480,maxWidth:"96vw",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}}>
        <div style={{fontSize:16,fontWeight:500,color:TEXT,marginBottom:4}}>Confirmar importación</div>
        <div style={{fontSize:12,color:MUTED,marginBottom:16}}>Revisá los datos antes de agregar</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[["Filas",fmtN(rows),BRAND],["Importe",fmtM(ventas),ACCENT1],...(hasCantidad?[["Unidades",fmtU(unidades),ACCENT2]]:[]),["Períodos",String(periods.length),ACCENT3]].map(([l,v,c])=>(
            <div key={l} style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${c}`}}>
              <div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1.2,marginBottom:3}}>{l}</div>
              <div style={{fontSize:20,fontWeight:500,color:c}}>{v}</div>
            </div>
          ))}
        </div>
        {cubeKB!=null&&<div style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 14px",marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:11,color:MUTED}}>Tamaño del cubo</span><span style={{fontSize:11,fontWeight:500,color:cubeKB>400000?ACCENT5:ACCENT2}}>{fmtN(cubeKB)} KB</span></div><div style={{height:4,background:BORDER,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(cubeKB/500000*100,100)}%`,background:cubeKB>400000?ACCENT5:ACCENT2,borderRadius:2}}/></div></div>}
        {periods.length>0&&<div style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,padding:"10px 14px",marginBottom:16}}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>Períodos</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{periods.map(p=><span key={p} style={{fontSize:11,color:BRAND,background:BRAND_LIGHT,border:`1px solid ${BRAND}30`,borderRadius:6,padding:"3px 10px"}}>{periodLabel(p)}</span>)}</div></div>}
        {existingRows>0&&<div style={{background:"#fff8e1",border:`1px solid ${ACCENT4}40`,borderRadius:8,padding:"10px 14px",marginBottom:16,display:"flex",gap:8}}><span>⚠</span><div style={{fontSize:12,color:ACCENT4}}>Ya hay <strong>{fmtN(existingRows)}</strong> registros. Los nuevos se agregarán.</div></div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{padding:"7px 18px",background:CARD,border:`1px solid ${BORDER}`,borderRadius:6,color:MUTED,cursor:"pointer",fontSize:12}}>← Volver</button>
          <button onClick={onConfirm} style={{padding:"7px 18px",background:BRAND,border:"none",borderRadius:6,color:"#fff",cursor:"pointer",fontWeight:500,fontSize:12}}>✓ Confirmar</button>
        </div>
      </div>
    </div>
  )
}

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

  useEffect(()=>{
    const t0=Date.now()
    loadData().then(({cube:c,articulos:a,meta:m,error})=>{
      setCube(c||[]);setArticulos(a||[]);setMeta(m||{})
      setStorageInfo(error?{ok:false,error}:{ok:true,loaded:c!==null,rows:m?.totalRows||0,cells:c?.length||0,ms:Date.now()-t0})
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
      setRawHeaders(json[0]?.map(s=>String(s).trim())??[])
      setRawRows(json.slice(1).filter(r=>r.some(c=>c!=="")))
    }
    reader.readAsArrayBuffer(file);setFileKey(k=>k+1)
  },[])

  const handleMappingConfirm=useCallback((mapping,pet=true)=>{
    const hi={}
    Object.entries(mapping).forEach(([k,col])=>{if(col) hi[k]=rawHeaders.indexOf(col)})
    const has=k=>hi[k]!==undefined
    const toN=v=>{if(v==null||v==="") return 0;if(typeof v==="number") return v;let s=String(v).trim().replace(/[$\s]/g,"");const lc=s.lastIndexOf(","),ld=s.lastIndexOf(".");if(lc>ld) s=s.replace(/\./g,"").replace(",",".");else if(ld>lc) s=s.replace(/,/g,"");else s=s.replace(/,/g,"");return parseFloat(s)||0}
    const get=(row,k)=>has(k)?row[hi[k]]:undefined
    const newMeta={hasProveedor:has("proveedor"),hasRubro:has("rubro"),hasArticulo:has("articulo"),hasVendedor:has("vendedor"),hasCantidad:has("cantidad"),hasProvincia:has("provincia"),hasRentabilidad:has("rentabilidad"),hasCosto:has("costo"),hasCliente:has("cliente"),hasEmpresa:has("empresa"),hasLocalidad:has("localidad"),hasZona:has("zona"),precioEsTotal:pet,mappedCols:mapping}
    const parsed=rawRows.map(row=>{
      const dt=parseDate(get(row,"fecha"))
      const rp=toN(get(row,"precio")),rc=has("costo")?toN(get(row,"costo")):0,rq=has("cantidad")?toN(get(row,"cantidad")):1
      const precio=pet?rp:rp*(rq||1),costo=pet?rc:rc*(rq||1),cantidad=rq||1
      let rentabilidad=null
      if(has("rentabilidad")){const rv=String(get(row,"rentabilidad")??"").trim();const rn=rv.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");rentabilidad=rn==="alta"?"Alta":rn==="media"?"Media":rn==="baja"?"Baja":(rv||"Sin dato")}
      return{y:dt?.y??0,m:dt?.m??0,precio,costo,cantidad,rentabilidad,
        proveedor:has("proveedor")?(String(get(row,"proveedor")??"").trim()||"Sin proveedor"):null,
        rubro:has("rubro")?(String(get(row,"rubro")??"").trim()||"Sin rubro"):null,
        articulo:has("articulo")?(String(get(row,"articulo")??"").trim()||"Sin artículo"):null,
        vendedor:has("vendedor")?(String(get(row,"vendedor")??"").trim()||"Sin vendedor"):null,
        provincia:has("provincia")?(String(get(row,"provincia")??"").trim()||"Sin provincia"):null,
        cliente:has("cliente")?(String(get(row,"cliente")??"").trim()||"Sin cliente"):null,
        empresa:has("empresa")?(String(get(row,"empresa")??"").trim()||"Sin empresa"):null,
        localidad:has("localidad")?(String(get(row,"localidad")??"").trim()||"Sin localidad"):null,
        zona:has("zona")?(String(get(row,"zona")??"").trim()||"Sin zona"):null}
    }).filter(r=>r.y>0||r.precio>0)
    const{cube:nc,articulos:na}=buildCube(parsed)
    const mc=mergeCubes(records,nc),ma=mergeArts(articulos||[],na)
    const cubeKB=Math.round(JSON.stringify(compressCube(mc)).length/1024)
    const ventas=parsed.reduce((s,r)=>s+r.precio,0),unidades=parsed.reduce((s,r)=>s+r.cantidad,0)
    const periods=[...new Set(parsed.map(r=>toPeriod(r.y,r.m)).filter(v=>v>0))].sort((a,b)=>a-b)
    setRawHeaders(null);setRawRows(null)
    setPendingImport({newCube:nc,newArts:na,meta:newMeta,stats:{rows:parsed.length,ventas,unidades,hasCantidad:has("cantidad"),periods,existingRows:meta?.totalRows||0,cubeKB}})
  },[rawHeaders,rawRows,records,articulos,meta])

  const handleImportConfirm=useCallback(async()=>{
    if(!pendingImport) return
    setPendingImport(null);setActiveTab("resumen")
    setSaveStage("merging");setSaveProgress(15);await new Promise(r=>setTimeout(r,0))
    const mc=mergeCubes(records,pendingImport.newCube),ma=mergeArts(articulos||[],pendingImport.newArts)
    const nm={...pendingImport.meta,totalRows:(meta?.totalRows||0)+pendingImport.stats.rows}
    setSaveStage("compressing");setSaveProgress(40);await new Promise(r=>setTimeout(r,0))
    setCube(mc);setArticulos(ma);setMeta(nm)
    setSaveStage("saving");setSaveProgress(70);await new Promise(r=>setTimeout(r,0))
    try{
      const kb=await saveData(mc,ma,nm)
      setSaveStage("saved");setSaveProgress(100);setSaveMsg(`Guardado · ${fmtN(kb)} KB`)
      setTimeout(()=>{setSaveStage("idle");setSaveProgress(0);setSaveMsg("")},5000)
    }catch(e){setSaveStage("error");setSaveProgress(0);setSaveMsg(String(e))}
  },[pendingImport,records,articulos,meta])

  const handleClear=async()=>{if(!confirm("¿Eliminar todos los datos?")) return;await clearData();setCube([]);setArticulos([]);setMeta({})}

  if(cube===null) return(
    <div style={{background:BRAND,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui"}}>
      <div style={{textAlign:"center"}}>
        <img src={LOGO_SRC} style={{height:52,objectFit:"contain",filter:"brightness(0) invert(1)",marginBottom:16}} alt="logo"/>
        <div style={{fontSize:17,fontWeight:500,color:"#fff",marginBottom:4}}>Azul de Montaña</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>Cargando datos…</div>
      </div>
    </div>
  )

  const yearsDisp=[...new Set(records.map(r=>r.y).filter(v=>v>0))].sort((a,b)=>a-b)
  const mesesDisp=[...new Set(records.filter(r=>fYear==="__ALL__"||r.y===parseInt(fYear)).map(r=>r.m).filter(v=>v!==undefined))].sort((a,b)=>a-b)
  const uniq=key=>[...new Set(records.map(r=>r[key]).filter(Boolean))].sort()
  const filtered=records.filter(r=>{
    if(fYear!=="__ALL__"&&r.y!==parseInt(fYear)) return false
    if(fMes!=="__ALL__"&&r.m!==parseInt(fMes)) return false
    if(fProv!=="__ALL__"&&r.proveedor!==fProv) return false
    if(fRubro!=="__ALL__"&&r.rubro!==fRubro) return false
    if(fVend!=="__ALL__"&&r.vendedor!==fVend) return false
    if(fRentab!=="__ALL__"&&r.rentabilidad!==fRentab) return false
    if(fPcia!=="__ALL__"&&r.provincia!==fPcia) return false
    if(fCliente!=="__ALL__"&&r.cliente!==fCliente) return false
    if(fEmpresa!=="__ALL__"&&r.empresa!==fEmpresa) return false
    if(fZona!=="__ALL__"&&r.zona!==fZona) return false
    return true
  })
  const filteredRows=filtered.reduce((s,r)=>s+(r.rows||1),0)
  const totalRows=meta?.totalRows||records.reduce((s,r)=>s+(r.rows||1),0)
  const totalVentas=filtered.reduce((s,r)=>s+r.precio,0)
  const totalUnidades=filtered.reduce((s,r)=>s+r.cantidad,0)
  function groupBy(arr,key){const map={};arr.forEach(r=>{const k=r[key]||"Sin dato";if(!map[k]) map[k]={name:k,ventas:0,costo:0,cantidad:0,rows:0,rentabilidad:r.rentabilidad};map[k].ventas+=r.precio;map[k].costo+=r.costo;map[k].cantidad+=r.cantidad;map[k].rows+=(r.rows||1)});return Object.values(map).sort((a,b)=>b.ventas-a.ventas)}
  const provData=meta?.hasProveedor?groupBy(filtered,"proveedor"):[]
  const rubroData=meta?.hasRubro?groupBy(filtered,"rubro"):[]
  const vendData=meta?.hasVendedor?groupBy(filtered,"vendedor"):[]
  const rentData=meta?.hasRentabilidad?groupBy(filtered,"rentabilidad"):[]
  const pciaData=meta?.hasProvincia?groupBy(filtered,"provincia"):[]
  const zonaData=meta?.hasZona?groupBy(filtered,"zona"):[]
  const cliData=meta?.hasCliente?groupBy(filtered,"cliente"):[]
  const artData=meta?.hasArticulo?[...(articulos||[])].sort((a,b)=>b.precio-a.precio):[]
  const hasData=records.length>0
  const TABS=[
    {key:"resumen",label:"Resumen"},
    ...(meta?.hasCliente?[{key:"clientes",label:"Clientes"}]:[]),
    ...(meta?.hasProveedor?[{key:"proveedores",label:"Proveedores"}]:[]),
    ...(meta?.hasRubro?[{key:"rubros",label:"Rubros"}]:[]),
    ...(meta?.hasVendedor?[{key:"vendedores",label:"Vendedores"}]:[]),
    ...((meta?.hasProveedor||meta?.hasRubro||meta?.hasVendedor||meta?.hasCliente)?[{key:"evolucion",label:"Mes a Mes"}]:[]),
    ...(meta?.hasArticulo?[{key:"articulos",label:"Artículos"}]:[]),
    ...(meta?.hasRentabilidad?[{key:"rentabilidad",label:"Rentabilidad"}]:[]),
    ...(meta?.hasZona?[{key:"zonas",label:"Zonas"}]:[]),
    ...(meta?.hasProvincia?[{key:"provincias",label:"Provincias"}]:[]),
  ]
  const safeTab=TABS.find(t=>t.key===activeTab)?activeTab:"resumen"

  return(
    <div style={{background:BG,minHeight:"100vh",color:TEXT,fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`select option{background:${BRAND};color:#fff}input::placeholder{color:${MUTED}}`}</style>
      <div style={{background:BRAND_DARK,padding:"0 20px",display:"flex",alignItems:"center",gap:12,height:54,flexShrink:0,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:8,flexShrink:0}}>
          <img src={LOGO_SRC} style={{height:26,width:26,objectFit:"contain",filter:"brightness(0) invert(1)"}} alt="logo"/>
          <div><div style={{fontSize:13,fontWeight:500,color:"#fff",lineHeight:1.1}}>Azul de Montaña</div><div style={{fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:1,textTransform:"uppercase"}}>Dashboard de ventas</div></div>
        </div>
        <div style={{flex:1,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {yearsDisp.length>1&&<Dropdown label="Año" value={fYear} options={yearsDisp.map(y=>({val:String(y),label:String(y)}))} onChange={v=>{setFYear(v);setFMes("__ALL__")}}/>}
          <Dropdown label="Mes" value={fMes} options={mesesDisp.map(m=>({val:String(m),label:MESES[m]??`Mes ${m}`}))} onChange={setFMes}/>
          {meta?.hasEmpresa&&<Dropdown label="Empresa" value={fEmpresa} options={uniq("empresa")} onChange={setFEmpresa}/>}
          {meta?.hasCliente&&<Dropdown label="Cliente" value={fCliente} options={uniq("cliente")} onChange={setFCliente}/>}
          {meta?.hasProveedor&&<Dropdown label="Proveedor" value={fProv} options={uniq("proveedor")} onChange={setFProv}/>}
          {meta?.hasRubro&&<Dropdown label="Rubro" value={fRubro} options={uniq("rubro")} onChange={setFRubro}/>}
          {meta?.hasVendedor&&<Dropdown label="Vendedor" value={fVend} options={uniq("vendedor")} onChange={setFVend}/>}
          {meta?.hasRentabilidad&&<Dropdown label="Rentabilidad" value={fRentab} options={["Alta","Media","Baja"]} onChange={setFRentab}/>}
          {meta?.hasZona&&<Dropdown label="Zona" value={fZona} options={uniq("zona")} onChange={setFZona}/>}
          {meta?.hasProvincia&&<Dropdown label="Provincia" value={fPcia} options={uniq("provincia")} onChange={setFPcia}/>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          <SaveBar stage={saveStage} progress={saveProgress} msg={saveMsg}/>
          {hasData&&<button onClick={handleClear} style={{padding:"5px 10px",background:"transparent",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,color:"rgba(255,255,255,0.45)",cursor:"pointer",fontSize:11}}>Limpiar</button>}
          <button onClick={()=>fileRef.current?.click()} style={{padding:"6px 16px",background:"#fff",border:"none",borderRadius:6,color:BRAND,cursor:"pointer",fontWeight:500,fontSize:12}}>↑ Importar Excel</button>
          <input key={fileKey} ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{display:"none"}}/>
        </div>
      </div>
      <div style={{background:BRAND,padding:"3px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:10,flexShrink:0}}>
        <span style={{color:!storageInfo?.ok?"#ffaaaa":storageInfo?.loaded&&storageInfo?.rows>0?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.3)"}}>
          {!storageInfo?"":!storageInfo.ok?`Error: ${storageInfo.error}`:storageInfo.loaded&&storageInfo.rows>0?`✓ ${fmtN(storageInfo.rows)} filas · ${storageInfo.cells} celdas · ${storageInfo.ms}ms`:"Supabase conectado · sin datos previos"}
        </span>
        {hasData&&<span style={{color:"rgba(255,255,255,0.35)"}}>{fmtN(filteredRows)} / {fmtN(totalRows)} filas</span>}
      </div>
      {rawHeaders&&<MappingModal headers={rawHeaders} onConfirm={handleMappingConfirm} onCancel={()=>{setRawHeaders(null);setRawRows(null)}}/>}
      {pendingImport&&<ConfirmImportModal stats={pendingImport.stats} onConfirm={handleImportConfirm} onCancel={()=>setPendingImport(null)}/>}
      {!hasData?(
        <div style={{textAlign:"center",padding:"80px 20px",flex:1}}>
          <img src={LOGO_SRC} style={{height:48,objectFit:"contain",marginBottom:16,opacity:0.15}} alt="logo"/>
          <div style={{fontSize:16,fontWeight:500,color:TEXT,marginBottom:8}}>Sin datos cargados</div>
          <div style={{fontSize:13,color:MUTED,lineHeight:1.9,maxWidth:500,margin:"0 auto"}}>Importá un Excel con columnas: FECHA, VENTA, CLIENTE, ARTICULO, CANTIDAD, RUBRO, PROVEEDOR, EMPRESA, RENTABILIDAD, VENDEDOR, ZONA, LOCALIDAD, PROVINCIA.</div>
          <button onClick={()=>fileRef.current?.click()} style={{marginTop:24,padding:"10px 28px",background:BRAND,border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontWeight:500,fontSize:14}}>↑ Importar Excel</button>
          <input key={fileKey} ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{display:"none"}}/>
        </div>
      ):(
        <div style={{display:"flex",flex:1,overflow:"hidden",minHeight:0}}>
          <div style={{background:BRAND,width:128,flexShrink:0,display:"flex",flexDirection:"column",overflowY:"auto"}}>
            {TABS.map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                style={{display:"block",padding:"11px 16px",background:safeTab===t.key?"rgba(255,255,255,0.13)":"transparent",border:"none",borderLeft:`3px solid ${safeTab===t.key?"#fff":"transparent"}`,color:safeTab===t.key?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12,fontWeight:safeTab===t.key?500:400,textAlign:"left",width:"100%",transition:"all .15s",lineHeight:1.3}}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{flex:1,overflow:"auto",padding:"16px 20px",background:BG}}>
            {safeTab==="resumen"&&(
              <>
                <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                  <KpiCard label="Registros"     value={fmtN(filteredRows)}    sub="filas"                       accent={BRAND}/>
                  <KpiCard label="Total Ventas"   value={fmtM(totalVentas)}     sub="en pesos"                    accent={ACCENT1}/>
                  {meta?.hasCantidad&&<KpiCard label="Unidades" value={fmtU(totalUnidades)} sub="vendidas"        accent={ACCENT2}/>}
                  {cliData[0]&&  <KpiCard label="Top Cliente"   value={cliData[0].name}   sub={fmtM(cliData[0].ventas)}   accent={ACCENT4}/>}
                  {provData[0]&& <KpiCard label="Top Proveedor" value={provData[0].name}   sub={fmtM(provData[0].ventas)}  accent={ACCENT6}/>}
                  {vendData[0]&& <KpiCard label="Top Vendedor"  value={vendData[0].name}   sub={fmtM(vendData[0].ventas)}  accent={ACCENT3}/>}
                  {pciaData[0]&& <KpiCard label="Top Provincia" value={pciaData[0].name}   sub={fmtM(pciaData[0].ventas)}  accent={ACCENT7}/>}
                </div>
                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:2,color:MUTED,marginBottom:12,fontWeight:500}}>Comparativa general</div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}}>
                  {cliData.length>0&&<ChartCard title="Por Cliente" count={cliData.length}><BarList data={cliData} colorFn={BRAND} totalVentas={totalVentas} totalUnidades={totalUnidades} hasCantidad={meta?.hasCantidad}/></ChartCard>}
                  {provData.length>0&&<ChartCard title="Por Proveedor" count={provData.length}><BarList data={provData} colorFn={ACCENT1} totalVentas={totalVentas} totalUnidades={totalUnidades} hasCantidad={meta?.hasCantidad}/></ChartCard>}
                </div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  {rubroData.length>0&&<ChartCard title="Por Rubro" count={rubroData.length}><BarList data={rubroData} colorFn={ACCENT2} totalVentas={totalVentas} totalUnidades={totalUnidades} hasCantidad={meta?.hasCantidad}/></ChartCard>}
                  {vendData.length>0&&<ChartCard title="Por Vendedor" count={vendData.length}><BarList data={vendData} colorFn={ACCENT3} totalVentas={totalVentas} totalUnidades={totalUnidades} hasCantidad={meta?.hasCantidad}/></ChartCard>}
                </div>
              </>
            )}
            {safeTab==="clientes"&&    <ClientesTab filteredRecords={filtered} meta={meta} totalVentas={totalVentas} totalUnidades={totalUnidades}/>}
            {safeTab==="proveedores"&& <DetailTab data={provData}  hasCantidad={meta?.hasCantidad} totalVentas={totalVentas} totalUnidades={totalUnidades} dimLabel="Proveedor"  color={ACCENT1}/>}
            {safeTab==="rubros"&&      <DetailTab data={rubroData} hasCantidad={meta?.hasCantidad} totalVentas={totalVentas} totalUnidades={totalUnidades} dimLabel="Rubro"      color={ACCENT2}/>}
            {safeTab==="vendedores"&&  <VendedoresTab filteredRecords={filtered} meta={meta} totalVentas={totalVentas} totalUnidades={totalUnidades}/>}
            {safeTab==="evolucion"&&   <EvolucionTab filteredRecords={filtered} meta={meta}/>}
            {safeTab==="articulos"&&   <ArticulosTable data={artData} hasCantidad={meta?.hasCantidad} hasRentabilidad={meta?.hasRentabilidad} totalVentas={totalVentas}/>}
            {safeTab==="rentabilidad"&&<RentabilidadSection data={rentData} artData={artData} hasCantidad={meta?.hasCantidad}/>}
            {safeTab==="zonas"&&       <DetailTab data={zonaData}  hasCantidad={meta?.hasCantidad} totalVentas={totalVentas} totalUnidades={totalUnidades} dimLabel="Zona"       color={ACCENT6}/>}
            {safeTab==="provincias"&&  <DetailTab data={pciaData}  hasCantidad={meta?.hasCantidad} totalVentas={totalVentas} totalUnidades={totalUnidades} dimLabel="Provincia"  color={ACCENT7}/>}
          </div>
        </div>
      )}
    </div>
  )
}
