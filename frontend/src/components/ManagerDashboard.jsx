import React, { useEffect, useState } from 'react'

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

export default function ManagerDashboard() {
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
    fetch(`http://localhost:4000/api/restrictions?week=${week}`).then(r => r.json()).then(setRestrictions)
    fetch(`http://localhost:4000/api/missing?week=${week}`).then(r => r.json()).then(setMissing)
  }, [week])

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
