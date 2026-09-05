import { useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  customerById,
  lineCost,
  lineMarginPct,
  lineSold,
  money,
  overage,
  productById,
  totalsForLines,
} from "../data/calc"
import {
  categoryCaps,
  customers,
  products,
  quotes,
  type Category,
  type QuoteLine,
} from "../data/mock"

const CATEGORIES: Category[] = ["HARDWARE", "SOFTWARE", "SERVICES", "SUBSCRIPTION"]

export function QuotationBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const existing = quotes.find((quote) => quote.id === id)
  const customerId = existing?.customerId ?? params.get("customer") ?? customers[0].id
  const customer = customerById(customerId)
  const [query, setQuery] = useState("")
  const [lines, setLines] = useState<QuoteLine[]>(existing?.lines ?? [])
  const [notice, setNotice] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? products.filter((product) => product.name.toLowerCase().includes(q))
      : products
    return CATEGORIES.map((category) => ({
      category,
      items: filtered.filter((product) => product.category === category),
    })).filter((group) => group.items.length > 0)
  }, [query])

  const preview = useMemo(() => totalsForLines(lines), [lines])

  function add(productId: string) {
    setLines((current) => {
      const found = current.find((line) => line.productId === productId)
      if (found) {
        return current.map((line) =>
          line.productId === productId
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        )
      }
      return [...current, { productId, quantity: 1, discountPercent: 0 }]
    })
  }

  function setQty(productId: string, quantity: number) {
    const next = Math.max(1, quantity)
    setLines((current) =>
      current.map((line) =>
        line.productId === productId ? { ...line, quantity: next } : line,
      ),
    )
  }

  function setDiscount(productId: string, raw: string) {
    const discountPercent = Number(raw)
    setLines((current) =>
      current.map((line) =>
        line.productId === productId
          ? {
              ...line,
              discountPercent: Number.isFinite(discountPercent)
                ? discountPercent
                : 0,
            }
          : line,
      ),
    )
  }

  function submit() {
    const invalid = lines.some(
      (line) => line.discountPercent < 0 || line.discountPercent > 100,
    )
    if (lines.length === 0) {
      setNotice("Add at least one product.")
      return
    }
    if (invalid) {
      setNotice("Each discount must be between 0 and 100.")
      return
    }
    const score = lines.reduce((sum, line) => {
      const product = productById(line.productId)
      return sum + overage(customer.tier, product.category, line.discountPercent)
    }, 0)
    const level = score <= 0 ? "NONE" : score <= 10 ? "MANAGER" : "MANAGER_THEN_FINANCE"
    setNotice(`Submitted. Risk ${score} · route ${level}.`)
    if (level !== "NONE") {
      navigate("/approvals")
    }
  }

  const locked = existing?.status === "APPROVED" || existing?.status === "CONFIRMED"

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/quotations" className="lede">
            ← Quotations
          </Link>
          <h1>{existing?.number ?? "New quotation"}</h1>
          <p className="lede">
            {customer.name} · {customer.tier} · category caps{" "}
            {Object.entries(categoryCaps[customer.tier])
              .map(([key, value]) => `${key} ${value}%`)
              .join(" · ")}
          </p>
        </div>
      </div>
      <div className="split">
        <section className="panel catalog">
          <div className="panel-h">Catalog</div>
          <div style={{ padding: 12 }}>
            <input
              className="search"
              placeholder="Search products"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {grouped.map((group) => (
            <div className="cat-group" key={group.category}>
              <h3>{group.category}</h3>
              {group.items.map((product) => (
                <div className="prod" key={product.id}>
                  <div>
                    <p>{product.name}</p>
                    <span>
                      {money(product.price)} / {product.unit}
                    </span>
                  </div>
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={locked}
                    onClick={() => add(product.id)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="cart-hero">
            <div>
              <div className="panel-h" style={{ padding: 0, border: 0 }}>
                Cart
              </div>
              <p className="lede">Live total and margin, no round-trip.</p>
            </div>
            <div>
              <strong>{money(preview.sold)}</strong>
              <p className="lede">Margin {preview.marginPct.toFixed(1)}%</p>
            </div>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Disc. %</th>
                <th>Total</th>
                <th>Margin</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={5}>Add items from the catalog.</td>
                </tr>
              ) : (
                lines.map((line) => {
                  const product = productById(line.productId)
                  const sold = lineSold(
                    product,
                    line.quantity,
                    line.discountPercent,
                  )
                  const cost = lineCost(product, line.quantity)
                  const over = overage(
                    customer.tier,
                    product.category,
                    line.discountPercent,
                  )
                  return (
                    <tr key={line.productId}>
                      <td>
                        {product.name}
                        <div className={over > 0 ? "over" : "ok"}>
                          {over > 0
                            ? `Over cap by ${over}pt`
                            : `Within ${categoryCaps[customer.tier][product.category]}% cap`}
                        </div>
                      </td>
                      <td>
                        <div className="qty">
                          <button
                            className="btn icon"
                            type="button"
                            disabled={locked}
                            onClick={() => setQty(line.productId, line.quantity - 1)}
                          >
                            −
                          </button>
                          <b>{line.quantity}</b>
                          <button
                            className="btn icon"
                            type="button"
                            disabled={locked}
                            onClick={() => setQty(line.productId, line.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          className="disc"
                          disabled={locked}
                          value={String(line.discountPercent)}
                          onChange={(event) =>
                            setDiscount(line.productId, event.target.value)
                          }
                        />
                      </td>
                      <td>{money(sold)}</td>
                      <td>{lineMarginPct(sold, cost).toFixed(1)}%</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          <div style={{ padding: 16 }}>
            {notice ? <p className="lede">{notice}</p> : null}
            <button className="btn" type="button" disabled={locked} onClick={submit}>
              Submit for approval
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
