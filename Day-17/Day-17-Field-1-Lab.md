# Day 17 Field-1 Lab — EtherChannel Offline Persistence and Cold-Start Recovery

---

## 0. Metadata

| Field | Value |
|---|---|
| **Field Focus** | Field 1: Black Start Systems — Offline Persistence |
| **Core Proof Obligation** | EtherChannel configuration must persist through power loss; after cold start, bundle recovers without external configuration push or manual intervention. |
| **Haiti Deployment Phase** | P38 pilot (resilient link bundling, UPS-based recovery) |
| **Estimated Time** | 2 – 3 hours (first attempt); 45 minutes on repeat |
| **Difficulty** | Advanced (offline resilience, cold-start recovery) |
| **Relationship to Base Lab** | Base lab (Day-17) uses trunking and ROAS. This variant adds EtherChannel (link bundling) with Field-1 proof obligation: configuration must survive power loss and be recoverable from local NVRAM (startup-config) without requiring external state synchronization or manual reapplication. |
| **Prerequisite** | Day-17-Lab-Manual.md; familiarity with EtherChannel (LACP, static aggregation). |

---

## 1. Business Context (Field-1 Framing)

**Traditional EtherChannel design:** Configuration is stored in NVRAM (startup-config); after power loss and cold start, the device reads NVRAM, re-applies the EtherChannel config, and negotiates with peers via LACP. Works fine in networked data centers where NVRAM is reliable and power is stable.

**Field-1 (Black Start) scenario:** Haiti's hotspots often experience power instability — brownouts, scheduled outages, fuel generator runtime limits. A switch loses power, recovery is via UPS + local generator, no network connectivity during startup. The switch must boot, read its startup-config, recognize its EtherChannel membership, and bring the bundle up **without requiring external communication** (no LACP peer handshake, no management system confirmation). PCs on the link must regain connectivity immediately after power restores, with zero manual intervention.

This lab proves that EtherChannel can be configured for offline-recovery mode (static aggregation without LACP dependency), validating the Black Start layer for link resilience.

---

## 2. Topology Diagram (Field-1 Modifications)

**BASE LAB (two switches, trunking):**
```
SW1 ===trunk=== SW2
```

**FIELD-1 VARIANT (two switches, static EtherChannel, offline persistence):**
```
SW1 ===EtherChannel Port-Channel 1=== SW2
       (2–4 physical links bundled statically)
       (no LACP negotiation; PAgP disabled)
       (configuration in NVRAM; survives power loss)

Each physical link (Gi0/0, Gi0/1, Gi0/2, etc.) is a member of the bundle.
Link Aggregation Control Protocol (LACP) is DISABLED → no peer discovery required.
PAgP (Port Aggregation Protocol) is DISABLED → no dynamic negotiation required.
Static mode: switch applies config from NVRAM, no peers need to acknowledge.

Power loss scenario:
  1. Lose power (immediate shutdown, no graceful shutdown)
  2. UPS keeps switch online briefly, or total power loss then recovery
  3. Switch boots from NVRAM, reapplies EtherChannel config
  4. Physical links come up
  5. EtherChannel bundle activates (no LACP, so no negotiation delay)
  6. Connectivity restored
```

---

## 3. IP Addressing Plan (Field-1 Annotations)

Same as base Day-17 (VLANs 10/20/30 on trunks), but added:

| Component | Address/VLAN | Purpose |
|---|---|---|
| SW1 Gi0/0, Gi0/1 (physical links) | (port-channel members) | Bundle into Port-Channel 1 |
| SW2 Gi0/0, Gi0/1 (physical links) | (port-channel members) | Bundle into Port-Channel 1 |
| Port-Channel 1 (SW1 side) | Trunk, VLAN 10/20/30 | Logical uplink (carries all VLANs) |
| Port-Channel 1 (SW2 side) | Trunk, VLAN 10/20/30 | Logical downlink (carries all VLANs) |

**Annotated:** Physical links are stateless members (no IP); the logical Port-Channel interface carries all traffic. NVRAM stores: (a) which ports are in the bundle, (b) that LACP is disabled, (c) that the bundle is a trunk. This entire config persists across power loss.

---

## 4. Configuration (Field-1 Optimizations)

### 4.1 — SW1 Configuration (Static EtherChannel, NVRAM Persistence)

```text
Switch>enable
Switch#configure terminal
Switch(config)#hostname SW1

! Create VLAN database for trunking (same as base lab)
Switch(config)#vlan 10
Switch(config-vlan)#name Engineering
Switch(config-vlan)#exit
Switch(config)#vlan 20
Switch(config-vlan)#name Sales
Switch(config-vlan)#exit
Switch(config)#vlan 30
Switch(config-vlan)#name HR
Switch(config-vlan)#exit

! Disable LACP and PAgP: static (passive) aggregation mode
Switch(config)#interface range gigabitEthernet 0/0 - 1
Switch(config-if-range)#channel-group 1 mode on
! "mode on" = static aggregation (no LACP, no PAgP negotiation)
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

! Configure the logical Port-Channel interface as trunk
Switch(config)#interface port-channel 1
Switch(config-if)#switchport trunk encapsulation dot1q
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 10,20,30
Switch(config-if)#no shutdown
Switch(config-if)#exit

! Enable startup-config persistence for cold-start recovery
Switch(config)#no service config
! ("no service config" prevents external TFTP config downloads; startup-config only)
Switch(config)#exit
Switch#copy running-config startup-config
! Verify in NVRAM
Switch#show startup-config | include channel-group
! Expected output: "channel-group 1 mode on" appears in startup-config
```

**Explanation:** Static EtherChannel (`mode on`) requires NO peer negotiation — the switch applies the config from NVRAM and the bundle activates immediately. LACP and PAgP are both disabled, so no external communication is needed. After power loss, the switch boots, reads startup-config, recreates Port-Channel 1 with the same members, and the bundle is ready for traffic — all without touching the network or management system.

### 4.2 — SW2 Configuration (Matching Static EtherChannel)

```text
Switch>enable
Switch#configure terminal
Switch(config)#hostname SW2

Switch(config)#vlan 10
Switch(config-vlan)#name Engineering
Switch(config-vlan)#exit
Switch(config)#vlan 20
Switch(config-vlan)#name Sales
Switch(config-vlan)#exit
Switch(config)#vlan 30
Switch(config-vlan)#name HR
Switch(config-vlan)#exit

! Static aggregation: MUST match SW1's config exactly
Switch(config)#interface range gigabitEthernet 0/0 - 1
Switch(config-if-range)#channel-group 1 mode on
Switch(config-if-range)#no shutdown
Switch(config-if-range)#exit

! Port-Channel interface (must match SW1)
Switch(config)#interface port-channel 1
Switch(config-if)#switchport trunk encapsulation dot1q
Switch(config-if)#switchport mode trunk
Switch(config-if)#switchport trunk allowed vlan 10,20,30
Switch(config-if)#no shutdown
Switch(config-if)#exit

Switch(config)#no service config
Switch(config)#exit
Switch#copy running-config startup-config
```

---

## 5. Field-1 Verification Steps (Offline Persistence Focus)

### 5.1 — Phase 1: Verify Initial Bundle Formation (Pre-Power-Loss)

1. Confirm Port-Channel is active:
   ```
   SW1# show etherchannel summary
   Expected output:
     Group  Port-channel  Protocol    Ports
     1      Po1           NONE        Gi0/0(Su)   Gi0/1(Su)
                                      (NONE protocol = static mode, no LACP)
   ```
   **Proof obligation:** EtherChannel bundle is active in static mode.

2. Verify Port-Channel is a trunk carrying the right VLANs:
   ```
   SW1# show interfaces port-channel 1 switchport | grep allowed
   Expected: Vlans allowed on trunk: 10,20,30
   ```

3. Test connectivity across the bundle (baseline, before power loss):
   ```
   (Traffic should flow across the bundle; all test pings should succeed)
   ```

### 5.2 — Phase 2: Simulate Power Loss

4. **Shut down power to SW1** (simulate power loss):
   ```
   (In Packet Tracer: right-click device → Power Off)
   (In physical lab: unplug power, wait 10 seconds)
   ```
   **Proof obligation:** System has no graceful shutdown opportunity; config must survive sudden power loss from NVRAM.

5. Wait for all lights to go dark and startup sequence to complete (30–60 seconds).

### 5.3 — Phase 3: Verify Cold-Start Recovery (No External Config Push)

6. **Verify Port-Channel is back online** after cold start:
   ```
   SW1# show etherchannel summary
   Expected output: Group 1, Po1, NONE protocol, Gi0/0(Su) Gi0/1(Su)
   (Same output as before power loss — configuration recovered from NVRAM)
   ```
   **Proof obligation:** EtherChannel bundle recovers without manual reconfiguration or external config push.

7. **Verify trunk configuration persisted:**
   ```
   SW1# show interfaces port-channel 1 switchport | grep allowed
   Expected: Vlans allowed on trunk: 10,20,30
   ```

8. **Verify startup-config matches running-config** (proof that NVRAM was the source):
   ```
   SW1# show startup-config | include "channel-group 1 mode on"
   Expected: "channel-group 1 mode on" appears
   SW1# show running-config | include "channel-group 1 mode on"
   Expected: "channel-group 1 mode on" appears
   (Both should show identical output, proving config persisted from NVRAM)
   ```

### 5.4 — Phase 4: Connectivity Verification (End-to-End)

9. **Connectivity is restored** without manual intervention:
   ```
   (PCs should regain network access immediately after SW1 boots)
   (No manual reconfiguration, no management system pushes, no LACP negotiation)
   ```
   **Proof obligation:** System is "Black Start ready" — it recovers autonomously from power loss via local NVRAM configuration only.

---

## 6. Expected Output Gallery (Field-1 Scenarios)

### 6.1 — Pre-Power-Loss State

```
SW1# show etherchannel summary

Flags:  D - down        P - bundled in port-channel
        I - stand-alone s - suspended
        H - Hot-standby (LACP)
        R - Layer3      S - Layer2
        U - in use      f - failed to allocate aggregator

Number of channel-groups in use: 1
Number of aggregators:           1

Group  Port-channel  Protocol    Ports
-----  -----------  ----------  --------
1      Po1          NONE        Gi0/0(P)   Gi0/1(P)

(NONE protocol = static, no LACP handshake required)
```

### 6.2 — Post-Power-Loss Cold-Start State (Identical to Pre-Loss)

```
SW1# show etherchannel summary

(Same output as above — configuration recovered from NVRAM, no re-configuration needed)
```

### 6.3 — Proof That Config Came from NVRAM

```
SW1# show startup-config | section "interface range"
interface range gigabitEthernet 0/0 - 1
 channel-group 1 mode on
 no shutdown

SW1# show running-config | section "interface range"
interface range gigabitEthernet 0/0 - 1
 channel-group 1 mode on
 no shutdown

(Both outputs are identical, proving running-config was loaded from startup-config, not pushed externally)
```

---

## 7. Common Field-1 Mistakes

1. **Using LACP (`mode active` or `mode passive`)** — LACP requires peer negotiation, which won't work if the peer is also booting (chicken-and-egg problem during cold start). Static mode (`mode on`) avoids this.

2. **Forgetting `copy running-config startup-config`** — without saving, the EtherChannel config only lives in RAM and is lost on power loss.

3. **Enabling `service config` or TFTP config download** — if the switch tries to fetch config from external source on bootup and that source is unavailable (offline scenario), startup-config is bypassed and cold-start fails.

4. **Assuming cold-start automatically implies recovery** — the switch will boot, but if startup-config wasn't saved, it boots to factory defaults (no EtherChannel, no trunks, no VLANs). Proof obligation is that it recovers to the *intended* state (with EtherChannel), not just any state.

5. **Testing only on a warm reboot** (graceful shutdown) — power loss is sudden and unforgiving. Warm reboots allow graceful shutdown and may succeed even with bugs that break cold-start. The lab intentionally tests cold-start to force the NVRAM persistence issue.

---

## 8. Troubleshooting by Field (Offline Resilience Diagnosis)

**Problem: After power loss and cold start, EtherChannel doesn't come back up.**

```
Step 1: Check if the physical member ports came up:
  SW1# show interfaces gigabitEthernet 0/0 status
  → If status is "down/down" after cold start, physical links may be broken or not cabled correctly.
  → If status is "up/up", proceed to Step 2.

Step 2: Check if the Port-Channel interface exists in running-config:
  SW1# show running-config | include "channel-group"
  → If "channel-group 1 mode on" appears, the channel group was created.
  → If it's absent, startup-config wasn't applied; likely due to service config or external TFTP override.

Step 3: Verify startup-config has the channel-group configuration:
  SW1# show startup-config | include "channel-group"
  → If absent here, configuration was never saved. Run "copy running-config startup-config" while the switch is online.

Step 4: If startup-config has the config but running-config doesn't, the config wasn't loaded on boot:
  → Disable service config (config auto-load from network) and reboot:
  SW1(config)#no service config
  SW1(config)#exit
  SW1#reload
```

**Problem: After power loss, Port-Channel is up but VLAN membership is missing.**

```
Step 1: Check the trunk configuration on Port-Channel 1:
  SW1# show interfaces port-channel 1 switchport | grep allowed
  → Should show "Vlans allowed on trunk: 10,20,30"
  → If it shows different VLANs or none, the trunk config wasn't persisted.

Step 2: Verify startup-config has the trunk configuration:
  SW1# show startup-config | section "interface port-channel 1"
  → If missing "switchport mode trunk" or "switchport trunk allowed vlan 10,20,30", re-save:
  SW1#copy running-config startup-config

Step 3: If startup-config is correct but running-config shows different VLAN list:
  → Reboot with "reload" command to force a full startup-config load.
```

---

## 9. Design Analysis (Field-1 Reasoning)

**Why static EtherChannel (mode on) instead of LACP?**

LACP requires peer negotiation every time the link comes up. During a cold-start sequence, both switches are booting in parallel. If SW1 finishes first and brings up LACP on Port-Channel 1, but SW2 is still booting, SW1 is left waiting for SW2's LACP handshake, delaying bundle formation. Static mode bypasses this: both switches independently apply their startup-config (channel-group 1 mode on), and as soon as their physical links are both up, the bundle activates — no negotiation, no wait, no external dependency.

**Why disable service config?**

Service config allows a switch to fetch its running config from a TFTP server on startup. In a cold-start / power-loss scenario, that TFTP server may not be reachable (network infrastructure may still be booting, or the organization has no TFTP server). By disabling service config and relying solely on startup-config, the switch guarantees it can boot and establish the EtherChannel entirely from local NVRAM.

**Why is this operationally important for Haiti?**

Hotspots in Haiti often operate on diesel generators during utility outages. When power returns or fuel runs out and is refilled, routers and switches reboot rapidly but likely without external network infrastructure coming up at the same time. Static EtherChannel (with local NVRAM persistence) ensures critical links are re-established immediately, without waiting for LACP or remote config servers.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**Haiti Deployment Phase:** P38 pilot + P45 expansion (resilient hotspot infrastructure)
**Module:** link aggregation and failover (redundant uplinks)

**Linkage:** Each P38 hotspot has two uplinks to its peer (to provide redundancy). During a power event:
1. Hotspot A loses power.
2. Hotspot B continues routing and may also lose power seconds later.
3. Both hotspots reboot (UPS → generator → full power restoration).
4. Hotspot A must re-establish its bundle to Hotspot B **without external help**.
5. Once the bundle is up, both hotspots can synchronize state and resume service.

Static EtherChannel (this lab's design) ensures step 4 happens autonomously. Without it, both hotspots might boot but their bundles wouldn't form until they could negotiate LACP or receive config from a central management system — defeating the purpose of a decentralized, resilient mesh.

**Operational consequence if this lab's proof DOES NOT hold:**
- P38/P45 deployment must include a centralized configuration server that stays online via UPS (more complex, more single-point-of-failure).
- Link aggregation becomes unreliable during power events (delays recovery, possible partial connectivity).

**If this lab's proof DOES hold:**
- P38/P45 deploys with fully autonomous link recovery (no external server dependency).
- Resilience is proven; deployment can proceed.

---

## 11. Stretch Goals

1. **Test Partial Member Failure:** After cold-start recovery, shut down one physical member of the bundle (e.g., Gi0/0) and verify the Port-Channel remains operational on its remaining member (Gi0/1). Does the bundle degrade gracefully, or does it collapse?

2. **Measure Boot Time to Bundle Activation:** Time how long it takes from power-on to "show etherchannel summary" showing the bundle as active. Compare to LACP-based bundle time; quantify the cold-start advantage of static mode.

3. **Test Configuration Corruption Scenario:** Manually corrupt the startup-config (delete the channel-group lines via text editor), then power-cycle and observe failure. Then restore the config from backup and verify recovery. This proves that NVRAM persistence is indeed the recovery mechanism.

4. **Scale to 4+ Member Links:** Configure the bundle with 4 physical members instead of 2, verify all come up correctly after cold start, and measure bandwidth utilization across the bundle.

---

## 12. Self-Assessment (Field-1 BSL)

```
BSL-0 AWARENESS      - You've read this lab. Cold-start recovery is a concept.

BSL-1 LAB CAPABLE    - You completed this lab: configured static EtherChannel, saved config,
                       powered off, and verified recovery. Proof was in the logs/outputs.

BSL-2 OFFLINE        - You could repeat this lab without external infrastructure.
                       You'd know: static mode, disable service config, save startup-config,
                       power off, verify Port-Channel comes back online.

BSL-3 RECOVERABLE    - You could rebuild from the topology diagram. Given "prove EtherChannel
                       survives power loss and recovers without external intervention," you'd:
                       - Use static EtherChannel to avoid LACP negotiation
                       - Disable service config to avoid TFTP dependency
                       - Save startup-config to NVRAM
                       - Test via power loss and cold-start
                       - Verify "show etherchannel" output matches pre-loss state

BSL-4 MAINTAINABLE   - You could explain to an operator why static mode is necessary in Haiti's
                       power-unstable environment and how to verify recovery is working via
                       "show startup-config" comparison.

BSL-5 TEACHABLE      - You could teach this lab's design to someone else: why Black Start requires
                       local persistence, why LACP would fail during simultaneous cold-start,
                       and how to operationally guarantee resilience via NVRAM-only config.

Target BSL for this lab: BSL-3 (recoverable) — field-specific resilience design.
```

---

## 13. Key Concepts Demonstrated

**Key Concepts:** Static EtherChannel (no LACP), NVRAM persistence, cold-start recovery, offline resilience, autonomous bundle formation.

**What I Learned:** Configuration persistence and autonomous recovery are critical for resilient systems in power-unstable environments. LACP is flexible but requires peer coordination; static mode is rigid but predictable (critical for cold-start). The concept "save startup-config" is not just housekeeping — it's the foundation of offline resilience.

**Skills Practiced:** EtherChannel configuration (static mode), NVRAM management, cold-start testing, resilience validation.

