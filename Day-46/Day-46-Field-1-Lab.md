# Day 46 Field-1 Variant — Voice VLANs, ROAS & Black Start Resilience

## 0. Metadata

```
Field Focus:         Field 1: Black Start Resilience
Core Proof Obligation: Voice VLAN topology survives power loss; VLAN configuration persists in NVRAM; phones restore voice service without external DHCP/DNS/NTP after cold reboot.
Haiti Deployment Phase: P38 (pilot phase) — rural clinics need VoIP resilience without internet during outages.
Estimated Time:      2–2.5 hours
Difficulty:          Intermediate-Advanced
Relationship to Base Lab: Same voice/data VLAN separation and ROAS protocol; added persistent configuration, offline DHCP, and cold-boot verification.
Prerequisite:        Complete Day-46-Lab-Manual first.
```

---

## 1. Business Context (Field-1 Framing)

In Haiti P38 pilot deployment, a rural clinic has one WAN connection to a central hub—but power outages are frequent and unpredictable. The clinic's phone system must restore automatically after power loss, without waiting for external DNS resolution or DHCP server recovery. This lab proves that voice VLAN configuration survives power cycles and that phones can boot into working voice service using locally-cached DNS and statically-assigned IP addresses.

**The problem:** If the switch and router reboot in an undefined order after power loss, VLAN tags and inter-VLAN routing may not be re-established automatically. If voice phones rely on DHCP and external DNS to find the call server, and those services are unavailable, the office has no phones.

**This variant proves:** Voice VLAN topology (access+voice VLAN assignments, trunk configuration, ROAS subinterfaces) all stored in persistent NVRAM and re-established identically on cold boot—no manual re-configuration needed.

---

## 2. Topology Diagram (Field-1 Variant)

```
[FIELD-1 VARIANT: BLACK START VOICE RECOVERY]

LOCAL STORAGE (SW1):
├─ startup-config (VLAN 10/20, access + voice assignments)
└─ boot command to reload config before any CDP negotiation

LOCAL STORAGE (R1):
├─ startup-config (F0/0.1 @ 192.168.10.1, F0/0.2 @ 192.168.20.1)
├─ Local static routing (not relying on any routing protocol recovery)
└─ Voice IP phone database (MAC → statically-assigned IP, no DHCP)

OFFLINE DHCP SERVER (on R1 or secondary device):
├─ Pools pre-configured for VLAN 10 (data) & VLAN 20 (voice)
└─ Excludes reserved ranges (used for phones, gateways)

POWER EVENT SEQUENCE:
1. Power loss → SW1 and R1 lose power simultaneously
2. Reboot (order undefined)
3. SW1 reloads startup-config → VLAN configuration active
4. R1 reloads startup-config → subinterfaces active, local DHCP responds
5. Phones boot → request IP via DHCP on VLAN 20 → receive IP from local server
6. Phones boot firmware / call server is local (not internet-dependent)
```

---

## 3. IP Addressing Plan (Field-1 Annotations)

| Interface | VLAN | Address | Annotation |
|---|---|---|---|
| R1 F0/0.1 | 10 | 192.168.10.1/24 | Must be in startup-config, not dynamic |
| R1 F0/0.2 | 20 | 192.168.20.1/24 | Gateway for voice VLAN; local DNS also on this subnet |
| Local DNS (VLAN 20) | 20 | 192.168.20.253 | Authoritative for `callserver.local`, `ntp.local` |
| Local NTP (VLAN 20) | 20 | 192.168.20.254 | Keeps phone clock within ±100ms of system time |
| Voice IP Phone 1 | 20 | 192.168.20.100 (static/DHCP reserved) | Must receive same IP after reboot |
| Voice IP Phone 2 | 20 | 192.168.20.101 (static/DHCP reserved) | Must receive same IP after reboot |

**Field-1 Annotations:**
- All addressing must survive in startup-config; dynamic discovery is not an option
- DNS and NTP for phones are local; no internet dependency
- DHCP server is local, reachable before WAN link recovery

---

## 4. Configuration (Field-1 Optimizations)

### 4.1 Configure Access + Voice VLAN on Phones (SW1)

```text
SW1(config)# interface g1/0/2
SW1(config-if)# switchport mode access
SW1(config-if)# switchport access vlan 10
SW1(config-if)# switchport voice vlan 20
```

**Explanation for Field-1:**
- This configuration must be stored in `startup-config`, not remain in running-config only.
- Phones MUST receive 802.1Q-tagged voice traffic on VLAN 20 after reboot, regardless of when SW1 vs. R1 finishes booting.
- If this is missing from startup-config, phones boot on an untagged (VLAN 1) or default VLAN, disconnecting them from voice service.

### 4.2 Trunk Configuration (SW1) — with persistent NVRAM

```text
SW1(config)# interface g1/0/1
SW1(config-if)# switchport mode trunk
SW1(config-if)# switchport trunk allowed vlan 10,20
SW1(config-if)# exit
SW1# write memory
! Critical: Save to startup-config before power loss simulation
```

### 4.3 Router-on-a-Stick Subinterfaces (R1) — persistent NVRAM storage

```text
R1(config)# interface f0/0.1
R1(config-subif)# encapsulation dot1q 10
R1(config-subif)# ip address 192.168.10.1 255.255.255.0
R1(config-subif)# exit

R1(config)# interface f0/0.2
R1(config-subif)# encapsulation dot1q 20
R1(config-subif)# ip address 192.168.20.1 255.255.255.0
R1(config-subif)# exit

R1(config)# interface f0/0
R1(config-if)# no shutdown
R1(config-if)# exit
R1# write memory
! Critical: Save configuration to startup-config
```

**Explanation for Field-1:**
- After power loss, R1 reads startup-config on boot.
- Both subinterfaces MUST be present and identically configured, or phones cannot route between VLANs.
- Persistent NVRAM ensures this happens automatically.

### 4.4 Local DHCP Server Configuration (R1)

```text
R1(config)# ip dhcp pool VLAN20_VOICE
R1(dhcp-config)# network 192.168.20.0 255.255.255.0
R1(dhcp-config)# default-router 192.168.20.1
R1(dhcp-config)# dns-server 192.168.20.253
R1(dhcp-config)# option 150 ip 192.168.20.254
! Option 150 points phones to local call server
R1(dhcp-config)# exit

R1(config)# ip dhcp pool VLAN10_DATA
R1(dhcp-config)# network 192.168.10.0 255.255.255.0
R1(dhcp-config)# default-router 192.168.10.1
R1(dhcp-config)# dns-server 192.168.20.253
R1(dhcp-config)# exit

R1(config)# ip dhcp excluded-address 192.168.20.1 192.168.20.100
R1(config)# write memory
```

**Explanation for Field-1:**
- DHCP server is local, running on R1 itself.
- After power loss, when R1 reboots, DHCP is immediately available (no WAN dependency).
- Option 150 directs phones to a local Cisco call manager or IP-PBX on VLAN 20.

---

## 5. Field-1 Verification Steps

### 5.1 Pre-Power-Loss Baseline

```text
SW1# show vlan brief
VLAN Name           Status    Ports
10   DATA           active    (associated ports)
20   VOICE          active    (associated ports)

SW1# show interfaces switchport | include "Gi1/0/2|Access|Voice"
Name: Gi1/0/2
Administrative Mode: static access
Access Mode VLAN: 10 (data)
Voice VLAN: 20 (voice)

R1# show ip interface brief
FastEthernet0/0        unassigned      YES NVRAM  up       up
FastEthernet0/0.1      192.168.10.1    YES manual up       up
FastEthernet0/0.2      192.168.20.1    YES manual up       up

R1# show startup-config | include "(interface|encapsulation|ip address)"
! Verify subinterfaces are in startup-config
```

### 5.2 Simulate Power Loss

```text
1. Save all running-config to startup-config on both SW1 and R1
   SW1# write memory
   R1# write memory

2. Power off both SW1 and R1 simultaneously (simulated in Packet Tracer / hardware lab)

3. Power on both devices simultaneously (order undefined)
   - Allow 30–60 seconds for full boot
```

### 5.3 Post-Boot Verification (Black Start Proof)

```text
[After both devices have rebooted and reached stable state]

On SW1:
SW1# show vlan brief
! VLAN 10 and 20 must be present and active

SW1# show interfaces switchport | grep "Voice VLAN"
! Must show "Voice VLAN: 20"

SW1# show interfaces trunk
! Must show VLAN 10,20 allowed on trunk to R1

On R1:
R1# show ip interface brief | grep "192.168"
! Both F0/0.1 (192.168.10.1) and F0/0.2 (192.168.20.1) must show up/up

R1# show ip dhcp binding
! DHCP leases for phones on VLAN 20 should begin populating as phones request IPs

R1# show ip dhcp pool
! Both VLAN10_VOICE and VLAN10_DATA pools must be active and serving requests
```

### 5.4 Voice Service Recovery (Proof Obligation)

```text
On a voice IP phone connected to VLAN 20 port:

1. Phone boots → requests IP via DHCP on VLAN 20
   - If DHCP response arrives within 10 seconds, IP assigned
   - If no response, phone falls back to APIPA (169.254.x.x) — this is FAILURE

2. Phone queries DNS for `callserver.local` (via Option 150 or local DNS)
   - If resolved to 192.168.20.254 locally, phone can reach call server
   - If NXDOMAIN or timeout, phone cannot register — this is FAILURE

3. Phone registers with call server on VLAN 20
   - If registration succeeds, voice service is UP
   - Proof obligation: PASSED if voice dialtone available within 30s of boot

Repeat 3 times; record time to voice service availability each time.
```

---

## 6. Expected Output Gallery (Field-1 Scenarios)

**After cold reboot, on R1, DHCP binding table:**

```text
R1# show ip dhcp binding
Bindings from all pools

IP address          Client-ID/          Lease expiration        Type       State
192.168.20.100      00:03:6e:1c:6e:e1   Sep 20 2026 09:00 AM    Automatic  Active
192.168.20.101      00:03:6e:1c:6f:a2   Sep 20 2026 09:02 AM    Automatic  Active
192.168.10.5        00:11:22:33:44:55   Sep 20 2026 09:01 AM    Automatic  Active

(Phones 1 & 2 on VLAN 20; PC on VLAN 10 — all received IPs from local DHCP after reboot)
```

**SW1 shows VLAN persistence post-reboot:**

```text
SW1# show startup-config | begin vlan
vlan 10
 name DATA
vlan 20
 name VOICE
interface GigabitEthernet1/0/2
 switchport mode access
 switchport access vlan 10
 switchport voice vlan 20

(Config survived power loss and was re-applied on boot)
```

---

## 7. Common Field-1 Mistakes

1. **Not saving configuration to NVRAM before power-loss simulation** — the config is lost on reboot; VLAN assignments disappear.
2. **Configuring DHCP server on a remote device instead of locally** — after power loss, DHCP is unreachable until WAN link is restored, phones cannot boot.
3. **Using external NTP instead of local NTP** — phone clock skew grows during outages, affecting call timestamps and CDR records.
4. **DNS configured to external servers only** — after power loss, phone cannot resolve call server; must have local authoritative DNS.
5. **Access + voice VLAN configuration missing from startup-config** — saved in running-config only; lost on reboot, phones boot on default/wrong VLAN.

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Symptom: Phones boot but cannot get IP address**

```text
Step 1: Is DHCP server running locally on R1?
  R1# show ip dhcp pool
  → If no pools, DHCP is not configured; configure pools on R1 (see 4.4)

Step 2: Does DHCP broadcast reach phones on VLAN 20?
  SW1# show ip dhcp snooping binding
  → If no bindings, DHCP Discover is not reaching R1; verify trunk allows VLAN 20

Step 3: Is DHCP relaying correctly to the VLAN 20 pool?
  R1# debug ip dhcp server events (limited to 10 seconds)
  → Look for DHCPDISCOVER, DHCPOFFER messages
  → If absent, DHCP is not receiving requests; verify phone is on correct VLAN

Step 4: Is the lease IP within the correct pool range?
  R1# show ip dhcp binding
  → Check that assigned IP is in 192.168.20.0/24 (not 192.168.10.0/24)
  → If wrong pool, verify phone's VLAN assignment or DHCP broadcast forwarding
```

**Symptom: Phones have IP but cannot reach call server**

```text
Step 1: Can phone ping 192.168.20.1 (R1 gateway)?
  Phone#ping 192.168.20.1
  → If timeout/unreachable, VLAN 20 routing is broken; check R1 subinterface status

Step 2: Does phone resolve call server name?
  Phone#nslookup callserver.local 192.168.20.253
  → If NXDOMAIN, local DNS does not have that record; add static host entry

Step 3: Can phone reach local DNS on 192.168.20.253?
  Phone#ping 192.168.20.253
  → If unreachable, DNS server is not on VLAN 20 or is down after power loss
```

---

## 9. Design Analysis: Field-1 Reasoning

Traditional CCNA labs assume continuous internet access and external services (DHCP, DNS, NTP). Black Start resilience flips that assumption: the office must function offline, without any WAN service. Voice VLANs prove this is possible by:

1. **Persistent topology storage:** VLAN config in NVRAM survives power cycles—no manual reconfiguration after outage.
2. **Local services only:** DHCP server on R1, DNS on VLAN 20, NTP on VLAN 20—zero external dependencies.
3. **Stateless boot sequence:** Phones boot identically regardless of whether they boot first or last—there's no race condition or ordering dependency.

This topology unblocks the P38 Haiti pilot: rural clinics can restore voice service within minutes of power restoration, with zero IT intervention. The lab proves that VLAN resilience is achievable at CCNA scale.

---

## 10. Real-World Parallel: Haiti P38 Pilot

A clinic in Cap-Haïtien relies on IP phones to coordinate patient care with a regional hospital 50km away. During a power outage (4–8 hours typical):

1. Power lost → phones powerless.
2. Power restored → within 60 seconds, phones auto-boot and regain IP via local DHCP.
3. Within 2 minutes, voice calls between clinic and hospital resume.
4. Patient care decisions no longer delayed waiting for email / SMS.

This variant proves Step 2–3 are achievable without external infrastructure, unblocking P38 telemedicine.

---

## 11. Stretch Goals: Advanced Field-1 Proof

- Formal verification: Prove that VLAN configuration in NVRAM cannot become inconsistent between SW1 and R1 after any reboot sequence (no data-loss risk).
- Power-cycle stress test: Reboot the topology 10 times in rapid succession; verify voice service recovers identically each time (no degradation from repeated cold starts).
- Configuration drift detection: Run a script that compares startup-config vs. running-config after each boot; alert if any mismatch (early warning of config corruption).

---

## 12. Self-Assessment

```
BSL-0 AWARENESS      - You've read this lab once. You couldn't replicate it.
BSL-1 LAB CAPABLE    - You completed this lab with the manual open, and it worked.
BSL-2 OFFLINE        - You could repeat this lab with the manual, no internet.
BSL-3 RECOVERABLE    - You could rebuild this topology from scratch; given a power-loss scenario, you'd know how to verify voice recovery.
BSL-4 MAINTAINABLE   - You could modify this lab for different VLAN numbers, phone models, or deployment sites and still hit the same Black Start proof obligation.
BSL-5 TEACHABLE      - You could teach this lab's field-specific design to someone else, correctly explaining why persistent NVRAM and local services matter for offline resilience.

Target BSL for this lab: 3–4
```

---

**Created:** August 29, 2026  
**Field:** Black Start Resilience (Field-1)  
**Status:** Complete — ready for Phase P38 pilot training
