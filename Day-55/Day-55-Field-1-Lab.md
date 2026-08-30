# Day 55 Field-1 Variant — GRE Tunnels (Black Start Persistence)

## 0. Metadata

```
Field Focus:         Field 1: Black Start Resilience
Core Proof Obligation: GRE tunnel configuration survives power cycles via NVRAM; tunnel state re-establishes within 30 seconds of reboot without external trigger.
Haiti Deployment Phase: P45 (expansion) — island-wide power events require tunnels to self-heal automatically.
Estimated Time:      2 hours
Difficulty:          Intermediate
Relationship to Base Lab: Same GRE protocol; added persistent NVRAM storage, keepalive via local timekeeping, offline verification.
Prerequisite:        Complete Day 55 Lab Manual first; understand GRE encapsulation and tunnel endpoints.
```

---

## 1. Business Context (Field-1 Framing)

In Haiti P45, two geographically-distant hotspots (Island A and Island B) are connected via a WAN that occasionally fails or becomes unreliable. A GRE tunnel provides a virtual point-to-point link that makes it appear as if the two sites are directly connected, even though the underlying WAN link is unstable.

**The problem:** If both endpoints lose power and reboot in arbitrary order, a naive GRE tunnel configuration might:
- Lose its endpoint IP configuration (not in NVRAM)
- Lose its keepalive settings (not persistent)
- Reboot without a trigger to re-establish the tunnel (depends on external WAN becoming available at exactly the right time)

Result: One endpoint reboots and waits for the other; when the second comes back, the tunnel is still not operational if the first has already given up waiting.

**This variant proves:** With NVRAM-backed configuration and local keepalive timers, a GRE tunnel persists through arbitrary power-loss/reboot sequences and re-establishes within 30 seconds of the second endpoint coming online — no manual intervention.

---

## 2. Topology Diagram (Field-1 Variant)

```
[FIELD-1 VARIANT — Black Start Persistence]

Island A (Router RA)
├─ Local NTP (time-synced)
├─ NVRAM-backed tunnel config
├─ GRE tunnel endpoint: 1.1.1.1
└─ Keepalive send/receive logic (local timer-driven)

        RA ──[WAN Link (periodically unavailable)]── RB
        (Power-backed config, cold-start capable)

Island B (Router RB)
├─ Local NTP (time-synced)
├─ NVRAM-backed tunnel config
├─ GRE tunnel endpoint: 2.2.2.2
└─ Keepalive send/receive logic (local timer-driven)

[POWER EVENT SIMULATION]
1. Configure tunnel on both routers, save to NVRAM
2. Bring up tunnel in normal mode
3. Power off both routers
4. Reboot RA first
5. Verify tunnel persists (config loads from NVRAM)
6. Reboot RB second
7. Verify tunnel re-establishes within 30 seconds
```

---

## 3. IP Addressing Plan (Field-1 Annotations)

| Device | WAN IP | Tunnel IP | Tunnel Remote |
|---|---|---|---|
| RA | 1.1.1.1/24 | 10.0.0.1/30 | 10.0.0.2 (RB tunnel endpoint) |
| RB | 2.2.2.2/24 | 10.0.0.2/30 | 10.0.0.1 (RA tunnel endpoint) |

**Field-1 Annotations:**
- WAN IPs must be in startup-config for offline operation (not learned from DHCP)
- Tunnel interface IPs must be persistent (not learned from dynamic routing)
- Keepalive mechanism uses local clock (not external NTP server)

---

## 4. Configuration (Field-1 Optimizations)

### 4.1 RA: Configure WAN Interface (Persistent)

```text
RA(config)#interface GigabitEthernet0/0
RA(config-if)#ip address 1.1.1.1 255.255.255.0
RA(config-if)#no shutdown
RA(config-if)#exit
```

**Field-1 requirement:** This IP must be in startup-config, not learned dynamically.

### 4.2 RA: Configure GRE Tunnel with Keepalive

```text
RA(config)#interface Tunnel 0
RA(config-if)#ip address 10.0.0.1 255.255.255.252
RA(config-if)#tunnel source 1.1.1.1
RA(config-if)#tunnel destination 2.2.2.2
RA(config-if)#tunnel keepalive 3 10
! Send keepalive every 3 seconds; declare tunnel down after 10 seconds without response
RA(config-if)#no shutdown
RA(config-if)#exit
```

**Explanation for Field-1:**
- `tunnel keepalive 3 10`: Local timer on RA sends GRE packets to RB every 3 seconds. If no response within 10 seconds, RA declares tunnel "down" (but doesn't delete it). This is independent of WAN link status — RA can detect tunnel failure locally without external coordination.
- **Black Start proof obligation:** If WAN is unavailable during early boot, keepalive timeout allows RA to detect this within 10 seconds, rather than waiting indefinitely.

### 4.3 RA: Save Configuration to NVRAM

```text
RA(config)#exit
RA#write memory
! OR: RA# copy running-config startup-config
```

### 4.4 RB: Equivalent Configuration

```text
RB(config)#interface GigabitEthernet0/0
RB(config-if)#ip address 2.2.2.2 255.255.255.0
RB(config-if)#no shutdown
RB(config-if)#exit

RB(config)#interface Tunnel 0
RB(config-if)#ip address 10.0.0.2 255.255.255.252
RB(config-if)#tunnel source 2.2.2.2
RB(config-if)#tunnel destination 1.1.1.1
RB(config-if)#tunnel keepalive 3 10
RB(config-if)#no shutdown
RB(config-if)#exit

RB(config)#exit
RB#write memory
```

---

## 5. Field-1 Verification Steps

### 5.1 Pre-Power-Loss State

```text
RA#show interface tunnel 0
Tunnel0 is up, line protocol is up
  Hardware is Tunnel
  Internet address is 10.0.0.1 255.255.255.252
  MTU 1500 bytes, BW 100 Kbit/sec
  Encapsulation TUNNEL, loopback not set
  Keepalive set (3 sec), retries 10

RA#ping 10.0.0.2
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echoes to 10.0.0.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round trip time min/avg/max = 1/1/2 ms
```

**Expected:** Tunnel is up on both routers; pings succeed across tunnel IP space.

### 5.2 Verify Persistence in Startup-Config

```text
RA#show startup-config | include "interface Tunnel\|tunnel source\|tunnel destination\|tunnel keepalive"
interface Tunnel0
 ip address 10.0.0.1 255.255.255.252
 tunnel source 1.1.1.1
 tunnel destination 2.2.2.2
 tunnel keepalive 3 10
```

**Field-1 Requirement:** Tunnel configuration appears in startup-config, proving it survives power loss.

### 5.3 Simulate Power Loss (Both Down)

```text
RA# reload
RB# reload
! Wait for both to power down (UPS drains or deliberate shutdown)
! Then reboot RA first, wait for RB
```

### 5.4 Post-Reboot Verification (RA Up, RB Still Down)

```text
RA#show startup-config | include "interface Tunnel"
interface Tunnel0
 (config loads from NVRAM)

RA#show interface tunnel 0
Tunnel0 is up, line protocol is down
  Internet address is 10.0.0.1 255.255.255.252
  Encapsulation TUNNEL
  Keepalive set (3 sec), retries 10
  [No line protocol because RB is not yet up to respond to keepalives]

RA#show interface tunnel 0 | include "Keepalive"
Keepalive set (3 sec), retries 10

RA#debug tunnel keepalive (limited to 10 seconds)
[RA repeatedly sends keepalive packets toward RB.tunnel 2.2.2.2]
[Since RB is offline, there's no response; timeout occurs every 10 seconds]
```

**Expected:** Tunnel interface comes up with persistent config. Keepalive timer runs locally on RA, continuously trying to reach RB.

### 5.5 Post-Reboot Verification (RB Comes Online)

```text
[Wait 30 seconds after RB reboots]

RA#show interface tunnel 0
Tunnel0 is up, line protocol is up
  Internet address is 10.0.0.1 255.255.255.252
  Encapsulation TUNNEL
  Keepalive set (3 sec), retries 10
  [Line protocol changed to "up" because RB is responding to keepalives]

RB#show interface tunnel 0
Tunnel0 is up, line protocol is up
  Internet address is 10.0.0.2 255.255.255.252
  Encapsulation TUNNEL
  Keepalive set (3 sec), retries 10

RA#ping 10.0.0.2
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echoes to 10.0.0.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5)
```

**PROOF OBLIGATION PASS:** Tunnel re-establishes within 30 seconds of RB coming online, without manual intervention. Configuration persisted through arbitrary reboot order.

---

## 6. Expected Output Gallery (Field-1 Scenarios)

### Tunnel Coming Up Post-Reboot

```
RA#show interface tunnel 0 | begin "Tunnel0"
Tunnel0 is up, line protocol is down
  Hardware is Tunnel
  Internet address is 10.0.0.1 255.255.255.252
  MTU 1500 bytes, BW 100 Kbit/sec
  Encapsulation TUNNEL, loopback not set
  [RA is sending keepalives every 3 seconds toward RB at 2.2.2.2]
  [RB not yet online; RA declares "line protocol down" until keepalive response arrives]

[After RB boots]
RA#show interface tunnel 0 | begin "Tunnel0"
Tunnel0 is up, line protocol is up
  Hardware is Tunnel
  Internet address is 10.0.0.1 255.255.255.252
  MTU 1500 bytes, BW 100 Kbit/sec
  Encapsulation TUNNEL, loopback not set
  [RA received keepalive response from RB; line protocol transitions to "up"]
  [Tunnel is fully operational; traffic can be forwarded]
```

---

## 7. Common Field-1 Mistakes

1. **Forgetting `write memory` after tunnel config** → Tunnel in running-config only; power loss wipes it. After reboot, tunnel interface doesn't exist.
   - **Fix:** Always `copy running-config startup-config` before testing power loss.

2. **Not configuring keepalive** → Tunnel comes up with `line protocol up`, but if WAN link is unavailable, the tunnel silently fails without notification. Remote endpoint doesn't know tunnel is dead.
   - **Fix:** Enable keepalive on both tunnel endpoints.

3. **Tunnel IP not persistent** → Tunnel interface exists after reboot but has no IP address. Pings across tunnel fail.
   - **Fix:** Verify `ip address 10.0.0.1 255.255.255.252` is in startup-config for the tunnel interface.

4. **WAN endpoint IP not persistent** → GRE tunnel can't establish because the source IP is missing after reboot.
   - **Fix:** Verify `tunnel source 1.1.1.1` and the underlying interface IP (1.1.1.1) are in startup-config.

---

## 8. Troubleshooting by Field-1 (Diagnostic Method)

**Symptom: "After reboot, tunnel interface exists but line protocol is down; keepalive isn't working"**

```text
Step 1: Is the tunnel source/destination in startup-config?
  show startup-config | include "tunnel source\|tunnel destination"
  → If missing, tunnel can't establish (WAN endpoints are lost). Reconfigure and save.

Step 2: Is the tunnel source interface (1.1.1.1) up?
  show ip interface brief | include "GigabitEthernet0/0"
  → If down, GRE can't send packets toward the other end. Verify WAN link is up.

Step 3: Can the router reach the tunnel destination (2.2.2.2)?
  ping 2.2.2.2
  → If timeout, WAN link is down. This is expected during early boot; keepalive timeout (10s) should handle it.

Step 4: Is keepalive configured?
  show interface tunnel 0 | include "Keepalive"
  → If "Keepalive disabled", tunnel never detects remote failure. Enable `tunnel keepalive 3 10`.

Step 5: Are keepalive packets being sent?
  debug tunnel keepalive (limited to 10 seconds)
  → Should see "Keepalive sent to 2.2.2.2" every 3 seconds. If not, keepalive is disabled.

Step 6: Check WAN link recovery time
  [Note the time when RB boots]
  [Wait 15 seconds]
  show interface tunnel 0
  → If line protocol is still "down", WAN link is still unreachable. Wait up to 30s.
```

---

## 9. Design Analysis: Field-1 Reasoning

**Why does this field-specific topology matter for Black Start?**

In traditional deployments, GRE tunnels depend on:
1. Dynamic IP assignment (DHCP) for WAN endpoints → fails if DHCP server is offline
2. Routing protocol (OSPF, BGP) to learn tunnel destinations → fails if another router is offline
3. External orchestration to bring tunnels online → fails if orchestration server is offline

This Field-1 variant proves that with **static configuration + local keepalive**, a GRE tunnel can operate autonomously through power-loss sequences. No external dependency; just "configure it once, save it, let it work."

For Haiti P45, this means:
- Hotspot-to-hotspot tunnels survive island-wide power events
- Automatic recovery within 30 seconds of power restoration
- No manual CLI intervention needed

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P45 Expansion — Multi-Site Tunneling**

In P45, 20–30 hotspots are spread across one or two islands. GRE tunnels connect them in a hub-and-spoke or partial-mesh topology. During a brownout or rolling blackout:
1. Some hotspots lose power; others remain online
2. Recovery is staggered (generators kick in at different times)
3. Tunnels must re-establish as each hotspot comes back online

This lab proves that tunnels configured with persistent NVRAM + keepalive can handle this scenario. Before P45 deployment, tunnel recovery benchmarks (< 30 seconds) must be validated in field trials.

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Scalability:** Extend this to a 5-hop tunnel chain (A ↔ B ↔ C ↔ D ↔ E). Measure time for the entire chain to re-establish after staggered reboots.

2. **Keepalive reliability:** Run 1000 keepalive cycles under 5% packet loss. Measure false-negative rate (declaring tunnel down when it's actually up). Verify < 0.1% false-negative rate.

3. **Configuration validation:** Use formal methods to prove that if startup-config is not corrupted, the tunnel configuration is correctly restored after reboot.

4. **Failover timing:** Simulate tunnel endpoint failure (remote router crashes but local WAN link is still up). Measure time from crash to keepalive timeout detection (should be ~10 seconds).

---

## 12. Self-Assessment (Field-1 BSL)

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open; power-loss test worked once.
BSL-2 OFFLINE        - You could repeat this lab with the manual, no internet.
BSL-3 RECOVERABLE    - You could rebuild this lab from the topology diagram; given power-loss scenarios, 
                        you'd know to test keepalive timeout and NVRAM persistence.
BSL-4 MAINTAINABLE   - You could modify this lab for a 3-router tunnel chain and still ensure 
                        black-start capability without external coordination.
BSL-5 TEACHABLE      - You could teach why GRE keepalive is essential for black-start resilience, 
                        and why local timekeeping beats external NTP for autonomous recovery.

Target BSL for this lab: 3–4
```

---

**Push this file via Python payload JSON to RedjiJB-Labs/Day-55-Field-1-Lab.md**
