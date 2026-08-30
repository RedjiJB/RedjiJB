# Day 48 Field-1 Variant — QoS Offline Resilience & DSCP Persistence

## 0. Metadata

```
Field Focus:         Field 1: Black Start Resilience
Core Proof Obligation: QoS policy (class-map, policy-map, service-policy) persists in NVRAM after power loss; traffic classification and DSCP marking resume automatically; no external manager required.
Haiti Deployment Phase: P38 (pilot phase) — offline mesh network must maintain QoS priority during power events.
Estimated Time:      2–2.5 hours
Difficulty:          Intermediate-Advanced
Relationship to Base Lab: Same QoS classification and DSCP marking logic; added persistent NVRAM storage and post-boot verification.
Prerequisite:        Complete Day-48-Lab-Manual first.
```

---

## 1. Business Context (Field-1 Framing)

During Haiti P38 pilot, the mesh backbone links often lose power simultaneously (grid outages). When routers reboot, their QoS policies must reactivate automatically—otherwise high-priority clinical traffic competes 1:1 with bulk file transfers, and patient care data becomes unintelligible. This lab proves QoS policy survives in startup-config and re-applies without manual re-entry.

---

## 2. Topology Diagram (Field-1 Variant)

```
[FIELD-1: OFFLINE QoS PERSISTENCE]

R1 (Mesh Node A):
├─ startup-config contains:
│  ├─ HTTPS_MAP class-map (match protocol https)
│  ├─ HTTP_MAP class-map (match protocol http)
│  ├─ ICMP_MAP class-map (match protocol icmp)
│  ├─ G0/0/0_OUT policy-map (priority queue for HTTPS, bandwidth for HTTP/ICMP)
│  └─ service-policy output G0/0/0_OUT (attached to G0/0/0)
├─ NVRAM stores exact DSCP values (AF31 for HTTPS, AF32 for HTTP, CS2 for ICMP)
└─ After reboot: QoS policy active within 60 seconds, no manual reconfiguration

[POWER EVENT]
1. Both R1 and R2 lose power simultaneously
2. Reboot in undefined order
3. Each reads startup-config on boot; QoS policy auto-activates
4. Traffic classification and DSCP marking resume immediately
```

---

## 3. IP Addressing Plan (Field-1 Annotations)

Same as base Day-48 (192.168.0.0/24 PC, 10.0.0.0/24 server), with annotation that this topology **must work identically after cold reboot**.

---

## 4. Configuration (Field-1 Optimizations)

### 4.1 Class-Maps (persistent in NVRAM)

```text
R1(config)# class-map match-all HTTPS_MAP
R1(config-cmap)# match protocol https
R1(config-cmap)# exit

R1(config)# class-map match-all HTTP_MAP
R1(config-cmap)# match protocol http
R1(config-cmap)# exit

R1(config)# class-map match-all ICMP_MAP
R1(config-cmap)# match protocol icmp
R1(config-cmap)# exit
```

### 4.2 Policy-Map (persistent in NVRAM)

```text
R1(config)# policy-map G0/0/0_OUT
R1(config-pmap)# class HTTPS_MAP
R1(config-pmap-c)# priority percent 10
R1(config-pmap-c)# set ip dscp af31
R1(config-pmap-c)# exit

R1(config-pmap)# class HTTP_MAP
R1(config-pmap-c)# bandwidth percent 10
R1(config-pmap-c)# set ip dscp af32
R1(config-pmap-c)# exit

R1(config-pmap)# class ICMP_MAP
R1(config-pmap-c)# bandwidth percent 5
R1(config-pmap-c)# set ip dscp cs2
R1(config-pmap-c)# exit

R1(config-pmap)# exit
```

### 4.3 Service-Policy Application (persistent in NVRAM)

```text
R1(config)# interface gigabitEthernet 0/0/0
R1(config-if)# service-policy output G0/0/0_OUT
R1(config-if)# exit
R1# write memory
! CRITICAL: Save to startup-config before power loss simulation
```

**Explanation for Field-1:**
- `write memory` (or `copy running-config startup-config`) persists the entire QoS policy to NVRAM.
- On reboot, the router reads startup-config; class-maps, policy-maps, and service-policy are re-applied automatically.
- No manual re-entry, no external config server required.

---

## 5. Field-1 Verification Steps

### 5.1 Pre-Power-Loss Baseline

```text
R1# show policy-map
Policy Map G0/0/0_OUT
  Class HTTPS_MAP
    priority percent 10
    set ip dscp af31
  Class HTTP_MAP
    bandwidth percent 10
    set ip dscp af32
  Class ICMP_MAP
    bandwidth percent 5
    set ip dscp cs2

R1# show running-config | include "policy-map|class-map|service-policy"
! Verify all three are in running-config
```

### 5.2 Simulate Power Loss

```text
1. Save running-config to startup-config
   R1# write memory
   R2# write memory

2. Power off both R1 and R2 simultaneously

3. Power on both; allow 60 seconds for full boot
```

### 5.3 Post-Boot Verification (Black Start Proof)

```text
[After both devices reboot]

On R1:
R1# show policy-map
! Must show G0/0/0_OUT policy with all three classes

R1# show policy-map interface g0/0/0
! Must show policy attached to interface

R1# show running-config | include "service-policy"
! Must show "service-policy output G0/0/0_OUT" on G0/0/0

R1# show startup-config | include "class-map|policy-map|service-policy"
! Must match running-config exactly (proof that NVRAM was re-applied)
```

### 5.4 Traffic Classification Verification (Proof Obligation)

```text
Generate HTTPS, HTTP, and ICMP traffic (same as base lab);
verify DSCP marking resumes automatically:

R1# show policy-map interface g0/0/0 output

GigabitEthernet0/0/0

  Service-policy output: G0/0/0_OUT

    Class-map: HTTPS_MAP (match-all)
      [Non-zero packet count] packets, [bytes]
      Match: protocol https
      priority 10%
      Set ip dscp af31

    Class-map: HTTP_MAP (match-all)
      [Non-zero packet count] packets, [bytes]
      Match: protocol http
      bandwidth 10%
      Set ip dscp af32

    Class-map: ICMP_MAP (match-all)
      [Non-zero packet count] packets, [bytes]
      Match: protocol icmp
      bandwidth 5%
      Set ip dscp cs2

(Non-zero counters prove classification and marking are working post-boot)
```

---

## 6. Expected Output Gallery (Field-1 Scenarios)

**Immediately after reboot, before any traffic:**

```text
R1# show startup-config | begin "class-map HTTPS_MAP"
class-map match-all HTTPS_MAP
 match protocol https
class-map match-all HTTP_MAP
 match protocol http
class-map match-all ICMP_MAP
 match protocol icmp
policy-map G0/0/0_OUT
 class HTTPS_MAP
  priority percent 10
  set ip dscp af31
 class HTTP_MAP
  bandwidth percent 10
  set ip dscp af32
 class ICMP_MAP
  bandwidth percent 5
  set ip dscp cs2
interface GigabitEthernet0/0/0
 service-policy output G0/0/0_OUT

(All QoS configuration recovered from NVRAM; no re-entry required)
```

---

## 7. Common Field-1 Mistakes

1. **Forgetting `write memory` before power-loss simulation** — running-config is lost; QoS policy disappears.
2. **Assuming interface-level config (`service-policy`) survives without saving** — even if class-maps and policy-maps are in startup-config, the service-policy attachment is lost if not explicitly saved.
3. **Not checking startup-config after reboot** — believing QoS is active without verifying it actually persisted.
4. **Testing with only running-config in memory** — a fake success; real offline resilience requires NVRAM verification.

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Symptom: QoS policy missing after reboot**

```text
Step 1: Is the policy-map definition in startup-config?
  R1# show startup-config | include "policy-map"
  → If no output, policy-map was never saved to NVRAM; use `write memory`

Step 2: Is the service-policy attached in startup-config?
  R1# show startup-config | begin "interface" | include "service-policy"
  → If not present, the attachment was lost; re-add and save

Step 3: Did running-config differ from startup-config before reboot?
  R1# show startup-config | include "policy-map" > /tmp/startup_backup.txt
  R1# show running-config | include "policy-map"
  → If running-config had changes not in startup, those changes were lost on reboot
```

---

## 9. Design Analysis: Field-1 Reasoning

Black Start QoS requires that traffic classification and marking logic **persist in NVRAM unchanged**. This topology proves:

1. **Class-maps stored in NVRAM:** Protocol matching rules (HTTPS, HTTP, ICMP) are re-applied on boot.
2. **Policy-maps stored in NVRAM:** Queue assignments and DSCP marking are re-applied on boot.
3. **Service-policies stored in NVRAM:** Policy attachment to the egress interface is re-applied on boot.

The lab demonstrates that QoS is **not** a runtime-only feature dependent on external managers—it can operate autonomously offline, essential for mesh backhaul resilience during island-wide power events.

---

## 10. Real-World Parallel: Haiti P38 Mesh

A remote clinic's mesh backbone router (R1) links to three neighboring clinics (R2, R3, R4). Grid power fails for 8 hours. All routers reboot simultaneously (power restoration is not coordinated). For patients to receive continuous telemedicine:

- Clinical video (HTTPS, marked AF31) must regain priority immediately.
- Administrative bulk backups (HTTP, marked AF32) must reacquire their capped bandwidth without starving video.
- Monitoring pings (ICMP, marked CS2) must resume with guaranteed 5%.

This variant proves all three resume automatically, with zero IT intervention.

---

## 11. Stretch Goals: Advanced Field-1 Proof

- Formal model check: Prove that startup-config, once written, cannot become inconsistent with running-config through any reboot sequence.
- Stress test: Reboot the topology 50 times in rapid succession; verify QoS policy remains unchanged after each reboot.

---

## 12. Self-Assessment

```
Target BSL for this lab: 3–4 (Recoverable to Maintainable)
```

---

**Created:** August 30, 2026  
**Field:** Black Start Resilience (Field-1)  
**Status:** Complete — ready for Phase P38 pilot
