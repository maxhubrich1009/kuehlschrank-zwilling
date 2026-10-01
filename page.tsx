'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, ChevronDown, ChevronRight, CirclePlus, Minus, Plus, ShoppingCart, TrendingDown, X } from 'lucide-react';

type Category =
  | 'Milchprodukte' | 'Fleisch' | 'Fisch' | 'Eier' | 'Obst & Gemüse'
  | 'Brot & Backwaren' | 'Konserven' | 'Grundnahrungsmittel' | 'Getränke'
  | 'Aufstriche & Saucen' | 'Snacks & Süßes' | 'Tiefkühl' | 'Sonstiges';
type BaseUnit = 'g' | 'ml' | 'Stück';
type EventType = 'PURCHASE' | 'CONSUMPTION' | 'WASTE' | 'ADJUSTMENT';
type EventSource = 'MANUAL' | 'BARCODE' | 'CAMERA_AI' | 'WEIGHT_SENSOR' | 'SMART_DEVICE' | 'RECIPE';
type ExpiryStatus = 'no_expiry' | 'expiry_unknown' | 'expiry_date';

type Product = {
  id: string;
  name: string;
  category: Category;
  unit: BaseUnit;
  packSize?: number;
  brand?: string;
  imageUrl?: string;
  icon?: string;
  createdAt: string;
};

type Stock = {
  id: string;
  productId: string;
  quantity: number;
  expiryStatus: ExpiryStatus;
  expiryDate?: string;
  location: string;
  minQuantity: number;
  createdAt: string;
  updatedAt: string;
};

type Event = {
  id: string;
  productId: string;
  stockId: string;
  type: EventType;
  delta: number;
  source: EventSource;
  confidence: number;
  createdAt: string;
};

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'Milchprodukte', label: 'Milchprodukte', icon: '🥛' },
  { value: 'Fleisch', label: 'Fleisch', icon: '🥩' },
  { value: 'Fisch', label: 'Fisch', icon: '🐟' },
  { value: 'Eier', label: 'Eier', icon: '🥚' },
  { value: 'Obst & Gemüse', label: 'Obst & Gemüse', icon: '🥬' },
  { value: 'Brot & Backwaren', label: 'Brot & Backwaren', icon: '🥖' },
  { value: 'Konserven', label: 'Konserven', icon: '🥫' },
  { value: 'Grundnahrungsmittel', label: 'Grundnahrungsmittel', icon: '🍚' },
  { value: 'Getränke', label: 'Getränke', icon: '🥤' },
  { value: 'Aufstriche & Saucen', label: 'Aufstriche & Saucen', icon: '🍯' },
  { value: 'Snacks & Süßes', label: 'Snacks & Süßes', icon: '🍫' },
  { value: 'Tiefkühl', label: 'Tiefkühl', icon: '🧊' },
  { value: 'Sonstiges', label: 'Sonstiges', icon: '📦' },
];

const categoryIcon = (category: Category) => CATEGORIES.find(c => c.value === category)?.icon ?? '📦';
const productIcon = (p: Product) => {
  const n = p.name.toLowerCase();
  const specific: Record<string, string> = { butter: '🧈', milch: '🥛', eier: '🥚', gouda: '🧀', käse: '🧀', joghurt: '🥣', tomaten: '🍅', paprika: '🫑', gurke: '🥒', brot: '🍞' };
  return specific[n] ?? categoryIcon(p.category);
};

const fmt = (n: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n);
const dateOnly = (d = new Date()) => d.toISOString().slice(0, 10);
const normalizeName = (name: string) => name.trim().toLocaleLowerCase('de-DE');
const daysUntil = (date?: string) => date ? Math.ceil((new Date(date + 'T23:59:59').getTime() - Date.now()) / 86400000) : null;
const eventLabel = (type: EventType) => ({ PURCHASE: 'Einkauf', CONSUMPTION: 'Verbrauch', WASTE: 'Verderb', ADJUSTMENT: 'Anpassung' }[type]);
const sourceLabel = (source: EventSource) => ({ MANUAL: 'Manuell', CAMERA_AI: 'Kamera/KI', BARCODE: 'Barcode', WEIGHT_SENSOR: 'Gewichtssensor', SMART_DEVICE: 'Smart Device', RECIPE: 'Rezept' }[source]);

function toBaseUnit(value: number, inputUnit: string): { quantity: number; unit: BaseUnit } {
  if (inputUnit === 'kg') return { quantity: value * 1000, unit: 'g' };
  if (inputUnit === 'g') return { quantity: value, unit: 'g' };
  if (inputUnit === 'l') return { quantity: value * 1000, unit: 'ml' };
  if (inputUnit === 'ml') return { quantity: value, unit: 'ml' };
  return { quantity: value, unit: 'Stück' };
}

function formatQuantity(quantity: number, unit: BaseUnit) {
  if (unit === 'g') {
    if (quantity >= 1000 && quantity % 1000 === 0) return `${fmt(quantity / 1000)} kg`;
    return `${fmt(quantity)} g`;
  }
  if (unit === 'ml') {
    if (quantity >= 1000 && quantity % 1000 === 0) return `${fmt(quantity / 1000)} l`;
    return `${fmt(quantity)} ml`;
  }
  return `${fmt(quantity)} Stück`;
}

function inputStep(unit: BaseUnit) { return unit === 'Stück' ? 1 : unit === 'g' ? 1 : 1; }
function quickDelta(unit: BaseUnit) { return unit === 'Stück' ? 1 : unit === 'g' ? 50 : 100; }

const seedProducts: Product[] = [
  { id: 'milk', name: 'Milch', category: 'Milchprodukte', unit: 'ml', packSize: 1000, createdAt: '2026-09-29' },
  { id: 'eggs', name: 'Eier', category: 'Eier', unit: 'Stück', packSize: 10, createdAt: '2026-09-28' },
  { id: 'butter', name: 'Butter', category: 'Milchprodukte', unit: 'g', packSize: 250, createdAt: '2026-09-27' },
  { id: 'cheese', name: 'Gouda', category: 'Milchprodukte', unit: 'g', packSize: 250, createdAt: '2026-09-25' },
  { id: 'yogurt', name: 'Naturjoghurt', category: 'Milchprodukte', unit: 'Stück', packSize: 4, createdAt: '2026-09-30' },
  { id: 'tomatoes', name: 'Tomaten', category: 'Obst & Gemüse', unit: 'g', packSize: 500, createdAt: '2026-09-30' },
];
const seedStocks: Stock[] = [
  { id: 's-milk', productId: 'milk', quantity: 1200, expiryStatus: 'expiry_date', expiryDate: '2026-10-04', location: 'Kühlschrank', minQuantity: 500, createdAt: '2026-09-29', updatedAt: '2026-09-30' },
  { id: 's-eggs', productId: 'eggs', quantity: 6, expiryStatus: 'expiry_date', expiryDate: '2026-10-09', location: 'Kühlschrank', minQuantity: 4, createdAt: '2026-09-28', updatedAt: '2026-09-30' },
  { id: 's-butter', productId: 'butter', quantity: 180, expiryStatus: 'expiry_date', expiryDate: '2026-10-18', location: 'Kühlschrank', minQuantity: 80, createdAt: '2026-09-27', updatedAt: '2026-09-30' },
  { id: 's-cheese', productId: 'cheese', quantity: 250, expiryStatus: 'expiry_date', expiryDate: '2026-10-03', location: 'Kühlschrank', minQuantity: 100, createdAt: '2026-09-25', updatedAt: '2026-09-30' },
  { id: 's-yogurt', productId: 'yogurt', quantity: 2, expiryStatus: 'expiry_date', expiryDate: '2026-10-02', location: 'Kühlschrank', minQuantity: 2, createdAt: '2026-09-30', updatedAt: '2026-09-30' },
  { id: 's-tomatoes', productId: 'tomatoes', quantity: 500, expiryStatus: 'expiry_date', expiryDate: '2026-10-05', location: 'Kühlschrank', minQuantity: 200, createdAt: '2026-09-30', updatedAt: '2026-09-30' },
];
const seedEvents: Event[] = [
  { id: 'e1', productId: 'milk', stockId: 's-milk', type: 'CONSUMPTION', delta: -500, source: 'MANUAL', confidence: 1, createdAt: '2026-09-30T19:00:00' },
  { id: 'e2', productId: 'eggs', stockId: 's-eggs', type: 'CONSUMPTION', delta: -2, source: 'MANUAL', confidence: 1, createdAt: '2026-09-30T18:30:00' },
  { id: 'e3', productId: 'tomatoes', stockId: 's-tomatoes', type: 'CONSUMPTION', delta: -250, source: 'MANUAL', confidence: 1, createdAt: '2026-09-29T20:00:00' },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [stocks, setStocks] = useState<Stock[]>(seedStocks);
  const [events, setEvents] = useState<Event[]>(seedEvents);
  const [active, setActive] = useState<'overview' | 'inventory' | 'history' | 'shopping'>('overview');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [toast, setToast] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const p = localStorage.getItem('kz-v012-products');
      const s = localStorage.getItem('kz-v012-stocks');
      const e = localStorage.getItem('kz-v012-events');
      if (p && s && e) {
        setProducts(JSON.parse(p)); setStocks(JSON.parse(s)); setEvents(JSON.parse(e));
      } else {
        // Migration from v0.1 localStorage, if present.
        const oldP = localStorage.getItem('kz-products');
        const oldE = localStorage.getItem('kz-events');
        if (oldP) {
          const legacy = JSON.parse(oldP) as Array<{ id: string; name: string; category: string; quantity: number; unit: string; expiry?: string; minQuantity: number; createdAt: string }>;
          const migratedProducts: Product[] = legacy.map(p => {
            const converted = toBaseUnit(p.quantity, p.unit);
            return { id: p.id, name: p.name, category: (CATEGORIES.some(c => c.value === p.category) ? p.category : 'Sonstiges') as Category, unit: converted.unit, createdAt: p.createdAt };
          });
          const migratedStocks: Stock[] = legacy.map(p => {
            const converted = toBaseUnit(p.quantity, p.unit);
            return { id: `stock-${p.id}`, productId: p.id, quantity: converted.quantity, expiryStatus: p.expiry ? 'expiry_date' : 'expiry_unknown', expiryDate: p.expiry || undefined, location: 'Kühlschrank', minQuantity: toBaseUnit(p.minQuantity || 0, p.unit).quantity, createdAt: p.createdAt, updatedAt: new Date().toISOString() };
          });
          const legacyEvents = oldE ? JSON.parse(oldE) as Array<{ id: string; productId: string; type: string; delta: number; source: string; confidence: number; createdAt: string }> : [];
          const migratedEvents: Event[] = legacyEvents.map(e => {
            const product = migratedProducts.find(p => p.id === e.productId);
            const converted = product ? toBaseUnit(e.delta, product.unit) : { quantity: e.delta, unit: 'Stück' as BaseUnit };
            return { id: e.id, productId: e.productId, stockId: `stock-${e.productId}`, type: e.type === 'ADD' ? 'PURCHASE' : e.type === 'CORRECTION' ? 'ADJUSTMENT' : 'CONSUMPTION', delta: converted.quantity, source: e.source === 'CAMERA' ? 'CAMERA_AI' : (['MANUAL', 'BARCODE', 'CAMERA_AI', 'WEIGHT_SENSOR', 'SMART_DEVICE', 'RECIPE'].includes(e.source) ? e.source as EventSource : 'MANUAL'), confidence: e.confidence ?? 1, createdAt: e.createdAt };
          });
          setProducts(migratedProducts); setStocks(migratedStocks); setEvents(migratedEvents);
        }
      }
    } catch { /* Keep seed data if browser storage is malformed. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('kz-v012-products', JSON.stringify(products));
    localStorage.setItem('kz-v012-stocks', JSON.stringify(stocks));
    localStorage.setItem('kz-v012-events', JSON.stringify(events));
  }, [hydrated, products, stocks, events]);

  const stockByProduct = useMemo(() => new Map(stocks.map(s => [s.productId, s])), [stocks]);
  const expiring = useMemo(() => stocks.filter(s => s.expiryStatus === 'expiry_date' && (daysUntil(s.expiryDate) ?? 999) <= 3).sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || '')), [stocks]);
  const low = useMemo(() => stocks.filter(s => s.quantity <= s.minQuantity), [stocks]);
  const shopping = low.length;

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 1800); };

  function changeQuantity(p: Product, delta: number, type?: EventType) {
    const stock = stockByProduct.get(p.id);
    if (!stock) return;
    const next = Math.max(0, +(stock.quantity + delta).toFixed(2));
    const actual = +(next - stock.quantity).toFixed(2);
    if (actual === 0) return;
    const eventType: EventType = type ?? (actual < 0 ? 'CONSUMPTION' : 'PURCHASE');
    setStocks(xs => xs.map(x => x.id === stock.id ? { ...x, quantity: next, updatedAt: new Date().toISOString() } : x));
    setEvents(es => [{ id: crypto.randomUUID(), productId: p.id, stockId: stock.id, type: eventType, delta: actual, source: 'MANUAL', confidence: 1, createdAt: new Date().toISOString() }, ...es]);
    showToast(`${p.name}: ${eventLabel(eventType)} erfasst`);
  }

  function addToExisting(p: Product, inputQuantity: number, inputUnit: string) {
    const stock = stockByProduct.get(p.id);
    if (!stock) return;
    const converted = toBaseUnit(inputQuantity, inputUnit);
    if (converted.unit !== p.unit) { showToast(`Einheit passt nicht zu ${p.name}`); return; }
    const now = new Date().toISOString();
    setStocks(xs => xs.map(x => x.id === stock.id ? { ...x, quantity: +(x.quantity + converted.quantity).toFixed(2), updatedAt: now } : x));
    setEvents(es => [{ id: crypto.randomUUID(), productId: p.id, stockId: stock.id, type: 'PURCHASE', delta: converted.quantity, source: 'MANUAL', confidence: 1, createdAt: now }, ...es]);
    setShowAdd(false); setSelected(p); showToast(`${p.name}: Bestand hinzugefügt`);
  }

  function addProduct(data: { name: string; category: Category; inputQuantity: number; inputUnit: string; packSize?: number; brand?: string; imageUrl?: string; expiryStatus: ExpiryStatus; expiryDate?: string; minQuantity: number }) {
    const existing = products.find(p => normalizeName(p.name) === normalizeName(data.name));
    if (existing) { setSelected(existing); setShowAdd(false); showToast(`${existing.name} ist bereits vorhanden`); return; }
    const converted = toBaseUnit(data.inputQuantity, data.inputUnit);
    const minConverted = toBaseUnit(data.minQuantity, data.inputUnit).quantity;
    const id = crypto.randomUUID(); const now = new Date().toISOString(); const stockId = crypto.randomUUID();
    const product: Product = { id, name: data.name.trim(), category: data.category, unit: converted.unit, packSize: data.packSize ? toBaseUnit(data.packSize, data.inputUnit).quantity : undefined, brand: data.brand?.trim() || undefined, imageUrl: data.imageUrl?.trim() || undefined, createdAt: now };
    const stock: Stock = { id: stockId, productId: id, quantity: converted.quantity, expiryStatus: data.expiryStatus, expiryDate: data.expiryStatus === 'expiry_date' ? data.expiryDate : undefined, location: 'Kühlschrank', minQuantity: minConverted, createdAt: now, updatedAt: now };
    const event: Event = { id: crypto.randomUUID(), productId: id, stockId, type: 'PURCHASE', delta: converted.quantity, source: 'MANUAL', confidence: 1, createdAt: now };
    setProducts(xs => [product, ...xs]); setStocks(xs => [stock, ...xs]); setEvents(es => [event, ...es]); setShowAdd(false); showToast(`${product.name} hinzugefügt`);
  }

  const consumptionStats = useMemo(() => {
    const now = Date.now();
    const result = new Map<string, { d7: number; d30: number }>();
    events.filter(e => e.type === 'CONSUMPTION').forEach(e => {
      const age = (now - new Date(e.createdAt).getTime()) / 86400000;
      const cur = result.get(e.productId) ?? { d7: 0, d30: 0 };
      if (age <= 7) cur.d7 += Math.abs(e.delta);
      if (age <= 30) cur.d30 += Math.abs(e.delta);
      result.set(e.productId, cur);
    });
    return result;
  }, [events]);

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brandmark">K</div><div><strong>Kühlschrank</strong><span>Digitaler Zwilling · v0.1.2</span></div></div>
      <nav>
        <button className={active === 'overview' ? 'active' : ''} onClick={() => setActive('overview')}>Übersicht</button>
        <button className={active === 'inventory' ? 'active' : ''} onClick={() => setActive('inventory')}>Bestand <b>{products.length}</b></button>
        <button className={active === 'history' ? 'active' : ''} onClick={() => setActive('history')}>Verbrauch</button>
        <button className={active === 'shopping' ? 'active' : ''} onClick={() => setActive('shopping')}>Einkaufsliste {shopping > 0 && <b>{shopping}</b>}</button>
      </nav>
      <div className="v01"><span>VERSION</span><strong>0.1.2</strong><small>UX & Datenmodell · manuell</small></div>
    </aside>

    <section className="content">
      <header className="topbar"><div><span className="eyebrow">MEIN KÜHLSCHRANK</span><h1>{active === 'overview' ? 'Guten Morgen.' : active === 'inventory' ? 'Bestand' : active === 'history' ? 'Verbrauch' : 'Einkaufsliste'}</h1></div><button className="primary" onClick={() => setShowAdd(true)}><CirclePlus size={18} /> Produkt hinzufügen</button></header>

      {active === 'overview' && <>
        <div className="hero-grid">
          <section className="hero card"><div><span className="eyebrow">BESTAND AKTUELL</span><div className="hero-number">{products.length}<span> Produkte</span></div><p>Produkte, Bestände und Bewegungen getrennt erfasst.</p></div><div className="ring"><span>{Math.max(0, products.length - low.length)}</span><small>über min.</small></div></section>
          <Metric icon={<CalendarClock />} label="MHD ≤ 3 Tage" value={expiring.length} tone={expiring.length ? 'warning' : ''} />
          <Metric icon={<ShoppingCart />} label="Nachkaufen" value={shopping} tone={shopping ? 'warning' : ''} />
        </div>

        <div className="section-head"><div><h2>Bestand nach Kategorie</h2><p>Auf-/zuklappbar · MHD-Warnungen nur bei echtem MHD</p></div><button className="text-button" onClick={() => setActive('inventory')}>Alle anzeigen <ChevronRight size={16} /></button></div>
        <Inventory products={products} stocks={stocks} onSelect={setSelected} onChange={changeQuantity} compact />

        <div className="section-head"><div><h2>Verbrauch</h2><p>Nach Artikel gebündelt · 7 Tage</p></div><button className="text-button" onClick={() => setActive('history')}>Details <ChevronRight size={16} /></button></div>
        <ConsumptionDashboard products={products} stats={consumptionStats} events={events} />
      </>}

      {active === 'inventory' && <Inventory products={products} stocks={stocks} onSelect={setSelected} onChange={changeQuantity} />}
      {active === 'history' && <ConsumptionDashboard products={products} stats={consumptionStats} events={events} detailed />}
      {active === 'shopping' && <Shopping products={products} stocks={stocks} onChange={changeQuantity} />}
    </section>

    {showAdd && <AddModal products={products} onClose={() => setShowAdd(false)} onAdd={addProduct} onAddExisting={addToExisting} />}
    {selected && <DetailModal p={selected} stock={stockByProduct.get(selected.id)} events={events} onClose={() => setSelected(null)} onChange={changeQuantity} />}
    {toast && <div className="toast"><Check size={16} />{toast}</div>}
  </main>;
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: string }) { return <div className="metric card"><div className={'metric-icon ' + tone}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>; }

function ProductCard({ p, stock, onSelect, onChange }: { p: Product; stock?: Stock; onSelect: (p: Product) => void; onChange: (p: Product, d: number) => void }) {
  if (!stock) return null;
  const d = stock.expiryStatus === 'expiry_date' ? daysUntil(stock.expiryDate) : null;
  const q = quickDelta(p.unit);
  return <div className="product card"><button className="product-main" onClick={() => onSelect(p)}><div className="product-icon">{productIcon(p)}</div><div className="product-info"><strong>{p.name}</strong><span>{formatQuantity(stock.quantity, p.unit)}</span><small className={d !== null && d <= 1 ? 'danger' : ''}>{stock.expiryStatus === 'no_expiry' ? 'Kein MHD' : stock.expiryStatus === 'expiry_unknown' ? 'MHD unbekannt' : d! < 0 ? 'MHD überschritten' : d === 0 ? 'MHD heute' : `MHD in ${d} Tagen`}</small></div></button><div className="stepper"><button title={`-${q}`} onClick={() => onChange(p, -q)}><Minus size={15} /></button><button title={`+${q}`} onClick={() => onChange(p, q)}><Plus size={15} /></button></div></div>;
}

function Inventory({ products, stocks, onSelect, onChange, compact }: { products: Product[]; stocks: Stock[]; onSelect: (p: Product) => void; onChange: (p: Product, d: number) => void; compact?: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(CATEGORIES.map(c => [c.value, true])));
  const stockMap = new Map(stocks.map(s => [s.productId, s]));
  return <div className="category-list">{CATEGORIES.map(cat => {
    const ps = products.filter(p => p.category === cat.value);
    if (!ps.length) return null;
    const isOpen = open[cat.value];
    return <section className="category-block card" key={cat.value}>
      <button className="category-header" onClick={() => setOpen(x => ({ ...x, [cat.value]: !x[cat.value] }))}><span><span className="category-icon">{cat.icon}</span><strong>{cat.label}</strong><em>{ps.length}</em></span>{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>
      {isOpen && <div className={'category-products ' + (compact ? 'compact' : '')}>{ps.map(p => <ProductCard key={p.id} p={p} stock={stockMap.get(p.id)} onSelect={onSelect} onChange={onChange} />)}</div>}
    </section>;
  })}</div>;
}

function ConsumptionDashboard({ products, stats, events, detailed }: { products: Product[]; stats: Map<string, { d7: number; d30: number }>; events: Event[]; detailed?: boolean }) {
  const [period, setPeriod] = useState<7 | 30>(7);
  const rows = products.map(p => ({ p, s: stats.get(p.id) ?? { d7: 0, d30: 0 } })).filter(x => (period === 7 ? x.s.d7 : x.s.d30) > 0).sort((a, b) => (period === 7 ? b.s.d7 - a.s.d7 : b.s.d30 - a.s.d30));
  const [selected, setSelected] = useState<string | null>(null);
  const selectedProduct = products.find(p => p.id === selected);
  const unitEvents = selectedProduct ? events.filter(e => e.productId === selectedProduct.id && e.type === 'CONSUMPTION').slice(0, 20) : [];
  return <div className="consumption-wrap"><div className="period-pills"><button className={period === 7 ? 'pill active-pill' : 'pill'} onClick={() => setPeriod(7)}>7 Tage</button><button className={period === 30 ? 'pill active-pill' : 'pill'} onClick={() => setPeriod(30)}>30 Tage</button></div><div className="consumption-grid">{rows.length === 0 ? <div className="empty card"><TrendingDown /><h3>Noch kein Verbrauch</h3><p>Verbrauch wird automatisch aus den Bewegungen der Produkte aggregiert.</p></div> : rows.map(({ p, s }) => { const avg = s.d7 / 7; return <button className="consumption-card card" key={p.id} onClick={() => setSelected(p.id)}><div className="consumption-icon">{productIcon(p)}</div><div className="consumption-copy"><strong>{p.name}</strong><span>{formatQuantity(period === 7 ? s.d7 : s.d30, p.unit)} in {period} Tagen</span><small>Ø {formatQuantity((period === 7 ? s.d7 : s.d30) / period, p.unit)} / Tag</small></div><ChevronRight size={18} /></button>; })}</div>
    {selectedProduct && <div className="overlay"><div className="modal detail consumption-detail"><button className="close" onClick={() => setSelected(null)}><X /></button><div className="detail-icon">{productIcon(selectedProduct)}</div><h2>{selectedProduct.name}</h2><span className="pill">Verbrauch · 7 Tage</span><div className="big-quantity"><strong>{formatQuantity(stats.get(selectedProduct.id)?.d7 ?? 0, selectedProduct.unit)}</strong></div><div className="detail-stats"><div><span>7 Tage</span><strong>{formatQuantity(stats.get(selectedProduct.id)?.d7 ?? 0, selectedProduct.unit)}</strong></div><div><span>30 Tage</span><strong>{formatQuantity(stats.get(selectedProduct.id)?.d30 ?? 0, selectedProduct.unit)}</strong></div><div><span>Ø / Tag</span><strong>{formatQuantity((stats.get(selectedProduct.id)?.d7 ?? 0) / 7, selectedProduct.unit)}</strong></div></div><div className="section-head detail-head"><div><h2>Aktivitäten</h2></div></div><div className="activity card">{unitEvents.length ? unitEvents.map(e => <EventRow key={e.id} e={e} product={selectedProduct} />) : <div className="empty"><p>Keine Verbrauchsereignisse.</p></div>}</div></div></div>}
    {detailed && <p className="source-note">Verbrauch wird aus <strong>CONSUMPTION</strong>-Events berechnet. Quelle und Confidence bleiben je Bewegung erhalten.</p>}
  </div>;
}

function EventRow({ e, product }: { e: Event; product?: Product }) { if (!product) return null; return <div className="event-row"><div className="event-dot">{e.type === 'CONSUMPTION' ? <TrendingDown size={16} /> : <Plus size={16} />}</div><div><strong>{product.name}</strong><span>{eventLabel(e.type)} · {sourceLabel(e.source)}{e.confidence < 1 ? ` · ${Math.round(e.confidence * 100)}%` : ''}</span></div><b className={e.delta < 0 ? 'negative' : 'positive'}>{e.delta > 0 ? '+' : e.delta < 0 ? '−' : ''}{formatQuantity(Math.abs(e.delta), product.unit)}</b><time>{new Date(e.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></div>; }

function Shopping({ products, stocks, onChange }: { products: Product[]; stocks: Stock[]; onChange: (p: Product, d: number) => void }) { const low = stocks.filter(s => s.quantity <= s.minQuantity); return <div className="shopping card">{low.length === 0 ? <div className="empty"><Check /><h3>Alles vorhanden</h3><p>Aktuell gibt es keine automatisch erzeugten Nachkäufe.</p></div> : low.map(s => { const p = products.find(x => x.id === s.productId); if (!p) return null; const add = p.packSize || (p.unit === 'Stück' ? 1 : p.unit === 'ml' ? 1000 : 500); return <div className="shopping-row" key={s.id}><div><strong>{p.name}</strong><span>Noch {formatQuantity(s.quantity, p.unit)} · Mindestbestand {formatQuantity(s.minQuantity, p.unit)}</span></div><button onClick={() => onChange(p, add)}><Plus size={16} /> Nachkauf erfassen</button></div>; })}</div>; }

function AddModal({ products, onClose, onAdd, onAddExisting }: { products: Product[]; onClose: () => void; onAdd: (d: { name: string; category: Category; inputQuantity: number; inputUnit: string; packSize?: number; brand?: string; imageUrl?: string; expiryStatus: ExpiryStatus; expiryDate?: string; minQuantity: number }) => void; onAddExisting: (p: Product, inputQuantity: number, inputUnit: string) => void }) {
  const [name, setName] = useState(''); const [qty, setQty] = useState('1'); const [unit, setUnit] = useState('Stück'); const [pack, setPack] = useState(''); const [brand, setBrand] = useState(''); const [imageUrl, setImageUrl] = useState(''); const [category, setCategory] = useState<Category>('Sonstiges'); const [min, setMin] = useState('0'); const [expiryStatus, setExpiryStatus] = useState<ExpiryStatus>('expiry_unknown'); const [expiryDate, setExpiryDate] = useState('');
  const existing = products.find(p => normalizeName(p.name) === normalizeName(name));
  return <div className="overlay"><div className="modal"><button className="close" onClick={onClose}><X /></button><span className="eyebrow">NEUER BESTAND</span><h2>{existing ? 'Produkt bereits vorhanden' : 'Produkt hinzufügen'}</h2>{existing ? <><div className="duplicate-box"><div className="product-icon">{productIcon(existing)}</div><div><strong>{existing.name}</strong><span>Dieses Produkt existiert bereits.</span></div></div><p>Es wird kein zweiter Produktstammsatz angelegt. Füge stattdessen direkt Bestand hinzu.</p><div className="two"><label>Menge<input type="number" min="0" step="1" value={qty} onChange={e => setQty(e.target.value)} /></label><label>Einheit<select value={unit} onChange={e => setUnit(e.target.value)}><option value="Stück">Stück</option><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option></select></label></div><button className="primary full" disabled={!Number(qty)} onClick={() => onAddExisting(existing, Number(qty), unit)}>Bestand hinzufügen</button><button className="secondary full" onClick={onClose}>Abbrechen</button></> : <><p>Produktstammdaten und Startbestand werden getrennt gespeichert.</p><label>Produktname<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Hafermilch" /></label><div className="two"><label>Menge<input type="number" min="0" step={inputStep('g')} value={qty} onChange={e => setQty(e.target.value)} /></label><label>Einheit<select value={unit} onChange={e => setUnit(e.target.value)}><option>Stück</option><option>g</option><option>kg</option><option>ml</option><option>l</option></select></label></div><div className="two"><label>Standard-/Packungsgröße<input type="number" min="0" step="1" value={pack} onChange={e => setPack(e.target.value)} placeholder="optional" /></label><label>Kategorie<select value={category} onChange={e => setCategory(e.target.value as Category)}>{CATEGORIES.map(c => <option key={c.value}>{c.value}</option>)}</select></label></div><div className="two"><label>Marke (optional)<input value={brand} onChange={e => setBrand(e.target.value)} placeholder="z. B. Kerrygold" /></label><label>Bild-URL (optional)<input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" /></label></div><div className="two"><label>Mindestbestand<input type="number" min="0" step="1" value={min} onChange={e => setMin(e.target.value)} /></label><label>MHD-Status<select value={expiryStatus} onChange={e => setExpiryStatus(e.target.value as ExpiryStatus)}><option value="expiry_unknown">MHD unbekannt</option><option value="no_expiry">Kein MHD</option><option value="expiry_date">MHD vorhanden</option></select></label></div>{expiryStatus === 'expiry_date' && <label>MHD<input type="date" min={dateOnly()} value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></label>}<button className="primary full" disabled={!name.trim() || (expiryStatus === 'expiry_date' && !expiryDate)} onClick={() => onAdd({ name: name.trim(), category, inputQuantity: Number(qty) || 0, inputUnit: unit, packSize: Number(pack) || undefined, brand, imageUrl, expiryStatus, expiryDate, minQuantity: Number(min) || 0 })}><Plus size={18} /> Produkt anlegen</button></>}</div></div>;
}

function DetailModal({ p, stock, events, onClose, onChange }: { p: Product; stock?: Stock; events: Event[]; onClose: () => void; onChange: (p: Product, d: number) => void }) {
  const [amount, setAmount] = useState('');
  if (!stock) return null;
  const d = stock.expiryStatus === 'expiry_date' ? daysUntil(stock.expiryDate) : null;
  const consumption = events.filter(e => e.productId === p.id && e.type === 'CONSUMPTION' && new Date(e.createdAt).getTime() >= Date.now() - 7 * 86400000).reduce((s, e) => s + Math.abs(e.delta), 0);
  const forecast = consumption > 0 ? Math.floor(stock.quantity / (consumption / 7)) : null;
  const quick = quickDelta(p.unit);
  const value = Number(amount);
  return <div className="overlay"><div className="modal detail"><button className="close" onClick={onClose}><X /></button><div className="detail-icon">{productIcon(p)}</div><h2>{p.name}</h2><span className="pill">{p.category}</span><div className="big-quantity"><strong>{formatQuantity(stock.quantity, p.unit)}</strong></div><div className="detail-stats"><div><span>MHD</span><strong className={d !== null && d <= 3 ? 'danger' : ''}>{stock.expiryStatus === 'no_expiry' ? 'Kein MHD' : stock.expiryStatus === 'expiry_unknown' ? 'Unbekannt' : new Date(stock.expiryDate!).toLocaleDateString('de-DE')}</strong></div><div><span>Prognose</span><strong>{forecast !== null ? `~${forecast} Tage` : '–'}</strong></div><div><span>Mindestbestand</span><strong>{formatQuantity(stock.minQuantity, p.unit)}</strong></div></div><div className="free-quantity"><label>Freie Menge</label><div className="free-row"><input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={p.unit === 'Stück' ? 'z. B. 2' : p.unit === 'g' ? 'z. B. 137' : 'z. B. 250'} /><span>{p.unit}</span></div><div className="quick-row"><button onClick={() => setAmount(String(quick))}>− {formatQuantity(quick, p.unit)}</button><button onClick={() => setAmount(String(quick * 2))}>− {formatQuantity(quick * 2, p.unit)}</button><button onClick={() => setAmount(String(quick))}>+ {formatQuantity(quick, p.unit)}</button></div><div className="free-actions"><button disabled={!value || value <= 0} onClick={() => { onChange(p, -value); setAmount(''); }}><Minus size={16}/> Verbrauch buchen</button><button disabled={!value || value <= 0} onClick={() => { onChange(p, value); setAmount(''); }}><Plus size={16}/> Bestand hinzufügen</button></div></div><p className="detail-note">Intern wird immer in g, ml oder Stück gespeichert. Die Anzeige wandelt automatisch z. B. 0,53 kg in <strong>530 g</strong> um.</p></div></div>;
}
