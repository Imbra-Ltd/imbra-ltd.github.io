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

Multiple ImBrain instances communicate peer-to-peer over MQTT/Sparkplug B, forming a distributed historian network:

```
Enterprise dashboard
        ↓
ImBrain (site A) ←→ ImBrain (site B) ←→ ImBrain (site C)
        ↓                  ↓                   ↓
    OT layer A         OT layer B          OT layer C
```

Use cases:
- Multi-site comparison — *"how does Varna line 2 compare to Sofia line 2 this week?"*
- Hierarchical aggregation — unit historian → area historian → enterprise historian
- Redundancy and data replication across sites

#### How instances discover each other

Each ImBrain instance publishes a Sparkplug B **birth certificate** when it comes online — a retained MQTT message on a well-known topic that announces its identity, site name, capabilities, and available tag namespaces:

```
spBv1.0/IMBRAIN/DBIRTH/site-varna
spBv1.0/IMBRAIN/DBIRTH/site-sofia
spBv1.0/IMBRAIN/DBIRTH/site-frankfurt
```

Other instances subscribed to the `spBv1.0/IMBRAIN/DBIRTH/#` topic see the announcement and register the new peer. When an instance goes offline, it publishes a **death certificate** — peers remove it from their active peer list automatically.

#### What flows over the mesh

Raw tag data stays on the local historian. The mesh carries only:

- Discovery announcements (birth/death certificates)
- Cross-site query requests and responses
- Aggregated metrics (OEE scores, alarm counts, summary statistics)
- Mesh health and version information

This keeps bandwidth requirements low. A cross-site query returns a result set, not a raw time series.

#### MQTT broker options

The mesh requires an MQTT broker that all instances can reach. Three deployment models:

| Model | How | Best for |
|-------|-----|---------|
| **Shared cloud broker** | All instances connect to a single managed broker (HiveMQ Cloud, EMQTT Cloud) | Simple setup, requires internet connectivity |
| **Federated brokers** | Each site runs its own broker; brokers bridge to each other | Air-gapped plants, maximum data sovereignty |
| **Hub instance** | One ImBrain acts as mesh coordinator; others connect to its broker | Small deployments on a single enterprise network |

For air-gapped plants the federated model is recommended — each site runs a local MQTT broker (Mosquitto or EMQX), and broker bridges are configured once during commissioning. No site depends on internet connectivity for local historian operation.

#### Hierarchical deployment

The mesh supports arbitrary depth:

```
Enterprise ImBrain  (queries across all plants)
    ├── Region A ImBrain  (aggregates 3 plants)
    │       ├── Plant 1 ImBrain
    │       ├── Plant 2 ImBrain
    │       └── Plant 3 ImBrain
    └── Region B ImBrain  (aggregates 2 plants)
            ├── Plant 4 ImBrain
            └── Plant 5 ImBrain
```

Each level stores only what it needs. Aggregation is computed at query time from the level below. Raw data never moves up the hierarchy unless explicitly requested.

### Natural language interface

Operators talk to ImBrain in plain language:
- *"Generate a shift report for line 3, last 8 hours"*
- *"Find all events where tank pressure exceeded 8 bar last month"*
- *"Compare energy consumption across all sites this quarter"*
- *"Why did line 2 underperform last Tuesday?"*

The LLM translates intent into queries, executes them against the time-series store, and returns structured or narrative responses.

---

## Application architecture

### Core + plugins, not microservices

ImBrain is a core process with a plugin system — not a microservice mesh. This is a deliberate architectural decision for the target deployment context.

**Why microservices were rejected:**

| Concern | Impact |
|---------|--------|
| Air-gapped plants run on a single mini PC | An orchestrator (Compose minimum, Kubernetes ideally) is extra operational surface area the customer has to manage |
| Silent microservice failures | A crashed microservice is invisible until something downstream breaks — in a plant, silent failures are worse than loud ones |
| Version drift | Services evolve independently; a connectivity service on v1.2 talking to a data service on v1.5 is a support nightmare |
| Cognitive fragmentation | Every split creates a new failure boundary, a new API contract, a new place to get lost, a new thing to misconfigure |

**What the plugin model gives instead:**

- Same developer experience as microservices — isolated modules, clear interfaces, independent development
- Same operational experience as a monolith — one process, one container, one log stream, one restart command
- A plugin in DEGRADED state is still running and logged immediately — no silent failures

**Infrastructure containers are legitimate and unavoidable:**

Not everything is a plugin. Infrastructure components with no business logic run as separate containers:

```
docker-compose.yml
├── timescaledb        # infrastructure — commodity, never changes with product
├── mosquitto          # infrastructure — MQTT broker
├── imbrain-core       # application — one container, all plugins inside
└── (optional) caddy   # infrastructure — TLS termination
```

The customer runs `docker compose up`. They never think about plugin architecture inside `imbrain-core`. A new analytics plugin means a new `imbrain-core` image — no new services, no new ports, no new config.

**The line to hold:** infrastructure containers are fine. Business logic split into microservices multiplies operational burden without benefit at this scale.

### Plugins vs agents — where the boundary is

Plugins and agents are both extension points, but they live in different places for different reasons:

| | Plugins (in-process) | Agents (out-of-process) |
|-|----------------------|------------------------|
| Location | Same process and container as ImBrain Core | Separate process; separate container or separate machine |
| Runtime | Same — Go/Python, same OS | Any runtime, any OS |
| Examples | OEEPlugin, AnomalyDetectionPlugin, LLMPlugin | CollectAgent, LabFileAgent, OPC DA bridge |
| When to use | Analytics, storage backends, modern protocol drivers | Legacy system connectors, edge/remote collectors, OS-specific adapters |
| Deployment | Ships as part of imbrain-core image | Ships as separate binary or container |
| Failure mode | Core supervises — DEGRADED state, logged, next tick runs | Independent process — can buffer and survive core restarts |

The key question is: **can this run in the same process on the same OS?** If yes → plugin. If the source requires Windows COM, a different runtime, physical proximity to a device, or independent crash survival → agent.

---

## Product layers

```
┌─────────────────────────────────────────────────────┐
│                 User (browser UI / API)              │
├─────────────────────────────────────────────────────┤
│              Paid plugins                            │
│  LLM · Forecast · Update · Cert rotation · OPC-UA   │
├─────────────────────────────────────────────────────┤
│              Bundled plugins (free)                  │
│         Reporting · Alerting · Dashboards            │
├─────────────────────────────────────────────────────┤
│                  ImBrain Core (free)                 │
│  Time-series store · Monitoring · Playback           │
│  Alarms · Virtual tags · Aliasing · RBAC/ABAC · 2FA  │
├─────────────────────────────────────────────────────┤
│            Agent interface (gRPC)                    │
├─────────────────────────────────────────────────────┤
│         Agents (Go, built on Imbra Connect Go SDK)   │
│  Collect · Harmonize · Recover · Forward · LabFile   │
├─────────────────────────────────────────────────────┤
│   Imbra Connect Go SDK — Agent tier (open source)    │
│  MQTT · Modbus · CAN · CANopen · DeviceNet · CIP     │
├─────────────────────────────────────────────────────┤
│              Data sources                            │
│  PLCs · Sensors · Drives · Field devices             │
│  Lab systems · LIMS · Instrument exports             │
└─────────────────────────────────────────────────────┘

ImBrain Core ←——MQTT/Sparkplug B——→ ImBrain Core  (mesh)
```

### ImBrain Core features (free)

- **Time-series storage** — TimescaleDB, standard SQL
- **Live monitoring** — real-time tag values, trends
- **Dashboards and displays** — configurable, browser-based
- **Playback** — historical data replay
- **Alarms** — condition-based, configurable thresholds
- **Virtual tags** — calculated tags from expressions
- **Aliasing** — human-readable names over raw tag IDs
- **Clean UI** — simple configuration, no engineering degree required
- **Security** — RBAC/ABAC, 2FA, mTLS, audit log

### Bundled plugins (free, included in installer)

- **ReportPlugin** — shift, daily, weekly reports
- **AlertPlugin** — threshold and anomaly alerting

### Paid plugins (summary)

See the [Plugin ecosystem](#plugin-ecosystem) section for full details and business value ranking.

**Cloud and integration:**
- **StreamGatewayPlugin** — live hot path to Azure Event Hubs, AWS Kinesis, GCP Pub/Sub, AVEVA Data Hub; local buffer, aggregation, multi-target
- **ColdArchivePlugin** — nightly Parquet export to S3 / Azure Blob / GCS; tiered retention (hot → warm → cold); queryable via Athena / Synapse

**Analytics and operations:**
- **OEEPlugin** — Overall Equipment Effectiveness (availability × performance × quality)
- **DowntimePlugin** — stop tracking, classification, production loss in revenue terms
- **GoldenBatchPlugin** — compare active batch against best historical run in real time
- **AnomalyDetectionPlugin** — statistical anomaly detection, univariate and multivariate
- **EnergyPlugin** — specific energy per unit produced, ISO 50001 aligned
- **SPCPlugin** — control charts, Western Electric rules, Cp/Cpk
- **MaintenancePredictionPlugin** — health index, RUL estimation, condition-based scheduling

**AI and forecasting:**
- **LLMPlugin** — natural language interface, AI-generated reports
- **ForecastPlugin** — predictive analytics, what-if scenarios

**Integration and compliance:**
- **MESBridgePlugin** — SAP PP/PI, Wonderware, generic REST/OData integration
- **CompliancePlugin** — 21 CFR Part 11, data integrity, audit export
- **OpcUaPlugin** — OPC-UA Pub/Sub integration
- **MeshPlugin** — multi-site aggregation and cross-historian queries

**Infrastructure:**
- **UpdatePlugin** — auto-update with admin approval and rollback
- **CertRotationPlugin** — automated certificate lifecycle management

**Advanced:**
- **SimulationPlugin** — digital twin, what-if replay, operator training mode

---

## Plugin ecosystem

Plugins are the primary revenue vehicle. The core is free — plugins are where customers pay. Each plugin is a discrete, installable unit with a well-defined interface.

### Priority ranking by business value

| # | Plugin | BV | Tier | Why customers pay | Target industry |
|---|--------|----|------|-------------------|-----------------|
| 1 | OEEPlugin | 10 | Paid | Universal manufacturing KPI — every factory tracks it | All discrete and batch manufacturing |
| 2 | GoldenBatchPlugin | 9 | Paid | Unique, hard to find outside €100k enterprise tools | Food & beverage, pharma, chemicals, plastics |
| 3 | AnomalyDetectionPlugin | 9 | Paid | Prevents costly failures, AI-powered, clear ROI | All industries |
| 4 | StreamGatewayPlugin | 8 | Paid | Bridge plant data to Azure / AWS / GCP — every company with cloud ambitions needs this | All industries with IT/OT convergence |
| 5 | EnergyPlugin | 8 | Paid | Energy cost pressure everywhere, immediate ROI | All industries |
| 6 | DowntimePlugin | 8 | Paid | Quantifies production losses — makes ROI visible | All discrete manufacturing |
| 7 | SPCPlugin | 7 | Paid | Quality management, regulatory compliance | Pharma, food, automotive |
| 7 | MaintenancePredictionPlugin | 7 | Paid | Reduces maintenance costs, prevents unplanned stops | Asset-heavy industry |
| 8 | ColdArchivePlugin | 7 | Paid | Tiered retention: on-premise hot, cloud warm/cold — compliance + data lake | Pharma, food, utilities, enterprise |
| 9 | MESBridgePlugin | 6 | Paid | Enterprise accounts — integrates with MES/ERP | Medium and large companies |
| 10 | CompliancePlugin | 6 | Paid | Regulatory requirements — sticky, recurring revenue | Pharma, food, utilities |
| 10 | LLMPlugin | 8 | Paid | Natural language — operator UX differentiator | All industries |
| 11 | ForecastPlugin | 6 | Paid | Predictive analytics — premium AI feature | All industries |
| 12 | SimulationPlugin | 5 | Paid | What-if and digital twin — premium engineering tool | Process and discrete manufacturing |
| — | MeshPlugin | 7 | Paid | Multi-site aggregation — required for mesh deployments | Multi-site customers |
| — | OpcUaPlugin | 6 | Paid | Enterprise integration — MES, ERP, cloud platforms | Medium and large companies |
| — | UpdatePlugin | 4 | Paid | Auto-update infrastructure | Connected deployments |
| — | CertRotationPlugin | 4 | Paid | Certificate lifecycle automation | All connected deployments |

---

### Tier 1 — Universal value (every manufacturing customer)

#### OEEPlugin

**Overall Equipment Effectiveness** — the single most watched KPI in manufacturing. OEE = Availability × Performance × Quality.

- Calculates OEE in real time from historian tag data — no manual logging
- Decomposes losses into the six big losses (planned downtime, unplanned stops, speed loss, micro-stops, startup rejects, production rejects)
- Trend over time: shift, daily, weekly, monthly
- Cross-equipment and cross-site OEE comparison (mesh-aware)
- Configurable production schedule — distinguishes planned from unplanned downtime

**Why it sells:** every operations manager knows OEE. When you show them their real OEE vs. what they thought it was, the conversation ends. No competing tool at this price point calculates OEE automatically from historian data.

---

#### DowntimePlugin

Tracks, classifies, and quantifies every production stop.

- Detects stops automatically from historian tag data (speed = 0, output tag silent, etc.)
- Prompts operator to classify each stop (planned, unplanned, changeover, quality hold, etc.)
- Calculates production loss in units and revenue equivalent — makes the cost visible
- Pareto analysis — top causes by frequency and total loss
- Works standalone or feeds into OEEPlugin

**Why it sells:** management sees revenue lost to downtime, not just minutes. Immediate ROI justification for the customer.

---

### Tier 2 — High business value (differentiated)

#### GoldenBatchPlugin

Compare every production run in real time against the best historical run.

- **Golden run selection** — operator marks a completed batch as "golden", or the plugin auto-selects based on configurable KPIs (yield, energy consumption, cycle time, defect rate)
- **Real-time overlay** — live data traces alongside the golden run, time-aligned from batch start
- **Deviation alerts** — configurable tolerance bands; alert fires before the batch fails, not after
- **Phase alignment** — dynamic time warping (DTW) aligns phases even when run speeds differ, so you compare equivalent process stages, not wall-clock time
- **Batch scorecard** — similarity score (0–100) at batch end, broken down by tag and phase; becomes a quality predictor over time

**Why it sells:** the most accurate batches are run by your best operators on their best days. GoldenBatch makes every operator run like your best operator. No open Python tool offers this. Enterprise tools (Syncade, OSIsoft Batch) are six figures and locked to specific hardware.

**Target:** food & beverage, pharma, specialty chemicals, plastics, any process running repeated batch cycles where consistency equals quality.

---

#### AnomalyDetectionPlugin

Statistical anomaly detection across all historian tags — no domain expertise required to configure.

- **Univariate anomaly detection** — Z-score, IQR, rolling mean deviation per tag
- **Multivariate anomaly detection** — correlates groups of tags; detects when the pattern between related tags breaks (e.g. pump flow vs. motor current diverging)
- **Adaptive baselines** — model normal behaviour per shift, day-of-week, season
- **Alert routing** — anomaly alerts routed to AlertPlugin or directly to operator
- **Explainability** — "tag TK301_FLOW deviated 3.2σ from 14-day baseline at 14:32"

**Why it sells:** traditional alarm management is threshold-based — you only alarm what you thought to configure. Anomaly detection catches what you forgot to think about. Early warning for issues that don't yet breach any threshold.

---

#### EnergyPlugin

Monitor, benchmark, and reduce energy consumption across equipment and sites.

- **Energy metering** — connects to energy meter tags (kWh, kVA, power factor)
- **Specific energy** — energy per unit produced (kWh/tonne, kWh/batch, kWh/shift) — the metric that removes production volume distortion
- **Baseline and benchmark** — compare current energy to best-performing period or site
- **Peak demand tracking** — identifies demand peaks that drive tariff costs
- **Cross-site energy comparison** — mesh-aware, highlights which site operates most efficiently
- **ISO 50001 support** — energy performance indicators aligned with ISO standard

**Why it sells:** energy is a P&L line. Specific energy makes energy visible as a quality metric, not just a utility bill. Regulatory pressure (EU energy directives) makes this a compliance item for larger companies.

---

#### StreamGatewayPlugin

Bridge ImBrain historian data to cloud platforms — Azure, AWS, GCP, or any MQTT-based cloud broker.

Every company with a digital transformation initiative or a corporate IT team asking "can we get the plant data into the cloud?" needs this. It sits between the on-premise historian and the cloud analytics layer, handling connectivity, buffering, aggregation, and security.

**Supported targets:**

| Target | Protocol | Notes |
|--------|----------|-------|
| Azure IoT Hub | AMQP / MQTT | Native SDK, Device Provisioning Service (DPS) support |
| Azure Event Hubs | AMQP | High-throughput streaming to Azure analytics pipeline |
| AWS IoT Core | MQTT | X.509 certificates, IoT rules engine integration |
| AWS Timestream | HTTP API | Direct time-series ingest |
| Google Cloud IoT / Pub/Sub | MQTT / HTTP | GCP pipeline integration |
| HiveMQ Cloud / EMQX Cloud | MQTT | Generic cloud MQTT broker |
| AVEVA Data Hub (OSIsoft Cloud Services) | REST API | For customers migrating from PI System |
| Generic REST endpoint | HTTP | Any custom cloud receiver |

**What it does:**

- **Tag selection** — operator chooses which tags to forward; not everything goes to the cloud (bandwidth and ingestion costs)
- **Aggregation** — configurable downsampling before sending (1-second OT samples → 1-minute cloud averages); raw data stays on-premise in full resolution
- **Local buffer** — if cloud connectivity drops, data is buffered locally and replayed on reconnect; no data loss during outages
- **Backpressure handling** — if the cloud is slow to ingest, the plugin slows publishing rather than dropping data or overloading the connection
- **Multi-target** — forward the same tags to multiple cloud platforms simultaneously (e.g. Azure for analytics + AVEVA for corporate historian)
- **Transformation** — tag renaming, unit conversion, and metadata enrichment before sending (cloud tag names often differ from OT tag names)
- **Security** — mTLS and certificate management per cloud target; certificate renewal integrated with CertRotationPlugin if installed

**Configuration example:**

```yaml
targets:
  - name: azure-hub
    type: azure-iot-hub
    connection_string: "HostName=plant.azure-devices.net;..."
    tags: ["LINE2.*", "ENERGY.*"]         # glob patterns
    interval: 60s                          # aggregate to 1-minute averages
    buffer_max: 24h                        # buffer up to 24h if disconnected

  - name: corporate-historian
    type: aveva-data-hub
    namespace_id: "plant-varna"
    api_key: "${AVEVA_API_KEY}"
    tags: ["LINE2.TK301.*", "OEE.*"]
    interval: 1s                           # full resolution for AVEVA
```

#### Bandwidth and cost model

**Payload size (Sparkplug B with aliases):**

After the NBIRTH handshake, Sparkplug B replaces full tag names with numeric aliases:

```
alias         3 bytes
timestamp     7 bytes
float value   5 bytes
framing       5 bytes
─────────────────────
total        ~20 bytes per tag update
```

**Single plant, 10,000 tags, 1-second:**
```
10,000 tags × 20 bytes × 1/sec = 200 KB/s = 1.6 Mbit/s
```
A 100 Mbit site connection handles this with capacity to spare.

**Enterprise scale: 200 plants × 10,000 tags × 1-second — naive vs smart:**

| | Naive (all raw tags) | Smart hot path |
|-|---------------------|----------------|
| Tags forwarded per plant | 10,000 | ~150 (KPIs + alarms + critical) |
| Cloud ingestion rate | 200 × 200 KB/s = **40 MB/s** | 200 × 3 KB/s = **600 KB/s** |
| Monthly cloud storage | ~**100 TB** | ~**1.5 TB** |

Cloud ingestion cost depends heavily on which service is used. IoT Hub and IoT Core are device management platforms — priced per-message and the wrong fit for bulk historian telemetry. Streaming platforms are designed for this and are significantly cheaper:

| Service | Type | Naive (all tags) | Smart hot path |
|---------|------|-----------------|----------------|
| AWS IoT Core | Device mgmt | ~$20,700/month | ~$520/month |
| Azure IoT Hub | Device mgmt | ~$7,500/month | ~$1,100/month |
| **Azure Event Hubs** | **Streaming** | ~$460/month | **~$8/month** |
| **AWS Kinesis** | **Streaming** | ~$290/month | **~$15/month** |

The StreamGatewayPlugin targets Event Hubs / Kinesis for the hot path. IoT Hub / IoT Core adapters are available for sites that already use them for device management, but are not the default for historian telemetry forwarding.

With the right service and smart hot path: **under $20/month** for a 200-plant enterprise deployment.

**The correct architecture: computed outputs, not raw tags**

Raw data stays on-premise at full resolution in TimescaleDB. The cloud hot path carries only what ImBrain has already computed:

```
Site ImBrain (10,000 raw tags — on-premise)
    │
    ├── TimescaleDB (on-premise) ── full resolution, all tags, indefinite retention
    │
    └── StreamGatewayPlugin ── hot path only
            │
            ├── Computed KPIs (OEE, yield, production rate, energy)  ~20 tags, 1-sec
            ├── Alarm state changes                                   event-driven
            └── Operator-selected critical process tags               ~50–100 tags, 1-sec
```

The KPI tags are virtual tags written by OEEPlugin, EnergyPlugin, etc. — already computed, no need to forward raw inputs to the cloud.

**On-demand pull for deep analysis:**

When an analyst needs raw historical data from a specific plant, they query that site's ImBrain directly through the mesh:

```
Enterprise analyst
    └── Master ImBrain
            └── Mesh query → Site ImBrain (e.g. Varna)
                                └── TimescaleDB: full resolution, all 10,000 tags
```

The cloud never needs to store raw data. It holds the hot path stream; the historian holds the truth.

**Hot path tag selection:**

| Category | Count | Interval | Source |
|----------|-------|----------|--------|
| Computed KPIs (OEE, yield, energy) | ~20 | 1 sec | Plugin virtual tags |
| Active alarm states | event-driven | On change | AlertPlugin |
| Operator-selected critical tags | 50–100 | 1 sec | Configured in StreamGatewayPlugin |
| All other tags | — | Not forwarded | Available via on-demand mesh pull |

**Why it sells:** IT/OT convergence is the dominant trend in manufacturing. Corporate HQ wants dashboards. Data scientists want historical plant data for ML models. Cloud-based ERP and MES platforms need real-time signals. ImBrain without a cloud gateway is an island — with it, it becomes the OT data source for the whole enterprise stack.

**BV: 8** — broadly applicable, immediate value for any company with cloud investment, directly enables upsell to MESBridgePlugin and LLMPlugin.

---

### Tier 3 — Quality and process improvement

#### SPCPlugin

**Statistical Process Control** — monitors process variables for out-of-control conditions using Western Electric rules and control charts.

- **Control charts** — X-bar/R, X-bar/S, I-MR, p-chart, c-chart — automatically selected based on data type
- **Western Electric rules** — all 8 rules configurable per tag
- **Cp / Cpk** — process capability indices against configured specification limits
- **SPC alerts** — out-of-control condition triggers AlertPlugin
- **Historical SPC review** — apply SPC analysis to historical data, not just live

**Why it sells:** ISO 9001, IATF 16949, FDA 21 CFR Part 211 — quality management frameworks mandate SPC in many industries. No standalone historian at this price includes SPC natively.

**Target:** automotive suppliers, food & beverage (BRC, IFS), pharma (GMP), any company pursuing quality certification.

---

#### MaintenancePredictionPlugin

**Predictive maintenance** — moves from time-based to condition-based maintenance scheduling.

- **Health index** — composite score per machine, built from vibration, temperature, current, runtime hours
- **RUL estimation** — Remaining Useful Life, based on degradation trend
- **MTBF/MTTR tracking** — mean time between failures and mean time to repair, per equipment
- **Maintenance work order trigger** — generates alert when health index drops below threshold
- **Post-maintenance baseline reset** — automatic new baseline after maintenance event

**Why it sells:** unplanned downtime costs 5–10× more than planned maintenance. Even a 10% shift from reactive to predictive maintenance has measurable ROI. Connects naturally to DowntimePlugin and OEEPlugin.

---

### Tier 4 — Integration and compliance

#### ColdArchivePlugin

Long-term data archiving to cloud object storage — separate from the hot path, separate buyer motivation, separate cost model.

**Why this is a different plugin from StreamGatewayPlugin:**

| | StreamGatewayPlugin | ColdArchivePlugin |
|-|--------------------|-------------------|
| Purpose | Live dashboards, real-time alerting | Compliance retention, data lake, DR |
| Data | Computed KPIs, selected critical tags | All tags, full resolution |
| Transport | Streaming (Event Hubs, Kinesis) | Batch export (nightly job) |
| Format | Sparkplug B / JSON | Parquet (columnar, compressed) |
| Access pattern | Continuous read | Write once, read rarely |
| Buyer motivation | IT/OT convergence | Regulatory compliance, ML |

**What gets exported:**

All four record types are exported — not just numeric tags.

| Source table | Export schedule | Format | Notes |
|---|---|---|---|
| `imbrain_tags` (raw) | Nightly — before retention policy drops chunks | Parquet, partitioned by day | Exported at the resolution stored (raw 1s, or chosen aggregate) |
| `imbrain_text_tags` | Nightly | Parquet | Machine states, recipe names, string values |
| `imbrain_alarms` | Nightly | Parquet | Full alarm lifecycle records including metadata |
| `imbrain_lims` | Nightly | Parquet | All lab results with parameters, pass/fail, metadata |

Alarms and LIMS records are not downsampled on-premise — they are kept in full fidelity on-premise until the archive export moves them to cold storage.

**Architecture:**

```
TimescaleDB (on-premise)
    │
    ├── imbrain_tags ──────────────────────────────────────────┐
    ├── imbrain_text_tags ──────────────────────────────────── │
    ├── imbrain_alarms ─────────────────────────────────────── │
    └── imbrain_lims ──────────────────────────────────────────┤
                                                               │
                                        ColdArchivePlugin (nightly job)
                                               │
                        ┌──────────────────────┼──────────────────────┐
                        ▼                      ▼                      ▼
                  tags/raw/                alarms/              lims/
                  year=2024/              year=2024/           year=2024/
                  month=01/              month=01/             month=01/
                  day=15/               alarms_202401.parquet  lims_202401.parquet
                  tags_20240115.parquet
```

Hive-partitioned directory structure — AWS Athena, Azure Synapse, and DuckDB discover partitions automatically without a catalogue entry.

**Object storage layout:**

```
s3://imbrain-archive-varna/
├── tags/
│   ├── raw/year=2024/month=01/day=15/tags_20240115.parquet
│   ├── 1min/year=2024/month=01/tags_1min_202401.parquet
│   ├── 1h/year=2024/month=01/tags_1h_202401.parquet
│   └── 1day/year=2024/tags_1day_2024.parquet
├── text_tags/year=2024/month=01/day=15/text_20240115.parquet
├── alarms/year=2024/month=01/alarms_202401.parquet
└── lims/year=2024/month=01/lims_202401.parquet
```

Metrics are partitioned by day (high volume). Alarms and LIMS are partitioned by month (low volume — daily files would be near-empty).

**Retention tiers:**

| Tier | Storage | Retention | Retrieval | Cost | Use case |
|------|---------|-----------|-----------|------|----------|
| Hot | On-premise TimescaleDB | Configurable (default 2 years) | Milliseconds | Disk cost only | Operations, recent analysis |
| Warm | S3 Standard-IA / Azure Blob Cool | 2–7 years | Seconds | ~$10–12/TB/month | Long-term trend analysis, ML training |
| Cold | S3 Glacier Instant / Azure Blob Cold | 7+ years | Minutes | ~$4/TB/month | Compliance, occasional access |
| Archive | S3 Glacier Deep Archive / Azure Blob Archive | Permanent | Hours | ~$1/TB/month | Regulatory mandates only |

The plugin manages tier transitions automatically — data ages from warm to cold to archive on a configurable schedule.

**Cost model (200 plants × 10,000 tags × 1-second, Parquet compressed ~10:1):**

```
Raw per plant:       17 GB/day
Compressed Parquet:   1.7 GB/day

200 plants:         340 GB/day new data added to archive
Monthly new data:   ~10 TB/month

Cumulative stored after 1 year:  ~120 TB
Cumulative stored after 5 years: ~600 TB
```

| Scenario | Storage | Monthly cost |
|----------|---------|-------------|
| 1 year, all warm (S3-IA) | 120 TB | ~$1,500/month |
| 1 year, warm + cold transition after 2y | 120 TB | ~$600/month |
| 5 years, tiered (warm 2y → cold 3y) | 600 TB | ~$1,200/month |
| Compliance only (archive tier after 1y) | 120 TB | ~$120/month |

These costs are per-deployment (all 200 plants combined). Per-plant: $0.60–$7.50/month for a complete multi-year archive. This is cheaper than buying on-premise disk and dramatically cheaper than a cloud time-series database.

**Querying archived data:**

Parquet on S3/Blob is queryable without loading it into a database:

- **AWS Athena** — SQL over S3 Parquet, $5/TB scanned, no infrastructure
- **Azure Synapse Analytics** — SQL over Blob, serverless, pay per query
- **DuckDB** — local query directly against Parquet files, free, fast, works air-gapped

For most archive queries (audit, compliance export, ML training data extraction), Athena or DuckDB is sufficient. No cloud time-series database required.

**Supported storage targets:**

| Target | Notes |
|--------|-------|
| AWS S3 | All storage classes; lifecycle rules for automatic tiering |
| Azure Blob Storage | Hot / Cool / Cold / Archive tiers; lifecycle policies |
| Google Cloud Storage | Nearline / Coldline / Archive |
| On-premise S3-compatible | MinIO, Ceph — for air-gapped or sovereign data requirements |

The on-premise S3-compatible option is important for customers with data sovereignty requirements who cannot send any data to public cloud — they still benefit from Parquet archiving on their own object store.

**Configuration example:**

```yaml
archive:
  export_time: "02:00"           # nightly at 2am local time
  format: parquet
  compression: zstd

  metrics:
    enabled: true
    tags: "*"                    # glob — all tags; or "LINE2.*" for subset
    granularity: raw             # "raw" | "1min" | "1hour" | "1day"

  text_tags:
    enabled: true
    tags: "*"

  alarms:
    enabled: true                # full alarm lifecycle records
    sources: "*"                 # "WinCC" | "Siemens" | "*" for all

  lims:
    enabled: true                # lab results with parameters and metadata
    status: ["final"]            # "preliminary" | "final" | "invalidated"

storage:
  target: s3
  bucket: imbrain-archive-plant-varna
  region: eu-central-1
  prefix: "varna/"

retention:
  metrics_hot_days:  730         # keep 2 years raw in TimescaleDB
  metrics_warm_days: 2555        # keep in S3-IA for 7 years total
  metrics_cold_days: 3650        # move to Glacier after 10 years
  alarms_hot_days:   3650        # keep 10 years in TimescaleDB (low volume)
  lims_hot_days:     3650        # keep 10 years in TimescaleDB (low volume)
  delete_after_days: 0           # 0 = never delete (compliance)
```

**Why it sells:** on-premise disk is finite. A 2TB NVMe at 1.7 GB/day holds ~3 years of data for one 10,000-tag plant. When it fills up, the choice is: buy more hardware, or tier to cloud. Cloud tiering wins on cost, reliability, and operational simplicity. Compliance customers in pharma, food, and utilities have no choice — they must retain data for 7–10 years. ColdArchivePlugin is the only clean answer.

**BV: 7** — compliance is non-negotiable for regulated industries (sticky, recurring); cost advantage is compelling for all others.

---

#### MESBridgePlugin

Bidirectional integration between ImBrain and MES/ERP systems.

- **SAP PP/PI integration** — production orders, process orders, batch records
- **Wonderware/FactoryTalk integration** — reads from existing MES historian, merges with ImBrain data
- **REST/OData API** — generic connector for any MES with a modern API
- **Batch record enrichment** — attaches historian data to production orders automatically
- **KPI push** — publishes OEE, yield, energy to ERP dashboards

**Why it sells:** medium and large companies already have MES/ERP investments. ImBrain becomes the data layer that enriches, not replaces, those systems. High-value accounts require this.

---

#### CompliancePlugin

Audit trail and data integrity for regulated industries.

- **21 CFR Part 11 compliance** — electronic records and signatures for FDA-regulated environments
- **Data integrity reports** — demonstrates data has not been altered (hash-chained records)
- **Audit export** — filtered export of tag history, alarm log, user actions for regulatory submissions
- **Retention policy enforcement** — automated data retention and deletion per configurable policy
- **Change log** — every configuration change timestamped, attributed to user, exportable

**Why it sells:** in pharma and food, regulatory compliance is not optional. A historian that ships with compliance capabilities commands a premium and creates lock-in.

---

### Tier 5 — Premium and advanced

#### ForecastPlugin

Predictive analytics and time-series forecasting.

- **Univariate forecasting** — Prophet, ARIMA, Exponential Smoothing per tag
- **Multivariate forecasting** — uses correlated tags to improve accuracy (e.g. forecast energy from production schedule)
- **Demand forecasting** — production output forecast based on equipment and material availability
- **What-if scenarios** — "what is predicted output if we run line 2 at 85%?"
- **Forecast accuracy tracking** — MAPE, RMSE per model, continuously monitored

**Why it sells:** operations managers plan around forecasts. Accurate production and energy forecasts reduce both over- and under-production.

---

#### SimulationPlugin

Digital twin and what-if simulation over historian data.

- **Process replay** — replay any historical period with modified parameters ("what if we had run 5°C hotter?")
- **Scenario comparison** — side-by-side comparison of actual vs. simulated run
- **Parameter sensitivity** — sweep a variable across a range, plot outcome vs. parameter
- **Training mode** — operators practice handling alarm scenarios on historical data without affecting live data

**Why it sells:** engineering teams use this to optimise processes without risking production. Training mode has value for safety training and onboarding new operators.

---

### Infrastructure plugins (operational, not analytical)

These are not purchased for business intelligence value — they are purchased to maintain and secure a running ImBrain installation.

| Plugin | Purpose | Sold as |
|--------|---------|---------|
| **MeshPlugin** | Multi-site aggregation, cross-historian queries | Required for mesh deployments |
| **OpcUaPlugin** | OPC-UA Pub/Sub integration — connects to SCADA, MES, cloud | Enterprise integration |
| **UpdatePlugin** | Auto-update with admin approval and rollback | Connected deployments |
| **CertRotationPlugin** | Automated certificate lifecycle management | All connected deployments |

---

### Plugin interface contract

#### 1. Plugin manifest (`plugin.toml`)

Every plugin ships with a manifest. The core reads this before loading the plugin.

```toml
[plugin]
name        = "oee"                          # unique slug, lowercase, hyphenated
version     = "1.2.0"                        # semver
display     = "OEE Plugin"                   # shown in UI
description = "Overall Equipment Effectiveness — availability × performance × quality"
author      = "Imbra"
license     = "commercial"                   # "commercial" | "open-source"
entry       = "imbra_oee.plugin:OEEPlugin"   # module:class

[plugin.requires]
core        = ">=1.0.0"                      # minimum ImBrain core version
python      = ">=3.11"

[plugin.dependencies]
# pip packages the plugin needs — installed automatically
pandas      = ">=2.0"

[plugin.permissions]
# explicit declaration of what the plugin is allowed to do
tags        = ["read", "write_virtual"]      # cannot write to raw tags
alerts      = ["raise", "clear"]
scheduler   = ["register"]
config      = ["read", "write"]
mesh        = false                          # no cross-site access
```

---

#### 2. Plugin base class

```python
# imbra/core/plugin.py

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any


class PluginStatus(Enum):
    STARTING  = "starting"
    RUNNING   = "running"
    DEGRADED  = "degraded"   # running but with non-fatal errors
    STOPPED   = "stopped"
    FAILED    = "failed"


@dataclass
class PluginHealth:
    status:  PluginStatus
    message: str                      # human-readable, shown in diagnostic CLI
    details: dict[str, Any] = None    # optional structured data (last run, error count, etc.)


class ImBrainPlugin(ABC):

    # --- Identity -----------------------------------------------------------

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique slug matching plugin.toml — e.g. 'oee', 'golden-batch'."""

    @property
    @abstractmethod
    def version(self) -> str:
        """Semver string — e.g. '1.2.0'."""

    # --- Lifecycle ----------------------------------------------------------

    @abstractmethod
    def on_install(self, config: dict[str, Any]) -> None:
        """
        Called once when the plugin is first installed.
        Create database tables, write default config, register virtual tags.
        Must be idempotent — safe to call again after a failed install.
        """

    @abstractmethod
    def on_start(self, core: "ImBrainCore") -> None:
        """
        Called on every core startup while the plugin is installed and enabled.
        Register event subscriptions and scheduled tasks here.
        Store the core handle as self._core for use in callbacks.
        """

    @abstractmethod
    def on_stop(self) -> None:
        """
        Called on graceful shutdown. Cancel tasks, flush buffers, close connections.
        Must complete within 10 seconds — core will force-kill after timeout.
        """

    @abstractmethod
    def on_uninstall(self) -> None:
        """
        Called when the operator removes the plugin.
        Drop plugin-owned tables, delete virtual tags, clean up config.
        Raw historian data is never deleted by a plugin.
        """

    # --- Health -------------------------------------------------------------

    @abstractmethod
    def health(self) -> PluginHealth:
        """
        Called by the diagnostic CLI and the UI health dashboard.
        Must return quickly (< 100ms) — do not perform I/O here.
        Cache the last-known state and return it.
        """
```

---

#### 3. Core handle (`ImBrainCore`)

The object passed to `on_start`. Defines the full API surface a plugin may call.

```python
# imbra/core/core_handle.py

from datetime import datetime
from typing import Any, Callable


class ImBrainCore:

    # --- Tag store ----------------------------------------------------------

    def read_tag(
        self,
        tag: str,
        start: datetime,
        end: datetime,
        interval: str = None,          # e.g. "1m", "1h" — None = raw
    ) -> list[tuple[datetime, float]]:
        """Read a tag's historical values. Returns (timestamp, value) pairs."""

    def read_tag_latest(self, tag: str) -> tuple[datetime, float]:
        """Read the most recent value of a tag."""

    def write_virtual_tag(self, tag: str, value: float, timestamp: datetime = None) -> None:
        """
        Write a value to a virtual tag (calculated/plugin-owned tag).
        Raises PermissionError if the plugin manifest does not declare write_virtual.
        Cannot write to raw ingest tags.
        """

    def register_virtual_tag(self, tag: str, unit: str, description: str) -> None:
        """Declare a new virtual tag. Called during on_install."""

    def list_tags(self, pattern: str = "*") -> list[str]:
        """List tag names matching a glob pattern."""

    # --- Event bus ----------------------------------------------------------

    def subscribe_tag(
        self,
        tag: str,
        callback: Callable[[str, datetime, float], None],
    ) -> str:
        """
        Subscribe to live tag updates. Callback receives (tag, timestamp, value).
        Returns a subscription ID — pass to unsubscribe() in on_stop.
        """

    def subscribe_alarm(
        self,
        callback: Callable[["AlarmEvent"], None],
    ) -> str:
        """Subscribe to alarm state changes (raised, cleared, acknowledged)."""

    def unsubscribe(self, subscription_id: str) -> None:
        """Cancel a subscription registered in on_start."""

    # --- Alert system -------------------------------------------------------

    def raise_alert(
        self,
        key: str,                      # unique within plugin, e.g. "oee_low_line2"
        severity: str,                 # "info" | "warning" | "critical"
        message: str,
        tag: str = None,               # tag the alert refers to, if any
        details: dict[str, Any] = None,
    ) -> None:
        """Raise or update an alert. Idempotent — calling again updates the message."""

    def clear_alert(self, key: str) -> None:
        """Clear a previously raised alert."""

    # --- Scheduler ----------------------------------------------------------

    def schedule(
        self,
        name: str,                     # unique within plugin
        callback: Callable[[], None],
        cron: str,                     # standard cron expression, e.g. "0 6 * * *"
    ) -> None:
        """Register a recurring task. Replaces any existing task with the same name."""

    def schedule_interval(
        self,
        name: str,
        callback: Callable[[], None],
        seconds: int,
    ) -> None:
        """Register a task that runs every N seconds."""

    # --- Config store -------------------------------------------------------

    def get_config(self, key: str, default: Any = None) -> Any:
        """Read a plugin config value from the persistent store."""

    def set_config(self, key: str, value: Any) -> None:
        """Write a plugin config value. Persisted across restarts."""

    # --- Identity (ABAC) ----------------------------------------------------

    def current_user(self) -> "UserContext":
        """
        Returns the identity of the user triggering the current request.
        None in scheduled/background tasks — treat as system context.
        """

    # --- Logging ------------------------------------------------------------

    def get_logger(self, name: str = None):
        """
        Returns a standard Python logger scoped to this plugin.
        All output is routed through ImBrain's structured log system.
        """
```

---

#### 4. Plugin types

Plugins declare their behaviour by which core APIs they use — there is no separate base class per type. The patterns below are conventions, not enforced by the framework.

| Pattern | How | Example |
|---------|-----|---------|
| **Periodic** | `core.schedule()` or `core.schedule_interval()` in `on_start` | OEEPlugin — recalculates every minute |
| **Event-driven** | `core.subscribe_tag()` or `core.subscribe_alarm()` in `on_start` | AnomalyDetectionPlugin — reacts to each new tag value |
| **Hybrid** | Both subscription and schedule | GoldenBatchPlugin — subscribes to batch start/end events, schedules end-of-batch scorecard |
| **On-demand** | No subscription, no schedule — exposes a UI endpoint | ReportPlugin — generates a report when operator requests it |

---

#### 5. Error handling contract

| Situation | Expected behaviour |
|-----------|-------------------|
| `on_install` raises | Installation aborted, error shown to operator, plugin not activated |
| `on_start` raises | Plugin marked FAILED, core continues starting without it, error logged |
| Callback / scheduled task raises | Exception caught by core, plugin marked DEGRADED, error logged, next invocation still runs |
| `on_stop` raises | Logged, core continues shutdown — plugin cannot block shutdown |
| `on_uninstall` raises | Logged, uninstall marked partial — operator must retry or clean up manually |

A plugin in DEGRADED state is still running — it continues to receive events and schedule ticks. The degraded state is visible in the diagnostic CLI and the UI health dashboard.

---

#### 6. Minimal example — OEEPlugin skeleton

```python
# imbra_oee/plugin.py

import logging
from datetime import datetime, timedelta
from imbra.core.plugin import ImBrainPlugin, ImBrainCore, PluginHealth, PluginStatus


class OEEPlugin(ImBrainPlugin):

    name    = "oee"
    version = "1.0.0"

    def on_install(self, config: dict) -> None:
        self._core.register_virtual_tag("oee.availability", unit="%", description="OEE Availability")
        self._core.register_virtual_tag("oee.performance",  unit="%", description="OEE Performance")
        self._core.register_virtual_tag("oee.quality",      unit="%", description="OEE Quality")
        self._core.register_virtual_tag("oee.overall",      unit="%", description="OEE Overall")

    def on_start(self, core: ImBrainCore) -> None:
        self._core   = core
        self._log    = core.get_logger("oee")
        self._status = PluginStatus.STARTING
        self._last_error = None

        core.schedule_interval("calculate", self._calculate, seconds=60)
        self._status = PluginStatus.RUNNING

    def on_stop(self) -> None:
        self._status = PluginStatus.STOPPED

    def on_uninstall(self) -> None:
        pass  # virtual tags removed by core on uninstall

    def health(self) -> PluginHealth:
        return PluginHealth(
            status=self._status,
            message=self._last_error or "Calculating every 60s",
            details={"last_run": self._last_run.isoformat() if hasattr(self, "_last_run") else None},
        )

    # --- Internal -----------------------------------------------------------

    def _calculate(self) -> None:
        try:
            now   = datetime.utcnow()
            start = now - timedelta(hours=1)

            availability = self._calc_availability(start, now)
            performance  = self._calc_performance(start, now)
            quality      = self._calc_quality(start, now)
            overall      = availability * performance * quality

            self._core.write_virtual_tag("oee.availability", round(availability * 100, 2))
            self._core.write_virtual_tag("oee.performance",  round(performance  * 100, 2))
            self._core.write_virtual_tag("oee.quality",      round(quality      * 100, 2))
            self._core.write_virtual_tag("oee.overall",      round(overall      * 100, 2))

            if overall < 0.65:
                self._core.raise_alert("oee_low", "warning", f"OEE {overall:.1%} below 65% threshold")
            else:
                self._core.clear_alert("oee_low")

            self._last_run   = now
            self._last_error = None
            self._status     = PluginStatus.RUNNING

        except Exception as e:
            self._last_error = str(e)
            self._status     = PluginStatus.DEGRADED
            self._log.exception("OEE calculation failed")

    def _calc_availability(self, start: datetime, end: datetime) -> float:
        planned  = self._core.get_config("planned_production_time_hours", 8.0) * 3600
        downtime = self._read_downtime_seconds(start, end)
        return max(0.0, (planned - downtime) / planned)

    def _calc_performance(self, start, end) -> float: ...
    def _calc_quality(self, start, end) -> float: ...
    def _read_downtime_seconds(self, start, end) -> float: ...
```

---

## Data model

ImBrain stores four distinct record types. All live in TimescaleDB (PostgreSQL) — no separate stores, no separate query APIs.

### Record types

| Type | Table | Source | Key fields |
|------|-------|--------|------------|
| **Numeric tag** | `imbrain_tags` | OT agents, virtual tags | tag, timestamp, value (float), quality |
| **Text tag** | `imbrain_text_tags` | OT agents, WinCC string values | tag, timestamp, value (text), quality |
| **Alarm event** | `imbrain_alarms` | WinCC, SCADA, OPC UA A&C | alarm_id, lifecycle timestamps, message, severity, source tag, metadata |
| **Lab sample** | `imbrain_lims` | LIMS, instrument exports (via LabFileAgent) | sample_id, batch_id, parameter, value, unit, spec limits, pass/fail, metadata |

### Schema

```sql
-- Numeric time-series (existing)
CREATE TABLE imbrain_tags (
    tag         TEXT        NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL,
    value       DOUBLE PRECISION,
    quality     SMALLINT    NOT NULL DEFAULT 192  -- OPC UA quality codes
);
SELECT create_hypertable('imbrain_tags', 'timestamp');

-- String/discrete tags
CREATE TABLE imbrain_text_tags (
    tag         TEXT        NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL,
    value       TEXT,
    quality     SMALLINT    NOT NULL DEFAULT 192
);
SELECT create_hypertable('imbrain_text_tags', 'timestamp');

-- Alarm events (lifecycle model)
CREATE TABLE imbrain_alarms (
    id                  BIGSERIAL,
    timestamp_raised    TIMESTAMPTZ NOT NULL,
    timestamp_cleared   TIMESTAMPTZ,
    timestamp_acked     TIMESTAMPTZ,
    source              TEXT NOT NULL,      -- "WinCC", "Siemens S7", "custom"
    alarm_id            TEXT NOT NULL,      -- source system alarm number/ID
    alarm_class         TEXT,               -- class or group in source system
    severity            SMALLINT,           -- normalised 1 (low) – 10 (critical)
    message             TEXT NOT NULL,      -- alarm text
    area                TEXT,               -- plant area or line
    tag                 TEXT,               -- associated process tag, if any
    value_at_raise      DOUBLE PRECISION,   -- process value when alarm raised
    acked_by            TEXT,               -- operator ID/name
    state               TEXT NOT NULL,      -- 'active' | 'cleared' | 'acked'
    metadata            JSONB               -- source-specific extra fields
);
SELECT create_hypertable('imbrain_alarms', 'timestamp_raised');

-- Lab results (one row per parameter per sample)
CREATE TABLE imbrain_lims (
    id                  BIGSERIAL,
    timestamp_sampled   TIMESTAMPTZ NOT NULL,   -- when sample was taken
    timestamp_analyzed  TIMESTAMPTZ,            -- when result was produced (may be hours later)
    sample_id           TEXT NOT NULL,
    batch_id            TEXT,
    parameter           TEXT NOT NULL,          -- "Purity %", "Moisture ppm"
    value               DOUBLE PRECISION,       -- numeric result
    value_text          TEXT,                   -- text result (if not numeric)
    unit                TEXT,
    spec_min            DOUBLE PRECISION,
    spec_max            DOUBLE PRECISION,
    pass_fail           TEXT,                   -- 'pass' | 'fail' | 'pending'
    status              TEXT NOT NULL,          -- 'preliminary' | 'final' | 'invalidated'
    analyst             TEXT,
    instrument_id       TEXT,
    metadata            JSONB                   -- source-specific extra fields
);
SELECT create_hypertable('imbrain_lims', 'timestamp_sampled');
```

One row per parameter per sample in `imbrain_lims` (normalised). This makes SQL queries natural:

```sql
-- All purity failures in batch 2024-001
SELECT * FROM imbrain_lims
WHERE batch_id = '2024-001' AND parameter = 'Purity %' AND pass_fail = 'fail';

-- Alarm frequency by area, last 30 days
SELECT area, COUNT(*) FROM imbrain_alarms
WHERE timestamp_raised > NOW() - INTERVAL '30 days'
GROUP BY area ORDER BY COUNT(*) DESC;

-- Correlate low OEE with alarm bursts
SELECT date_trunc('hour', a.timestamp_raised) AS hour,
       COUNT(a.id)                             AS alarm_count,
       AVG(t.value)                            AS avg_oee
FROM imbrain_alarms a
JOIN imbrain_tags t ON t.tag = 'oee.overall'
    AND t.timestamp BETWEEN a.timestamp_raised - INTERVAL '5m'
                        AND a.timestamp_raised + INTERVAL '5m'
WHERE a.timestamp_raised > NOW() - INTERVAL '7 days'
GROUP BY hour ORDER BY hour;
```

The LLM generates these queries from natural language using the same RAG + pgvector approach as numeric tag queries. The schema is documented as embeddings in the context store.

### JSONB metadata

Both `imbrain_alarms` and `imbrain_lims` have a `metadata JSONB` column. Source-specific fields that don't map to standard columns go here — no schema migration required when a new WinCC version adds fields or a new LIMS system has different export columns.

```json
// WinCC alarm metadata example
{
  "wincc_alarm_number": 1042,
  "wincc_cpu":          "CPU_1",
  "wincc_batch_number": "B2024-112",
  "suppressed":         false
}

// LIMS sample metadata example
{
  "lims_system":     "LabWare",
  "sample_type":     "in-process",
  "sample_point":    "Tank 3 outlet",
  "test_method":     "HPLC-UV-001",
  "uncertainty":     0.15
}
```

### Virtual tags

Virtual tags are computed values derived from other tags. They are stored identically to physical tags in `imbrain_tags` — same table, same query API, same downsampling, same cold archive export. The only difference is a `virtual = true` flag and a stored expression or plugin reference.

#### Sources

| Source | Defined by | Examples |
|--------|-----------|---------|
| Plugin-defined | Plugin calls `write_virtual_tag()` on its schedule | `oee.overall`, `energy.specific`, `anomaly.score.TK301` |
| User-defined | Operator configures in UI (expression or totalizer) | `TK301_VOLUME`, `LINE2_EFFICIENCY`, `BATCH_YIELD` |

#### Types

| Type | Definition | Example |
|------|-----------|---------|
| **Expression** | Arithmetic over current tag values | `EFFICIENCY = OUTPUT_FLOW / INPUT_FLOW * 100` |
| **Totalizer** | Time-integral of a rate tag | `VOLUME = totalize(FLOW_M3H)` |
| **Rolling statistic** | Window function over recent history | `TEMP_AVG_1H = avg(TK301_TEMP, window=1h)` |
| **State** | Condition mapped to a discrete value | `LINE_RUNNING = if(SPEED > 10, 1, 0)` |
| **Cross-tag aggregate** | Reduction across multiple tags | `TOTAL_KW = sum(MOTOR1_KW, MOTOR2_KW, MOTOR3_KW)` |

#### Virtual tag engine

The VirtualTagEngine runs inside ImBrain Core. It evaluates user-defined virtual tags on every incoming DataRecord that references a source tag — not on a polling schedule. This means a virtual tag updates within the same scan cycle as its source, with no added latency.

Plugin-defined virtual tags are written by the plugin itself (on its own schedule) via `write_virtual_tag()` — they bypass the expression engine.

```
Incoming DataRecord (e.g. FLOW_M3H = 42.7 at T)
    │
    └── VirtualTagEngine
            │
            ├── Find all virtual tags with FLOW_M3H as a source
            ├── Evaluate each expression / totalizer step
            └── Write result to imbrain_tags (tag=TK301_VOLUME, value=..., virtual=true)
```

#### Totalizers in detail

A totalizer integrates a rate (flow in m³/h, power in kW) over time to produce a cumulative quantity (volume in m³, energy in kWh).

**Discretised integration:**
```
Volume[n] = Volume[n-1] + Flow[n] × Δt
```
where `Δt` is the time elapsed since the previous sample (in hours for m³/h → m³).

**Special cases the engine handles:**

| Case | Behaviour | Config |
|------|-----------|--------|
| **Restart** | Accumulator value persisted in TimescaleDB — loaded on startup, never lost | Always |
| **Meter rollover** | Engine detects jump from near-max to near-zero; adds max_value to accumulator instead of subtracting | `meter_max` config field |
| **Source offline** | Configurable: assume zero flow, hold last value, or mark quality BAD | `offline_mode` config field |
| **Batch reset** | Operator triggers reset via UI; reset event written to `imbrain_alarms` with class `totalizer_reset` | Manual or `reset_tag` trigger |
| **Unit conversion** | Flow in any rate unit → volume in any quantity unit via conversion factor | `input_unit`, `output_unit` |

**Example configuration (user-defined in UI, stored as JSON):**

```json
{
  "tag":         "TK301_VOLUME",
  "type":        "totalizer",
  "source":      "TK301_FLOW",
  "input_unit":  "m3/h",
  "output_unit": "m3",
  "meter_max":   null,
  "offline_mode": "zero",
  "reset_tag":   "BATCH_START"
}
```

#### Expression language

User-defined expressions use a restricted, safe DSL — no arbitrary code execution:

```
# Arithmetic
EFFICIENCY  = OUTPUT_FLOW / INPUT_FLOW * 100
DELTA_PRESS = PT_INLET - PT_OUTLET
HEAT_DUTY   = FLOW * CP * (T_OUT - T_IN)

# Functions
TEMP_AVG_1H = avg(TK301_TEMP, window="1h")
TEMP_MAX_8H = max(TK301_TEMP, window="8h")
PRESSURE_STD = stddev(PT301, window="30m")

# Conditionals
LINE_RUNNING = if(SPEED > 10, 1, 0)
ALARM_STATE  = if(TK301_TEMP > 150 or TK301_TEMP < 50, 1, 0)

# Cross-tag aggregates
TOTAL_KW     = sum(MOTOR1_KW, MOTOR2_KW, MOTOR3_KW)
AVG_TEMP     = mean(TK301_TEMP, TK302_TEMP, TK303_TEMP)

# Totalizer shorthand
VOLUME       = totalize(FLOW_M3H)
ENERGY_KWH   = totalize(POWER_KW)
```

The expression is parsed and stored as an AST — not evaluated as Python or any general-purpose language. Only the defined functions and arithmetic operators are available.

---

### gRPC agent interface extension

The agent SDK sends typed records — not just float tag values:

```protobuf
// v1/agent.proto

message TagValue {
    string   tag       = 1;
    int64    timestamp = 2;  // Unix ms
    double   value     = 3;
    int32    quality   = 4;
}

message TextValue {
    string   tag       = 1;
    int64    timestamp = 2;
    string   value     = 3;
    int32    quality   = 4;
}

message AlarmEvent {
    int64    timestamp_raised   = 1;
    int64    timestamp_cleared  = 2;  // 0 = still active
    int64    timestamp_acked    = 3;  // 0 = not acknowledged
    string   source             = 4;
    string   alarm_id           = 5;
    string   alarm_class        = 6;
    int32    severity           = 7;
    string   message            = 8;
    string   area               = 9;
    string   tag                = 10;
    double   value_at_raise     = 11;
    string   acked_by           = 12;
    string   state              = 13;
    string   metadata_json      = 14; // serialised JSON for extra fields
}

message LabSample {
    int64    timestamp_sampled   = 1;
    int64    timestamp_analyzed  = 2;
    string   sample_id           = 3;
    string   batch_id            = 4;
    string   parameter           = 5;
    double   value               = 6;
    string   value_text          = 7;
    string   unit                = 8;
    double   spec_min            = 9;
    double   spec_max            = 10;
    string   pass_fail           = 11;
    string   status              = 12;
    string   analyst             = 13;
    string   instrument_id       = 14;
    string   metadata_json       = 15;
}

message DataRecord {
    oneof record {
        TagValue   tag_value   = 1;
        TextValue  text_value  = 2;
        AlarmEvent alarm_event = 3;
        LabSample  lab_sample  = 4;
    }
}
```

Agents send `DataRecord` messages. The Core routes each to the correct table based on the `oneof` type. Agent SDK methods:

```go
agent.SendTag(tag, value, timestamp)
agent.SendText(tag, value, timestamp)
agent.SendAlarm(alarm)
agent.SendLabSample(sample)
```

### Data retention and downsampling

TimescaleDB handles tiered retention natively through three mechanisms: **continuous aggregates** (downsampling), **retention policies** (dropping old data), and **compression policies** (compressing cold chunks before deletion).

#### Continuous aggregates (downsampling)

TimescaleDB materialised views that recompute automatically as new raw data arrives. Since v2.9, they can be stacked hierarchically — each level reads only from the level below, not from the full raw dataset.

```sql
-- Level 1: 10-second buckets (from raw)
CREATE MATERIALIZED VIEW tags_10s
WITH (timescaledb.continuous) AS
SELECT
    tag,
    time_bucket('10 seconds', timestamp)  AS bucket,
    avg(value)                            AS avg,
    min(value)                            AS min,
    max(value)                            AS max,
    first(value, timestamp)               AS first,
    last(value, timestamp)                AS last,
    count(*)                              AS samples
FROM imbrain_tags
GROUP BY tag, time_bucket('10 seconds', timestamp);

-- Level 2: 1-minute buckets (from 10s — not from raw)
CREATE MATERIALIZED VIEW tags_1min
WITH (timescaledb.continuous) AS
SELECT
    tag,
    time_bucket('1 minute', bucket)       AS bucket,
    avg(avg)                              AS avg,
    min(min)                              AS min,
    max(max)                              AS max,
    sum(samples)                          AS samples
FROM tags_10s
GROUP BY tag, time_bucket('1 minute', bucket);

-- Level 3: 1-hour buckets (from 1min)
-- Level 4: 1-day buckets (from 1h)
-- Same pattern — each level built on the previous
```

**Refresh policies** — aggregates update automatically on a schedule:

```sql
SELECT add_continuous_aggregate_policy('tags_10s',
    start_offset      => INTERVAL '30 minutes',
    end_offset        => INTERVAL '10 seconds',
    schedule_interval => INTERVAL '10 seconds');

SELECT add_continuous_aggregate_policy('tags_1min',
    start_offset      => INTERVAL '2 hours',
    end_offset        => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');
```

#### Retention policies

**Design decision: retention is per hypertable, not per tag.** TimescaleDB deletes entire time-partitioned chunks, not individual rows. Per-tag retention would require row-by-row deletes — fighting the architecture, not working with it. Retention is configured once per deployment for the whole plant. Tags that need longer raw retention are handled by ColdArchivePlugin exporting them to cold storage before the chunk is dropped.

Drop old data automatically. Operates on entire time-partitioned chunks — very fast, no row-by-row deletion.

```sql
-- Raw: keep 30 days
SELECT add_retention_policy('imbrain_tags', INTERVAL '30 days');

-- 10-second: keep 30 days
SELECT add_retention_policy('tags_10s', INTERVAL '30 days');

-- 1-minute: keep 1 year
SELECT add_retention_policy('tags_1min', INTERVAL '1 year');

-- 1-hour: keep 10 years
SELECT add_retention_policy('tags_1h', INTERVAL '10 years');

-- 1-day: keep 50 years (configurable)
SELECT add_retention_policy('tags_1day', INTERVAL '50 years');
```

#### Compression

TimescaleDB only compresses **closed** chunks — chunks that are no longer receiving writes. The most recent chunk (the hot chunk) stays uncompressed for fast write performance. TimescaleDB achieves ~10:1 compression on closed chunks by segmenting by tag name and ordering by timestamp.

```sql
ALTER TABLE imbrain_tags SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'tag',
    timescaledb.compress_orderby   = 'timestamp DESC'
);

-- Compress chunks older than 2 days
SELECT add_compression_policy('imbrain_tags', INTERVAL '2 days');
```

#### Hot chunk sizing and memory

The hot chunk — the last ~24 hours of 1s raw data — stays uncompressed in memory. At 10,000 tags × 1s:

- ~1,728,000 rows/day
- ~50 bytes per row uncompressed
- B-tree index on `(tag, timestamp)` adds ~20–30% overhead
- **Total hot chunk: ~3–5 GB**

TimescaleDB keeps the hot chunk in `shared_buffers`. For optimal write performance, `shared_buffers` should be sized to hold the full hot chunk plus working memory:

| Tags | Hot chunk size | Recommended shared_buffers |
|------|---------------|---------------------------|
| 1,000 | ~0.4 GB | 1 GB |
| 5,000 | ~2 GB | 4 GB |
| 10,000 | ~4 GB | 8 GB |
| 50,000 | ~20 GB | 24 GB |

The $500 mini PC (8 GB RAM total) is comfortable up to ~5,000 tags at 1s. Beyond that, 16 GB RAM is recommended.

Once data moves to compressed chunks, TimescaleDB uses **chunk exclusion** — it skips entire chunks based on time range without row-level index scans. Secondary indexes on historical compressed data are largely unnecessary and should not be created.

#### Full retention tier configuration

| Resolution | Retention | Storage (10k tags, 1 plant) |
|-----------|-----------|----------------------------|
| 100ms (opt-in) | 7 days | ~9 GB (500 tags only) |
| 1 second | 30 days | ~50 GB (~4 GB hot/uncompressed + ~46 GB compressed) |
| 10 seconds | 1 year | ~5 GB |
| 1 minute | 5 years | ~7 GB |
| 1 hour | 10 years | ~8 GB |
| 1 day | 50 years (configurable) | ~10 GB |
| **Total on-premise (without 100ms)** | | **~80 GB per plant** |

A 512 GB SSD holds approximately 6 plants worth of full tiered data at these defaults. The hot chunk (last 24h uncompressed) is the RAM constraint — size `shared_buffers` accordingly. ColdArchivePlugin exports raw data to object storage before retention policies drop it.

#### High-speed tags — 100ms resolution

100ms resolution is technically storable but is not a standard retention tier. It is a **per-tag option** for specific use cases where sub-second data is analytically meaningful:

**When 100ms makes sense:**
- High-speed machinery — packaging lines, injection moulding, stamping presses where faults develop in under a second
- Vibration monitoring — bearing faults and imbalance on rotating equipment
- Power quality — voltage sags, harmonics, transient events
- Safety systems — pressure relief and emergency shutdown sequences where the order of events at millisecond resolution matters

**When it does not make sense:**
- Standard process control — PID loops on temperature, level, and flow typically update at 1s or slower; 100ms adds storage cost with no analytical value
- Most SCADA tags — scanned at 500ms to 1s by the OPC server; you cannot store 100ms resolution if the source only provides 1s data

**Storage cost at 100ms:**

| Resolution | Tags | Rows/day | GB/year (compressed ~10:1) |
|------------|------|----------|-----------------------------|
| 1s | 5,000 | 432M | ~9 GB |
| 100ms | 5,000 | 4.3B | ~86 GB |
| 100ms | 500 | 432M | ~9 GB |

100ms at full tag scale is 10x the storage of 1s. On a 512 GB SSD, 100ms for a full tag set fills the disk in weeks.

**Recommended configuration for high-speed tags:**

```sql
-- High-speed tags: 100ms raw, retained 7 days, then downsampled to 1s
SELECT add_retention_policy('imbrain_tags_100ms', INTERVAL '7 days');
```

7 days is sufficient to investigate any recent fault at full resolution. Beyond that, the 1s aggregate carries enough information for trend analysis. High-speed tags are stored in a separate hypertable (`imbrain_tags_100ms`) to avoid polluting the standard retention pipeline. The agent configuration determines which tags write to which hypertable — no runtime routing logic is needed in the Core.

**Aggregation pipeline for high-speed tags:**

100ms raw data is aggregated to 1s via a continuous aggregate, then feeds directly into the standard pipeline from that point. No special handling is needed above the 1s level.

```
imbrain_tags_100ms  →  100ms raw     →  retained 7 days
        ↓
   tags_100ms_1s    →  1s aggregate  →  retained 30 days  ← joins standard pipeline
        ↓
      tags_10s       →  10s aggregate →  retained 1 year
        ↓
      tags_1min      →  1min aggregate→  retained 5 years
        ↓
      tags_1h        →  1h aggregate  →  retained 10 years
        ↓
      tags_1day      →  1day aggregate→  retained 50 years
```

```sql
-- 100ms → 1s aggregate (feeds standard pipeline)
CREATE MATERIALIZED VIEW tags_100ms_1s
WITH (timescaledb.continuous) AS
SELECT
    tag,
    time_bucket('1 second', timestamp)    AS bucket,
    avg(value)                            AS avg,
    min(value)                            AS min,
    max(value)                            AS max,
    first(value, timestamp)               AS first,
    last(value, timestamp)                AS last,
    count(*)                              AS samples
FROM imbrain_tags_100ms
GROUP BY tag, time_bucket('1 second', timestamp);
```

After 7 days the 100ms raw is gone. The high-speed tag becomes indistinguishable from a standard tag in all queries above 1s resolution. No special query handling is needed — the query layer is unaware of which tags originated at 100ms.

#### Architecture constraints for 100ms

100ms is supportable but requires careful scoping. The bottlenecks are protocol, hardware, and write pattern — not TimescaleDB itself.

**Protocol constraints:**

| Protocol | 100ms feasibility | Notes |
|----------|------------------|-------|
| OPC UA subscriptions | ✅ Realistic | Server pushes changes; 100ms publish interval supported by most modern servers |
| CAN / DeviceNet / direct hardware | ✅ Realistic | Real-time buses — 100ms is coarse for them |
| MQTT | ✅ Realistic | No polling; publish rate is controlled by the source |
| Modbus TCP polling | ⚠️ Limited | 1–5ms round trip per request; ~50–100 tags per connection at 100ms. 500 tags requires 5–10 parallel agents |
| Modbus RTU | ❌ Not realistic | Serial bus — too slow for 100ms across many tags |

**Hardware constraints:**

Agents must batch writes — accumulate values and flush a batch every 100ms. One INSERT per value at 100ms would collapse TimescaleDB. With batching:

| Tags at 100ms | Insert rate | $500 mini PC | Mid-range server (16GB RAM) |
|--------------|-------------|-------------|----------------------------|
| 50 | 500/s | ✅ | ✅ |
| 500 | 5,000/s | ✅ | ✅ |
| 5,000 | 50,000/s | ❌ | ✅ |
| 50,000 | 500,000/s | ❌ | ❌ dedicated DB server needed |

**Commitment:**

ImBrain can commit to 100ms as a per-tag option for up to ~500 tags on the standard $500 mini PC hardware. Beyond that, the hardware requirement increases and must be documented clearly during deployment scoping. 100ms is never enabled by default — it is an explicit per-tag configuration that the engineer opts into with awareness of the storage and hardware implications.

#### Time-weighted averages

For process data, simple `AVG()` can be misleading. If a temperature holds 100°C for 55 seconds then spikes to 200°C for 5 seconds, `AVG()` gives 108°C — but only because the sample rate is uniform. With irregular sampling or gaps, `AVG()` overcounts short-duration excursions.

TimescaleDB Toolkit provides `time_weight()` for physically correct time-weighted averages:

```sql
SELECT
    tag,
    time_bucket('1 minute', timestamp)                    AS bucket,
    average(time_weight('Linear', timestamp, value))      AS time_weighted_avg,
    avg(value)                                            AS simple_avg
FROM imbrain_tags
GROUP BY tag, time_bucket('1 minute', timestamp);
```

Recommended for energy, temperature, pressure, and flow aggregates where the duration of a value matters as much as its magnitude.

#### What does NOT get downsampled

Downsampling applies only to `imbrain_tags` and `imbrain_text_tags`.

| Table | Downsampling | Default retention | Long-term |
|-------|-------------|------------------|-----------|
| `imbrain_tags` | ✅ Continuous aggregates | See tier table above | ColdArchivePlugin |
| `imbrain_text_tags` | ✅ `last()` aggregate (most recent state per bucket) | Same as tags | ColdArchivePlugin |
| `imbrain_alarms` | ❌ Events — cannot be averaged | 10 years | ColdArchivePlugin |
| `imbrain_lims` | ❌ Discrete results — cannot be averaged | 15 years | ColdArchivePlugin |

#### Event retention defaults

Alarm events and LIMS results are kept at full fidelity — no downsampling. Retention is driven by compliance requirements, not storage cost. Both are configurable at deployment.

| Record type | Default | Regulatory context |
|-------------|---------|-------------------|
| Alarm events | 10 years | Covers most jurisdictions — oil and gas (10y), food safety (5y), general EU (3y) |
| LIMS results | 15 years | Covers food and beverage (7y), chemicals (10y), water treatment (10y), pharma overrides to 15–30y |

Industry overrides:

| Industry | Alarms | LIMS |
|----------|--------|------|
| Pharmaceuticals | 10 years | 15–30 years (FDA 21 CFR Part 11, EU GMP Annex 11) |
| Nuclear | 40 years | 40 years |
| Food and beverage | 5 years | 7 years |
| Water treatment | 10 years | 10 years |
| General manufacturing | 5 years | 5 years |

#### Event storage estimates

Row sizes: ~500 bytes per alarm (timestamps, source, message, JSONB metadata), ~450 bytes per LIMS result. TimescaleDB compression on text-heavy data: ~4:1.

**Alarm events at 1,000 alarms/day (busy plant):**

| Retention | Records | Compressed |
|-----------|---------|------------|
| 1 year | 365K | ~46 MB |
| 5 years | 1.8M | ~229 MB |
| 10 years | 3.65M | ~460 MB |

**LIMS results at 50 samples × 10 parameters/day:**

| Retention | Records | Compressed |
|-----------|---------|------------|
| 1 year | 182K | ~21 MB |
| 10 years | 1.8M | ~205 MB |
| 15 years | 2.7M | ~300 MB |

**Combined on-premise footprint per plant (all tiers + events):**

| Component | Size |
|-----------|------|
| Numeric tags (all tiers) | ~34 GB |
| Alarm events (10 years) | ~0.5 GB |
| LIMS results (15 years) | ~0.3 GB |
| **Total** | **~35 GB** |

A 512 GB SSD holds ~14 plants worth of full historian data at these defaults. Storage is not the constraint for event retention — retain as long as compliance requires.

---

### WinCC alarm ingest

Three paths depending on WinCC version and available interfaces:

| Path | When to use | Agent |
|------|-------------|-------|
| OPC UA A&C (Alarms & Conditions) | WinCC V7.5+ with UA server enabled | OpcUaPlugin subscribes to UA alarm events |
| WinCC alarm export file (CSV) | Any WinCC version — configure alarm archiving to CSV | LabFileAgent extended with `alarm` format mapping |
| WinCC ODBC | WinCC with ODBC tag logging enabled | Dedicated WinCC agent (reads from WinCC Runtime DB) |

OPC UA A&C is preferred — it is push-based, structured, and requires no file system access. The CSV path is the fallback for older installations.

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
| ImBrain core | Open source (MIT) | Historian core, time-series store, agent loop, RBAC |
| Official agents | Open source (MIT) | CollectAgent, LabFileAgent, ForwardAgent, etc. — Go binaries |
| Imbra Connect SDK — Python + Go | Open source (MIT) | Protocols, packet crafting, test tooling, agent scaffolding |
| Imbra Connect SDK — other languages | **Paid** ports on request | For embedded/safety-critical or browser/Node.js targets |
| Community agents | Open source (MIT, mandatory) | Submitted to agent registry — anyone can publish |
| ImBrain plugins | **Paid** | OEE, Golden Batch, Anomaly Detection, LLM, Forecast, etc. |
| Support | **Paid** retainer | Installation, maintenance, incident response |
| Managed cloud | **Paid** | Hosted ImBrain — no on-premise infrastructure required |
| Integration consulting | **Paid** | Custom agent development, legacy historian migration, site deployment |

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

## Agent → Core interface

### Decision: gRPC

Agents communicate with ImBrain Core via gRPC over localhost (inter-container on the same machine).

```
Agent container  →  gRPC (localhost)  →  ImBrain Core container
                                              ↓
                                         MQTT/Sparkplug B
                                              ↓
                                    Mesh (other ImBrain instances)
```

### Rationale

| Perspective | Verdict | Notes |
|-------------|---------|-------|
| Security | ✅ gRPC | mTLS by default, no broker as intermediary, method-level auth |
| Performance | ✅ gRPC | Binary protobuf, streaming, minimal overhead on localhost |
| Agent developer | ✅ gRPC | Strongly typed contract, code generation in any language |
| Extensibility | ✅ gRPC | Protobuf schema evolution, versioned APIs |
| Debuggability | ⚠️ gRPC | Mitigated by diagnostic CLI (see below) |

MQTT loses its debuggability advantage once mTLS is applied — traffic is opaque regardless. gRPC wins on every technical dimension.

### Agent SDK

gRPC is hidden behind the Imbra Connect Go Agent SDK. Agent developers never interact with protobuf or gRPC directly:

```go
agent, _ := imbra.NewAgent("localhost:50051")
agent.Connect()
agent.Send(imbra.Tag{Name: "TK301_PV", Value: 98.3, Timestamp: time.Now()})
```

A Python SDK wrapper remains available for custom one-off agents and rapid prototyping, but the standard agents ship as Go binaries.

### Diagnostic CLI

Maintenance staff interact with agents through the ImBrain CLI — no gRPC or certificate knowledge required:

```bash
imbrain agent list                    # show all connected agents
imbrain agent status varna-modbus     # health, last message, tag count
imbrain agent tail varna-modbus       # live stream of incoming tag values
imbrain agent replay varna-modbus     # replay last N messages
```

### Agent types

| Agent | Data source | Transport | Notes |
|-------|------------|-----------|-------|
| **CollectAgent** | PLCs, sensors, field devices | Imbra Connect SDK (Modbus, MQTT, CAN, DeviceNet, CIP) | Primary OT ingest |
| **CollectAgent** + OpcUaPlugin | OPC DA servers (legacy, via UA wrapper) | OPC UA | OPC DA wrapped to UA — see OPC DA section below |
| **LabFileAgent** | Lab systems, LIMS, instruments | File system (CSV, XML, JSON, Excel, ASTM, custom) | See LabFileAgent section below |
| **HarmonizeAgent** | Any — post-ingest transformation | Internal (reads from store, writes virtual tags) | Unit conversion, tag aliasing, calculated tags |
| **RecoverAgent** | Offline / unreachable sources | Any — runs on reconnect | Backfills gaps when a source was unavailable |
| **ForwardAgent** | Remote ImBrain instances | MQTT / Sparkplug B | Mesh replication and cross-site forwarding |

---

### OPC DA / OPC XML-DA (legacy OPC)

OPC DA (1996–2006) is the most widely deployed historian protocol in older industrial plants. Connecting to it without DCOM requires a wrapper or bridge pattern.

#### IT policy — no third-party software on the SCADA machine

Many plants (especially chemical, pharmaceutical, and enterprise-managed sites) prohibit installing any non-approved software on the SCADA or DCS server. This is enforced by OT security policy and sometimes by the SCADA vendor's support contract terms (Siemens WinCC, for example, can void support if unapproved software runs on the server).

**The pattern that works:**

```
SCADA/PLC machine                   DMZ / Historian machine
─────────────────                   ───────────────────────
WinCC / Siemens                     ImBrain agent
Kepware (OPC gateway)  → [network]  (OPC UA client, gRPC publisher)
OPC UA endpoint (4840)
                                            ↓
                                    ImBrain core (same or separate machine)
```

- **Gateway on the SCADA box** — licensed, trusted-vendor product (Kepware, Matrikon), approved by OT security. This runs on the SCADA machine.
- **Agent on the DMZ or historian machine** — Imbra's code lives here. It connects *inward* to the OPC UA endpoint. The SCADA machine never initiates a connection outward — a much easier conversation with security teams.
- **Core anywhere** — same site server, cloud, or enterprise infrastructure.

**Why Kepware / Matrikon pass the policy check when custom software does not:**

Kepware (PTC) and Matrikon are OPC infrastructure products on most approved vendor lists. IT/OT security teams that refuse a custom Go binary will usually approve Kepware because it is a known, audited commercial product with enterprise support contracts, a defined security posture, a CVE history, and a patch cycle. Many plants already have a Kepware seat deployed elsewhere — the conversation becomes "can we configure the Kepware you already have" rather than "can we install our software."

When even Kepware is blocked (nuclear, defence-adjacent, maximum-security OT environments), the only path is a DMZ machine with controlled, one-way data flow managed entirely by the customer's OT team. ImBrain defines the interface; the customer owns the bridge.

#### Why DCOM cannot be used

| Reason | Impact |
|--------|--------|
| ImBrain runs in Podman containers on Linux | COM/DCOM is Windows-only — hard incompatibility |
| Network DCOM requires firewall exceptions, registry config, and matching Windows accounts on both sides | Impractical in most IT environments; often blocked by policy |
| Security exposure | DCOM attack surface is well-documented; IT security teams routinely prohibit it |

#### Why OPC UA wrapper, not MQTT bridge

The recommended approach is to wrap the OPC DA server with an OPC UA server, not to convert to MQTT. Reasons:

| Dimension | OPC UA wrapper | MQTT bridge |
|-----------|---------------|-------------|
| Address space | Preserved 1:1 — hierarchy, data types, engineering units, descriptions | Flattened to topic strings — metadata lost |
| ImBrain integration | OpcUaPlugin (already planned) — no new agent type | Would require a dedicated OpcDaBridgeAgent |
| Plant-wide reuse | Any OPC UA client in the plant can connect — not just ImBrain | Only ImBrain benefits from the bridge |
| Historical access | OPC UA HDA — ImBrain can pull history, not just subscribe live | MQTT is live-only |
| Security | Standardised X.509, SignAndEncrypt — no custom TLS setup | Custom MQTT TLS, manual certificate mapping |
| Migration story | "Migrate OPC DA to OPC UA" — natural upgrade path | "Proxy your OPC DA via MQTT" — not a migration |
| Tooling | DA→UA wrappers widely deployed; customer may already have one | Must build or configure MQTT pipeline from scratch |

The OPC UA wrapper runs on Windows (same machine as the OPC DA server), handles COM locally, and exposes a standard OPC UA endpoint. ImBrain connects via OpcUaPlugin as it would to any OPC UA server.

```
OPC DA Server (Windows machine)
    │
    │  local COM — same machine, no network DCOM
    ▼
OPC UA Wrapper (Windows service, same machine)
    │
    │  OPC UA over TCP (port 4840) — platform-independent
    ▼
ImBrain OpcUaPlugin (Podman, Linux or Windows)
    │
    │  gRPC (localhost)
    ▼
ImBrain Core
```

#### Integration paths

**Path A — OPC XML-DA (simplest, if available)**

Some OPC DA servers also expose an XML-DA endpoint (HTTP/SOAP). No wrapper or bridge required.

- Common on: Wonderware InTouch, RSLinx Enterprise, Kepware, Matrikon
- Imbra Connect `OpcXmlDaAdapter` connects directly from any platform
- Check by browsing to `http://<server>/OpcXmlDaServer.asmx`

```bash
pip install imbra-connect[opc-xmlda]
```

**Path B — OPC DA → OPC UA wrapper (most common case)**

Use an existing wrapper tool or deploy the Imbra DA→UA Bridge.

**Existing tools (use if already on-site):**

| Tool | Notes |
|------|-------|
| **Kepware KEPServerEX** | Dominant SCADA gateway — reads DA, exposes UA natively. Very likely already deployed. |
| **Matrikon OPC UA Tunneller** | Dedicated DA→UA migration tool, zero address-space reconfiguration |
| **Prosys OPC UA Java SDK** | Embeddable wrapper, used in custom integrations |
| **Unified Automation UaGateway** | Commercial, maps full DA namespace to UA automatically |

If the customer already has any of these, configure it to expose a UA endpoint and point OpcUaPlugin at it. No Imbra software required on the Windows side.

**Imbra DA→UA Bridge (if no existing tool):**

A lightweight Windows service included in the ImBrain installer. Built on `pywin32` (COM client) + `asyncua` (OPC UA server).

```
1. Read OPC DA server address space on startup (browse all groups and items)
2. Mirror address space as OPC UA nodes — same hierarchy, same names
3. Create OPC DA subscriptions for all items
4. On value change from DA: update corresponding UA node value
5. UA clients (ImBrain OpcUaPlugin, any other client) read from UA endpoint
6. On DA disconnect: mark UA nodes as Bad quality, retry with backoff
```

**Configuration:**

```yaml
# imbra_da_ua_bridge.yml
opc_da:
  prog_id: "Kepware.KEPServerEX.V6"   # OPC DA server ProgID
  update_rate_ms: 500                  # DA subscription rate

opc_ua:
  endpoint: "opc.tcp://0.0.0.0:4840/imbra/da-bridge"
  security_policy: SignAndEncrypt      # Basic256Sha256
  cert: C:\imbra\certs\bridge.der
  key:  C:\imbra\certs\bridge.key

namespace: "urn:imbra:da-bridge:line2"
```

ImBrain OpcUaPlugin config points at this endpoint — identical to connecting to any native UA server.

#### Decision flowchart

```
Does the OPC server expose an XML-DA endpoint?
    │
    ├── Yes → OpcXmlDaAdapter (Imbra Connect) — done
    │
    └── No (DA only)
           │
           ├── Kepware / Matrikon / Prosys UA Gateway already on-site?
           │       │
           │       ├── Yes → Configure UA endpoint → OpcUaPlugin — done
           │       │
           │       └── No → Deploy Imbra DA→UA Bridge on the OPC server machine
           │                   → OpcUaPlugin — done
           │
           └── (All paths end at OpcUaPlugin — no new agent type needed)
```

---

### LabFileAgent

Lab systems do not speak industrial protocols — they write files. The LabFileAgent watches directories or poll endpoints for new lab result files and ingests them into the historian.

#### Supported formats

| Format | Source | Notes |
|--------|--------|-------|
| CSV | Any lab instrument export, LIMS export | Most common — column mapping configured per source |
| XML | LIMS systems (LabWare, STARLIMS), LabVIEW | XPath mapping to tag/value/timestamp |
| JSON | Modern LIMS APIs, custom lab software | JSONPath mapping |
| Excel (`.xlsx`) | Manual lab entry, legacy systems | Sheet + column mapping, skips header rows |
| ASTM E1381/E1394 | Clinical and industrial lab instruments | Fixed-format message protocol over file or serial |
| Fixed-width text | Legacy instruments | Character position mapping |

New formats are added via a reader plugin — the agent framework is format-agnostic.

#### Ingestion model

```
Lab system writes file
       ↓
LabFileAgent watches folder (polling interval or inotify/FSEvents)
       ↓
File reader parses file → list of (tag, value, timestamp, batch_id)
       ↓
Deduplication — already-ingested files skipped by checksum
       ↓
gRPC → ImBrain Core → time-series store
       ↓
File moved to processed/ or archived with timestamp
```

#### Key differences from OT data

| Property | OT data (CollectAgent) | Lab data (LabFileAgent) |
|----------|----------------------|------------------------|
| Frequency | Continuous (100ms–1s) | Discrete samples (1/hour to 1/day) |
| Timestamps | Real-time, agent-stamped | Lab-stamped — may arrive hours after sample taken |
| Association | Tag → value | Tag + value + **batch/lot ID** + sample ID |
| Data type | Numeric (float) | Numeric, text, pass/fail, enumerated result |
| Quality flag | Signal quality (good/bad/uncertain) | Lab result status (preliminary, final, invalidated) |
| Backfill | RecoverAgent handles gaps | Files may arrive late — timestamps preserved as-is |

#### Late arrival handling

Lab results routinely arrive after the production run they describe. The LabFileAgent inserts with the lab timestamp, not the ingest timestamp. This means:
- Historical queries over a batch include lab results even if they arrived later
- GoldenBatchPlugin can use lab results as quality KPIs in the batch scorecard
- The UI shows an indicator when a lab result was ingested late (lab_timestamp ≠ ingest_timestamp)

#### Configuration example

```yaml
# lab_agent_config.yml
sources:
  - name: hplc_line2
    type: csv
    watch_dir: /mnt/lab/hplc/export
    poll_interval: 60          # seconds
    archive_dir: /mnt/lab/hplc/processed
    columns:
      timestamp: "Sample Time"
      batch_id:  "Batch No"
      tags:
        - column: "Purity %"
          tag:    "LAB.LINE2.PURITY"
          unit:   "%"
        - column: "Moisture ppm"
          tag:    "LAB.LINE2.MOISTURE"
          unit:   "ppm"
    result_status_column: "Status"   # "Final" | "Preliminary" | "Invalidated"
    skip_status: ["Invalidated"]
```

---

### Known limitations and mitigations

| Limitation | Mitigation |
|------------|------------|
| Learning curve for agent developers | Agent SDK hides gRPC completely |
| No native browser support | UI uses REST/HTTP — not gRPC |
| Firewall/proxy issues | Same machine/container only — not a concern |
| Proto schema discipline required | Versioned `.proto` files (`v1`, `v2`), strict review |
| Unfamiliar to OT staff | Diagnostic CLI — OT staff never touch gRPC directly |
| Lab file formats are diverse | Format reader plugin system — add new readers without changing the agent |
| Lab results arrive late | Timestamps preserved as-is, late-arrival indicator in UI |

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

Connected deployments: auto-update via the Update plugin (see below).

### Storage backends

| Mode | Storage | Use case |
|------|---------|----------|
| Demo / evaluation | DuckDB (embedded) | Zero dependencies, single binary, no setup |
| Production | TimescaleDB (bundled) | Full time-series performance, included in installer |
| Cloud / managed | Timescale Cloud / Supabase | Zero local infrastructure, internet required |

Same binary, different config. `--demo` flag switches to embedded DuckDB.

### Auto-update

| Deployment | Update mechanism |
|------------|-----------------|
| Air-gapped | Manual update package (USB / secure file transfer) |
| Connected, small | Update plugin (paid) — UI-driven, admin approval required |
| Connected, enterprise | OS package manager (apt/yum private repo) |

**Update plugin (paid):**
- Periodically checks a version endpoint for new releases
- Notifies admin in UI — update never applies without approval
- Downloads and verifies new image before applying
- Automatic rollback to previous image if startup fails
- For air-gapped: can poll a local or DMZ mirror instead of the internet

**OS package manager (enterprise):**
- `.deb` / `.rpm` packages hosted on a private apt/yum repository
- `apt upgrade imbrain` — standard, auditable, works behind corporate proxies
- Air-gapped: mirror the repository locally

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

### Decisions made

- ~~Time-series store~~ — **TimescaleDB** (PostgreSQL extension, standard SQL, pgvector for RAG)
- ~~Mesh protocol~~ — **MQTT + Sparkplug B** (topic namespace designed, see Sparkplug B section)
- ~~Agent→Core transport~~ — **gRPC** (mTLS, binary, strongly typed, same machine/container)
- ~~LLM strategy~~ — **RAG + pgvector**, no fine-tuning; OllamaAdapter + ClaudeAdapter + OpenAIAdapter
- ~~Deployment model~~ — **Podman**, self-contained installer, air-gapped capable
- ~~Security model~~ — **Zero Trust + Defence in Depth** (Azure principles), mTLS everywhere, RBAC/ABAC
- ~~Plugin contract~~ — defined (manifest, ABC, core handle, lifecycle, error handling — see Plugin ecosystem section)
- ~~Application architecture~~ — **Core + plugins, not microservices**. Infrastructure components (TimescaleDB, MQTT broker, TLS proxy) run as separate containers — these are commodity infrastructure, not business logic splits. Business logic lives in one `imbrain-core` container with plugins loaded in-process.
- ~~Plugin vs agent boundary~~ — **plugins are in-process** (analytics, modern protocol drivers, storage backends); **agents are out-of-process** (legacy connectors, OS-specific adapters, edge/remote collectors). The test: can it run in the same process on the same OS? If not → agent.
- ~~Agent deployment topology~~ — agents run on the **DMZ or historian machine**, never on the protected SCADA/PLC server. The SCADA machine runs a licensed, trusted-vendor OPC gateway (Kepware, Matrikon) — approved by OT security policy. The agent connects inward to the OPC UA endpoint; the SCADA machine never initiates outbound connections.
- ~~OPC DA integration~~ — **DA→UA wrapper** (Kepware/Matrikon if on-site, else Imbra DA→UA Bridge using `pywin32` + `asyncua`)
- ~~Lab data ingestion~~ — **LabFileAgent** (CSV, XML, JSON, Excel, ASTM, fixed-width; late arrival handled by lab timestamp preservation)
- ~~Agent implementation language~~ — **Go** (Python also supported for community/prototyping — both SDKs open source MIT)
- ~~Imbra Connect commercial model~~ — **Python + Go open source MIT (full SDK)**; ports to other languages available on request (paid); revenue from ImBrain plugins, support, and managed cloud

### Agent language: Go

Agents are written in Go. The primary driver is deployment simplicity — ImBrain's core value proposition for small industrial companies is a single installer that works air-gapped. Every Python container adds ~300–500MB and a runtime dependency chain; a Go binary adds ~10MB.

| Dimension | Python | Go | Decision |
|-----------|--------|----|----------|
| Container size | ~300–500MB per agent image | ~10–20MB (scratch + binary) | **Go** |
| Air-gapped installer size | Multiple heavy images | Small binaries | **Go** |
| Cross-compilation | Platform wheels, pywin32 issues on ARM | `GOOS=linux GOARCH=arm64 go build` | **Go** |
| Concurrency (N tags, buffer, flush) | asyncio — works, adds complexity | Goroutines — idiomatic fit | **Go** |
| gRPC | Works | First-class, Go is where gRPC was developed | **Go** |
| Protocol ecosystem | paho-mqtt, pymodbus, python-can exist now | Go ports to be written | **Python** |
| Contributor accessibility | OT engineers know Python | Higher barrier | **Python** |

The protocol ecosystem gap is real but temporary — the Go ports of Imbra Connect are already planned. New protocol implementations follow a deliberate two-stage process: prototype and validate in Python, then ship in Go. Python is the exploration language; Go is the product language. Community agents in Python are legitimate releases — Imbra's official agents are Go. See the Imbra Connect spike for the full language strategy.

#### Open-source model

The entire Imbra Connect SDK — Python, Go, Rust, TypeScript, including packet crafting and test tooling — is open source MIT. Anyone can write an agent in any supported language, experiment freely, and publish it.

This is not a concession. It is the strategy. Packet crafting and test tooling are part of the core architecture — not features to be gated. An engineer testing a PLC on the bench needs the same capabilities as an agent in production. Restricting access would make the SDK less useful and would cut off the community that makes the whole system grow.

#### Community agent registry

Community-written agents are submitted to the Imbra agent registry. Open source (MIT) is a mandatory condition of submission. Imbra reviews and can promote agents to Verified or Official status and incorporate them into the standard installer. See Imbra Connect documentation for full registry details.

---

## Fleet management and automated updates

Enterprise customers run Ansible, Salt, or Puppet across their plant network and expect ImBrain to fit into that model. ImBrain supports automation, but owns the upgrade contract — the automation platform triggers a single command; ImBrain handles the rest.

### Upgrade command

```bash
imbrain-ctl upgrade --version 2.3.0 --backup-before
```

ImBrain executes the full upgrade sequence internally:

1. Pre-flight checks — disk space, DB health, agent connectivity
2. Config and schema snapshot
3. Graceful agent shutdown
4. Package swap
5. Schema migration (if required)
6. Health check
7. Automatic rollback if health check fails

Exit codes follow Unix convention (0 = success, non-zero = failed + rolled back). Post-deploy verification:

```bash
imbrain-ctl status --json
```

### What automation platforms invoke

```yaml
# Ansible task example
- name: Upgrade ImBrain
  command: imbrain-ctl upgrade --version {{ imbrain_version }} --backup-before
  register: result
  failed_when: result.rc != 0
```

Packages are distributed via a versioned apt/RPM repository or direct binary download from the Imbra registry. Direct `apt upgrade imbrain` without `imbrain-ctl` is explicitly unsupported — it bypasses migration logic.

### Rollout strategy

| Phase | Scope | Condition to proceed |
|-------|-------|----------------------|
| Canary | 1 plant | 24h monitoring, no anomalies |
| Staged | 10% → 50% → 100% | Health checks pass at each step |
| Freeze | All plants locked | Maintenance window or critical period |

Update freeze:

```bash
imbrain-ctl upgrade --lock    # block automated updates
imbrain-ctl upgrade --unlock  # re-enable
```

### Installer distribution

**Imbra hosts a versioned release endpoint:**

```
https://releases.imbra.io/imbrain/2.3.0/imbrain-2.3.0-linux-amd64.tar.gz
https://releases.imbra.io/imbrain/2.3.0/imbrain-2.3.0-windows-amd64.zip
```

Every release is GPG-signed. Checksums are published alongside the binary. Ansible fetches directly from the endpoint in internet-connected environments:

```yaml
- name: Download ImBrain installer
  get_url:
    url: https://releases.imbra.io/imbrain/{{ imbrain_version }}/imbrain-{{ imbrain_version }}-linux-amd64.tar.gz
    dest: /tmp/imbrain-{{ imbrain_version }}.tar.gz
    checksum: sha256:{{ imbrain_checksum }}
```

**Air-gapped plants** — the client mirrors the release to their internal artifact server (Nexus, Artifactory, S3 bucket, or network share). The playbook is identical; only the URL changes:

```yaml
url: http://internal-repo.plant.local/imbrain/{{ imbrain_version }}/imbrain-{{ imbrain_version }}-linux-amd64.tar.gz
```

ImBrain does not phone home during installation or operation. The installer is fully self-contained.

**Responsibility split:**

| Responsibility | Imbra | Client |
|----------------|-----------|--------|
| Build and sign the installer | ✅ | — |
| Host public release endpoint | ✅ | — |
| Mirror to internal repo (air-gapped) | — | ✅ |
| Publish official Ansible collection (`imbra.imbrain`) | ✅ | — |
| Adapt playbook to site inventory | — | ✅ |
| Decide target version and rollout schedule | — | ✅ |

The official Ansible collection is published on Ansible Galaxy. Enterprise customers install it with:

```bash
ansible-galaxy collection install imbra.imbrain
```

The collection ships a ready-made `upgrade` role. The client supplies their inventory and version pin — no playbook authoring required.

### Product tier

Fleet management is an **Enterprise** feature:

| Capability | Community | Enterprise |
|------------|-----------|------------|
| `imbrain-ctl upgrade` (manual) | ✅ | ✅ |
| Ansible collection / Salt formula | — | ✅ |
| Centralised version dashboard | — | ✅ |
| Scheduled maintenance windows | — | ✅ |
| Rollback from mesh coordinator | — | ✅ |

Community and small-site customers update manually. Enterprise customers get the full automation layer, version dashboard, and coordinated mesh rollouts.

---

### Open questions

- [ ] Agent registry v1 — GitHub `awesome-imbrain-agents` index or a minimal hosted page at agents.imbra.io?
- [ ] OpcUaPlugin — `asyncua` (Python) or `gopcua` (Go)? Go preferred for alignment; evaluate maturity first.
- [ ] Imbra DA→UA Bridge — Go single binary (aligned with agent language decision)
- [ ] LabFileAgent format reader plugin API — define the reader interface before building readers
- [x] License for ImBrain Core — **AGPL**. Open but protected against cloud vendors offering hosted ImBrain without contributing back. Self-hosters and paying customers unaffected.
- [x] License for Imbra Connect SDK — **MIT**. See Imbra Connect spike for full rationale.
- [x] License for paid plugins (OEE, GoldenBatch, etc.) — **Commercial** (proprietary). These are the revenue source.

### Build order

| # | Deliverable | Depends on | Notes |
|---|-------------|------------|-------|
| 1 | ImBrain Core — ingest, store, query | — | TimescaleDB, gRPC interface, RBAC |
| 2 | CollectAgent (Modbus + MQTT) | Imbra Connect SDK | First OT data sources |
| 3 | OllamaAdapter + ClaudeAdapter | Core | LLM plugin interface |
| 4 | ReportPlugin | Core + LLM | First bundled plugin — shift report |
| 5 | AlertPlugin | Core | Second bundled plugin |
| 6 | LabFileAgent (CSV + XML) | Core | Lab data ingest |
| 7 | OEEPlugin | Core + AlertPlugin | First paid plugin — highest BV (10) |
| 8 | GoldenBatchPlugin | Core + LabFileAgent | Second paid plugin — highest differentiation (BV 9) |
| 9 | OpcUaPlugin | Core | Enables OPC UA + legacy OPC DA via wrapper |
| 10 | Imbra DA→UA Bridge | OpcUaPlugin | Legacy OPC DA integration |
| 11 | MeshPlugin | Core + Sparkplug B | Multi-site aggregation |
| 12 | Update ImBrain product card on imbra.io | — | After core + first plugin demo-ready |