import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceTemplate } from '../types';
import { Copy, Trash2, Eye, Edit3, Plus, Upload, Save, X, Undo2, Redo2, Bold, Italic, Underline, Merge, Image as ImageIcon, Grid3X3, Type, Minus, Check } from 'lucide-react';

type Cell = { value: string; bold?: boolean; italic?: boolean; underline?: boolean; fontSize?: number; color?: string; background?: string; align?: 'left'|'center'|'right'; vertical?: 'top'|'middle'|'bottom'; border?: boolean; colSpan?: number };
type Sheet = Cell[][];

const COLS = 8;
const ROWS = 24;
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const blankCell = (): Cell => ({ value:'', fontSize:12, color:'#172033', background:'#ffffff', align:'left', vertical:'middle', border:true });
const makeSheet = (): Sheet => Array.from({length:ROWS},()=>Array.from({length:COLS},blankCell));

function starterSheet(): Sheet {
  const s = makeSheet();
  const put=(r:number,c:number,v:string,patch:Partial<Cell>={})=>{s[r][c]={...s[r][c],value:v,...patch}};
  put(1,0,'VIRK ORTHO',{bold:true,fontSize:24,color:'#0b4f8a',background:'#eaf4ff'});
  put(1,1,'ORTHOPEDIC IMPLANTS & INSTRUMENTS',{bold:true,fontSize:14,color:'#123b68',background:'#eaf4ff'});
  put(1,6,'INVOICE',{bold:true,fontSize:24,color:'#123b68',align:'center',background:'#eaf4ff'});
  put(3,0,'BILL TO',{bold:true,fontSize:12,color:'#ffffff',background:'#1264a6'});
  put(3,4,'INVOICE DETAILS',{bold:true,fontSize:12,color:'#ffffff',background:'#1264a6'});
  put(4,0,'Customer:'); put(4,1,'{{clientName}}'); put(4,4,'Invoice No:'); put(4,5,'{{invoiceNumber}}');
  put(5,0,'Phone:'); put(5,1,'{{clientPhone}}'); put(5,4,'Date:'); put(5,5,'{{date}}');
  put(6,0,'Email:'); put(6,1,'{{clientEmail}}'); put(6,4,'Due Date:'); put(6,5,'{{dueDate}}');
  put(7,0,'Address:'); put(7,1,'{{clientAddress}}');
  ['#','Item / Description','Qty','Rate','Disc %','Tax %','Amount',''].forEach((v,c)=>put(9,c,v,{bold:true,color:'#ffffff',background:'#0b3768',align:'center'}));
  put(10,0,'1'); put(10,1,'Orthopedic product / service'); put(10,2,'1'); put(10,3,'{{subtotal}}'); put(10,4,'0'); put(10,5,'0'); put(10,6,'{{grandTotal}}');
  put(11,0,'2'); put(12,0,'3');
  put(15,4,'SUBTOTAL',{bold:true}); put(15,6,'{{subtotal}}',{bold:true,align:'right'});
  put(16,4,'DISCOUNT',{bold:true}); put(16,6,'{{discountTotal}}',{align:'right'});
  put(17,4,'TAX',{bold:true}); put(17,6,'{{taxTotal}}',{align:'right'});
  put(18,4,'SHIPPING',{bold:true}); put(18,6,'{{shippingFee}}',{align:'right'});
  put(19,4,'GRAND TOTAL',{bold:true,color:'#ffffff',background:'#1264a6'}); put(19,6,'{{grandTotal}}',{bold:true,color:'#ffffff',background:'#1264a6',align:'right'});
  put(21,0,'PAYMENT / NOTES',{bold:true,color:'#ffffff',background:'#1264a6'}); put(22,0,'{{paymentDetails}}'); put(23,0,'{{notes}}');
  return s;
}

function cloneSheet(s:Sheet):Sheet { return s.map(r=>r.map(c=>({...c}))); }
function escapeHtml(v:string){return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function sheetToHtml(sheet:Sheet, title:string){
  const rows=sheet.map(row=>`<tr>${row.map(cell=>`<td${cell.colSpan&&cell.colSpan>1?` colspan="${cell.colSpan}"`:''} style="font-size:${cell.fontSize}px;color:${cell.color};background:${cell.background};font-weight:${cell.bold?700:400};font-style:${cell.italic?'italic':'normal'};text-decoration:${cell.underline?'underline':'none'};text-align:${cell.align};vertical-align:${cell.vertical||'middle'};border:${cell.border===false?'none':'1px solid #d6dee8'};padding:6px;min-height:24px">${cell.value ? escapeHtml(cell.value).replace(/\n/g,'<br/>') : '&nbsp;'}</td>`).join('')}</tr>`).join('');
  return `<div style="width:100%;background:#fff;padding:18px;box-sizing:border-box;font-family:Arial,sans-serif"><div style="font-size:10px;color:#64748b;margin-bottom:8px">${escapeHtml(title)}</div><table style="width:100%;border-collapse:collapse;table-layout:fixed"><tbody>${rows}</tbody></table></div>`;
}

const tokens=[
  ['Customer Name','{{clientName}}'],['Invoice Number','{{invoiceNumber}}'],['Date','{{date}}'],['Due Date','{{dueDate}}'],
  ['Phone','{{clientPhone}}'],['Email','{{clientEmail}}'],['Address','{{clientAddress}}'],['Company','{{companyName}}'],
  ['Items Table','{{itemsTable}}'],['Subtotal','{{subtotal}}'],['Discount','{{discountTotal}}'],['Tax','{{taxTotal}}'],['Shipping','{{shippingFee}}'],['Grand Total','{{grandTotal}}'],
  ['Payment Details','{{paymentDetails}}'],['Notes','{{notes}}']
];

export const TemplateManager: React.FC = () => {
  const {templates,activeTemplate,setActiveTemplate,saveTemplate,deleteTemplate,duplicateTemplate,showToast}=useApp();
  const [mode,setMode]=useState<'view'|'edit'|null>(null);
  const [selected,setSelected]=useState<InvoiceTemplate>(activeTemplate||templates[0]);
  const [sheet,setSheet]=useState<Sheet>(starterSheet());
  const [selection,setSelection]=useState({r:1,c:0});
  const [name,setName]=useState('');
  const [formula,setFormula]=useState('');
  const [history,setHistory]=useState<Sheet[]>([]); const [future,setFuture]=useState<Sheet[]>([]);
  const fileInput=useRef<HTMLInputElement>(null);
  const imgInput=useRef<HTMLInputElement>(null);

  const cell=sheet[selection.r]?.[selection.c] || blankCell();
  const selectedRange=`${letters[selection.c]||'A'}${selection.r+1}`;
  const canDelete=templates.length>1;
  const [status,setStatus]=useState('Ready');

  const push=(next:Sheet)=>{setHistory(h=>[...h,cloneSheet(sheet)].slice(-30));setFuture([]);setSheet(next);setStatus('Unsaved changes')};
  const updateCell=(patch:Partial<Cell>)=>push(sheet.map((row,r)=>row.map((x,c)=>(r===selection.r&&c===selection.c)?{...x,...patch}:x)));
  const setValue=(value:string)=>{setFormula(value);push(sheet.map((row,r)=>row.map((x,c)=>(r===selection.r&&c===selection.c)?{...x,value}:x)))};

  const openEditor=(tpl:InvoiceTemplate)=>{
    setSelected(tpl); setName(tpl.name); setMode('edit'); setSelection({r:1,c:0}); setHistory([]); setFuture([]);
    setSheet(tpl.customTemplateCode ? starterSheet() : starterSheet());
  };
  const openView=(tpl:InvoiceTemplate)=>{setSelected(tpl);setName(tpl.name);setMode('view');setSheet(starterSheet());setSelection({r:1,c:0});};
  const create=()=>{
    const now=new Date().toISOString();
    const tpl:InvoiceTemplate={id:`tpl-${Date.now()}`,name:'New Template',description:'Visual spreadsheet-style invoice template.',category:'custom',businessDetails:{companyName:'My Business',contactPerson:'',email:'',phone:'',address:'',cityStateZip:'',taxNumber:'',website:'',logoUrl:''},currency:{symbol:'Rs.',code:'PKR',position:'prefix'},customFields:[],styling:{themeColor:'#2563eb',fontFamily:'sans',headerLayout:'modern',showBorders:true,showWatermark:false,accentBackground:true},defaultTaxRate:0,defaultPaymentTerms:'Payment due on receipt.',defaultNotes:'Thank you for your business!',paymentDetails:'',createdAt:now,updatedAt:now};
    saveTemplate(tpl); openEditor(tpl); showToast('success','Template Created','Your visual template is ready to edit.');
  };
  const custom=()=>create();
  const save=()=>{setStatus('Saving...');
    const tpl={...selected,name,customTemplateCode:sheetToHtml(sheet,name),updatedAt:new Date().toISOString()};
    saveTemplate(tpl);setSelected(tpl);setActiveTemplate(tpl);showToast('success','Template Saved','Saved successfully.');setStatus('Saved');
  };
  const del=()=>{if(!canDelete){showToast('warning','Cannot Delete','Keep at least one template.');return}deleteTemplate(selected.id);setMode(null)};
  const duplicate=()=>{duplicateTemplate(selected.id);showToast('success','Duplicated','Template copy created.')};
  const undo=()=>{if(!history.length)return;const h=[...history];const prev=h.pop()!;setFuture(f=>[cloneSheet(sheet),...f]);setHistory(h);setSheet(prev)};
  const redo=()=>{if(!future.length)return;const f=[...future];const next=f.shift()!;setHistory(h=>[...h,cloneSheet(sheet)]);setFuture(f);setSheet(next)};
  const addRow=()=>push([...sheet,Array.from({length:COLS},blankCell)]);
  const addCol=()=>push(sheet.map(r=>[...r,blankCell()]));
  const mergeRight=()=>{if(selection.c>=sheet[0].length-1)return;push(sheet.map((r,ri)=>r.map((x,ci)=>{if(ri!==selection.r)return x;if(ci===selection.c)return {...x,colSpan:2};if(ci===selection.c+1)return {...blankCell(),value:''};return x})))};
  const chooseToken=(token:string)=>setValue(token);
  const uploadTemplate=async(file?:File)=>{if(!file)return; const text=await file.text(); setName(file.name.replace(/\.html?$/i,'')||'Imported Template'); setFormula(text.slice(0,200)); showToast('success','Template Imported','Imported file is open; spreadsheet editing remains available.')};
  const uploadImage=(file?:File)=>{if(!file)return;const fr=new FileReader();fr.onload=()=>{updateCell({value:`[Logo: ${String(fr.result)}]`})};fr.readAsDataURL(file)};

  const gridCols=sheet[0]?.length||COLS;

  if(mode){
    return <div className="fixed inset-0 z-[100] bg-[#f3f6fa] flex flex-col">
      <div className="bg-white border-b shadow-sm">
        <div className="h-12 flex items-center gap-4 px-4 border-b">
          <button onClick={()=>setMode(null)} className="px-2 py-1 rounded hover:bg-slate-100"><X size={18}/></button>
          <input value={name} onChange={e=>setName(e.target.value)} className="font-bold text-sm outline-none w-56"/>
          <span className="text-xs text-slate-500">Invoice Template</span>
          <div className="ml-auto flex gap-2">
            <button onClick={undo} className="p-2 border rounded hover:bg-slate-50"><Undo2 size={16}/></button>
            <button onClick={redo} className="p-2 border rounded hover:bg-slate-50"><Redo2 size={16}/></button>
            {mode==='edit'&&<button onClick={save} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"><Save size={16}/>Save</button>}
          </div>
        </div>
        <div className="h-11 flex items-center gap-1 px-3 text-xs border-b overflow-x-auto">
          {['File','Edit','View','Insert','Format','Data'].map(x=><button key={x} className="px-3 py-2 rounded hover:bg-slate-100">{x}</button>)}
        </div>
        <div className="min-h-12 flex items-center gap-1 px-3 py-2 flex-wrap">
          <button onClick={undo} className="tb"><Undo2 size={15}/></button><button onClick={redo} className="tb"><Redo2 size={15}/></button><span className="sep"/>
          <select value={cell.fontSize||12} onChange={e=>updateCell({fontSize:Number(e.target.value)})} className="ctl">{[8,9,10,11,12,14,16,18,20,24,28,32].map(x=><option key={x}>{x}</option>)}</select>
          <button onClick={()=>updateCell({bold:!cell.bold})} className={`tb ${cell.bold?'on':''}`}><Bold size={15}/></button><button onClick={()=>updateCell({italic:!cell.italic})} className={`tb ${cell.italic?'on':''}`}><Italic size={15}/></button><button onClick={()=>updateCell({underline:!cell.underline})} className={`tb ${cell.underline?'on':''}`}><Underline size={15}/></button>
          <label className="tb relative">A<input type="color" value={cell.color||'#172033'} onChange={e=>updateCell({color:e.target.value})} className="absolute inset-0 opacity-0 cursor-pointer"/></label>
          <label className="tb relative">▣<input type="color" value={cell.background||'#ffffff'} onChange={e=>updateCell({background:e.target.value})} className="absolute inset-0 opacity-0 cursor-pointer"/></label>
          <button onClick={()=>updateCell({align:'left'})} className="tb">≡</button><button onClick={()=>updateCell({align:'center'})} className="tb">≡</button><button onClick={()=>updateCell({align:'right'})} className="tb">≡</button>
          <button onClick={()=>updateCell({border:!cell.border})} className="tb">▦</button><button onClick={mergeRight} className="tb"><Merge size={15}/></button>
          <span className="sep"/>
          <button onClick={()=>imgInput.current?.click()} className="tb px-3"><ImageIcon size={15}/>Logo</button><input ref={imgInput} type="file" accept="image/*" hidden onChange={e=>uploadImage(e.target.files?.[0])}/>
          <button onClick={addRow} className="tb px-3">+ Row</button><button onClick={addCol} className="tb px-3">+ Column</button>
          <div className="ml-auto flex items-center gap-2 text-xs"><span className="text-slate-500">Selected:</span><b>{selectedRange}</b></div>
        </div>
        <div className="h-9 bg-slate-50 border-t flex items-center gap-2 px-3">
          <div className="w-14 border bg-white rounded px-2 py-1 text-xs text-center">{selectedRange}</div>
          <span className="text-slate-400">fx</span>
          <input value={formula} onChange={e=>{setFormula(e.target.value);}} onKeyDown={e=>{if(e.key==='Enter')setValue(formula)}} onBlur={()=>setValue(formula)} className="flex-1 border bg-white rounded px-2 py-1 text-xs outline-none" placeholder="Enter text or invoice field e.g. {{clientName}}"/>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex">
        <aside className="w-60 bg-white border-r overflow-y-auto p-3 space-y-4">
          <div><div className="font-bold text-sm mb-2">Insert Invoice Field</div><div className="grid grid-cols-2 gap-1.5">{tokens.map(([label,token])=><button key={token} onClick={()=>chooseToken(token)} className="text-[10px] p-2 border rounded hover:bg-indigo-50 text-left">{label}</button>)}</div></div>
          <div><div className="font-bold text-sm mb-2">Template</div><label className="w-full flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-xs cursor-pointer hover:bg-slate-50"><Upload size={14}/> Import HTML/TXT<input ref={fileInput} type="file" accept=".html,.htm,.txt" hidden onChange={e=>{uploadTemplate(e.target.files?.[0]);e.currentTarget.value=''}}/></label></div>
        </aside>
        <main className="flex-1 overflow-auto p-8">
          <div className="mx-auto bg-white shadow-xl border" style={{width:780,minHeight:920}}>
            <div className="flex bg-slate-100 sticky top-0 z-10 border-b">
              <div className="w-10"/><div className="grid" style={{gridTemplateColumns:`repeat(${gridCols}, 1fr)`,flex:1}}>{Array.from({length:gridCols},(_,c)=><div key={c} className="h-7 border-r text-center text-[10px] text-slate-500 py-1">{letters[c]||c+1}</div>)}</div>
            </div>
            <div className="flex">
              <div className="w-10 bg-slate-100">{sheet.map((_,r)=><div key={r} className="h-9 border-b text-center text-[10px] text-slate-500 py-2">{r+1}</div>)}</div>
              <div className="flex-1">
                {sheet.map((row,r)=><div key={r} className="grid" style={{gridTemplateColumns:`repeat(${gridCols},1fr)`}}>{row.map((x,c)=>{
                  const active=selection.r===r&&selection.c===c;
                  return <div key={c} onClick={()=>{setSelection({r,c});setFormula(x.value)}} className={`h-9 border-r border-b relative ${active?'ring-2 ring-inset ring-indigo-500 z-10':''}`} style={{background:x.background,color:x.color,fontWeight:x.bold?700:400,fontStyle:x.italic?'italic':'normal',textDecoration:x.underline?'underline':'none',textAlign:x.align||'left',fontSize:x.fontSize||12,verticalAlign:x.vertical||'middle'}}>
                    <div contentEditable suppressContentEditableWarning onFocus={()=>{setSelection({r,c});setFormula(x.value)}} onInput={e=>{const val=e.currentTarget.textContent||'';setSheet(old=>old.map((rr,ri)=>rr.map((cc,ci)=>ri===r&&ci===c?{...cc,value:val}:cc)));setFormula(val)}} className="w-full h-full px-1.5 py-2 outline-none overflow-hidden whitespace-nowrap">{x.value}</div>
                  </div>})}</div>)}
              </div>
            </div>
          </div>
        </main>
      </div>
      <div className="h-7 bg-[#166534] text-white text-[10px] px-3 flex items-center"><Check size={12} className="mr-1"/> {status}</div>
    </div>
  }

  return <div className="p-6 max-w-7xl mx-auto">
    <div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-bold">Invoice Templates</h1><p className="text-sm text-slate-500 mt-1">Choose a template or create your own visual Excel-style invoice.</p></div><div className="flex gap-2"><button onClick={create} className="px-4 py-2 rounded-lg border bg-white font-semibold flex items-center gap-2"><Plus size={16}/>Create New Template</button><button onClick={custom} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold flex items-center gap-2"><Grid3X3 size={16}/>Custom Template</button></div></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">{templates.map(t=><div key={t.id} className="bg-white rounded-2xl border shadow-sm p-4 hover:shadow-md transition"><div className="h-44 rounded-xl bg-slate-50 border flex items-center justify-center overflow-hidden"><div className="w-[85%] h-[80%] bg-white border shadow-sm p-3"><div className="h-5 bg-slate-100 mb-2"/><div className="h-3 w-2/3 bg-slate-100 mb-2"/><div className="grid grid-cols-4 gap-1">{Array.from({length:16},(_,i)=><div key={i} className="h-3 bg-slate-100"/>)}</div></div></div><div className="mt-3 font-bold truncate">{t.name}</div><div className="text-xs text-slate-500 truncate">{t.description||'Invoice template'}</div><div className="mt-4 grid grid-cols-4 gap-2"><button onClick={()=>openView(t)} className="action"><Eye size={15}/>View</button><button onClick={()=>openEditor(t)} className="action"><Edit3 size={15}/>Edit</button><button onClick={()=>duplicateTemplate(t.id)} className="action"><Copy size={15}/>Copy</button><button onClick={()=>{if(canDelete)deleteTemplate(t.id);}} disabled={!canDelete} className="action text-rose-600 disabled:opacity-30"><Trash2 size={15}/>Delete</button></div><button onClick={()=>{setActiveTemplate(t);showToast('success','Template Selected',t.name)}} className={`mt-2 w-full py-2 rounded-lg text-xs font-bold ${activeTemplate?.id===t.id?'bg-emerald-600 text-white':'bg-indigo-50 text-indigo-700'}`}>{activeTemplate?.id===t.id?'✓ Active Template':'Use Template'}</button></div>)}</div>
    <style>{`.tb{height:32px;min-width:32px;padding:0 8px;border:1px solid #d1d5db;border-radius:6px;background:#fff;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:12px}.tb:hover{background:#f1f5f9}.tb.on{background:#dbeafe;border-color:#60a5fa}.ctl{height:32px;border:1px solid #d1d5db;border-radius:6px;background:#fff;padding:0 8px;font-size:12px}.sep{width:1px;height:24px;background:#d1d5db;display:inline-block;margin:0 3px}.action{height:34px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:5px}.action:hover{background:#f8fafc}`}</style>
  </div>;
};
