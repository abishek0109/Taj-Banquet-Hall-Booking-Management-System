import { useEffect, useState } from 'react'
import { BarChart3, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getRevenueReport, getDailySchedule } from '../api/client.js'

const inr = v => `₹${Number(v || 0).toLocaleString('en-IN')}`

function StatusBadge({ status }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
}

export default function Reports() {
  const [report, setReport]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [schedDate, setSchedDate] = useState(new Date().toISOString().slice(0,10))
  const [schedule, setSchedule] = useState([])
  const [schedLoading, setSchedL] = useState(false)

  useEffect(() => {
    getRevenueReport()
      .then(r => setReport(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSchedL(true)
    getDailySchedule(schedDate)
      .then(r => setSchedule(r.data))
      .catch(() => {})
      .finally(() => setSchedL(false))
  }, [schedDate])

  if (loading || !report) return <div className="spinner" />

  return (
    <div>
      {/* Monthly Revenue Bar Chart */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title"><BarChart3 size={15} /> Monthly Revenue</div>
        {report.by_month.length === 0 ? (
          <p style={{ color:'var(--text-lt)',fontSize:13 }}>No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={report.by_month.map(m => ({ name: m.month, Revenue: m.total, Payments: m.payment_count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" />
              <XAxis dataKey="name" tick={{ fontSize:11 }} />
              <YAxis tick={{ fontSize:11 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v,n) => [n==='Revenue'?inr(v):v, n]} />
              <Legend />
              <Bar dataKey="Revenue" fill="#c9a84c" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        {/* Revenue by Event Type */}
        <div className="card">
          <div className="card-title">Revenue by Event Type</div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Event</th><th>Bookings</th><th>Revenue</th></tr></thead>
              <tbody>
                {report.by_event.map(e => (
                  <tr key={e.event_name}>
                    <td>{e.event_name}</td>
                    <td>{e.bookings}</td>
                    <td className="amount-positive">{inr(e.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue by Package */}
        <div className="card">
          <div className="card-title">Revenue by Package</div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Package</th><th>Bookings</th><th>Revenue</th></tr></thead>
              <tbody>
                {report.by_package.map(p => (
                  <tr key={p.package_name}>
                    <td>{p.package_name}</td>
                    <td>{p.bookings}</td>
                    <td className="amount-positive">{inr(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Outstanding Balances */}
      {report.outstanding.length > 0 && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-title" style={{ color:'var(--danger)' }}>⚠ Outstanding Balances</div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>#</th><th>Customer</th><th>Package</th><th>Status</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead>
              <tbody>
                {report.outstanding.map(o => (
                  <tr key={o.booking_id}>
                    <td>{o.booking_id}</td>
                    <td style={{ fontWeight:600 }}>{o.customer_name}</td>
                    <td>{o.package_name}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{inr(o.total_amount)}</td>
                    <td className="amount-positive">{inr(o.total_paid)}</td>
                    <td className="amount-negative">{inr(o.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily Schedule */}
      <div className="card">
        <div className="card-title"><Calendar size={15} /> Daily Booking Schedule</div>
        <div style={{ marginBottom:14 }}>
          <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
            style={{ border:'1px solid #ddd',borderRadius:7,padding:'7px 10px',fontSize:13 }} />
        </div>
        {schedLoading ? <div className="spinner" /> : (
          schedule.length === 0 ? (
            <div className="empty-state"><Calendar size={36}/><p>No bookings on {schedDate}</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>#</th><th>Customer</th><th>Event</th><th>Package</th><th>Start</th><th>End</th><th>Guests</th><th>Status</th></tr></thead>
                <tbody>
                  {schedule.map(b => (
                    <tr key={b.booking_id}>
                      <td>{b.booking_id}</td>
                      <td style={{ fontWeight:600 }}>{b.customer_name}</td>
                      <td>{b.event_name}</td>
                      <td>{b.package_name}</td>
                      <td>{b.start_at?.slice(11,16)}</td>
                      <td>{b.end_at?.slice(11,16)}</td>
                      <td>{b.guest_count}</td>
                      <td><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}

