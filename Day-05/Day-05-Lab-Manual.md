# Day 05 — Port Security & Storm Control

## Lab Manual: MAC Address Limiting and Broadcast Storm Prevention

---

## 0. Metadata

| Field | Value |
|---|---|
| **Lab Title** | Port Security & Storm Control |
| **Day** | Day 05 (Access Control) |
| **Topic Focus** | Port security (sticky MAC, violation modes), storm control (broadcast/multicast limiting), DHCP snooping |
| **Estimated Time** | 2–3 hours |
| **Difficulty** | Intermediate |
| **Prerequisites** | Day 01–04 |
| **Lab Scope** | Configure port security on SW1–SW3; limit MAC addresses per port; configure storm control |
| **Standards Referenced** | RFC 6325 (Ethernet Shortest Path Bridging), IEEE 802.1D (Bridge Standards) |
| **Expected Outcome** | Switches limit MAC addresses per port; broadcast storms are prevented; unauthorized devices are blocked |

---

## 1. Overview

**Problem 1: MAC Spoofing**
- Attacker connects device with multiple MAC addresses
- Exhausts MAC address table (DoS attack)
- Switch floods frames to unknown MACs

**Problem 2: Broadcast Storms**
- Faulty device sends continuous broadcasts
- Network saturates; legitimate traffic fails
- Expensive switch CPU usage

**Solution: Two Features**
1. **Port Security:** Limit MAC addresses per port
2. **Storm Control:** Rate-limit broadcast/multicast/unknown unicast traffic

---

## 2. Port Security Configuration

### 2.1 Sticky MAC Learning

**Default Mode:** Switch learns MACs dynamically (up to N per port)

**Sticky Mode:** First MAC seen is "stuck"; future MACs are denied

**Configuration (SW1 Fa0/2 = PC0):**
```
Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport port-security
Switch(config-if)# switchport port-security maximum 1
! Allow only 1 MAC on this port

Switch(config-if)# switchport port-security mac-address sticky
! "Sticky" mode: First MAC is locked in

Switch(config-if)# switchport port-security violation shutdown
! If another MAC appears: shut down port (most secure)
! Alternative: restrict (drop frames), protect (drop but no log)

Switch(config-if)# exit

! Verify
Switch# show port-security interface FastEthernet0/2

Port Security              : Enabled
Port Status                : Secure-up
Violation Mode             : Shutdown
Aging Time                 : 0 mins
Aging Type                 : Absolute
SecureStatic Address Aging : Disabled
Maximum MAC Addresses      : 1
Total MAC Addresses        : 1
Configured MAC Addresses   : 0
Sticky MAC Addresses       : 1
Last Source Address:Vlan   : 0011.2233.4455:10
Security Violation Count   : 0
```

### 2.2 Violation Modes Explained

| Mode | Action | Use Case |
|------|--------|----------|
| **shutdown** | Port down; admin must fix | High security (e.g., bank branch) |
| **restrict** | Drop frames from unauthorized MAC; send SNMP trap | Medium security; auto-recovery desired |
| **protect** | Drop frames; no logging | Low security; user error expected |

### 2.3 Configuration Summary (All Switches)

**SW1 Fa0/2 (PC0 port):**
```
interface FastEthernet0/2
 switchport port-security
 switchport port-security maximum 1
 switchport port-security mac-address sticky
 switchport port-security violation shutdown
```

**SW1 Fa0/3 (PC1 port):**
```
interface FastEthernet0/3
 switchport port-security
 switchport port-security maximum 1
 switchport port-security mac-address sticky
 switchport port-security violation shutdown
```

**Repeat for SW2 (SRV1, SRV2) and SW3 (SGP1, SGP2)**

---

## 3. Storm Control Configuration

### 3.1 What is a Storm?

**Broadcast Storm:** Device sends continuous broadcast frames (MAC ff:ff:ff:ff:ff:ff)

**Example:** Loop in network topology:
- Frame sent on port A
- Propagates to all ports
- One port sends back to A
- Frame loops infinitely
- Network saturated

**Solution:** Rate-limit broadcasts per interface

### 3.2 Storm Control Configuration

**On SW1 (all access ports):**
```
interface FastEthernet0/2
 storm-control broadcast level 50
 ! Limit broadcast to 50% of port bandwidth
 ! (100 Mbps port → max 50 Mbps broadcasts)

interface FastEthernet0/3
 storm-control broadcast level 50

! Multicast storm control (optional)
interface FastEthernet0/2
 storm-control multicast level 50

! Unknown unicast (optional)
interface FastEthernet0/2
 storm-control unicast level 50

! Verify
Switch# show storm-control

Interface Name : Fa0/2
Broadcast Storm Control: Enabled, level (in bps) : 50000000
Multicast Storm Control: Disabled
Unicast Storm Control: Disabled
```

**Repeat for SW2, SW3 on all access ports (Fa0/2–3)**

---

## 4. Testing & Verification

### 4.1 Port Security Test

**Step 1:** Normal operation (PC0 connected to SW1 Fa0/2)
```
SW1# show port-security dynamic

Secure MAC Address Table
-------------------------------------------
Vlan    Mac Address       Port     Type        Remaining Age
----    -----------       ----     ----        --------
  10    0011.2233.4455    Fa0/2    StickySecure   0 (Expires when port shuts down)
```

**Step 2:** Simulate MAC spoofing (attacker plugs into Fa0/2 with different MAC)
```
! Port immediately shuts down

SW1# show interface FastEthernet0/2

FastEthernet0/2 is down, line protocol is down

! Reason: Port security violation
```

**Step 3:** Verify port status
```
SW1# show port-security interface FastEthernet0/2

Port Status                : Secure-shutdown
Security Violation Count   : 1
```

**Step 4:** Recover (admin manually enables port)
```
Switch(config)# interface FastEthernet0/2
Switch(config-if)# no shutdown
```

### 4.2 Storm Control Test

**Step 1:** Generate broadcast traffic (from PC0)
```
PC0# ping -b 192.168.10.255  ! Broadcast ping
! Generates continuous broadcast frames
```

**Step 2:** Monitor port bandwidth
```
SW1# show interface FastEthernet0/2 | grep broadcast
! Bandwidth limited to 50% (storm control active)

SW1# show interface stats | grep dropped
! Some broadcast frames dropped
```

---

## 5. Verification Checklist

- [ ] Port security enabled on all access ports (Fa0/2–3 on SW1–3)
- [ ] Maximum MAC addresses set to 1 per access port
- [ ] Sticky MAC mode enabled
- [ ] Violation mode set to shutdown
- [ ] Storm control enabled on all access ports (broadcast level 50)
- [ ] `show port-security` shows secure MACs
- [ ] Unauthorized MAC triggers port shutdown
- [ ] Broadcast traffic is rate-limited (visible in `show interface`)

---

## 6. Stretch Goals

1. **DHCP Snooping:** Only trusted DHCP servers can respond; prevents DHCP exhaustion attacks
2. **Dynamic ARP Inspection (DAI):** Validates ARP frames; prevents ARP spoofing
3. **Port Security on Trunk:** Limit MACs on uplink ports (less common)

---

## 7. Conclusion

Day 05 hardened switch ports by:
- **Port Security:** Limits MAC addresses per port (prevents spoofing/DoS)
- **Storm Control:** Rate-limits broadcast traffic (prevents loops/storms)

**Next:** Day 06 covers **Access Control Lists (ACLs)** for network-layer traffic filtering.

---

**Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Status:** Complete
