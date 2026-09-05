import { Link } from "react-router-dom"
import { customerById, money, overage, productById, quoteTotals } from "../data/calc"
import { quotes } from "../data/mock"

export function ApprovalsPage() {
  const pending = quotes.filter((quote) => quote.status === "PENDING_APPROVAL")

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Approvals</h1>
          <p className="lede">
            Quotes that exceeded a category or tier discount cap.
          </p>
        </div>
      </div>
      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Quote</th>
              <th>Customer</th>
              <th>Overage</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((quote) => {
              const customer = customerById(quote.customerId)
              const score = quote.lines.reduce((sum, line) => {
                const product = productById(line.productId)
                return (
                  sum + overage(customer.tier, product.category, line.discountPercent)
                )
              }, 0)
              return (
                <tr key={quote.id}>
                  <td>{quote.number}</td>
                  <td>
                    {customer.name}
                    <div className="lede">{customer.tier}</div>
                  </td>
                  <td>{score} pt</td>
                  <td>{money(quoteTotals(quote).sold)}</td>
                  <td>
                    <Link to={`/quotations/${quote.id}`}>Review</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </>
  )
}
