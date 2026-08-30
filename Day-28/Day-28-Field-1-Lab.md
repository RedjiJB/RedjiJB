# Day 28 Field 1 Lab — Offline OSPF Troubleshooting (Persistent Misconfigurations)

**Field Focus:**      Field 1: Black Start Systems
**Core Proof Obligation:** Operator can diagnose and repair offline OSPF misconfigurations using only show commands (no syslog)
**Estimated Time:**   90 minutes
**Difficulty:**       Intermediate

---

## 1. Business Context

In offline environments, syslog and external management servers are unavailable. Operators must diagnose OSPF failures using only CLI `show` commands and system logs. This variant replicates Day 28's base troubleshooting scenarios with emphasis on offline diagnostics.

---

## 2. Misconfigurations (5, same as base)

1. Serial link DCE/DTE clocking issue
2. Missing LAN subnet from neighbor's routing table
3. Multi-access segment neighbor formation failure
4. Missing Internet reachability (no default-route or ASBR misconfiguration)
5. LSDB health audit (Type-1/2/5 LSA count)

---

## 3. Verification (Offline-Safe Diagnostics)

All diagnostics use show commands only (no external logging):

```
show ip ospf neighbor
show ip ospf database
show ip route
show ip ospf interface
```

---

## 4. [Remaining sections follow Day 25 Field 1 pattern]

Target: BSL-2 to BSL-3
