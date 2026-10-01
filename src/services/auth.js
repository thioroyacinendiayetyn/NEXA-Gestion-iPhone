import bcrypt from 'bcryptjs'
import { query, execute } from './database'

export async function login(username, password) {
  const cleanUsername = String(username || '').trim()

  if (!cleanUsername || !password) {
    throw new Error('Veuillez saisir votre nom d’utilisateur et votre mot de passe')
  }

  const users = await query(
    `SELECT id, prenom, nom, username, email, telephone,
            password_hash, role, actif
     FROM users
     WHERE username = ? AND actif = 1
     LIMIT 1`,
    [cleanUsername]
  )

  if (!users.length) {
    throw new Error('Nom d’utilisateur ou mot de passe incorrect')
  }

  const user = users[0]

  const valid = await bcrypt.compare(password, user.password_hash)

  if (!valid) {
    throw new Error('Nom d’utilisateur ou mot de passe incorrect')
  }

  await execute(
    `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`,
    [user.id]
  )

  return {
    ok: true,
    token: `local-${user.id}-${Date.now()}`,
    user: {
      id: user.id,
      prenom: user.prenom,
      nom: user.nom,
      username: user.username,
      email: user.email,
      telephone: user.telephone,
      role: user.role,
      actif: user.actif
    }
  }
}

export async function resetAdminPassword(username, newPassword) {
  const cleanUsername = String(username || '').trim()
  const hash = await bcrypt.hash(newPassword, 10)

  // Cherche d'abord le compte demandé
  const existing = await query(
    `SELECT id FROM users WHERE username = ? LIMIT 1`,
    [cleanUsername]
  )

  if (existing.length) {
    await execute(
      `UPDATE users
       SET prenom = ?,
           nom = ?,
           username = ?,
           password_hash = ?,
           role = 'Admin',
           actif = 1
       WHERE id = ?`,
      ['Thioro', 'Yacine', cleanUsername, hash, existing[0].id]
    )

    return
  }

  // Si le nom n'existe pas, récupère le premier utilisateur existant
  const firstUser = await query(
    `SELECT id FROM users ORDER BY id LIMIT 1`
  )

  if (firstUser.length) {
    await execute(
      `UPDATE users
       SET prenom = ?,
           nom = ?,
           username = ?,
           password_hash = ?,
           role = 'Admin',
           actif = 1
       WHERE id = ?`,
      ['Thioro', 'Yacine', cleanUsername, hash, firstUser[0].id]
    )

    return
  }

  // Aucun utilisateur : création du compte Admin
  await execute(
    `INSERT INTO users
      (prenom, nom, username, password_hash, role, actif)
     VALUES (?, ?, ?, ?, 'Admin', 1)`,
    ['Thioro', 'Yacine', cleanUsername, hash]
  )
}

export async function createFirstAdmin(username, password) {
  const cleanUsername = String(username || '').trim()

  const existing = await query(
    `SELECT id FROM users WHERE username = ? LIMIT 1`,
    [cleanUsername]
  )

  if (existing.length) {
    throw new Error('Cet utilisateur existe déjà')
  }

  const hash = await bcrypt.hash(password, 10)

  await execute(
    `INSERT INTO users
      (prenom, nom, username, password_hash, role, actif)
     VALUES (?, ?, ?, ?, 'Admin', 1)`,
    ['Thioro', 'Yacine', cleanUsername, hash]
  )
}

export async function hasUsers() {
  const users = await query(`SELECT id FROM users LIMIT 1`)
  return users.length > 0
}
