import axios from 'axios'
import seedData from './initialData.json'

const isGitHubPages = window.location.hostname.includes('github.io')
const api = axios.create({ baseURL: '/api' })

// ── In-Memory / LocalStorage Mock Database for GitHub Pages Static Deployment ──
const STORAGE_KEY = 'taj_banquet_db_v1'

function getLocalDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('LocalStorage read error:', e)
  }
  // Initialize from seed
  const clone = JSON.parse(JSON.stringify(seedData))
  saveLocalDB(clone)
  return clone
}

function saveLocalDB(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('LocalStorage write error:', e)
  }
}

// Simulated delay helper
const delay = (val, ms = 50) => new Promise(res => setTimeout(() => res({ data: val }), ms))

// ── Overlap & Business Rule Helpers ──
function checkOverlap(bookings, start_at, end_at, exclude_id = null) {
  const sNew = new Date(start_at.replace(' ', 'T')).getTime()
  const eNew = new Date(end_at.replace(' ', 'T')).getTime()

  return bookings.some(b => {
    if (exclude_id && b.booking_id === exclude_id) return false
    if (!['PENDING', 'CONFIRMED'].includes(b.status)) return false
    const sOld = new Date(b.start_at.replace(' ', 'T')).getTime()
    const eOld = new Date(b.end_at.replace(' ', 'T')).getTime()
    return eOld > sNew && sOld < eNew
  })
}

// ── Mock Implementation for Static Deployment ──
const mockApi = {
  getDashboard: async () => {
    const db = getLocalDB()
    const total_customers = db.CUSTOMER.length
    const total_bookings = db.BOOKING.length
    const confirmed = db.BOOKING.filter(b => b.status === 'CONFIRMED').length
    const pending = db.BOOKING.filter(b => b.status === 'PENDING').length
    const cancelled = db.BOOKING.filter(b => b.status === 'CANCELLED').length
    const total_revenue = db.PAYMENT.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const total_packages = db.HALL_PACKAGE.length
    const total_services = db.SERVICE.length

    // Monthly revenue
    const monthlyMap = {}
    db.PAYMENT.forEach(p => {
      const m = p.payment_date.slice(0, 7)
      monthlyMap[m] = (monthlyMap[m] || 0) + Number(p.amount)
    })
    const monthly_revenue = Object.keys(monthlyMap).sort().map(m => ({ month: m, revenue: monthlyMap[m] }))

    // Upcoming bookings
    const upcoming_bookings = db.BOOKING
      .filter(b => ['PENDING', 'CONFIRMED'].includes(b.status))
      .map(b => {
        const c = db.CUSTOMER.find(x => x.customer_id === b.customer_id) || {}
        const e = db.EVENT_TYPE.find(x => x.event_type_id === b.event_type_id) || {}
        const p = db.HALL_PACKAGE.find(x => x.package_id === b.package_id) || {}
        return {
          ...b,
          full_name: c.full_name,
          event_name: e.event_name,
          package_name: p.package_name
        }
      })
      .slice(0, 5)

    return delay({
      total_customers,
      total_bookings,
      confirmed,
      pending,
      cancelled,
      total_revenue,
      total_packages,
      total_services,
      monthly_revenue,
      upcoming_bookings
    })
  },

  getCustomers: async (q = '') => {
    const db = getLocalDB()
    let list = db.CUSTOMER
    if (q) {
      const low = q.toLowerCase()
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(low) ||
        c.phone.includes(low) ||
        c.email.toLowerCase().includes(low)
      )
    }
    return delay(list)
  },

  getCustomer: async (id) => {
    const db = getLocalDB()
    const c = db.CUSTOMER.find(x => x.customer_id === Number(id))
    if (!c) throw { response: { data: { error: 'Customer not found' } } }
    return delay(c)
  },

  createCustomer: async (d) => {
    const db = getLocalDB()
    if (!d.full_name || !d.phone || !d.email) {
      throw { response: { data: { error: 'All fields required' } } }
    }
    const newId = db.CUSTOMER.length ? Math.max(...db.CUSTOMER.map(x => x.customer_id)) + 1 : 1
    const newCust = { customer_id: newId, ...d }
    db.CUSTOMER.push(newCust)
    saveLocalDB(db)
    return delay(newCust)
  },

  updateCustomer: async (id, d) => {
    const db = getLocalDB()
    const idx = db.CUSTOMER.findIndex(x => x.customer_id === Number(id))
    if (idx === -1) throw { response: { data: { error: 'Customer not found' } } }
    db.CUSTOMER[idx] = { ...db.CUSTOMER[idx], ...d }
    saveLocalDB(db)
    return delay(db.CUSTOMER[idx])
  },

  deleteCustomer: async (id) => {
    const db = getLocalDB()
    const hasBookings = db.BOOKING.some(b => b.customer_id === Number(id))
    if (hasBookings) throw { response: { data: { error: 'Cannot delete customer with existing bookings' } } }
    db.CUSTOMER = db.CUSTOMER.filter(x => x.customer_id !== Number(id))
    saveLocalDB(db)
    return delay({ message: 'Customer deleted' })
  },

  getEventTypes: async () => {
    const db = getLocalDB()
    return delay(db.EVENT_TYPE)
  },

  getPackages: async () => {
    const db = getLocalDB()
    return delay(db.HALL_PACKAGE)
  },

  getPackage: async (id) => {
    const db = getLocalDB()
    const p = db.HALL_PACKAGE.find(x => x.package_id === Number(id))
    if (!p) throw { response: { data: { error: 'Package not found' } } }
    return delay(p)
  },

  createPackage: async (d) => {
    const db = getLocalDB()
    const newId = db.HALL_PACKAGE.length ? Math.max(...db.HALL_PACKAGE.map(x => x.package_id)) + 1 : 1
    const newPkg = { package_id: newId, ...d, base_price: Number(d.base_price), capacity: Number(d.capacity) }
    db.HALL_PACKAGE.push(newPkg)
    saveLocalDB(db)
    return delay(newPkg)
  },

  updatePackage: async (id, d) => {
    const db = getLocalDB()
    const idx = db.HALL_PACKAGE.findIndex(x => x.package_id === Number(id))
    if (idx === -1) throw { response: { data: { error: 'Package not found' } } }
    db.HALL_PACKAGE[idx] = { ...db.HALL_PACKAGE[idx], ...d, base_price: Number(d.base_price), capacity: Number(d.capacity) }
    saveLocalDB(db)
    return delay(db.HALL_PACKAGE[idx])
  },

  deletePackage: async (id) => {
    const db = getLocalDB()
    db.HALL_PACKAGE = db.HALL_PACKAGE.filter(x => x.package_id !== Number(id))
    saveLocalDB(db)
    return delay({ message: 'Deleted' })
  },

  getServices: async () => {
    const db = getLocalDB()
    return delay(db.SERVICE)
  },

  createService: async (d) => {
    const db = getLocalDB()
    const newId = db.SERVICE.length ? Math.max(...db.SERVICE.map(x => x.service_id)) + 1 : 1
    const newSvc = { service_id: newId, ...d, unit_price: Number(d.unit_price) }
    db.SERVICE.push(newSvc)
    saveLocalDB(db)
    return delay(newSvc)
  },

  updateService: async (id, d) => {
    const db = getLocalDB()
    const idx = db.SERVICE.findIndex(x => x.service_id === Number(id))
    if (idx === -1) throw { response: { data: { error: 'Service not found' } } }
    db.SERVICE[idx] = { ...db.SERVICE[idx], ...d, unit_price: Number(d.unit_price) }
    saveLocalDB(db)
    return delay(db.SERVICE[idx])
  },

  deleteService: async (id) => {
    const db = getLocalDB()
    db.SERVICE = db.SERVICE.filter(x => x.service_id !== Number(id))
    saveLocalDB(db)
    return delay({ message: 'Deleted' })
  },

  getBookings: async (p = {}) => {
    const db = getLocalDB()
    let list = db.BOOKING.map(b => {
      const c = db.CUSTOMER.find(x => x.customer_id === b.customer_id) || {}
      const e = db.EVENT_TYPE.find(x => x.event_type_id === b.event_type_id) || {}
      const pkg = db.HALL_PACKAGE.find(x => x.package_id === b.package_id) || {}
      return {
        ...b,
        customer_name: c.full_name,
        event_name: e.event_name,
        package_name: pkg.package_name,
        capacity: pkg.capacity,
        base_price: pkg.base_price
      }
    })

    if (p.status) list = list.filter(b => b.status === p.status.toUpperCase())
    if (p.date) list = list.filter(b => b.start_at.startsWith(p.date))
    list.sort((a, b) => b.start_at.localeCompare(a.start_at))
    return delay(list)
  },

  getBooking: async (id) => {
    const db = getLocalDB()
    const b = db.BOOKING.find(x => x.booking_id === Number(id))
    if (!b) throw { response: { data: { error: 'Booking not found' } } }
    const c = db.CUSTOMER.find(x => x.customer_id === b.customer_id) || {}
    const e = db.EVENT_TYPE.find(x => x.event_type_id === b.event_type_id) || {}
    const pkg = db.HALL_PACKAGE.find(x => x.package_id === b.package_id) || {}

    const services = db.BOOKING_SERVICE
      .filter(bs => bs.booking_id === Number(id))
      .map(bs => {
        const s = db.SERVICE.find(x => x.service_id === bs.service_id) || {}
        return {
          service_id: bs.service_id,
          service_name: s.service_name,
          quantity: bs.quantity,
          unit_price: bs.unit_price,
          line_total: bs.quantity * bs.unit_price
        }
      })

    const payments = db.PAYMENT.filter(py => py.booking_id === Number(id))
    const svc_total = services.reduce((sum, s) => sum + s.line_total, 0)
    const paid = payments.reduce((sum, py) => sum + Number(py.amount), 0)
    const total_amount = pkg.base_price + svc_total

    return delay({
      ...b,
      customer_name: c.full_name,
      event_name: e.event_name,
      package_name: pkg.package_name,
      capacity: pkg.capacity,
      base_price: pkg.base_price,
      services,
      payments,
      services_total: svc_total,
      total_amount,
      total_paid: paid,
      outstanding_balance: total_amount - paid
    })
  },

  createBooking: async (d) => {
    const db = getLocalDB()
    if (d.end_at <= d.start_at) {
      throw { response: { data: { error: 'end_at must be later than start_at' } } }
    }
    const pkg = db.HALL_PACKAGE.find(x => x.package_id === Number(d.package_id))
    if (!pkg) throw { response: { data: { error: 'Package not found' } } }
    if (Number(d.guest_count) > pkg.capacity) {
      throw { response: { data: { error: `guest_count ${d.guest_count} exceeds package capacity ${pkg.capacity}` } } }
    }
    if (['PENDING', 'CONFIRMED'].includes(d.status) && checkOverlap(db.BOOKING, d.start_at, d.end_at)) {
      throw { response: { data: { error: 'Time slot overlaps an existing PENDING or CONFIRMED booking' } } }
    }

    const newId = db.BOOKING.length ? Math.max(...db.BOOKING.map(x => x.booking_id)) + 1 : 1
    const newB = {
      booking_id: newId,
      customer_id: Number(d.customer_id),
      event_type_id: Number(d.event_type_id),
      package_id: Number(d.package_id),
      start_at: d.start_at,
      end_at: d.end_at,
      guest_count: Number(d.guest_count),
      status: d.status || 'PENDING',
      notes: d.notes || null
    }
    db.BOOKING.push(newB)
    saveLocalDB(db)
    return mockApi.getBooking(newId)
  },

  updateBooking: async (id, d) => {
    const db = getLocalDB()
    const idx = db.BOOKING.findIndex(x => x.booking_id === Number(id))
    if (idx === -1) throw { response: { data: { error: 'Booking not found' } } }
    db.BOOKING[idx] = { ...db.BOOKING[idx], ...d }
    saveLocalDB(db)
    return mockApi.getBooking(id)
  },

  patchStatus: async (id, s) => {
    const db = getLocalDB()
    const idx = db.BOOKING.findIndex(x => x.booking_id === Number(id))
    if (idx === -1) throw { response: { data: { error: 'Booking not found' } } }
    db.BOOKING[idx].status = s
    saveLocalDB(db)
    return mockApi.getBooking(id)
  },

  deleteBooking: async (id) => {
    const db = getLocalDB()
    db.BOOKING = db.BOOKING.filter(x => x.booking_id !== Number(id))
    db.BOOKING_SERVICE = db.BOOKING_SERVICE.filter(x => x.booking_id !== Number(id))
    db.PAYMENT = db.PAYMENT.filter(x => x.booking_id !== Number(id))
    saveLocalDB(db)
    return delay({ message: 'Booking deleted' })
  },

  addBookingService: async (bid, d) => {
    const db = getLocalDB()
    const svc = db.SERVICE.find(x => x.service_id === Number(d.service_id))
    if (!svc) throw { response: { data: { error: 'Service not found' } } }
    const existingIdx = db.BOOKING_SERVICE.findIndex(x => x.booking_id === Number(bid) && x.service_id === Number(d.service_id))
    if (existingIdx !== -1) {
      db.BOOKING_SERVICE[existingIdx].quantity = Number(d.quantity)
    } else {
      db.BOOKING_SERVICE.push({
        booking_id: Number(bid),
        service_id: Number(d.service_id),
        quantity: Number(d.quantity),
        unit_price: svc.unit_price
      })
    }
    saveLocalDB(db)
    return delay({ message: 'Service added/updated' })
  },

  removeBookingService: async (bid, sid) => {
    const db = getLocalDB()
    db.BOOKING_SERVICE = db.BOOKING_SERVICE.filter(x => !(x.booking_id === Number(bid) && x.service_id === Number(sid)))
    saveLocalDB(db)
    return delay({ message: 'Removed' })
  },

  getBookingPayments: async (bid) => {
    const db = getLocalDB()
    return delay(db.PAYMENT.filter(x => x.booking_id === Number(bid)))
  },

  addPayment: async (bid, d) => {
    const db = getLocalDB()
    const newId = db.PAYMENT.length ? Math.max(...db.PAYMENT.map(x => x.payment_id)) + 1 : 1
    const newPay = {
      payment_id: newId,
      booking_id: Number(bid),
      payment_date: d.payment_date || new Date().toISOString().slice(0, 10),
      amount: Number(d.amount),
      payment_method: d.payment_method,
      reference_no: d.reference_no || null
    }
    db.PAYMENT.push(newPay)
    saveLocalDB(db)
    return delay(newPay)
  },

  getAllPayments: async () => {
    const db = getLocalDB()
    const list = db.PAYMENT.map(p => {
      const b = db.BOOKING.find(x => x.booking_id === p.booking_id) || {}
      const c = db.CUSTOMER.find(x => x.customer_id === b.customer_id) || {}
      return {
        ...p,
        customer_name: c.full_name || 'Unknown',
        event_date: b.start_at || '—'
      }
    })
    return delay(list)
  },

  getRevenueReport: async () => {
    const db = getLocalDB()
    const monthlyMap = {}
    db.PAYMENT.forEach(p => {
      const m = p.payment_date.slice(0, 7)
      if (!monthlyMap[m]) monthlyMap[m] = { month: m, payment_count: 0, total: 0 }
      monthlyMap[m].payment_count++
      monthlyMap[m].total += Number(p.amount)
    })
    const by_month = Object.values(monthlyMap)

    const eventMap = {}
    db.BOOKING.forEach(b => {
      const e = db.EVENT_TYPE.find(x => x.event_type_id === b.event_type_id) || {}
      const name = e.event_name || 'Other'
      if (!eventMap[name]) eventMap[name] = { event_name: name, bookings: 0, revenue: 0 }
      eventMap[name].bookings++
      const pays = db.PAYMENT.filter(p => p.booking_id === b.booking_id)
      eventMap[name].revenue += pays.reduce((s, p) => s + Number(p.amount), 0)
    })
    const by_event = Object.values(eventMap)

    const pkgMap = {}
    db.HALL_PACKAGE.forEach(p => {
      pkgMap[p.package_name] = { package_name: p.package_name, bookings: 0, revenue: 0 }
    })
    db.BOOKING.forEach(b => {
      const p = db.HALL_PACKAGE.find(x => x.package_id === b.package_id)
      if (p && pkgMap[p.package_name]) {
        pkgMap[p.package_name].bookings++
        const pays = db.PAYMENT.filter(x => x.booking_id === b.booking_id)
        pkgMap[p.package_name].revenue += pays.reduce((s, x) => s + Number(x.amount), 0)
      }
    })
    const by_package = Object.values(pkgMap)

    const outstanding = []
    db.BOOKING.forEach(b => {
      if (!['PENDING', 'CONFIRMED'].includes(b.status)) return
      const c = db.CUSTOMER.find(x => x.customer_id === b.customer_id) || {}
      const pkg = db.HALL_PACKAGE.find(x => x.package_id === b.package_id) || {}
      const svcs = db.BOOKING_SERVICE.filter(x => x.booking_id === b.booking_id)
      const svc_total = svcs.reduce((sum, s) => sum + (s.quantity * s.unit_price), 0)
      const pays = db.PAYMENT.filter(x => x.booking_id === b.booking_id)
      const paid = pays.reduce((sum, p) => sum + Number(p.amount), 0)
      const total_amount = (pkg.base_price || 0) + svc_total
      const diff = total_amount - paid
      if (diff > 0) {
        outstanding.push({
          booking_id: b.booking_id,
          customer_name: c.full_name,
          package_name: pkg.package_name,
          status: b.status,
          total_amount,
          total_paid: paid,
          outstanding: diff
        })
      }
    })

    return delay({ by_month, by_event, by_package, outstanding })
  },

  getDailySchedule: async (dt) => {
    const db = getLocalDB()
    const list = db.BOOKING
      .filter(b => b.start_at.startsWith(dt))
      .map(b => {
        const c = db.CUSTOMER.find(x => x.customer_id === b.customer_id) || {}
        const e = db.EVENT_TYPE.find(x => x.event_type_id === b.event_type_id) || {}
        const p = db.HALL_PACKAGE.find(x => x.package_id === b.package_id) || {}
        return {
          ...b,
          customer_name: c.full_name,
          event_name: e.event_name,
          package_name: p.package_name
        }
      })
    return delay(list)
  }
}

// ── Export functions (Auto-switch: REST API when local, In-Memory DB when on GitHub Pages) ──
export const getDashboard       = isGitHubPages ? mockApi.getDashboard       : () => api.get('/dashboard')
export const getCustomers       = isGitHubPages ? mockApi.getCustomers       : (q='') => api.get('/customers', { params: { q } })
export const getCustomer        = isGitHubPages ? mockApi.getCustomer        : (id) => api.get(`/customers/${id}`)
export const createCustomer     = isGitHubPages ? mockApi.createCustomer     : (d) => api.post('/customers', d)
export const updateCustomer     = isGitHubPages ? mockApi.updateCustomer     : (id,d) => api.put(`/customers/${id}`, d)
export const deleteCustomer     = isGitHubPages ? mockApi.deleteCustomer     : (id) => api.delete(`/customers/${id}`)

export const getEventTypes      = isGitHubPages ? mockApi.getEventTypes      : () => api.get('/event-types')
export const getPackages        = isGitHubPages ? mockApi.getPackages        : () => api.get('/packages')
export const getPackage         = isGitHubPages ? mockApi.getPackage         : (id) => api.get(`/packages/${id}`)
export const createPackage      = isGitHubPages ? mockApi.createPackage      : (d) => api.post('/packages', d)
export const updatePackage      = isGitHubPages ? mockApi.updatePackage      : (id,d) => api.put(`/packages/${id}`, d)
export const deletePackage      = isGitHubPages ? mockApi.deletePackage      : (id) => api.delete(`/packages/${id}`)

export const getServices        = isGitHubPages ? mockApi.getServices        : () => api.get('/services')
export const createService      = isGitHubPages ? mockApi.createService      : (d) => api.post('/services', d)
export const updateService      = isGitHubPages ? mockApi.updateService      : (id,d) => api.put(`/services/${id}`, d)
export const deleteService      = isGitHubPages ? mockApi.deleteService      : (id) => api.delete(`/services/${id}`)

export const getBookings        = isGitHubPages ? mockApi.getBookings        : (p={}) => api.get('/bookings', { params: p })
export const getBooking         = isGitHubPages ? mockApi.getBooking         : (id) => api.get(`/bookings/${id}`)
export const createBooking      = isGitHubPages ? mockApi.createBooking      : (d) => api.post('/bookings', d)
export const updateBooking      = isGitHubPages ? mockApi.updateBooking      : (id,d) => api.put(`/bookings/${id}`, d)
export const patchStatus        = isGitHubPages ? mockApi.patchStatus        : (id,s) => api.patch(`/bookings/${id}/status`, { status: s })
export const deleteBooking      = isGitHubPages ? mockApi.deleteBooking      : (id) => api.delete(`/bookings/${id}`)

export const addBookingService    = isGitHubPages ? mockApi.addBookingService    : (bid,d) => api.post(`/bookings/${bid}/services`, d)
export const removeBookingService = isGitHubPages ? mockApi.removeBookingService : (bid,sid) => api.delete(`/bookings/${bid}/services/${sid}`)

export const getBookingPayments = isGitHubPages ? mockApi.getBookingPayments : (bid) => api.get(`/bookings/${bid}/payments`)
export const addPayment         = isGitHubPages ? mockApi.addPayment         : (bid,d) => api.post(`/bookings/${bid}/payments`, d)
export const getAllPayments      = isGitHubPages ? mockApi.getAllPayments      : () => api.get('/payments')

export const getRevenueReport   = isGitHubPages ? mockApi.getRevenueReport   : () => api.get('/reports/revenue')
export const getDailySchedule   = isGitHubPages ? mockApi.getDailySchedule   : (dt) => api.get('/reports/schedule', { params: { date: dt } })

export default api
