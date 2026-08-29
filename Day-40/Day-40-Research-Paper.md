# Day-40 Research Paper — SNMP: Decentralized Monitoring Without External Cloud Dependency

*Redji Jean Baptiste (Toussaint) — Phase 4 Batch 5*
*Applies RESEARCH-GRADE-STANDARD.md (Sections 2.1–2.5) + RESEARCH-PAPER-STANDARD.md (Section 2.6)*

---

## 2.1 Delta Section

```
Baseline:       Centralized monitoring: mesh nodes send syslog to a
                cloud-hosted monitoring service (e.g., Splunk, Datadog).
                All operational metrics (CPU, memory, link status, interface
                errors) flow to the cloud. Monitoring service correlates
                events, generates alerts, and stores historical data.
                Dependencies: WAN link (to reach cloud), cloud service
                availability, cloud provider data-handling policies.

This design:   Decentralized SNMP (Simple Network Management Protocol): each
                mesh node runs an SNMP agent that reports metrics locally
                (CPU, memory, interface stats, syslog). A local SNMP manager
                on a designated node (or Raspberry Pi) collects metrics via
                SNMP queries (LAN-local traffic, no WAN required). Alerts and
                dashboards are generated locally. No cloud dependency.

Delta:         Monitoring responsibility shifts from "cloud provider holds
                operational data" to "local mesh holds operational data;
                monitored via SNMP queries to local agents." Monitoring
                continues to function even if WAN is down (no cloud
                dependency). Data retention is governed by local policy
                (Lakou DAO), not external cloud provider terms.

Justification: Days 33–39 prove that policies, timestamps, addresses, and
                identity can be secure, private, and offline-survivable. Day-40
                proves the same for operational monitoring. A mesh network
                cannot be Black-Start-resilient (Field 1) if monitoring
                depends on cloud; a network cannot be secure (Field 4) if
                operational telemetry leaks to external cloud. P38+ Haiti
                deployment requires local monitoring to avoid WAN dependency
                and cloud data residency. SNMP provides the protocol foundation
                for decentralized monitoring.
```

---

## 2.2 Compliance Gap Analysis

**Reference standards:**
- **RFC 3410 & 3412** (SNMP core + security framework) — agent/manager architecture, MIBs
- **RFC 3414** (SNMP User-based Security Model) — USM authentication
- **NIST SP 800-48** (Network Security Guidelines)
- **Cisco SNMP documentation** — agent configuration, trap handling

| Standard Clause | Requirement | Lab's Design | Compliant? | Gap Justification |
|---|---|---|---|---|
| RFC 3410 — SNMP agent/manager model | SNMP agents should listen on local interfaces, SNMP manager should poll agents via LAN (not WAN cloud) | Day-40 configures SNMP agent on each router/node; central manager queries agents via LAN (no cloud polling) | Compliant | — |
| RFC 3414 — SNMP security (USM) | SNMP queries/responses should be authenticated and encrypted to prevent unauthorized monitoring access | Day-40 base lab uses SNMPv3 with authentication (MD5/SHA) and privacy (AES encryption); SNMPv2c (community string) is noted as insecure but optional for legacy devices | Compliant (SNMPv3); Gap in SNMPv2c (if used) | Acceptable gap: SNMPv2c is simpler for CCNA learning; production uses SNMPv3. Day-40 Design Analysis makes security choice explicit. |
| SNMP trap handling | Critical alerts should be trapped and sent to monitoring station | Day-40 configures `snmp-server traps` to send alerts (interface down, CPU high) to local trap receiver | Compliant | — |
| NIST SP 800-48 — network monitoring | Monitoring should be encrypted and authenticated to prevent eavesdropping on operational data | SNMP queries are encrypted (SNMPv3) and authenticated; trap traffic is encrypted | Compliant | — |

---

## 2.3 Quantitative Benchmarking

### Benchmark 1: Monitoring Availability — WAN Dependency Elimination

```
Metric:              Percentage uptime of operational monitoring when WAN
                      link is down

Baseline value:      Cloud-based monitoring (Splunk, Datadog):
                      - Monitoring depends on WAN link to cloud
                      - If WAN is down (fiber cut, ISP outage, satellite link
                        congestion), syslog/metrics cannot be sent to cloud
                      - Local monitoring: unavailable
                      - Uptime during WAN outage: 0%

This design's value:  Decentralized SNMP (local manager):
                      - Monitoring depends only on LAN (local mesh connectivity)
                      - If WAN is down, local SNMP agent still reports metrics
                        to local manager (LAN query)
                      - Local monitoring: available
                      - Uptime during WAN outage: >99% (if mesh LAN is up)

Delta:                Monitoring availability increase: 0% (during WAN outage)
                      → >99% (decentralized SNMP). Monitoring is resilient to
                      WAN failure.

Confidence/Caveat:    Assumes mesh LAN is working (otherwise both approaches
                      fail). WAN uptime in Haiti (satellite/wireless) typically
                      85–95%; local LAN uptime (local mesh) typically >99%.
```

### Benchmark 2: Monitoring Query Load — Local vs. Cloud Bandwidth

```
Metric:              Bandwidth consumed by operational monitoring (SNMP
                      queries, syslog traffic)

Baseline value:      Cloud-based monitoring (continuous syslog streaming):
                      - 100 mesh nodes, each generating ~10 syslog entries/min
                        (policy denials, link state changes, CPU warnings)
                      - Total: 1000 log entries/min = ~500 KB/min (assuming 500
                        bytes/entry)
                      - Bandwidth consumed: 500 KB/min = ~6 Mbps continuous
                        (unrealistic; would be bursty)
                      - Monthly data: ~2.16 TB/month

This design's value:  Decentralized SNMP (polled monitoring):
                      - SNMP queries: each manager query = ~1 KB, response = ~5
                        KB
                      - Central manager polls 100 agents every 5 minutes: 100
                        queries = 100 KB outbound, 500 KB inbound per poll cycle
                      - Bandwidth consumed: 600 KB / (5 min) = ~2 Kbps
                      - Monthly data: ~1.1 GB/month

Delta:                Bandwidth reduction: 6 Mbps → 2 Kbps = 3000× reduction.
                      This is because SNMP queries are pulled (on-demand) rather
                      than syslog streamed continuously.

Confidence/Caveat:    Estimates assume continuous cloud-syslog (unrealistic);
                      typical cloud monitoring is sampled or buffered, so actual
                      cloud bandwidth is lower. The comparison is "streaming syslog"
                      vs. "polled SNMP"; real cloud implementations use buffering
                      and sampling, reducing the bandwidth difference. However,
                      even with buffering, local SNMP is more bandwidth-efficient
                      than cloud syslog.
```

### Benchmark 3: Monitoring Query Latency — Real-Time Alerts

```
Metric:              Time from event occurrence to alert notification (e.g.,
                      interface down → alert sent)

Baseline value:      Cloud-based monitoring (syslog streaming):
                      - Event occurs on node (interface down)
                      - Syslog entry generated (instantly)
                      - Entry queued for cloud transmission (1–10 sec buffer)
                      - WAN transmission delay (100–500 ms for satellite link
                        in Haiti)
                      - Cloud processing: parse, trigger alert, send notification
                        (1–5 sec)
                      - Total latency: 2–16 seconds

This design's value:  Decentralized SNMP (polled):
                      - Event occurs on node (interface down)
                      - SNMP agent updates local MIB (instantly)
                      - Manager polls agent on schedule (every 5 minutes, or on
                        trap trigger)
                      - Trap-based alert: agent sends trap to manager
                        immediately upon event (LAN latency ~1 ms)
                      - Manager receives trap and triggers local alert (instant)
                      - Total latency: <100 ms (if trap-based)

Delta:                Alert latency reduction: 2–16 seconds → <100 milliseconds
                      = 20–160× faster. Alerts are real-time (not buffered).

Confidence/Caveat:    Trap-based alerts are reactive (faster); polled monitoring
                      (every 5 min) has higher latency. Day-40 configures both:
                      polling for statistics, traps for critical alerts.
```

---

## 2.4 Verification Traceability Matrix

| Requirement (from Lab Overview/Learning Objectives) | Verification Command(s) that test it | Covered? | Gap Note |
|---|---|---|---|
| Configure SNMP agent on devices | `show snmp` shows agent configuration (version, community/credentials, traps) | Yes | — |
| Configure SNMP manager (local monitoring station) | SNMP manager application (e.g., Zabbix, Nagios) is installed; configured to poll agents; dashboard shows metrics | Yes | — |
| Test SNMP queries (polling) | Use `snmpwalk` or manager tool to query agents from manager; verify metrics retrieved (CPU, memory, interface stats) | Yes | — |
| Configure SNMP traps | Trigger an event (interface down, CPU spike); verify trap is sent to manager and alert is generated | Yes | — |
| Verify monitoring works without WAN | Disconnect WAN link; verify SNMP queries still work (LAN-local); metrics still collected | Yes | — |
| Understand SNMP security (SNMPv3) | Lab manual documents SNMPv3 authentication/privacy configuration; SNMPv2c insecurity is acknowledged | Yes | — |

---

## 2.5 Community Integration

**Contribution target:** Network-monitoring and DevOps communities (Prometheus, Grafana, Zabbix, Nagios)

**Current state:**
- Working SNMP agent configuration on Cisco IOS devices
- SNMP manager polling and trap reception
- Local dashboard (manual example or integration with open-source monitoring)

**Gap to contributable:**
1. **Integration with Prometheus/Grafana:** Add Prometheus SNMP exporter examples, Grafana dashboard for Haiti mesh metrics
2. **Automated Alert Response:** Triggers that execute remediation (e.g., "if CPU >80%, reduce polling rate")
3. **Decentralized Monitoring Scaling:** Documentation for deploying SNMP managers across multiple mesh regions (P38+ pilot)
4. **Field-specific variants:** Base lab proves Field 4 at moderate strength; contributing would benefit from Day-40-Field-4-Lab.md (security-focused monitoring, encrypted traps, formal alert correctness)

---

## 2.6 Research-Field Linkage

### 2.6.a Research Fields Identified

This lab contributes evidence to one primary research field:

- **Field 4: Security (Decentralized Infrastructure & Observability)** — Day-40 proves that operational monitoring can be decentralized and kept private (no cloud dependency, no external data leakage). This completes the decentralization proof: policies can be local (Days 33–35), timestamps are local and synchronized (Days 36–37), DNS/DHCP are local (Day-38), identity is verified locally (Day-39), and monitoring is local (Day-40).

### 2.6.b Proof Obligations

**Field 4 (Security):**
- **Proof obligation 1:** SNMP monitoring must function without WAN link (i.e., all queries/responses are LAN-local, not routed through cloud).
  - *Validation:* On Day-40-Field-4-Lab.md, disconnect WAN link. Send SNMP queries from local manager to agents. Verify all queries/responses succeed (no cloud dependency). Interface metrics, CPU stats, trap alerts all work over LAN only.

- **Proof obligation 2:** SNMP monitoring data must be encrypted and authenticated such that an attacker cannot eavesdrop on operational metrics (e.g., learn network topology from interface metrics).
  - *Validation:* Configure SNMPv3 with privacy encryption (AES-128). Capture SNMP traffic (packet sniffer); verify that SNMP queries/responses are encrypted (unreadable). Verify authentication prevents unauthorized SNMP access (query from unauthorized IP should be rejected).

### 2.6.c Haiti Deployment Linkage

**Field 4 (P38+ Operational Telemetry Security):**
- **Module:** dcentral-core + all mesh modules (every module needs monitoring)
- **When:** P38 pilot (50–100 nodes with limited WAN) through P55+ (1000+ nodes, geographically distributed)
- **Why this proof matters:** P38 pilot operates in rural Haiti with unreliable WAN (satellite, often congested). Cloud-dependent monitoring would be unavailable half the time. Day-40's decentralized SNMP proof ensures that operational monitoring continues even during WAN outages. Example: "A mesh node CPU spiked at 3 AM; WAN was down, but local SNMP monitoring recorded it; when WAN came back, DAO governance reviewed the metrics and identified the Byzantine node." **Operational consequence:** P38+ operations can diagnose issues and exclude Byzantine nodes even during network partitions (no cloud dependency for observability).

### 2.6.d Publication Linkage

- **Publication #4: *Critical Infrastructure Security* (Field 4, P60–P65, Harvard peer-reviewed)**
  - *Specific contribution:* Day-40's decentralized SNMP monitoring demonstrates that mesh networks can maintain complete observability (CPU, memory, interface stats, alerts) without relying on cloud infrastructure. The publication cites this lab as evidence that decentralized systems can be operationally mature and observable without sacrificing privacy or availability.

### 2.6.e Validation Gate

**Research milestone (Validation Gate):**
- **T4 publication on decentralized monitoring and Byzantine-node diagnosis (Field 4, P28+ target, venue: OSDI/NSDI)** MUST be complete before P38+ governance reaches Byzantine-node exclusion scale.
  - *Why:* Governance exclusion of Byzantine nodes requires proof that monitoring data can diagnose node misbehavior reliably. Day-40's SNMP proof is the operational foundation; the T4 publication formalizes the Byzantine-diagnosis methodology.
  - *Status:* Field 4 targets P28 (T4 publication); timing aligns with P38+ governance scale-up.
  - *Consequence if missed:* P38+ governance proceeds without formal Byzantine-node diagnosis methodology; governance exclusion decisions are informal (based on operator observation, not metrics).

---

## Appendix: Field-Specific Variants (Planned)

- **Day-40-Field-4-Lab.md (Security variant):** Emphasis on SNMPv3 security, encrypted traps, Byzantine-behavior detection via SNMP metrics, formal alert correctness.

---

## Summary: Days 33–40 Research-Paper Completion

**Complete research papers have been generated for:**
1. **Day-33 (ACLs Advanced):** Extended ACLs, Fields 4+6 ✓
2. **Day-34 (ACLs Advanced Continued):** Multi-interface policies, Fields 4+6 ✓
3. **Day-35 (ACLs Advanced):** Object-oriented policies, Fields 4+6 ✓
4. **Day-36 (CDP/NTP):** Time synchronization, Field 4 ✓
5. **Day-37 (CDP/NTP Continued):** Authenticated NTP/CDP, Field 4 ✓
6. **Day-38 (DNS/DHCP):** Decentralized name/address service, Fields 4+5 ✓
7. **Day-39 (DHCP Snooping):** Tamper-resistant DHCP, Fields 1+4 ✓
8. **Day-40 (SNMP):** Decentralized monitoring, Field 4 ✓

**Research linkage summary:**
- **Field 1 (Black Start):** Days 39 (offline identity verification)
- **Field 4 (Security):** Days 33–40 (comprehensive decentralized infrastructure proof)
- **Field 5 (Healthcare AI):** Day-38 (privacy-preserving infrastructure)
- **Field 6 (Autonomous Law):** Days 33–35 (auditable governance)

**Haiti deployment alignment:**
- **P38 pilot:** Days 33–36 proofs are published (T3/T4 by P26+); deployment can proceed
- **P38 governance:** Days 33–40 + field-specific variants provide governance audit trails
- **P55+ scale:** Days 37–40 formal-verification publications provide foundation for 1000+ node monitoring/governance

---

*End of Day-40 Research Paper*
