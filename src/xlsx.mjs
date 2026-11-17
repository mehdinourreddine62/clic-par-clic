// Génère un classeur .xlsx sans dépendance : consignes, exercice, solution.
import zlib from "node:zlib";

/* ---------- traduction des formules françaises ---------- */
const FN={ABS:"ABS",ANNEE:"YEAR",ARRONDI:"ROUND","ARRONDI.INF":"ROUNDDOWN","ARRONDI.SUP":"ROUNDUP",AUJOURDHUI:"TODAY",CHERCHE:"SEARCH",CONCAT:"_xlfn.CONCAT",DATE:"DATE",DATEDIF:"DATEDIF",DATEVAL:"DATEVALUE",DROITE:"RIGHT",ENT:"INT",EQUIV:"MATCH",ET:"AND","FIN.MOIS":"EOMONTH",GAUCHE:"LEFT","GRANDE.VALEUR":"LARGE",HEURE:"HOUR",INDEX:"INDEX","JOINDRE.TEXTE":"_xlfn.TEXTJOIN",JOUR:"DAY",JOURS:"_xlfn.DAYS",JOURSEM:"WEEKDAY",MAINTENANT:"NOW",MAJUSCULE:"UPPER",MAX:"MAX","MAX.SI.ENS":"_xlfn.MAXIFS",MEDIANE:"MEDIAN",MIN:"MIN","MIN.SI.ENS":"_xlfn.MINIFS",MINUSCULE:"LOWER",MINUTE:"MINUTE",MOD:"MOD",MOIS:"MONTH","MOIS.DECALER":"EDATE",MOYENNE:"AVERAGE","MOYENNE.SI":"AVERAGEIF",NB:"COUNT","NB.JOURS.OUVRES":"NETWORKDAYS","NB.SI":"COUNTIF","NB.SI.ENS":"COUNTIFS","NB.VIDE":"COUNTBLANK",NBCAR:"LEN",NBVAL:"COUNTA","NO.SEMAINE.ISO":"_xlfn.ISOWEEKNUM",NOMPROPRE:"PROPER",OU:"OR","PETITE.VALEUR":"SMALL",PRODUIT:"PRODUCT",PUISSANCE:"POWER",RACINE:"SQRT",RANG:"RANK",RECHERCHEV:"VLOOKUP",RECHERCHEX:"_xlfn.XLOOKUP","SERIE.JOUR.OUVRE":"WORKDAY",SI:"IF","SI.CONDITIONS":"_xlfn.IFS","SI.NON.DISP":"_xlfn.IFNA",SIERREUR:"IFERROR",SOMME:"SUM","SOMME.SI":"SUMIF","SOMME.SI.ENS":"SUMIFS",SOMMEPROD:"SUMPRODUCT","SOUS.TOTAL":"SUBTOTAL",STXT:"MID",SUBSTITUE:"SUBSTITUTE",SUPPRESPACE:"TRIM",TEXTE:"TEXT","TEXTE.APRES":"_xlfn.TEXTAFTER","TEXTE.AVANT":"_xlfn.TEXTBEFORE",TRONQUE:"TRUNC",VPM:"PMT"};
const CONST={VRAI:"TRUE",FAUX:"FALSE"};
export function toEnglish(f){
  if(f[0]==="=")f=f.slice(1);
  return f.split(/("[^"]*")/).map(p=>{
    if(p[0]==='"')return p;
    return p.replace(/(\d),(\d)/g,"$1.$2").replace(/;/g,",")
      .replace(/([A-ZÀ-Ü][A-ZÀ-Ü0-9.]*)(?=\()/g,m=>{if(!(m in FN))throw new Error(`Fonction sans traduction : ${m}`);return FN[m];})
      .replace(/\b(VRAI|FAUX)\b(?!\()/g,m=>CONST[m]);
  }).join("");
}

/* ---------- références ---------- */
const colIdx=s=>s.split("").reduce((a,c)=>a*26+c.charCodeAt(0)-64,0)-1;
const colName=i=>{let s="";i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;};
const REF=/(?<![A-Za-z0-9_.$!])(\$?)([A-Z]{1,3})(\$?)(\d+)(?![A-Za-z0-9_(])/g;
export function shiftFormula(f,dr,dc){
  return f.split(/("[^"]*")/).map(p=>p[0]==='"'?p:p.replace(REF,(m,a,c,b,r)=>`${a}${a?c:colName(colIdx(c)+dc)}${b}${b?r:+r+dr}`)).join("");
}
const pos=k=>{const m=k.match(/^([A-Z]+)(\d+)$/);return{c:colIdx(m[1]),r:+m[2]};};

/* ---------- valeurs ---------- */
const NUM=/^-?[\d  ]+(,\d+)?$/;
function serial(d,m,y){return Math.round((Date.UTC(y,m-1,d)-Date.UTC(1899,11,30))/864e5);}
export function cellValue(v){
  if(v==null||v==="")return null;
  if(v[0]==="'")return{s:v.slice(1)};
  let m;
  if((m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2}))?$/))){const n=serial(+m[1],+m[2],+m[3])+(m[4]?(+m[4]*60+ +m[5])/1440:0);return{n,fmt:m[4]?"dd/mm/yyyy hh:mm":"dd/mm/yyyy"};}
  if((m=v.match(/^(\d{1,2}):(\d{2})$/)))return{n:(+m[1]*60+ +m[2])/1440,fmt:"h:mm"};
  const clean=x=>+x.replace(/[  ]/g,"").replace(",",".");
  if((m=v.match(/^(-?[\d  ]+(?:,\d+)?) ?€$/)))return{n:clean(m[1]),fmt:'#,##0.00 "€"'};
  if((m=v.match(/^(-?[\d  ]+(?:,(\d+))?) ?%$/)))return{n:clean(m[1])/100,fmt:m[2]?"0."+"0".repeat(m[2].length)+"%":"0%"};
  if(NUM.test(v))return{n:clean(v),fmt:/[  ]/.test(v.trim())?"#,##0":null};
  return{s:v.replace(/ /g," ")};
}

/* ---------- construction d'une leçon ---------- */
const strip=s=>s.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
export function lessonWorkbook(l,url){
  const data={};l.grille.forEach((row,r)=>row.forEach((x,c)=>{if(x!=="")data[colName(c)+(r+1)]=x;}));
  const F={},FMT={},consignes=[];let n=0;
  const fmtOf=v=>{if(v==null||v==="")return null;const h=String(v).match(/^(\d+):\d{2}$/);if(h&&+h[1]>=24)return"[h]:mm";const c=cellValue(String(v));return c&&c.n!==undefined?c.fmt:null;};
  for(const s of l.etapes){
    if(s.f!==undefined){
      if(s.f[0]==="="){F[s.c]=s.f;FMT[s.c]=fmtOf(s.v);
        const fns=[...new Set([...s.f.replace(/"[^"]*"/g,"").matchAll(/([A-ZÀ-Ü][A-ZÀ-Ü0-9.]*)\(/g)].map(m=>m[1]))];
        const res=s.v!==undefined&&s.v!==""?` pour obtenir ${String(s.v).replace(/^'/,"")}`:"";
        consignes.push(`${++n}. En ${s.c}, ${fns.length?`utilisez ${fns.join(" et ")}`:"écrivez une formule"}${res}.`);
        consignes.push(`    Indice : ${strip(s.t)}`);}
      else if(F[s.c])delete F[s.c];
    }
    if(s.fill&&F[s.c]){const o=pos(s.c),ks=Object.keys(s.fill);
      ks.forEach(k=>{const p=pos(k);F[k]=shiftFormula(F[s.c],p.r-o.r,p.c-o.c);FMT[k]=fmtOf(s.fill[k])||FMT[s.c];});
      consignes.push(`${++n}. Recopiez la formule de ${s.c} jusqu'en ${ks[ks.length-1]}.`);}
  }
  for(const s of l.etapes)for(const[k,v]of Object.entries(s.set||{}))if(F[k]){const f=fmtOf(v);if(f&&(f==="[h]:mm"||!FMT[k]))FMT[k]=f;}
  const sol={...data};for(const k in F)delete sol[k];
  return{F,consignes,sheets:[
    {name:"Consignes",rows:[[{s:l.titre,b:1}],[{s:"Leçon animée : "+url}],[],...consignes.map(t=>[{s:t}]),[],[{s:"La feuille Solution contient les formules attendues."}]],widths:[110]},
    {name:"Exercice",cells:data,head:!l.sansEnTete},
    {name:"Solution",cells:sol,formulas:F,fmts:FMT,head:!l.sansEnTete}]};
}

/* ---------- écriture xlsx ---------- */
const xe=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export function buildXlsx(wb){
  const fmts=[];const fmtId=f=>{if(!f)return 0;let i=fmts.indexOf(f);if(i<0){fmts.push(f);i=fmts.length-1;}return 164+i;};
  const xfs=[[0,0]];const xf=(numFmt,bold)=>{let i=xfs.findIndex(x=>x[0]===numFmt&&x[1]===bold);if(i<0){xfs.push([numFmt,bold]);i=xfs.length-1;}return i;};
  const cell=(ref,v,bold,formula,ffmt)=>{
    if(formula){const st=xf(fmtId(ffmt),0);return`<c r="${ref}"${st?` s="${st}"`:""}><f>${xe(toEnglish(formula))}</f></c>`;}
    const cv=typeof v==="object"&&v&&"s" in v||typeof v==="object"&&v&&"n" in v?v:cellValue(v);if(!cv)return"";
    const st=xf(cv.n!==undefined?fmtId(cv.fmt):0,bold?1:0);const sa=st?` s="${st}"`:"";
    return cv.n!==undefined?`<c r="${ref}"${sa}><v>${cv.n}</v></c>`:`<c r="${ref}"${sa} t="inlineStr"><is><t xml:space="preserve">${xe(cv.s)}</t></is></c>`;
  };
  const sheetsXml=wb.sheets.map(sh=>{
    const rows={};let maxC=0;
    if(sh.rows)sh.rows.forEach((row,r)=>row.forEach((x,c)=>{(rows[r+1]=rows[r+1]||[]).push([c,cell(colName(c)+(r+1),x,x.b)]);}));
    else{const all=new Set([...Object.keys(sh.cells),...Object.keys(sh.formulas||{})]);
      for(const k of all){const p=pos(k);maxC=Math.max(maxC,p.c);
        const isF=sh.formulas&&sh.formulas[k];(rows[p.r]=rows[p.r]||[]).push([p.c,cell(k,sh.cells[k],sh.head&&p.r===1,isF,isF&&sh.fmts&&sh.fmts[k])]);}}
    const body=Object.keys(rows).map(Number).sort((a,b)=>a-b).map(r=>`<row r="${r}">${rows[r].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join("")}</row>`).join("");
    const cols=sh.widths?`<cols>${sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols>`:`<cols><col min="1" max="${maxC+1}" width="16" customWidth="1"/></cols>`;
    return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${body}</sheetData></worksheet>`;
  });
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${fmts.length?`<numFmts count="${fmts.length}">${fmts.map((f,i)=>`<numFmt numFmtId="${164+i}" formatCode="${xe(f)}"/>`).join("")}</numFmts>`:""}<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.map(([nf,b])=>`<xf numFmtId="${nf}" fontId="${b}" fillId="0" borderId="0" xfId="0"${nf?` applyNumberFormat="1"`:""}${b?` applyFont="1"`:""}/>`).join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const files=[
    ["[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${wb.sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="${wb.active||0}"/></bookViews><sheets>${wb.sheets.map((s,i)=>`<sheet name="${xe(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ["xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wb.sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${wb.sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml",styles],
    ...sheetsXml.map((x,i)=>[`xl/worksheets/sheet${i+1}.xml`,x])
  ];
  return zip(files);
}

/* ---------- zip ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xffffffff;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return(c^0xffffffff)>>>0;};
function zip(files){
  const parts=[],central=[];let off=0;const DT=0x5821,DD=0x5a6f;
  for(const[name,text]of files){
    const raw=Buffer.from(text,"utf8"),comp=zlib.deflateRawSync(raw,{level:9}),nm=Buffer.from(name,"utf8"),crc=crc32(raw);
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x0800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(DT,10);h.writeUInt16LE(DD,12);
    h.writeUInt32LE(crc,14);h.writeUInt32LE(comp.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(nm.length,26);h.writeUInt16LE(0,28);
    parts.push(h,nm,comp);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x0800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(DT,12);c.writeUInt16LE(DD,14);
    c.writeUInt32LE(crc,16);c.writeUInt32LE(comp.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(nm.length,28);c.writeUInt32LE(off,42);
    central.push(c,nm);off+=30+nm.length+comp.length;
  }
  const cd=Buffer.concat(central),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(files.length,8);e.writeUInt16LE(files.length,10);e.writeUInt32LE(cd.length,12);e.writeUInt32LE(off,16);
  return Buffer.concat([...parts,cd,e]);
}
