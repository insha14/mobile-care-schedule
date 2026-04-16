import React, { useEffect, useState } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function formatOffDay(r) {
  if (!r.offDay) return 'No off day selected'
  try {
    const d = new Date(r.offDay)
    const weekday = d.toLocaleDateString(undefined, { weekday: 'long' })
    return `Off on ${weekday}`
  } catch (e) {
    return `Off on ${r.offDay}`
  }
}

export default function ManagerDashboard({ managerPasscode }) {
  const [week, setWeek] = useState('')
  const [restrictions, setRestrictions] = useState([])
  const [missing, setMissing] = useState([])

  useEffect(() => {
    // default week: next Monday
    const d = new Date()
    const day = d.getDay()
    const daysUntilMonday = (8 - day) % 7 || 7
    d.setDate(d.getDate() + daysUntilMonday)
    setWeek(d.toISOString().slice(0, 10))
  }, [])

  useEffect(() => {
    if (!week) return
    const passQuery = managerPasscode ? `&passcode=${encodeURIComponent(managerPasscode)}` : ''
    fetch(`${API_BASE}/api/restrictions?week=${week}${passQuery}`).then(r => r.json()).then(setRestrictions)
    fetch(`${API_BASE}/api/missing?week=${week}`).then(r => r.json()).then(setMissing)
  }, [week, managerPasscode])

  async function handleDelete(id) {
    if (!managerPasscode) {
      alert('Manager passcode missing')
      return
    }
    const ok = window.confirm('Delete this restriction? This cannot be undone.')
    if (!ok) return
    const res = await fetch(`${API_BASE}/api/restrictions/${id}?passcode=${encodeURIComponent(managerPasscode)}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Delete failed')
      return
    }
    // refresh list for the current week
    const passQuery = `&passcode=${encodeURIComponent(managerPasscode)}`
    fetch(`${API_BASE}/api/restrictions?week=${week}${passQuery}`).then(r => r.json()).then(setRestrictions)
  }

  return (
    <div className="dashboard">
      <div className="controls card">
        <label>Select week (Monday)</label>
        <input type="date" value={week} onChange={e => setWeek(e.target.value)} />
      </div>

      <div className="card">
        <h3>Restrictions for week starting {week}</h3>
        {restrictions.length === 0 && <p>No submissions yet for this week.</p>}
        <div className="grid">
          {restrictions.map(r => (
            <div key={r.id} className="card small">
              <strong>{r.employeeName}</strong>
              <div className="muted">{formatOffDay(r)}</div>
              {r.storePreference && <div>Store pref: {r.storePreference}</div>}
              {r.notes && <div className="muted">Notes: {r.notes}</div>}
              <div style={{ marginTop: '8px' }}>
                <button className="danger" onClick={() => handleDelete(r.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Missing submissions</h3>
        {missing.length === 0 && <p>All employees submitted for this week.</p>}
        <ul>
          {missing.map(m => (
            <li key={m.id}>{m.name} {m.role === 'manager' ? `(${m.homeStore})` : ''}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
