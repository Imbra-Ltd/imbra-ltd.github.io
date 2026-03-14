# Imbra Connect — Product Brief

## Overview

**Imbra Connect** is a communication protocol abstraction framework — a single Python package providing a unified interface for industrial communication protocols, with paid ports to Go, Rust, and TypeScript.

The core idea: clients program against one abstract interface. Hardware and protocols are plugged in as drivers and adapters. Adding a new protocol or swapping hardware does not change the application code.

---

## Business model

| Tier | Language | License | Distribution |
|------|----------|---------|--------------|
| Free | Python | Open source (TBD) | GitHub + PyPI |
| Paid | Go | Commercial | Private repo / licensed |
| Paid | Rust | Commercial | Private repo / licensed |
| Paid | TypeScript | Commercial | Private repo / licensed |

**License decision pending** — MIT gives maximum freedom but allows free commercial use. LGPL or AGPL adds friction for commercial use and nudges serious users toward the paid Go/Rust versions.

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
```

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

## Open questions

- [ ] Final license for the Python open source version (MIT vs LGPL vs AGPL)
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