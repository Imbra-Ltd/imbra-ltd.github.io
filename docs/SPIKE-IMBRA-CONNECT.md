# Imbra Connect — Product Brief

## Overview

**Imbra Connect** is a communication protocol abstraction framework — a single Python package providing a unified interface for industrial communication protocols, with paid ports to Go, Rust, and TypeScript.

The core idea: clients program against one abstract interface. Hardware and protocols are plugged in as drivers and adapters. Adding a new protocol or swapping hardware does not change the application code.

---

## Business model

| Component | License | Distribution |
|-----------|---------|--------------|
| Python — full SDK | Open source (MIT) | GitHub + PyPI |
| Go — full SDK | Open source (MIT) | GitHub |
| Rust — port | **Commercial** | Private repo / licensed |
| TypeScript — port | **Commercial** | Private repo / licensed |
| Community agents | Open source (MIT, mandatory) | Agent registry |

**Python and Go are the open-source core.** Full SDK in both languages — protocol implementations, packet crafting, test tooling, agent scaffolding — all MIT. No paid tiers within Python or Go.

**Rust and TypeScript are paid ports.** The value is the porting work and the language-specific optimisations, not feature restrictions. Customers who need Rust (embedded, safety-critical, bare-metal) or TypeScript (browser, Node.js, cloud functions) pay for the port. The Python and Go implementations remain the reference.

**Revenue comes from ImBrain, not from Imbra Connect:**

| Revenue source | Model |
|----------------|-------|
| ImBrain paid plugins | OEE, Golden Batch, Anomaly Detection, LLM, Forecast, etc. |
| ImBrain support contracts | Installation, maintenance, incident response |
| ImBrain managed cloud | Hosted ImBrain for customers who don't want on-premise |
| Integration consulting | Custom agent development, site deployment, migration from legacy historians |

Imbra Connect is the tool that creates the community. ImBrain is the product that generates revenue. A large, healthy Imbra Connect community means more agents, more protocol coverage, more engineers familiar with the stack — all of which drives ImBrain adoption.

---

## Development process

**Prototype in Python. Ship in Go.**

Python and Go serve distinct roles in the development lifecycle — not as competitors, but as sequential stages.

Python is the prototyping and exploration language. New protocol implementations and agents are developed first in Python. It allows rapid iteration — interactive exploration, quick feedback, access to a broad ecosystem for testing against real hardware. The Python implementation defines the correct behaviour, the packet structure, and the API contract.

Go is the product language. Once the Python prototype is validated and the API is stable, it is ported to Go for release. Go produces a single self-contained binary with no runtime dependencies — the right fit for air-gapped industrial plants, cross-platform deployment, and long-term maintenance. It is the more future-proof ecosystem for this domain: strong backwards compatibility, trivial cross-compilation, natural concurrency model for multi-protocol agents, and the dominant language direction for infrastructure tooling.

**Maintenance boundary:** once the Go release ships, Imbra's engineering time moves entirely to Go. The Python version remains open source and available, but it is community-maintained from that point. Community contributions to Python are welcome and will be reviewed — Imbra does not proactively fix or extend it.

| Stage | Language | Owner | Purpose |
|-------|----------|-------|---------|
| Prototype | Python | Imbra | Validate protocol behaviour, explore API design, test on real hardware |
| Community agents | Python | Community | Production agents for the registry — legitimate releases, not just prototypes |
| Product | Go | Imbra | Official release — single binary, air-gapped deployment, long-term maintenance |
| Paid ports | Rust / TypeScript | Imbra | Language-specific targets for embedded or browser environments |

---

## Community agent registry

### Goal

Every industrial protocol and hardware vendor in the world eventually covered — not by Imbra alone, but by a community of engineers who have the hardware on the bench and want it to work with ImBrain.

The model: engineer writes an agent for their Siemens S7-1500 / Yokogawa DCS / Mitsubishi MELSEC / custom serial device → submits to the registry → every other ImBrain user installs it with one command → Imbra reviews the best ones and promotes them to official status.

This is how Home Assistant grew from 50 device integrations to 3,000+.

### Structure

Imbra Connect, agents, and the registry are three distinct things:

| Component | What it is | Where it lives |
|-----------|-----------|----------------|
| Imbra Connect SDK | Protocol library (Python + Go) | `github.com/imbra-ltd/imbra-connect` |
| Agent | Binary that uses the SDK — owns collection logic | Its own repo, one repo per agent |
| Registry | Index of known agents — metadata, tiers, install pointers | `agents.imbra.io` (v2), GitHub index (v1) |

Agents are not stored in the registry. The registry is a catalogue — it points to agent repos and records metadata (version, protocols supported, tier, install command). The code and binaries live in the agent's own repository.

Official agent repos follow the naming convention `agent-<protocol>` under the `Imbra-Ltd` org:

```
github.com/imbra-ltd/agent-modbus
github.com/imbra-ltd/agent-opcua
github.com/imbra-ltd/agent-mqtt
```

Community agent repos are owned by their authors:

```
github.com/someengineer/agent-yokogawa
github.com/acompany/agent-siemens-s7
```

### Submission rules

- **Open source is mandatory** — MIT license, public GitHub repository
- Agent must pass a basic automated compatibility test against the current Agent SDK version
- No malware, no telemetry, no phone-home — enforced by Imbra review
- Submitter retains copyright; Imbra may fork, improve, and incorporate into official agents with attribution

### Registry tiers

| Tier | How it gets there | Guarantee |
|------|------------------|-----------|
| **Community** | Submitted by anyone, passes automated checks | Reviewed for safety, not quality |
| **Verified** | Imbra-reviewed, tested on real hardware | Works as documented |
| **Official** | Maintained by Imbra, included in installer | Fully supported |

### Installation

```bash
# Install an official agent (bundled in installer)
imbrain agent install agent-modbus

# Install a verified community agent
imbrain agent install community/agent-yokogawa

# Install any community agent directly by GitHub repo
imbrain agent install github.com/someengineer/agent-yokogawa
```

### Registry roadmap

- **v1** — GitHub-hosted index (`awesome-imbrain-agents`) + manual `imbrain agent install <github-url>`
- **v2** — Hosted registry at `agents.imbra.io` — search, ratings, install counts, version pinning
- **v3** — Automatic compatibility matrix — shows which agent versions work with which core versions

---

## Protocols

Existing implementations:
- **MQTT** — versions 3.x and 5.x (share common base)
- **DeviceNet** — CIP over CAN
- **CAN** — base transport
- **CANopen** — application layer over CAN

Planned:
- **EtherNet/IP** — CIP over TCP/UDP
- **Modbus** — RTU and TCP variants
- **OPC XML-DA (XDA)** — XML/SOAP over HTTP, no DCOM required
- Others (Profibus, OPC-UA, FINS, etc.)

### Protocol hierarchy

```
CIP (Common Industrial Protocol — application layer)
├── DeviceNet    (CIP over CAN)
└── EtherNet/IP  (CIP over TCP/UDP)

CAN (transport)
└── CANopen      (application layer over CAN)

MQTT
├── v3.x
└── v5.x

Modbus
├── RTU (serial)
└── TCP

OPC (OLE for Process Control — legacy family)
├── OPC DA     → not directly supported (DCOM — see wrapper strategy below)
└── OPC XML-DA → supported via HTTP/SOAP adapter (no DCOM)
```

### OPC DA and the DCOM constraint

**OPC DA** (Data Access, 1996–2006) is the dominant legacy protocol in older industrial installations. It uses Microsoft DCOM as its transport — which means:

- Requires Windows on both client and server
- Network DCOM requires complex firewall and registry configuration
- Completely incompatible with Linux containers (Podman/Docker)
- Many IT departments prohibit DCOM across network boundaries

Imbra Connect does **not** implement OPC DA directly. The recommended integration path is a **DA→UA wrapper** — a Windows service (existing tool or the Imbra DA→UA Bridge) that reads OPC DA via local COM and exposes a standard OPC UA endpoint. ImBrain's OpcUaPlugin then connects to the UA endpoint as it would to any native OPC UA server.

This is preferred over an MQTT bridge because it preserves the full OPC DA address space (hierarchy, data types, engineering units), works with any OPC UA client in the plant — not just ImBrain — and provides a genuine migration path from DA to UA rather than a workaround.

See the ImBrain documentation for the full decision flowchart and bridge deployment options.

---

## Repository structure

Single package per language, protocols as optional extras:

```
imbra-connect/               # public — Python
├── imbra/connect/
│   ├── core/                # abstract interface — Connection, Message, Driver, Adapter
│   ├── protocols/
│   │   ├── mqtt/            # MQTT 3.x + 5.x
│   │   ├── modbus/
│   │   ├── can/
│   │   ├── canopen/         # depends on can/
│   │   ├── cip/             # CIP application layer
│   │   ├── devicenet/       # depends on can/ + cip/
│   │   └── ethernetip/      # depends on cip/
│   └── ...
├── pyproject.toml
└── README.md

imbra-connect-go/            # private — Go (paid)
imbra-connect-rust/          # private — Rust (paid)
imbra-connect-ts/            # private — TypeScript (paid)
```

**Rationale for single package:** with hundreds of protocols possible, per-protocol versioning is unmanageable. One version, one release, protocols as extras.

---

## Installation (Python)

Clients install only what they need via pip extras:

```bash
pip install imbra-connect[mqtt]           # MQTT only
pip install imbra-connect[modbus]         # Modbus only
pip install imbra-connect[devicenet]      # pulls in can + cip automatically
pip install imbra-connect[mqtt,modbus]    # multiple protocols
pip install imbra-connect[all]            # everything
```

Extras are defined in `pyproject.toml` → `[project.optional-dependencies]`.

**Recommended package manager:** `uv` — fast, modern, replaces pip + virtualenv + pip-tools.

---

## Core abstract interface

The framework separates three concerns:

```
Driver     — abstracts the hardware (NetX, SocketCAN, serial, TCP socket)
Adapter    — handles protocol encoding/decoding (bytes ↔ Message)
Connection — ties Driver + Adapter together, exposes send/receive
```

Sketch:

```python
# core/connection.py
class Connection(ABC):
    def connect(self) -> None: ...
    def disconnect(self) -> None: ...
    def send(self, message: Message) -> None: ...
    def receive(self) -> Message: ...

# core/driver.py
class Driver(ABC):
    def open(self) -> None: ...
    def close(self) -> None: ...
    def read(self) -> bytes: ...
    def write(self, data: bytes) -> None: ...

# core/adapter.py
class Adapter(ABC):
    def encode(self, message: Message) -> bytes: ...
    def decode(self, data: bytes) -> Message: ...
```

Any hardware is supported provided a `Driver` implementation exists. Any protocol is supported provided an `Adapter` implementation exists.

---

## Competitive landscape

### Core protocols (from previous analysis)

| Protocol | Best Python Library | Stars | Maintained | Notes |
|----------|---------------------|-------|------------|-------|
| MQTT | `paho-mqtt` | 2.4k | ✅ Yes | Eclipse Foundation, v3.x + v5.x |
| Modbus | `pymodbus` | 2.7k | ✅ Yes | Very active, async-native |
| CAN | `python-can` | 1.5k | ✅ Yes | Broad hardware support |
| CANopen | `canopen` | 538 | ✅ Yes | Built on python-can |
| EtherNet/IP | `pycomm3` | 483 | ❌ No | Maintainer declared no new development |
| OPC-UA | `asyncua` | 1.4k | ✅ Yes | Still beta versioning |
| S7/Siemens | `python-snap7` | 778 | ✅ Yes | v3.0 pure Python rewrite |
| DeviceNet | — | — | ❌ None | **No library exists** |
| HART | `hart-protocol` | 27 | ⚠️ Stale | Wired HART only, quiet since 2023 |
| DNP3 | `pydnp3` | 37 | ❌ No | Abandoned — `dnp3-python` (VOLTTRON) barely alive |

### Extended protocols

| Protocol | Best Python Library | Stars | Maintained | Notes |
|----------|---------------------|-------|------------|-------|
| EtherCAT | `pysoem` | 131 | ✅ Yes | Cython wrapper for SOEM |
| Zigbee | `zigpy` | 887 | ✅ Yes | Full stack, powers Home Assistant |
| KNX | `xknx` | 327 | ✅ Yes | Async, powers Home Assistant |
| FINS (Omron) | `fins` | ~40 | ✅ Yes | Active through Aug 2025 |
| Profibus | `pyprofibus` | 150 | ⚠️ Stale | Only open-source Profibus-DP stack, quiet since Jun 2023 |
| GE SRTP | `ge-ethernet-SRTP` | ~35 | ⚠️ Low | GitHub only, no PyPI |
| LIN | `pyUSBlini` | <50 | ⚠️ Stale | Hardware-specific only |
| LoRaWAN | fragmented | ~100 | ⚠️ Stale | No maintained stack |
| IO-Link | `iolink` | <20 | ⚠️ Stale | v0.0.5, barely started |
| Profinet | `profi-dcp` | <30 | ❌ No | DCP discovery only, no full RT stack |
| CC-Link | — | — | ❌ None | Vendor SDK only |
| AS-Interface | — | — | ❌ None | Typically bridged via Modbus/EtherNet/IP |
| Modbus Plus | — | — | ❌ None | Proprietary Schneider variant |
| Foundation Fieldbus | — | — | ❌ None | FieldComm Group controlled |

### Market gap summary

The Python industrial protocol ecosystem is fragmented, undermaintained, and incomplete. Key gaps:

- **EtherNet/IP** — pycomm3 abandoned, no replacement
- **DeviceNet** — completely unserved
- **HART / WirelessHART** — effectively unserved
- **Profibus** — one stale library, no active development
- **LIN, IO-Link, LoRaWAN, Profinet** — minimal or no coverage
- **CC-Link, AS-i, Modbus Plus, Foundation Fieldbus** — no open Python library exists

Imbra Connect is not competing with healthy libraries — it is filling real, confirmed gaps in the ecosystem.

---

## Packet crafting and test scenario support

Imbra Connect implementations allow:
- Easy crafting of standard and non-standard protocol frames
- Handling of malformed or out-of-spec packets
- Extensibility for custom test scenarios
- Rich integration testing without specialised hardware

### Competitive landscape for packet crafting

| Tool | Protocols | Packet crafting | Python | Notes |
|------|-----------|----------------|--------|-------|
| **Scapy** | Modbus, EtherNet/IP, CAN, Profinet DCP | Yes — field mutation, `fuzz()` primitive | Yes | Best base layer but no DeviceNet, Profibus, or MQTT |
| **boofuzz** | Any TCP/UDP (manual PDU definition) | Yes — mutation-based | Yes | Generic, requires heavy setup per protocol |
| **fuzzowski-ics** | Modbus, EtherNet/IP, BACnet, S7 | Yes | Yes | Lightly maintained NCC Group fork |
| **cpppo** | EtherNet/IP / CIP | Yes — full CIP parser | Yes | Active but EtherNet/IP only |
| **Defensics** | 300+ protocols incl. Modbus, Profinet, DNP3 | Yes — prebuilt suites | No (proprietary GUI) | Enterprise pricing, no Python API |
| **Aegis Fuzzer** | IEC 61850, DNP3, IEC 60870-5-104 | Yes | No | Commercial, power sector niche |

### Where Imbra Connect wins

No existing open Python tool provides a **unified, high-level packet crafting API across multiple industrial protocols**. Today an engineer must manually combine Scapy + pymodbus + python-can + cpppo to cover even a basic test stack — and still has no coverage for DeviceNet, Profibus, or MQTT fuzzing.

Imbra Connect fills this gap:
- **Consistent API** across all supported protocols — same patterns for crafting, sending, and parsing regardless of protocol
- **DeviceNet and Profibus** — no open Python packet crafting exists anywhere else
- **MQTT non-standard frame handling** — not covered by Scapy or paho-mqtt
- **Extensible by design** — custom frame types and non-spec scenarios are first-class, not workarounds
- **Open source** — commercial alternatives (Defensics) are enterprise-priced with no Python API

Positioning: *"The only open Python framework for industrial protocol packet crafting with consistent support across MQTT, CAN, CANopen, DeviceNet, and CIP — including intentional support for non-standard frames and custom test scenarios."*

---

## Licensing strategy

**Decision: resolved.**

| Component | License | Reason |
|-----------|---------|--------|
| Imbra Connect SDK (Python + Go) | **MIT** | Maximum adoption, zero friction. Engineers at industrial companies cannot use GPL libraries — MIT removes all legal barriers. The SDK is a community-building tool, not a revenue source. |
| Community agents | **MIT** (mandatory) | Registry policy enforced by Imbra review, not by the SDK license. |
| Rust / TypeScript ports | **Commercial** | Proprietary. Value is the porting work and language-specific optimisations. |

MIT places no obligation on users to open source their own code. The only requirement is to keep the copyright notice. This is intentional — friction-free adoption is the goal.

This is the same model used by HashiCorp (Terraform), Grafana, and most successful open infrastructure projects: MIT on the SDK drives community, revenue comes from the product built on top (ImBrain).

### Third-party dependencies — license compatibility

Imbra Connect wraps or depends on existing libraries. All confirmed safe as optional dependencies:

| Library | License | Integration pattern | Notes |
|---------|---------|---------------------|-------|
| `paho-mqtt` | EPL 2.0 + EDL 1.0 (BSD-like) | Optional dependency | Safe for open source and commercial use |
| `pymodbus` | BSD 3-Clause | Optional dependency | Permissive, no restrictions |
| `python-can` | LGPL 3.0 | Optional dependency | Safe to import; do not modify and redistribute |
| `canopen` | MIT | Optional dependency | Fully permissive |
| `asyncua` | LGPL 3.0 | Optional dependency | Safe to import; do not modify and redistribute |

### Rules for the Go port

- **Do not translate LGPL library code** into Go — reimplement from the protocol specification
- **Do not bundle GPL code** under any circumstances
- Protocol implementations for unserved protocols (DeviceNet, Profibus, HART) are entirely original — no licensing concerns
- Keep a record of which implementations are original vs spec-derived

---

## Open questions

- [ ] Does the existing abstract interface match the Driver/Adapter/Connection split or is it structured differently?
- [ ] GitHub org for the repos — `Imbra-Ltd` or a separate org?
- [ ] PyPI package name — `imbra-connect` (check availability)
- [ ] Product page on imbra.io — new card alongside Plant Historian

---

## Next steps

1. Finalise the abstract interface design
2. Create `imbra-connect` repo under `Imbra-Ltd` on GitHub
3. Port existing protocol implementations into the new structure
4. Publish to PyPI
5. Add Imbra Connect product card to imbra.io