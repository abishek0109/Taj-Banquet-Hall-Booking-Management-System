import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard    = () => api.get('/dashboard')

// ── Customers ───────────────────────────────────────────────────────────────
export const getCustomers    = (q='') => api.get('/customers', { params: { q } })
export const getCustomer     = (id)   => api.get(`/customers/${id}`)
export const createCustomer  = (d)    => api.post('/customers', d)
export const updateCustomer  = (id,d) => api.put(`/customers/${id}`, d)
export const deleteCustomer  = (id)   => api.delete(`/customers/${id}`)

// ── Event Types ──────────────────────────────────────────────────────────────
export const getEventTypes   = ()     => api.get('/event-types')
export const createEventType = (d)    => api.post('/event-types', d)
export const deleteEventType = (id)   => api.delete(`/event-types/${id}`)

// ── Packages ─────────────────────────────────────────────────────────────────
export const getPackages     = ()     => api.get('/packages')
export const getPackage      = (id)   => api.get(`/packages/${id}`)
export const createPackage   = (d)    => api.post('/packages', d)
export const updatePackage   = (id,d) => api.put(`/packages/${id}`, d)
export const deletePackage   = (id)   => api.delete(`/packages/${id}`)

// ── Services ─────────────────────────────────────────────────────────────────
export const getServices     = ()     => api.get('/services')
export const createService   = (d)    => api.post('/services', d)
export const updateService   = (id,d) => api.put(`/services/${id}`, d)
export const deleteService   = (id)   => api.delete(`/services/${id}`)

// ── Bookings ─────────────────────────────────────────────────────────────────
export const getBookings     = (p={}) => api.get('/bookings', { params: p })
export const getBooking      = (id)   => api.get(`/bookings/${id}`)
export const createBooking   = (d)    => api.post('/bookings', d)
export const updateBooking   = (id,d) => api.put(`/bookings/${id}`, d)
export const patchStatus     = (id,s) => api.patch(`/bookings/${id}/status`, { status: s })
export const deleteBooking   = (id)   => api.delete(`/bookings/${id}`)

// ── Booking Services ─────────────────────────────────────────────────────────
export const addBookingService    = (bid,d) => api.post(`/bookings/${bid}/services`, d)
export const removeBookingService = (bid,sid) => api.delete(`/bookings/${bid}/services/${sid}`)

// ── Payments ─────────────────────────────────────────────────────────────────
export const getBookingPayments = (bid) => api.get(`/bookings/${bid}/payments`)
export const addPayment         = (bid,d) => api.post(`/bookings/${bid}/payments`, d)
export const getAllPayments      = ()     => api.get('/payments')

// ── Reports ──────────────────────────────────────────────────────────────────
export const getRevenueReport   = ()    => api.get('/reports/revenue')
export const getDailySchedule   = (dt)  => api.get('/reports/schedule', { params: { date: dt } })

export default api

