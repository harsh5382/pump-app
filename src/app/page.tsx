"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function HomePage() {
  // Sticky nav border + reveal-on-scroll
  useEffect(() => {
    const nav = document.getElementById("mainNav");
    const onScroll = () => nav?.classList.toggle("on", window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <div className="lp">
      {/* ============ NAV ============ */}
      <nav className="nav" id="mainNav">
        <div className="brand">
          <span className="brand-mark">P</span>
          Pumpline
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-r">
          <Link className="btn btn-outline" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-primary" href="/signup">
            Get started <span className="arr">→</span>
          </Link>
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section>
        <div className="hero">
          <div className="eyebrow">Pump management · built for India</div>
          <h1 className="hero-head">
            Every litre,
            <br />
            every shift,
            <br />
            <em>
              every rupee —
              <br />
              accounted
            </em>
            <br />
            for.
          </h1>
          <p className="hero-lede">
            Pumpline is a calm, careful management system for petrol pumps. Meter
            readings, tank dips, tanker deliveries, payments and shifts — closed
            out cleanly each day, with the numbers that actually reconcile.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary btn-xl" href="/signup">
              Start free <span className="arr">→</span>
            </Link>
            <Link className="btn btn-outline btn-lg" href="/login">
              Sign in to your pump
            </Link>
            <span className="hero-micro">
              Free to start · runs in any browser · works on the forecourt
            </span>
          </div>

          {/* Product peek */}
          <div className="peek-wrap reveal in">
            <div className="peek-bar">
              <span></span>
              <span></span>
              <span></span>
              <div className="addr">pumpline.app/dashboard</div>
            </div>
            <div className="peek-grid">
              <div className="peek-side">
                <div className="pni act">
                  <span className="pni-dot"></span>Overview
                </div>
                <div className="pni">
                  <span className="pni-dot"></span>Tanks
                </div>
                <div className="pni">
                  <span className="pni-dot"></span>Meter readings
                </div>
                <div className="pni">
                  <span className="pni-dot"></span>Payments
                </div>
                <div className="pni">
                  <span className="pni-dot"></span>Stock
                </div>
                <div className="pni">
                  <span className="pni-dot"></span>Reports
                </div>
              </div>
              <div className="peek-main">
                <div className="peek-title">Good morning — today&apos;s pump.</div>
                <div className="peek-sub">
                  28 Jun 2026 · 4 nozzles · 2 tanks · day shift open
                </div>
                <div className="peek-stats">
                  <div className="ps">
                    <div className="ps-l">Petrol sold</div>
                    <div className="ps-v">
                      3,240<span className="u">L</span>
                    </div>
                    <div className="ps-d">↑ today</div>
                  </div>
                  <div className="ps">
                    <div className="ps-l">Diesel sold</div>
                    <div className="ps-v">
                      5,110<span className="u">L</span>
                    </div>
                    <div className="ps-d">↑ today</div>
                  </div>
                  <div className="ps">
                    <div className="ps-l">Revenue</div>
                    <div className="ps-v">₹8.7L</div>
                    <div className="ps-d" style={{ color: "#047857" }}>
                      collected
                    </div>
                  </div>
                  <div className="ps">
                    <div className="ps-l">Stock low</div>
                    <div className="ps-v is-label" style={{ color: "#b91c1c" }}>
                      Tank 2
                    </div>
                    <div className="ps-d" style={{ color: "#b91c1c" }}>
                      12% left
                    </div>
                  </div>
                </div>
                <div className="peek-chart-box">
                  <h6>Fuel sales · last 6 days</h6>
                  <svg
                    width="100%"
                    height="100"
                    viewBox="0 0 500 100"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b45309" stopOpacity=".18" />
                        <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      className="c-area"
                      d="M10,78 L100,58 L190,70 L280,46 L370,34 L460,20 L460,98 L10,98Z"
                      fill="url(#hg)"
                    />
                    <path
                      className="c-line"
                      d="M10,78 L100,58 L190,70 L280,46 L370,34 L460,20"
                      fill="none"
                      stroke="#b45309"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle className="c-dot" cx="460" cy="20" r="4" fill="#b45309" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROBLEM ============ */}
      <section className="s problem-s">
        <div className="si">
          <div className="ey">The honest problem</div>
          <h2 className="sh">
            You ran the pump.
            <br />
            <em>Now the register.</em>
          </h2>
          <p className="sl">
            Two tanks, four nozzles, three shifts and a tanker due Thursday. By
            closing time the meter slips don&apos;t match the cash, and the dip
            reading is on a chit somewhere. The system you need isn&apos;t
            complicated — it just needs to <em>reconcile</em>.
          </p>

          <div className="prob-grid reveal">
            <div>
              <div className="prob-item">
                <div className="prob-n">01</div>
                <div>
                  <h4>Meter slips go missing</h4>
                  <p>
                    Opening and closing readings on loose paper. By month-end
                    nobody can say what each nozzle actually dispensed.
                  </p>
                </div>
              </div>
              <div className="prob-item">
                <div className="prob-n">02</div>
                <div>
                  <h4>Cash never quite ties out</h4>
                  <p>
                    UPI, card, fleet and credit all land in one drawer. Expected
                    revenue and collected payments drift apart quietly.
                  </p>
                </div>
              </div>
              <div className="prob-item">
                <div className="prob-n">03</div>
                <div>
                  <h4>Stock is a guess</h4>
                  <p>
                    System stock says one thing, the dip stick says another. The
                    variance is real money evaporating — or a leak.
                  </p>
                </div>
              </div>
              <div className="prob-item">
                <div className="prob-n">04</div>
                <div>
                  <h4>Reports are a midnight job</h4>
                  <p>
                    The owner wants a monthly sheet. You rebuild it by hand from
                    notebooks every single time.
                  </p>
                </div>
              </div>
            </div>
            <aside className="prob-aside">
              I ran two pumps off a diary and a calculator for years. The first
              month on Pumpline, the stock variance finally made sense — and I
              got my evenings back.
              <div className="attr-row">
                <span className="attr-av">R</span>
                Ramesh K. — Nashik · 2 outlets, 6 nozzles
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="s" id="features">
        <div className="si">
          <div className="ey">What it does</div>
          <h2 className="sh">
            Eight careful
            <br />
            <em>tools. Nothing more.</em>
          </h2>
          <p className="sl">
            Every screen earns its place. Every number is in Indian formatting.
            Every litre is reconciled against stock, cash and shift.
          </p>

          <div className="feat-grid reveal">
            {FEATURES.map((f) => (
              <div
                className={`feat${f.wide ? " wide" : ""}`}
                key={f.tag}
              >
                <div className="feat-ico" dangerouslySetInnerHTML={{ __html: f.icon }} />
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                <div className="feat-tag">{f.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="s how-s" id="how">
        <div className="si">
          <div className="ey">How it works</div>
          <h2 className="sh">
            Four steps.
            <br />
            <em>A clean close every night.</em>
          </h2>
          <p className="sl">
            No migrations, no consultants, no &ldquo;book a demo.&rdquo; Add your
            tanks and nozzles once, then close the day in minutes.
          </p>
          <div className="steps reveal">
            <div className="step">
              <div className="step-n">01</div>
              <h4>Set up the forecourt</h4>
              <p>
                Add tanks, fuel types and nozzles once. Capacities and machine
                numbers, done in five minutes.
              </p>
            </div>
            <div className="step">
              <div className="step-n">02</div>
              <h4>Enter the readings</h4>
              <p>
                Opening and closing meters per nozzle. Litres sold compute
                themselves. Add the day&apos;s dip.
              </p>
            </div>
            <div className="step">
              <div className="step-n">03</div>
              <h4>Log payments &amp; deliveries</h4>
              <p>
                Cash, UPI, card, fleet and credit. Tanker deliveries top up
                stock automatically.
              </p>
            </div>
            <div className="step">
              <div className="step-n">04</div>
              <h4>Close &amp; export</h4>
              <p>
                Sales reconcile against payments and stock. Export the daily or
                monthly sheet in one tap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ REPORT SHOWCASE ============ */}
      <section className="s rc-s">
        <div className="si">
          <div className="rc-grid">
            <div>
              <div className="ey">The day sheet</div>
              <h2 className="sh">
                A close that
                <br />
                <em>actually ties out.</em>
              </h2>
              <p className="sl">
                At the end of every shift, Pumpline lines up litres sold against
                cash collected against stock remaining — and shows you the
                variance before you lock the day.
              </p>
              <ul className="rc-list reveal">
                <li>
                  <span className="chk">
                    <CheckSm />
                  </span>
                  Fuel sold per nozzle, totalled by petrol &amp; diesel
                </li>
                <li>
                  <span className="chk">
                    <CheckSm />
                  </span>
                  Expected revenue vs collected — mismatch flagged in red
                </li>
                <li>
                  <span className="chk">
                    <CheckSm />
                  </span>
                  System stock vs dip reading, with loss/gain in litres
                </li>
                <li>
                  <span className="chk">
                    <CheckSm />
                  </span>
                  Export to Excel or PDF — daily, monthly, fuel, staff or expense
                </li>
              </ul>
            </div>
            <div className="receipt">
              <div className="r-stamp">CLOSED</div>
              <div className="r-head">
                <div>
                  <h5>Day close</h5>
                  <small style={{ color: "var(--ink-500)" }}>
                    Highway Fuels · Nashik
                  </small>
                </div>
                <div style={{ textAlign: "right" }}>
                  <small
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: ".12em",
                      fontSize: "9px",
                    }}
                  >
                    Date
                  </small>
                  <div style={{ fontFamily: "var(--mono)", fontSize: "15px", marginTop: "3px" }}>
                    28 Jun 2026
                  </div>
                </div>
              </div>
              <div className="r-row">
                <span>Petrol sold — 4 nozzles</span>
                <span style={{ fontFamily: "var(--mono)" }}>3,240 L</span>
              </div>
              <div className="r-row">
                <span>Diesel sold — 2 nozzles</span>
                <span style={{ fontFamily: "var(--mono)" }}>5,110 L</span>
              </div>
              <div className="r-row">
                <span>Payments collected</span>
                <span style={{ fontFamily: "var(--mono)" }}>₹8,71,400</span>
              </div>
              <div className="r-row">
                <span>Stock variance (dip)</span>
                <span style={{ fontFamily: "var(--mono)", color: "#047857" }}>+18 L</span>
              </div>
              <div className="r-total">
                <span>Status</span>
                <span>Reconciled</span>
              </div>
              <div
                style={{
                  background: "#f8fafc",
                  padding: "9px 11px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  color: "var(--ink-500)",
                  marginTop: "14px",
                }}
              >
                <strong style={{ color: "var(--ink-700)" }}>Note:</strong> Tank 2
                at 12% — tanker delivery scheduled.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="stats-band">
        <div className="stats-inner">
          <div className="sb">
            <div className="sb-v">
              8<em>+</em>
            </div>
            <div className="sb-l">Modules, one ledger</div>
          </div>
          <div className="sb">
            <div className="sb-v">
              100<em>%</em>
            </div>
            <div className="sb-l">Of litres reconciled</div>
          </div>
          <div className="sb">
            <div className="sb-v">
              3<em>min</em>
            </div>
            <div className="sb-l">To close a shift</div>
          </div>
          <div className="sb">
            <div className="sb-v">
              2<em>tap</em>
            </div>
            <div className="sb-l">Export any report</div>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="s" id="pricing">
        <div className="si">
          <div className="ey">Pricing</div>
          <h2 className="sh">
            Fair for a <em>single pump.</em>
          </h2>
          <p className="sl">
            Start free on one outlet. Pay only when you add pumps, staff and
            cloud backups.
          </p>
          <div className="price-grid">
            <div className="plan">
              <h4>Forecourt</h4>
              <div className="pv is-label">
                Free<small> / forever</small>
              </div>
              <ul>
                <li>One outlet</li>
                <li>Tanks, nozzles &amp; meter readings</li>
                <li>Payments &amp; expenses</li>
                <li>Daily &amp; monthly reports</li>
                <li>Runs in your browser</li>
              </ul>
              <Link className="pcta" href="/signup">
                Start free
              </Link>
            </div>
            <div className="plan pop">
              <h4>Outlet</h4>
              <div className="pv">
                ₹499<small> / month</small>
              </div>
              <ul>
                <li>Everything in Forecourt</li>
                <li>Cloud sync &amp; backups</li>
                <li>Staff shifts &amp; roles</li>
                <li>Stock reconciliation &amp; alerts</li>
                <li>Excel &amp; PDF exports</li>
              </ul>
              <Link className="pcta" href="/signup">
                Start 30-day trial
              </Link>
            </div>
            <div className="plan">
              <h4>Chain</h4>
              <div className="pv">
                ₹1,499<small> / month</small>
              </div>
              <ul>
                <li>Multiple outlets</li>
                <li>Manager &amp; staff roles</li>
                <li>Consolidated reporting</li>
                <li>Audit log &amp; exports</li>
                <li>Priority support</li>
              </ul>
              <Link className="pcta" href="/signup">
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="s" id="faq">
        <div className="si">
          <div className="faq-wrap">
            <div>
              <div className="ey">FAQ</div>
              <h2 className="sh">
                Things we
                <br />
                hear <em>often.</em>
              </h2>
              <p className="sl" style={{ marginBottom: 0 }}>
                Can&apos;t find yours? Sign up and ask us anything from inside the
                app.
              </p>
            </div>
            <div>
              {FAQS.map((q, i) => (
                <details className="faq" key={q.q} open={i === 0}>
                  <summary>{q.q}</summary>
                  <p>{q.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="final-cta">
        <h2>
          Close the day.
          <br />
          <em>Cleanly.</em>
        </h2>
        <p>
          Set up your forecourt in minutes. One outlet free, forever. Every litre
          and every rupee in one place.
        </p>
        <div className="acts">
          <Link className="btn btn-primary btn-xl" href="/signup">
            Create free account <span className="arr">→</span>
          </Link>
          <Link className="btn btn-outline btn-lg" href="/login">
            Sign in
          </Link>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer>
        <div className="foot-in">
          <small>© 2026 Pumpline · Built for the Indian forecourt</small>
          <div className="foot-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

function CheckSm() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const FEATURES = [
  {
    title: "A dashboard that greets you",
    body: "Walk in, see today. Litres sold, revenue collected, stock remaining, and what needs attention before it bites.",
    tag: "01 — Overview",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>`,
  },
  {
    title: "Meter readings, computed",
    body: "Opening and closing per nozzle. Litres sold calculate themselves and roll straight into the day's sales.",
    tag: "02 — Meter readings",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 12l4-2M12 7v1"/></svg>`,
  },
  {
    title: "Tanks &amp; dip reconciliation",
    body: "System stock against the dip stick, every day. The loss or gain in litres is right there — no more guessing.",
    tag: "03 — Stock",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z"/></svg>`,
  },
  {
    title: "Tanker deliveries",
    body: "Log the company, invoice and litres. Stock tops up automatically so your numbers stay honest.",
    tag: "04 — Deliveries",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>`,
  },
  {
    title: "Payments that reconcile",
    body: "Cash, UPI, card, fleet and credit in one place. Expected vs collected flagged the moment they drift.",
    tag: "05 — Payments",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`,
  },
  {
    title: "Shifts &amp; staff",
    body: "Who was on, which nozzles, how much cash. Hand the forecourt over cleanly between shifts.",
    tag: "06 — Shifts",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/></svg>`,
  },
  {
    title: "Reports &amp; exports — Excel and PDF in two taps",
    body: "Daily, monthly, fuel-wise, staff and expense reports. Hand a clean sheet to the owner or your CA without the midnight rebuild.",
    tag: "07 — Reports · 08 — Alerts, users &amp; settings",
    wide: true,
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h16v18H4zM8 8h8M8 12h8M8 16h5"/></svg>`,
  },
];

const FAQS = [
  {
    q: "Does it run on the forecourt?",
    a: "Yes. Pumpline is mobile-first and runs in any browser — phone, tablet or the office desktop. It's a PWA, so you can install it to the home screen and it works even on a flaky connection.",
  },
  {
    q: "How do meter readings become sales?",
    a: "Enter opening and closing meters per nozzle. Litres sold compute automatically, roll into the day's fuel sales by type, and reconcile against the payments you've logged.",
  },
  {
    q: "Can I track multiple tanks and fuel types?",
    a: "Yes. Configure your fuel types, tanks and nozzles once. Deliveries top up the right tank and the dashboard shows stock per tank with low-stock alerts.",
  },
  {
    q: "What about cash vs UPI vs credit?",
    a: "Log payments by type — cash, UPI, card, fleet card or credit customer. Pumpline compares expected revenue to what was collected and flags any mismatch.",
  },
  {
    q: "Who can see what?",
    a: "Roles are built in. Admins manage everything, staff enter readings and payments, and managers get a read-only view. The first account you create becomes the admin.",
  },
  {
    q: "Can I export for my accountant?",
    a: "Anytime. Export daily, monthly, fuel-wise, staff or expense reports to Excel or PDF in two taps.",
  },
];
