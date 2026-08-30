# Day 51 Field-1 Variant — Dynamic ARP Inspection Offline Resilience

## 0. Metadata

```
Field Focus:         Field 1: Black Start Resilience
Core Proof Obligation: DAI configuration (trust boundaries, validation rules) persists in NVRAM; ARP spoofing prevention resumes after power loss; DHCP Snooping binding table (DAI dependency) survives reboot.
Haiti Deployment Phase: P38 (pilot phase) — DAI depends on DHCP Snooping; both must survive power loss without re-configuration.
Estimated Time:      1.5–2 hours
Difficulty:          Intermediate-Advanced
Relationship to Base Lab: Same DAI configuration; added persistent NVRAM storage and post-boot verification (Day-50 DHCP Snooping must already be working).
Prerequisite:        Complete Day-51-Lab-Manual and Day-50-Field-1-Lab first.
```

---

## 1. Business Context (Field-1 Framing)

DAI protects against ARP spoofing by validating ARP replies against the DHCP Snooping binding table. If the switch reboots and loses DAI configuration or the binding table, ARP spoofing attacks become possible. This lab proves DAI and its dependency (DHCP Snooping) both persist in NVRAM and re-activate automatically.

---

## 2. Topology Diagram (Field-1 Variant)

```
[FIELD-1: OFFLINE DAI PERSISTENCE]

R1 (DHCP Server + Gateway)
    │
    ├─ G0/1 (trusted for DHCP Snooping)
    ├─ G0/1 (trusted for DAI)
    └─ startup-config (NVRAM):
       ├─ DHCP Snooping enabled, G0/1 trusted
       ├─ DAI enabled
       ├─ DAI trusts same G0/1
       ├─ DAI validates untrusted ports against DHCP bindings
       └─ Access ports (F0/1–F0/3) untrusted

[POWER LOSS → REBOOT]
→ Binding table survives (DHCP Snooping from Day-50-Field-1)
→ DAI re-activates
→ Untrusted ARP replies validated against bindings
→ ARP spoofing blocked immediately post-reboot
```

---

## 3. IP Addressing Plan (Field-1 Annotations)

Same as base Day-51, with annotation that DHCP Snooping + DAI **both must survive cold reboot**.

---

## 4. Configuration (Field-1 Optimizations)

### 4.1 DHCP Snooping (Same as Day-50-Field-1)

```text
SW1(config)# ip dhcp snooping
SW1(config)# ip dhcp snooping vlan 1
SW1(config)# interface g0/1
SW1(config-if)# ip dhcp snooping trust
SW1(config-if)# exit
SW1(config)# interface range f0/1-f0/3
SW1(config-if-range)# no ip dhcp snooping trust
SW1(config-if-range)# exit
SW1(config)# no ip dhcp snooping information option
```

### 4.2 Dynamic ARP Inspection (DAI)

```text
SW1(config)# ip arp inspection vlan 1
! Enable DAI on VLAN 1 (where ARP traffic flows)

SW1(config)# interface g0/1
SW1(config-if)# ip arp inspection trust
! G0/1 (toward R1) is trusted for ARP Replies
SW1(config-if)# exit

SW1(config)# interface range f0/1-f0/3
SW1(config-if-range)# no ip arp inspection trust
! Access ports are untrusted; ARP Replies are validated
SW1(config-if-range)# exit

SW1(config)# ip arp inspection validate src-mac dst-mac ip
! Additional validation: source MAC, destination MAC, and IP address

SW1# write memory
! CRITICAL: Save to startup-config
```

**Explanation for Field-1:**
- DAI validates untrusted ARP Replies against DHCP Snooping bindings (dependency).
- Trust boundary must survive in NVRAM; re-applied on reboot.
- Without NVRAM persistence, DAI is ineffective post-reboot.

---

## 5. Field-1 Verification Steps

### 5.1 Pre-Power-Loss Baseline

```text
SW1# show ip arp inspection vlan 1
Source Mac Validation: Enabled
Dest Mac Validation: Enabled
IP Validation: Enabled
Logging: Acl, Probe

Interface        Trusted    Rate-limit     (sec)
g0/1             true       0
f0/1             false      0
f0/2             false      0
f0/3             false      0

SW1# show ip dhcp snooping binding
MacAddress        IpAddress       Lease(sec)  Type           VLAN  Interface
00:90:2c:1e:1a:00 192.168.1.10    83765       dhcp-snooped   1     Fa0/1
```

### 5.2 Simulate Power Loss

```text
1. Save configurations
   SW1# write memory

2. Power off SW1; wait 30 seconds

3. Power on SW1; allow 60 seconds for boot
```

### 5.3 Post-Boot Verification (Black Start Proof)

```text
[After SW1 reboots]

SW1# show ip arp inspection vlan 1
Source Mac Validation: Enabled
Dest Mac Validation: Enabled
IP Validation: Enabled
(Must show enabled; not disabled)

SW1# show ip arp inspection interface
Interface        Trusted    Rate-limit     (sec)
g0/1             true       0
f0/1             false      0
f0/2             false      0
f0/3             false      0

(g0/1 must show "true"; all access ports must show "false")

SW1# show ip dhcp snooping binding
MacAddress        IpAddress       Lease(sec)  Type           VLAN  Interface
00:90:2c:1e:1a:00 192.168.1.10    83765       dhcp-snooped   1     Fa0/1

(Binding table survived; DAI has the information needed for validation)
```

### 5.4 ARP Spoofing Test (Security Enforced Post-Boot)

```text
Attempt an ARP spoofing attack on untrusted port F0/2:

1. Rogue device on F0/2 sends forged ARP Reply:
   "192.168.1.1 is at 00:11:22:33:44:55"
   (Claiming to own the gateway IP with attacker's MAC)

2. DAI checks binding table:
   Binding for 192.168.1.1: 00:90:2c:1e:1e:00 (R1's real MAC)
   Incoming ARP from F0/2: 00:11:22:33:44:55 (attacker's MAC)
   → MISMATCH → ARP Reply dropped

3. Check DAI statistics:
   SW1# show ip arp inspection statistics vlan 1
   Packets dropped: 1
   (Forged ARP was immediately dropped post-reboot)

(Proof: DAI is immediately functional post-reboot; ARP spoofing blocked)
```

---

## 6. Expected Output Gallery (Field-1 Scenarios)

**DAI statistics post-reboot (after blocking attack):**

```text
SW1# show ip arp inspection statistics vlan 1

ACL Drops:                          0
Forwarded Packets:                  10
Dropped Packets:                    1
DHCP Drops:                         0
DHCP Permit (Snooping):             10
Src MAC Failures:                   0
Dest MAC Failures:                  0
IP Filter Failures:                 0
Invalid Protocol Data:              0

(Dropped Packets: 1 = forged ARP was blocked immediately)
```

---

## 7. Common Field-1 Mistakes

1. **Not saving to NVRAM before power loss** — DAI config lost; ARP spoofing becomes possible.
2. **Forgetting DHCP Snooping dependency** — DAI without binding table has no validation source; all ARP replies are allowed.
3. **Not marking G0/1 as trusted for DAI** — valid ARP replies from R1 are dropped; gateway becomes unreachable.
4. **Not verifying DAI is active after reboot** — assuming it works without checking.

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Symptom: DAI drops all ARP replies after reboot**

```text
Step 1: Is DHCP Snooping binding table present?
  SW1# show ip dhcp snooping binding | wc -l
  → If 0 entries, DAI has no reference for validation; recreate bindings

Step 2: Is G0/1 marked as trusted for DAI?
  SW1# show ip arp inspection interface g0/1
  → If "Trusted false", mark as trusted

Step 3: Is DAI enabled on the VLAN?
  SW1# show ip arp inspection vlan 1 | grep "ACL"
  → If no ACL listed, DAI is not active

Step 4: What's causing drops?
  SW1# show ip arp inspection statistics vlan 1 | grep -E "Drops|Failures"
  → Identify which validation is too strict
```

---

## 9. Design Analysis: Field-1 Reasoning

Black Start DAI requires:

1. **DHCP Snooping dependency:** Binding table must survive in NVRAM (covered by Day-50-Field-1).
2. **DAI configuration persistence:** Trust boundaries and validation rules saved in NVRAM.
3. **Coordinated re-activation:** On reboot, both DHCP Snooping and DAI re-activate together.

This topology proves DAI is resilient to offline scenarios—ARP spoofing cannot exploit a reboot window when both snooping and inspection survive.

---

## 10. Real-World Parallel: Haiti P38 Clinic

A clinic switch reboots after power loss. Without persistent DAI:
- Attacker on untrusted port sends forged ARP: "192.168.1.1 is at attacker's-MAC"
- DAI is disabled (not re-activated); forged ARP is accepted
- Workstations update ARP cache; traffic flows to attacker (MITM)
- Attacker intercepts patient data in transit

With persistent DAI (this variant):
- Switch reboots; DAI re-activates immediately
- Same forged ARP is dropped (doesn't match DHCP binding)
- Workstations never see the attack
- Patient data remains secure

---

## 11. Stretch Goals: Advanced Field-1 Proof

- Verify DAI and DHCP Snooping cannot become desynchronized after reboot.
- Stress test: reboot 10 times; verify binding table and DAI rules persist each time.

---

## 12. Self-Assessment

```
Target BSL for this lab: 3–4 (Recoverable to Maintainable)
```

---

**Created:** August 30, 2026  
**Field:** Black Start Resilience (Field-1)  
**Status:** Complete — ready for Phase P38 pilot
