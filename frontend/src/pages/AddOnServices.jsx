import { useEffect, useState } from 'react'
import { Plus, Sparkles, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getServices, createService, updateService, deleteService } from '../api/client.js'

const inr = v => `₹${Number(v).toLocaleString('en-IN')}`
const EMPTY = { service_name: '', unit_price: '' }

export default function AddOnServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [formErr, setFormErr]   = useState('')
  const [saving, setSaving]     = useState(false)

  const load = () => {
    setLoading(true)
    getServices()
      .then(r => setServices(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setFormErr(''); setModal(true) }
  const openEdit = s  => { setEditing(s); setForm({ service_name: s.service_name, unit_price: s.unit_price }); setFormErr(''); setModal(true) }
  const close    = () => { setModal(false); setFormErr('') }

  const handleSubmit = async () => {
    setFormErr(''); setSaving(true)
    try {
      if (editing) { await updateService(editing.service_id, form); toast.success('Service updated') }
      else         { await createService(form); toast.success('Service added') }
      load(); close()
    } catch(e) { setFormErr(e.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async s => {
    if (!window.confirm(`Delete service "${s.service_name}"?`)) return
    try { await deleteService(s.service_id); toast.success('Deleted'); load() }
    catch(e) { toast.error(e.response?.data?.error || 'Cannot delete') }
  }

  return (
    <div>
      <div className="toolbar">
        <div style={{ flex:1 }} />
        <button className="btn btn-gold" onClick={openAdd}><Plus size={14} /> Add Service</button>
      </div>

      <div className="card">
        <div className="card-title"><Sparkles size={15} /> Add-on Services ({services.length})</div>
        {loading ? <div className="spinner" /> : (
          services.length === 0 ? (
            <div className="empty-state"><Sparkles size={40}/><p>No services yet</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Service Name</th><th>Unit Price</th><th>Actions</th></tr></thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.service_id}>
                      <td>{s.service_id}</td>
                      <td style={{ fontWeight:600 }}>{s.service_name}</td>
                      <td style={{ color:'var(--gold)', fontWeight:600 }}>{inr(s.unit_price)}</td>
                      <td>
                        <button className="btn-icon" onClick={() => openEdit(s)}><Pencil size={14}/></button>
                        <button className="btn-icon" onClick={() => handleDelete(s)}><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editing ? 'Edit Service' : 'Add Service'}</h2>
              <button className="btn-icon" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              {formErr && <div className="alert alert-error">{formErr}</div>}
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Service Name *</label>
                  <input value={form.service_name} onChange={e=>setForm({...form,service_name:e.target.value})} placeholder="e.g. Photography" />
                </div>
                <div className="form-group form-full">
                  <label>Unit Price (₹) *</label>
                  <input type="number" min={0} value={form.unit_price} onChange={e=>setForm({...form,unit_price:e.target.value})} placeholder="15000" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-gold" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

