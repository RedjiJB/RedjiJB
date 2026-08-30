# Day 20 Field-3 Lab — Full-Mesh EtherChannel with Byzantine Link Simulation

---

## 0. Metadata

| Field | Value |
|---|---|
| **Field Focus** | Field 3: DePIN — Distributed Mesh Link Aggregation |
| **Core Proof Obligation** | Full mesh EtherChannel (every switch bundled to every other) must tolerate one Byzantine link (randomly drops 10% of packets); mesh must detect the faulty link and exclude it from the bundle without operator intervention. |
| **Haiti Deployment Phase** | P38 pilot (resilient mesh link aggregation, Byzantine link detection) |
| **Estimated Time** | 2.5 – 4 hours (first attempt); 1.5 hours on repeat |
| **Difficulty** | Advanced (mesh aggregation with Byzantine link detection) |
| **Relationship to Base Lab** | Base lab (Day-20) uses trunking and ROAS with a single uplink. This variant adds full-mesh EtherChannel: every switch is bundled to every other switch, with multiple redundant paths. A Byzantine link (one physical member) silently drops packets without signaling failure, testing the mesh's ability to detect and degrade gracefully. |
| **Prerequisite** | Day-20-Lab-Manual.md; familiarity with EtherChannel, LACP monitoring. |

---

## 1. Business Context (Field-3 Framing)

**Traditional EtherChannel design:** Admin configures identical member ports on both ends; LACP automatically detects failures (link down). Works fine for homogeneous, well-maintained network infrastructure.

**Field-3 (DePIN) scenario:** Haiti's mesh consists of operator-managed links across varying RF links, fiber, and copper. One link might have intermittent packet loss (Byzantine fault: not completely down, but dropping traffic). The mesh must:
1. Detect this Byzantine link via active probing (traffic loss, not just link state).
2. Remove it from the bundle automatically.
3. Re-route traffic through remaining healthy members.
4. All without manual intervention or centralized monitoring.

This lab proves that a full-mesh EtherChannel network can tolerate Byzantine links via distributed detection, unblocking P38 deployment of truly resilient mesh infrastructure.

---

## 2. Topology Diagram (Field-3 Modifications)

**BASE LAB (two switches, single uplink):**
```
SW1 ===trunk=== SW2
```

**FIELD-3 VARIANT (three switches, full mesh EtherChannel, Byzantine link detection):**
```
         ┌─── SW1 ───┐
        /              \
      SW2 ════════════ SW3

Full mesh: every switch is bundled to every other:
  SW1 ↔ SW2: EtherChannel (Port-Channel 12)
             2–3 physical members (Gi0/0, Gi0/1)
  SW1 ↔ SW3: EtherChannel (Port-Channel 13)
             2–3 physical members (Gi0/2, Gi0/3)
  SW2 ↔ SW3: EtherChannel (Port-Channel 23)
             2–3 physical members (Gi0/4, Gi0/5)

Byzantine scenario:
  - One physical link (e.g., SW1-Gi0/1 ↔ SW2-Gi0/1) is Byzantine
  - LACP reports it UP (no link-state failure)
  - But the physical layer silently drops 10% of traffic (hidden fault)
  - LACP neighbor adjacency is maintained (LACP packets themselves are not dropped)
  - User traffic silently fails until the mesh detects the Byzantine link
  - Detection: active probing (ping/keepalive) on each bundle member
  - Action: member is flagged and excluded from the bundle
  - Recovery: traffic re-routes through remaining healthy members
```

---

## 3. IP Addressing Plan (Field-3 Annotations)

Simplified (focus on mesh links, not VLANs):

| Link | Port-Channel | Members | Purpose |
|---|---|---|---|
| SW1 ↔ SW2 | Po12 | Gi0/0, Gi0/1 (Gi0/1=Byzantine) | Mesh backbone |
| SW1 ↔ SW3 | Po13 | Gi0/2, Gi0/3 | Mesh backbone |
| SW2 ↔ SW3 | Po23 | Gi0/4, Gi0/5 | Mesh backbone |

Management VLAN for Byzantine link detection:
| Interface | IP | Purpose |
|---|---|---|
| SW1 VLAN99 | 10.99.0.1/24 | Consensus/monitoring |
| SW2 VLAN99 | 10.99.0.2/24 | Consensus/monitoring |
| SW3 VLAN99 | 10.99.0.3/24 | Consensus/monitoring |

---

## 4. Configuration (Field-3 Optimizations)

### 4.1 — SW1 Configuration (Mesh Node, LACP)

```text
Switch>enable
Switch#configure terminal
Switch(config)#hostname SW1

! Management VLAN for Byzantine detection probes
Switch(config)#vlan 99
Switch(config-vlan)#name Management
Switch(config-vlan)#exit
Switch(config)#interface vlan 99
Switch(config-if)#ip address 10.99.0.1 255.255.255.0
Switch(config-if)#no shutdown
Switch(config-if)#exit

! EtherChannel to SW2 (Po12): Gi0/0, Gi0/1 (Gi0/1 will be Byzantine)
Switch(config)#interface range gigabitEthernet 0/0 - 1
Switch(config-if-range)#channel-group 12 mode active
! "mode active" = LACP active (negotiates automatically with peer)
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

Switch(config)#interface port-channel 12
Switch(config-if)#description EtherChannel to SW2
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 1,99
Switch(config-if)#no shutdown
Switch(config-if)#exit

! EtherChannel to SW3 (Po13): Gi0/2, Gi0/3
Switch(config)#interface range gigabitEthernet 0/2 - 3
Switch(config-if-range)#channel-group 13 mode active
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

Switch(config)#interface port-channel 13
Switch(config-if)#description EtherChannel to SW3
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 1,99
Switch(config-if)#no shutdown
Switch(config-if)#exit

! Enable Byzantine link detection: ping each Po member every 5 seconds
Switch(config)#ip sla 1
Switch(config-ip-sla)#icmp-echo 10.99.0.2 source-ip 10.99.0.1
! Probe: SW1 → SW2 via management VLAN (traverses Po12)
Switch(config-ip-sla)#frequency 5
Switch(config-ip-sla)#exit

Switch(config)#ip sla schedule 1 life forever start-time now

! (Repeat for SW3 probes, etc.)

Switch(config)#exit
Switch#copy running-config startup-config
```

### 4.2 — SW2 Configuration (Mesh Node, LACP)

```text
Switch>enable
Switch#configure terminal
Switch(config)#hostname SW2

Switch(config)#vlan 99
Switch(config-vlan)#name Management
Switch(config-vlan)#exit
Switch(config)#interface vlan 99
Switch(config-if)#ip address 10.99.0.2 255.255.255.0
Switch(config-if)#no shutdown
Switch(config-if)#exit

! EtherChannel to SW1 (Po12, must match SW1's config)
Switch(config)#interface range gigabitEthernet 0/0 - 1
Switch(config-if-range)#channel-group 12 mode active
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

Switch(config)#interface port-channel 12
Switch(config-if)#description EtherChannel to SW1
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 1,99
Switch(config-if)#no shutdown
Switch(config-if)#exit

! EtherChannel to SW3 (Po23)
Switch(config)#interface range gigabitEthernet 0/4 - 5
Switch(config-if-range)#channel-group 23 mode active
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

Switch(config)#interface port-channel 23
Switch(config-if)#description EtherChannel to SW3
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 1,99
Switch(config-if)#no shutdown
Switch(config-if)#exit

! Byzantine link detection: probe SW1 and SW3
Switch(config)#ip sla 1
Switch(config-ip-sla)#icmp-echo 10.99.0.1 source-ip 10.99.0.2
Switch(config-ip-sla)#frequency 5
Switch(config-ip-sla)#exit

Switch(config)#ip sla schedule 1 life forever start-time now

Switch(config)#exit
Switch#copy running-config startup-config
```

### 4.3 — SW3 Configuration (Mesh Node, LACP)

```text
Switch>enable
Switch#configure terminal
Switch(config)#hostname SW3

Switch(config)#vlan 99
Switch(config-vlan)#name Management
Switch(config-vlan)#exit
Switch(config)#interface vlan 99
Switch(config-if)#ip address 10.99.0.3 255.255.255.0
Switch(config-if)#no shutdown
Switch(config-if)#exit

! EtherChannel to SW1 (Po13)
Switch(config)#interface range gigabitEthernet 0/2 - 3
Switch(config-if-range)#channel-group 13 mode active
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

Switch(config)#interface port-channel 13
Switch(config-if)#description EtherChannel to SW1
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 1,99
Switch(config-if)#no shutdown
Switch(config-if)#exit

! EtherChannel to SW2 (Po23)
Switch(config)#interface range gigabitEthernet 0/4 - 5
Switch(config-if-range)#channel-group 23 mode active
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

Switch(config)#interface port-channel 23
Switch(config-if)#description EtherChannel to SW2
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 1,99
Switch(config-if)#no shutdown
Switch(config-if)#exit

! Byzantine link detection probes
Switch(config)#ip sla 1
Switch(config-ip-sla)#icmp-echo 10.99.0.1 source-ip 10.99.0.3
Switch(config-ip-sla)#frequency 5
Switch(config-ip-sla)#exit

Switch(config)#ip sla schedule 1 life forever start-time now

Switch(config)#exit
Switch#copy running-config startup-config
```

### 4.4 — Simulate Byzantine Link (GNS3 or Physical)

```text
[GNS3 Method] Configure one physical link to drop packets:
  On the link SW1-Gi0/1 ↔ SW2-Gi0/1, add a filter:
  - Drop 10% of traffic randomly (simulate Byzantine behavior)
  - Keep LACP packets (so link stays "up" in LACP state)
  
[Physical Method] Use a problematic cable or introduce packet loss:
  - A cable with intermittent contact drops traffic silently
  - No "link down" alert; LACP continues to see the link as active
  - Byzantine: the link is alive (LACP works) but data is corrupted
```

---

## 5. Field-3 Verification Steps (Byzantine Link Detection Focus)

### 5.1 — Phase 1: Baseline Mesh Connectivity (Pre-Byzantine Injection)

1. Verify all three EtherChannels are up in LACP mode:
   ```
   SW1# show etherchannel summary
   Expected: Po12 (2 members active), Po13 (2 members active)
   ```

2. Verify management VLAN connectivity (baseline for probes):
   ```
   SW1# ping 10.99.0.2 (SW2)
   SW1# ping 10.99.0.3 (SW3)
   Expected: all ping replies
   ```

3. Verify SLA probes are running and showing success:
   ```
   SW1# show ip sla operation stats | include operational
   Expected: "Operational State: active" for all SLA entries
   ```

### 5.2 — Phase 2: Inject Byzantine Link (Packet Loss on One Member)

4. **Introduce packet loss on SW1-Gi0/1 ↔ SW2-Gi0/1**:
   ```
   [GNS3] Right-click link → Duplicate dropped packets: 10%
   [Physical] Replace cable with a bad one, or use tc (traffic control):
     # tc qdisc add dev eth1 root netem loss 10%
   ```
   **Proof obligation:** One link member now drops 10% of traffic while LACP still sees it as up.

### 5.3 — Phase 3: Detect Byzantine Fault (Via SLA Probe)

5. **Monitor SLA probe results**: Within 10–30 seconds, probe on the Byzantine link should start failing:
   ```
   SW1# show ip sla operation stats | include "Round-trip time"
   (probe to SW2 via Po12 now shows packet loss or high latency)
   ```
   **Proof obligation:** Distributed probing detects the Byzantine link before application users report problems.

6. **Verify LACP neighbor still reports link UP** (confirming Byzantine nature):
   ```
   SW1# show etherchannel detail | include Gi0/1
   Expected: "Gi0/1 is up (bundle)" — LACP layer doesn't detect the Byzantine link drop
   ```

### 5.4 — Phase 4: Automatic Member Exclusion (Recovery)

7. **Verify the faulty member is excluded** from the bundle:
   ```
   SW1# show etherchannel summary
   Expected: Po12: Gi0/0(P) Gi0/1(S)
   (Gi0/1 is now (S) = suspended, not (P) = bundled)
   ```
   **Proof obligation:** Mesh automatically downgraded the Byzantine link; traffic now uses Gi0/0 only.

8. **Verify end-to-end connectivity is restored** (traffic now routes via healthy link):
   ```
   (User traffic should flow without packet loss via Gi0/0)
   (Bandwidth reduced because one link is excluded, but no data loss)
   ```

---

## 6. Expected Output Gallery (Field-3 Scenarios)

### 6.1 — Pre-Byzantine Mesh State

```
SW1# show etherchannel summary

Group  Port-channel  Protocol    Ports
-----  -----------  ----------  --------
12     Po12         LACP        Gi0/0(P)   Gi0/1(P)
13     Po13         LACP        Gi0/2(P)   Gi0/3(P)

(Both links healthy, both members active)
```

### 6.2 — SLA Probe Success (Pre-Byzantine)

```
SW1# show ip sla operation stats | include "1 - ICMP Echo"

RTT Values
Latest Rtt: 2 msec
Average Rtt: 2 msec
Minimum Rtt: 1 msec
Maximum Rtt: 5 msec

Packet Lost Values
Packets Lost: 0

(100% probe success; link is healthy)
```

### 6.3 — Post-Byzantine Injection (SLA Probing Detects)

```
SW1# show ip sla operation stats | include "1 - ICMP Echo"

RTT Values
Latest Rtt: 25 msec (significantly higher due to retransmits)
Average Rtt: 15 msec
Minimum Rtt: 10 msec
Maximum Rtt: 50 msec

Packet Lost Values
Packets Lost: 10%

(Probe detects 10% packet loss; Byzantine link confirmed)
```

### 6.4 — Post-Byzantine Detection (Member Excluded)

```
SW1# show etherchannel summary

Group  Port-channel  Protocol    Ports
-----  -----------  ----------  --------
12     Po12         LACP        Gi0/0(P)   Gi0/1(S)
13     Po13         LACP        Gi0/2(P)   Gi0/3(P)

(Gi0/1 now (S) = suspended; no longer active in the bundle)
```

---

## 7. Common Field-3 Mistakes

1. **Using static EtherChannel (`mode on`) instead of LACP** — Field-3 requires active link monitoring; static mode can't detect Byzantine links (no active probing). LACP + IP SLA is the combination needed.

2. **Not configuring Byzantine link detection probes** — without SLA or similar active monitoring, Byzantine links stay silent (LACP sees them up, but they drop traffic).

3. **Expecting LACP alone to detect Byzantine faults** — LACP only detects link-state changes (up/down), not silent packet loss. Must add application-level probing (ping, TCP keepalive, etc.).

4. **Misconfiguring SLA probe source/destination IP** — probes must traverse the bundle (use management VLAN on the bundle ports) to actually test the link's data-plane behavior.

5. **Misunderstanding "suspended" state** — a suspended link is excluded from the bundle but not broken. If Byzantine fault clears (packet loss stops), LACP can re-activate the link. This is recovery, not permanent removal.

---

## 8. Troubleshooting by Field (Byzantine Link Diagnosis)

**Problem: SLA probes are showing 100% success, but user traffic is dropping packets on Po12.**

```
Step 1: Verify SLA probes actually traverse the bundle:
  SW1# show ip sla operation config 1
  → Confirm the probe's source/destination are on the management VLAN (which runs on the trunks).
  → If the probe uses a different path (e.g., dedicated management network), it won't detect data-plane Byzantine faults.

Step 2: Check if the Byzantine link is affecting a specific traffic class:
  SW1# show etherchannel load-balance | include distribution
  → Some traffic (e.g., certain VLAN tags) might hash to Gi0/1 preferentially.
  → If Gi0/1 is Byzantine and a specific VLAN always uses it, that VLAN's traffic is lost.

Step 3: Test with actual data traffic, not just probes:
  (Send FTP or HTTP transfer across the bundle; measure bandwidth loss)
  → If actual traffic is lost but probes succeed, the probe packet size/rate is insufficient to trigger the Byzantine fault.
```

**Problem: Gi0/1 is suspended, but LACP still shows it as a member of the bundle.**

```
Step 1: Check the "Ports" line in "show etherchannel summary":
  → If Gi0/1 shows (P) = bundled, or (D) = down, that's the issue.
  → If it shows (S) = suspended, it's correctly excluded.

Step 2: Verify the reason for suspension:
  SW1# show etherchannel detail | grep -A 5 "Gi0/1"
  → Should show "Port state: (S) - Suspended" and a reason (link failure, LACP timeout, etc.)

Step 3: If Gi0/1 is still (P) and you expect it suspended:
  → The Byzantine fault might not be severe enough to trigger LACP timeout.
  → Reduce LACP dead timer to detect faster:
  SW1(config)#interface gigabitEthernet 0/1
  SW1(config-if)#lacp rate fast
  (Reduces dead interval from 90s to 3s)
```

---

## 9. Design Analysis (Field-3 Reasoning)

**Why full mesh (every switch to every other)?**

A full mesh provides multiple redundant paths. If SW1↔SW2 has a Byzantine link, traffic can still route via SW1→SW3→SW2. A star topology (all spokes to a hub) has no such fallback; a Byzantine hub is fatal.

**Why LACP + SLA (not just LACP)?**

LACP detects **link-state failures** (cable pulled, port shut down). Byzantine links are **data-plane failures** (link stays "up" but drops traffic). Only active probing (SLA) detects Byzantine faults. Combining both gives you resilience to both failure modes.

**Why is this operationally important for Haiti?**

Haiti's mesh links span varying physical media (fiber, RF, copper) and operator maintenance levels. Link failures range from obvious (cable cut) to subtle (weather-induced RF interference, oxidized connectors dropping packets silently). Full-mesh topology with Byzantine detection ensures the mesh is resilient to both obvious and subtle failures, proving true decentralized resilience.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**Haiti Deployment Phase:** P38 pilot (mesh-connectivity module)
**Module:** redundant link aggregation (resilient hotspot interconnects)

**Linkage:** Each P38 hotspot has 2–3 fiber/RF links to its neighbors for redundancy. One link might have high packet loss (hidden Byzantine fault) due to weather, water damage, or poor alignment. This lab proves that:
1. The mesh can tolerate Byzantine links (not complete link failure, but data corruption).
2. Byzantine links are detected automatically (no manual troubleshooting).
3. Traffic re-routes through healthy links (no user-visible outage).

This directly unblocks P38 because resilient mesh-connectivity is a validation gate for PoC module go-live.

---

## 11. Stretch Goals

1. **Add a second Byzantine link:** Introduce packet loss on another member (e.g., SW2-Gi0/5 in Po23). Can the mesh isolate both? What's the limit (quorum of healthy links)?

2. **Measure convergence time:** Time from Byzantine link injection to "member suspended." Goal: < 20 seconds (for P38 real-time resilience).

3. **Test Byzantine recovery:** After a faulty link is fixed (packet loss stops), verify LACP re-activates it. This proves resilience, not permanent punishment.

4. **Cross-layer Byzantine detection:** Combine Layer 2 (LACP) + Layer 3 (IP SLA) + application-level (TCP keepalive) probing to detect and isolate Byzantine links faster.

---

## 12. Self-Assessment (Field-3 BSL)

```
BSL-0 AWARENESS      - Byzantine link detection is a concept.
BSL-1 LAB CAPABLE    - Configured mesh EtherChannels, injected Byzantine link, verified detection.
BSL-2 OFFLINE        - Could repeat without manual; know static config + SLA probing.
BSL-3 RECOVERABLE    - Could rebuild: mesh topology, LACP config, SLA probes for Byzantine detection.
BSL-4 MAINTAINABLE   - Could explain to a field tech why mesh-with-detection is needed in Haiti's RF/fiber environment.
BSL-5 TEACHABLE      - Could teach the full design: why mesh (redundancy), why LACP (link state),
                       why SLA (Byzantine detection), why all three together (resilience).

Target BSL for this lab: BSL-3 (recoverable) — distributed Byzantine link detection is research-level.
```

---

## 13. Key Concepts Demonstrated

**Key Concepts:** Full-mesh EtherChannel, LACP + active probing, Byzantine link detection, automatic link exclusion, graceful degradation.

**What I Learned:** Combining LACP (link-state detection) with active probing (data-plane detection) gives resilience to both obvious and hidden failures. A Byzantine link is dangerous precisely because it stays "up" from the control plane's perspective — only active probing detects the deception. Mesh topology provides redundancy that star topology lacks.

**Skills Practiced:** Full-mesh EtherChannel design, IP SLA configuration, Byzantine link injection/detection, troubleshooting multi-layer failures.

