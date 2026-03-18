import { useState } from "react";

interface Product {
  id: string;
  name: string;
  role: string;
  desc: string;
  tags: string[];
  problem: string;
  tech: string[];
  audience: string;
  status: string;
  url?: string;
  whitepaper?: string;
  waitlistEndpoint?: string;
}

type WaitlistStatus = "idle" | "submitting" | "success" | "error";

function WaitlistForm({ endpoint }: { endpoint: string }) {
  const [status, setStatus] = useState<WaitlistStatus>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <span className="waitlist-confirm">You're on the list.</span>;
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
      <input
        name="email"
        type="email"
        placeholder="your@email.com"
        required
        className="waitlist-input"
        aria-label="Email address for ImBrain waitlist"
      />
      <button type="submit" className="waitlist-btn" disabled={status === "submitting"}>
        {status === "submitting" ? "…" : "Join waitlist"}
      </button>
      {status === "error" && <span className="waitlist-error">Something went wrong — try again.</span>}
    </form>
  );
}

interface Props {
  products: Product[];
}

function DetailPanel({ d }: { d: Product }) {
  return (
    <div className="detail-panel open">
      <div className="detail-inner">
        <div className="detail-row">
          <div className="detail-col-label">Problem solved</div>
          <div className="detail-col-text">
            {d.problem.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-col-label">Technology</div>
          <div className="detail-tech-row">
            {d.tech.map(t => <span key={t} className="detail-tag">{t}</span>)}
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-col-label">Built for</div>
          <div className="detail-col-text">{d.audience}</div>
        </div>
        {d.url && (
          <div className="detail-row">
            <div className="detail-col-label">Website</div>
            <div className="detail-col-text">
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="detail-link">{d.url.replace("https://", "")}</a>
            </div>
          </div>
        )}
        {d.whitepaper && (
          <div className="detail-row">
            <div className="detail-col-label">White paper</div>
            <div className="detail-col-text">
              <a href={d.whitepaper} className="detail-link">Read white paper →</a>
            </div>
          </div>
        )}
        {d.waitlistEndpoint && (
          <div className="detail-row">
            <div className="detail-col-label">Early access</div>
            <div className="detail-col-text">
              <WaitlistForm endpoint={d.waitlistEndpoint} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductExpand({ products }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  function toggle(p: Product) {
    setActiveId(prev => prev === p.id ? null : p.id);
  }

  return (
    <div className="portfolio-grid reveal" style={{ "--product-cols": Math.min(products.length, 4) } as React.CSSProperties}>
      {products.map(p => (
        <button
          key={p.id}
          className={`product-card ${activeId === p.id ? "active" : ""}`}
          onClick={() => toggle(p)}
          aria-expanded={activeId === p.id}
          aria-controls={`detail-${p.id}`}
          aria-label={`${activeId === p.id ? "Collapse" : "Expand"} details for ${p.name}`}
        >
          <div className="product-index mono">
            <span className="product-role">{p.role}</span>
          </div>
          <div className="product-name">
            {p.name}
            <span className={`product-status product-status--${p.status.toLowerCase().replace(/\s+/g, "-")}`}>{p.status}</span>
          </div>
          <div className="product-desc">{p.desc}</div>
          <div className="tag-row">
            {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
          </div>
          <div className="expand-indicator">+</div>
        </button>
      ))}
      {products.map(p => (
        <div
          key={`detail-${p.id}`}
          id={`detail-${p.id}`}
          role="region"
          aria-label={`${p.name} details`}
          hidden={activeId !== p.id}
          className="product-detail-container"
        >
          <DetailPanel d={p} />
        </div>
      ))}
    </div>
  );
}