import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom'
import './index.css'

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-sky-600 text-white p-4 shadow">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">Invoice Manager</h1>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="hover:underline">Dashboard</a>
            <a href="/customers" className="hover:underline">Customers</a>
            <a href="/invoices" className="hover:underline">Invoices</a>
            <a href="/expenses" className="hover:underline">Expenses</a>
          </nav>
        </div>
      </header>
      <main className="container mx-auto p-4 flex-1">{children}</main>
      <footer className="text-center text-xs text-gray-500 p-4">© {new Date().getFullYear()} Invoice Manager</footer>
    </div>
  )
}

function MonthPicker({ month, setMonth }) {
  const d = new Date(month + '-01')
  const prev = new Date(d); prev.setMonth(d.getMonth()-1)
  const next = new Date(d); next.setMonth(d.getMonth()+1)
  const fmt = (x) => x.toISOString().slice(0,7)
  return (
    <div className="flex items-center gap-2">
      <button className="px-2 py-1 border rounded" onClick={() => setMonth(fmt(prev))}>{'<'}</button>
      <input className="border rounded px-2 py-1" type="month" value={month} onChange={(e)=>setMonth(e.target.value)} />
      <button className="px-2 py-1 border rounded" onClick={() => setMonth(fmt(next))}>{'>'}</button>
    </div>
  )
}

function StatCard({ title, value, subtitle, accent }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-2xl font-semibold ${accent||''}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  )
}

function Dashboard() {
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0,7))
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/dashboard?month=${month}`, { signal: controller.signal })
        if (!res.ok) throw new Error(await res.text())
        setData(await res.json())
      } catch (e) {
        if (e.name !== 'AbortError') setError(e.message)
      } finally { setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [month])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <MonthPicker month={month} setMonth={setMonth} />
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Faturalar (Toplam)" value={`₺ ${data.invoices.total.toLocaleString()}`} subtitle={`${data.invoices.count} adet`} />
          <StatCard title="Ödenen" value={`₺ ${data.invoices.paidTotal.toLocaleString()}`} subtitle={`${data.invoices.paidCount} adet`} accent="text-green-600" />
          <StatCard title="Ödenmeyen" value={`₺ ${data.invoices.unpaidTotal.toLocaleString()}`} subtitle={`${data.invoices.unpaidCount} adet`} accent="text-amber-600" />

          <div className="md:col-span-2 rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">Masraflar</div>
            <div className="text-2xl font-semibold">₺ {data.expenses.total.toLocaleString()}</div>
            <div className="mt-3 text-xs text-gray-500">Top 3:</div>
            <ul className="text-sm list-disc ml-5 mt-1">
              {data.expenses.top3.map((e,i)=> (
                <li key={i}>{e.label || 'Diğer'}: ₺ {Number(e.amount).toLocaleString()}</li>
              ))}
            </ul>
          </div>

          <StatCard title="Kar / Zarar" value={`₺ ${(data.profitLoss).toLocaleString()}`} accent={data.profitLoss>=0? 'text-emerald-700':'text-rose-700'} />
        </div>
      )}
    </Layout>
  )
}

function ListPage({ title, createLabel, fetchPath, columns, renderRow }) {
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [open, setOpen] = React.useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(fetchPath)
      if (!res.ok) throw new Error(await res.text())
      setItems(await res.json())
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }
  React.useEffect(()=>{ load() },[])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button className="bg-sky-600 text-white px-3 py-2 rounded" onClick={()=>setOpen(true)}>{createLabel}</button>
      </div>
      {loading ? 'Loading...' : (
        <div className="overflow-auto rounded border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>{columns.map((c,i)=> <th key={i} className="px-3 py-2 font-medium">{c}</th>)}</tr>
            </thead>
            <tbody>
              {items.map(renderRow)}
            </tbody>
          </table>
        </div>
      )}
      {error && <div className="text-red-600 mt-2">{error}</div>}
      {open && <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
        <div className="bg-white p-4 rounded shadow w-full max-w-lg">
          <button className="float-right text-gray-500" onClick={()=>setOpen(false)}>✕</button>
          <div className="clear-both mt-2">
            {/* Slot */}
          </div>
        </div>
      </div>}
    </Layout>
  )
}

function Customers() {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState([])

  async function load(){
    const r = await fetch('/api/customers'); setItems(await r.json())
  }
  React.useEffect(()=>{ load() },[])

  async function onSubmit(e){
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form.entries())
    const r = await fetch('/api/customers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    if(r.ok){ setOpen(false); await load() }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Müşteriler</h2>
        <button className="bg-sky-600 text-white px-3 py-2 rounded" onClick={()=>setOpen(true)}>Yeni Müşteri</button>
      </div>
      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Ad</th>
              <th className="px-3 py-2 text-left">E-posta</th>
              <th className="px-3 py-2 text-left">Telefon</th>
              <th className="px-3 py-2 text-left">Firma</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c)=> (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.name}</td>
                <td className="px-3 py-2">{c.email}</td>
                <td className="px-3 py-2">{c.phone}</td>
                <td className="px-3 py-2">{c.company}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form onSubmit={onSubmit} className="bg-white p-4 rounded shadow w-full max-w-md space-y-3">
            <div className="text-lg font-semibold">Yeni Müşteri</div>
            <input required name="name" placeholder="Ad" className="w-full border rounded px-3 py-2" />
            <input name="email" placeholder="E-posta" className="w-full border rounded px-3 py-2" />
            <input name="phone" placeholder="Telefon" className="w-full border rounded px-3 py-2" />
            <input name="company" placeholder="Firma" className="w-full border rounded px-3 py-2" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setOpen(false)} className="px-3 py-2 border rounded">İptal</button>
              <button className="px-3 py-2 bg-sky-600 text-white rounded">Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  )
}

function Invoices() {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState([])
  const [customers, setCustomers] = React.useState([])

  async function load(){
    const [r1, r2] = await Promise.all([fetch('/api/invoices'), fetch('/api/customers')])
    setItems(await r1.json()); setCustomers(await r2.json())
  }
  React.useEffect(()=>{ load() },[])

  async function onSubmit(e){
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form.entries())
    payload.total = Number(payload.total)
    payload.customerId = Number(payload.customerId)
    payload.paid = payload.paid === 'on'
    const r = await fetch('/api/invoices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    if(r.ok){ setOpen(false); await load() }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Faturalar</h2>
        <button className="bg-sky-600 text-white px-3 py-2 rounded" onClick={()=>setOpen(true)}>Yeni Fatura</button>
      </div>
      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Müşteri</th>
              <th className="px-3 py-2 text-left">Toplam</th>
              <th className="px-3 py-2 text-left">Durum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((inv)=> (
              <tr key={inv.id} className="border-t">
                <td className="px-3 py-2">{inv.date}</td>
                <td className="px-3 py-2">{customers.find(c=>c.id===inv.customer_id)?.name || '-'}</td>
                <td className="px-3 py-2">₺ {Number(inv.total).toLocaleString()}</td>
                <td className="px-3 py-2">{inv.paid ? 'Ödendi' : 'Beklemede'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form onSubmit={onSubmit} className="bg-white p-4 rounded shadow w-full max-w-md space-y-3">
            <div className="text-lg font-semibold">Yeni Fatura</div>
            <label className="block">
              <div className="text-xs text-gray-500 mb-1">Müşteri</div>
              <select required name="customerId" className="w-full border rounded px-3 py-2">
                <option value="">Seçiniz</option>
                {customers.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <input required name="date" type="date" className="w-full border rounded px-3 py-2" />
            <input name="dueDate" type="date" className="w-full border rounded px-3 py-2" />
            <input required name="total" type="number" step="0.01" placeholder="Toplam" className="w-full border rounded px-3 py-2" />
            <label className="flex items-center gap-2 text-sm"><input name="paid" type="checkbox" /> Ödendi</label>
            <textarea name="notes" placeholder="Notlar" className="w-full border rounded px-3 py-2" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setOpen(false)} className="px-3 py-2 border rounded">İptal</button>
              <button className="px-3 py-2 bg-sky-600 text-white rounded">Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  )
}

function Expenses() {
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState([])

  async function load(){
    const r = await fetch('/api/expenses'); setItems(await r.json())
  }
  React.useEffect(()=>{ load() },[])

  async function onSubmit(e){
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form.entries())
    payload.amount = Number(payload.amount)
    const r = await fetch('/api/expenses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
    if(r.ok){ setOpen(false); await load() }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Masraflar</h2>
        <button className="bg-sky-600 text-white px-3 py-2 rounded" onClick={()=>setOpen(true)}>Yeni Masraf</button>
      </div>
      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Tarih</th>
              <th className="px-3 py-2 text-left">Kategori</th>
              <th className="px-3 py-2 text-left">Açıklama</th>
              <th className="px-3 py-2 text-left">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((ex)=> (
              <tr key={ex.id} className="border-t">
                <td className="px-3 py-2">{ex.date}</td>
                <td className="px-3 py-2">{ex.category}</td>
                <td className="px-3 py-2">{ex.description}</td>
                <td className="px-3 py-2">₺ {Number(ex.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <form onSubmit={onSubmit} className="bg-white p-4 rounded shadow w-full max-w-md space-y-3">
            <div className="text-lg font-semibold">Yeni Masraf</div>
            <input required name="date" type="date" className="w-full border rounded px-3 py-2" />
            <input name="category" placeholder="Kategori" className="w-full border rounded px-3 py-2" />
            <input name="description" placeholder="Açıklama" className="w-full border rounded px-3 py-2" />
            <input required name="amount" type="number" step="0.01" placeholder="Tutar" className="w-full border rounded px-3 py-2" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setOpen(false)} className="px-3 py-2 border rounded">İptal</button>
              <button className="px-3 py-2 bg-sky-600 text-white rounded">Kaydet</button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  )
}

const router = createBrowserRouter([
  { path: '/', element: <Dashboard/> },
  { path: '/customers', element: <Customers/> },
  { path: '/invoices', element: <Invoices/> },
  { path: '/expenses', element: <Expenses/> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
