import { execute, query } from './database'

const statements = [
`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  telephone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'Utilisateur',
  actif INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  telephone TEXT,
  email TEXT,
  adresse TEXT,
  ninea TEXT,
  rccm TEXT,
  statut TEXT DEFAULT 'Actif',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  description TEXT,
  actif INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  module_id INTEGER NOT NULL,
  users_count INTEGER DEFAULT 1,
  monthly_amount REAL DEFAULT 0,
  annual_amount REAL DEFAULT 0,
  periodicity TEXT DEFAULT 'monthly',
  status TEXT DEFAULT 'active',
  start_date TEXT,
  end_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(client_id) REFERENCES clients(id),
  FOREIGN KEY(module_id) REFERENCES modules(id)
)`,
`CREATE TABLE IF NOT EXISTS subscription_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
)`,
`CREATE TABLE IF NOT EXISTS subscription_contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL,
  contract_number TEXT,
  signed_at TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active',
  document_path TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
)`,
`CREATE TABLE IF NOT EXISTS subscription_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL,
  period_id INTEGER,
  amount REAL DEFAULT 0,
  payment_method TEXT,
  reference TEXT,
  payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY(period_id) REFERENCES subscription_periods(id)
)`,
`CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT,
  client_id INTEGER,
  subscription_id INTEGER,
  designation TEXT,
  periode TEXT,
  montant_ht REAL DEFAULT 0,
  tva REAL DEFAULT 0,
  montant_ttc REAL DEFAULT 0,
  statut TEXT DEFAULT 'Impayée',
  date_facture TEXT DEFAULT CURRENT_TIMESTAMP,
  date_echeance TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(client_id) REFERENCES clients(id),
  FOREIGN KEY(subscription_id) REFERENCES subscriptions(id)
)`,
`CREATE TABLE IF NOT EXISTS charges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  designation TEXT NOT NULL,
  categorie TEXT,
  montant REAL DEFAULT 0,
  date_charge TEXT DEFAULT CURRENT_TIMESTAMP,
  mode_paiement TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS configuration (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cle TEXT NOT NULL UNIQUE,
  valeur TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`
]

async function addColumnIfMissing(table, column, definition) {
  const cols = await query(`PRAGMA table_info(${table})`)
  if (!cols.some(c => c.name === column)) {
    await execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

export async function initSchema() {
  for (const sql of statements) await execute(sql)

  await addColumnIfMissing('clients', 'ninea', 'TEXT')
  await addColumnIfMissing('clients', 'rccm', 'TEXT')
  await addColumnIfMissing('clients', 'statut', "TEXT DEFAULT 'Actif'")

  const modules = [
    ['COMMERCE', 'NEXA Commerce', 'Gestion commerciale'],
    ['SANTE', 'NEXA Santé', 'Gestion des établissements de santé'],
    ['PARC_AUTO', 'NEXA Parc Automobile', 'Gestion de parc automobile'],
    ['ENTREPRISE', 'NEXA Entreprise', 'Gestion d’entreprise']
  ]

  for (const [code, nom, description] of modules) {
    await execute(
      `INSERT OR IGNORE INTO modules (code, nom, description, actif)
       VALUES (?, ?, ?, 1)`,
      [code, nom, description]
    )
  }

  const configs = [
    ['nom_entreprise', 'NEXA Gestion'],
    ['devise', 'FCFA'],
    ['pays', 'Sénégal'],
    ['email', 'nexagestion98@gmail.com']
  ]

  for (const [cle, valeur] of configs) {
    await execute(
      `INSERT OR IGNORE INTO configuration (cle, valeur)
       VALUES (?, ?)`,
      [cle, valeur]
    )
  }
}
