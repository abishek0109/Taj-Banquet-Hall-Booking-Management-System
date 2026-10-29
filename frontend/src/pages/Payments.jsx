import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllPayments } from '../api/client.js'

const inr = v => `₹${Number(v || 0).toLocaleString('en-IN')}`

const METHOD_COLORS = {
  UPI:    { bg:'#e3f2fd', color:'#0277bd' },
  CASH:   { bg:'#e8f5e9', color:'#2e7d32' },
  CARD:   { bg:'#fce4ec', color:'#c62828' },
  NEFT:   { bg:'#fff3e0', color:'#e65100' },
  CHEQUE: { bg:'#f3e5f5', color:'#6a1b9a' },
}

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filterM, setFilterM]   = useState('')

  useEffect(() => {
    getAllPayments()
      .then(r => setPayments(r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filterM ? payments.filter(p => p.payment_method === filterM) : payments
  const total    = filtered.reduce((s,p) => s + p.amount, 0)

  return (
    <div>
      <div className="toolbar">
        <select style={{ border:'1px solid #ddd',borderRadius:7,padding:'7px 10px',fontSize:13 }}
          value={filterM} onChange={e => setFilterM(e.target.value)}>
          <option value="">All Methods</option>
          {['UPI','CASH','CARD','NEFT','CHEQUE'].map(m => <option key={m}>{m}</option>)}
        </select>
        {filterM && <button className="btn btn-ghost btn-sm" onClick={() => setFilterM('')}>Clear</button>}
        <div style={{ flex:1 }} />
        <div style={{ fontWeight:700, fontSize:16, color:'var(--gold)' }}>
          Total: {inr(total)}
        </div>
      </div>

      <div className="card">
        <div className="card-title"><CreditCard size={15} /> Payment History ({filtered.length})</div>
        {loading ? <div className="spinner" /> : (
          filtered.length === 0 ? (
            <div className="empty-state"><CreditCard size={40}/><p>No payments found</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>#</th><th>Customer</th><th>Booking</th><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const mc = METHOD_COLORS[p.payment_method] || {}
                    return (
                      <tr key={p.payment_id}>
                        <td>{p.payment_id}</td>
                        <td style={{ fontWeight:600 }}>{p.customer_name}</td>
                        <td>#{p.booking_id}</td>
                        <td>{p.payment_date}</td>
                        <td><span className="badge" style={{ background: mc.bg, color: mc.color }}>{p.payment_method}</span></td>
                        <td style={{ fontSize:11,color:'var(--text-lt)' }}>{p.reference_no || '—'}</td>
                        <td className="amount-positive">{inr(p.amount)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:'2px solid var(--ivory2)' }}>
                    <td colSpan={6} style={{ fontWeight:700, paddingTop:10 }}>Total</td>
                    <td className="amount-positive" style={{ fontWeight:700, paddingTop:10 }}>{inr(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}

