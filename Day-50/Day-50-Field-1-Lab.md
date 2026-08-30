# Day 50 Field-1 Variant — DHCP Snooping Offline Resilience

## 0. Metadata

```
Field Focus:         Field 1: Black Start Resilience
Core Proof Obligation: DHCP Snooping configuration (trust boundaries, Option 82 settings) persists in NVRAM; rogue DHCP server prevention resumes after power loss without manual re-entry.
Haiti Deployment Phase: P38 (pilot phase) — switches must prevent rogue DHCP servers even after power outages; patients cannot wait for external re-configuration.
Estimated Time:      2 hours
Difficulty:          Intermediate-Advanced
Relationship to Base Lab: Same DHCP Snooping configuration; added persistent NVRAM storage and post-boot trust-boundary verification.
Prerequisite:        Complete Day-50-Lab-Manual first.
```

---

## 1. Business Context (Field-1 Framing)

During Haiti P38 pilot, if a switch loses power, rogue DHCP servers become vulnerable. Attackers could plug a rogue DHCP server into an untrusted port and redirect all new devices to a malicious gateway/DNS. This lab proves DHCP Snooping trust boundaries survive in NVRAM and re-activate automatically, blocking rogue servers immediately after reboot.

---

## 2. Topology Diagram (Field-1 Variant)

```
[FIELD-1: OFFLINE DHCP SNOOPING PERSISTENCE]

R1 (Trusted DHCP Server) ─→ G0/1 (trusted)
                            ├─ startup-config (NVRAM):
                            │  ├─ Snooping enabled globally
                            │  ├─ G0/1 marked as trusted (only source of DHCP Offer)
                            │  ├─ G0/2–G0/23 marked as untrusted (access ports)
                            │  └─ Option 82 disabled (to match Day-50 topology)
                            │
SW1 ┌─────────────────────────┘
    ├─ F0/1–F0/3 (untrusted access ports)
    └─ G0/1 (trusted trunk to R1)

[POWER LOSS → REBOOT]
→ SW1 reads startup-config
→ DHCP Snooping re-activates
→ G0/1 trusted, F0/1–F0/3 untrusted
→ Rogue DHCP on F0/2 is immediately blocked (no Offer relayed)
```

---

## 3. IP Addressing Plan (Field-1 Annotations)

Same as base Day-50, with annotation that all DHCP Snooping config **must survive cold reboot**.

---

## 4. Configuration (Field-1 Optimizations)

### 4.1 Global DHCP Snooping (SW1)

```text
SW1(config)# ip dhcp snooping
SW1(config)# ip dhcp snooping vlan 1
! Enable snooping on VLAN 1 (where DHCP traffic flows in this topology)
```

### 4.2 Trusted Interface (SW1, toward R1)

```text
SW1(config)# interface g0/1
SW1(config-if)# ip dhcp snooping trust
! This interface (to R1/DHCP server) is trusted; Offers can pass through
SW1(config-if)# exit
```

### 4.3 Untrusted Interfaces (SW1, access ports)

```text
SW1(config)# interface range f0/1-f0/3
SW1(config-if-range)# no ip dhcp snooping trust
! Default; these are untrusted—Discover allowed OUT, Offer dropped from here
SW1(config-if-range)# exit
```

### 4.4 Disable Option 82 (to avoid Day-50's gotcha)

```text
SW1(config)# no ip dhcp snooping information option
! Disable Option 82 insertion (which breaks DHCP in Day-50 topology)
! With this disabled, DHCP works immediately post-reboot

SW1# write memory
! CRITICAL: Save to startup-config
```

---

## 5. Field-1 Verification Steps

### 5.1 Pre-Power-Loss Baseline

```text
SW1# show ip dhcp snooping
Switch DHCP snooping is enabled
DHCP snooping is configured on following VLANs:
1
DHCP snooping is operational on following VLANs:
1
DHCP snooping is configured on the following L3 Interfaces:
(none)
OP82 is disabled
DHCP snooping statistics are:
Packets dropped due to untrusted port: 0
Illegal server port access: 0

SW1# show ip dhcp snooping binding
MacAddress        IpAddress       Lease(sec)  Type           VLAN  Interface
00:90:2c:1e:1a:00 192.168.1.10    83765       dhcp-snooped   1     Fa0/1
```

### 5.2 Simulate Power Loss

```text
1. Save configuration
   SW1# write memory

2. Power off SW1; wait 30 seconds

3. Power on SW1; allow 60 seconds for boot
```

### 5.3 Post-Boot Verification (Black Start Proof)

```text
[After SW1 reboots]

SW1# show ip dhcp snooping
Switch DHCP snooping is enabled
(Must show enabled; not disabled)

SW1# show ip dhcp snooping interface
Interface         Trusted    Rate-limit  (sec)
g0/1              true       0
f0/1              false      0
f0/2              false      0
f0/3              false      0

(g0/1 must show "true"; all access ports must show "false")

SW1# show ip dhcp snooping binding
MacAddress        IpAddress       Lease(sec)  Type           VLAN  Interface
00:90:2c:1e:1a:00 192.168.1.10    83765       dhcp-snooped   1     Fa0/1

(Binding table survived reboot; DHCP Snooping is immediately functional)
```

### 5.4 Rogue DHCP Test (Security Enforced Post-Boot)

```text
Attempt to connect a rogue DHCP server to untrusted port F0/2:

1. Rogue sends DHCP Offer on F0/2 (attempt to respond to client Discover)

2. Check SW1 statistics:
   SW1# show ip dhcp snooping statistics
   Packets dropped due to untrusted port: 1
   (Offer from untrusted port was dropped immediately post-boot)

3. Client does not receive malicious Offer; defaults to legitimate R1 server

(Proof: Snooping is immediately active post-reboot; rogue server blocked)
```

---

## 6. Expected Output Gallery (Field-1 Scenarios)

**Snooping binding table persisted post-reboot:**

```text
SW1# show ip dhcp snooping binding
MacAddress        IpAddress       Lease(sec)  Type           VLAN  Interface
00:90:2c:1e:1a:00 192.168.1.10    83765       dhcp-snooped   1     Fa0/1
00:90:2c:1e:1a:01 192.168.1.11    83764       dhcp-snooped   1     Fa0/2
00:90:2c:1e:1a:02 192.168.1.12    83763       dhcp-snooped   1     Fa0/3

(All leases survived reboot; snooping is immediately functional)
```

---

## 7. Common Field-1 Mistakes

1. **Not saving to NVRAM before power loss** — snooping config is lost; all ports treated as untrusted after reboot.
2. **Forgetting to mark G0/1 as trusted** — Offers from R1 are dropped; DHCP fails post-reboot.
3. **Leaving Option 82 enabled** — causes Day-50's DHCP failure to occur post-reboot as well.
4. **Not verifying trust boundaries after reboot** — assuming snooping is active without checking.

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Symptom: DHCP fails after reboot**

```text
Step 1: Is DHCP Snooping enabled?
  SW1# show ip dhcp snooping | grep "enabled"
  → If "disabled", enable and save to NVRAM

Step 2: Is G0/1 marked as trusted?
  SW1# show ip dhcp snooping interface g0/1
  → If "Trusted false", mark as trusted

Step 3: Is Option 82 disabled?
  SW1# show ip dhcp snooping | grep "OP82"
  → If "enabled", disable it (causes DHCP failure)

Step 4: Did snooping binding table survive?
  SW1# show ip dhcp snooping binding | wc -l
  → If 0 entries, bindings were lost; may need to recover from backup
```

---

## 9. Design Analysis: Field-1 Reasoning

Black Start DHCP Snooping requires:

1. **Persistent trust boundaries:** G0/1 (to R1) saved as trusted; access ports saved as untrusted.
2. **Immediate re-activation:** On reboot, snooping re-reads config from NVRAM; trust boundaries re-applied.
3. **Binding table preservation:** DHCP leases (MAC-to-IP mappings) saved; no clients lose IP after reboot.

This topology proves DHCP Snooping is resilient to offline scenarios—rogue servers cannot exploit a reboot window.

---

## 10. Real-World Parallel: Haiti P38 Clinic

A clinic network loses power at midnight. DHCP server and switches reboot. Without persistent snooping:
- Admin forgets to re-enable snooping on the switch.
- Next morning, a malicious device is plugged in and runs rogue DHCP.
- Clinic workstations boot with attacker's gateway.
- Patient data is silently redirected to attacker's machine.

With persistent snooping (this variant):
- Switch reboots; snooping is immediately re-enabled from NVRAM.
- Same malicious device is plugged in—snooping blocks its Offer.
- Clinic workstations boot with legitimate gateway.
- Patient data is safe.

---

## 11. Stretch Goals: Advanced Field-1 Proof

- Verify snooping binding table cannot be cleared without admin action (resilience).
- Stress test: reboot 10 times; verify bindings survive and trust boundaries persist.

---

## 12. Self-Assessment

```
Target BSL for this lab: 3–4 (Recoverable to Maintainable)
```

---

**Created:** August 30, 2026  
**Field:** Black Start Resilience (Field-1)  
**Status:** Complete — ready for Phase P38 pilot
