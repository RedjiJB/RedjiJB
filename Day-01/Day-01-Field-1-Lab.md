# Day 01 — Field 1 (Black Start): Network Devices for Offline Operation

---

## 0. Metadata

| Field | Value |
|---|---|
| **Field Focus** | Field 1: Black Start Systems |
| **Core Proof Obligation** | Entire topology operates offline without internet, external DNS, NTP, or cloud infrastructure; all critical services (routing, naming, time sync) run locally and survive power cycle. |
| **Haiti Deployment Phase** | P38 pilot (50–100 nodes) and onwards — dcentral-core must function offline during internet outages. |
| **Estimated Time** | 3–4 hours (includes offline verification and power-failure scenarios) |
| **Difficulty** | Intermediate |
| **Relationship to Base Lab** | Same two-branch topology and firewall placement (NY outside, Tokyo inside); adds local DNS/NTP servers, offline configuration storage, and power-failure recovery procedures. Tests that the enterprise topology proof doesn't depend on external infrastructure. |
| **Prerequisite** | Complete Day-01-Lab-Manual first. Familiarity with DNS basics and NTP concepts helpful. |

---

## 1. Business Context (Field-Specific Framing)

The base Day-01 topology assumes continuous internet connectivity: routers default-route to the ISP, PCs resolve DNS via external servers, and NTP syncs time from internet time servers. This works fine when internet is available.

**But what happens during an internet outage?**

In Haiti's early deployment phases, internet connectivity is intermittent — weather, infrastructure damage, and geomagnetic events can cause multi-day outages. The dcentral-core topology must continue routing, naming, and time-keeping during these outages. If critical services depend on external resolvers or time servers, they fail when the internet link drops.

This variant proves the hypothesis: **the enterprise topology can operate autonomously offline, with zero external dependencies, while maintaining full routing, device management, and naming service functionality.**

This proof unblocks P38 pilot deployment by proving the architectural assumption: "dcentral-core nodes can boot to a working state without ever seeing the internet."

---

## 2. Topology Diagram (Field-Specific Modifications)

**BASE TOPOLOGY (Day-01-Lab-Manual):**
```
NEW YORK BRANCH
PC0/PC1 ← SW1 ← R1 ← FW1 ← [ISP Link] ← ISP-RTR ← ATTACKER

TOKYO BRANCH
SRV1/SRV2 ← SW2 ← FW2 ← R2 ← [ISP Link] ← ISP-RTR

KEY DEPENDENCY: External DNS, NTP, internet gateway
```

**FIELD-1 VARIANT (OFFLINE-CAPABLE):**
```
NEW YORK BRANCH
PC0/PC1 ← SW1 ← R1 (DNS Server + NTP Server, local cache)
                 ↓
              [Local DNS: responds to ny.local, tokyo.local]
              [Local NTP: time source for entire mesh]
                 ↓
              FW1 ← [ISP Link] (optional if present; not required to function)

TOKYO BRANCH
SRV1/SRV2 ← SW2 ← FW2 ← R2
                         ↓
                    [Sync time to NY-R1's NTP server]
                    [Query NY-R1's DNS for Tokyo entries]

KEY DIFFERENCE:
- NY-R1 runs authoritative DNS and NTP — no external dependencies
- Tokyo branch queries NYC's local DNS and NTP
- Firewall (FW1, FW2) operate with local routing tables, survive ISP link drop
- Router configs saved to NVRAM (startup-config) — survive power cycle
```

---

## 3. IP Addressing Plan (Field-Specific Annotations)

**Same subnetting as base lab, but annotated for offline operation:**

| Segment | Network | Usable Range | Annotation (Field 1 Offline Requirement) |
|---------|---------|--------------|-------------------------------------------|
| New York LAN | 192.168.10.0/24 | .1–.254 | **DNS authoritative for entire domain** — must serve all client queries offline |
| NY-R1 ↔ NY-FW1 transit | 192.168.100.0/30 | .1–.2 | Local routing; not internet-dependent |
| NY-FW1 ↔ ISP-RTR (WAN) | 203.0.113.0/30 | .1–.2 | **Optional when offline** — link may be down for days; traffic must still route internally |
| Tokyo LAN | 192.168.20.0/24 | .1–.254 | Secondary DNS client — queries NY-R1 for local zones |
| TOKYO-R2 ↔ TOKYO-FW2 | 192.168.200.0/30 | .1–.2 | Local routing; not internet-dependent |
| TOKYO-R2 ↔ ISP-RTR (WAN) | 203.0.113.4/30 | .5–.6 | **Optional when offline** — same as NY-FW1's WAN link |

**Critical design choice:** The NY-R1 router becomes the **single point of truth** for:
- **DNS:** authoritative for `ny.local`, `tokyo.local`, cached external queries
- **NTP:** time source for all devices
- **Routing:** local routing tables survive ISP link loss

This is not a failure — it's the correct architecture for a two-site network with intermittent connectivity. If this topology scaled to 50+ nodes (P38 Haiti pilot), you'd add DNS slaves and NTP secondaries, but the principle remains: **local authority, not external.**

---

## 4. Configuration (Field-Specific Optimizations)

### 4.1 NY-R1: Local DNS Server + NTP Server

Begin with the base Day-01 NY-R1 configuration, then ADD these commands:

```text
! ===== DNS CONFIGURATION =====
NY-R1(config)#ip dns server
! Explanation: Enables this router as an authoritative DNS server for the domain.
! Offline proof: DNS queries resolve without leaving the local network.

NY-R1(config)#ip domain-name ny.local
! Define the primary local domain — all unqualified hostnames default to this suffix.

! Create DNS entries for local devices (Cisco DNS uses host tables, not full BIND zones)
NY-R1(config)#ip host r1 192.168.10.1
NY-R1(config)#ip host r1.ny.local 192.168.10.1
NY-R1(config)#ip host r2 192.168.200.2
NY-R1(config)#ip host r2.tokyo.local 192.168.200.2
NY-R1(config)#ip host fw1 192.168.100.2
NY-R1(config)#ip host fw1.ny.local 192.168.100.2
NY-R1(config)#ip host fw2 192.168.200.1
NY-R1(config)#ip host fw2.tokyo.local 192.168.200.1
NY-R1(config)#ip host sw1 192.168.10.2
NY-R1(config)#ip host sw1.ny.local 192.168.10.2
NY-R1(config)#ip host sw2 192.168.20.2
NY-R1(config)#ip host sw2.tokyo.local 192.168.20.2

! ===== NTP CONFIGURATION =====
NY-R1(config)#ntp master 1
! Explanation: Configure this router as an NTP master (stratum 1 — highest authority in local network).
! This is safe offline because this router's local clock becomes the reference. All other devices
! will sync to NY-R1's time, eliminating dependency on external NTP servers.
! Caveat: In the real world, you'd bootstrap NY-R1 from a GPS or atomic clock; here, it's the local
! reference by fiat.

NY-R1(config)#ntp source 192.168.10.1
! Tell NTP to source time announcements from this IP, not from a random interface IP.

! ===== Ensure persistent storage of DNS/NTP config =====
NY-R1(config)#exit
NY-R1#copy running-config startup-config
Destination filename [startup-config]? [press Enter]
```

**Justification for Field 1:**
- `ip dns server` converts the router into a local authoritative nameserver. Offline, there's no external resolver fallback — this router *must* answer every DNS query.
- `ntp master` declares this router as the authoritative time source for the network. This eliminates the dependency on external NTP and allows devices to sync time even during weeks-long internet outages.
- Saving running-config to NVRAM ensures that when power is restored (after a blackout), the router boots with DNS and NTP still configured — cold-start recovery doesn't require manual intervention.

### 4.2 Firewall Configuration: Local Routing Over ISP Dependency

NY-FW1 and TOKYO-FW2 remain mostly unchanged from the base lab, **except:**

```text
! ===== NY-FW1 Local Routing (survives ISP link down) =====
! (Add these to the base NY-FW1 config; the base config is still valid.)
NY-FW1(config)#route inside 192.168.20.0 255.255.255.0 192.168.100.1
! Explanation: When traffic arrives on the inside heading to 192.168.20.0/24 (Tokyo LAN),
! route it to NY-R1 (192.168.100.1). This works whether or not the ISP link is up.

! ===== TOKYO-FW2 Local Routing (survives ISP link down) =====
! (Add these to the base TOKYO-FW2 config.)
TOKYO-FW2(config)#route inside 192.168.10.0 255.255.255.0 192.168.200.2
! Explanation: When traffic arrives on the inside heading to 192.168.10.0/24 (New York LAN),
! route it to TOKYO-R2 (192.168.200.2).

! ===== Graceful fallback: default route to ISP (if link is up) =====
! Both firewalls keep their default routes to the ISP. If the ISP link is up,
! external traffic routes out. If the ISP link is down, traffic to unknown destinations
! silently fails (doesn't crash the firewall or trigger error loops).
NY-FW1(config)#route outside 0.0.0.0 0.0.0.0 203.0.113.2
TOKYO-FW2(config)#route outside 0.0.0.0 0.0.0.0 192.168.200.2 1
! (Priority: local 192.168.x.x routes, then ISP if available)
```

**Justification for Field 1:**
- These routes allow traffic to flow between NY and Tokyo branches even if the ISP link is down. The branches don't depend on the "ISP-RTR" as an intermediary for their mutual communication.
- By keeping the ISP default route, we preserve the option to reach external networks if the link is restored — but internal operation doesn't require it.

### 4.3 PC and Server Configuration: Local DNS Client

In Packet Tracer, modify the DNS settings for PC0, PC1, SRV1, SRV2:

```text
! ===== PC0 (and PC1, SRV1, SRV2 — all the same) =====
Desktop → Command Prompt
ipconfig /all
! Expected output shows:
! DNS Servers: 192.168.10.1 (NY-R1's local DNS server)

! Configure via Packet Tracer GUI:
Desktop → IP Configuration
Primary DNS: 192.168.10.1 (NY-R1)
(Leave "DNS Server" field blank for secondary)

! Test:
ping r2.tokyo.local
! Expected: Resolves to 192.168.200.2 (TOKYO-R2) via NY-R1's local DNS cache
! This works even if the ISP link is down.
```

---

## 5. Field-Specific Verification Steps

**Proof obligation:** The topology operates with zero external dependencies; all critical services (routing, DNS, time) function locally and survive power cycle.

### Scenario 1: Offline Operation (ISP Link Disabled)

```text
Step 1: Power on all devices (as in base lab).

Step 2: Shut down the ISP link by disabling the WAN interface on ISP-RTR:
  ISP-RTR#configure terminal
  ISP-RTR(config)#interface gigabitEthernet 0/0
  ISP-RTR(config-if)#shutdown
  ISP-RTR(config-if)#exit
  ISP-RTR#copy running-config startup-config

Step 3: Test intra-branch routing (should succeed):
  PC0#ping 192.168.10.11
  Expected: Reply from 192.168.10.11 (PC1, same subnet)
  
Step 4: Test inter-branch routing (should succeed):
  PC0#nslookup r2.tokyo.local
  Expected: Name resolution returns 192.168.200.2
  
  PC0#ping 192.168.200.2
  Expected: Reply from TOKYO-R2 (proves inter-branch routing works offline)

Step 5: Test DNS locally without internet:
  PC0#ipconfig
  Expected: Primary DNS = 192.168.10.1 (NY-R1's local server)
  
  PC0#nslookup fw2.tokyo.local
  Expected: Name resolution returns 192.168.200.1 (TOKYO-FW2)
  
Step 6: Verify time sync (NTP):
  NY-R1#show ntp associations
  Expected: Output shows NY-R1 as master (stratum 1)
  
  TOKYO-R2#show ntp associations
  Expected: Shows NY-R1 (192.168.10.1) as NTP server; Stratum 2 or lower
  
  TOKYO-R2#show clock
  Expected: Time is synchronized (not system time, but NTP-synchronized)

PROOF OBJECTIVE MET: All services (routing, DNS, NTP) work with ISP link down.
```

### Scenario 2: Power Loss and Cold Recovery

```text
Step 1: (Continuing from Scenario 1, ISP link still disabled)

Step 2: Simulate power loss by doing a hard shutdown on NY-R1:
  ! In Packet Tracer, use the physical power button or:
  NY-R1#reload
  Proceed with reload? [confirm] y
  ! (Device will reboot; wait for it to come back up)

Step 3: Verify NY-R1 boots with DNS and NTP still active:
  NY-R1#show running-config | include dns
  Expected: "ip dns server" is present
  
  NY-R1#show running-config | include ntp
  Expected: "ntp master 1" is present

Step 4: Test post-reboot DNS resolution from a PC:
  PC0#nslookup r2.tokyo.local
  Expected: Name resolution returns 192.168.200.2
  Explanation: DNS server came back online automatically after boot; no manual intervention needed.

Step 5: Verify NTP synchronization after reboot:
  TOKYO-R2#show clock
  Expected: Time is synchronized (within a few minutes of reboot)

PROOF OBJECTIVE MET: Cold-boot recovery works without external input; all critical services resume automatically.
```

### Scenario 3: External Internet Restored (Graceful Recovery)

```text
Step 1: (Continuing from Scenario 2, system is running offline)

Step 2: Restore the ISP link:
  ISP-RTR#configure terminal
  ISP-RTR(config)#interface gigabitEthernet 0/0
  ISP-RTR(config-if)#no shutdown
  ISP-RTR(config-if)#exit

Step 3: Verify external connectivity is restored:
  ISP-RTR#ping 203.0.113.1
  Expected: Reply from NY-FW1's outside interface
  
Step 4: Verify internal services still work as before (no disruption):
  PC0#ping r2.tokyo.local
  Expected: Still resolves and pings (no change from offline mode)

Step 5: Verify optional external DNS fallback:
  ! (In a real system, you'd configure fallback DNS servers for internet-based queries)
  ! For this lab, local DNS is sufficient; internet queries simply time out.

PROOF OBJECTIVE MET: System gracefully transitions between offline and online operation without configuration changes.
```

---

## 6. Expected Output Gallery

### 6.1 DNS Query Output (Offline)

```text
PC0#nslookup fw2.tokyo.local
Server: 192.168.10.1 (NY-R1's local DNS server)
Address: 192.168.10.1#53

Name: fw2.tokyo.local
Address: 192.168.200.1
```

### 6.2 NTP Status (NY-R1 as Master)

```text
NY-R1#show ntp associations

      address         ref clock       st when poll reach delay offset  disp
+127.127.1.1       127.127.1.1       0   64   64    1   0.00  0.00  1.95
 192.168.200.2     192.168.10.1      2   57   64  377  15.42  2.12  3.41

 * master (synced), # master (unsynced), + selected, - candidate, ~ configured
```

### 6.3 NTP Status (TOKYO-R2 Syncing to NY-R1)

```text
TOKYO-R2#show ntp associations

      address         ref clock       st when poll reach delay offset  disp
*192.168.10.1       192.168.10.1      1   32   64  377  15.42  2.12  3.41

* master (synced), # master (unsynced), + selected, - candidate, ~ configured

TOKYO-R2#show clock
*19:45:23.456 UTC Tue Aug 29 2026
```

### 6.4 Routing Table (Offline, ISP Link Down)

```text
NY-R1#show ip route

Gateway of last resort is not set

     192.168.10.0/24 is directly connected, GigabitEthernet0/0
     192.168.20.0/24 [1/0] via 192.168.100.2, 00:00:15, GigabitEthernet0/1
     192.168.100.0/30 is directly connected, GigabitEthernet0/1
     203.0.113.0/30 is directly connected, GigabitEthernet0/1 [if ISP link is up]
     203.0.113.4/30 [120/1] via 192.168.100.2, 00:00:15, GigabitEthernet0/1

(Note: Routes to Tokyo subnets are learned via firewall static routing, not ISP core.)
```

---

## 7. Common Field-Specific Mistakes

### Mistake 1: Forgetting to Configure `ip dns server` on NY-R1

**What breaks:**
```text
PC0#nslookup r2.tokyo.local
! Hangs for 5 seconds, then:
! Server: [ISP's external DNS server — from old DHCP config]
! *** Name Service timeout — r2.tokyo.local can't be resolved
```

**Why:** Without `ip dns server` enabled, the router doesn't listen on UDP port 53. DNS queries go to the configured (external) DNS server, which has no entry for `r2.tokyo.local` because it's a private local domain.

**Fix:** Ensure `ip dns server` is configured and saved: `copy running-config startup-config`.

### Mistake 2: Not Saving DNS/NTP Config to NVRAM

**What breaks:**
```text
! Immediately after `reload` (or power loss):
NY-R1#show running-config | include dns
! (No output — DNS server config was lost during reboot)

PC0#ping r2.tokyo.local
! Name resolution fails (DNS server went offline with the reboot)
```

**Why:** Saving only the startup-config at the end of configuration means that dynamic configs added mid-session (like DNS entries) might not persist if you reload before the final `copy run start`.

**Fix:** Save after every major config section: `copy running-config startup-config`.

### Mistake 3: Firewall Default Route Points to ISP Even When ISP Link is Down

**What breaks:**
```text
! ISP link is disabled; traffic heading to external networks:
PC0#traceroute 8.8.8.8
! Hangs for 30 seconds (firewall tries to forward via ISP-RTR, then times out)
```

**Why:** The firewall's default route (`route outside 0.0.0.0 0.0.0.0 203.0.113.2`) assumes the ISP link is reachable. If it's down, the firewall never gets an ICMP "destination unreachable" — it just silently drops the packet.

**Fix:** This is expected behavior for a network that gracefully degrades offline. Don't route external traffic during outages; rely on internal services only.

### Mistake 4: Configuring NTP But Not Distributing It to Other Devices

**What breaks:**
```text
TOKYO-R2#show clock
! Shows system time (not synchronized):
*19:45:23.456 UTC Tue Aug 29 2026 [mark: not from NTP]

! If a time-based security check depends on synchronized time (e.g., certificate validation),
! TOKYO-R2 will fail because its clock is off.
```

**Why:** `ntp master` on NY-R1 doesn't automatically broadcast time to other devices. You also need to configure Tokyo devices to *query* NY-R1's NTP server.

**Fix:** On TOKYO-R2, add: `ntp server 192.168.10.1` (then verify with `show ntp associations`).

### Mistake 5: Overloading NY-R1 as the Single Point of Failure

**What breaks:**
```text
! If NY-R1 crashes:
TOKYO-R2#ping 192.168.10.1
! No reply (NY-R1 is down)

TOKYO-R2#show ntp associations
! NTP is no longer in sync (no master reachable)

PC0#nslookup r2.tokyo.local
! DNS fails (name server is down)
```

**Why:** In this two-site topology, NY-R1 is the authoritative source for DNS and NTP. If it's offline, those services disappear network-wide.

**Fix:** For P38 Haiti pilot (50+ nodes), add DNS slaves and NTP secondaries in other branches. For Day-01 (2 sites), accept NY-R1 as the single point of truth — it's the correct design at this scale.

---

## 8. Troubleshooting by Field (Diagnostic Method)

### Problem: "DNS doesn't resolve tokyo.local"

```text
Step 1: Verify DNS server is actually running on NY-R1
  NY-R1#show running-config | include dns
  Expected: "ip dns server" present
  If absent: Run "ip dns server" in config mode

Step 2: Verify PC's DNS server setting
  PC0#ipconfig
  Expected: Primary DNS = 192.168.10.1 (NY-R1's LAN IP)
  If not: Manually set DNS to 192.168.10.1 in PC's IP config

Step 3: Verify the DNS entry exists on NY-R1
  NY-R1#show hosts
  Expected: Output lists "r2  192.168.200.2" and other entries
  If missing: Add with "ip host r2 192.168.200.2"

Step 4: Test DNS server manually
  PC0#nslookup 192.168.10.1
  Expected: Resolves and responds quickly
  If times out: Check connectivity to NY-R1

Step 5: Check if ISP link being up interferes
  ! ISP-RTR#shutdown interface Gi0/0  [disable the ISP link]
  ! Retry PC0#nslookup r2.tokyo.local
  ! If it now works: ISP link was interfering; verify ISP DNS isn't overriding local config
```

### Problem: "Time is not synchronized (NTP appears down)"

```text
Step 1: Verify NTP master is running on NY-R1
  NY-R1#show running-config | include "ntp master"
  Expected: "ntp master 1" or similar
  If absent: Run "ntp master 1" in config mode

Step 2: Check NY-R1's clock
  NY-R1#show clock
  Expected: Shows time with "(UTC)" or similar (NTP-synchronized indicator)
  If shows "*" prefix: Clock is stable but might not be synced to an external source yet

Step 3: Verify TOKYO-R2 can reach NY-R1's NTP
  TOKYO-R2#show ntp associations
  Expected: Shows 192.168.10.1 with a + or * indicator (synced)
  If shows "x" or blank: Not synced; verify NTP server is running

Step 4: Check for network connectivity
  TOKYO-R2#ping 192.168.10.1
  Expected: Reply received
  If no reply: NY-R1 is unreachable; check routing and firewall ACLs

Step 5: Verify NTP port (UDP 123) is not blocked
  ! Check firewall ACLs:
  NY-FW1#show access-list
  ! Ensure inbound access to 192.168.10.1:123 is permitted from TOKYO branch
  ! (NTP defaults should permit it; if you've customized ACLs, verify NTP isn't blocked)
```

### Problem: "Router doesn't recover from power loss; DNS/NTP missing after reboot"

```text
Step 1: Verify config is saved to NVRAM
  NY-R1#show startup-config | include "ip dns server"
  Expected: "ip dns server" present in startup-config
  If absent: Run "copy running-config startup-config"

Step 2: Check NVRAM is not full
  NY-R1#show flash:
  Expected: Used space is < 70% of available flash
  If full or nearly full: Delete old logs or backups, then save config again

Step 3: Verify the router actually is rebooting (not just hanging)
  ! (Use Packet Tracer's system time to see if device is up)
  ! Wait 30–60 seconds after reload command for boot to complete

Step 4: Check startup sequence
  NY-R1#show startup-config | head
  Expected: First lines show "version", "service", "hostname", then config commands
  If config is truncated or missing: Restore from backup or re-enter commands

Step 5: Manually verify DNS after reboot
  PC0#nslookup r2.tokyo.local
  Expected: Resolves successfully (proves DNS came back online)
  If hangs: DNS server did not start; verify saved config and manually re-enable
```

---

## 9. Design Analysis: Field-Specific Reasoning

**Why does this variant matter for Black Start (Field 1)?**

A network that depends on external services is fragile in regions with intermittent connectivity. Haiti's power and internet infrastructure is variable — multi-day outages are not rare. A network design that *requires* constant external DNS, NTP, and internet routing is a liability, not an asset.

This variant proves the hypothesis: **enterprise topology can achieve full functionality with zero external dependencies.**

Key architectural insights:

1. **Local DNS Authority**: By making NY-R1 authoritative for all local domains, we eliminate DNS timeouts and external resolver failures. Devices can resolve each other's names even during weeks-long internet outages. This scales: in P38 Haiti (50+ nodes), you'd add DNS slaves in each region, but the principle remains — local authority first, external queries only for internet-facing domains.

2. **NTP Master**: Time synchronization is critical for security (certificate validation, log correlation, consensus protocols). By making NY-R1 the local time source (stratum 1), all devices stay synchronized without external time servers. In a real deployment, you'd bootstrap the stratum-1 clock from GPS or atomic time; here, we assume it's correct by fiat.

3. **Local Routing**: Inter-branch traffic (NY ↔ Tokyo) never leaves the internal network and never depends on the ISP. This means routing between branches works even during complete internet loss. The ISP link becomes optional — nice to have for external queries, not necessary for internal operation.

4. **Cold-Start Recovery**: By saving all critical configs to NVRAM, devices recover from power loss without manual intervention. In Haiti's early phases, unplanned power cycling is common; autonomous recovery is a force multiplier.

Together, these design choices prove that a multi-site topology can operate autonomously, validating dcentral-core's offline-mode assumption and unblocking P38 pilot deployment.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**D-Central Module:** `dcentral-core` (node identity, DID issuance, naming authority)

**Haiti Phase:** P38 pilot onwards (50–100 node mesh, early 2038+)

**Linkage:**

dcentral-core must bootstrap, sync identity, and issue decentralized identifiers (DIDs) for every node entering the mesh. DIDs are anchored in naming and time — you can't issue a DID with a certificate timestamp that violates causality, and you can't resolve a DID if your DNS is broken.

This lab proves dcentral-core can do both even when the internet is down. In P38 Haiti:

- A node boots in an isolated village with no internet
- dcentral-core's DNS and NTP services are already running (learned from neighboring nodes)
- The new node queries local DNS to find the identity anchor
- The new node syncs its clock to local NTP
- DID issuance proceeds without ever touching the internet

Without this proof (a topology that works offline), P38 would fail — nodes in internet-isolated areas couldn't join the mesh. With it, P38 can treat internet connectivity as optional, enabling deployment even in regions with unreliable infrastructure.

---

## 11. Stretch Goals: Advanced Proof Obligations

### Goal 1: Formal Verification of Cold-Start Recovery

Prove using model checking (TLA+) that the boot sequence reaches a consistent state in finite time, never leaving the system in a partially-configured state that breaks downstream nodes.

**Relevant states to model:**
- Power-off (all services stopped)
- Boot in progress (NVRAM loading, services starting)
- Steady state (all services running, NTP synced)

**Invariants to check:**
- DNS entries are consistent between running-config and startup-config
- NTP master is reachable before any client queries it
- No routing table inconsistency between branches during boot

### Goal 2: Geomagnetic Tolerance Testing

Layer this lab with Field 2 (Geomagnetic Resilience) by injecting jitter into NTP time synchronization and observing whether the system remains coherent:

- Introduce ±5% time jitter on the NTP master
- Verify all clients remain within NTP sync threshold
- Measure certificate validation failures (if timestamp checks are tight)
- Prove convergence time is unaffected

### Goal 3: Scalability Analysis

Extend to 50 nodes (P38 Haiti pilot) with distributed DNS slaves and NTP secondaries:

- Model one primary (NY-R1) + 4 secondary DNS servers in separate regions
- Add 2 NTP secondaries
- Measure query latency and failover time if primary goes offline
- Verify no cascading failures if secondary nodes go offline

### Goal 4: Cryptographic Audit Trail

Add DNSSEC or DNS response signing so offline clients can verify DNS answers are authentic, not spoofed:

- Enable DNSSEC on NY-R1 (if router supports it; otherwise model it)
- Configure clients to validate DNSSEC signatures
- Test DNS spoofing attempts (forged responses should be rejected)
- Proof: offline DNS is not just functional but trustworthy

---

## 12. Self-Assessment (Field-Specific BSL)

Evaluate yourself on offline operation proof using this modified Black Start Level (BSL) scale:

```
BSL-0 AWARENESS
  - You've read this lab and understand that DNS/NTP can run locally
  - You haven't configured a router as a local nameserver yet
  
BSL-1 LAB CAPABLE
  - You completed this lab with the manual open
  - All DNS and NTP commands worked as expected
  - You can ping between branches and resolve names successfully

BSL-2 OFFLINE
  - You repeated this lab without the manual open
  - You can disable the ISP link, verify internal services still work
  - You understand why local DNS authority is needed for offline operation

BSL-3 RECOVERABLE
  - You can rebuild this lab from the topology diagram alone
  - You know which commands enable DNS, which enable NTP, why they're needed for offline
  - You can predict what breaks if you forget "copy running-config startup-config"
  - You can explain to someone else: "If the internet goes down, NY-R1 serves names locally"

BSL-4 MAINTAINABLE
  - You can modify this topology to add a secondary DNS server in Tokyo
  - You understand how to scale this design from 2 sites to 50 sites
  - You can explain when local DNS is sufficient vs. when you need external fallback
  - You can diagnose DNS/NTP issues using show commands alone

BSL-5 TEACHABLE
  - You can teach this lab's field-specific design to a colleague
  - You can explain why Black Start requires local authority (not just cloud services)
  - You can justify each architecture choice in business terms: "This design works when internet fails"
  - You can connect this proof to dcentral-core's P38 deployment need

TARGET BSL FOR THIS LAB: 3–4 (Recoverable to Maintainable)
- If you're a network engineer prepping for Haiti deployment: target BSL-4 (modify and scale the design)
- If you're learning CCNA routing: BSL-2 is sufficient (understand offline operation)
```

---

## End of Day-01-Field-1-Lab.md
