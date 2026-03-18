import { useState } from "react";

interface Service {
  num: string;
  title: string;
  desc: string;
  detail: string;
  tech: string[];
  projects?: string[];
  useCases?: { delivered: string[]; exploring?: string[]; };
}

interface Props {
  services: Service[];
}

export default function ServiceExpand({ services }: Props) {
  const [activeNum, setActiveNum] = useState<string | null>(null);

  function toggle(e: React.MouseEvent, num: string) {
    e.stopPropagation();
    setActiveNum(prev => prev === num ? null : num);
  }

  return (
    <div className="services-grid reveal">
      {services.map(s => (
        <div key={s.num} className={`service-item ${activeNum === s.num ? "active" : ""}`}>
          <div className="service-header">
            <div className="service-header-content">
              <div className="service-title">{s.title}</div>
              <div className="service-desc">{s.desc}</div>
            </div>
            <button
              className="service-toggle"
              onClick={(e) => toggle(e, s.num)}
              aria-expanded={activeNum === s.num}
              aria-label={`${activeNum === s.num ? "Collapse" : "Expand"} details for ${s.title}`}
            >
              {activeNum === s.num ? "−" : "+"}
            </button>
          </div>
          {activeNum === s.num && (
            <div className="service-detail">
              {s.detail.split("\n\n").map((para, i) => (
                <p key={i} className="service-detail-text">{para}</p>
              ))}
              {s.projects && (
                <div className="service-detail-row">
                  <div className="service-detail-label">Projects</div>
                  <ul className="service-detail-projects">
                    {s.projects.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              )}
              {s.useCases && (
                <>
                  <div className="service-detail-row">
                    <div className="service-detail-label">Delivered</div>
                    <ul className="service-detail-projects">
                      {s.useCases.delivered.map(u => <li key={u}>{u}</li>)}
                    </ul>
                  </div>
                  {s.useCases.exploring && (
                    <div className="service-detail-row">
                      <div className="service-detail-label">Exploring</div>
                      <ul className="service-detail-projects">
                        {s.useCases.exploring.map(u => <li key={u}>{u}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
              <div className="service-tags">
                {s.tech.map(t => <span key={t} className="service-tag">{t}</span>)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}