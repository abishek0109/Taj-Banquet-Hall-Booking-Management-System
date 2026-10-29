import { useEffect, useState, useCallback } from 'react'
import { Plus, CalendarCheck, Eye, Pencil, CheckCircle, XCircle, Clock, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getBookings, createBooking, updateBooking, patchStatus, deleteBooking,
  getCustomers, getEventTypes, getPackages, getServices, getBooking,
  addBookingService, removeBookingService, addPayment, getBookingPayments
} from '../api/client.js'

const inr = v => `₹${Number(v || 0).toLocaleString('en-IN')}`

const EMPTY_BOOKING = {
  customer_id:'', event_type_id:'', package_id:'',
  start_at:'', end_at:'', guest_count:'', status:'PENDING', notes:''
}
const EMPTY_PAYMENT = { amount:'', payment_method:'UPI', reference_no:'', payment_date:'' }

function StatusBadge({ status }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
}

/* ─── Booking Detail Modal ─────────────────────────────────────────────────── */
function BookingDetail({ bid, onClose, onRefresh }) {
  const [data, setData]     = useState(null)
  const [allSvc, setAllSvc] = useState([])
  const [addSvc, setAddSvc] = useState({ service_id:'', quantity:1 })
  const [pay, setPay]       = useState(EMPTY_PAYMENT)
  const [tab, setTab]       = useState('info')
  const [err, setErr]       = useState('')

  const load = useCallback(() => {
    getBooking(bid).then(r => setData(r.data)).catch(()=>setData(null))
    getServices().then(r => setAllSvc(r.data))
  }, [bid])

  useEffect(() => { load() }, [load])

  const changeStatus = async s => {
    try { await patchStatus(bid, s); toast.success(`Status → ${s}`); load(); onRefresh() }
    catch (e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const submitSvc = async () => {
    setErr('')
    if (!addSvc.service_id) return setErr('Select a service')
    try {
      await addBookingService(bid, { service_id: parseInt(addSvc.service_id), quantity: parseInt(addSvc.quantity) })
      toast.success('Service added'); load(); setAddSvc({ service_id:'', quantity:1 })
    } catch(e) { setErr(e.response?.data?.error || 'Error') }
  }

  const removeSvc = async sid => {
    try { await removeBookingService(bid, sid); toast.success('Service removed'); load() }
    catch(e) { toast.error(e.response?.data?.error || 'Error') }
  }

  const submitPay = async () => {
    setErr('')
    try {
      await addPayment(bid, { ...pay, amount: parseFloat(pay.amount) })
      toast.success('Payment recorded'); load(); setPay(EMPTY_PAYMENT)
    } catch(e) { setErr(e.response?.data?.error || 'Error') }
  }

  if (!data) return (
    <div className="modal-overlay">
      <div className="modal"><div className="modal-body"><div className="spinner" /></div></div>
    </div>
  )

  const TAB_STYLE = active => ({
    padding:'8px 16px', border:'none', background: active ? 'var(--navy)':'transparent',
    color: active ? '#fff':'var(--text-lt)', borderRadius:6, fontWeight:600, cursor:'pointer', fontSize:13
  })

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ width:680 }}>
        <div className="modal-header">
          <h2>Booking #{data.booking_id} — {data.customer_name}</h2>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <StatusBadge status={data.status} />
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          {/* Tabs */}
          <div style={{ display:'flex', gap:4, marginBottom:16, background:'var(--ivory)', padding:4, borderRadius:8 }}>
            {['info','services','payments'].map(t => (
              <button key={t} style={TAB_STYLE(tab===t)} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
          {err && <div className="alert alert-error">{err}</div>}

          {tab === 'info' && (
            <>
              <dl className="detail-grid">
                {[
                  ['Event',      data.event_name],
                  ['Package',    data.package_name],
                  ['Date/Start', data.start_at],
                  ['End',        data.end_at],
                  ['Guests',     data.guest_count],
                  ['Capacity',   data.capacity],
                  ['Package Fee',inr(data.base_price)],
                  ['Services',   inr(data.services_total)],
                  ['Total Amount',inr(data.total_amount)],
                  ['Total Paid', inr(data.total_paid)],
                ].map(([k,v]) => (
                  <div className="detail-item" key={k}>
                    <dt>{k}</dt><dd>{v}</dd>
                  </div>
                ))}
              </dl>
              {data.notes && <p style={{ marginTop:10, fontSize:13, color:'var(--text-lt)' }}>📝 {data.notes}</p>}
              <div className="section-title">Outstanding Balance</div>
              <div style={{ fontSize:22, fontWeight:700, color: data.outstanding_balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {inr(data.outstanding_balance)}
              </div>
              <div className="section-title">Change Status</div>
              <div style={{ display:'flex', gap:8 }}>
                {data.status !== 'CONFIRMED'  && <button className="btn btn-sm" style={{ background:'#e8f5e9',color:'#2e7d32' }} onClick={() => changeStatus('CONFIRMED')}>✓ Confirm</button>}
                {data.status !== 'PENDING'    && <button className="btn btn-sm" style={{ background:'#fff3e0',color:'#e65100' }} onClick={() => changeStatus('PENDING')}>⟳ Set Pending</button>}
                {data.status !== 'CANCELLED'  && <button className="btn btn-sm btn-danger" onClick={() => changeStatus('CANCELLED')}>✕ Cancel</button>}
              </div>
            </>
          )}

          {tab === 'services' && (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Service</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    {data.services.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign:'center',color:'var(--text-lt)' }}>No services added</td></tr>
                    ) : data.services.map(s => (
                      <tr key={s.service_id}>
                        <td>{s.service_name}</td>
                        <td>{s.quantity}</td>
                        <td>{inr(s.unit_price)}</td>
                        <td>{inr(s.line_total)}</td>
                        <td><button className="btn-icon" onClick={() => removeSvc(s.service_id)}><XCircle size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="section-title">Add Service</div>
              <div style={{ display:'flex', gap:8 }}>
                <select style={{ flex:2, border:'1px solid #ddd', borderRadius:6, padding:'7px 10px', fontSize:13 }}
                  value={addSvc.service_id} onChange={e => setAddSvc({...addSvc, service_id:e.target.value})}>
                  <option value="">— Select service —</option>
                  {allSvc.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name} ({inr(s.unit_price)})</option>)}
                </select>
                <input type="number" min={1} style={{ flex:1, border:'1px solid #ddd', borderRadius:6, padding:'7px 10px', fontSize:13 }}
                  value={addSvc.quantity} onChange={e => setAddSvc({...addSvc, quantity:e.target.value})} placeholder="Qty" />
                <button className="btn btn-gold" onClick={submitSvc}><Plus size={14} /> Add</button>
              </div>
            </>
          )}

          {tab === 'payments' && (
            <>
              <div style={{ marginBottom:10, padding:12, background:'var(--ivory)', borderRadius:8 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                  <div><div style={{ fontSize:11, color:'var(--text-lt)', fontWeight:600 }}>TOTAL AMOUNT</div><div style={{ fontWeight:700, fontSize:16 }}>{inr(data.total_amount)}</div></div>
                  <div><div style={{ fontSize:11, color:'var(--text-lt)', fontWeight:600 }}>PAID</div><div style={{ fontWeight:700, fontSize:16, color:'var(--success)' }}>{inr(data.total_paid)}</div></div>
                  <div><div style={{ fontSize:11, color:'var(--text-lt)', fontWeight:600 }}>BALANCE DUE</div><div style={{ fontWeight:700, fontSize:16, color: data.outstanding_balance>0?'var(--danger)':'var(--success)' }}>{inr(data.outstanding_balance)}</div></div>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>#</th><th>Date</th><th>Method</th><th>Ref</th><th>Amount</th></tr></thead>
                  <tbody>
                    {data.payments.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-lt)' }}>No payments yet</td></tr>
                    ) : data.payments.map(p => (
                      <tr key={p.payment_id}>
                        <td>{p.payment_id}</td>
                        <td>{p.payment_date}</td>
                        <td><span className="badge" style={{ background:'#e3f2fd',color:'#0277bd' }}>{p.payment_method}</span></td>
                        <td style={{ fontSize:11, color:'var(--text-lt)' }}>{p.reference_no || '—'}</td>
                        <td className="amount-positive">{inr(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="section-title">Record Payment</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Amount (₹) *</label>
                  <input type="number" min={1} value={pay.amount} onChange={e=>setPay({...pay,amount:e.target.value})} placeholder="5000" />
                </div>
                <div className="form-group">
                  <label>Method *</label>
                  <select value={pay.payment_method} onChange={e=>setPay({...pay,payment_method:e.target.value})}>
                    {['UPI','CASH','CARD','NEFT','CHEQUE'].map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reference No</label>
                  <input value={pay.reference_no} onChange={e=>setPay({...pay,reference_no:e.target.value})} placeholder="UPI-TXN-XXXX" />
                </div>
                <div className="form-group">
                  <label>Date (leave blank = today)</label>
                  <input type="date" value={pay.payment_date} onChange={e=>setPay({...pay,payment_date:e.target.value})} />
                </div>
              </div>
              <button className="btn btn-gold" style={{ marginTop:8 }} onClick={submitPay}>Record Payment</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Bookings Page ───────────────────────────────────────────────────── */
export default function Bookings() {
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [filterStatus, setFilter]   = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [modal, setModal]           = useState(false)
  const [detail, setDetail]         = useState(null)
  const [form, setForm]             = useState(EMPTY_BOOKING)
  const [formErr, setFormErr]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [customers, setCustomers]   = useState([])
  const [events, setEvents]         = useState([])
  const [packages, setPackages]     = useState([])

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (filterStatus) params.status = filterStatus
    if (filterDate)   params.date   = filterDate
    getBookings(params)
      .then(r => setBookings(r.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false))
  }, [filterStatus, filterDate])

  useEffect(() => {
    getCustomers().then(r => setCustomers(r.data))
    getEventTypes().then(r => setEvents(r.data))
    getPackages().then(r => setPackages(r.data))
  }, [])

  useEffect(() => { load() }, [load])

  const openModal = () => { setForm(EMPTY_BOOKING); setFormErr(''); setModal(true) }
  const close     = () => { setModal(false); setFormErr('') }

  const handleSubmit = async () => {
    setFormErr(''); setSaving(true)
    try {
      await createBooking({
        ...form,
        customer_id:   parseInt(form.customer_id),
        event_type_id: parseInt(form.event_type_id),
        package_id:    parseInt(form.package_id),
        guest_count:   parseInt(form.guest_count),
      })
      toast.success('Booking created'); load(); close()
    } catch(e) { setFormErr(e.response?.data?.error || 'Error') }
    finally { setSaving(false) }
  }

  const handleDelete = async b => {
    if (!window.confirm(`Delete booking #${b.booking_id}?`)) return
    try { await deleteBooking(b.booking_id); toast.success('Deleted'); load() }
    catch(e) { toast.error(e.response?.data?.error || 'Cannot delete') }
  }

  return (
    <div>
      <div className="toolbar">
        <select style={{ border:'1px solid #ddd', borderRadius:7, padding:'7px 10px', fontSize:13 }}
          value={filterStatus} onChange={e => setFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option>CONFIRMED</option><option>PENDING</option><option>CANCELLED</option>
        </select>
        <input type="date" style={{ border:'1px solid #ddd', borderRadius:7, padding:'6px 10px', fontSize:13 }}
          value={filterDate} onChange={e => setFilterDate(e.target.value)} title="Filter by date" />
        {(filterStatus||filterDate) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilter(''); setFilterDate('') }}>Clear</button>
        )}
        <div style={{ flex:1 }} />
        <button className="btn btn-gold" onClick={openModal}><Plus size={14} /> New Booking</button>
      </div>

      <div className="card">
        <div className="card-title"><CalendarCheck size={15} /> Bookings ({bookings.length})</div>
        {loading ? <div className="spinner" /> : (
          bookings.length === 0 ? (
            <div className="empty-state"><CalendarCheck size={40} /><p>No bookings found</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>#</th><th>Customer</th><th>Event</th><th>Package</th><th>Date & Time</th><th>Guests</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.booking_id}>
                      <td>{b.booking_id}</td>
                      <td style={{ fontWeight:600 }}>{b.customer_name}</td>
                      <td>{b.event_name}</td>
                      <td style={{ fontSize:12 }}>{b.package_name}</td>
                      <td style={{ fontSize:12 }}>{b.start_at?.replace('T',' ')} – {b.end_at?.slice(11,16)}</td>
                      <td>{b.guest_count}</td>
                      <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
                      <td>
                        <button className="btn-icon" title="View details" onClick={() => setDetail(b.booking_id)}><Eye size={14} /></button>
                        <button className="btn-icon" title="Delete" onClick={() => handleDelete(b)}><XCircle size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* New booking modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && close()}>
          <div className="modal">
            <div className="modal-header">
              <h2>New Booking</h2>
              <button className="btn-icon" onClick={close}>✕</button>
            </div>
            <div className="modal-body">
              {formErr && <div className="alert alert-error">{formErr}</div>}
              <div className="form-grid">
                <div className="form-group">
                  <label>Customer *</label>
                  <select value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}>
                    <option value="">— Select customer —</option>
                    {customers.map(c=><option key={c.customer_id} value={c.customer_id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Event Type *</label>
                  <select value={form.event_type_id} onChange={e=>setForm({...form,event_type_id:e.target.value})}>
                    <option value="">— Select event —</option>
                    {events.map(e=><option key={e.event_type_id} value={e.event_type_id}>{e.event_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Hall Package *</label>
                  <select value={form.package_id} onChange={e=>setForm({...form,package_id:e.target.value})}>
                    <option value="">— Select package —</option>
                    {packages.map(p=><option key={p.package_id} value={p.package_id}>{p.package_name} (cap:{p.capacity}, ₹{Number(p.base_price).toLocaleString('en-IN')})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Guest Count *</label>
                  <input type="number" min={1} value={form.guest_count} onChange={e=>setForm({...form,guest_count:e.target.value})} placeholder="100" />
                </div>
                <div className="form-group">
                  <label>Start Date &amp; Time *</label>
                  <input type="datetime-local" value={form.start_at} onChange={e=>setForm({...form,start_at:e.target.value})} />
                </div>
                <div className="form-group">
                  <label>End Date &amp; Time *</label>
                  <input type="datetime-local" value={form.end_at} onChange={e=>setForm({...form,end_at:e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                    <option>PENDING</option><option>CONFIRMED</option><option>CANCELLED</option>
                  </select>
                </div>
                <div className="form-group form-full">
                  <label>Notes</label>
                  <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Special instructions…" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={close}>Cancel</button>
              <button className="btn btn-gold" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Creating…' : 'Create Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking detail modal */}
      {detail && (
        <BookingDetail bid={detail} onClose={() => setDetail(null)} onRefresh={load} />
      )}
    </div>
  )
}

