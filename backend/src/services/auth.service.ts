import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  findUserByEmail,
  findRoleByName,
  createUser,
} from "../repositories/auth.repository.js";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role?: string;
}) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  /*
   * For now registration defaults to SALES_REP.
   *
   * We do NOT allow the client to register
   * themselves as ADMIN or FINANCE.
   */
  const roleName = input.role === "CUSTOMER" ? "CUSTOMER" : "SALES_REP";

  const role = await findRoleByName(roleName);

  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    roleId: role.id,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: role.name,
  };
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await findUserByEmail(input.email);

  if (!user || !user.is_active) {
    throw new Error("Invalid email or password");
  }

  const passwordValid = await bcrypt.compare(
    input.password,
    user.password_hash,
  );

  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    getJwtSecret(),
    {
      expiresIn: "1d",
    },
  );

  return {
    token,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}
