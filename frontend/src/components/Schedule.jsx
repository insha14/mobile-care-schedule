import React, { useEffect, useState } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getWeekDates(weekStart) {
  const start = new Date(weekStart)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(date.toISOString().slice(0, 10))
  }
  return dates
}

function formatDay(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function Schedule() {
  const [week, setWeek] = useState('')
  const [approved, setApproved] = useState([])

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
    fetch(`${API_BASE}/api/schedule?week=${week}`)
      .then(r => r.json())
      .then(data => setApproved(data))
      .catch(() => setApproved([]))
  }, [week])

  const weekDates = getWeekDates(week)

  return (
    <div className="dashboard">
      <div className="controls card">
        <label>Select week (Monday)</label>
        <input type="date" value={week} onChange={e => setWeek(e.target.value)} />
      </div>

      <div className="card">
        <h3>Approved Schedule for week starting {week}</h3>
        <div className="calendar">
          {weekDates.map(date => {
            const dayApproved = approved.filter(r => r.offDay === date)
            return (
              <div key={date} className="calendar-day">
                <h4>{formatDay(date)}</h4>
                {dayApproved.length === 0 ? (
                  <p className="muted">No approved time off</p>
                ) : (
                  dayApproved.map(r => (
                    <div key={r.id} className="calendar-item">
                      <strong>{r.employeeName}</strong>
                      {r.storePreference && <div>Store: {r.storePreference}</div>}
                      {r.notes && <div className="muted">Notes: {r.notes}</div>}
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}