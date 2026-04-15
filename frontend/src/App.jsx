import React, { useState } from 'react'
import EmployeeForm from './components/EmployeeForm'
import ManagerDashboard from './components/ManagerDashboard'

export default function App() {
  const [view, setView] = useState('form')

  return (
    <div className="app">
      <header className="topbar">
        <h1>Mobile Care Schedule</h1>
        <nav>
          <button onClick={() => setView('form')} className={view === 'form' ? 'active' : ''}>Employee Form</button>
          <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}>Manager Dashboard</button>
        </nav>
      </header>

      <main>
        {view === 'form' ? <EmployeeForm /> : <ManagerDashboard />}
      </main>

      <footer className="footer">Designed for mobile use — share the form link via WhatsApp</footer>
    </div>
  )
}
