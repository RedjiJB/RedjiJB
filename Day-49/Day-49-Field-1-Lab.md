# Day 49 Field-1 Variant — Port Security Offline Persistence

## 0. Metadata

```
Field Focus:         Field 1: Black Start Resilience
Core Proof Obligation: Port security policies (MAC address limits, violation modes, sticky learning) persist in NVRAM; security enforcement resumes after power loss without manual re-entry.
Haiti Deployment Phase: P38 (pilot phase) — switch security must survive outages; rogue device prevention cannot depend on external manager.
Estimated Time:      1.5–2 hours
Difficulty:          Intermediate
Relationship to Base Lab: Same port security configuration; added persistent NVRAM storage and post-boot verification.
Prerequisite:        Complete Day-49-Lab-Manual first.
```

---

## 1. Business Context (Field-1 Framing)

During Haiti P38 pilot, switches must prevent rogue devices (unauthorized routers, hubs) from being plugged into access ports. If switch reboots after power loss and forgets port security rules, a rogue device could connect and compromise the clinic network. This lab proves port security policies survive in NVRAM and re-activate automatically.

---

## 2. Topology Diagram (Field-1 Variant)

```
[FIELD-1: OFFLINE PORT SECURITY PERSISTENCE]

SW1:
├─ startup-config (persistent NVRAM):
│  ├─ Access ports F0/1–F0/3: 1 MAC max, shutdown on violation
│  └─ Uplink port G0/1: 4 MAC max, restrict on violation, sticky learning
├─ Power loss → reboot
├─ Read startup-config → port security active
└─ Rogue device cannot connect (max 1 MAC enforced)

Topology:
  [PC1–PC3] ──→ SW1 (F0/1–F0/3, 1 MAC each) → [Rogue Router?] (F0/4, unprotected)
                └→ G0/1 (trunk, 4 MAC sticky, restrict mode)
```

---

## 3. IP Addressing Plan (Field-1 Annotations)

Same as base Day-49, with annotation that all port security config **must survive cold reboot**.

---

## 4. Configuration (Field-1 Optimizations)

### 4.1 Access Ports with Strict 1-MAC Limit (SW1)

```text
SW1(config)# interface range f0/1-f0/3
SW1(config-if-range)# switchport mode access
SW1(config-if-range)# switchport port-security
SW1(config-if-range)# switchport port-security maximum 1
SW1(config-if-range)# switchport port-security violation shutdown
SW1(config-if-range)# switchport port-security mac-address sticky
SW1(config-if-range)# exit
```

**Explanation for Field-1:**
- `maximum 1`: Only one MAC address allowed per port (strict).
- `violation shutdown`: Port disables on violation (fail-closed).
- `mac-address sticky`: First MAC learned is saved to NVRAM; surviving reboot.

### 4.2 Uplink Port with Looser 4-MAC Limit (SW1)

```text
SW1(config)# interface g0/1
SW1(config-if)# switchport mode access
SW1(config-if)# switchport port-security
SW1(config-if)# switchport port-security maximum 4
SW1(config-if)# switchport port-security violation restrict
SW1(config-if)# switchport port-security mac-address sticky
SW1(config-if)# exit
SW1# write memory
! CRITICAL: Save to startup-config before power loss
```

### 4.3 Verify and Save

```text
SW1# show port-security
Interface  Max Addr  Addrs Count  Action
Fa0/1          1         1        Shutdown
Fa0/2          1         1        Shutdown
Fa0/3          1         1        Shutdown
Gi0/1          4         2        Restrict

SW1# show startup-config | include "port-security"
! Verify port-security commands are in startup-config
```

---

## 5. Field-1 Verification Steps

### 5.1 Pre-Boot Baseline

```text
SW1# show port-security
! Record the current state (1 MAC per F0/1–F0/3, 4 MAC on G0/1)

SW1# show port-security address
! Record the sticky MAC addresses for each port
```

### 5.2 Simulate Power Loss

```text
1. Save running-config to startup-config
   SW1# write memory

2. Unplug power; wait 30 seconds

3. Restore power; allow 60 seconds for boot
```

### 5.3 Post-Boot Verification (Black Start Proof)

```text
[After SW1 reboots]

SW1# show port-security
Interface  Max Addr  Addrs Count  Action
Fa0/1          1         1        Shutdown
Fa0/2          1         1        Shutdown
Fa0/3          1         1        Shutdown
Gi0/1          4         2        Restrict

(Must match pre-boot state exactly)

SW1# show port-security address
Interface  Vlan  Mac Address  Type              Ports
Fa0/1      1     0090.2c.1a00.1a  SecureSticky  Fa0/1
Fa0/2      1     0090.2c.1a00.2a  SecureSticky  Fa0/2
Fa0/3      1     0090.2c.1a00.3a  SecureSticky  Fa0/3
Gi0/1      1     0090.2c.1a00.4a  SecureSticky  Gi0/1
Gi0/1      1     0090.2c.1a00.4b  SecureSticky  Gi0/1

(All sticky MACs survived reboot; security is immediately active)

SW1# show startup-config | include "port-security"
interface FastEthernet0/1
 switchport port-security
 switchport port-security maximum 1
 switchport port-security violation shutdown
 switchport port-security mac-address sticky
...
(Config persisted in NVRAM)
```

### 5.4 Violation Test (Security Enforced Post-Boot)

```text
Attempt to connect a rogue device (new MAC) to F0/1:

SW1# show port-security interface f0/1
Port Security: Enabled
  Port Status: Secure-Shutdown (port is now disabled due to violation)
  Violation Mode: Shutdown
  Aging: Enabled

(Port security is immediately functional; rogue device blocked)
```

---

## 6. Expected Output Gallery (Field-1 Scenarios)

**Sticky MAC addresses persisted post-reboot:**

```text
SW1# show port-security address
Interface  Vlan  Mac Address      Type              Ports
Fa0/1      1     0090.2c6e.1e1e   SecureSticky      Fa0/1
Fa0/2      1     0090.2c6e.1e2e   SecureSticky      Fa0/2
Fa0/3      1     0090.2c6e.1e3e   SecureSticky      Fa0/3
Gi0/1      1     0090.2c6e.1e4e   SecureSticky      Gi0/1
Gi0/1      1     0090.2c6e.1e4f   SecureSticky      Gi0/1

(All four ports have their sticky MAC learned pre-boot; survived reboot in NVRAM)
```

---

## 7. Common Field-1 Mistakes

1. **Not saving to NVRAM before power loss** — sticky MAC addresses and limits are lost.
2. **Using `switchport port-security mac-address` (static) instead of `sticky`** — static MACs are tedious to reconfigure after reboot; sticky is more resilient.
3. **Forgetting to verify startup-config after reboot** — assuming port security is active without checking.

---

## 8. Troubleshooting by Field (Diagnostic Method)

**Symptom: Port security missing after reboot**

```text
Step 1: Is port-security configured in startup-config?
  SW1# show startup-config | include "port-security"
  → If no output, port-security was never saved to NVRAM

Step 2: Did sticky MAC addresses survive?
  SW1# show port-security address | include "SecureSticky"
  → If empty, sticky learning was not enabled before power loss
```

---

## 9. Design Analysis: Field-1 Reasoning

Black Start port security requires sticky MAC learning + NVRAM persistence. When switch reboots offline, it cannot re-learn MACs dynamically—it must use the sticky MACs saved during the previous running state. This topology proves port security is resilient to offline scenarios.

---

## 10. Real-World Parallel: Haiti P38 Clinic

A clinic switch loses power during an outage. When power restores and the switch reboots, a rogue router is immediately plugged into an unprotected port by a curious staff member. Without port security auto-reactivating, the rogue router could pivot to the clinic network and compromise patient data.

This variant proves: after reboot, port security is immediately active; the rogue router cannot connect.

---

## 11. Stretch Goals: Advanced Field-1 Proof

- Verify sticky MACs cannot be deleted without admin action (resilience against accidental resets).
- Stress test: reboot 10 times; verify sticky MACs persist unchanged each time.

---

## 12. Self-Assessment

```
Target BSL for this lab: 3–4 (Recoverable to Maintainable)
```

---

**Created:** August 30, 2026  
**Field:** Black Start Resilience (Field-1)  
**Status:** Complete — ready for Phase P38 pilot
