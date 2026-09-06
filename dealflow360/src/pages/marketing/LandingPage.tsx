import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Shield, Truck, CreditCard, Eye, Zap } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../lib/utils'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-surface)] z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[var(--color-brand)] text-[var(--color-on-brand)] text-sm font-bold flex items-center justify-center">DF</div>
            <span className="font-semibold">DealFlow360</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--color-muted)]">
            <a href="#product" className="hover:text-[var(--color-text)]">Product</a>
            <a href="#how" className="hover:text-[var(--color-text)]">How it works</a>
            <a href="#features" className="hover:text-[var(--color-text)]">Features</a>
            <a href="#solutions" className="hover:text-[var(--color-text)]">Solutions</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link to="/signup"><Button size="sm">Get Started</Button></Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm font-medium text-[var(--color-brand)] mb-3">Sales freedom. Business control.</p>
          <h1 className="text-3xl lg:text-4xl font-bold text-[var(--color-text)] leading-tight">
            Turn sales decisions into governed business decisions.
          </h1>
          <p className="mt-4 text-[var(--color-muted)] text-lg leading-relaxed">
            DealFlow360 helps sales teams negotiate freely while automatically enforcing pricing policy,
            approval rules, inventory constraints, and billing correctness.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup"><Button size="lg">Get Started <ArrowRight className="w-4 h-4" /></Button></Link>
            <a href="#how"><Button variant="secondary" size="lg">See How It Works</Button></a>
          </div>
        </div>

        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
          <div className="bg-[var(--color-surface)] rounded-md border border-[var(--color-border)] overflow-hidden">
            <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2e7d32]" />
              <span className="text-xs text-[var(--color-muted)]">DealFlow360 — Live Dashboard</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <MiniStat label="Quote Risk" value="18.4%" sub="HIGH" danger />
              <MiniStat label="Approval" value="Pending" sub="Manager + Finance" />
              <MiniStat label="Warehouse" value="3 DCs" sub="₹1,150 ship cost" />
              <MiniStat label="Revenue MTD" value={formatCurrency(4280000)} sub="+12.4%" success />
            </div>
            <div className="px-4 pb-4">
              <p className="text-xs text-[var(--color-muted)] mb-2">Recent activity</p>
              {['Risk calculated — DF-1042', 'Manager approved — DF-1042', 'Allocation complete — DF-1028'].map((a) => (
                <div key={a} className="text-xs py-1.5 border-t border-[var(--color-border)] text-[var(--color-text)]">{a}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-[var(--color-table-header-bg)] border-y border-[var(--color-border)] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">Built for governed sales operations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Feature icon={Shield} title="Intelligent Discount Governance" desc="Calculate deal risk automatically and route approvals based on configurable business policies." />
            <Feature icon={Truck} title="Smart Fulfillment" desc="Allocate inventory across warehouses while minimizing fulfillment cost." />
            <Feature icon={CreditCard} title="Hybrid Billing" desc="Handle one-time charges, recurring subscriptions, and mid-cycle proration in one workflow." />
            <Feature icon={Eye} title="Explainable Decisions" desc="Every automated decision shows exactly why it happened." />
            <Feature icon={Zap} title="Real-Time Operations" desc="Keep sales, finance, and fulfillment teams synchronized with live updates." />
            <Feature icon={CheckCircle2} title="Full Audit Trail" desc="Every business action recorded as an immutable event." />
          </div>
        </div>
      </section>

      <section id="how" className="py-16 max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-10">From proposal to payment</h2>
        <div className="flex flex-wrap justify-center items-center gap-2 text-sm">
          {['Quote', 'Risk Evaluation', 'Approval', 'Fulfillment', 'Billing', 'Payment'].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md font-medium">{step}</span>
              {i < arr.length - 1 && <ArrowRight className="w-4 h-4 text-[var(--color-muted)]" />}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-[var(--color-brand)] text-[var(--color-on-brand)] py-16 text-center">
        <h2 className="text-2xl font-bold">Build better deals with business rules built in.</h2>
        <p className="mt-2 text-white/80">Start governing your sales operations today.</p>
        <Link to="/signup" className="inline-block mt-6">
          <Button variant="secondary" size="lg">Get Started Free</Button>
        </Link>
      </section>

      <footer className="border-t border-[var(--color-border)] py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-between gap-4 text-sm text-[var(--color-muted)]">
          <span>© 2026 DealFlow360</span>
          <div className="flex gap-4">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function MiniStat({ label, value, sub, danger, success }: { label: string; value: string; sub: string; danger?: boolean; success?: boolean }) {
  return (
    <div className="p-3 bg-[var(--color-table-header-bg)] rounded border border-[var(--color-border)]">
      <p className="text-[10px] text-[var(--color-muted)] uppercase">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      <p className={`text-xs mt-0.5 ${danger ? 'text-[var(--color-danger)]' : success ? 'text-[var(--color-success)]' : 'text-[var(--color-muted)]'}`}>{sub}</p>
    </div>
  )
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Shield; title: string; desc: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-5">
      <div className="w-9 h-9 rounded-md bg-[var(--color-brand-light)] flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-[var(--color-brand)]" />
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-sm text-[var(--color-muted)] mt-1">{desc}</p>
    </div>
  )
}
