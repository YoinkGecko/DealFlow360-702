import "dotenv/config";

import { app } from "./app.js";
import { testDatabaseConnection } from "./config/testDatabaseConnection.js";

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    await testDatabaseConnection();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL:", error);
    process.exit(1);
  }
}

startServer();