# Day 28 Field 3 Lab — Distributed OSPF Troubleshooting (Mesh Topology)

**Field Focus:**      Field 3: Distributed Systems (DePIN)
**Core Proof Obligation:** Operator can diagnose and repair misconfigurations in full-mesh OSPF topology with Byzantine nodes
**Estimated Time:**   120 minutes
**Difficulty:**       Advanced

---

## 1. Business Context

Day 28 base lab is a partial mesh (5 routers, serial links). A distributed DePIN network might have 10+ routers all connected via full or near-full mesh. Diagnosing misconfigurations becomes exponentially harder: more neighbors, more complex paths, more opportunities for misconfiguration. This variant extends to a 6-node full mesh with Byzantine neighbor (one router drops 5% of LSAs).

---

## 2. Configuration

6 routers in full mesh: 15 point-to-point links (vs. 5 in base lab).
Misconfigurations: Same 5-fault set, but applied to different routers to require mesh-aware diagnosis.

---

## 3. Verification

Operator must trace paths across full mesh to identify misconfiguration root cause.

---

## 4. [Remaining sections follow Day 25 Field 3 pattern]

Target: BSL-2 to BSL-3
