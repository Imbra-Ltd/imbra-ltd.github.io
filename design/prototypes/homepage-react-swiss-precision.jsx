import { useState, useEffect, useRef } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Sans', sans-serif; background: #F8F9FA; color: #111318; -webkit-font-smoothing: antialiased; }
  .mono { font-family: 'IBM Plex Mono', monospace; }

  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: rgba(248,249,250,0.92); backdrop-filter: blur(12px);
    border-bottom: 1px solid #DDE2EA; height: 60px;
    display: flex; align-items: center; padding: 0 48px; justify-content: space-between;
  }
  .nav-logo { font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 500; letter-spacing: 0.12em; color: #111318; text-transform: uppercase; }
  .nav-logo span { color: #1B4F8A; }
  .nav-links { display: flex; gap: 36px; align-items: center; }
  .nav-link { font-size: 13px; font-weight: 400; color: #6B7480; cursor: pointer; letter-spacing: 0.03em; transition: color 0.15s; background: none; border: none; padding: 0; }
  .nav-link:hover { color: #111318; }
  .nav-cta { font-size: 13px; font-weight: 500; background: #1B4F8A; color: white; border: none; padding: 8px 20px; cursor: pointer; letter-spacing: 0.04em; transition: background 0.15s; }
  .nav-cta:hover { background: #163F6E; }

  .hero { display: flex; flex-direction: column; border-bottom: 1px solid #DDE2EA; padding-top: 60px; background: #FFFFFF; }
  .hero-left { padding: 80px 48px 48px 48px; display: flex; flex-direction: column; justify-content: center; max-width: 720px; }
  .hero-eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 500; color: #1B4F8A; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
  .hero-eyebrow::before { content: ''; width: 24px; height: 1px; background: #1B4F8A; }
  .hero-headline { font-size: clamp(36px, 4vw, 56px); font-weight: 300; line-height: 1.12; letter-spacing: -0.02em; color: #111318; margin-bottom: 28px; }
  .hero-headline strong { font-weight: 600; }
  .hero-sub { font-size: 16px; font-weight: 300; color: #6B7480; line-height: 1.7; max-width: 440px; margin-bottom: 44px; }
  .hero-actions { display: flex; gap: 16px; align-items: center; }
  .btn-primary { background: #1B4F8A; color: white; font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; font-weight: 500; padding: 14px 28px; border: none; cursor: pointer; letter-spacing: 0.04em; transition: background 0.15s; }
  .btn-primary:hover { background: #163F6E; }
  .btn-ghost { background: none; color: #111318; font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; font-weight: 400; padding: 14px 0; border: none; border-bottom: 1px solid #111318; cursor: pointer; letter-spacing: 0.02em; display: flex; align-items: center; gap: 8px; transition: color 0.15s; }
  .btn-ghost:hover { color: #1B4F8A; border-color: #1B4F8A; }
  .hero-right { border-top: 1px solid #DDE2EA; }
  .hero-stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; }
  .stat-cell { padding: 32px; border-right: 1px solid #DDE2EA; background: #F8F9FA; }
  .stat-cell:last-child { border-right: none; }
  .stat-num { font-family: 'IBM Plex Mono', monospace; font-size: 36px; font-weight: 500; color: #1B4F8A; line-height: 1; margin-bottom: 8px; }
  .stat-label { font-size: 12px; font-weight: 400; color: #6B7480; letter-spacing: 0.05em; text-transform: uppercase; }
  .stat-sub { font-size: 11px; font-weight: 300; color: #9BA3AD; margin-top: 6px; line-height: 1.5; }

  section { padding: 96px 48px; }
  .section-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 500; color: #1B4F8A; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 48px; display: flex; align-items: center; gap: 16px; }
  .section-label::after { content: ''; flex: 1; height: 1px; background: #DDE2EA; }
  .section-heading { font-size: clamp(28px, 3vw, 40px); font-weight: 300; color: #111318; letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 12px; }
  .section-heading strong { font-weight: 600; }
  .section-sub { font-size: 15px; color: #6B7480; font-weight: 300; max-width: 520px; line-height: 1.7; margin-bottom: 56px; }

  #portfolio { background: #FFFFFF; border-top: 1px solid #DDE2EA; border-bottom: 1px solid #DDE2EA; padding-top: 48px; }
  .stack-diagram { display: flex; align-items: stretch; gap: 0; margin-bottom: 48px; border: 1px solid #DDE2EA; }
  .stack-layer { flex: 1; padding: 20px 24px; border-right: 1px solid #DDE2EA; position: relative; }
  .stack-layer:last-child { border-right: none; }
  .stack-layer-num { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #9BA3AD; margin-bottom: 6px; }
  .stack-layer-title { font-size: 13px; font-weight: 500; color: #111318; margin-bottom: 4px; }
  .stack-layer-sub { font-size: 11px; color: #6B7480; font-weight: 300; line-height: 1.5; }
  .stack-arrow { display: flex; align-items: center; padding: 0 4px; color: #1B4F8A; font-size: 16px; background: #FFFFFF; border-right: 1px solid #DDE2EA; }
  .stack-layer.highlight { background: #EBF1F9; }
  .stack-layer.highlight .stack-layer-title { color: #1B4F8A; }
  .portfolio-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #DDE2EA; border: 1px solid #DDE2EA; margin-bottom: 1px; }
  .product-card { background: #FFFFFF; padding: 32px; cursor: pointer; transition: background 0.15s; position: relative; min-height: 180px; }
  .product-card:hover, .product-card.active { background: #EBF1F9; }
  .product-index { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #6B7480; margin-bottom: 20px; }
  .product-name { font-size: 17px; font-weight: 500; color: #111318; margin-bottom: 10px; letter-spacing: -0.01em; }
  .product-desc { font-size: 13px; color: #6B7480; line-height: 1.6; margin-bottom: 20px; font-weight: 300; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 500; padding: 3px 8px; background: #F8F9FA; color: #1B4F8A; border: 1px solid #DDE2EA; letter-spacing: 0.05em; text-transform: uppercase; }
  .product-card.active .tag { background: #FFFFFF; }
  .expand-indicator { position: absolute; bottom: 16px; right: 20px; font-family: 'IBM Plex Mono', monospace; font-size: 18px; color: #1B4F8A; transition: transform 0.2s; }
  .product-card.active .expand-indicator { transform: rotate(45deg); }

  .detail-panel { background: #1B4F8A; color: white; overflow: hidden; transition: max-height 0.35s ease, opacity 0.25s ease; max-height: 0; opacity: 0; }
  .detail-panel.open { max-height: 600px; opacity: 1; }
  .detail-inner { display: flex; flex-direction: column; gap: 0; padding: 36px 32px; }
  .detail-row { display: flex; gap: 24px; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.1); align-items: flex-start; }
  .detail-row:last-child { border-bottom: none; }
  .detail-col-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.5); min-width: 140px; padding-top: 2px; }
  .detail-col-text { font-size: 14px; font-weight: 300; line-height: 1.65; color: rgba(255,255,255,0.9); flex: 1; }
  .detail-tech-row { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
  .detail-tag { font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 3px 8px; border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.8); letter-spacing: 0.05em; }

  #services { background: #F8F9FA; }
  .services-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: #DDE2EA; border: 1px solid #DDE2EA; }
  .service-item { background: #FFFFFF; padding: 36px 32px; transition: background 0.15s; }
  .service-item.active { background: #F0F4FA; }
  .service-tag { font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 3px 8px; border: 1px solid #1B4F8A; color: #1B4F8A; letter-spacing: 0.05em; }
  .service-title { font-size: 16px; font-weight: 500; color: #111318; margin-bottom: 8px; letter-spacing: -0.01em; }
  .service-desc { font-size: 13px; color: #6B7480; line-height: 1.65; font-weight: 300; }

  #expertise { background: #FFFFFF; border-top: 1px solid #DDE2EA; }
  .expertise-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
  .expertise-card { padding: 32px 0; border-top: 2px solid #1B4F8A; }
  .expertise-title { font-size: 15px; font-weight: 500; color: #111318; margin-bottom: 10px; letter-spacing: -0.01em; }
  .expertise-text { font-size: 13px; color: #6B7480; line-height: 1.7; font-weight: 300; }

  #publications { background: #F8F9FA; border-top: 1px solid #DDE2EA; }
  .pub-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #DDE2EA; border: 1px solid #DDE2EA; }
  .pub-cell { background: #FFFFFF; padding: 28px 32px; }
  .pub-journal { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #1B4F8A; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }
  .pub-title { font-size: 14px; font-weight: 500; color: #111318; line-height: 1.5; margin-bottom: 8px; }
  .pub-vol { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #6B7480; }
  .cert-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #1B4F8A; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 16px; }
  .cert-list { display: flex; flex-direction: column; gap: 10px; }
  .cert-item { display: flex; gap: 12px; align-items: flex-start; }
  .cert-dot { width: 4px; height: 4px; background: #1B4F8A; margin-top: 6px; flex-shrink: 0; }
  .cert-text { font-size: 13px; color: #6B7480; font-weight: 300; line-height: 1.5; }

  #contact { background: #111318; color: white; display: flex; align-items: center; justify-content: space-between; padding: 72px 48px; }
  .cta-headline { font-size: clamp(24px, 3vw, 38px); font-weight: 300; letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 12px; }
  .cta-headline strong { font-weight: 600; }
  .cta-sub { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 300; }
  .cta-right { display: flex; flex-direction: column; gap: 12px; align-items: flex-end; }
  .btn-white { background: white; color: #111318; font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; font-weight: 500; padding: 14px 32px; border: none; cursor: pointer; letter-spacing: 0.04em; transition: background 0.15s; white-space: nowrap; }
  .btn-white:hover { background: #EBF1F9; }
  .cta-email { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: rgba(255,255,255,0.4); letter-spacing: 0.05em; }

  footer { background: #111318; color: white; }
  .footer-top { border-bottom: 1px solid rgba(255,255,255,0.08); padding: 16px 48px; display: flex; justify-content: space-between; align-items: center; }
  .footer-legal { display: flex; gap: 32px; }
  .footer-legal-link { font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.5); cursor: pointer; letter-spacing: 0.06em; text-transform: uppercase; background: none; border: none; padding: 0; transition: color 0.15s; }
  .footer-legal-link:hover { color: white; }
  .footer-social { display: flex; gap: 16px; align-items: center; }
  .footer-social-link { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; transition: opacity 0.15s; text-decoration: none; opacity: 0.85; }
  .footer-social-link:hover { opacity: 1; }
  .footer-social-link.linkedin { background: #0A66C2; }
  .footer-social-link.github { background: #24292F; }
  .footer-body { padding: 40px 48px; display: grid; grid-template-columns: 280px 1fr; gap: 64px; }
  .footer-address .footer-logo { font-family: 'IBM Plex Mono', monospace; font-size: 14px; font-weight: 500; color: white; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 16px; display: block; }
  .footer-address .footer-logo span { color: #1B4F8A; }
  .footer-address p { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 300; line-height: 1.9; }
  .footer-address a { color: rgba(255,255,255,0.4); text-decoration: none; }
  .footer-desc-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 500; color: #1B4F8A; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 14px; }
  .footer-desc-text { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 300; line-height: 1.8; max-width: 680px; }
  .footer-bottom { border-top: 1px solid rgba(255,255,255,0.06); padding: 16px 48px; display: flex; justify-content: space-between; align-items: center; }
  .footer-copy { font-size: 11px; color: rgba(255,255,255,0.2); font-weight: 300; }

  .reveal { opacity: 0; transform: translateY(18px); transition: opacity 0.5s ease, transform 0.5s ease; }
  .reveal.visible { opacity: 1; transform: translateY(0); }

  .hamburger { display: none; flex-direction: column; gap: 5px; cursor: pointer; background: none; border: none; padding: 4px; }
  .hamburger span { display: block; width: 22px; height: 2px; background: #111318; transition: all 0.2s; }
  .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
  .hamburger.open span:nth-child(2) { opacity: 0; }
  .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
  .mobile-menu { display: none; position: fixed; top: 60px; left: 0; right: 0; background: #FFFFFF; border-bottom: 1px solid #DDE2EA; padding: 16px 20px; z-index: 999; flex-direction: column; gap: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .mobile-menu.open { display: flex; }
  .mobile-menu-link { font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; font-weight: 400; color: #111318; background: none; border: none; padding: 12px 0; cursor: pointer; text-align: left; border-bottom: 1px solid #F0F0F0; letter-spacing: 0.01em; }
  .mobile-menu-link:last-child { border-bottom: none; }
  .mobile-menu-cta { margin-top: 8px; background: #1B4F8A; color: white; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500; padding: 12px 20px; border: none; cursor: pointer; letter-spacing: 0.04em; text-align: center; }
  @media (max-width: 768px) {
    .hamburger { display: flex; }
  }
  @media (max-width: 1024px) {
    nav { padding: 0 32px; }
    .hero-content { padding: 64px 32px 40px; }
    .stat-strip { grid-template-columns: repeat(2, 1fr); }
    section { padding: 56px 32px; }
    .portfolio-grid { grid-template-columns: repeat(2, 1fr); }
    .expertise-grid { grid-template-columns: repeat(2, 1fr); }
    .services-grid { grid-template-columns: 1fr; }
    .pub-grid { grid-template-columns: 1fr; }
    #contact { padding: 56px 32px; }
    .footer-top { padding: 16px 32px; }
    .footer-body { padding: 32px 32px; gap: 40px; }
    .footer-bottom { padding: 16px 32px; }
  }

  /* ── Mobile (≤768px) ── */
  @media (max-width: 768px) {
    nav { padding: 0 20px; height: 56px; }
    .nav-links { display: none; }
    .nav-cta { display: none; }
    .hero-content { padding: 48px 20px 32px; max-width: 100%; }
    .hero-eyebrow { font-size: 10px; }
    .stat-strip { grid-template-columns: repeat(2, 1fr); padding: 0; }
    .stat-card { padding: 24px 20px; }
    .stat-num { font-size: 28px; }
    section { padding: 48px 20px; }
    .section-label { font-size: 10px; }
    .section-heading { font-size: clamp(22px, 6vw, 32px); }
    .portfolio-grid { grid-template-columns: 1fr; }
    .product-card { padding: 28px 24px; }
    .services-grid { grid-template-columns: 1fr; }
    .service-item { padding: 24px 20px; }
    .expertise-grid { grid-template-columns: 1fr; gap: 0; }
    .expertise-card { padding: 24px 0; }
    .pub-grid { grid-template-columns: 1fr; }
    .pub-cell { padding: 24px 20px; }
    .detail-panel { padding: 24px 20px; }
    .detail-inner { gap: 20px; }
    .detail-row { flex-direction: column; gap: 8px; }
    .detail-col-label { min-width: unset; }
    #contact { flex-direction: column; align-items: flex-start; gap: 32px; padding: 48px 20px; }
    .cta-right { align-items: flex-start; }
    .footer-top { padding: 14px 20px; flex-wrap: wrap; gap: 12px; }
    .footer-legal { gap: 20px; flex-wrap: wrap; }
    .footer-body { grid-template-columns: 1fr; padding: 28px 20px; gap: 32px; }
    .footer-bottom { padding: 14px 20px; }
  }

  /* ── Small mobile (≤480px) ── */
  @media (max-width: 480px) {
    .stat-strip { grid-template-columns: 1fr; }
    .hero-headline { font-size: clamp(28px, 8vw, 40px); }
  }
`;

const products = [
  {
    id: "01",
    name: "Siemens PLC Libraries",
    role: "Device-side logic",
    desc: "Custom FC/FB blocks for Siemens PLCs — usable standalone or as part of a historian stack, producing clean, well-structured data at the source with enriched control logic.",
    tags: ["PLC Programming", "Reusable Components", "Automation", "Commissioning"],
    problem: "Standard Siemens blocks cover the basics but leave gaps in complex control scenarios. The library addresses this with two approaches: enriched wrappers that extend existing components like PID, and purpose-built blocks for functionality that has no standard equivalent. FC (Function) and FB (Function Block) are the two fundamental reusable code units in Siemens PLC programming — FCs are stateless logic routines, FBs retain their own memory across calls, making them ideal for encapsulating equipment like drives, valves, or controllers.",
    tech: ["Siemens S7-300/1500", "TIA Portal", "SCL", "Ladder", "FC/FB architecture"],
    audience: "Automation engineers, system integrators, OEM machine builders working with Siemens platforms.",
  },
  {
    id: "02",
    name: "Communication Stack SDKs",
    role: "Connectivity layer",
    desc: "Protocol implementations used by historian agents to connect plant devices to the historian, and as the foundation for custom PLC logic delivered to customers.",
    tags: ["Rapid Prototyping", "Fieldbus", "IoT", "Embedded"],
    problem: "Connecting OT devices to modern software stacks requires a pragmatic combination of proven open-source libraries and purpose-built implementations — covering edge cases and proprietary behaviours found only in real plant environments.",
    tech: ["Modbus TCP/IP", "Modbus RTU", "DeviceNet", "Profibus", "CAN", "CANopen", "OPC-UA", "MQTT", "HART", "EtherNet/IP"],
    audience: "Embedded engineers, system integrators, MES developers building device connectivity layers.",
  },
  {
    id: "03",
    name: "Plant Historian",
    role: "Core platform",
    desc: "An open-architecture historian for small and medium-sized plants — minimal well-defined core, open below via agents, open above via plugins. Free to try, paid plugins and optional support.",
    tags: ["Open Source", "Plugin Architecture", "OT Connectivity", "SMB"],
    problem: "Most industrial historians are expensive, closed, and sized for enterprise. Imbra.soft's historian is built on an open hourglass architecture — like TCP/IP, it defines a minimal, well-specified core with open contracts on both sides: plant-facing agents connect any data source below, and application plugins consume the data above. The core and agents are open source. Engineers are encouraged to install, explore, and run it at no cost. Value is delivered through plugins that work with the data, plus optional installation and maintenance services for teams that need them.",
    tech: ["TimescaleDB", "InfluxDB", "OPC-UA", "Python", "Go", "REST API", "gRPC", "Docker"],
    audience: "Engineers and operations teams at small and medium-sized industrial plants looking for a capable historian without enterprise licensing costs.",
  },
];

const services = [
  {
    num: "01", title: "Backend Development",
    desc: "Full-cycle software development from architecture to production deployment. Emphasis on readable, maintainable code suitable for industrial and data-intensive domains.",
    detail: "Covers greenfield applications, service APIs, CLI tools, and data-processing pipelines. Python for scripting, automation, and data work; Go for high-performance services and agents; TypeScript for web frontends and tooling. Code is written for long-term maintainability in operational environments — not just to ship.",
    tech: ["Python", "Go", "TypeScript", "REST APIs", "Docker", "PostgreSQL"],
  },
  {
    num: "02", title: "Application Refactoring",
    desc: "Structured modernisation of legacy codebases — improving type safety, test coverage, performance, and long-term maintainability.",
    detail: "Typical starting points: no type hints, no tests, monolithic scripts, undocumented business logic. The process involves audit, incremental refactoring with test coverage added in parallel, and optional migration to a cleaner architecture. Industrial codebases often carry years of accumulated workarounds — this service untangles them safely.",
    tech: ["Code Audit", "Type Safety", "Test Coverage", "CI Integration", "Architecture Review"],
  },
  {
    num: "03", title: "QA Specifications & Automated Testing",
    desc: "Test strategy definition, automated test implementation, and CI pipeline integration for complex industrial and data-intensive applications.",
    detail: "Includes writing formal QA specifications, defining acceptance criteria, building automated test suites, and wiring them into CI pipelines. For industrial systems, this also covers historian replay testing — validating behaviour against recorded process data.",
    tech: ["TDD", "BDD", "Integration Tests", "System Tests", "TestRail", "Playwright", "Jenkins", "Docker", "Git"],
  },
  {
    num: "04", title: "DevOps & CI/CD",
    desc: "Pipeline design and automation using Git, Jenkins, Ansible, and Docker — covering build, test, deployment, and infrastructure-as-code for industrial and cloud environments.",
    detail: "Designed for teams moving from manual deployments to repeatable, auditable release processes. Covers Git branching strategy, Jenkins pipeline authoring, Ansible playbooks for provisioning and configuration management, and Dockerised deployment targets — including air-gapped industrial environments.",
    tech: ["Git", "GitHub", "GitLab", "Jenkins", "Ansible", "Docker", "Azure DevOps"],
  },
  {
    num: "05", title: "Cloud Architecture & Deployment",
    desc: "Design and deployment of cloud-based solutions on Azure — containerised workloads, infrastructure provisioning, and integration between OT systems and cloud platforms.",
    detail: "Covers Azure resource design, containerised workload deployment, secure OT-to-cloud data bridging, and long-term cost-aware architecture. Particularly relevant for plants looking to expose historian data to cloud analytics without re-architecting their OT layer.",
    tech: ["Azure", "Docker", "Terraform", "REST APIs", "OPC-UA"],
  },
  {
    num: "06", title: "Pentesting & Security Hardening",
    desc: "Security assessment and hardening for OT/IT systems — identifying vulnerabilities at the boundary between plant networks and IT infrastructure before they become incidents.",
    detail: "Covers network and protocol-level penetration testing of industrial environments — OPC-UA endpoints, PLC interfaces, SCADA communication channels, and OT/IT boundary devices. Security hardening includes access control review, encrypted transport configuration, network segmentation recommendations, and remediation guidance. OT security requires a different approach from web app pentesting — deep protocol knowledge and understanding of plant availability constraints are essential.",
    tech: ["OT Security", "Network Pentesting", "OPC-UA", "SCADA", "IEC 62443", "Hardening"],
  },
  {
    num: "07", title: "Data Integration & ETL",
    desc: "Agent-based data pipelines connecting OT data sources to IT systems — time-series ingestion, protocol bridging, and structured delivery to analytics platforms and historian cores.",
    detail: "Built around an agent model: each agent handles one protocol or data source, normalises the data, and delivers it to a common sink. Covers a wide range of industrial protocols and file-based sources. Output targets include time-series databases, REST endpoints, and flat file exports into shared network folders for legacy consumers.",
    tech: ["IoT", "IIoT", "Resilience", "Security", "Observability", "Idempotency", "Schema Validation"],
  },
  {
    num: "08", title: "Industrial Automation — Product to SAT",
    desc: "End-to-end project support for Siemens and Honeywell platforms — from product selection and panel design through software development, commissioning, and site acceptance testing.",
    detail: "Full project lifecycle: hardware selection, electrical panel coordination, PLC/DCS software development, factory acceptance testing (FAT), on-site commissioning, and formal site acceptance testing (SAT). Experience with Siemens S7-300/1500 (TIA Portal, SCL) and Honeywell Experion PKS C300 in ATEX/IECEx-regulated environments.",
    tech: ["Siemens S7-300/1500", "TIA Portal", "SCL", "Honeywell Experion PKS", "C300"],
  },
  {
    num: "09", title: "Maintenance & Support",
    desc: "Ongoing L2/L3 support contracts for deployed systems, including industrial historians, PLC software, and custom SDK integrations.",
    detail: "Structured as annual contracts with defined response SLAs. L2 covers configuration changes, minor enhancements, and user support. L3 covers root cause analysis, hotfixes, and deep system-level intervention. Remote-first, with on-site available by arrangement. Contracts cover historian deployments, Siemens PLC software, and custom SDK integrations.",
    tech: ["PxTrend", "OPC-UA", "Siemens TIA Portal", "Python", "Ansible"],
  },
  {
    num: "10", title: "AI-Augmented Engineering",
    desc: "Applied AI for industrial contexts: natural language query interfaces over historian data, predictive maintenance analytics, process modelling and controller tuning, and AI-assisted documentation and refactoring of legacy codebases.",
    detail: "Four concrete applications: (1) natural language interfaces that let operators query historian data without knowing the tag schema; (2) predictive maintenance models for industrial equipment trained on process historian data; (3) AI-assisted documentation and refactoring of undocumented legacy code — particularly useful for inherited PLC and legacy codebases; (4) process modelling and controller tuning — building data-driven models of industrial processes to support APC design, P&ID tuning, and optimisation of control loop parameters.",
    tech: ["AI/ML", "APC", "P&ID Tuning", "Predictive Maintenance"],
  },
];

const expertise = [
  { title: "Industrial Communication", text: "Deep protocol coverage across fieldbus, IoT, and Ethernet-based standards — Modbus, DeviceNet, Profibus, CAN, CANopen, OPC-UA, MQTT, HART, and EtherNet/IP — with both open-source and custom SDK implementations." },
  { title: "Industrial Automation", text: "Deep domain knowledge across Siemens PLC programming (S7-300/1500, TIA Portal, SCL) and Honeywell Experion PKS — covering SCADA, historian systems, ATEX/IECEx compliance, and OT/IT convergence architectures." },
  { title: "Data Integration", text: "Agent-based ETL pipeline design, time-series data management, OPC-UA integration, and bridging OT process data to modern IT analytics platforms." },
  { title: "Custom Software", text: "Purpose-built applications for industrial and operational environments — from internal tooling to client-facing systems with complex integration requirements." },
];

const publications = [
  { journal: "Engineering Science and Technology", title: "Design and industrial implementation of fuzzy logic control of level in soda production", vol: "Vol 23, Issue 3, pp. 691–699" },
  { journal: "Control Engineering Practice", title: "Parallel distributed compensation for improvement of level control in carbonization column", vol: "Vol 71, pp. 53–60" },
  { journal: "Automatic Control and Computer Sciences", title: "Optimization of Parallel Distributed Compensation for Real Time Control of Level", vol: "Vol 54, pp. 379–390" },
];

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function RevealDiv({ children, className = "", style = {} }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${className}`} style={style}>{children}</div>;
}

function Nav({ onNav }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleNav(section) {
    setMenuOpen(false);
    onNav(section);
  }

  return (
    <>
      <nav>
        <div className="nav-logo" style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>IMBRA<span>.</span>SOFT</div>
        <div className="nav-links">
          {["Portfolio", "Services", "Expertise", "Research"].map(s => (
            <button key={s} className="nav-link" onClick={() => onNav(s === "Research" ? "publications" : s.toLowerCase())}>{s}</button>
          ))}
          <button className="nav-cta" onClick={() => onNav("contact")}>Get in touch</button>
        </div>
        <button className={`hamburger ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </nav>
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        {["Portfolio", "Services", "Expertise", "Research"].map(s => (
          <button key={s} className="mobile-menu-link" onClick={() => handleNav(s === "Research" ? "publications" : s.toLowerCase())}>{s}</button>
        ))}
        <button className="mobile-menu-cta" onClick={() => handleNav("contact")}>Get in touch</button>
      </div>
    </>
  );
}

function Hero({ onNav }) {
  return (
    <div className="hero">
      <div className="hero-left">
        <div className="hero-eyebrow">Software &amp; Industrial Engineering</div>
        <h1 className="hero-headline">Complex inside.<br /><strong>Simple outside.</strong></h1>
        <p className="hero-sub">
          Imbra.soft builds software products and delivers engineering services for industrial environments — absorbing the technical complexity so operators, engineers, and clients get interfaces and tools that simply work.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => onNav("portfolio")}>View Portfolio</button>
          <button className="btn-ghost" onClick={() => onNav("contact")}>Discuss a project →</button>
        </div>
      </div>
      <div className="hero-right">
        <div className="hero-stats">
          {[
            { num: "15+", label: "Years in Industrial Automation, Communication & Software Engineering", sub: "Solvay Sodi · Hilscher · Heidelberg Materials" },
            { num: "3",   label: "Peer-reviewed Publications",     sub: "Control Engineering Practice · JEST · ACCS" },
            { num: "100%",label: "Transparent Pricing",            sub: "Published rates · No hidden fees · No vendor lock-in" },
            { num: "OT/IT",label: "Domain Bridge",                 sub: "From sensor level to cloud · PLC to REST API" },
          ].map(s => (
            <div key={s.label} className="stat-cell">
              <div className="stat-num mono">{s.num}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Portfolio() {
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);

  function toggle(p) {
    if (active === p.id) { setActive(null); setDetail(null); }
    else { setActive(p.id); setDetail(p); }
  }

  const row1 = products;

  const DetailPanel = ({ d }) => (
    <div className="detail-panel open">
      <div className="detail-inner">
        <div className="detail-row"><div className="detail-col-label">Problem solved</div><div className="detail-col-text">{d.problem}</div></div>
        <div className="detail-row"><div className="detail-col-label">Technology</div><div className="detail-tech-row">{d.tech.map(t => <span key={t} className="detail-tag">{t}</span>)}</div></div>
        <div className="detail-row"><div className="detail-col-label">Built for</div><div className="detail-col-text">{d.audience}</div></div>
      </div>
    </div>
  );

  return (
    <section id="portfolio">
      <RevealDiv>
        <div className="section-label">01 — Portfolio</div>
        <h2 className="section-heading">Products we <strong>ship and maintain</strong></h2>
        <p className="section-sub">Three products covering the device, connectivity, and data layers of industrial software. Click any product to explore it in depth.</p>
      </RevealDiv>

      {/* Row 1 — 3 cards */}
      <div className="portfolio-grid">
        {row1.map(p => (
          <div key={p.id} className={`product-card ${active === p.id ? "active" : ""}`} onClick={() => toggle(p)}>
            <div className="product-index mono"><span style={{ color: "#1B4F8A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.role}</span></div>
            <div className="product-name">{p.name}</div>
            <div className="product-desc">{p.desc}</div>
            <div className="tag-row">{p.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
            <div className="expand-indicator">+</div>
          </div>
        ))}
      </div>
      {row1.some(p => p.id === active) && detail && <DetailPanel d={detail} />}
    </section>
  );
}

function Services() {
  const [active, setActive] = useState(null);

  function toggle(e, num) {
    e.stopPropagation();
    setActive(active === num ? null : num);
  }

  return (
    <section id="services">
      <RevealDiv>
        <div className="section-label">02 — Services</div>
        <h2 className="section-heading">What we <strong>do for you</strong></h2>
        <p className="section-sub">Engagements range from focused advisory to full project delivery. All work is anchored in production-grade standards.</p>
      </RevealDiv>
      <RevealDiv>
        <div className="services-grid">
          {services.map(s => (
            <div key={s.num} className={`service-item ${active === s.num ? "active" : ""}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, marginRight: "16px" }}>
                  <div className="service-title">{s.title}</div>
                  <div className="service-desc">{s.desc}</div>
                </div>
                <button
                  onClick={(e) => toggle(e, s.num)}
                  style={{ background: "none", border: "1px solid #DDE2EA", cursor: "pointer", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "18px", color: "#1B4F8A", fontWeight: 300, lineHeight: 1 }}
                >
                  {active === s.num ? "−" : "+"}
                </button>
              </div>
              {active === s.num && (
                <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #DDE2EA" }}>
                  <p style={{ fontSize: "13px", color: "#444B56", lineHeight: "1.8", marginBottom: "16px", fontWeight: 300 }}>{s.detail}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {s.tech.map(t => <span key={t} className="service-tag">{t}</span>)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </RevealDiv>
    </section>
  );
}

function Expertise() {
  return (
    <section id="expertise">
      <RevealDiv>
        <div className="section-label">03 — Domain Expertise</div>
        <h2 className="section-heading">Where our <strong>knowledge runs deep</strong></h2>
        <p className="section-sub">Imbra.soft works in domains that demand real engineering experience — not generalist consultancy.</p>
      </RevealDiv>
      <RevealDiv>
        <div className="expertise-grid">
          {expertise.map(e => (
            <div key={e.title} className="expertise-card">
              <div className="expertise-title">{e.title}</div>
              <div className="expertise-text">{e.text}</div>
            </div>
          ))}
        </div>
      </RevealDiv>
    </section>
  );
}

function Publications() {
  return (
    <section id="publications">
      <RevealDiv>
        <div className="section-label">04 — Research &amp; Credentials</div>
        <h2 className="section-heading">Grounded in <strong>engineering science</strong></h2>
        <p className="section-sub">Peer-reviewed research on advanced process control and fuzzy logic — published in indexed engineering journals.</p>
      </RevealDiv>
      <RevealDiv>
        <div className="pub-grid">
          {publications.map((p, i) => (
            <div key={i} className="pub-cell">
              <div className="pub-journal">{p.journal}</div>
              <div className="pub-title">{p.title}</div>
              <div className="pub-vol">{p.vol}</div>
            </div>
          ))}
        </div>
      </RevealDiv>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact">
      <div>
        <h2 className="cta-headline">The complexity is<br /><strong>ours to solve.</strong></h2>
        <p className="cta-sub">Project engagements · Plugin services · Maintenance contracts</p>
      </div>
      <div className="cta-right">
        <button className="btn-white">Get in touch</button>
        <div className="cta-email mono">contact@imbra.soft</div>
      </div>
    </section>
  );
}

export default function App() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "viewport";
    meta.content = "width=device-width, initial-scale=1.0";
    document.head.appendChild(meta);
    const s = document.createElement("style");
    s.textContent = styles;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); document.head.removeChild(meta); };
  }, []);

  function scrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <Nav onNav={scrollTo} />
      <Hero onNav={scrollTo} />
      <Portfolio />
      <Services />
      <Expertise />
      <Publications />
      <Contact />
      <footer>
        <div className="footer-top">
          <div className="footer-legal">
            {["Privacy", "Imprint", "Legal Notice"].map(l => (
              <button key={l} className="footer-legal-link">{l}</button>
            ))}
          </div>
          <div className="footer-social">
            <a className="footer-social-link linkedin" href="https://linkedin.com/in/branimir-georgiev" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a className="footer-social-link github" href="https://github.com/Imbra-Ltd" target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            </a>
          </div>
        </div>
        <div className="footer-body">
          <div className="footer-address">
            <span className="footer-logo">IMBRA<span>.</span>SOFT</span>
            <p>
              Varna, Bulgaria<br />
              <a href="mailto:contact@imbra.soft">contact@imbra.soft</a><br />
              <a href="https://github.com/Imbra-Ltd" target="_blank" rel="noopener noreferrer">github.com/Imbra-Ltd</a>
            </p>
          </div>
          <div>
            <div className="footer-desc-label">About</div>
            <p className="footer-desc-text">
              Imbra.soft is a boutique software and industrial engineering consultancy based in Varna, Bulgaria. We specialise in OT/IT integration, industrial historian systems, communication protocol SDKs, and bespoke engineering services — serving industrial businesses that need production-grade engineering without enterprise overhead.
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2025 Imbra.soft · All rights reserved</div>
        </div>
      </footer>
    </div>
  );
}
