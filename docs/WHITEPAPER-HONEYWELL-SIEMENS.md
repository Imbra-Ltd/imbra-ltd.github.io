# Honeywell Control Blocks for Siemens — White Paper
*One Control Philosophy Across the Plant*

**Author:** Branimir Georgiev, Imbra
**Version:** 0.1 — Draft
**Date:** March 2026

---

## Abstract

Industrial plants running Honeywell DCS as the main control system routinely use Siemens PLCs for auxiliary units — compressors, utilities, ancillary processes. The result is a split control environment: operators trained on Honeywell semantics must context-switch every time they work on a Siemens unit. Block names differ. Parameter conventions differ. Alarm and interlock behaviour differs. The cost is measured in training time, documentation burden, and slower fault diagnosis.

This library ports the core Honeywell control modules — PID, DEVCTL, AI, AO, DI, and DO — to Siemens S7-300/1500 as native FC/FB blocks written in SCL and called from Ladder in TIA Portal. The blocks replicate Honeywell semantics precisely: same parameter names, same state machine behaviour, same alarm logic. Operators work with one control philosophy across the entire plant.

---

## 1. The Mixed DCS/PLC Challenge

Modern industrial plants are rarely built on a single control platform. A process plant will typically deploy a Honeywell DCS — Experion PKS, TDC 3000, or Plantscape — as the primary control system for the main process. Auxiliary systems — compressors, cooling towers, utilities, packaging lines — are often controlled by Siemens PLCs, either because the original equipment manufacturer supplied them that way, or because a Siemens PLC was the most cost-effective choice for a smaller, standalone unit.

This is not a design failure. It is the normal outcome of plants that have grown over decades, sourcing equipment from multiple vendors. The problem is not the hardware mix. The problem is what it means for operations.

### The operator context switch

An operator running a Honeywell Experion console knows the control block library by habit. A PID loop has a MODE parameter that accepts MANUAL, AUTO, and CAS. A DEVCTL block has COMMAND, STATE, and PERMISSIVE inputs with well-defined interlock behaviour. AI blocks apply HIHI, HI, LO, and LOLO alarm limits with configurable deadbands. These semantics are embedded in daily practice — in shift handover notes, in standard operating procedures, in the muscle memory of fault diagnosis.

When the same operator steps to a Siemens PLC panel or engineering station, none of that transfers. Siemens PID blocks use different parameter names and a different mode model. Discrete device management uses custom logic written per installation. I/O alarm handling is configured differently in every project. The operator is not working in a different system — they are working in a different language.

### The documentation burden

Plants with mixed environments maintain two sets of documentation: one for Honeywell control philosophy and one for Siemens. Standard operating procedures must account for both. Commissioning engineers must be familiar with both. Training programmes must cover both. Every point where the two systems interact — a setpoint from a DCS fed to a PLC, an alarm from a PLC displayed on the DCS — requires explicit translation between the two philosophies.

### The maintenance cost

Fault diagnosis in a mixed environment is slower. An engineer investigating an abnormal condition on a Siemens auxiliary unit must first translate the Siemens block behaviour into terms that match the plant's Honeywell-based operating documentation. In a time-critical situation — a compressor surge, a utility failure — this translation overhead has real consequences.

---

## 2. Honeywell Control Block Semantics

The Honeywell DCS control block library evolved over decades to serve process plant operators. Its defining characteristic is predictability: every block of the same type behaves identically, regardless of which loop it controls or which version of the DCS it runs on. An operator who knows the PID block on one unit knows it on every unit across the plant.

### PID — Closed-loop control

The Honeywell PID block implements a full-featured proportional-integral-derivative controller with bumpless transfer between modes, output tracking, setpoint ramping, and configurable anti-windup. Its mode model — MANUAL, AUTO, CASCADE, and COMPUTER — is the standard against which most DCS PID implementations are measured.

Key parameters include:
- **GAIN, RESET, RATE** — tuning constants in Honeywell engineering units (gain as a ratio, reset in repeats per minute, rate in minutes)
- **MODE** — operating mode with bumpless transfer on all transitions
- **SP, PV, OUT** — setpoint, process variable, and output with engineering unit scaling
- **SPHI, SPLO** — setpoint limits enforced in all automatic modes
- **OUTHI, OUTLO** — output limits
- **ERVDB** — error deadband to prevent limit cycling
- **ALMHI, ALMLO** — process variable alarms with hysteresis

### DEVCTL — Discrete device management

The DEVCTL block manages discrete devices — pumps, motors, compressors, valves — with a standardised state machine that covers normal operation, permissive interlocking, fault handling, and manual override. Its value is not in the logic itself, which is straightforward, but in the consistency: every discrete device in a Honeywell plant uses the same block, so every device behaves the same way.

States handled by DEVCTL:
- **DEENERGIZED** — device off, no command active
- **ENERGIZED** — device on, running normally
- **STARTED** — command issued, awaiting feedback confirmation
- **STOPPED** — command issued, awaiting feedback confirmation
- **FAULT** — device failed to respond within the configured timeout
- **MAINTENANCE** — device isolated for maintenance, bypassing interlock logic

Key inputs include COMMAND (START/STOP), PERMISSIVE (interlock chain), RUN\_FEEDBACK and STOP\_FEEDBACK (physical state confirmation), and FAULT\_RESET.

### AI/AO/DI/DO — I/O with process conditioning

The Honeywell I/O blocks go beyond raw signal conversion. AI (analog input) applies engineering unit scaling, signal quality tracking, and a full four-limit alarm structure (HIHI, HI, LO, LOLO) with configurable deadbands and alarm priorities. AO (analog output) applies output limiting and tracks the physical output state. DI (digital input) applies filtering and debouncing. DO (digital output) tracks commanded and feedback states.

The alarm structure is particularly important. Operators rely on consistent alarm behaviour across all analog inputs — the same deadband logic, the same priority model, the same acknowledgement behaviour. When an auxiliary unit uses a different I/O block library, that consistency breaks.

---

## 3. The Port Architecture

### Implementation language: SCL

The blocks are implemented in Structured Control Language (SCL), Siemens' IEC 61131-3 structured text implementation for TIA Portal. SCL is the appropriate choice for this library for three reasons.

First, SCL supports the structured programming constructs — conditionals, loops, local variables, function calls — required to implement complex state machines like DEVCTL cleanly. Implementing the same logic in Ladder Diagram would require many rungs with obscure cross-references.

Second, SCL compiles to the same machine code as Ladder on Siemens CPUs. There is no performance penalty.

Third, SCL code is readable and auditable. A control engineer reviewing the PID implementation can follow the logic directly. This matters for validation and for long-term maintenance.

### FC/FB structure

Each control block is delivered as a Function Block (FB) in TIA Portal. Function Blocks retain instance data between scans, which is required for stateful blocks like PID (which accumulates integral action) and DEVCTL (which tracks device state across state machine transitions).

The interface of each FB mirrors the Honeywell block parameter model as closely as the Siemens data type system allows. Parameter names are preserved where possible. Where Siemens data types differ from Honeywell conventions — for example, real versus integer representations of mode — the FB handles the conversion internally so the calling program sees Honeywell-style values.

### Calling from Ladder

The FBs are designed to be called from Ladder Diagram programs, which is the standard for device-level programs in Siemens PLC projects. Each FB call in Ladder requires one instance data block (DB), which TIA Portal creates automatically. Inputs are wired from process variables or HMI tags; outputs drive actuators or feed upstream logic.

This means the calling structure is identical to how a Honeywell DCS engineer would configure a block: provide the inputs, wire the outputs, set the initial parameters. The FB handles everything inside.

---

## 4. Block Reference

### PID

| Parameter | Type | Direction | Description |
|-----------|------|-----------|-------------|
| PV | REAL | IN | Process variable (engineering units) |
| SP | REAL | IN | Setpoint (engineering units) |
| MODE | INT | IN/OUT | 0=MANUAL, 1=AUTO, 2=CASCADE |
| GAIN | REAL | IN | Proportional gain |
| RESET | REAL | IN | Integral action (repeats/min) |
| RATE | REAL | IN | Derivative action (minutes) |
| OUTHI | REAL | IN | Output high limit (%) |
| OUTLO | REAL | IN | Output low limit (%) |
| SPHI | REAL | IN | Setpoint high limit |
| SPLO | REAL | IN | Setpoint low limit |
| OUT | REAL | OUT | Controller output (%) |
| ALMHI | REAL | IN | High alarm limit |
| ALMLO | REAL | IN | Low alarm limit |
| HIHI\_ALM | BOOL | OUT | High-high alarm active |
| HI\_ALM | BOOL | OUT | High alarm active |
| LO\_ALM | BOOL | OUT | Low alarm active |
| LOLO\_ALM | BOOL | OUT | Low-low alarm active |

### DEVCTL

| Parameter | Type | Direction | Description |
|-----------|------|-----------|-------------|
| COMMAND | INT | IN | 0=STOP, 1=START |
| PERMISSIVE | BOOL | IN | Interlock chain — FALSE blocks START |
| RUN\_FB | BOOL | IN | Run feedback from field |
| STOP\_FB | BOOL | IN | Stop feedback from field |
| FAULT\_RESET | BOOL | IN | Reset fault state |
| MAINT | BOOL | IN | Maintenance bypass |
| START\_OUT | BOOL | OUT | Start output to actuator |
| STOP\_OUT | BOOL | OUT | Stop output to actuator |
| STATE | INT | OUT | Current device state |
| FAULT | BOOL | OUT | Device fault active |
| FB\_TIMEOUT | TIME | IN | Feedback confirmation timeout |

### AI

| Parameter | Type | Direction | Description |
|-----------|------|-----------|-------------|
| RAW | INT | IN | Raw analog input (0–27648) |
| EGU\_HI | REAL | IN | Engineering unit high range |
| EGU\_LO | REAL | IN | Engineering unit low range |
| HIHI\_LIM | REAL | IN | High-high alarm limit |
| HI\_LIM | REAL | IN | High alarm limit |
| LO\_LIM | REAL | IN | Low alarm limit |
| LOLO\_LIM | REAL | IN | Low-low alarm limit |
| DB | REAL | IN | Alarm deadband |
| PV | REAL | OUT | Scaled process variable |
| HIHI\_ALM | BOOL | OUT | High-high alarm |
| HI\_ALM | BOOL | OUT | High alarm |
| LO\_ALM | BOOL | OUT | Low alarm |
| LOLO\_ALM | BOOL | OUT | Low-low alarm |
| BAD\_PV | BOOL | OUT | Signal quality bad |

---

## 5. Operational Benefits

### Consistent operator experience

Operators trained on Honeywell DCS can configure, tune, and troubleshoot auxiliary units without learning a second control block library. The MODE parameter works the same way. DEVCTL states map to the same operating procedures. Alarm limits are set with the same parameter names. The mental model transfers completely.

### Reduced training requirements

New operators need to learn one control philosophy, not two. Training materials cover one block library. Competency assessments test one set of skills. This reduces both the initial training investment and the ongoing burden of keeping operators current across two systems.

### Unified documentation

Standard operating procedures, P&ID annotations, and loop descriptions can use consistent terminology across DCS and PLC sections. A loop sheet for a Siemens-controlled compressor looks the same as a loop sheet for a Honeywell-controlled reactor. Maintenance engineers reading the documentation do not need to translate between systems.

### Faster fault diagnosis

When an abnormal condition occurs on a Siemens auxiliary unit, the engineer investigating it applies the same diagnostic process as on the Honeywell main system. The fault states, the alarm structure, and the interlock logic are familiar. The time from alarm to diagnosis is shorter.

---

## 6. Deployment

### Supported hardware

- Siemens S7-300 (all CPU variants with SCL support)
- Siemens S7-1500 (all CPU variants)

### TIA Portal compatibility

- TIA Portal V15.1 and above

### Delivery

The library is delivered as a TIA Portal library file (.al15 or .al17) containing all FBs and associated data blocks. Import into any TIA Portal project using the standard library import function. FBs are available in the project tree immediately after import.

### Licence

One licence covers deployment in a single TIA Portal project. Multi-project and site-wide licences are available — contact Imbra for pricing.

---

## 7. Conclusion

The operational cost of mixed DCS/PLC environments is real but often accepted as unavoidable. It is not. Honeywell Control Blocks for Siemens eliminates the semantic gap between the two systems — giving operators one control philosophy to learn, one alarm model to follow, and one documentation standard to maintain.

The implementation is clean: SCL code auditable by any control engineer, FC/FB blocks callable from standard Ladder programs, parameter interfaces that match the Honeywell model operators already know.

For plants where operational consistency matters more than platform purity, this library closes the gap.

---

**Contact:** contact@imbra.io
**Website:** https://imbra.io