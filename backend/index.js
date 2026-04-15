import express from 'express'
import cors from 'cors'
import db from './db.js'
import { v4 as uuidv4 } from 'uuid'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000

// GET /api/employees - return all employees
app.get('/api/employees', async (req, res) => {
  await db.read()
  res.json(db.data.employees)
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

  // If a storePreference is provided, validate it exists in stores collection
  if (payload.storePreference) {
    const stores = db.data.stores || []
    const match = stores.find(s => s.name === payload.storePreference)
    if (!match) return res.status(400).json({ error: 'invalid storePreference' })
  }

  // New shape: store a single offDay (date only) and notes
  const restriction = {
    id: uuidv4(),
    employeeId: employee.id,
    employeeName: employee.name,
    weekStart: payload.weekStart, // YYYY-MM-DD (Monday)
    offDay: payload.offDay || null, // YYYY-MM-DD
    notes: payload.notes || null,
    storePreference: payload.storePreference || null,
    createdAt: new Date().toISOString()
  }

  db.data.restrictions.push(restriction)
  await db.write()
  res.json({ success: true, restriction })
})

// GET /api/restrictions?week=YYYY-MM-DD - get restrictions, optionally filter by week
app.get('/api/restrictions', async (req, res) => {
  const week = req.query.week
  await db.read()
  let items = db.data.restrictions
  if (week) items = items.filter(r => r.weekStart === week)
  // sort by employeeName for stable display
  items.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  res.json(items)
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
  const missing = db.data.employees.filter(e => !submittedIds.has(e.id))
  res.json(missing)
})

app.listen(PORT, () => {
  console.log(`Mobile Care Schedule backend running on http://localhost:${PORT}`)
})
