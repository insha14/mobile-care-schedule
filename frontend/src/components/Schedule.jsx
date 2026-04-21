import React, { useEffect, useState } from 'react'
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getWeekDates(weekStart) {
  if (!weekStart) return []

  const [year, month, day] = weekStart.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)

    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')

    dates.push(`${yyyy}-${mm}-${dd}`)
  }
  return dates
}

function formatDay(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day) // local date

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
}

export default function Schedule() {
  const [week, setWeek] = useState('')
  const [approved, setApproved] = useState([])

  useEffect(() => {
    // default week: Monday of current week
    const d = new Date()
    const day = d.getDay()
    const daysToMonday = 1 - day  // Adjust to always start on Monday
    d.setDate(d.getDate() + daysToMonday)
    setWeek(d.toISOString().slice(0, 10))
  }, [])

  useEffect(() => {
    if (!week) return
    fetch(`${API_BASE}/api/schedule?week=${week}`)
      .then(r => r.json())
      .then(data => setApproved(data))
      .catch(() => setApproved([]))
  }, [week])

  const weekDates = week ? getWeekDates(week) : []

  function goToPreviousWeek() {
    const d = new Date(week)
    d.setDate(d.getDate() - 7)
    setWeek(d.toISOString().slice(0, 10))
  }

  function goToNextWeek() {
    const d = new Date(week)
    d.setDate(d.getDate() + 7)
    setWeek(d.toISOString().slice(0, 10))
  }

  function formatWeekRange() {
    if (!week) return ''
    const start = new Date(week)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startStr} — ${endStr}`
  }

  return (
    <div className="dashboard schedule-view">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px' }}>Approved Schedule</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>{formatWeekRange()}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="nav-button" onClick={goToPreviousWeek} title="Previous week">←</button>
            <button type="button" className="nav-button" onClick={goToNextWeek} title="Next week">→</button>
          </div>
        </div>
        <div className="calendar">
          {weekDates.map(date => {
            const dayApproved = approved.filter(r => r.offDay === date)
            return (
              <div key={date} className="calendar-day">
                <h4>{formatDay(date)}</h4>
                {dayApproved.length === 0 ? (
                  <div className="empty-state">No approved time off</div>
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