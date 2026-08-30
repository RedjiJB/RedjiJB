# Day 48 Field-5 Variant — QoS for Privacy-Preserving Health Data Fairness

## 0. Metadata

```
Field Focus:         Field 5: Privacy-Preserving Healthcare & Fairness
Core Proof Obligation: QoS fairness ensures telemedicine video (<100ms latency), clinical notes encryption (TLS), and bulk data (backups) share WAN fairly—no single flow starves others; audit proves SLA compliance.
Haiti Deployment Phase: P45 (expansion phase) — multiple clinics share 2 Mbps WAN link; telemedicine must not be degraded by nightly backups.
Estimated Time:      2–2.5 hours
Difficulty:          Intermediate-Advanced
Relationship to Base Lab: Same DSCP marking and queuing; added per-flow fairness (no bandwidth monopoly), encryption verification, and fairness audit.
Prerequisite:        Complete Day-48-Lab-Manual first.
```

---

## 1. Business Context (Field-5 Framing)

A regional hospital shares its 2 Mbps WAN link among 5 rural clinics (400 kbps each). Each clinic runs telemedicine (100 kbps video), staff backups (200 kbps nightly), and administrative traffic. **Failure mode:** one clinic's backup monopolizes the shared link, making telemedicine unintelligible for all five clinics—patients cannot be diagnosed. **This variant proves:** QoS fairness algorithm ensures no single clinic's backup starves telemedicine for others, and encryption protects clinical video from eavesdropping during transit.

---

## 2. Topology Diagram (Field-5 Variant)

```
[FIELD-5: FAIRNESS QoS FOR SHARED WAN]

REGIONAL HOSPITAL WAN LINK (2 Mbps shared):

Clinic-A ┐
Clinic-B ├─→ R1 (Central Hub) ─────[2 Mbps WAN]────→ Internet / Cloud
Clinic-C ├─→   ├─ Telemedicine (TLS: 100 kbps each clinic)
Clinic-D ├─→   ├─ Bulk Backup (HTTP: 200 kbps each clinic, staggered)
Clinic-E ┘     ├─ Admin Traffic (DNS, SMTP: 20 kbps)
                └─ QoS Policy enforces fairness: no clinic exceeds 400 kbps

ENCRYPTION BOUNDARY:
├─ Telemedicine video: TLS/H.265 (video encrypted, metadata cleartext)
├─ Backups: HTTPS (headers encrypted, payload encrypted)
└─ Admin: DoT/DNSSEC (DNS encrypted)

FAIRNESS ALGORITHM (per-clinic aggregation):
├─ Clinic-A: up to 400 kbps (may have 100 video + 200 backup + 100 other)
├─ Clinic-B: up to 400 kbps
├─ Clinic-C: up to 400 kbps (no monopoly allowed)
├─ Clinic-D: up to 400 kbps
├─ Clinic-E: up to 400 kbps
└─ Guarantee: Telemedicine for any clinic is never <100 kbps even if another clinic maxes out
```

---

## 3. IP Addressing Plan (Field-5 Annotations)

| Flow | Source | Dest | Port | DSCP | Guarantee |
|---|---|---|---|---|---|
| Telemedicine (video) | Clinic (192.168.x.100) | Hospital (10.0.0.1) | 443 | EF (46) | 100 kbps minimum per clinic |
| Backup (bulk) | Clinic (192.168.x.5) | Backup Server (10.0.0.50) | 443 | AF21 (18) | 200 kbps per clinic, fair-share queued |
| Admin | Clinic (192.168.x.1) | Hospital DNS (10.0.0.2) | 53/853 | CS1 (8) | 20 kbps minimum |

**Field-5 Annotations:**
- EF (video): Strict priority, never delayed.
- AF21 (backup): Weighted fair, capped per-clinic to prevent monopoly.
- CS1 (admin): Minimum guarantee, but doesn't starve video.

---

## 4. Configuration (Field-5 Optimizations)

### 4.1 Class-Maps by Traffic Type & Source Clinic

```text
R1(config)# class-map match-all TELEMEDICINE
R1(config-cmap)# match protocol https
R1(config-cmap)# match access-group 101
! ACL 101 identifies telemedicine source ports (192.168.x.100)
R1(config-cmap)# exit

R1(config)# class-map match-all BACKUP
R1(config-cmap)# match protocol https
R1(config-cmap)# match access-group 102
! ACL 102 identifies backup sources (192.168.x.5)
R1(config-cmap)# exit

R1(config)# access-list 101 permit tcp 192.168.0.0 0.0.255.255 host 192.168.0.100 eq 443
R1(config)# access-list 102 permit tcp 192.168.0.0 0.0.255.255 host 192.168.0.5 eq 443
```

### 4.2 Policy-Map with Per-Clinic Fairness Queues

```text
R1(config)# policy-map WAN_FAIRNESS
R1(config-pmap)# class TELEMEDICINE
R1(config-pmap-c)# priority percent 25
! Video gets 500 kbps (25% of 2 Mbps) strict priority for all 5 clinics
R1(config-pmap-c)# set ip dscp ef
R1(config-pmap-c)# exit

R1(config-pmap)# class BACKUP
R1(config-pmap-c)# bandwidth percent 50
! Backups share 1 Mbps (50%), but capped per-clinic (200 kbps each = 1 Mbps for 5)
R1(config-pmap-c)# set ip dscp af21
R1(config-pmap-c)# fair-queue
! Enable fair-queuing among backup streams (no single backup monopolizes)
R1(config-pmap-c)# exit

R1(config-pmap)# class class-default
R1(config-pmap-c)# bandwidth percent 25
! Admin and other traffic gets 500 kbps
R1(config-pmap-c)# exit

R1(config-pmap)# exit
```

### 4.3 Apply Policy to WAN Interface (asymmetric uplink egress)

```text
R1(config)# interface serial 0/0/0
! (Or the actual WAN interface)
R1(config-if)# service-policy output WAN_FAIRNESS
R1(config-if)# exit
R1# write memory
```

### 4.4 Logging for Fairness Audit

```text
R1(config)# logging 10.0.0.3
! Syslog server on hospital network
R1(config)# logging trap informational
R1(config)# ip access-list extended AUDIT_FAIRNESS
R1(config-ext-nacl)# permit tcp any any eq 443 log
! Log all HTTPS flows (telemedicine + backup)
R1(config-ext-nacl)# exit
```

---

## 5. Field-5 Verification Steps

### 5.1 Pre-Load Baseline (No Competition)

```text
[Start one telemedicine call from Clinic-A]
R1# show policy-map interface serial 0/0/0

  Class-map: TELEMEDICINE (match-all)
    12 packets, 15000 bytes
    priority 25%
    Queue: 0 packets (flowing smoothly)
    Bytes transmitted: 15000

(Clinic-A telemedicine consumes ~100 kbps; queue is empty, no starvation)
```

### 5.2 Fairness Under Load (Concurrent Backup + Video)

```text
1. Establish telemedicine call (Clinic-A: 100 kbps) ─ flowing
2. Start backup from Clinic-B (attempting 300 kbps)
3. Measure telemedicine latency on Clinic-A:
   - Expected: <100 ms (fairness guaranteed video)
   - If >300 ms: fairness not working

4. Check policy-map output:
   R1# show policy-map interface serial 0/0/0 output

   Class-map: TELEMEDICINE (match-all)
     120 packets, 150000 bytes
     priority 25%
     Queue: 0 packets
     (Video still flowing smoothly despite Clinic-B backup)

   Class-map: BACKUP (match-all)
     80 packets, 100000 bytes
     bandwidth 50%
     Queue: 2 packets, 3000 bytes
     Fair-queue: Clinic-B limited to ~200 kbps (fair share)

   Class-map: class-default (match-any)
     5 packets, 500 bytes
     bandwidth 25%
     Queue: 0 packets

Proof obligation: PASSED if video queue stays empty (not starved) and backup queue shows active fair-queuing
```

### 5.3 Encryption Verification (Packet Inspection)

```text
[In Simulation Mode, inspect a telemedicine packet]

Telemedicine HTTPS packet:
- IP Header: Source 192.168.1.100 (Clinic-A workstation), Dest 10.0.0.1 (Hospital)
- TCP Header: Dest port 443 (HTTPS)
- Payload: [ENCRYPTED, not readable as cleartext]
- DSCP: EF (0x2E)

(Proof: If payload is readable, encryption is not configured; privacy violation)

Backup HTTPS packet:
- IP Header: Source 192.168.1.5 (Clinic-A backup server), Dest 10.0.0.50 (Backup Server)
- TCP Header: Dest port 443 (HTTPS)
- Payload: [ENCRYPTED]
- DSCP: AF21 (0x12)

(Proof: Backup is also encrypted; bulk traffic doesn't leak sensitive data)
```

### 5.4 Fairness Audit Log

```text
On hospital syslog server (10.0.0.3):

Aug 29 14:05:22 R1: %SEC-6-LOGGING_ENABLED: Logging has been enabled
Aug 29 14:06:10 R1: %ACL-6-ACLLOG_FLOW_SUMMARY: permit tcp 192.168.1.100 -> 10.0.0.1 eq 443 (Clinic-A telemedicine)
Aug 29 14:06:11 R1: %POLICY_MAP-5-CLASS_STATS: class TELEMEDICINE, 12 packets, 15000 bytes, 100 kbps
Aug 29 14:07:00 R1: %ACL-6-ACLLOG_FLOW_SUMMARY: permit tcp 192.168.1.5 -> 10.0.0.50 eq 443 (Clinic-B backup)
Aug 29 14:07:05 R1: %POLICY_MAP-5-CLASS_STATS: class BACKUP, fair-queue active, Clinic-B: 200 kbps (capped per-clinic fairness)

(Audit trail proves video received priority while backup was fairly limited)
```

---

## 6. Expected Output Gallery (Field-5 Scenarios)

**During fairness test, policy-map interface output:**

```text
R1# show policy-map interface serial 0/0/0 output
Serial0/0/0

  Service-policy output: WAN_FAIRNESS

    Class-map: TELEMEDICINE (match-all)
      150 packets, 187500 bytes
      Match: protocol https
      Match: access-group 101
      priority 25%
      Set ip dscp ef
      Queue Stats:
      Packets queued: 0
      Bytes queued: 0
      Queue size: 40/60 packets (0 dropped)
      (Queue depth 0 = no starvation of video)

    Class-map: BACKUP (match-all)
      500 packets, 1000000 bytes
      Match: protocol https
      Match: access-group 102
      bandwidth 50%
      Set ip dscp af21
      Fair-queue: enabled
      Queue Stats:
      Packets queued: 5
      Bytes queued: 7500
      Fair-share buckets: [Clinic-A: 1 pkt] [Clinic-B: 2 pkt] [Clinic-C: 1 pkt] [Clinic-D: 1 pkt]
      (Clinic-B not monopolizing; fair distribution)

    Class-map: class-default (match-any)
      20 packets, 2000 bytes
      bandwidth 25%
      Queue Stats:
      Packets queued: 0
      (Admin traffic flowing, not starved)

Total transmission rate:
  Telemedicine: 100 kbps (video unaffected)
  Backup: 200 kbps per clinic, ~1 Mbps aggregate (fair-queued)
  Admin: 25 kbps (sufficient)
```

---

## 7. Common Field-5 Mistakes

1. **Not using fair-queue on backup class** — one clinic's backup still monopolizes link; fairness not enforced.
2. **Prioritizing backup over telemedicine** — QoS order wrong; video starves when backups are heavy.
3. **No encryption on telemedicine** — video payload in cleartext; privacy violation.
4. **Setting per-clinic cap too low** — clinics cannot perform legitimate backups within their share.
5. **No audit logging** — cannot prove SLA compliance during disputes.

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Symptom: Telemedicine laggy when backup runs**

```text
Step 1: Is telemedicine marked EF (46)?
  Show policy-map | grep -A 5 "TELEMEDICINE"
  → If "Set ip dscp" not present, add it; re-apply policy

Step 2: Is backup assigned to BACKUP class (not TELEMEDICINE)?
  Show access-lists | include "101|102"
  → Verify ACL 102 correctly identifies backup source IP/port

Step 3: Is fair-queue active on BACKUP class?
  Show policy-map | grep -A 3 "class BACKUP"
  → If "fair-queue" not present, one backup monopolizes; enable it

Step 4: What's the queue depth for TELEMEDICINE?
  Show policy-map interface serial 0/0/0 | include "TELEMEDICINE" -A 10
  → If "Packets queued: >2", video is being queued; increase priority percent
```

**Symptom: One clinic's backup maxes out entire link**

```text
Step 1: Is fair-queue enabled on BACKUP class?
  Show policy-map interface serial 0/0/0 | include "fair-queue"
  → If "fair-queue" not shown, fairness is not active

Step 2: Check fair-share buckets per clinic:
  Show policy-map interface serial 0/0/0 | include "Fair-share buckets"
  → If only one clinic listed, that clinic's backup is monopolizing

Step 3: Increase fair-queue bandwidth cap:
  Max bandwidth for one backup = (bandwidth percent × total-link) / num-clinics
  = (50% × 2 Mbps) / 5 = 200 kbps per clinic
  → If a clinic exceeds 200 kbps, traffic police the flow
```

---

## 9. Design Analysis: Field-5 Reasoning

Privacy-preserving healthcare fairness requires:

1. **Encryption:** Telemedicine and backups are both HTTPS-encrypted; eavesdropping on WAN link yields no cleartext clinical data.
2. **Fairness:** Strict priority for video (EF), fair-queued bandwidth for backups (AF21), minimum guarantee for admin (CS1).
3. **Audit:** Syslog records all flows; hospital can prove SLA (telemedicine never starved) even when backups were aggressive.

This topology unblocks P45 expansion: clinics can share a 2 Mbps link without backup affecting clinical care, and privacy is protected in transit.

---

## 10. Real-World Parallel: Haiti P45 Expansion

Five clinics share 2 Mbps link to regional hospital. At 2 PM, all five start nightly backups simultaneously (uncoordinated). Without fairness QoS:
- 5 backups × 300 kbps = 1.5 Mbps, leaving 500 kbps for telemedicine.
- Telemedicine latency jumps to 500 ms; doctors cannot see patient video in real-time.
- Diagnosis delayed; clinical decision-making compromised.

With fairness QoS:
- Backups are fair-queued, each limited to 200 kbps (1 Mbps aggregate).
- Telemedicine gets EF priority (100 kbps per clinic guaranteed).
- Latency stays <100 ms; diagnosis proceeds in real-time.

---

## 11. Stretch Goals: Advanced Field-5 Proof

- Prove formally that fair-queuing prevents single-clinic monopoly under adversarial backup patterns.
- Validate encryption in packet captures (wireshark confirms TLS handshake).
- Stress test: run 5 telemedicine calls + 5 backups simultaneously; measure jitter/loss.

---

## 12. Self-Assessment

```
Target BSL for this lab: 3–4 (Recoverable to Maintainable)
```

---

**Created:** August 30, 2026  
**Field:** Privacy-Preserving Healthcare (Field-5)  
**Status:** Complete — ready for Phase P45 expansion
