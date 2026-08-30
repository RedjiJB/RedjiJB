# Day 05 — Port Security & Storm Control

## Practice Lab: Configuration & Testing

---

## 1. Port Security Configuration

**On SW1 (access ports for PC0, PC1):**
```
Switch# configure terminal
Switch(config)# interface FastEthernet0/2
Switch(config-if)# switchport port-security
Switch(config-if)# switchport port-security maximum 1
Switch(config-if)# switchport port-security mac-address sticky
Switch(config-if)# switchport port-security violation shutdown
Switch(config-if)# exit

Switch(config)# interface FastEthernet0/3
Switch(config-if)# switchport port-security
Switch(config-if)# switchport port-security maximum 1
Switch(config-if)# switchport port-security mac-address sticky
Switch(config-if)# switchport port-security violation shutdown
Switch(config-if)# exit
```

**Repeat for SW2 (Fa0/2–3) and SW3 (Fa0/2–3)**

---

## 2. Storm Control Configuration

**On SW1:**
```
Switch(config)# interface FastEthernet0/2
Switch(config-if)# storm-control broadcast level 50
Switch(config-if)# storm-control multicast level 50
Switch(config-if)# exit

Switch(config)# interface FastEthernet0/3
Switch(config-if)# storm-control broadcast level 50
Switch(config-if)# storm-control multicast level 50
Switch(config-if)# exit
```

**Repeat for SW2, SW3**

---

## 3. Verification Tests

**Test 1: Verify port security**
```
SW1# show port-security dynamic

Secure MAC Address Table
-------------------------------------------
Vlan    Mac Address       Port     Type        Remaining Age
----    -----------       ----     ----        --------
  10    0011.2233.4455    Fa0/2    StickySecure   0
  10    0011.2233.4456    Fa0/3    StickySecure   0
```

**Test 2: Verify storm control**
```
SW1# show storm-control

Interface Name : Fa0/2
Broadcast Storm Control: Enabled, level (in bps) : 50000000
Multicast Storm Control: Enabled, level (in bps) : 50000000
```

**Test 3: Generate broadcast traffic**
```
PC0# ping -b 192.168.10.255
! Broadcasts sent; storm control limits them

SW1# show interface FastEthernet0/2 | grep broadcast
! Verify traffic is being rate-limited
```

**Test 4: MAC spoofing attempt**
```
! Attacker device plugs into Fa0/2 with different MAC
SW1# show interface FastEthernet0/2
FastEthernet0/2 is down
! Expected: Port is down due to port security violation
```

---

## 4. Checklist

- [ ] Port security configured on all access ports
- [ ] Maximum 1 MAC per port
- [ ] Sticky MAC mode enabled
- [ ] Violation mode = shutdown
- [ ] Storm control enabled (broadcast level 50)
- [ ] `show port-security dynamic` shows learned MACs
- [ ] `show storm-control` shows rates
- [ ] Broadcast traffic is rate-limited
- [ ] Unauthorized MAC triggers shutdown

---

**Practice Lab Version:** 1.0  
**Time to Complete:** 1–2 hours
