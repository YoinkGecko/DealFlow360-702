import { pool } from "../config/pool.js";

export async function findUserByEmail(email: string) {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.password_hash,
      u.is_active,
      r.name AS role
    FROM users u
    JOIN roles r
      ON r.id = u.role_id
    WHERE LOWER(u.email) = LOWER($1)
    `,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.name,
      u.email,
      u.is_active,
      r.name AS role
    FROM users u
    JOIN roles r
      ON r.id = u.role_id
    WHERE u.id = $1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  roleId: string;
}) {
  const result = await pool.query(
    `
    INSERT INTO users (
      name,
      email,
      password_hash,
      role_id
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email
    `,
    [data.name, data.email, data.passwordHash, data.roleId],
  );

  return result.rows[0];
}

export async function findRoleByName(roleName: string) {
  const result = await pool.query(
    `
    SELECT id, name
    FROM roles
    WHERE name = $1
    `,
    [roleName],
  );

  return result.rows[0] ?? null;
}
