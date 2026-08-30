# Day 43 — Field 1 (Black Start): DHCP Snooping with Offline Tamper-Resistant Binding Database

---

## 0. Metadata
| Field | Value |
|---|---|
| **Field Focus** | Field 1: Black Start Systems (Offline DHCP operation, tamper-resistant local binding database, cold-start device identity recovery) |
| **Core Proof Obligation** | DHCP Snooping database survives power loss. When network is offline or WAN is down, devices can verify their identity via locally-stored MAC→IP bindings. Device identity persists across reboots without external DHCP server. |
| **Haiti Deployment Phase** | P38+ — mesh must operate during power outages; device identity must survive cold restart |
| **Estimated Time** | 3–4 hours |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | DHCP Snooping from Day-43 base; adds local storage, cold-recovery procedures, offline binding verification |
| **Prerequisite** | Day-31-Field-1 (offline NTP), Day-43-Research-Paper |

---

## 1. Business Context (Field-Specific Framing)
In Haiti, power outages are common and can last days. If a device loses power and its DHCP lease, how does it recover its IP when the mesh reboots? Without a local DHCP Snooping database, devices can't determine which IPs are which without external DHCP servers. Field-1 proves: **DHCP Snooping database is stored offline, survives power loss, and enables devices to recover their identities even when WAN is down and DHCP servers are offline.**

---

## 2. Topology Diagram
**FIELD-1 VARIANT (OFFLINE DHCP SNOOPING):**
```
Switch S1 with DHCP Snooping (Field-1 modifications):
├─ Untrusted ports: Connected to devices (PCs, printers)
├─ Trusted port: Connected to DHCP server (R1)
├─ Snooping database (new):
│  ├─ Storage: Local NVRAM (non-volatile, survives power loss)
│  ├─ Entry format: MAC → IP, Binding timestamp, Lease expiration
│  └─ Example:
│     AA:BB:CC:11:22:33 → 192.168.1.50, bound 2026-08-30T14:00:00Z, expires 2026-08-31T02:00:00Z
│
├─ [POWER LOSS EVENT]
│  └─ DHCP server goes offline
│  └─ Network is isolated
│
├─ [COLD START RECOVERY]
│  ├─ Switch reboots
│  ├─ Snooping database loaded from NVRAM
│  ├─ Device (MAC AA:BB:CC:11:22:33) sends DHCP renewal request
│  │  └─ Switch checks snooping database: "MAC AA:BB:CC:11:22:33 was bound to 192.168.1.50"
│  │  └─ If binding is still valid (not expired): Allow the device to use 192.168.1.50 offline
│  └─ Result: Device identity recovered without DHCP server
```

---

## 3. IP Addressing Plan
| Device MAC | Stored IP | Binding Time | Expiration | Recovery Status |
|---|---|---|---|---|
| AA:BB:CC:11:22:33 | 192.168.1.50 | 2026-08-30T14:00Z | 2026-08-31T02:00Z | Valid (survives offline period) |
| AA:BB:CC:11:22:44 | 192.168.1.51 | 2026-08-30T14:15Z | 2026-08-31T02:15Z | Valid |
| AA:BB:CC:11:22:55 | 192.168.1.52 | 2026-08-30T14:30Z | 2026-08-31T02:30Z | Valid |

---

## 4. Configuration (Field-Specific Optimizations)
```text
! ===== DHCP SNOOPING WITH OFFLINE STORAGE =====
S1(config)#ip dhcp snooping
! Enable global DHCP Snooping

S1(config)#ip dhcp snooping vlan 1
! Enable snooping on VLAN 1 (local clinic network)

S1(config)#ip dhcp snooping trust ports ethernet0/0
! Trust the port connected to DHCP server (R1)

S1(config)#ip dhcp snooping binding max-bindings 1000
! Store up to 1000 MAC→IP bindings locally

! ===== OFFLINE STORAGE: Save snooping database to NVRAM =====
S1(config)#ip dhcp snooping database binding NVRAM:dhcp-bindings.db
! Store snooping database in non-volatile memory
! Explanation: If power is lost, bindings survive in NVRAM

S1(config)#ip dhcp snooping database binding persistent
! Persist database across reboots

S1(config)#ip dhcp snooping database binding refresh-timer 3600
! Refresh database from DHCP server every 1 hour (if server is online)

! ===== COLD-START RECOVERY: Use local bindings when offline =====
S1(config)#ip dhcp snooping offline-mode enable
! When DHCP server is unreachable, use local bindings
! Devices can recover their IPs from the offline database

S1(config)#exit
S1#copy running-config startup-config

! Verify snooping database is saved
S1#show ip dhcp snooping binding summary
  Total number of bindings: 500
  Bindings in NVRAM: 500 (100% persistent)
```

---

## 5. Field-Specific Verification Steps

### Scenario 1: Normal Operation (DHCP Server Online)
```text
Step 1: Device requests IP via DHCP
  PC1 sends DHCP DISCOVER

Step 2: DHCP server (R1) responds
  R1 sends DHCP OFFER: 192.168.1.50

Step 3: Switch records binding in snooping database
  S1 snooping: MAC AA:BB:CC:11:22:33 → 192.168.1.50
  S1 saves to NVRAM: "binding-entry-1: AA:BB:CC:11:22:33 192.168.1.50"

PROOF OBJECTIVE MET: Binding is stored locally in NVRAM (survives power loss).
```

### Scenario 2: Power Loss and Cold-Start Recovery
```text
Step 1: Power failure (DHCP server and switch go down)
  2026-08-30T18:00:00Z: Power loss
  DHCP server offline for 4 hours
  Switch offline for 4 hours

Step 2: Power restored; switch reboots
  2026-08-30T22:00:00Z: Power restored
  Switch boots and loads snooping database from NVRAM
  S1 memory: 500 MAC→IP bindings loaded

Step 3: Device reboots and requests IP
  PC1 boots, sends DHCP DISCOVER
  PC1 expects to get 192.168.1.50 (its previous IP)

Step 4: Switch responds using local bindings (no DHCP server yet)
  S1 checks snooping database: "AA:BB:CC:11:22:33 was bound to 192.168.1.50"
  S1 sends DHCP ACK (offline mode): 192.168.1.50
  Explanation: ACK is generated locally from binding database, DHCP server is not consulted

Step 5: Device receives offline DHCP ACK and configures IP
  PC1 receives IP 192.168.1.50 (same as before power loss)
  Result: Device identity is recovered without external DHCP server

PROOF OBJECTIVE MET: Device identity persists across power loss using offline binding database.
```

### Scenario 3: Tamper Detection (DHCP Snooping Binding Poisoning Attack)
```text
Step 1: Attacker attempts to poison snooping database
  Attacker sends forged DHCP ACK claiming "MAC X is assigned IP Y"

Step 2: Switch validates DHCP ACK
  S1 checks: Is this ACK from trusted DHCP port?
  Expected: Only trusted DHCP port (port connected to R1) can send ACKs
  If attacker sends from untrusted port: Packet is dropped

Step 3: Poisoning attack fails
  Attacker packet is dropped
  Snooping database is not modified
  Original bindings remain intact

PROOF OBJECTIVE MET: Offline binding database is tamper-resistant; unauthorized changes are blocked.
```

---

## 6. Expected Output Gallery
```text
S1#show ip dhcp snooping binding

MacAddress        IpAddress      Lease(sec)  Type       VLAN  Interface
------------------  -----------  ----------  --------  ----  ----------
AA:BB:CC:11:22:33   192.168.1.50   86399     dhcp       1     Fa0/1
AA:BB:CC:11:22:44   192.168.1.51   86399     dhcp       1     Fa0/2
AA:BB:CC:11:22:55   192.168.1.52   86399     dhcp       1     Fa0/3

Total number of bindings: 3

[OFFLINE STORAGE STATUS]
Bindings stored in NVRAM: Yes
Database file: NVRAM:dhcp-bindings.db
Size: 2 KB
Last updated: 2026-08-30T22:00:00Z
Offline mode enabled: Yes
Offline recovery capability: Yes (devices can recover IPs without DHCP server)
```

---

## 7. Common Field-Specific Mistakes
- Not saving snooping database to NVRAM (database lost during power failure)
- Offline mode not enabled (switch can't respond to DHCP requests when server is down)
- Bindings not refreshed periodically (stale bindings persist after device replacement)

## 8. Troubleshooting by Field
**Problem: "Device cannot recover IP after power loss"**
```text
Step 1: Verify snooping database is persistent
  S1#show ip dhcp snooping binding summary | include "NVRAM"
  Expected: "Bindings in NVRAM: [count]"
  If 0: Database is not being saved; configure "persistent" mode

Step 2: Verify offline mode is enabled
  S1#show running-config | include "offline-mode"
  Expected: "ip dhcp snooping offline-mode enable"
  If missing: Enable offline mode

Step 3: Check if device's binding is in database
  S1#show ip dhcp snooping binding | include "[device-MAC]"
  Expected: Device's MAC is listed with assigned IP
  If missing: Device never requested IP before power loss; first boot has no saved binding
```

---

## 9. Design Analysis
**Why does offline DHCP Snooping matter for Black Start (Field 1)?**

In blackout conditions, DHCP servers are offline and devices cannot obtain IPs. With DHCP Snooping's offline binding database, devices can recover their previous IPs immediately upon reboot, enabling the network to function until DHCP servers come back online.

---

## 10. Real-World Parallel
**D-Central Module:** `local-addressing-authority` (offline-capable DHCP)
**Haiti Phase:** P38+ — mesh must survive extended power outages

---

## 11. Stretch Goals
- Cryptographic signing of offline bindings (tamper proof)
- Binding expiration logic during offline period (prevent stale bindings)

---

## 12. Self-Assessment (Field-Specific BSL)
```
Target BSL: BSL-3 to BSL-4
Understand offline DHCP Snooping, local binding storage, cold-start recovery.
```

---

*Day 43 — Field 1 (Black Start) Lab — August 2026.*
