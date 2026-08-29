# Day 58 Field-1 Variant — Wireless LANs (Black Start Resilience)

## 0. Metadata

```
Field Focus:         Field 1: Black Start Resilience
Core Proof Obligation: Wireless clients reconnect and regain network access within 60 seconds of AP reboot; cached credentials enable offline operation.
Haiti Deployment Phase: P45 (expansion) — wireless hotspots must operate offline during power events; clients should not lose connectivity simply because AP power cycled.
Estimated Time:      2 hours
Difficulty:          Intermediate
Relationship to Base Lab: Same 802.11 protocol; added credential caching, offline RADIUS (cached), and cold-reboot reconnection timing.
Prerequisite:        Complete Day 58 Lab Manual first; understand 802.11 association and WPA2/WPA3 basics.
```

---

## 1. Business Context (Field-1 Framing)

In Haiti P45, wireless hotspots serve communities during power-constrained conditions. An AP that requires a central RADIUS server for every authentication becomes a bottleneck — if the server is offline (entire island power loss), no clients can associate, even if the AP is on UPS.

**The problem:** Traditional WPA2 requires real-time RADIUS communication for each client association. If the RADIUS server is offline, the AP rejects all new associations, even though the AP itself is powered and operational.

**This variant proves:** With cached RADIUS credentials and local offline validation, a wireless AP can authenticate clients locally and resume service within 60 seconds of reboot, even if the central RADIUS server is unreachable.

---

## 2. Topology Diagram (Field-1 Variant)

```
[FIELD-1 VARIANT — Black Start Wireless]

AP (Access Point)
├─ Local credential cache (non-volatile storage)
├─ UPS-backed power
├─ Offline authentication logic (falls back to cached credentials if RADIUS is down)
└─ 802.11 beacon (always broadcast, RADIUS-independent)

     WiFi Range
        ↓
     Client-1 (laptop, cached credentials for AP)
     Client-2 (mobile, cached credentials for AP)
     Client-3 (new device, manual PSK entry)

[POWER EVENT SIMULATION]
1. Configure AP with both RADIUS and local PSK fallback
2. Clients connect via RADIUS (verified on central server)
3. Power cycle AP (RADIUS server stays online but AP is offline)
4. Reboot AP; RADIUS is unreachable initially
5. Clients attempt reassociation
6. Verify clients reconnect via cached local credentials within 60 seconds
7. Verify RADIUS connectivity is restored; subsequent clients can use central server
```

---

## 3. IP Addressing Plan (Field-1 Annotations)

| Device | IP | Purpose |
|---|---|---|
| AP (WLAN Interface) | 10.0.1.1/24 | Wireless network gateway |
| AP (Mgmt) | 10.0.100.1/24 | Management access (separate VLAN) |
| Client-1 | 10.0.1.10/24 (DHCP) | Wireless client (cached creds) |
| Client-2 | 10.0.1.11/24 (DHCP) | Wireless client (cached creds) |
| RADIUS Server (normal ops) | 10.0.100.50 | Central authentication (offline during test) |

**Field-1 Annotations:**
- WLAN gateway IP is configured locally (not learned dynamically)
- RADIUS server IP is configured but AP doesn't depend on it for cached credentials
- Client IPs via DHCP from AP's local pool (not dependent on external DHCP server)

---

## 4. Configuration (Field-1 Optimizations)

### 4.1 AP: Configure WLAN with Local PSK + RADIUS Fallback

```text
AP(config)#ip dhcp pool WLAN
AP(dhcp-config)#network 10.0.1.0 255.255.255.0
AP(dhcp-config)#default-router 10.0.1.1
AP(dhcp-config)#exit

AP(config)#interface Vlan 1
AP(config-if)#ip address 10.0.1.1 255.255.255.0
AP(config-if)#no shutdown
AP(config-if)#exit

AP(config)#dot11 ssid "HaitiHotspot-P45"
AP(config-ssid)#authentication open
! Open SSID; security handled in WPA2 layer below

AP(config)#interface dot11Radio0
AP(config-if)#no shutdown
AP(config-if)#exit

AP(config)#interface Dot11Radio0.1
AP(config-subif)#encapsulation dot1Q 1
AP(config-subif)#ip address 10.0.1.1 255.255.255.0
AP(config-subif)#exit

AP(config)#interface BVI1
AP(config-if)#ip address 10.0.1.1 255.255.255.0
AP(config-if)#no shutdown
AP(config-if)#exit
```

### 4.2 AP: Configure WPA2 with Local Credential Cache

```text
AP(config)#interface dot11Radio0
AP(config-if)#dot11 ssid "HaitiHotspot-P45"
AP(config-if)#exit

! Configure WPA2 with PSK (Pre-Shared Key) as primary + optional RADIUS
AP(config)#dot11 ssid "HaitiHotspot-P45"
AP(config-ssid)#authentication network-eap eap_fast local_eap_db
! Use local EAP database (credential cache) as fallback if RADIUS is down

AP(config-ssid)#authentication open eap1323
! Also accept open authentication with subsequent WPA2 negotiation

AP(config-ssid)#wpa-psk ascii P@ssw0rd123!
! Pre-shared key for local fallback (cached, survives power loss in NVRAM)

AP(config-ssid)#exit

! Configure RADIUS as preferred (tried first on each client association)
AP(config)#radius server HaitiRADIUS
AP(config-radius)#address ipv4 10.0.100.50 auth-port 1812 acct-port 1813
AP(config-radius)#key SharedSecret123
AP(config-radius)#exit

AP(config)#interface dot11Radio0
AP(config-if)#dot11 ssid "HaitiHotspot-P45"
AP(config-if)#authentication network-eap eap_fast radius_server
AP(config-if)#authentication fallback eap1323
! Fallback to local EAP database if RADIUS is unreachable
AP(config-if)#exit
```

**Explanation for Field-1:**
- `wpa-psk ascii`: Stores PSK in NVRAM (survives power loss)
- `fallback eap1323`: If RADIUS server is unreachable, use local credential database
- When RADIUS is online, it's used (central authentication); when offline, local cache takes over

### 4.3 AP: Save Configuration to NVRAM

```text
AP(config)#exit
AP#write memory
```

---

## 5. Field-1 Verification Steps

### 5.1 Pre-Power-Loss: Clients Connected via RADIUS

```text
AP#show clients
Client MAC Address         IP Address       SSID            Authentication
aabbccdd0001              10.0.1.10        HaitiHotspot-P45 RADIUS-authenticated
aabbccdd0002              10.0.1.11        HaitiHotspot-P45 RADIUS-authenticated

[On Client-1]
Client-1#show interfaces wifi0
WiFi Interface WiFi0 is UP
  IP Address: 10.0.1.10
  Connected to: HaitiHotspot-P45
  Signal: -45 dBm
  Authentication: WPA2-Enterprise (RADIUS)
```

**Expected:** Clients are connected via RADIUS authentication to the central server.

### 5.2 Verify Credential Cache is Persistent

```text
AP#show wpa-psk
SSID "HaitiHotspot-P45"
Pre-shared key: P@ssw0rd123!
Status: Local cache enabled
Fallback to local EAP: Enabled
```

### 5.3 Simulate Power Loss (AP Only)

```text
AP# reload
! Wait for AP to fully shut down
```

Clients remain powered and connected (or attempt to reconnect as AP is offline). Record the time.

### 5.4 Reboot AP; RADIUS is Intentionally Offline

```text
[Simulate RADIUS server going offline at the same time as AP]
[Or don't start RADIUS after AP reboots]

[Wait ~30 seconds for AP to fully boot and start broadcasting beacon]
```

### 5.5 Measure Client Reconnection Time

```text
AP#show clock
*10:15:45.123 UTC <-- AP fully booted; SSID beacon starting

[On Client-1]
Client-1# [WiFi icon flashing, attempting reconnection]
[T~10s] Connected to HaitiHotspot-P45
[T~15s] IP Address: 10.0.1.10 (DHCP lease acquired from AP)

[On AP]
AP#show clients
Client MAC Address         IP Address       SSID            Authentication
aabbccdd0001              10.0.1.10        HaitiHotspot-P45 Local-PSK (cached)
aabbccdd0002              10.0.1.11        HaitiHotspot-P45 Local-PSK (cached)
```

**PROOF OBLIGATION PASS:** Clients reconnected within ~15 seconds of AP boot, using cached local credentials (not RADIUS, which is offline). Reconnection time < 60 seconds target achieved.

### 5.6 Verify RADIUS Failover (When Server Comes Back Online)

```text
[Bring RADIUS server back online]

AP#show radius statistics
RADIUS server reachability: UP
Last RADIUS request: 10:16:45
```

New clients can now use RADIUS authentication. Existing clients may stay on local cache or be refreshed to RADIUS (depending on session timeout).

---

## 6. Expected Output Gallery (Field-1 Scenarios)

### AP Booting with Offline RADIUS

```
[AP startup log]
*00:00:15: DHCP pool "WLAN" created
*00:00:16: Wireless interface DOT11Radio0 brought up
*00:00:18: SSIDs loaded from NVRAM; SSID "HaitiHotspot-P45" active
*00:00:20: WPA2-PSK with local cache enabled
*00:00:21: RADIUS server 10.0.100.50 unreachable (expected; server offline)
*00:00:22: Fallback to local EAP database; credentials loaded from NVRAM
*00:00:23: Ready to accept client associations via local PSK

[Client association attempt]
*00:00:30: Client aabbccdd0001 association request received
*00:00:31: WPA2-PSK authentication via local cache (RADIUS unavailable)
*00:00:32: Client authenticated successfully using cached PSK "P@ssw0rd123!"
*00:00:33: DHCP offer sent to client; lease 10.0.1.10
*00:00:34: Client aabbccdd0001 fully associated
```

---

## 7. Common Field-1 Mistakes

1. **Not saving credential cache to NVRAM** → PSK only in running-config; power loss loses it. After reboot, AP has no fallback credentials.
   - **Fix:** Use `write memory` after configuring PSK to persist it.

2. **Not configuring DHCP pool on AP** → Clients can't get IP addresses; "connected but no internet" symptom.
   - **Fix:** Ensure AP has a local DHCP pool configured for the WLAN VLAN.

3. **RADIUS server set as mandatory (no fallback)** → If RADIUS is unreachable, no clients can connect, even with local PSK.
   - **Fix:** Configure fallback: `authentication fallback eap1323`.

4. **Forgetting to verify RADIUS server IP/port during config** → Typo in RADIUS server address means RADIUS requests fail silently; fallback happens but isn't obvious.
   - **Fix:** Test `ping 10.0.100.50` from AP before reboot; verify RADIUS connectivity.

---

## 8. Troubleshooting by Field-1 (Diagnostic Method)

**Symptom: "After AP reboot with RADIUS offline, clients can't connect (stuck on 'Connecting...')"**

```text
Step 1: Is the SSID being broadcast?
  show dot11 ssid
  → If SSID doesn't appear, AP didn't load it from NVRAM. Reconfigure and save.

Step 2: Is the WPA2-PSK configuration present?
  show wpa-psk
  → If blank or missing, local cache wasn't persisted. Reconfigure `wpa-psk ascii` and `write memory`.

Step 3: Is fallback to local EAP enabled?
  show interface dot11radio0 | include "authentication fallback"
  → If fallback is disabled, AP won't use local credentials when RADIUS is offline.

Step 4: Is the AP broadcasting a beacon?
  show dot11 | include "SSID broadcast"
  → If beacons aren't transmitted, clients can't see the SSID. Check radio power and channel.

Step 5: Check AP logs for RADIUS connectivity issues
  show log | include "RADIUS"
  → Should see "RADIUS server unreachable" message confirming fallback is active.
```

**Symptom: "Clients connected via local PSK, but then are 'stuck' when RADIUS comes back online"**

```text
Step 1: Are new client associations using RADIUS now?
  [Try connecting a new client; check authentication method]
  → New clients should use RADIUS if server is reachable.

Step 2: Are existing clients still using local PSK?
  show clients | include "Authentication"
  → If showing "Local-PSK" after RADIUS is up, session didn't refresh. Wait for session timeout, then reconnect.

Step 3: Configure session timeout to force re-authentication
  [Configure an inactivity timer to refresh auth periodically]
  → This ensures clients re-authenticate via RADIUS once it's available (not strictly required for Field-1).
```

---

## 9. Design Analysis: Field-1 Reasoning

**Why does this field-specific topology matter for Black Start?**

Traditional wireless hotspots depend on central RADIUS servers for authentication. During island-wide power events, a centralized server goes offline. With Black Start resilience, the AP can continue serving clients using locally-cached credentials.

This doesn't replace centralized authentication (it's a fallback), but it ensures that network access doesn't catastrophically fail just because a power event interrupted communication with a distant server.

For Haiti P45, this means:
- Hotspots remain operational during server-connectivity losses (not just AP power loss)
- Automatic fallback to local cache (no manual intervention)
- Network access within 60 seconds of AP recovery

---

## 10. Real-World Parallel: Haiti Deployment Phase

**P45 Expansion — Offline-First Wireless**

In P45, wireless hotspots are deployed in community centers and schools with limited power budgets. A central RADIUS server (if it exists) may be in Port-au-Prince, 500+ km away. Network connectivity to the server is sporadic (satellite link, overland RF). 

This lab proves that even if server connectivity is unavailable, local credential caching allows clients to authenticate and regain network access. It's not about removing the central server (which provides policy, auditing, etc.) — it's about surviving temporary disconnections gracefully.

---

## 11. Stretch Goals: Advanced Proof Obligations

1. **Credential freshness validation:** Implement a mechanism where cached credentials include a timestamp. Verify cached credentials older than 24 hours are not accepted (forcing re-authentication via RADIUS when it's available).

2. **Scalability:** Configure 10 clients with diverse cached credential sets (some know the PSK, some have different EAP identities). Verify all 10 can authenticate after AP reboot using their respective cached credentials.

3. **Audit trail:** Log all credential cache accesses (when local PSK is used vs. RADIUS). Prove that administrators can identify which clients used fallback authentication during a RADIUS outage.

---

## 12. Self-Assessment (Field-1 BSL)

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open; clients reconnected via cache.
BSL-2 OFFLINE        - You could repeat this lab with the manual, no internet.
BSL-3 RECOVERABLE    - You could rebuild this lab from the topology diagram; given black-start scenarios, 
                        you'd know to test credential caching and RADIUS fallback.
BSL-4 MAINTAINABLE   - You could extend this to 3 APs (mesh AP topology) with a shared credential cache.
BSL-5 TEACHABLE      - You could teach why RADIUS credential caching is essential for offline-first wireless, 
                        and how to implement fallback without compromising security.

Target BSL for this lab: 3–4
```

---

**Push this file via Python payload JSON to RedjiJB-Labs/Day-58-Field-1-Lab.md**
