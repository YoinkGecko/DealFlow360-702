import express from "express";
import cors from "cors";
import helmet from "helmet";

import { requestLogger } from "./middleware/requestLogger.middleware.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { rateLimiter } from "./middleware/rateLimit.middleware.js";

import quotationRoutes from "./routes/quotation.routes.js";
import approvalRoutes from "./routes/approval.routes.js";
import authRoutes from "./routes/auth.routes.js";

export const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(helmet());
app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/approvals", approvalRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
