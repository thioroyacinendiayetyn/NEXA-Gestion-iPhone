import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'
import { seedAdmin } from './services/seed'

async function start() {
  try {
    await seedAdmin()

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch (error) {
    console.error('Erreur initialisation NEXA SQLite:', error)

    ReactDOM.createRoot(document.getElementById('root')).render(
      <div style={{
        padding: 30,
        fontFamily: 'Arial',
        color: '#b00020'
      }}>
        <h2>Erreur de démarrage NEXA Gestion</h2>
        <p>
          {error?.message || 'Impossible d’initialiser la base de données.'}
        </p>
      </div>
    )
  }
}

start()
