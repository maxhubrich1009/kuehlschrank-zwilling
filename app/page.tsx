'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, ChevronRight, CirclePlus, ClipboardList, Minus, Plus, ShoppingCart, Trash2, TrendingDown, X } from 'lucide-react';

type Unit = 'Stück' | 'l' | 'kg' | 'g';
type EventType = 'CONSUMPTION' | 'CORRECTION' | 'ADD';

type Product = {
  id: string; name: string; category: string; quantity: number; unit: Unit; expiry: string; minQuantity: number; avgDailyConsumption: number; createdAt: string;
};
type Event = { id: string; productId: string; type: EventType; delta: number; source: 'MANUAL' | 'RECIPE' | 'CAMERA' | 'BARCODE' | 'SENSOR'; confidence: number; createdAt: string };

const seedProducts: Product[] = [
  { id:'milk', name:'Milch', category:'Milchprodukte', quantity:1.2, unit:'l', expiry:'2026-10-04', minQuantity:0.5, avgDailyConsumption:0.25, createdAt:'2026-09-29' },
  { id:'eggs', name:'Eier', category:'Milchprodukte', quantity:6, unit:'Stück', expiry:'2026-10-09', minQuantity:4, avgDailyConsumption:0.35, createdAt:'2026-09-28' },
  { id:'butter', name:'Butter', category:'Milchprodukte', quantity:0.18, unit:'kg', expiry:'2026-10-18', minQuantity:0.08, avgDailyConsumption:0.012, createdAt:'2026-09-27' },
  { id:'cheese', name:'Gouda', category:'Käse', quantity:0.25, unit:'kg', expiry:'2026-10-03', minQuantity:0.1, avgDailyConsumption:0.025, createdAt:'2026-09-25' },
  { id:'yogurt', name:'Naturjoghurt', category:'Milchprodukte', quantity:2, unit:'Stück', expiry:'2026-10-02', minQuantity:2, avgDailyConsumption:0.25, createdAt:'2026-09-30' },
  { id:'tomatoes', name:'Tomaten', category:'Gemüse', quantity:0.5, unit:'kg', expiry:'2026-10-05', minQuantity:0.2, avgDailyConsumption:0.08, createdAt:'2026-09-30' },
];

const seedEvents: Event[] = [
  { id:'e1', productId:'milk', type:'CONSUMPTION', delta:-0.5, source:'MANUAL', confidence:1, createdAt:'2026-09-30T19:00:00' },
  { id:'e2', productId:'eggs', type:'CONSUMPTION', delta:-2, source:'MANUAL', confidence:1, createdAt:'2026-09-30T18:30:00' },
  { id:'e3', productId:'tomatoes', type:'CONSUMPTION', delta:-0.25, source:'MANUAL', confidence:1, createdAt:'2026-09-29T20:00:00' },
];

const fmt = (n:number) => new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n);
const daysUntil = (date:string) => Math.ceil((new Date(date+'T23:59:59').getTime()-new Date('2026-10-01T12:00:00').getTime())/86400000);

export default function Home() {
  const [products,setProducts] = useState<Product[]>(seedProducts);
  const [events,setEvents] = useState<Event[]>(seedEvents);
  const [active,setActive] = useState<'overview'|'inventory'|'history'|'shopping'>('overview');
  const [showAdd,setShowAdd] = useState(false);
  const [selected,setSelected] = useState<Product|null>(null);
  const [toast,setToast] = useState('');

  useEffect(()=>{
    const p=localStorage.getItem('kz-products'), e=localStorage.getItem('kz-events');
    if(p) setProducts(JSON.parse(p)); if(e) setEvents(JSON.parse(e));
  },[]);
  useEffect(()=>{ localStorage.setItem('kz-products',JSON.stringify(products)); localStorage.setItem('kz-events',JSON.stringify(events)); },[products,events]);

  const expiring = useMemo(()=>products.filter(p=>daysUntil(p.expiry)<=3).sort((a,b)=>a.expiry.localeCompare(b.expiry)),[products]);
  const low = useMemo(()=>products.filter(p=>p.quantity<=p.minQuantity),[products]);
  const shopping = [...new Set(low.map(p=>p.name))];

  function changeQuantity(p:Product, delta:number) {
    const next=Math.max(0, +(p.quantity+delta).toFixed(3));
    const actual=+(next-p.quantity).toFixed(3);
    if(actual===0) return;
    setProducts(xs=>xs.map(x=>x.id===p.id?{...x,quantity:next}:x));
    setEvents(es=>[{id:crypto.randomUUID(),productId:p.id,type:'CONSUMPTION',delta:actual,source:'MANUAL',confidence:1,createdAt:new Date().toISOString()},...es]);
    setToast(`${p.name}: ${actual<0?'Verbrauch':'Korrektur'} erfasst`); setTimeout(()=>setToast(''),1800);
  }

  function addProduct(data:Omit<Product,'id'|'createdAt'>) {
    const id=crypto.randomUUID(); const now=new Date().toISOString();
    setProducts(xs=>[{...data,id,createdAt:now},...xs]);
    setEvents(es=>[{id:crypto.randomUUID(),productId:id,type:'ADD',delta:data.quantity,source:'MANUAL',confidence:1,createdAt:now},...es]);
    setShowAdd(false); setToast(`${data.name} hinzugefügt`); setTimeout(()=>setToast(''),1800);
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brandmark">K</div><div><strong>Kühlschrank</strong><span>Digitaler Zwilling · v0.1</span></div></div>
      <nav>
        <button className={active==='overview'?'active':''} onClick={()=>setActive('overview')}>Übersicht</button>
        <button className={active==='inventory'?'active':''} onClick={()=>setActive('inventory')}>Bestand <b>{products.length}</b></button>
        <button className={active==='history'?'active':''} onClick={()=>setActive('history')}>Verbrauch</button>
        <button className={active==='shopping'?'active':''} onClick={()=>setActive('shopping')}>Einkaufsliste {shopping.length>0&&<b>{shopping.length}</b>}</button>
      </nav>
      <div className="v01"><span>VERSION</span><strong>0.1 MVP</strong><small>Variante 1 · manuelle Mengenänderung</small></div>
    </aside>

    <section className="content">
      <header className="topbar"><div><span className="eyebrow">MEIN KÜHLSCHRANK</span><h1>{active==='overview'?'Guten Morgen.':active==='inventory'?'Bestand':active==='history'?'Verbrauchshistorie':'Einkaufsliste'}</h1></div><button className="primary" onClick={()=>setShowAdd(true)}><CirclePlus size={18}/> Produkt hinzufügen</button></header>

      {active==='overview' && <>
        <div className="hero-grid">
          <section className="hero card"><div><span className="eyebrow">BESTAND AKTUELL</span><div className="hero-number">{products.length}<span> Produkte</span></div><p>Dein digitaler Kühlschrank ist aktuell erfasst.</p></div><div className="ring"><span>{Math.max(0,products.filter(p=>p.quantity>p.minQuantity).length)}</span><small>ok</small></div></section>
          <Metric icon={<CalendarClock/>} label="MHD ≤ 3 Tage" value={expiring.length} tone={expiring.length?'warning':''}/>
          <Metric icon={<ShoppingCart/>} label="Nachkaufen" value={shopping.length} tone={shopping.length?'warning':''}/>
        </div>
        <div className="section-head"><div><h2>Demnächst verbrauchen</h2><p>Produkte mit nahendem Mindesthaltbarkeitsdatum</p></div><button className="text-button" onClick={()=>setActive('inventory')}>Alle anzeigen <ChevronRight size={16}/></button></div>
        <div className="product-grid">{expiring.map(p=><ProductCard key={p.id} p={p} onSelect={setSelected} onChange={changeQuantity}/>)}</div>
        <div className="section-head"><div><h2>Verbrauch</h2><p>Zuletzt dokumentierte Abgänge</p></div><button className="text-button" onClick={()=>setActive('history')}>Historie <ChevronRight size={16}/></button></div>
        <div className="activity card">{events.slice(0,5).map(e=><EventRow key={e.id} e={e} product={products.find(p=>p.id===e.productId)}/>)}</div>
      </>}

      {active==='inventory' && <Inventory products={products} onSelect={setSelected} onChange={changeQuantity}/>} 
      {active==='history' && <History events={events} products={products}/>} 
      {active==='shopping' && <Shopping products={products} onChange={changeQuantity}/>} 
    </section>

    {showAdd&&<AddModal onClose={()=>setShowAdd(false)} onAdd={addProduct}/>} 
    {selected&&<DetailModal p={selected} onClose={()=>setSelected(null)} onChange={changeQuantity}/>} 
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </main>
}

function Metric({icon,label,value,tone}:{icon:React.ReactNode;label:string;value:number;tone?:string}){return <div className="metric card"><div className={'metric-icon '+tone}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>}
function ProductCard({p,onSelect,onChange}:{p:Product;onSelect:(p:Product)=>void;onChange:(p:Product,d:number)=>void}){const d=daysUntil(p.expiry);return <div className="product card"><button className="product-main" onClick={()=>onSelect(p)}><div className="product-icon">{p.category==='Gemüse'?'🍅':p.name==='Eier'?'🥚':p.name==='Milch'?'🥛':p.name==='Butter'?'🧈':p.name==='Gouda'?'🧀':'🥣'}</div><div className="product-info"><strong>{p.name}</strong><span>{fmt(p.quantity)} {p.unit}</span><small className={d<=1?'danger':''}>{d<0?'MHD überschritten':d===0?'MHD heute':`MHD in ${d} Tagen`}</small></div></button><div className="stepper"><button onClick={()=>onChange(p,-(p.unit==='Stück'?1:p.unit==='l'?0.25:p.unit==='kg'?0.05:50))}><Minus size={15}/></button><button onClick={()=>onChange(p,p.unit==='Stück'?1:p.unit==='l'?0.25:p.unit==='kg'?0.05:50)}><Plus size={15}/></button></div></div>}
function EventRow({e,product}:{e:Event;product?:Product}){if(!product)return null;return <div className="event-row"><div className="event-dot">{e.type==='CONSUMPTION'?<TrendingDown size={16}/>:<Plus size={16}/>}</div><div><strong>{product.name}</strong><span>{e.source==='MANUAL'?'Manuell':e.source}</span></div><b className={e.delta<0?'negative':'positive'}>{e.delta>0?'+':''}{fmt(e.delta)} {product.unit}</b><time>{new Date(e.createdAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</time></div>}
function Inventory({products,onSelect,onChange}:{products:Product[];onSelect:(p:Product)=>void;onChange:(p:Product,d:number)=>void}){return <><div className="section-head no-top"><div><h2>Alle Produkte</h2><p>Menge direkt am Bestand ändern.</p></div></div><div className="inventory-list">{products.map(p=><ProductCard key={p.id} p={p} onSelect={onSelect} onChange={onChange}/>)}</div></>}
function History({events,products}:{events:Event[];products:Product[]}){return <div className="activity card">{events.map(e=><EventRow key={e.id} e={e} product={products.find(p=>p.id===e.productId)}/>)}</div>}
function Shopping({products,onChange}:{products:Product[];onChange:(p:Product,d:number)=>void}){const low=products.filter(p=>p.quantity<=p.minQuantity);return <div className="shopping card">{low.length===0?<div className="empty"><Check/><h3>Alles vorhanden</h3><p>Aktuell gibt es keine automatisch erzeugten Nachkäufe.</p></div>:low.map(p=><div className="shopping-row" key={p.id}><div><strong>{p.name}</strong><span>Noch {fmt(p.quantity)} {p.unit} · Mindestbestand {fmt(p.minQuantity)} {p.unit}</span></div><button onClick={()=>onChange(p, p.unit==='Stück'?1:p.unit==='l'?1:p.unit==='kg'?0.5:500)}><Plus size={16}/> Nachkauf erfassen</button></div>)}</div>}
function AddModal({onClose,onAdd}:{onClose:()=>void;onAdd:(d:Omit<Product,'id'|'createdAt'>)=>void}){const [name,setName]=useState('');const [qty,setQty]=useState('1');const [unit,setUnit]=useState<Unit>('Stück');const [expiry,setExpiry]=useState('2026-10-15');const [category,setCategory]=useState('Sonstiges');const [min,setMin]=useState('0');const [avg,setAvg]=useState('0');return <div className="overlay"><div className="modal"><button className="close" onClick={onClose}><X/></button><span className="eyebrow">NEUER BESTAND</span><h2>Produkt hinzufügen</h2><p>Erfasse den Startbestand für deinen digitalen Zwilling.</p><label>Produktname<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="z. B. Hafermilch"/></label><div className="two"><label>Menge<input type="number" step="0.01" value={qty} onChange={e=>setQty(e.target.value)}/></label><label>Einheit<select value={unit} onChange={e=>setUnit(e.target.value as Unit)}><option>Stück</option><option>l</option><option>kg</option><option>g</option></select></label></div><div className="two"><label>MHD<input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)}/></label><label>Kategorie<input value={category} onChange={e=>setCategory(e.target.value)}/></label></div><div className="two"><label>Mindestbestand<input type="number" step="0.01" value={min} onChange={e=>setMin(e.target.value)}/></label><label>Ø Verbrauch/Tag<input type="number" step="0.01" value={avg} onChange={e=>setAvg(e.target.value)}/></label></div><button className="primary full" disabled={!name.trim()} onClick={()=>onAdd({name:name.trim(),category,quantity:Number(qty)||0,unit,expiry,minQuantity:Number(min)||0,avgDailyConsumption:Number(avg)||0})}><Plus size={18}/> Produkt anlegen</button></div></div>}
function DetailModal({p,onClose,onChange}:{p:Product;onClose:()=>void;onChange:(p:Product,d:number)=>void}){const d=daysUntil(p.expiry);const forecast=p.avgDailyConsumption>0?Math.floor(p.quantity/p.avgDailyConsumption):null;return <div className="overlay"><div className="modal detail"><button className="close" onClick={onClose}><X/></button><div className="detail-icon">{p.name==='Milch'?'🥛':p.name==='Eier'?'🥚':'🍽️'}</div><h2>{p.name}</h2><span className="pill">{p.category}</span><div className="big-quantity"><strong>{fmt(p.quantity)}</strong> {p.unit}</div><div className="detail-stats"><div><span>MHD</span><strong className={d<=3?'danger':''}>{new Date(p.expiry).toLocaleDateString('de-DE')}</strong></div><div><span>Prognose</span><strong>{forecast!==null?`~${forecast} Tage`:'–'}</strong></div><div><span>Mindestbestand</span><strong>{fmt(p.minQuantity)} {p.unit}</strong></div></div><div className="detail-actions"><button onClick={()=>onChange(p,-(p.unit==='Stück'?1:p.unit==='l'?0.25:p.unit==='kg'?0.05:50))}><Minus/> Verbrauch</button><button onClick={()=>onChange(p,p.unit==='Stück'?1:p.unit==='l'?0.25:p.unit==='kg'?0.05:50)}><Plus/> Bestand</button></div></div></div>}
