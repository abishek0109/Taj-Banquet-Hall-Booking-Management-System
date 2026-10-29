import { useEffect, useState } from 'react'
import { getDashboard } from '../api/client.js'
import {
  Users, CalendarCheck, CheckCircle, Clock, XCircle,
  IndianRupee, Package, Sparkles, TrendingUp, Calendar
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const inr = v => `₹${Number(v).toLocaleString('en-IN')}`

const STAT_DEFS = [
  { key: 'total_customers', label: 'Customers',      icon: Users,         color: '#0277bd' },
  { key: 'total_bookings',  label: 'Total Bookings', icon: CalendarCheck, color: '#558b2f' },
  { key: 'confirmed',       label: 'Confirmed',      icon: CheckCircle,   color: '#2e7d32' },
  { key: 'pending',         label: 'Pending',        icon: Clock,         color: '#e65100' },
  { key: 'cancelled',       label: 'Cancelled',      icon: XCircle,       color: '#c62828' },
  { key: 'total_packages',  label: 'Packages',       icon: Package,       color: '#6a1b9a' },
  { key: 'total_services',  label: 'Add-on Services',icon: Sparkles,      color: '#00838f' },
]

function StatusBadge({ status }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [err, setErr]   = useState(null)

  useEffect(() => {
    getDashboard()
      .then(r => setData(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message))
  }, [])

  if (err)  return <div className="alert alert-error">Error: {err}</div>
  if (!data) return <div className="spinner" />

  const chartData = (data.monthly_revenue || []).map(m => ({
    name: m.month, revenue: m.revenue
  }))

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {STAT_DEFS.map(s => (
          <div className="stat-card" key={s.key} style={{ borderLeftColor: s.color }}>
            <div className="stat-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
              <s.icon size={13} style={{ color: s.color }} />
              {s.label}
            </div>
            <div className="stat-value" style={{ color: s.color }}>{data[s.key]}</div>
          </div>
        ))}
        <div className="stat-card" style={{ borderLeftColor: '#c9a84c' }}>
          <div className="stat-label" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <IndianRupee size={13} style={{ color:'#c9a84c' }} />
            Total Revenue
          </div>
          <div className="stat-value" style={{ color:'#c9a84c', fontSize:20 }}>
            {inr(data.total_revenue || 0)}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-title"><TrendingUp size={16} /> Monthly Revenue</div>
          {chartData.length === 0 ? (
            <p style={{ color:'var(--text-lt)', fontSize:13 }}>No payment data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#c9a84c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede6" />
                <XAxis dataKey="name" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => [inr(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#c9a84c" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming Bookings */}
        <div className="card">
          <div className="card-title"><Calendar size={16} /> Upcoming Bookings (30 days)</div>
          {data.upcoming_bookings.length === 0 ? (
            <div className="empty-state"><p>No upcoming bookings</p></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Customer</th><th>Event</th><th>Date</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcoming_bookings.map(b => (
                    <tr key={b.booking_id}>
                      <td>{b.booking_id}</td>
                      <td>{b.full_name}</td>
                      <td>{b.event_name}</td>
                      <td style={{ fontSize:12 }}>{b.start_at?.slice(0,10)}</td>
                      <td><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Booking status summary */}
      <div className="card">
        <div className="card-title"><CalendarCheck size={16} /> Booking Status Summary</div>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
          {[
            { label:'Confirmed', value: data.confirmed, className:'badge-confirmed' },
            { label:'Pending',   value: data.pending,   className:'badge-pending'   },
            { label:'Cancelled', value: data.cancelled, className:'badge-cancelled' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:32, fontWeight:700 }}>{s.value}</div>
              <span className={`badge ${s.className}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

