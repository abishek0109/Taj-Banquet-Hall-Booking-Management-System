import { useEffect, useState } from 'react'
import { Plus, Package, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPackages, createPackage, updatePackage, deletePackage } from '../api/client.js'

const inr = v => `₹${Number(v).toLocaleString('en-IN')}`
const EMPTY = { package_name: '', base_price: '', capacity: '' }

export default function Packages() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [formErr, setFormErr]   = useState('')
  const [saving, setSaving]     = useState(false)

  const load = () => {
    setLoading(true)
    getPackages()
      .then(r => setPackages(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setFormErr(''); setModal(true) }
  const openEdit = p  => { setEditing(p); setForm({ package_name: p.package_name, base_price: p.base_price, capacity: p.capacity }); setFormErr(''); setModal(true) }
  const close    = () => { setModal(false); setFormErr('') }

  const handleSubmit = async () => {
    setFormErr(''); setSaving(true)
    try {
      if (editing) { await updatePackage(editing.package_id, form); toast.success('Package updated') }
      else         { await createPackage(form); toast.success('Package created') }
      load(); close()
    } catch(e) { setFormErr(e.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async p => {
    if (!window.confirm(`Delete package "${p.package_name}"?`)) return
    try { await deletePackage(p.package_id); toast.success('Deleted'); load() }
    catch(e) { toast.error(e.response?.data?.error || 'Cannot delete') }
  }

  const TIER_COLORS = ['#558b2f','#0277bd','#c9a84c','#6a1b9a','#ad1457']

  return (
    <div>
      <div className="toolbar">
        <div style={{ flex:1 }} />
        <button className="btn btn-gold" onClick={openAdd}><Plus size={14} /> Add Package</button>
      </div>

      {/* Package cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16, marginBottom:24 }}>
        {packages.map((p, i) => (
          <div key={p.package_id} className="card" style={{ borderTop:`4px solid ${TIER_COLORS[i%5]}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'var(--navy)' }}>{p.package_name}</div>
                <div style={{ fontSize:22, fontWeight:700, color: TIER_COLORS[i%5], marginTop:4 }}>{inr(p.base_price)}</div>
                <div style={{ fontSize:12, color:'var(--text-lt)', marginTop:2 }}>Up to {p.capacity} guests</div>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                <button className="btn-icon" onClick={() => openEdit(p)}><Pencil size={13}/></button>
                <button className="btn-icon" onClick={() => handleDelete(p)}><Trash2 size={13}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table view */}
      <div className="card">
        <div className="card-title"><Package size={15} /> All Packages</div>
        {loading ? <div className="spinner" /> : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Package Name</th><th>Base Price</th><th>Capacity</th><th>Actions</th></tr></thead>
              <tbody>
                {packages.map(p => (
                  <tr key={p.package_id}>
                    <td>{p.package_id}</td>
                    <td style={{ fontWeight:600 }}>{p.package_name}</td>
                    <td style={{ color:'var(--gold)', fontWeight:600 }}>{inr(p.base_price)}</td>
                    <td>{p.capacity} guests</td>
                    <td>
                      <button className="btn-icon" onClick={() => openEdit(p)}><Pencil size={14}/></button>
                      <button className="btn-icon" onClick={() => handleDelete(p)}><Trash2 size={14}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editing ? 'Edit Package' : 'Add Package'}</h2>
              <button className="btn-icon" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              {formErr && <div className="alert alert-error">{formErr}</div>}
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Package Name *</label>
                  <input value={form.package_name} onChange={e=>setForm({...form,package_name:e.target.value})} placeholder="e.g. Gold Hall" />
                </div>
                <div className="form-group">
                  <label>Base Price (₹) *</label>
                  <input type="number" min={0} value={form.base_price} onChange={e=>setForm({...form,base_price:e.target.value})} placeholder="60000" />
                </div>
                <div className="form-group">
                  <label>Capacity (guests) *</label>
                  <input type="number" min={1} value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} placeholder="250" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-gold" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Add Package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

