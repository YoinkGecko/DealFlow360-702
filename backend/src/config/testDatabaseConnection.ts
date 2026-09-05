import {pool} from "./pool.js"

export async function testDatabaseConnection() {
  const client = await pool.connect();

  try {
    const result = await client.query("SELECT NOW()");

    console.log("PostgreSQL connected:", result.rows[0]);
  } finally {
    client.release();
  }
}