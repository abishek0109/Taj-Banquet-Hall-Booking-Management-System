import { useEffect, useState } from 'react'
import { Search, Plus, Pencil, Trash2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/client.js'

const EMPTY = { full_name: '', phone: '', email: '' }

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [q, setQ]                 = useState('')
  const [modal, setModal]         = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [formErr, setFormErr]     = useState('')
  const [saving, setSaving]       = useState(false)

  const load = (search='') => {
    setLoading(true)
    getCustomers(search)
      .then(r => setCustomers(r.data))
      .catch(e => toast.error(e.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setFormErr(''); setModal(true) }
  const openEdit = c  => { setEditing(c); setForm({ full_name: c.full_name, phone: c.phone, email: c.email }); setFormErr(''); setModal(true) }
  const close    = () => { setModal(false); setFormErr('') }

  const handleSearch = e => {
    setQ(e.target.value)
    load(e.target.value)
  }

  const handleSubmit = async () => {
    setFormErr('')
    setSaving(true)
    try {
      if (editing) {
        await updateCustomer(editing.customer_id, form)
        toast.success('Customer updated')
      } else {
        await createCustomer(form)
        toast.success('Customer added')
      }
      load(q); close()
    } catch (e) {
      setFormErr(e.response?.data?.error || 'Error')
    } finally { setSaving(false) }
  }

  const handleDelete = async c => {
    if (!window.confirm(`Delete customer "${c.full_name}"?`)) return
    try {
      await deleteCustomer(c.customer_id)
      toast.success('Customer deleted')
      load(q)
    } catch (e) { toast.error(e.response?.data?.error || 'Cannot delete') }
  }

  return (
    <div>
      <div className="toolbar">
        <div className="search-box">
          <Search size={14} />
          <input placeholder="Search name, phone or email…" value={q} onChange={handleSearch} />
        </div>
        <button className="btn btn-gold" onClick={openAdd}><Plus size={14} /> Add Customer</button>
      </div>

      <div className="card">
        <div className="card-title"><User size={15} /> Customers ({customers.length})</div>
        {loading ? <div className="spinner" /> : (
          customers.length === 0 ? (
            <div className="empty-state"><User size={40} /><p>No customers found</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.customer_id}>
                      <td>{c.customer_id}</td>
                      <td style={{ fontWeight:600 }}>{c.full_name}</td>
                      <td>{c.phone}</td>
                      <td>{c.email}</td>
                      <td>
                        <button className="btn-icon" title="Edit" onClick={() => openEdit(c)}><Pencil size={14} /></button>
                        <button className="btn-icon" title="Delete" onClick={() => handleDelete(c)}><Trash2 size={14} /></button>
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
              <h2>{editing ? 'Edit Customer' : 'Add Customer'}</h2>
              <button className="btn-icon" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              {formErr && <div className="alert alert-error">{formErr}</div>}
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Full Name *</label>
                  <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="e.g. Arun Kumar" />
                </div>
                <div className="form-group">
                  <label>Phone (10 digits) *</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="9000000001" maxLength={10} />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@example.com" type="email" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-gold" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

