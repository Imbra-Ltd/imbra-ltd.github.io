# Imbra Pact™ — Product Vision

## Overview

**Imbra Pact** is a multi-site coordination and commitment platform for industrial groups. It enables ImBrain instances at different sites — owned by the same company or by separate legal entities — to agree on coordinated actions based on historical and real-time plant data, and to record those agreements as immutable, auditable contracts.

ImBrain is the data layer. Imbra Pact is the coordination layer that runs on top of it.

```
Plant A                          Plant B
ImBrain ──── Imbra Pact ──────── ImBrain
   ↓               ↓                ↓
OT layer      Smart Contract     OT layer
             (on-chain record)
```

The blockchain is not the product. The product is **industrial coordination without phone calls, spreadsheets, or disputed invoices**. The blockchain provides the immutable audit trail and trustless commitment mechanism — justified specifically when two separate legal entities are involved or when regulatory compliance requires an unambiguous record.

---

## Core concept

ImBrain already holds the data that inter-site decisions depend on — consumption rates, inventory levels, batch quality, OEE scores, energy costs, maintenance schedules. Imbra Pact adds a layer that:

1. **Evaluates** contract conditions against ImBrain data in real time
2. **Proposes** a coordinated action when conditions are met
3. **Commits** both parties to the agreement on-chain
4. **Records** who agreed, what was agreed, when, and the data that triggered it
5. **Instructs** — the agreed action is handed off to operators or authorised systems for execution

Imbra Pact does not write to PLCs or change setpoints. It coordinates plans. Execution is a separate authorised step, consistent with ImBrain's hard boundary against autonomous physical actions.

---

## Use cases

### 1. Energy cost optimisation — demand response

A group operates plants on different grid tariffs. When electricity spot prices spike at one site, ImBrain detects it from the price feed and evaluates whether production can be safely reduced there and shifted to a site with lower prices. Imbra Pact records the agreement: who shifted what, when, and the cost delta. Settlement is automatic.

EU demand response aggregation is already a regulated market. ImBrain provides the intelligence layer; Imbra Pact provides the commitment and audit trail.

**Relevant for:** chemicals, cement, aluminium, food and beverage, data centres.

---

### 2. Carbon credit trading between plants

Two plants in the same group. Plant A overperforms its carbon budget; plant B underperforms. Instead of buying external credits, they trade internally. The contract records the transfer on-chain for EU ETS regulatory audit. ImBrain provides the consumption data the contract evaluates against.

Currently done manually with spreadsheets and legal agreements. Imbra Pact automates it and makes it auditable.

**Relevant for:** any site covered by EU ETS or similar emissions regulation.

---

### 3. Raw material balancing

Plant A has excess raw material inventory. Plant B is running low. Imbra Pact detects the imbalance from ImBrain's tag and inventory data, agrees a transfer — quantity, timing, internal price — and records it on-chain. Both plants' procurement systems receive the instruction. No phone calls, no disputed invoices.

**Relevant for:** chemical groups, food and beverage, cement, plastics.

---

### 4. Shared maintenance capacity

A group shares a pool of specialist maintenance engineers. ImBrain detects a degrading asset at plant A (vibration trending up, OEE dropping). Imbra Pact checks plant B's production schedule — quiet period next week. The contract allocates the maintenance team to plant A during that window. Both sites commit on-chain.

**Relevant for:** any multi-site operator with centralised or shared maintenance resources.

---

### 5. Production quota allocation

A group has a total production quota — regulatory, contractual, or capacity-based. ImBrain knows which plant is running efficiently and which is underperforming. Imbra Pact redistributes quota from the underperforming site to the efficient one to meet the group target. Immutable record for regulatory reporting.

**Relevant for:** pharmaceuticals, food safety, emissions-regulated industries.

---

### 6. Quality-based production routing

Plant A produces an intermediate product. ImBrain has LIMS data showing batch quality scores. Imbra Pact routes high-quality batches to plant B (premium product line) and standard batches to plant C (commodity line) — automatically, based on lab results, with an on-chain record of every routing decision.

**Relevant for:** food and beverage, chemicals, pharmaceuticals.

---

## The pattern

All use cases share the same structure:

- **ImBrain provides the data** — consumption, inventory, quality, OEE, schedules, prices
- **Imbra Pact evaluates the conditions** — defined in the contract, evaluated against live ImBrain data
- **Both parties commit** — on-chain, immutable, timestamped
- **Humans or authorised systems execute** — Imbra Pact never writes to physical systems directly

The blockchain is justified when:
- Two **separate legal entities** are involved — no central trust authority
- **Financial settlement** is part of the agreement
- **Regulatory audit** requires an immutable record

For intra-company use (same legal entity, multiple sites), a cryptographically signed record without a public blockchain is sufficient and cheaper.

---

## Blockchain choice

| Option | Finality | Fee stability | Enterprise trust | Fit |
|--------|----------|--------------|-----------------|-----|
| Ethereum mainnet | ~15s | High, volatile gas | Low for industrial | ❌ Wrong for frequent industrial contracts |
| Energy Web Chain | ~3s | Near zero | Energy sector focus | ✅ Energy-specific use cases |
| Hyperledger Fabric | Sub-second | No fees | High (permissioned) | ✅ Intra-group contracts |
| Hedera Hashgraph | ~5s | Fixed USD ($0.0001) | Very high (council) | ✅ Cross-company contracts |

Hedera is governed by a council of large enterprises (Google, IBM, Boeing, Deutsche Telekom) — industrial customers trust it more than permissionless chains. Fees are fixed and priced in USD, not in a volatile token, which matters for budgeting contracts at scale. Finality is deterministic, not probabilistic.

**Recommendation:**
- **Hedera** for cross-company contracts — demand response, carbon credits, raw material trading between separate legal entities. Enterprise governance, fixed fees, deterministic finality.
- **Hyperledger Fabric** for intra-group contracts — same legal entity, multiple sites. Permissioned, no fees, fastest confirmation.
- Both supported as pluggable backends — the contract logic is the same regardless of chain.

---

## Relationship to ImBrain

Imbra Pact is not a plugin. It is a separate product that depends on ImBrain as its data source.

| Layer | Product | Role |
|-------|---------|------|
| Data | ImBrain™ | Stores and queries plant data |
| Coordination | Imbra Pact™ | Evaluates conditions, forms contracts, records commitments |
| Execution | Operator / authorised system | Carries out the agreed action |

Imbra Pact requires at least two ImBrain instances — one per site involved in the contract. It connects to ImBrain via the standard gRPC query interface. It does not require direct OT access.

---

## Business model

Imbra Pact is a standalone commercial product. It is not open source.

| Tier | Target | Model |
|------|--------|-------|
| **Standard** | Single contract type, two sites | Per-site licence |
| **Enterprise** | Multiple contract types, unlimited sites | Group licence |
| **Managed** | Imbra operates the coordination layer | SaaS / managed service |

Revenue is separate from ImBrain. A customer can buy Imbra Pact only if they already run ImBrain — making it a natural upsell for enterprise ImBrain customers.

---

## Product boundaries

**Imbra Pact does:**
- Evaluate contract conditions against ImBrain data
- Propose coordinated actions when conditions are met
- Record commitments on-chain (immutable, auditable)
- Notify operators and authorised systems of agreed actions
- Track contract execution status

**Imbra Pact does not:**
- Write to PLCs, DCS, or any OT system directly
- Execute physical actions autonomously
- Replace ERP or procurement systems
- Operate without ImBrain as the data source

---

## Competitive landscape

No direct competitor offers exactly what Imbra Pact describes. The market is covered in adjacent segments that each solve part of the problem.

### Demand response platforms

| Company | What they do | Gap |
|---------|-------------|-----|
| AutoGrid | Aggregates demand response across industrial customers | Intermediary between plant and grid — not plant-to-plant |
| Voltus | Demand response fleet management | Same — grid-facing, not peer coordination |
| Enel X | Industrial demand response and energy services | Centralised aggregator model, no smart contracts |

These platforms coordinate between a plant and a grid operator. They are intermediaries. Imbra Pact coordinates directly between plants — no intermediary, no revenue share with an aggregator.

### Energy blockchain projects

| Company | What they do | Gap |
|---------|-------------|-----|
| Energy Web Foundation | Energy Web Chain + tooling for grid flexibility markets | Focused on utilities and grid operators, not industrial historians |
| Power Ledger | Peer-to-peer energy trading on blockchain | Consumer and utility focus, no OT/historian integration |
| Electron | Flexibility trading on blockchain (UK market) | Grid services only, no plant-to-plant coordination |

Energy Web Foundation is the closest technical overlap for use cases 1 and 2. Their chain is the right infrastructure. Their tooling is not aimed at industrial plant coordination.

### Industrial IoT platforms

| Company | What they do | Gap |
|---------|-------------|-----|
| Siemens MindSphere | Multi-site industrial IoT and analytics | No blockchain coordination, no plant-to-plant contracts |
| GE Predix | Industrial performance management | Discontinued as a platform product |
| PTC ThingWorx | Industrial IoT connectivity and analytics | No coordination layer, no commitment mechanism |
| Honeywell Forge | Industrial performance management | Centralised, no peer contracts |
| AspenTech | Process optimisation | Optimisation only — no cross-site commitment |

### Supply chain blockchain

| Company | What they do | Gap |
|---------|-------------|-----|
| IBM Food Trust | Food supply chain traceability on blockchain | Logistics and provenance — not plant operations |
| TradeLens (IBM + Maersk) | Shipping supply chain on blockchain | Shut down 2022 — cautionary tale for enterprise blockchain without clear ROI |

### The white space

Imbra Pact is the only product that combines:
1. A historian as the data source for contract conditions — ImBrain already holds the data
2. Plant-to-plant smart contracts — not plant-to-grid, not plant-to-logistics
3. Industrial use cases beyond energy trading — raw materials, maintenance, quality routing, quota allocation

### Market readiness risk

Industrial companies are conservative. Blockchain still carries crypto baggage in some boardrooms. The mitigation is to lead with **demand response** — the regulatory framework already exists, the ROI is measurable in euros, and Hedera's enterprise governance council removes the crypto association. Once the first use case is proven, the broader coordination platform follows.

---

## Open questions

- [ ] Contract definition language — visual rule builder vs. code (YAML/DSL)?
- [ ] Notification channel for agreed actions — email, MQTT, webhook, ERP API?
- [ ] Multi-party contracts — can more than two sites participate in a single contract?
- [ ] Settlement mechanism — does Imbra Pact handle financial settlement or only record the agreement?
- [ ] Regulatory mapping — which EU frameworks does this need to comply with (ETS, demand response directive, GDPR for cross-company data sharing)?

---

## Next steps

1. Validate use case 1 (demand response) with a pilot customer — highest BV, existing regulatory framework
2. Define the contract schema — conditions, actions, parties, settlement terms
3. Prototype the condition evaluator against a live ImBrain instance
4. Choose blockchain backend for the pilot — Energy Web Chain recommended for use case 1
5. Define the operator notification and execution handoff interface