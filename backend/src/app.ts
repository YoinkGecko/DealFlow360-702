import express from "express";
import cors from "cors";
import helmet from "helmet";

export const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(helmet());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});
