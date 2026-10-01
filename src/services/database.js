import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'

const DB_NAME = 'nexa_gestion'
const sqlite = new SQLiteConnection(CapacitorSQLite)

let nativeDbPromise = null

async function getNativeDb() {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('SQLite natif disponible uniquement dans l’application iPhone.')
  }

  if (!nativeDbPromise) {
    nativeDbPromise = (async () => {
      const consistency = await sqlite.checkConnectionsConsistency()
      let conn

      if (consistency.result) {
        try {
          conn = await sqlite.retrieveConnection(DB_NAME, false)
        } catch {
          conn = await sqlite.createConnection(
            DB_NAME,
            false,
            'no-encryption',
            1,
            false
          )
        }
      } else {
        conn = await sqlite.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          1,
          false
        )
      }

      await conn.open()
      return conn
    })()
  }

  return nativeDbPromise
}

/*
 * Mode navigateur :
 * on utilise une petite base mémoire/localStorage
 * uniquement pour tester l'interface sur Chrome/Edge.
 *
 * Sur iPhone, la vraie base SQLite native est utilisée.
 */

const browserTables = {
  users: [],
  clients: [],
  modules: [],
  subscriptions: [],
  subscription_periods: [],
  subscription_contracts: [],
  subscription_payments: [],
  invoices: [],
  charges: [],
  configuration: [],
  audit_logs: []
}

let browserInitialized = false

function browserInit() {
  if (browserInitialized) return

  try {
    const saved = localStorage.getItem('nexa_browser_db')

    if (saved) {
      const parsed = JSON.parse(saved)

      for (const table of Object.keys(browserTables)) {
        if (Array.isArray(parsed[table])) {
          browserTables[table] = parsed[table]
        }
      }
    }
  } catch {
    // Si les données locales sont corrompues, on repart proprement.
  }

  browserInitialized = true
}

function browserSave() {
  localStorage.setItem(
    'nexa_browser_db',
    JSON.stringify(browserTables)
  )
}

function browserNextId(table) {
  const rows = browserTables[table] || []
  return rows.length
    ? Math.max(...rows.map(row => Number(row.id) || 0)) + 1
    : 1
}

function browserQuery(sql, values = []) {
  browserInit()

  const normalized = sql
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  if (normalized.includes('from users')) {
    let rows = [...browserTables.users]

    if (normalized.includes('where username = ?')) {
      rows = rows.filter(
        user =>
          user.username === values[0] &&
          Number(user.actif) === 1
      )
    }

    if (normalized.includes('limit 1')) {
      rows = rows.slice(0, 1)
    }

    return rows
  }

  if (normalized.includes('from modules')) {
    return [...browserTables.modules]
  }

  if (normalized.includes('from configuration')) {
    return [...browserTables.configuration]
  }

  if (normalized.includes('from clients')) {
    return [...browserTables.clients]
  }

  if (normalized.includes('from subscriptions')) {
    return [...browserTables.subscriptions]
  }

  if (normalized.includes('from subscription_periods')) {
    return [...browserTables.subscription_periods]
  }

  if (normalized.includes('from subscription_contracts')) {
    return [...browserTables.subscription_contracts]
  }

  if (normalized.includes('from subscription_payments')) {
    return [...browserTables.subscription_payments]
  }

  if (normalized.includes('from invoices')) {
    return [...browserTables.invoices]
  }

  if (normalized.includes('from charges')) {
    return [...browserTables.charges]
  }

  if (normalized.includes('from audit_logs')) {
    return [...browserTables.audit_logs]
  }

  if (normalized.includes('pragma table_info')) {
    return []
  }

  return []
}

function browserExecute(sql, values = []) {
  browserInit()

  const normalized = sql
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  /*
   * INSERT modules
   */
  if (normalized.includes('insert or ignore into modules')) {
    const [code, nom, description] = values

    if (!browserTables.modules.some(row => row.code === code)) {
      browserTables.modules.push({
        id: browserNextId('modules'),
        code,
        nom,
        description,
        actif: 1,
        created_at: new Date().toISOString()
      })
    }

    browserSave()
    return
  }

  /*
   * INSERT configuration
   */
  if (normalized.includes('insert or ignore into configuration')) {
    const [cle, valeur] = values

    if (!browserTables.configuration.some(row => row.cle === cle)) {
      browserTables.configuration.push({
        id: browserNextId('configuration'),
        cle,
        valeur,
        updated_at: new Date().toISOString()
      })
    }

    browserSave()
    return
  }

  /*
   * INSERT utilisateur
   */
  if (normalized.includes('insert into users')) {
    const [
      prenom,
      nom,
      username,
      password_hash
    ] = values

    browserTables.users.push({
      id: browserNextId('users'),
      prenom,
      nom,
      username,
      email: null,
      telephone: null,
      password_hash,
      role: 'Admin',
      actif: 1,
      last_login: null,
      created_at: new Date().toISOString()
    })

    browserSave()
    return
  }

  /*
   * UPDATE utilisateur
   */
  if (normalized.includes('update users set last_login')) {
    const userId = values[0]
    const user = browserTables.users.find(
      row => Number(row.id) === Number(userId)
    )

    if (user) {
      user.last_login = new Date().toISOString()
      browserSave()
    }

    return
  }

  /*
   * INSERT générique pour les prochaines fonctions.
   */
  const insertMatch = normalized.match(
    /insert(?: or ignore)? into ([a-z_]+)/
  )

  if (insertMatch) {
    const table = insertMatch[1]

    if (browserTables[table]) {
      browserSave()
    }

    return
  }

  /*
   * UPDATE générique.
   */
  if (normalized.startsWith('update ')) {
    browserSave()
    return
  }

  /*
   * ALTER TABLE / CREATE TABLE :
   * aucune opération nécessaire en mode navigateur.
   */
  return
}

export async function execute(sql, values = []) {
  if (Capacitor.isNativePlatform()) {
    const db = await getNativeDb()
    return db.run(sql, values)
  }

  return browserExecute(sql, values)
}

export async function query(sql, values = []) {
  if (Capacitor.isNativePlatform()) {
    const db = await getNativeDb()
    const result = await db.query(sql, values)
    return result.values || []
  }

  return browserQuery(sql, values)
}

export async function transaction(callback) {
  if (Capacitor.isNativePlatform()) {
    const db = await getNativeDb()

    await db.beginTransaction()

    try {
      const result = await callback(db)
      await db.commitTransaction()
      return result
    } catch (error) {
      await db.rollbackTransaction()
      throw error
    }
  }

  return callback({
    run: (sql, values = []) => browserExecute(sql, values),
    query: (sql, values = []) => browserQuery(sql, values)
  })
}

export async function getDatabase() {
  if (Capacitor.isNativePlatform()) {
    return getNativeDb()
  }

  return {
    run: browserExecute,
    query: browserQuery
  }
}
