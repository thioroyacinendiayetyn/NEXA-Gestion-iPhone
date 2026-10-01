import { query, execute } from './database'

const tokenUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem('nexa_user') || 'null')
  } catch {
    return null
  }
}

const today = () => new Date().toISOString().slice(0, 10)

function routeParts(path) {
  return path.replace(/^\/+/, '').split('/').filter(Boolean)
}

async function audit(action, entity, entityId = null, details = null) {
  const user = tokenUser()
  await execute(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [user?.id || null, action, entity, entityId, details ? JSON.stringify(details) : null]
  )
}

function idFrom(parts, index = 1) {
  return Number(parts[index])
}

export async function localApi(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body ? JSON.parse(options.body) : {}
  const parts = routeParts(path)

  if (parts[0] === 'auth' && parts[1] === 'me') {
    return { ok: true, user: tokenUser() }
  }

  if (parts[0] === 'health') {
    return { ok: true, database: 'connected', application: 'NEXA Gestion' }
  }

  if (parts[0] === 'dashboard') {
    const clients = await query(`SELECT COUNT(*) count FROM clients`)
    const active = await query(`SELECT COUNT(*) count FROM subscriptions WHERE status='active'`)
    const payments = await query(`SELECT COALESCE(SUM(amount),0) total FROM subscription_payments`)
    const invoices = await query(`SELECT COALESCE(SUM(montant_ttc),0) total FROM invoices`)
    return {
      clients: Number(clients[0]?.count || 0),
      abonnements_actifs: Number(active[0]?.count || 0),
      paiements: Number(payments[0]?.total || 0),
      facturation: Number(invoices[0]?.total || 0)
    }
  }

  if (parts[0] === 'clients') {
    if (method === 'GET' && !parts[1]) {
      return { clients: await query(`SELECT * FROM clients ORDER BY id DESC`) }
    }

    if (method === 'POST') {
      const r = await execute(
        `INSERT INTO clients
          (nom, telephone, email, adresse, ninea, rccm, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          body.nom, body.telephone || null, body.email || null,
          body.adresse || null, body.ninea || null, body.rccm || null,
          body.statut || 'Actif'
        ]
      )
      const id = r.changes?.lastId ?? r.lastId
      await audit('CREATE', 'client', id, body)
      return { client: (await query(`SELECT * FROM clients WHERE id=?`, [id]))[0] }
    }

    if (method === 'PUT' && parts[1]) {
      const id = idFrom(parts)
      await execute(
        `UPDATE clients
         SET nom=?, telephone=?, email=?, adresse=?, ninea=?, rccm=?, statut=?, updated_at=CURRENT_TIMESTAMP
         WHERE id=?`,
        [
          body.nom, body.telephone || null, body.email || null,
          body.adresse || null, body.ninea || null, body.rccm || null,
          body.statut || 'Actif', id
        ]
      )
      await audit('UPDATE', 'client', id, body)
      return { client: (await query(`SELECT * FROM clients WHERE id=?`, [id]))[0] }
    }
  }

  if (parts[0] === 'modules') {
    return { modules: await query(`SELECT * FROM modules WHERE actif=1 ORDER BY id`) }
  }

  if (parts[0] === 'subscriptions') {
    if (method === 'GET' && !parts[1]) {
      return {
        subscriptions: await query(`
          SELECT s.*, c.nom client_nom, m.nom module_nom
          FROM subscriptions s
          LEFT JOIN clients c ON c.id=s.client_id
          LEFT JOIN modules m ON m.id=s.module_id
          ORDER BY s.id DESC
        `)
      }
    }

    if (method === 'POST' && !parts[1]) {
      const r = await execute(
        `INSERT INTO subscriptions
          (client_id,module_id,users_count,monthly_amount,annual_amount,periodicity,status,start_date,end_date)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          body.client_id, body.module_id, body.users_count || 1,
          body.monthly_amount || 0, body.annual_amount || 0,
          body.periodicity || 'monthly', body.status || 'active',
          body.start_date || today(), body.end_date || null
        ]
      )
      const id = r.changes?.lastId ?? r.lastId
      await audit('CREATE', 'subscription', id, body)
      return { subscription: (await query(`SELECT * FROM subscriptions WHERE id=?`, [id]))[0] }
    }

    if (method === 'PUT' && parts[1] && parts[2] === 'terminate') {
      const id = idFrom(parts)
      await execute(`UPDATE subscriptions SET status='terminated', end_date=? WHERE id=?`, [today(), id])
      await audit('TERMINATE', 'subscription', id)
      return { ok: true }
    }

    if (parts[1] && parts[2] === 'periods') {
      const id = idFrom(parts)
      return {
        periods: await query(
          `SELECT * FROM subscription_periods WHERE subscription_id=? ORDER BY period_start DESC`,
          [id]
        )
      }
    }

    if (parts[1] && parts[2] === 'next-payment') {
      const id = idFrom(parts)
      const rows = await query(
        `SELECT * FROM subscription_periods
         WHERE subscription_id=? AND status='pending'
         ORDER BY period_start LIMIT 1`,
        [id]
      )
      return { period: rows[0] || null }
    }

    if (parts[1] && (parts[2] === 'contract' || parts[2] === 'contracts')) {
      const id = idFrom(parts)
      const rows = await query(
        `SELECT * FROM subscription_contracts WHERE subscription_id=? ORDER BY id DESC`,
        [id]
      )
      return { contract: rows[0] || null, contracts: rows }
    }
  }

  if (parts[0] === 'subscription-payments') {
    if (method === 'GET') {
      return {
        payments: await query(`
          SELECT p.*, c.nom client_nom, m.nom module_nom
          FROM subscription_payments p
          JOIN subscriptions s ON s.id=p.subscription_id
          LEFT JOIN clients c ON c.id=s.client_id
          LEFT JOIN modules m ON m.id=s.module_id
          ORDER BY p.id DESC
        `)
      }
    }

    if (method === 'POST') {
      const r = await execute(
        `INSERT INTO subscription_payments
          (subscription_id,period_id,amount,payment_method,reference,payment_date,notes)
         VALUES (?,?,?,?,?,?,?)`,
        [
          body.subscription_id, body.period_id || null, body.amount || 0,
          body.payment_method || null, body.reference || null,
          body.payment_date || today(), body.notes || null
        ]
      )
      const id = r.changes?.lastId ?? r.lastId
      if (body.period_id) {
        await execute(
          `UPDATE subscription_periods SET status='paid', paid_at=CURRENT_TIMESTAMP WHERE id=?`,
          [body.period_id]
        )
      }
      await audit('CREATE', 'subscription_payment', id, body)
      return { payment: (await query(`SELECT * FROM subscription_payments WHERE id=?`, [id]))[0] }
    }
  }

  if (parts[0] === 'invoices') {
    if (method === 'GET') {
      return {
        invoices: await query(`
          SELECT i.*, c.nom client_nom
          FROM invoices i
          LEFT JOIN clients c ON c.id=i.client_id
          ORDER BY i.id DESC
        `)
      }
    }
    if (parts[1] && parts[2] === 'pdf') {
      return { ok: true, invoice: (await query(`SELECT * FROM invoices WHERE id=?`, [idFrom(parts)]))[0] }
    }
  }

  if (parts[0] === 'charges') {
    if (method === 'GET') {
      return { charges: await query(`SELECT * FROM charges ORDER BY date_charge DESC, id DESC`) }
    }
    if (method === 'POST') {
      const r = await execute(
        `INSERT INTO charges (designation,categorie,montant,date_charge,mode_paiement,notes)
         VALUES (?,?,?,?,?,?)`,
        [
          body.designation, body.categorie || null, body.montant || 0,
          body.date_charge || today(), body.mode_paiement || null, body.notes || null
        ]
      )
      const id = r.changes?.lastId ?? r.lastId
      await audit('CREATE', 'charge', id, body)
      return { charge: (await query(`SELECT * FROM charges WHERE id=?`, [id]))[0] }
    }
    if (method === 'PUT' && parts[1]) {
      const id = idFrom(parts)
      await execute(
        `UPDATE charges SET designation=?,categorie=?,montant=?,date_charge=?,mode_paiement=?,notes=? WHERE id=?`,
        [body.designation, body.categorie || null, body.montant || 0, body.date_charge || today(), body.mode_paiement || null, body.notes || null, id]
      )
      await audit('UPDATE', 'charge', id, body)
      return { charge: (await query(`SELECT * FROM charges WHERE id=?`, [id]))[0] }
    }
    if (method === 'DELETE' && parts[1]) {
      const id = idFrom(parts)
      await execute(`DELETE FROM charges WHERE id=?`, [id])
      await audit('DELETE', 'charge', id)
      return { ok: true }
    }
  }

  if (parts[0] === 'reports' && parts[1] === 'ca') {
    const rows = await query(`
      SELECT substr(date_facture,1,7) mois, COALESCE(SUM(montant_ttc),0) montant
      FROM invoices
      GROUP BY substr(date_facture,1,7)
      ORDER BY mois
    `)
    return { report: rows }
  }

  if (parts[0] === 'users') {
    if (method === 'GET') {
      return { users: await query(`SELECT id,prenom,nom,username,email,telephone,role,actif,last_login,created_at FROM users ORDER BY id`) }
    }
    if (method === 'POST') {
      const hash = await (await import('bcryptjs')).default.hash(body.password, 10)
      const r = await execute(
        `INSERT INTO users (prenom,nom,username,email,telephone,password_hash,role,actif)
         VALUES (?,?,?,?,?,?,?,?)`,
        [
          body.prenom, body.nom, body.username, body.email || null,
          body.telephone || null, hash, body.role || 'Utilisateur',
          body.actif === false ? 0 : 1
        ]
      )
      const id = r.changes?.lastId ?? r.lastId
      await audit('CREATE', 'user', id, { username: body.username })
      return { user: (await query(`SELECT id,prenom,nom,username,email,telephone,role,actif FROM users WHERE id=?`, [id]))[0] }
    }
  }

  if (parts[0] === 'configuration') {
    if (method === 'GET') {
      const rows = await query(`SELECT cle,valeur FROM configuration ORDER BY cle`)
      return { configuration: rows }
    }
    if (method === 'PUT') {
      for (const [cle, valeur] of Object.entries(body)) {
        await execute(
          `INSERT INTO configuration (cle,valeur,updated_at)
           VALUES (?,?,CURRENT_TIMESTAMP)
           ON CONFLICT(cle) DO UPDATE SET valeur=excluded.valeur,updated_at=CURRENT_TIMESTAMP`,
          [cle, String(valeur ?? '')]
        )
      }
      await audit('UPDATE', 'configuration', null, body)
      return { ok: true }
    }
  }

  if (parts[0] === 'audit') {
    return {
      logs: await query(`
        SELECT a.*, u.prenom, u.nom
        FROM audit_logs a
        LEFT JOIN users u ON u.id=a.user_id
        ORDER BY a.id DESC
        LIMIT 500
      `)
    }
  }

  throw new Error(`Route locale non prise en charge : ${method} ${path}`)
}
