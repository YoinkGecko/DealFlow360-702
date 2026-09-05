import { Link } from "react-router-dom"
import { customerById, money, quoteTotals } from "../data/calc"
import { quotes } from "../data/mock"
import { StatusBadge } from "../components/StatusBadge"

export function DashboardPage() {
  const pending = quotes.filter((quote) => quote.status === "PENDING_APPROVAL")
  const open = quotes.filter(
    (quote) => quote.status === "DRAFT" || quote.status === "PENDING_APPROVAL",
  )
  const confirmed = quotes.filter((quote) => quote.status === "CONFIRMED")
  const pipeline = quotes.reduce((sum, quote) => sum + quoteTotals(quote).sold, 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="lede">Pipeline at a glance. Open a quotation to continue the deal.</p>
        </div>
        <Link to="/quotations" className="btn">
          New quotation
        </Link>
      </div>
      <section className="metrics">
        <article className="metric">
          <span>Open deals</span>
          <strong>{open.length}</strong>
        </article>
        <article className="metric">
          <span>Awaiting approval</span>
          <strong>{pending.length}</strong>
        </article>
        <article className="metric">
          <span>Confirmed</span>
          <strong>{confirmed.length}</strong>
        </article>
        <article className="metric">
          <span>Quoted value</span>
          <strong>{money(pipeline)}</strong>
        </article>
      </section>
      <section className="panel">
        <div className="panel-h">Recent quotations</div>
        <table className="data">
          <thead>
            <tr>
              <th>Quote</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td>
                  <Link to={`/quotations/${quote.id}`}>{quote.number}</Link>
                </td>
                <td>{customerById(quote.customerId).name}</td>
                <td>
                  <StatusBadge status={quote.status} />
                </td>
                <td>{money(quoteTotals(quote).sold)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
