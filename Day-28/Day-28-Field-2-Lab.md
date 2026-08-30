# Day 28 Field 2 Lab — OSPF Troubleshooting Under Geomagnetic Stress

**Field Focus:**      Field 2: Geomagnetic Resilience
**Core Proof Obligation:** Operator can diagnose OSPF failures when jitter/loss masks underlying misconfigurations
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced

---

## 1. Business Context

Under geomagnetic stress, OSPF adjacencies flap and converge slowly. Diagnosing underlying misconfigurations becomes harder when false positives (from jitter) mask real config errors. This variant layers stress on top of intentional misconfigurations, testing operator's ability to distinguish "it's the stress" from "we have a config bug."

---

## 2. Configuration

Same 5 misconfigurations as base lab, but with:
- 20ms latency + ±20% jitter
- 5% packet loss on all links
- Aggressive timers (hello 5s, dead 15s)

---

## 3. Verification

Diagnostics must account for stress-induced latency/loss; operators confirm real config errors vs stress artifacts.

---

## 4. [Remaining sections follow Day 25 Field 2 pattern]

Target: BSL-2 to BSL-3
