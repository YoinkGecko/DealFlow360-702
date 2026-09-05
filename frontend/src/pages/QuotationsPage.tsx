import { type FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { StatusBadge } from "../components/StatusBadge"
import { customerById, money, quoteTotals } from "../data/calc"
import { customers, quotes } from "../data/mock"

export function QuotationsPage() {
  const navigate = useNavigate()
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "")

  function onCreate(event: FormEvent) {
    event.preventDefault()
    navigate(`/quotations/new?customer=${customerId}`)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Quotations</h1>
          <p className="lede">Every deal in one list. Drafts stay editable until submit.</p>
        </div>
        <form className="toolbar" onSubmit={onCreate}>
          <label className="field">
            Customer
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.tier}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" type="submit">
            Create draft
          </button>
        </form>
      </div>
      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Number</th>
              <th>Customer</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Total</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => {
              const customer = customerById(quote.customerId)
              return (
                <tr key={quote.id}>
                  <td>
                    <Link to={`/quotations/${quote.id}`}>{quote.number}</Link>
                  </td>
                  <td>{customer.name}</td>
                  <td>{customer.tier}</td>
                  <td>
                    <StatusBadge status={quote.status} />
                  </td>
                  <td>{money(quoteTotals(quote).sold)}</td>
                  <td>{quote.updatedAt}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </>
  )
}
