# ImBrain — Product Vision

## Overview

**ImBrain** is an open-architecture industrial historian with autonomous agent capabilities — an OpenClaw-style agent constrained to the industrial data domain. It stores, queries, and reasons over time-series plant data, communicates with other historians in a mesh network, and exposes a natural language interface for operators and engineers.

The core is minimal and deliberately thin. All behaviour — AI backend, reporting, alerting, forecasting, cross-site aggregation — is delivered through plugins that run on-premise or in the cloud.

---

## Key concepts

### Autonomous agent with guardrails

ImBrain behaves like an autonomous agent but with **action limits enforced by the plugin system**:
- ✅ Can query, aggregate, summarise, report, alert, forecast
- ✅ Can communicate with other ImBrain instances
- ❌ Cannot write to production systems without explicit operator authorisation
- ❌ Cannot take physical actions (valve control, setpoint changes) — this is a hard boundary

The plugin system defines the available action space. Operators control the blast radius by choosing which plugins to install.

### Mesh network

Multiple ImBrain instances communicate peer-to-peer, forming a distributed historian network:

```
Operator
    ↓
ImBrain (site A) ←→ ImBrain (site B) ←→ ImBrain (site C)
    ↓                    ↓                    ↓
OT layer A           OT layer B           OT layer C
```

Use cases:
- Multi-site comparison — *"how does Varna line 2 compare to Sofia line 2 this week?"*
- Hierarchical aggregation — unit historian → area historian → enterprise historian
- Redundancy and data replication across sites

### Natural language interface

Operators talk to ImBrain in plain language:
- *"Generate a shift report for line 3, last 8 hours"*
- *"Find all events where tank pressure exceeded 8 bar last month"*
- *"Compare energy consumption across all sites this quarter"*
- *"Why did line 2 underperform last Tuesday?"*

The LLM translates intent into queries, executes them against the time-series store, and returns structured or narrative responses.

---

## Architecture

```
User (natural language / API)
            ↓
ImBrain Agent (LLM core + tool use)
            ↓
Plugin layer
├── ReportPlugin        # generate shift/daily/weekly reports
├── AlertPlugin         # threshold and anomaly alerting
├── ForecastPlugin      # predictive analytics
├── AggregatorPlugin    # cross-historian queries
├── OpcUaPlugin         # OPC-UA integration
└── ...                 # user-defined plugins
            ↓
Data layer (TimescaleDB / PostgreSQL)
            ↓
Agent layer (Imbra Connect — OT data sources)

ImBrain ←——MQTT/Sparkplug B——→ ImBrain  (mesh)
```

---

## Sparkplug B namespace design

### Topic structure

```
spBv1.0 / {group_uuid} / {message_type} / {site_uuid} / {area_uuid}
```

All IDs in the topic are **auto-generated UUIDs**. Human-readable aliases are application-layer only.

Example:
```
spBv1.0 / a3f7c2d1-... / NBIRTH / b8e4a109-... / c2d5f318-...
```

Resolves in the UI as:
```
Solvay Sodi / Varna Plant / Tank Farm Line 2
```

### Entity hierarchy

```
Group   (UUID + alias)  — customer or business unit, e.g. "Solvay Sodi"
└── Site    (UUID + alias)  — physical plant location, e.g. "Varna Plant"
    └── Area    (UUID + alias)  — process area / line / unit, e.g. "Tank Farm Line 2"
        └── Tags (measurements)
```

### ID strategy

| Entity | ID | Assigned by | Example alias |
|--------|----|-------------|---------------|
| Group | UUID v4 (auto) | ImBrain on first config | "Solvay Sodi" |
| Site | UUID v4 (auto) | ImBrain on first config | "Varna Plant" |
| Area | UUID v4 (auto) | ImBrain on first config | "Tank Farm Line 2" |

- UUIDs are used on the wire — unique across the mesh without coordination
- Aliases are stored in TimescaleDB — queryable, auditable, changeable without breaking topics
- LLM queries use aliases (*"show me Varna Plant data"*) — translated to UUID internally
- Single-site deployments use a default group (`local`)

### Mesh discovery via Sparkplug B

1. Each ImBrain publishes `NBIRTH` on startup — announces itself to the broker
2. All historians subscribed to `spBv1.0/+/NBIRTH/#` discover it immediately
3. `NDEATH` (last will message) handles graceful and ungraceful disconnects
4. No central registry required — birth/death mechanism handles it

---

## Mesh topology

### Recommended configuration

**Per-site broker + Master historian**

```
Operator
    ↓
Master ImBrain (group level, 99.5% HA)
    ├── Site ImBrain — Varna   (99.9% HA)
    ├── Site ImBrain — Sofia   (99.9% HA)
    └── Site ImBrain — Heidelberg (99.9% HA)
```

- Each site runs its own MQTT broker and ImBrain instance — fully independent, air-gapped capable
- Master ImBrain connects to all site historians for cross-site queries and reporting
- If master goes down: sites keep running and storing locally — no data loss, reduced cross-site visibility
- If a site broker goes down: data collection stops — data loss risk — higher HA required locally

### Availability targets

| Component | Target | Rationale |
|-----------|--------|-----------|
| Local MQTT broker | 99.9% (~8.7 h/year downtime) | Data loss if down — highest priority |
| Local ImBrain | 99.9% | Same — ingest must not stop |
| Master ImBrain | 99.5% (~43.8 h/year downtime) | Degraded UX only, no data loss |
| Master MQTT broker | 99.5% | Mesh sync delayed, not lost |

### Broker topology options

All three options are supported — customer chooses based on needs and budget:

| Option | Description | Best for |
|--------|-------------|----------|
| A: Central broker | All sites connect to one shared broker | Small deployments, cloud-only |
| B: Per-site + federation | Site brokers bridge to each other | Enterprise, multi-region |
| C: Per-site, no federation | Independent brokers, ImBrain handles cross-site | **Recommended default** |

### Customer configuration (Option C)

```yaml
# Site ImBrain config — this is all the customer configures
master: mqtt://imbrain-master.customer.com
site_alias: "Varna Plant"
```

Site ID and certificates are issued automatically by the master on first connection. No manual certificate management.

---

## Mesh communication protocol

**Primary: MQTT + Sparkplug B**

- Sparkplug B is purpose-built for SCADA/historian use — defines standard payload structure (birth/death certificates, metrics, timestamps)
- Lightweight broker-based architecture (Mosquitto on-premise, HiveMQ/EMQX for cloud or clustered deployments)
- Consistent with Imbra Connect — one protocol stack across the product family
- Each ImBrain instance publishes and subscribes on well-known Sparkplug B topics

**Optional: OPC-UA Pub/Sub (plugin)**

- Covers enterprise integration — MES, ERP, cloud platforms
- Available as a plugin, not a core dependency

---

## LLM backend

The LLM is a plugin — operators choose the backend at deployment time. Core never talks to an LLM directly.

```
ImBrain Agent
    ↓
LLM Adapter (plugin)
    ├── OllamaAdapter    # on-premise, air-gapped safe
    ├── ClaudeAdapter    # cloud, best reasoning and tool use
    └── OpenAIAdapter    # cloud, enterprise familiarity
```

### Deployment profiles

| Profile | LLM | Hardware | Use case |
|---------|-----|----------|----------|
| Air-gapped plant | Ollama + Llama 3 8B / Mistral 7B | ~8GB VRAM GPU | No internet, full local operation |
| Air-gapped, high capability | Ollama + Llama 3 70B / Qwen 72B | Server-grade GPU (A100) | Approaches cloud quality locally |
| Connected plant | Claude API | Standard server | Best reasoning, root cause analysis |
| Enterprise / Azure | Azure OpenAI | Standard server | Enterprise compliance requirements |

### Capability split

| Task | Local 8B model | Claude API |
|------|---------------|------------|
| Structured queries (averages, trends, filters) | ✅ Good enough | ✅ Excellent |
| Shift / daily report generation | ✅ Good enough | ✅ Excellent |
| Alarm log summarisation | ✅ Good enough | ✅ Excellent |
| SQL / query generation | ✅ Good enough | ✅ Excellent |
| Complex multi-step reasoning | ⚠️ Limited | ✅ Excellent |
| Root cause analysis | ⚠️ Limited | ✅ Excellent |
| Cross-site comparative analysis | ⚠️ Limited | ✅ Excellent |
| Plant-specific terminology / context | ⚠️ Requires fine-tuning | ✅ Good with prompting |

**Bottom line:** a local 8B–13B model covers ~80% of day-to-day operator needs. Claude via API covers the remaining 20% — deep analysis, root cause investigation, complex cross-site reasoning.

---

## Plugin deployment

Plugins run on-premise or in the cloud — operator decides per plugin:

```
On-premise plugins          Cloud plugins
────────────────            ─────────────
ReportPlugin                ForecastPlugin (GPU-intensive)
AlertPlugin                 AggregatorPlugin (multi-site)
OllamaAdapter               ClaudeAdapter
OpcUaPlugin                 AzureOpenAIAdapter
```

Air-gapped plants run all plugins locally. Connected plants can offload compute-intensive plugins (forecasting, large model inference) to the cloud.

---

## Business model

| Component | License | Notes |
|-----------|---------|-------|
| ImBrain core | Open source | Minimal historian core, time-series store, agent loop |
| OT agents (Imbra Connect) | Open source (Python) | Data collection layer |
| Plugins | Paid | Report, alert, forecast, AI adapters, OPC-UA |
| Support | Paid retainer | Installation, maintenance, incident response |
| Cloud deployment | Paid | Managed cloud option |

---

## Open questions

- [x] Time-series store — **TimescaleDB** (PostgreSQL extension). Standard SQL, handles both time-series and relational metadata, natural fit for LLM-generated queries, production-grade.
- [x] Sparkplug B namespace design — see below.
- [ ] Plugin distribution — private registry, GitHub releases, or marketplace?
- [ ] Fine-tuning strategy for local models — plant-specific terminology and tag names
- [ ] Security model for the mesh — mTLS on MQTT, per-site certificates
- [ ] On-premise hardware reference spec — minimum and recommended

---

## Next steps

1. Finalise time-series store selection
2. Design the Sparkplug B topic namespace for the mesh
3. Define the plugin contract (interface every plugin must implement)
4. Build minimal core — ingest, store, query, one LLM adapter
5. First plugin — ReportPlugin (shift report generation)
6. Update ImBrain product card on imbra.io