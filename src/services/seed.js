import bcrypt from 'bcryptjs'
import { initSchema } from './schema'
import { query, execute } from './database'

export async function seedAdmin() {
  await initSchema()

  const users = await query(
    `SELECT id FROM users LIMIT 1`
  )

  if (users.length > 0) {
    return false
  }

  /*
   * Compte administrateur initial.
   *
   * Le mot de passe temporaire sera demandé
   * à l'utilisateur lors de la première configuration.
   */
  const temporaryPassword = 'NEXA-ADMIN-2026'
  const hash = await bcrypt.hash(temporaryPassword, 10)

  await execute(
    `INSERT INTO users
      (prenom, nom, username, password_hash, role, actif)
     VALUES (?, ?, ?, ?, 'Admin', 1)`,
    [
      'Thioro',
      'Yacine',
      'Thioro Yacine',
      hash
    ]
  )

  return true
}
