import { pool } from "../config/pool.js";

export async function determineApprovalChain(
  riskScore: number,
): Promise<"NONE" | "MANAGER" | "MANAGER_FINANCE"> {
  const result = await pool.query(
    `
    SELECT required_level
    FROM approval_rules
    WHERE $1 BETWEEN min_risk_score AND max_risk_score
    ORDER BY min_risk_score ASC
    LIMIT 1
    `,
    [riskScore],
  );

  if (result.rows.length === 0) {
    throw new Error(`No approval rule configured for risk score ${riskScore}`);
  }

  return result.rows[0].required_level;
}

