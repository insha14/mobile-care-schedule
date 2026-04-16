import express from 'express'
import cors from 'cors'
import db from './db.js'
import { v4 as uuidv4 } from 'uuid'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000
const MANAGER_PASSCODE = process.env.MANAGER_PASSCODE || 'MANAGER123'

// GET /api/employees - return all employees
app.get('/api/employees', async (req, res) => {
  await db.read()
  // Do not expose PINs to clients — sanitize employee objects
  const safe = (db.data.employees || []).map(({ pin, ...rest }) => rest)
  res.json(safe)
})

// POST /api/auth/employee - authenticate employee by PIN
app.post('/api/auth/employee', async (req, res) => {
  const { pin } = req.body
  if (!pin) return res.status(400).json({ error: 'PIN is required' })
  await db.read()
  const employee = db.data.employees.find(e => String(e.pin) === String(pin))
  if (!employee) return res.status(403).json({ error: 'Invalid PIN' })
  // return safe employee info
  const { pin: _, ...safe } = employee
  res.json(safe)
})

// POST /api/restrictions - submit a restriction
app.post('/api/restrictions', async (req, res) => {
  const payload = req.body
  // basic validation
  if (!payload.employeeId || !payload.weekStart) {
    return res.status(400).json({ error: 'employeeId and weekStart are required' })
  }
  await db.read()
  const employee = db.data.employees.find(e => e.id === payload.employeeId)
  if (!employee) return res.status(400).json({ error: 'employee not found' })

  // verify employee PIN
  if (!payload.pin) return res.status(400).json({ error: 'employee PIN is required' })
  if (String(payload.pin) !== String(employee.pin)) return res.status(403).json({ error: 'Incorrect PIN' })

  // If a storePreference is provided, validate it exists in stores collection
  if (payload.storePreference) {
    const stores = db.data.stores || []
    const match = stores.find(s => s.name === payload.storePreference)
    if (!match) return res.status(400).json({ error: 'invalid storePreference' })
  }

  // If editing an existing entry, update only that entry
  if (payload.id) {
    const existing = db.data.restrictions.find(r => r.id === payload.id)
    if (!existing) return res.status(404).json({ error: 'Entry not found' })
    if (existing.employeeId !== employee.id) return res.status(403).json({ error: 'You can only edit your own entries' })
    // Check if the request is still pending
    if (existing.status && existing.status !== 'pending') {
      return res.status(403).json({ error: 'Only pending requests can be edited' })
    }
    existing.offDay = payload.offDay || null
    existing.notes = payload.notes || null
    existing.storePreference = payload.storePreference || null
    existing.updatedAt = new Date().toISOString()
    await db.write()
    return res.json({ success: true, restriction: existing, message: 'Entry updated' })
  }

  // New submission: check for duplicate (same employeeId + weekStart + offDay)
  const exactDuplicate = db.data.restrictions.find(r =>
    r.employeeId === employee.id &&
    r.weekStart === payload.weekStart &&
    r.offDay === payload.offDay
  )
  if (exactDuplicate) {
    return res.status(409).json({ error: 'A request for this day already exists for that week' })
  }

  const restriction = {
    id: uuidv4(),
    employeeId: employee.id,
    employeeName: employee.name,
    weekStart: payload.weekStart, // YYYY-MM-DD (Monday)
    offDay: payload.offDay || null, // YYYY-MM-DD
    notes: payload.notes || null,
    storePreference: payload.storePreference || null,
    status: 'pending', // new field
    reviewedAt: null,
    reviewedBy: null,
    managerNote: null,
    createdAt: new Date().toISOString()
  }

  

db.data.restrictions.push(restriction)



await db.write()

res.json({ success: true, restriction })
})

// GET /api/restrictions/self?employeeId=...&week=...&pin=... - return employee's own entry for a week
app.get('/api/restrictions/self', async (req, res) => {
  const { employeeId, week, pin } = req.query
  if (!employeeId || !week || !pin) return res.status(400).json({ error: 'employeeId, week and pin are required' })
  await db.read()
  const employee = db.data.employees.find(e => e.id === employeeId)
  if (!employee) return res.status(400).json({ error: 'employee not found' })
  if (String(pin) !== String(employee.pin)) return res.status(403).json({ error: 'Incorrect PIN' })
  const existing = db.data.restrictions.find(r => r.employeeId === employeeId && r.weekStart === week)
  if (!existing) return res.status(404).json({ error: 'no entry' })
  res.json(existing)
})

// GET /api/restrictions/self/all?employeeId=...&pin=... - return last 10 entries for the authenticated employee
app.get('/api/restrictions/self/all', async (req, res) => {
  const { employeeId, pin } = req.query
  if (!employeeId || !pin) return res.status(400).json({ error: 'employeeId and pin are required' })
  await db.read()
  const employee = db.data.employees.find(e => e.id === employeeId)
  if (!employee) return res.status(400).json({ error: 'employee not found' })
  if (String(pin) !== String(employee.pin)) return res.status(403).json({ error: 'Incorrect PIN' })
  const items = db.data.restrictions
    .filter(r => r.employeeId === employeeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
  res.json(items)
})

// DELETE /api/restrictions/self?employeeId=...&week=...&pin=... - employee deletes their own entry
app.delete('/api/restrictions/self', async (req, res) => {
  const { employeeId, week, pin } = req.query
  if (!employeeId || !week || !pin) return res.status(400).json({ error: 'employeeId, week and pin are required' })
  await db.read()
  const employee = db.data.employees.find(e => e.id === employeeId)
  if (!employee) return res.status(400).json({ error: 'employee not found' })
  if (String(pin) !== String(employee.pin)) return res.status(403).json({ error: 'Incorrect PIN' })
  const idx = db.data.restrictions.findIndex(r => r.employeeId === employeeId && r.weekStart === week)
  if (idx === -1) return res.status(404).json({ error: 'no entry to delete' })
  const removed = db.data.restrictions.splice(idx, 1)[0]
  await db.write()
  res.json({ success: true, removed })
})

// GET /api/restrictions?week=YYYY-MM-DD - get restrictions, optionally filter by week
app.get('/api/restrictions', async (req, res) => {
  const week = req.query.week
  // require manager passcode to view restrictions
  const pass = req.query.passcode || req.headers['x-manager-passcode']
  if (pass !== MANAGER_PASSCODE) return res.status(403).json({ error: 'manager passcode required' })
  await db.read()
  let items = db.data.restrictions
  if (week) items = items.filter(r => r.weekStart === week)
  // sort by employeeName for stable display
  items.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  res.json(items)
})

// DELETE /api/restrictions/:id - remove a restriction (manager only)
app.delete('/api/restrictions/:id', async (req, res) => {
  const pass = req.query.passcode || req.headers['x-manager-passcode']
  if (pass !== MANAGER_PASSCODE) return res.status(403).json({ error: 'manager passcode required' })
  const id = req.params.id
  await db.read()
  const idx = db.data.restrictions.findIndex(r => r.id === id)
  if (idx === -1) return res.status(404).json({ error: 'restriction not found' })
  const removed = db.data.restrictions.splice(idx, 1)[0]
  await db.write()
  res.json({ success: true, removed })
})

// PUT /api/restrictions/:id/approve - approve a restriction (manager only)
app.put('/api/restrictions/:id/approve', async (req, res) => {
  const pass = req.query.passcode || req.headers['x-manager-passcode']
  if (pass !== MANAGER_PASSCODE) return res.status(403).json({ error: 'manager passcode required' })
  const id = req.params.id
  const { managerNote } = req.body
  await db.read()
  const restriction = db.data.restrictions.find(r => r.id === id)
  if (!restriction) return res.status(404).json({ error: 'restriction not found' })
  restriction.status = 'approved'
  restriction.reviewedAt = new Date().toISOString()
  restriction.reviewedBy = 'Manager'
  restriction.managerNote = managerNote || null
  await db.write()
  res.json({ success: true, restriction })
})

// PUT /api/restrictions/:id/deny - deny a restriction (manager only)
app.put('/api/restrictions/:id/deny', async (req, res) => {
  const pass = req.query.passcode || req.headers['x-manager-passcode']
  if (pass !== MANAGER_PASSCODE) return res.status(403).json({ error: 'manager passcode required' })
  const id = req.params.id
  const { managerNote } = req.body
  await db.read()
  const restriction = db.data.restrictions.find(r => r.id === id)
  if (!restriction) return res.status(404).json({ error: 'restriction not found' })
  restriction.status = 'denied'
  restriction.reviewedAt = new Date().toISOString()
  restriction.reviewedBy = 'Manager'
  restriction.managerNote = managerNote || null
  await db.write()
  res.json({ success: true, restriction })
})

// GET /api/stores - return stores collection
app.get('/api/stores', async (req, res) => {
  await db.read()
  res.json(db.data.stores || [])
})

// GET /api/missing?week=YYYY-MM-DD - return employees who haven't submitted for that week
app.get('/api/missing', async (req, res) => {
  const week = req.query.week
  if (!week) return res.status(400).json({ error: 'week is required as YYYY-MM-DD' })
  await db.read()
  const submittedIds = new Set(db.data.restrictions.filter(r => r.weekStart === week).map(r => r.employeeId))
  const missing = db.data.employees.filter(e => !submittedIds.has(e.id)).map(({ pin, ...rest }) => rest)
  res.json(missing)
})

// GET /api/schedule?week=YYYY-MM-DD - public endpoint, return approved requests for a week
app.get('/api/schedule', async (req, res) => {
  const week = req.query.week
  if (!week) return res.status(400).json({ error: 'week is required as YYYY-MM-DD' })
  await db.read()
  const approved = db.data.restrictions
    .filter(r => r.weekStart === week && r.status === 'approved')
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  res.json(approved)
})

app.listen(PORT, () => {
  console.log(`Mobile Care Schedule backend running on http://localhost:${PORT}`)
})
