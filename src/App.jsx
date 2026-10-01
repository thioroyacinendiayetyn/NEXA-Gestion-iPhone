import React, { useEffect, useMemo, useState } from 'react'
import { localApi } from './services/localApi'
import { login } from './services/auth'

const api = localApi

async function downloadPdf(path, filename) {
  const match = path.match(/\/invoices\/(\d+)\/pdf/)
  const id = match ? Number(match[1]) : null

  if (!id) {
    throw new Error('Facture introuvable')
  }

  const result = await localApi(`/invoices/${id}/pdf`)
  const invoice = result.invoice

  if (!invoice) {
    throw new Error('Facture introuvable')
  }

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text('NEXA Gestion', 20, 20)

  doc.setFontSize(12)
  doc.text(`Facture : ${invoice.numero || invoice.id}`, 20, 35)
  doc.text(`Désignation : ${invoice.designation || ''}`, 20, 45)
  doc.text(`Période : ${invoice.periode || ''}`, 20, 55)
  doc.text(
    `Montant HT : ${Number(invoice.montant_ht || 0).toLocaleString('fr-FR')} FCFA`,
    20,
    70
  )
  doc.text(
    `TVA : ${Number(invoice.tva || 0).toLocaleString('fr-FR')} FCFA`,
    20,
    80
  )
  doc.text(
    `Montant TTC : ${Number(invoice.montant_ttc || 0).toLocaleString('fr-FR')} FCFA`,
    20,
    90
  )

  doc.save(filename)
}

const menu = [
  ['dashboard', '🏠', 'Tableau de bord'],
  ['clients', '👥', 'Clients'],
  ['subscriptions', '📋', 'Abonnements'],
  ['payments', '💳', 'Paiements'],
  ['invoices', '🧾', 'Factures'],
  ['contracts', '📄', 'Contrats'],
  ['charges', '💸', 'Charges'],
  ['ca', '📊', 'Chiffre d’affaires'],
  ['users', '👤', 'Utilisateurs'],
  ['configuration', '⚙️', 'Configuration'],
  ['audit', '🔐', 'Audit']
]

function money(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0)) + ' FCFA'
}

function dateFr(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR')
}

function monthName(month) {
  return new Date(2025, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long'
  })
}

function Status({ children }) {
  const value = String(children || '').toLowerCase()

  let cls = 'status neutral'

  if (
    value.includes('actif') ||
    value.includes('payé') ||
    value.includes('paye') ||
    value.includes('encaissé') ||
    value.includes('termine')
  ) {
    cls = 'status success'
  }

  if (
    value.includes('impay') ||
    value.includes('retard') ||
    value.includes('partiel')
  ) {
    cls = 'status warning'
  }

  if (
    value.includes('résili') ||
    value.includes('annul') ||
    value.includes('inactif')
  ) {
    cls = 'status danger'
  }

  return <span className={cls}>{children || '-'}</span>
}

function Card({ title, value, icon, subtitle }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  )
}

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
const data = await login(username, password)

sessionStorage.setItem('nexa_user', JSON.stringify(data.user))
onLogin(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">N</div>
        <h1>NEXA Gestion</h1>
        <p className="login-subtitle">
          Administration de votre activité NEXA
        </p>

        <form onSubmit={submit}>
          <label>Nom d’utilisateur</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="admin"
            required
          />

          <label>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Votre mot de passe"
            required
          />

          {error && <div className="alert error">{error}</div>}

          <button className="primary-button full" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="login-footer">
          NEXA Gestion · Dakar, Sénégal
        </div>
      </div>
    </div>
  )
}

function Layout({ user, page, setPage, onLogout, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <strong>NEXA</strong>
            <span>Gestion</span>
          </div>
        </div>

        <nav>
          {menu.map(([id, icon, label]) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">
              {(user?.prenom?.[0] || user?.nom?.[0] || 'A').toUpperCase()}
            </div>
            <div>
              <strong>
                {user?.prenom || ''} {user?.nom || ''}
              </strong>
              <small>{user?.role || 'Utilisateur'}</small>
            </div>
          </div>

          <button className="logout-button" onClick={onLogout}>
            ↪ Déconnexion
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">NEXA Gestion</div>
            <div className="topbar-subtitle">
              Administration et pilotage
            </div>
          </div>

          <div className="topbar-user">
            <span>🇸🇳</span>
            <strong>{user?.prenom || user?.nom || 'Utilisateur'}</strong>
          </div>
        </header>

        <div className="content">{children}</div>
      </main>
    </div>
  )
}

function PageHeader({ title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

function Dashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api('/dashboard').then(setData).catch(console.error)
  }, [])

  if (!data) return <Loading />

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d’ensemble de NEXA Gestion"
      />

      <div className="stats-grid">
        <Card
          title="Clients actifs"
          value={data.clients_actifs}
          icon="👥"
        />
        <Card
          title="Abonnements actifs"
          value={data.abonnements_actifs}
          icon="📋"
        />
        <Card
          title="CA encaissé"
          value={money(data.ca_encaisse)}
          icon="💳"
        />
        <Card
          title="Charges"
          value={money(data.charges)}
          icon="💸"
        />
        <Card
          title="Résultat"
          value={money(data.resultat)}
          icon="📈"
        />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Activité NEXA</h3>
          <p className="muted">
            NEXA Gestion permet de suivre les clients, abonnements,
            paiements, factures, contrats et charges liés à vos solutions.
          </p>

          <div className="module-grid">
            <div className="module-card">
              <span>🛒</span>
              <strong>NEXA Commerce</strong>
            </div>
            <div className="module-card">
              <span>🏥</span>
              <strong>NEXA Santé</strong>
            </div>
            <div className="module-card">
              <span>🚗</span>
              <strong>NEXA Parc Automobile</strong>
            </div>
            <div className="module-card">
              <span>🏢</span>
              <strong>NEXA Entreprise</strong>
            </div>
          </div>
        </div>

        <div className="card info-card">
          <h3>Informations NEXA</h3>
          <div className="info-row">
            <span>NINEA</span>
            <strong>01208518 1A</strong>
          </div>
          <div className="info-row">
            <span>RCCM</span>
            <strong>SN DKR 2026 A 35181</strong>
          </div>
          <div className="info-row">
            <span>Téléphone</span>
            <strong>77 687 49 68</strong>
          </div>
          <div className="info-row">
            <span>Email</span>
            <strong>nexagestion98@gmail.com</strong>
          </div>
          <div className="info-row">
            <span>Site</span>
            <strong>www.nexa.sn</strong>
          </div>
        </div>
      </div>
    </>
  )
}

function Clients() {
  const [clients, setClients] = useState([])
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    ninea: '',
    rccm: ''
  })
  const [error, setError] = useState('')

  async function load() {
    setClients((await api('/clients')).clients || [])
  }

  useEffect(() => {
    load().catch(console.error)
  }, [])

  function openNew() {
    setEditing(null)
    setForm({
      nom: '',
      telephone: '',
      email: '',
      adresse: '',
      ninea: '',
      rccm: ''
    })
    setError('')
    setShow(true)
  }

  function openEdit(client) {
    setEditing(client)
    setForm({
      nom: client.nom || '',
      telephone: client.telephone || '',
      email: client.email || '',
      adresse: client.adresse || '',
      ninea: client.ninea || '',
      rccm: client.rccm || ''
    })
    setError('')
    setShow(true)
  }

  async function submit(e) {
    e.preventDefault()
    setError('')

    try {
      await api(editing ? `/clients/${editing.id}` : '/clients', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(form)
      })

      setShow(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const filtered = clients.filter(c =>
    `${c.nom} ${c.telephone} ${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <>
      <PageHeader
        title="Clients"
        description="Gestion des clients de NEXA"
        action={
          <button className="primary-button" onClick={openNew}>
            + Nouveau client
          </button>
        }
      />

      <div className="toolbar">
        <input
          className="search"
          placeholder="Rechercher un client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card table-card">
        <Table
          columns={[
            'Nom',
            'Téléphone',
            'Email',
            'NINEA',
            'RCCM',
            'Statut',
            'Actions'
          ]}
          rows={filtered.map(client => [
            <strong>{client.nom}</strong>,
            client.telephone || '-',
            client.email || '-',
            client.ninea || '-',
            client.rccm || '-',
            <Status>{client.statut}</Status>,
            <button
              className="small-button"
              onClick={() => openEdit(client)}
            >
              Modifier
            </button>
          ])}
          empty="Aucun client"
        />
      </div>

      {show && (
        <Modal
          title={editing ? 'Modifier le client' : 'Nouveau client'}
          onClose={() => setShow(false)}
        >
          <form onSubmit={submit} className="form-grid">
            <Field
              label="Nom / raison sociale"
              value={form.nom}
              onChange={v => setForm({ ...form, nom: v })}
              required
            />
            <Field
              label="Téléphone"
              value={form.telephone}
              onChange={v => setForm({ ...form, telephone: v })}
            />
            <Field
              label="Email"
              type="text"
              value={form.email}
              onChange={v => setForm({ ...form, email: v })}
            />
            <Field
              label="Adresse"
              value={form.adresse}
              onChange={v => setForm({ ...form, adresse: v })}
            />
            <Field
              label="NINEA"
              value={form.ninea}
              onChange={v => setForm({ ...form, ninea: v })}
            />
            <Field
              label="RCCM"
              value={form.rccm}
              onChange={v => setForm({ ...form, rccm: v })}
            />

            {error && <div className="alert error">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShow(false)}
              >
                Annuler
              </button>
              <button className="primary-button">
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([])
  const [clients, setClients] = useState([])
  const [modules, setModules] = useState([])
  const [show, setShow] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({
    client_id: '',
    module_id: '',
    formule: 'Mensuel',
    montant: '',
    date_debut: '',
    date_prochaine_echeance: ''
  })
  const [error, setError] = useState('')

  async function load() {
    const [s, c, m] = await Promise.all([
      api('/subscriptions'),
      api('/clients'),
      api('/modules')
    ])
    setSubscriptions(s.subscriptions || [])
    setClients(c.clients || [])
    setModules(m.modules || [])
  }

  useEffect(() => {
    load().catch(console.error)
  }, [])

  function openNew() {
    setForm({
      client_id: '',
      module_id: '',
      formule: 'Mensuel',
      montant: '',
      date_debut: new Date().toISOString().slice(0, 10),
      date_prochaine_echeance: ''
    })
    setError('')
    setShow(true)
  }

  async function submit(e) {
    e.preventDefault()
    setError('')

    try {
      await api('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          client_id: Number(form.client_id),
          module_id: Number(form.module_id),
          periodicite: form.formule,
          montant: Number(form.montant)
        })
      })

      setShow(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function terminate(id) {
    if (!confirm('Résilier cet abonnement ?')) return

    try {
      await api(`/subscriptions/${id}/terminate`, {
        method: 'POST'
      })
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Abonnements"
        description="Suivi des abonnements vendus aux clients"
        action={
          <button className="primary-button" onClick={openNew}>
            + Nouvel abonnement
          </button>
        }
      />

      <div className="notice">
        ℹ️ Un abonnement ne contient ni paiement ni facture.
        Les paiements sont enregistrés uniquement dans la rubrique
        <strong> Paiements</strong>.
      </div>

      <div className="card table-card">
        <Table
          columns={[
            'Client',
            'Module',
            'Formule',
            'Montant',
            'Début',
            'Prochaine échéance',
            'Statut',
            'Actions'
          ]}
          rows={subscriptions.map(s => [
            <strong>{s.client_nom}</strong>,
            s.module_nom,
            s.formule,
            money(s.montant),
            dateFr(s.date_debut),
            dateFr(s.date_prochaine_echeance),
            <Status>{s.statut}</Status>,
            <div className="action-row">
              <button
                className="small-button"
                onClick={() => setDetail(s)}
              >
                Détails
              </button>
              {s.statut === 'actif' && (
                <button
                  className="small-button danger-button"
                  onClick={() => terminate(s.id)}
                >
                  Résilier
                </button>
              )}
            </div>
          ])}
          empty="Aucun abonnement"
        />
      </div>

      {show && (
        <Modal
          title="Nouvel abonnement"
          onClose={() => setShow(false)}
        >
          <form onSubmit={submit} className="form-grid">
            <SelectField
              label="Client"
              value={form.client_id}
              onChange={v => setForm({ ...form, client_id: v })}
              options={clients
                .filter(c => !c.statut || String(c.statut).toLowerCase() === 'actif')
                .map(c => [c.id, c.nom])}
              required
            />

            <SelectField
              label="Module"
              value={form.module_id}
              onChange={v => setForm({ ...form, module_id: v })}
              options={modules.map(m => [m.id, m.nom])}
              required
            />

            <SelectField
              label="Formule"
              value={form.formule}
              onChange={v => setForm({ ...form, formule: v })}
              options={[
                ['Mensuel', 'Mensuel'],
                ['Annuel', 'Annuel']
              ]}
            />

            <Field
              label="Montant"
              type="number"
              value={form.montant}
              onChange={v => setForm({ ...form, montant: v })}
              required
            />

            <Field
              label="Date de début"
              type="date"
              value={form.date_debut}
              onChange={v => setForm({ ...form, date_debut: v })}
              required
            />

            <Field
              label="Prochaine échéance"
              type="date"
              value={form.date_prochaine_echeance}
              onChange={v =>
                setForm({ ...form, date_prochaine_echeance: v })
              }
            />

            {error && <div className="alert error">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShow(false)}
              >
                Annuler
              </button>
              <button className="primary-button">
                Créer l’abonnement
              </button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <SubscriptionDetail
          subscription={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  )
}

function SubscriptionDetail({ subscription, onClose }) {
  const [periods, setPeriods] = useState([])
  const [contracts, setContracts] = useState([])
  const [generating, setGenerating] = useState(false)

  async function load() {
    const [p, c] = await Promise.all([
      api(`/subscriptions/${subscription.id}/periods`),
      api(`/subscriptions/${subscription.id}/contracts`)
    ])
    setPeriods(p.periods || [])
    setContracts(c.contracts || [])
  }

  useEffect(() => {
    load().catch(console.error)
  }, [])

  async function generateContract() {
    setGenerating(true)

    try {
      await api(`/subscriptions/${subscription.id}/contract`, {
        method: 'POST'
      })
      await load()
    } catch (err) {
      alert(err.message)
    } finally {
      setGenerating(false)
    }
  }

  function printContract(contract) {
    const win = window.open('', '_blank')

    if (!win) {
      alert("Autorisez les fenêtres pop-up pour NEXA Gestion.")
      return
    }

    const formatDate = value => {
      if (!value) return "—"

      const text = String(value).slice(0, 10)

      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        const [y, m, d] = text.split("-")
        return `${d}/${m}/${y}`
      }

      return text
    }

    const formatMoney = value =>
      Number(value || 0).toLocaleString("fr-FR")

    const numero =
      contract.numero ||
      contract.numero_contrat ||
      "—"

    const dateContrat =
      contract.date_contrat ||
      new Date().toISOString().slice(0, 10)

    const client = subscription.client_nom || "Client"
    const entreprise = subscription.entreprise || ""
    const telephone = subscription.telephone || ""
    const email = subscription.email || ""

    const moduleNom =
      subscription.module_nom || "NEXA Gestion"

    const formule =
      subscription.formule || subscription.periodicite || "—"

    const periodicite =
      subscription.periodicite || "—"

    const montant =
      formatMoney(subscription.montant)

    const dateDebut =
      formatDate(subscription.date_debut)

    const prochaineEcheance =
      formatDate(subscription.prochaine_echeance)

    win.document.write(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">

<title>Contrat ${numero} — NEXA Gestion</title>

<style>

@page {
  size: A4;
  margin: 12mm;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #eef2ed;
  font-family: Arial, Helvetica, sans-serif;
  color: #263126;
}

.sheet {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: #ffffff;
  padding: 15mm 16mm 22mm;
  position: relative;
}

/* =========================
   HEADER
========================= */

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 25px;
  padding-bottom: 16px;
}

.logo-wrap {
  width: 105px;
  height: 70px;
  display: flex;
  align-items: center;
}

.logo {
  max-width: 105px;
  max-height: 70px;
  object-fit: contain;
}

.brand {
  flex: 1;
}

.brand h2 {
  margin: 0;
  color: #31571f;
  font-size: 23px;
  letter-spacing: 1px;
}

.brand p {
  margin: 5px 0 0;
  color: #6b7468;
  font-size: 10px;
  letter-spacing: .8px;
}

.contract-box {
  text-align: right;
}

.contract-box .label {
  color: #7a8177;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.contract-box .number {
  margin-top: 4px;
  color: #31571f;
  font-size: 14px;
  font-weight: 700;
}

.contract-box .date {
  margin-top: 5px;
  font-size: 10px;
  color: #555d53;
}

.green-line {
  height: 4px;
  background: #31571f;
  border-radius: 3px;
  margin-bottom: 22px;
}

/* =========================
   TITLE
========================= */

.title {
  text-align: center;
  margin-bottom: 22px;
}

.title h1 {
  margin: 0;
  color: #31571f;
  font-size: 22px;
  letter-spacing: 2px;
}

.title p {
  margin: 7px 0 0;
  color: #777f75;
  font-size: 10px;
}

/* =========================
   BLOCKS
========================= */

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 18px;
}

.box {
  border: 1px solid #d9dfd6;
  border-radius: 9px;
  overflow: hidden;
  background: #fff;
}

.box-title {
  background: #f0f5ed;
  color: #31571f;
  padding: 9px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .7px;
  text-transform: uppercase;
  border-bottom: 1px solid #d9dfd6;
}

.box-content {
  padding: 12px;
  font-size: 10.5px;
  line-height: 1.7;
}

.box-content strong {
  color: #263126;
}

.muted {
  color: #687067;
}

/* =========================
   SUBSCRIPTION TABLE
========================= */

.section-title {
  margin: 20px 0 9px;
  color: #31571f;
  font-size: 12px;
  font-weight: 700;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 18px;
  font-size: 10px;
}

thead th {
  background: #31571f;
  color: #ffffff;
  padding: 10px 8px;
  text-align: left;
  font-size: 9px;
  letter-spacing: .4px;
}

tbody td {
  border: 1px solid #dfe4dc;
  padding: 10px 8px;
}

tbody tr:nth-child(even) {
  background: #f8faf7;
}

.right {
  text-align: right;
}

/* =========================
   HIGHLIGHT
========================= */

.highlight {
  border: 1px solid #cbd9c5;
  background: #f3f7f1;
  border-radius: 9px;
  padding: 13px 15px;
  margin: 18px 0;
}

.highlight-title {
  color: #31571f;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .7px;
  margin-bottom: 6px;
}

.highlight-value {
  font-size: 17px;
  font-weight: 700;
  color: #263126;
}

/* =========================
   CONDITIONS
========================= */

.conditions {
  font-size: 10.5px;
  line-height: 1.75;
  color: #454d43;
}

.conditions p {
  margin: 0 0 7px;
}

.conditions ul {
  margin: 7px 0 0 18px;
  padding: 0;
}

.conditions li {
  margin-bottom: 5px;
}

/* =========================
   SIGNATURES
========================= */

.signatures {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 35px;
  margin-top: 35px;
}

.signature {
  border-top: 1px solid #cfd6cc;
  padding-top: 9px;
  min-height: 70px;
}

.signature-title {
  color: #31571f;
  font-size: 10px;
  font-weight: 700;
}

.signature-line {
  margin-top: 38px;
  font-size: 9px;
  color: #858c82;
}

/* =========================
   FOOTER
========================= */

.footer {
  position: absolute;
  left: 16mm;
  right: 16mm;
  bottom: 10mm;
  border-top: 1px solid #d5dbd2;
  padding-top: 8px;
  display: flex;
  justify-content: space-between;
  gap: 15px;
  color: #687067;
  font-size: 8.5px;
  line-height: 1.5;
}

.footer strong {
  color: #31571f;
}

/* =========================
   ACTIONS
========================= */

.actions {
  position: fixed;
  top: 15px;
  right: 15px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.actions button {
  border: 0;
  border-radius: 7px;
  padding: 9px 13px;
  background: #31571f;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.actions button.secondary {
  background: #6b7468;
}

@media print {

  body {
    background: #ffffff;
  }

  .sheet {
    margin: 0;
    width: auto;
    min-height: auto;
    padding-bottom: 25mm;
  }

  .actions {
    display: none;
  }

}

</style>
</head>

<body>

<div class="actions">
  <button onclick="window.print()">🖨️ Imprimer / PDF</button>
  <button class="secondary" onclick="window.close()">Fermer</button>
</div>

<div class="sheet">

  <div class="header">

    <div class="logo-wrap">
      <img
        class="logo"
        src="/nexa-logo.png"
        alt="NEXA Gestion"
      >
    </div>

    <div class="brand">
      <h2>NEXA GESTION</h2>
      <p>SOLUTIONS DE GESTION POUR ENTREPRISES</p>
    </div>

    <div class="contract-box">
      <div class="label">Contrat</div>
      <div class="number">${numero}</div>
      <div class="date">
        Date : ${formatDate(dateContrat)}
      </div>
    </div>

  </div>

  <div class="green-line"></div>

  <div class="title">
    <h1>CONTRAT D'ABONNEMENT</h1>
    <p>Contrat de souscription aux solutions NEXA Gestion</p>
  </div>

  <div class="grid">

    <div class="box">

      <div class="box-title">
        Informations du client
      </div>

      <div class="box-content">

        <strong>${client}</strong>

        ${
          entreprise
            ? `<br><span class="muted">${entreprise}</span>`
            : ""
        }

        ${
          telephone
            ? `<br>Téléphone : ${telephone}`
            : ""
        }

        ${
          email
            ? `<br>E-mail : ${email}`
            : ""
        }

      </div>

    </div>

    <div class="box">

      <div class="box-title">
        Informations NEXA Gestion
      </div>

      <div class="box-content">

        <strong>NEXA GESTION</strong>

        <br>Dakar, Sénégal
        <br>Tél. : 77 687 49 68
        <br>E-mail : nexagestion98@gmail.com
        <br>www.nexa.sn

      </div>

    </div>

  </div>

  <div class="section-title">
    DÉTAILS DE L'ABONNEMENT
  </div>

  <table>

    <thead>
      <tr>
        <th>MODULE</th>
        <th>FORMULE</th>
        <th>PÉRIODICITÉ</th>
        <th>DATE DE DÉBUT</th>
        <th>ÉCHÉANCE</th>
        <th class="right">MONTANT</th>
      </tr>
    </thead>

    <tbody>

      <tr>
        <td><strong>${moduleNom}</strong></td>
        <td>${formule}</td>
        <td>${periodicite}</td>
        <td>${dateDebut}</td>
        <td>${prochaineEcheance}</td>
        <td class="right">
          <strong>${montant} FCFA</strong>
        </td>
      </tr>

    </tbody>

  </table>

  <div class="highlight">

    <div class="highlight-title">
      Montant de l'abonnement
    </div>

    <div class="highlight-value">
      ${montant} FCFA
    </div>

  </div>

  <div class="section-title">
    CONDITIONS DE L'ABONNEMENT
  </div>

  <div class="conditions">

    <p>
      Le présent contrat formalise l'abonnement du client
      au module <strong>${moduleNom}</strong> de NEXA Gestion.
    </p>

    <ul>
      <li>
        L'abonnement prend effet à compter du
        <strong>${dateDebut}</strong>.
      </li>

      <li>
        La facturation est effectuée selon la périodicité
        <strong>${periodicite}</strong>.
      </li>

      <li>
        Le montant de l'abonnement est de
        <strong>${montant} FCFA</strong>.
      </li>

      <li>
        Les paiements et l'historique de l'abonnement
        sont enregistrés dans NEXA Gestion.
      </li>

      <li>
        La résiliation de l'abonnement est effectuée
        conformément aux conditions convenues entre
        NEXA Gestion et le client.
      </li>
    </ul>

  </div>

  <div class="signatures">

    <div class="signature">

      <div class="signature-title">
        NEXA GESTION
      </div>

      <div class="signature-line">
        Signature et cachet
      </div>

    </div>

    <div class="signature">

      <div class="signature-title">
        LE CLIENT
      </div>

      <div class="signature-line">
        Signature précédée de la mention « Lu et approuvé »
      </div>

    </div>

  </div>

  <div class="footer">

    <div>
      <strong>NEXA GESTION</strong><br>
      Solutions de gestion pour entreprises
    </div>

    <div>
      NINEA : 01208518 1A<br>
      RCCM : SN DKR 2026 A 35181
    </div>

    <div>
      Tél. : 77 687 49 68<br>
      www.nexa.sn
    </div>

  </div>

</div>

<script>
  window.onload = function() {
    setTimeout(function() {
      window.print();
    }, 500);
  };
</script>

</body>
</html>
    `)

    win.document.close()
  }
  return (
    <Modal
      title={`Abonnement — ${subscription.client_nom}`}
      onClose={onClose}
      wide
    >
      <div className="detail-summary">
        <div>
          <span>Module</span>
          <strong>{subscription.module_nom}</strong>
        </div>
        <div>
          <span>Formule</span>
          <strong>{subscription.formule}</strong>
        </div>
        <div>
          <span>Montant</span>
          <strong>{money(subscription.montant)}</strong>
        </div>
        <div>
          <span>Statut</span>
          <Status>{subscription.statut}</Status>
        </div>
      </div>

      <h3>Échéances</h3>

      <Table
        columns={[
          'Période',
          'Échéance',
          'Montant',
          'Payé',
          'Reste',
          'Statut'
        ]}
        rows={periods.map(p => [
          `${dateFr(p.periode_debut)} → ${dateFr(p.periode_fin)}`,
          dateFr(p.date_echeance),
          money(p.montant),
          money(p.montant_paye),
          money(p.reste),
          <Status>{p.statut}</Status>
        ])}
        empty="Aucune échéance"
      />

      <div className="section-separator" />

      <div className="section-title-row">
        <h3>Contrats</h3>

        <button
          className="primary-button"
          onClick={generateContract}
          disabled={generating}
        >
          {generating ? 'Génération...' : '+ Générer le contrat'}
        </button>
      </div>

      <Table
        columns={['Numéro', 'Date', 'Actions']}
        rows={contracts.map(c => [
          c.numero_contrat,
          dateFr(c.date_contrat),
          <button
            className="small-button"
            onClick={() => printContract(c)}
          >
            Imprimer
          </button>
        ])}
        empty="Aucun contrat"
      />
    </Modal>
  )
}

function Payments() {
  const [subscriptions, setSubscriptions] = useState([])
  const [payments, setPayments] = useState([])
  const [selected, setSelected] = useState('')
  const [next, setNext] = useState(null)
  const [form, setForm] = useState({
    montant: '',
    mode_paiement: 'Espèces',
    reference: '',
    note: ''
  })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [s, p] = await Promise.all([
      api('/subscriptions'),
      api('/subscription-payments')
    ])

    setSubscriptions(
      (s.subscriptions || []).filter(
        x => !x.statut || String(x.statut).toLowerCase() === 'actif'
      )
    )

    setPayments(p.payments || [])
  }

  useEffect(() => {
    load().catch(console.error)
  }, [])

  async function selectSubscription(value) {
    setSelected(value)
    setNext(null)

    if (!value) return

    try {
      const data = await api(`/subscriptions/${value}/next-payment`)
      setNext(data.period || null)

      setForm({
        montant: data.period?.montant_restant || '',
        mode_paiement: 'Espèces',
        reference: '',
        note: ''
      })
    } catch (err) {
      setError(err.message)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')

    try {
      await api('/subscription-payments', {
        method: 'POST',
        body: JSON.stringify({
          subscription_id: Number(selected),
          montant: Number(form.montant),
          mode_paiement: form.mode_paiement,
          reference: form.reference,
          note: form.note
        })
      })

      setShow(false)
      setSelected('')
      setNext(null)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Paiements"
        description="Encaissement et suivi des règlements clients"
        action={
          <button
            className="primary-button"
            onClick={() => {
              setError('')
              setShow(true)
            }}
          >
            + Enregistrer un paiement
          </button>
        }
      />

      <div className="notice">
        🔒 NEXA sélectionne automatiquement la <strong>première
        échéance impayée</strong>. Il est impossible de choisir une
        échéance future.
      </div>

      <div className="card table-card">
        <Table
          columns={[
            'Date',
            'Client',
            'Module',
            'Période',
            'Montant',
            'Mode',
            'Statut'
          ]}
          rows={payments.map(p => [
            dateFr(p.date_paiement),
            p.client_nom,
            p.module_nom,
            `${dateFr(p.periode_debut)} → ${dateFr(p.periode_fin)}`,
            money(p.montant),
            p.mode_paiement,
            <Status>{p.statut}</Status>
          ])}
          empty="Aucun paiement"
        />
      </div>

      {show && (
        <Modal
          title="Enregistrer un paiement"
          onClose={() => setShow(false)}
        >
          <form onSubmit={submit} className="form-grid">
            <SelectField
              label="Client / abonnement actif"
              value={selected}
              onChange={selectSubscription}
              options={subscriptions.map(s => [
                s.id,
                `${s.client_nom} — ${s.module_nom} — ${s.formule}`
              ])}
              required
            />

            {next && (
              <div className="payment-preview">
                <div>
                  <span>Échéance concernée</span>
                  <strong>
                    {dateFr(next.date_echeance)}
                  </strong>
                </div>
                <div>
                  <span>Montant dû</span>
                  <strong>{money(next.montant)}</strong>
                </div>
                <div>
                  <span>Déjà payé</span>
                  <strong>{money(next.montant_paye)}</strong>
                </div>
                <div>
                  <span>Reste</span>
                  <strong>{money(next.montant_restant)}</strong>
                </div>
              </div>
            )}

            <Field
              label="Montant encaissé"
              type="number"
              value={form.montant}
              onChange={v => setForm({ ...form, montant: v })}
              required
            />

            <SelectField
              label="Mode de paiement"
              value={form.mode_paiement}
              onChange={v =>
                setForm({ ...form, mode_paiement: v })
              }
              options={[
                ['Espèces', 'Espèces'],
                ['Wave', 'Wave'],
                ['Orange Money', 'Orange Money'],
                ['Virement bancaire', 'Virement bancaire'],
                ['Chèque', 'Chèque'],
                ['Carte bancaire', 'Carte bancaire'],
                ['Autre', 'Autre']
              ]}
            />

            <Field
              label="Référence"
              value={form.reference}
              onChange={v => setForm({ ...form, reference: v })}
              placeholder="Référence transaction..."
            />

            <Field
              label="Note"
              value={form.note}
              onChange={v => setForm({ ...form, note: v })}
              placeholder="Observation..."
            />

            {error && <div className="alert error">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShow(false)}
              >
                Annuler
              </button>
              <button
                className="primary-button"
                disabled={!selected}
              >
                Valider le paiement
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

function Invoices() {
  const [invoices, setInvoices] = useState([])

  useEffect(() => {
    api('/invoices')
      .then(data => setInvoices(data.invoices || []))
      .catch(console.error)
  }, [])

  return (
    <>
      <PageHeader
        title="Factures"
        description="Factures générées automatiquement après paiement complet"
      />

      <div className="notice">
        🧾 Les factures ne sont pas créées manuellement. Elles sont
        générées automatiquement lorsqu’une échéance est intégralement
        réglée.
      </div>

      <div className="card table-card">
        <Table
          columns={[
            'N° facture',
            'Client',
            'Période',
            'Montant',
            'Payé',
            'Date',
            'Statut',
            'Actions'
          ]}
          rows={invoices.map(i => [
            <strong>{i.numero_facture}</strong>,
            i.client_nom,
            `${dateFr(i.periode_debut)} → ${dateFr(i.periode_fin)}`,
            money(i.montant),
            money(i.montant_paye),
            dateFr(i.date_facture),
            <Status>{i.statut}</Status>,
            <button
              className="small-button"
              onClick={() =>
                downloadPdf(
                  `/invoices/${i.id}/pdf`,
                  `${i.numero_facture}.pdf`
                ).catch(err => alert(err.message))
              }
            >
              PDF
            </button>
          ])}
          empty="Aucune facture"
        />
      </div>
    </>
  )
}

function Contracts() {
  const [subscriptions, setSubscriptions] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api('/subscriptions')
      .then(data => setSubscriptions(data.subscriptions || []))
      .catch(console.error)
  }, [])

  return (
    <>
      <PageHeader
        title="Contrats"
        description="Contrats d’abonnement NEXA"
      />

      <div className="card table-card">
        <Table
          columns={[
            'Client',
            'Module',
            'Formule',
            'Montant',
            'Début',
            'Statut',
            'Actions'
          ]}
          rows={subscriptions.map(s => [
            s.client_nom,
            s.module_nom,
            s.formule,
            money(s.montant),
            dateFr(s.date_debut),
            <Status>{s.statut}</Status>,
            <button
              className="small-button"
              onClick={() => setSelected(s)}
            >
              Voir contrat
            </button>
          ])}
          empty="Aucun abonnement"
        />
      </div>

      {selected && (
        <SubscriptionDetail
          subscription={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

function Charges() {
  const [charges, setCharges] = useState([])
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    categorie: 'Informatique',
    description: '',
    montant: '',
    date_charge: new Date().toISOString().slice(0, 10),
    mode_paiement: 'Espèces'
  })

  async function load() {
    setCharges((await api('/charges')).charges || [])
  }

  useEffect(() => {
    load().catch(console.error)
  }, [])

  function openNew() {
    setEditing(null)
    setForm({
      categorie: 'Informatique',
      description: '',
      montant: '',
      date_charge: new Date().toISOString().slice(0, 10),
      mode_paiement: 'Espèces'
    })
    setShow(true)
  }

  function openEdit(c) {
    setEditing(c)
    setForm({
      categorie: c.categorie,
      description: c.description || '',
      montant: c.montant,
      date_charge: c.date_charge?.slice(0, 10),
      mode_paiement: c.mode_paiement || 'Espèces'
    })
    setShow(true)
  }

  async function submit(e) {
    e.preventDefault()

    try {
      await api(editing ? `/charges/${editing.id}` : '/charges', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...form,
          montant: Number(form.montant)
        })
      })

      setShow(false)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  async function remove(id) {
    if (!confirm('Supprimer cette charge ?')) return

    try {
      await api(`/charges/${id}`, { method: 'DELETE' })
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Charges"
        description="Suivi des dépenses de NEXA"
        action={
          <button className="primary-button" onClick={openNew}>
            + Nouvelle charge
          </button>
        }
      />

      <div className="card table-card">
        <Table
          columns={[
            'Date',
            'Catégorie',
            'Description',
            'Montant',
            'Mode',
            'Actions'
          ]}
          rows={charges.map(c => [
            dateFr(c.date_charge),
            c.categorie,
            c.description || '-',
            money(c.montant),
            c.mode_paiement || '-',
            <div className="action-row">
              <button
                className="small-button"
                onClick={() => openEdit(c)}
              >
                Modifier
              </button>
              <button
                className="small-button danger-button"
                onClick={() => remove(c.id)}
              >
                Supprimer
              </button>
            </div>
          ])}
          empty="Aucune charge"
        />
      </div>

      {show && (
        <Modal
          title={editing ? 'Modifier la charge' : 'Nouvelle charge'}
          onClose={() => setShow(false)}
        >
          <form onSubmit={submit} className="form-grid">
            <SelectField
              label="Catégorie"
              value={form.categorie}
              onChange={v => setForm({ ...form, categorie: v })}
              options={[
                ['Informatique', 'Informatique'],
                ['Télécommunications', 'Télécommunications'],
                ['Marketing', 'Marketing'],
                ['Logiciels', 'Logiciels'],
                ['Déplacement', 'Déplacement'],
                ['Autre', 'Autre']
              ]}
            />

            <Field
              label="Description"
              value={form.description}
              onChange={v =>
                setForm({ ...form, description: v })
              }
              required
            />

            <Field
              label="Montant"
              type="number"
              value={form.montant}
              onChange={v => setForm({ ...form, montant: v })}
              required
            />

            <Field
              label="Date"
              type="date"
              value={form.date_charge}
              onChange={v =>
                setForm({ ...form, date_charge: v })
              }
              required
            />

            <SelectField
              label="Mode de paiement"
              value={form.mode_paiement}
              onChange={v =>
                setForm({ ...form, mode_paiement: v })
              }
              options={[
                ['Espèces', 'Espèces'],
                ['Wave', 'Wave'],
                ['Orange Money', 'Orange Money'],
                ['Virement bancaire', 'Virement bancaire'],
                ['Chèque', 'Chèque'],
                ['Carte bancaire', 'Carte bancaire'],
                ['Autre', 'Autre']
              ]}
            />

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShow(false)}
              >
                Annuler
              </button>
              <button className="primary-button">
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

function CA() {
  const yearNow = new Date().getFullYear()
  const [year, setYear] = useState(yearNow)
  const [data, setData] = useState(null)

  useEffect(() => {
    api(`/reports/ca?year=${year}`)
      .then(setData)
      .catch(console.error)
  }, [year])

  if (!data) return <Loading />

  return (
    <>
      <PageHeader
        title="Chiffre d’affaires"
        description="Analyse du chiffre d’affaires et du résultat"
        action={
          <select
            className="year-select"
            value={year}
            onChange={e => setYear(e.target.value)}
          >
            {[yearNow - 2, yearNow - 1, yearNow, yearNow + 1].map(y => (
              <option key={y}>{y}</option>
            ))}
          </select>
        }
      />

      <div className="stats-grid">
        <Card
          title="CA encaissé"
          value={money(data.total_ca)}
          icon="💰"
        />
        <Card
          title="Charges"
          value={money(data.total_charges)}
          icon="💸"
        />
        <Card
          title="Résultat"
          value={money(data.resultat)}
          icon="📈"
        />
      </div>

      <div className="card table-card">
        <Table
          columns={[
            'Mois',
            'CA encaissé',
            'Charges',
            'Résultat'
          ]}
          rows={data.monthly.map(m => [
            <strong>
              {monthName(m.mois)}
            </strong>,
            money(m.ca),
            money(m.charges),
            money(Number(m.ca) - Number(m.charges))
          ])}
          empty="Aucune donnée"
        />
      </div>
    </>
  )
}

function Users() {
  const [users, setUsers] = useState([])
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'Utilisateur'
  })

  async function load() {
    setUsers((await api('/users')).users || [])
  }

  useEffect(() => {
    load().catch(console.error)
  }, [])

  async function submit(e) {
    e.preventDefault()

    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify(form)
      })

      setShow(false)
      setForm({
        nom: '',
        prenom: '',
        email: '',
        password: '',
        role: 'Utilisateur'
      })
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Utilisateurs autorisés à accéder à NEXA Gestion"
        action={
          <button
            className="primary-button"
            onClick={() => setShow(true)}
          >
            + Nouvel utilisateur
          </button>
        }
      />

      <div className="card table-card">
        <Table
          columns={[
            'Nom',
            'Prénom',
            'Email',
            'Rôle',
            'Statut'
          ]}
          rows={users.map(u => [
            u.nom,
            u.prenom,
            u.email,
            u.role,
            <Status>{u.statut}</Status>
          ])}
          empty="Aucun utilisateur"
        />
      </div>

      {show && (
        <Modal
          title="Nouvel utilisateur"
          onClose={() => setShow(false)}
        >
          <form onSubmit={submit} className="form-grid">
            <Field
              label="Nom"
              value={form.nom}
              onChange={v => setForm({ ...form, nom: v })}
              required
            />

            <Field
              label="Prénom"
              value={form.prenom}
              onChange={v => setForm({ ...form, prenom: v })}
              required
            />

            <Field
              label="Email"
              type="text"
              value={form.email}
              onChange={v => setForm({ ...form, email: v })}
              required
            />

            <Field
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={v =>
                setForm({ ...form, password: v })
              }
              required
            />

            <SelectField
              label="Rôle"
              value={form.role}
              onChange={v => setForm({ ...form, role: v })}
              options={[
                ['Utilisateur', 'Utilisateur'],
                ['Administrateur', 'Administrateur']
              ]}
            />

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShow(false)}
              >
                Annuler
              </button>
              <button className="primary-button">
                Créer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

function Configuration() {
  const [config, setConfig] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const data = await api('/configuration')
    setConfig(data.configuration || [])
    setLoading(false)
  }

  useEffect(() => {
    load().catch(console.error)
  }, [])

  async function save(item) {
    try {
      await api(`/configuration/${item.cle}`, {
        method: 'PUT',
        body: JSON.stringify({
          valeur: item.valeur
        })
      })

      alert('Configuration enregistrée')
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <Loading />

  return (
    <>
      <PageHeader
        title="Configuration"
        description="Paramètres généraux de NEXA Gestion"
      />

      <div className="card config-card">
        {config.map((item, index) => (
          <div className="config-row" key={item.cle}>
            <div>
              <strong>{item.cle}</strong>
              <small>{item.description || ''}</small>
            </div>

            <div className="config-edit">
              <input
                value={item.valeur || ''}
                onChange={e => {
                  const copy = [...config]
                  copy[index] = {
                    ...copy[index],
                    valeur: e.target.value
                  }
                  setConfig(copy)
                }}
              />
              <button
                className="small-button"
                onClick={() => save(item)}
              >
                Enregistrer
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function Audit() {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    api('/audit')
      .then(data => setLogs(data.logs || []))
      .catch(console.error)
  }, [])

  return (
    <>
      <PageHeader
        title="Audit"
        description="Historique des opérations effectuées dans NEXA Gestion"
      />

      <div className="card table-card">
        <Table
          columns={[
            'Date',
            'Utilisateur',
            'Action',
            'Table',
            'ID'
          ]}
          rows={logs.map(l => [
            dateFr(l.created_at),
            l.user_email || '-',
            l.action,
            l.table_name || '-',
            l.record_id || '-'
          ])}
          empty="Aucune opération enregistrée"
        />
      </div>
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
      >
        <option value="">Sélectionner...</option>
        {options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Table({ columns, rows, empty }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(c => <th key={c}>{c}</th>)}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function Loading() {
  return (
    <div className="loading">
      <div className="spinner"></div>
      Chargement...
    </div>
  )
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('nexa_user'))
    } catch {
      return null
    }
  })

  const [page, setPage] = useState('dashboard')

  function logout() {
    sessionStorage.removeItem('nexa_token')
    sessionStorage.removeItem('nexa_user')
    setUser(null)
  }

  if (!user || !sessionStorage.getItem('nexa_token')) {
    return <Login onLogin={setUser} />
  }

  let content

  switch (page) {
    case 'clients':
      content = <Clients />
      break
    case 'subscriptions':
      content = <Subscriptions />
      break
    case 'payments':
      content = <Payments />
      break
    case 'invoices':
      content = <Invoices />
      break
    case 'contracts':
      content = <Contracts />
      break
    case 'charges':
      content = <Charges />
      break
    case 'ca':
      content = <CA />
      break
    case 'users':
      content = <Users />
      break
    case 'configuration':
      content = <Configuration />
      break
    case 'audit':
      content = <Audit />
      break
    default:
      content = <Dashboard />
  }

  return (
    <Layout
      user={user}
      page={page}
      setPage={setPage}
      onLogout={logout}
    >
      {content}
    </Layout>
  )
}

export default App
