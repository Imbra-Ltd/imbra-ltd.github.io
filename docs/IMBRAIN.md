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

## Security model

Designed around Azure security defense principles: Zero Trust, Defense in Depth, Least Privilege, Assume Breach, Microsegmentation, Encryption Everywhere, and Audit Everything.

### Defense in depth layers

```
Layer 1 — Network       firewall, VLAN, OT/IT separation (customer responsibility)
Layer 2 — Transport     mTLS — every connection encrypted and mutually authenticated
Layer 3 — Identity      certificate-based — every historian has a unique identity
Layer 4 — Authorization MQTT topic ACLs — least privilege per historian instance
Layer 5 — Audit         all access logged in TimescaleDB — queryable and exportable
```

### Zero Trust principles applied

- No implicit trust between historians, even within the same group
- Every connection is authenticated via mTLS — no password-only access
- Each historian publishes only to its own topics (least privilege ACLs)
- Group isolation is a hard boundary — site in group A cannot see group B data
- Assume breach: if one site is compromised, others are unaffected (microsegmentation)

### Standalone operation (no central authority)

ImBrain runs securely out of the box without a master or external CA:

```
First run:
1. ImBrain generates key pair + self-signed certificate automatically
2. mTLS enabled by default on the local broker
3. Ready — no configuration required
```

To connect two standalone instances manually:
- Exchange public certificates out-of-band (USB, secure file transfer)
- Each instance explicitly trusts the other's certificate
- No CA involved — full air-gap compatible

### Certificate management options

| Mode | How | Requires |
|------|-----|---------|
| Standalone (default) | Self-signed, auto-generated on first run | Nothing |
| Manual rotation | Admin replaces certificate when needed | Nothing |
| Rotation plugin (paid) | Auto-monitors expiry, renews and distributes | Rotation plugin installed |
| Master CA | Auto-issued and rotated by master ImBrain | Master ImBrain running |
| External PKI | ACME protocol or manual import | Customer PKI infrastructure |

### Certificate rotation plugin (paid)

- Monitors certificate expiry across all connected sites
- Auto-generates and distributes renewed certificates before expiry
- Admin notification on renewal and failure
- Works with or without a master historian
- Available as a standalone paid plugin — upgrades the default manual experience

### Default configuration

Secure by default — no configuration required to operate safely:

```yaml
security:
  transport: mTLS                 # always on, not configurable off
  certificate: self-signed        # auto-generated on first run
  rotation: manual                # rotation plugin upgrades this
  topic_acls: least-privilege     # each historian publishes own topics only
  group_isolation: strict         # hard boundary between groups
  audit_log: enabled              # all access logged to TimescaleDB
```

### Authorization model

| Role | Scope | Permissions |
|------|-------|-------------|
| Site operator | Own site | Read own data, generate own reports |
| Site admin | Own site | Full site configuration |
| Group manager | Own group | Read all sites in group, cross-site reports |
| Group admin | Own group | Full group configuration, approve site connections |
| System admin | All groups | Full access — master ImBrain only |

---

## Open questions

- [x] Time-series store — **TimescaleDB** (PostgreSQL extension). Standard SQL, handles both time-series and relational metadata, natural fit for LLM-generated queries, production-grade.
- [x] Sparkplug B namespace design — see below.
- [x] Plugin distribution — GitHub Releases (v1), private registry (v2). See deployment model.
- [x] Fine-tuning strategy — RAG + pgvector (PostgreSQL extension). Tag catalogue and plant context stored as embeddings, retrieved at query time. No per-customer fine-tuning required.
- [x] Security model — see below.
- [x] Deployment model — see below.
- [x] On-premise hardware reference spec — see below.

---

## Deployment model

### Self-contained installer

One package, everything included, works fully air-gapped:

```
imbrain-installer-v1.0.0-linux-x86.tar.gz
├── podman/                 # bundled Podman runtime
├── images/
│   ├── imbrain.tar         # ImBrain image (pre-loaded)
│   ├── timescaledb.tar     # TimescaleDB image
│   └── mosquitto.tar       # MQTT broker image
├── config/
│   └── default.yml         # default configuration
├── install.sh              # installs everything, registers services
└── README.txt
```

**Installation:**
1. Customer downloads one package (or receives on USB for air-gapped)
2. Runs `install.sh`
3. Podman installed, images loaded locally, services registered as systemd units
4. Done — no internet required at any point

**Windows equivalent:** `.msi` installer bundles Podman for Windows + images + WinSW (Windows Service Wrapper) + config.

### Why Podman over Docker

- **Rootless** — runs without root privileges, acceptable where Docker is banned
- **No daemon** — each container is a systemd unit, standard service management
- **OCI-compatible** — same images as Docker, no repackaging needed
- **`podman generate systemd`** — auto-generates systemd units from containers
- **Default on RHEL/CentOS/Fedora** — already present on many industrial Linux systems

### Updates (air-gapped)

Only changed images are shipped — keeps update packages small:

```
imbrain-update-v1.0.1-linux-x86.tar.gz
├── images/
│   └── imbrain.tar     # only updated images
└── update.sh           # loads new image, restarts service
```

Connected deployments (v2): auto-update mechanism via ImBrain update plugin.

### Storage backends

| Mode | Storage | Use case |
|------|---------|----------|
| Demo / evaluation | DuckDB (embedded) | Zero dependencies, single binary, no setup |
| Production | TimescaleDB (bundled) | Full time-series performance, included in installer |
| Cloud / managed | Timescale Cloud / Supabase | Zero local infrastructure, internet required |

Same binary, different config. `--demo` flag switches to embedded DuckDB.

### Plugin distribution

- **v1:** GitHub Releases — customer downloads plugin package, runs `imbrain plugin install`
- **v2:** Private registry — `imbrain plugin install report` pulls from registry automatically
- Plugins ship as additional container images or mounted volumes
- Air-gapped plugin install: include plugin image in update package

---

## Hardware reference

Primary target: small industrial companies. Demo must run on minimal hardware.

| Tier | Hardware | LLM | Tags | Use case |
|------|----------|-----|------|----------|
| Demo | Laptop or Raspberry Pi 5 | Claude API (cloud) | < 500 | Evaluation, proof of concept |
| Small business | Industrial mini PC (Beelink, Minisforum) ~€400-800 | Claude API or CPU inference | < 5,000 | Single site, full feature set |
| Medium business | Workstation + mid-range GPU (RTX 4060, 8GB VRAM) ~€2,000-4,000 | Ollama + Llama 3 8B | < 50,000 | Multi-site, air-gapped capable |
| Large / Enterprise | Server-grade + GPU (A100) ~€10,000+ | Ollama + Llama 3 70B | Unlimited | Full mesh, high HA, air-gapped |

**Key principle:** Tier 1 and 2 use Claude API — no GPU required, cheapest hardware. GPU only needed for air-gapped local inference.

**Demo hardware target:** Raspberry Pi 5 (€80) or any laptop from the last 5 years. One installer, running in under 10 minutes.

---

## Next steps

1. Finalise time-series store selection
2. Design the Sparkplug B topic namespace for the mesh
3. Define the plugin contract (interface every plugin must implement)
4. Build minimal core — ingest, store, query, one LLM adapter
5. First plugin — ReportPlugin (shift report generation)
6. Update ImBrain product card on imbra.io