import type { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";

import { findUserById } from "../repositories/auth.repository.js";

import type { AuthUser } from "../types/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header",
      });
    }

    const payload = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;

    if (!payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const user = await findUserById(String(payload.sub));

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "User is inactive or not found",
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    next(error);
  }
}
