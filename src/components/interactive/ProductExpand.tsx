import React, { useState, useEffect, useRef } from "react";

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
          <div className="detail-col-text">{d.problem}</div>
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
      </div>
    </div>
  );
}

export default function ProductExpand({ products }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function toggle(p: Product) {
    setActiveId(prev => prev === p.id ? null : p.id);
  }

  return (
    <div ref={gridRef} className="portfolio-grid reveal">
      {products.map(p => (
        <React.Fragment key={p.id}>
          <div
            key={p.id}
            className={`product-card ${activeId === p.id ? "active" : ""}`}
            onClick={() => toggle(p)}
          >
            <div className="product-index mono">
              <span style={{ color: "#1B4F8A", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {p.role}
              </span>
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
          </div>
          {activeId === p.id && (
            <div style={{ gridColumn: "1 / -1" }}>
              <DetailPanel d={p} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}