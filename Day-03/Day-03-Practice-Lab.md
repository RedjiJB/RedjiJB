# Day 03 — Switch Fundamentals

## Practice Lab: VLAN Configuration and MAC Learning

---

## 1. Overview

This practice lab guides you through VLAN configuration on all three switches (SW1, SW2, SW3) and verifies MAC address learning.

**Format:** Hands-on configuration with step-by-step explanations  
**Time:** 2–3 hours  
**Prerequisite:** Day 01–02 completed; topology built

---

## 2. Hands-On Configuration

### 2.1 SW1 Configuration Walkthrough

**Step 1:** Console into SW1

```
Switch> enable
Switch# configure terminal
Enter configuration commands, one per line.  End with CNTL/Z.
Switch(config)#
```

**Step 2:** Create VLANs

```
Switch(config)# vlan 1
Switch(config-vlan)# name Management
Switch(config-vlan)# exit

Switch(config)# vlan 10
Switch(config-vlan)# name NY-Staff
Switch(config-vlan)# exit

! Verify VLANs created
Switch(config)# exit
Switch# show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- ----------------------------------
1    Management                       active    
10   NY-Staff                         active    
1002 fddi-default                     act/unsup 
1003 token-ring-default               act/unsup 
1004 fddinet-default                  act/unsup 
1005 trnet-default                    act/unsup 

! VLAN 1 and 10 are active; legacy VLANs (1002–1005) can be ignored
```

**Step 3:** Create SVI for VLAN 10 (staff network)

```
Switch# configure terminal
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.2 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Verify SVI created
Switch(config)# exit
Switch# show ip interface brief | grep -i vlan

Interface              IP-Address      OK? Method Status                Protocol
Vlan1                  unassigned      YES manual down                  down
Vlan10                 192.168.10.2    YES manual up                    up
```

**Why:** The SVI gives the switch an IP address so you can SSH/telnet to it for management.

**Step 4:** Configure access ports (PC0, PC1)

```
Switch# configure terminal

Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# description PC0-Access
Switch(config-if)# no shutdown
Switch(config-if)# exit

Switch(config)# interface FastEthernet0/3
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# description PC1-Access
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Verify access ports
Switch(config)# exit
Switch# show interface switchport | grep -A 5 FastEthernet0/2

Name              : Fa0/2
Switchport        : Enabled
Administrative Mode : static access
Operational Mode  : static access
Maximum MTU        : 1500
Trunking Native Mode VLAN : 1
Administrative Native VLAN tagging : enabled
Administrative private-vlan host-association : none
Switchport Access VLAN : 10
Trunking Encapsulation : dot1q
```

**Why:** Access ports assign frames to a single VLAN. When PC0 sends a frame, SW1 adds VLAN tag (internal use); when SW1 sends frame to PC0, it removes the tag (PC0 sees untagged frame).

**Step 5:** Configure trunk port (uplink to R1-NY)

```
Switch# configure terminal

Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk native vlan 1
Switch(config-if)# switchport trunk allowed vlan 1,10
Switch(config-if)# description Uplink-to-R1-NY
Switch(config-if)# no shutdown
Switch(config-if)# exit

! Verify trunk configuration
Switch(config)# exit
Switch# show interface trunk

Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      1

Port        Vlans allowed on trunk
Gi0/1       1,10

Port        Vlans allowed and active in management domain
Gi0/1       1,10

Port        Vlans in spanning tree forwarding state and not pruned
Gi0/1       1,10
```

**Why:** Trunk ports carry multiple VLANs using 802.1Q tagging. Each frame is tagged with VLAN ID; receiving switch examines tag and processes accordingly.

**Step 6:** Set default gateway

```
Switch# configure terminal
Switch(config)# ip default-gateway 192.168.10.1
Switch(config)# exit
```

**Why:** If a frame arrives for a subnet the switch doesn't know, it forwards to the default gateway (the router).

---

### 2.2 SW2 & SW3 Configuration (Similar Steps)

**SW2:** Follow Step 1–6, but use VLAN 20 and 192.168.20.x addresses

```
Switch(config)# vlan 20
Switch(config-vlan)# name Tokyo-Staff

Switch(config)# interface vlan 20
Switch(config-if)# ip address 192.168.20.2 255.255.255.0

Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport access vlan 20
! ... (Fa0/3 also VLAN 20)

Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport trunk allowed vlan 1,20

Switch(config)# ip default-gateway 192.168.20.1
```

**SW3:** Use VLAN 30 and 192.168.30.x addresses

```
Switch(config)# vlan 30
Switch(config-vlan)# name Singapore-Staff

Switch(config)# interface vlan 30
Switch(config-if)# ip address 192.168.30.2 255.255.255.0

Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport access vlan 30
! ... (Fa0/3 also VLAN 30)

Switch(config)# interface GigabitEthernet0/1
Switch(config-if)# switchport trunk allowed vlan 1,30

Switch(config)# ip default-gateway 192.168.30.1
```

---

## 3. MAC Address Verification

### 3.1 View Learned MACs on SW1

**Step 1:** Generate traffic (so switch learns MACs)

```
PC0# ping -c 10 192.168.10.51  ! Ping PC1 (same VLAN)
! Generates ARP request/reply; SW1 learns both MACs
```

**Step 2:** Check MAC address table

```
SW1# show mac-address-table

          Mac Address Table
-------------------------------------------

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
   1    0050.56ab.ce01    DYNAMIC     Gi0/1
  10    0011.2233.4455    DYNAMIC     Fa0/2
  10    0011.2233.4456    DYNAMIC     Fa0/3
  10    0050.56ab.ce02    DYNAMIC     Gi0/1
```

**What you see:**
- **VLAN 1:** MAC on trunk (Gi0/1) = R1-NY (management traffic)
- **VLAN 10:** MACs on Fa0/2 (PC0), Fa0/3 (PC1), Gi0/1 (R1-NY)

**Why:** When PC0 sends a frame, SW1 examines source MAC and associates it with port Fa0/2.

### 3.2 MAC Address Aging Demonstration

**Step 1:** Note current time

```
SW1# show clock
```

**Step 2:** View MAC aging time

```
SW1# show mac-address-table aging-time
Current MAC address aging time: 300 seconds (5 minutes)
```

**Step 3:** Simulate device moved

```
! Disconnect PC0 from Fa0/2
! Wait 5+ minutes (or manually clear entry: clear mac-address-table dynamic)
! Entry disappears from MAC table
```

**Step 4:** Reconnect and verify new learning

```
PC0# ping 192.168.10.1  ! Generate traffic
SW1# show mac-address-table | grep PC0  ! New entry appears
```

**Lesson:** MAC table entries are dynamic; they age out and are re-learned if traffic continues.

---

## 4. Verification Tests

### 4.1 Same-VLAN Connectivity

**Test:** PC0 → PC1 (both on VLAN 10)

```
PC0# ping -c 4 192.168.10.51
PING 192.168.10.51 (192.168.10.51) 56(84) bytes of data.
64 bytes from 192.168.10.51: icmp_seq=1 ttl=64 time=2.123 ms
64 bytes from 192.168.10.51: icmp_seq=2 ttl=64 time=1.987 ms
64 bytes from 192.168.10.51: icmp_seq=3 ttl=64 time=2.045 ms
64 bytes from 192.168.10.51: icmp_seq=4 ttl=64 time=2.034 ms

! Expected: Ping succeeds (both on same VLAN 10)
```

**Why:** SW1 knows both MACs are on VLAN 10. When PC0 sends unicast to PC1, SW1 forwards frame directly to Fa0/3 (where PC1 is).

### 4.2 Different-VLAN Connectivity (Should Fail)

**Test:** PC0 (VLAN 10) → SRV1 (VLAN 20)

```
PC0# ping -c 4 192.168.20.10
PING 192.168.20.10 (192.168.20.10) 56(84) bytes of data.

! Timeout; no response (after ~5 seconds)
! Expected: Ping fails (different VLANs, no inter-VLAN routing configured yet)
```

**Why:** SW1 doesn't have a route between VLAN 10 and VLAN 20. Devices on different VLANs can't communicate at Layer 2. **Solution:** Inter-VLAN routing (Day 07 content).

### 4.3 Trunk Verification

**Test:** Verify trunk link carries multiple VLANs

```
SW1# show interface GigabitEthernet0/1 switchport

Name              : Gi0/1
Switchport        : Enabled
Administrative Mode : dynamic desirable
Operational Mode  : static access
Maximum MTU        : 1500
Trunking Native Mode VLAN : 1
Trunking Encapsulation : dot1q
Trunking Native Mode VLAN tagging : enabled
Operational private-vlan host-association : none

! Wait, this shows "static access", not "trunk"!
! Issue: Interface is not in trunk mode. Let me re-configure.

SW1# configure terminal
SW1(config)# interface GigabitEthernet0/1
SW1(config-if)# switchport mode trunk
SW1(config-if)# exit

SW1# show interface GigabitEthernet0/1 switchport

Operational Mode  : static access trunk
Trunking Encapsulation : dot1q
Allowed VLANs : 1,10
Trunking Vlans Enabled : 1,10
```

**Now trunk is verified:** Interface carries both VLAN 1 and VLAN 10 traffic.

---

## 5. Common Mistakes & Troubleshooting

### Mistake 1: Forgot to Create VLAN

**Symptom:** Assign port to VLAN, but `show vlan brief` doesn't show the port

```
Switch(config)# interface Fa0/2
Switch(config-if)# switchport access vlan 10
Switch(config-if)# exit

Switch# show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- ---------------------------------
1    default                          active    Fa0/2
10   ??? (not listed)                  (not listed)

! Port Fa0/2 is still on VLAN 1!
! Reason: VLAN 10 was never created.

! Fix:
Switch# configure terminal
Switch(config)# vlan 10
Switch(config-vlan)# name NY-Staff
Switch(config-vlan)# exit

Switch(config)# interface Fa0/2
Switch(config-if)# switchport access vlan 10
Switch(config-if)# exit

Switch# show vlan brief
10   NY-Staff                         active    Fa0/2
```

### Mistake 2: Trunk Port Not Carrying VLAN

**Symptom:** Devices on VLAN 10 can't reach router (or vice versa)

```
Switch# show interface trunk

Port        Vlans allowed on trunk
Gi0/1       all

! But VLAN 10 traffic doesn't cross trunk!
! Reason: Allowed VLANs is "all", but check trunking status

Switch# show interface Gi0/1 switchport

Operational Mode  : static access  (NOT trunk!)
```

**Fix:**
```
Switch# configure terminal
Switch(config)# interface Gi0/1
Switch(config-if)# no switchport mode access  ! Remove access mode
Switch(config-if)# switchport mode trunk  ! Set trunk mode
Switch(config-if)# exit

Switch# show interface trunk
Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      1
```

---

## 6. Self-Check Checklist

- [ ] Created VLAN 10 on SW1, VLAN 20 on SW2, VLAN 30 on SW3
- [ ] Assigned access ports to correct VLANs (Fa0/2–3 on each switch)
- [ ] Created SVIs on each switch with correct IP addresses
- [ ] Configured trunk ports (Gi0/1) on each switch with correct allowed VLANs
- [ ] Set native VLAN to 1 on all trunks
- [ ] Set default gateway on each switch
- [ ] Verified `show vlan brief` shows all VLANs and ports
- [ ] Verified MAC addresses learned on correct ports (use `show mac-address-table`)
- [ ] Tested same-VLAN ping (PC0 ↔ PC1): succeeded
- [ ] Tested different-VLAN ping (PC0 ↔ SRV1): failed (expected)
- [ ] Verified trunk port carries multiple VLANs (use `show interface trunk`)

**Score:** 11/11 = Mastered Day 03 concepts

---

## 7. Conclusion

You've configured VLANs and verified:
- MAC address learning on access ports
- VLAN isolation (same-VLAN communication works; different-VLAN fails)
- Trunk port functionality (carries multiple VLANs)

**Next:** Day 07 will show how to route **between** VLANs, enabling communication between PC0 (VLAN 10) and SRV1 (VLAN 20).

---

**Practice Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Time to Complete:** 2–3 hours
