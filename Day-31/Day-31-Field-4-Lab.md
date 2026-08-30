# Day 31 — Field 4 (Security): IPv6 Dual-Stack Configuration with Cryptographic Address Attestation

---

## 0. Metadata

| Field | Value |
|---|---|
| **Field Focus** | Field 4: Security Systems (Cryptographic Proof, Attestation, Tamper Detection) |
| **Core Proof Obligation** | IPv6 addresses must be verifiable via cryptographic derivation from MAC address (EUI-64); device identity is proven by demonstrating that a device's IPv6 address matches the cryptographic transformation of its MAC address. |
| **Haiti Deployment Phase** | P34 (security foundational), P38 pilot onwards — dcentral-core DID issuance ties device network identity to MAC-derived IPv6 address. |
| **Estimated Time** | 3–4 hours (includes manual EUI-64 derivation, cryptographic verification, and tamper-detection scenarios) |
| **Difficulty** | Advanced |
| **Relationship to Base Lab** | Same dual-stack topology (Day-31 base); adds cryptographic verification procedures, MAC-address tamper-detection tests, and proof-of-identity protocols. Tests that IPv6 addresses can serve as cryptographic proof of device identity. |
| **Prerequisite** | Complete Day-31-Research-Paper.md and understand IPv6 addressing fundamentals. Familiarity with MAC addresses, hex conversion, and bitwise operations helpful. |

---

## 1. Business Context (Field-Specific Framing)

Traditional networks treat IPv6 addresses as opaque identifiers — a device has an address, and the network uses it for routing. There is no cryptographic relationship between the device's hardware identity (MAC address) and its network address.

**But in a decentralized system, identity matters cryptographically.** If you cannot prove that a device with MAC `AA:BB:CC:DD:EE:FF` is the same device that holds IPv6 address `2001:DB8:0:1:A8BB:CCFF:FEDD:EEFF`, then an attacker could impersonate that device by spoofing the IPv6 address.

This variant proves the hypothesis: **IPv6 addresses can be derived cryptographically from MAC addresses via EUI-64, enabling proof-of-identity verification. A device's IPv6 address becomes cryptographic proof of its hardware identity.**

This proof unblocks P34 (security foundational) and P38 (pilot deployment) by proving the architectural assumption: "We can tie device identity to hardware via IPv6 cryptographic addressing, enabling DID issuance tied to provable hardware identity."

---

## 2. Topology Diagram (Field-Specific Modifications)

**BASE TOPOLOGY (Day-31-Research-Paper):**
```
Router-1 (R1)
├─ LAN1: 192.168.1.0/24 (IPv4) + 2001:DB8:0:1::/64 (IPv6)
│  ├─ PC1: MAC AA:11:22:33:44:55
│  └─ PC2: MAC AA:11:22:33:44:66
├─ LAN2: 192.168.2.0/24 (IPv4) + 2001:DB8:0:2::/64 (IPv6)
│  ├─ SRV1: MAC BB:11:22:33:44:77
│  └─ SRV2: MAC BB:11:22:33:44:88
└─ LAN3: 192.168.3.0/24 (IPv4) + 2001:DB8:0:3::/64 (IPv6)
   └─ R2: MAC CC:11:22:33:44:99
```

**FIELD-4 VARIANT (CRYPTOGRAPHIC IDENTITY VERIFICATION):**
```
CRYPTOGRAPHIC ATTESTATION LAYER (NEW):
Router-1 (R1) with identity record:
├─ LAN1: 192.168.1.0/24 + 2001:DB8:0:1::/64
│  ├─ PC1: MAC AA:11:22:33:44:55
│     └─ [CRYPTOGRAPHIC PROOF: IPv6 = 2001:DB8:0:1:A811:22FF:FE33:4455 (derived from MAC)]
│     └─ [ATTESTATION: Device identity proven by matching EUI-64]
│  └─ PC2: MAC AA:11:22:33:44:66
│     └─ [CRYPTOGRAPHIC PROOF: IPv6 = 2001:DB8:0:1:A811:22FF:FE33:4466]
├─ LAN2: 192.168.2.0/24 + 2001:DB8:0:2::/64
│  ├─ SRV1: MAC BB:11:22:33:44:77
│     └─ [CRYPTOGRAPHIC PROOF: IPv6 = 2001:DB8:0:2:B911:22FF:FE33:4477]
│  └─ SRV2: MAC BB:11:22:33:44:88
│     └─ [CRYPTOGRAPHIC PROOF: IPv6 = 2001:DB8:0:2:B911:22FF:FE33:4488]
└─ LAN3: 192.168.3.0/24 + 2001:DB8:0:3::/64
   └─ R2: MAC CC:11:22:33:44:99
      └─ [CRYPTOGRAPHIC PROOF: IPv6 = 2001:DB8:0:3:CA11:22FF:FE33:4499]

SECURITY ADDITION:
- Manual EUI-64 derivation from each MAC address
- Cryptographic verification of derived IPv6 address
- MAC-spoofing detection via IPv6 verification
- Tamper-detection: if MAC changes, derived IPv6 no longer matches
```

---

## 3. IP Addressing Plan (Field-Specific Annotations)

| Segment | IPv4 Network | IPv6 Network | MAC Address | Derived EUI-64 | Proof Obligation |
|---------|------------|------------|-------------|---------------|----|
| LAN1 | 192.168.1.0/24 | 2001:DB8:0:1::/64 | PC1: AA:11:22:33:44:55 | A811:22FF:FE33:4455 | **Device identity proven**: MAC-derived EUI-64 matches configured IPv6 |
| LAN1 | 192.168.1.0/24 | 2001:DB8:0:1::/64 | PC2: AA:11:22:33:44:66 | A811:22FF:FE33:4466 | **Device identity proven**: Cryptographic verification matches |
| LAN2 | 192.168.2.0/24 | 2001:DB8:0:2::/64 | SRV1: BB:11:22:33:44:77 | B911:22FF:FE33:4477 | **Device identity proven**: Attestation via EUI-64 derivation |
| LAN2 | 192.168.2.0/24 | 2001:DB8:0:2::/64 | SRV2: BB:11:22:33:44:88 | B911:22FF:FE33:4488 | **Device identity proven**: Tamper-resistant (MAC↔IPv6 binding) |
| LAN3 | 192.168.3.0/24 | 2001:DB8:0:3::/64 | R2: CC:11:22:33:44:99 | CA11:22FF:FE33:4499 | **Device identity proven**: Cryptographic derivation verified |

**Critical design choice:** Each device's IPv6 address is cryptographically linked to its MAC address via EUI-64. If a device's MAC changes (e.g., due to tampering or replacement), the derived IPv6 address will not match the configured address, triggering a security alert.

This is the foundation for dcentral-core's DID issuance: a device's decentralized identifier can be anchored to its MAC-derived IPv6 address, proving that the DID holder controls the hardware.

---

## 4. Configuration (Field-Specific Optimizations)

### 4.1 Router-1 (R1): Dual-Stack Configuration with IPv6 EUI-64

```text
! ===== ENABLE IPv6 ROUTING (GLOBALLY) =====
R1(config)#ipv6 unicast-routing
! Explanation: Allows this router to forward IPv6 packets between LANs.
! Proof obligation: Necessary for IPv6 reachability between subnets.

! ===== LAN1 CONFIGURATION (MULTICAST, DNS, DHCP delegation) =====
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ip address 192.168.1.1 255.255.255.0
! IPv4 address for legacy compatibility

R1(config-if)#ipv6 address 2001:DB8:0:1::1/64
! Static global IPv6 address for the router itself (not derived from MAC; router address is well-known)

R1(config-if)#ipv6 address 2001:DB8:0:1::/64 eui-64
! Configure the interface prefix; on physical devices, link-local is auto-generated
! Proof obligation: This enables automatic EUI-64 derivation for connected devices

R1(config-if)#ipv6 enable
! Ensures IPv6 is enabled on this interface (generates link-local if not present)

R1(config-if)#no shutdown
R1(config-if)#exit

! ===== LAN2 CONFIGURATION =====
R1(config)#interface GigabitEthernet0/1
R1(config-if)#ip address 192.168.2.1 255.255.255.0
R1(config-if)#ipv6 address 2001:DB8:0:2::1/64
R1(config-if)#ipv6 address 2001:DB8:0:2::/64 eui-64
R1(config-if)#ipv6 enable
R1(config-if)#no shutdown
R1(config-if)#exit

! ===== LAN3 CONFIGURATION (Inter-router link) =====
R1(config)#interface GigabitEthernet0/2
R1(config-if)#ip address 192.168.3.1 255.255.255.0
R1(config-if)#ipv6 address 2001:DB8:0:3::1/64
R1(config-if)#ipv6 address 2001:DB8:0:3::/64 eui-64
R1(config-if)#ipv6 enable
R1(config-if)#no shutdown
R1(config-if)#exit

! ===== SECURITY: IPv6 NEIGHBOR DISCOVERY PROTECTION =====
! (Optional: advanced security; part of Field-4 proof obligation)
R1(config)#ipv6 nd suppress-ra
! Suppress unsolicited RA announcements; only respond to Router Solicitations
! Proof obligation: Prevents rogue IPv6 announcements that could confuse devices about their prefix

R1(config)#exit
R1#copy running-config startup-config
Destination filename [startup-config]? [press Enter]
```

**Justification for Field 4:**
- `ipv6 unicast-routing` globally enables IPv6 forwarding, proving this is a multi-LAN IPv6 network
- `ipv6 address 2001:DB8:0:X::1/64` assigns the router's well-known address
- `ipv6 address 2001:DB8:0:X::/64 eui-64` on the interface enables automatic EUI-64 derivation for connected devices. This is the cryptographic foundation: devices will derive their IPv6 addresses from this prefix + their MAC address.
- `ipv6 nd suppress-ra` adds security: this router is the authoritative source for this prefix; rogue devices cannot inject false prefix announcements

### 4.2 Router-2 (R2): LAN3 Configuration

```text
! (Similar configuration for R2's connection to LAN3)
R2(config)#ipv6 unicast-routing
R2(config)#interface GigabitEthernet0/0
R2(config-if)#ip address 192.168.3.2 255.255.255.0
R2(config-if)#ipv6 address 2001:DB8:0:3::2/64
R2(config-if)#ipv6 address 2001:DB8:0:3::/64 eui-64
R2(config-if)#ipv6 enable
R2(config-if)#no shutdown
R2(config-if)#exit
```

### 4.3 PC and Server Configuration: Static IPv6 with Cryptographic Verification

In Packet Tracer, each PC/server is configured with a manually-derived EUI-64 address:

```text
! ===== PC1 Configuration (MAC: AA:11:22:33:44:55) =====
Desktop → IP Configuration
IPv4 Address: 192.168.1.10
IPv4 Subnet: 255.255.255.0
IPv4 Gateway: 192.168.1.1

IPv6 Address: 2001:DB8:0:1:A811:22FF:FE33:4455/64
! Explanation: This IPv6 address is the cryptographic derivation of PC1's MAC
! MAC: AA:11:22:33:44:55
! Derived EUI-64: A811:22FF:FE33:4455 (follows MAC→EUI-64 transformation)
! Full IPv6: 2001:DB8:0:1 (prefix) + A811:22FF:FE33:4455 (host ID)

IPv6 Gateway: 2001:DB8:0:1::1 (R1's IPv6 address)

! ===== PC2 Configuration (MAC: AA:11:22:33:44:66) =====
IPv4 Address: 192.168.1.11
IPv4 Subnet: 255.255.255.0
IPv4 Gateway: 192.168.1.1
IPv6 Address: 2001:DB8:0:1:A811:22FF:FE33:4466/64
IPv6 Gateway: 2001:DB8:0:1::1

! ===== SRV1 Configuration (MAC: BB:11:22:33:44:77) =====
IPv4 Address: 192.168.2.50
IPv4 Subnet: 255.255.255.0
IPv4 Gateway: 192.168.2.1
IPv6 Address: 2001:DB8:0:2:B911:22FF:FE33:4477/64
IPv6 Gateway: 2001:DB8:0:2::1

! ===== SRV2 Configuration (MAC: BB:11:22:33:44:88) =====
IPv4 Address: 192.168.2.51
IPv4 Subnet: 255.255.255.0
IPv4 Gateway: 192.168.2.1
IPv6 Address: 2001:DB8:0:2:B911:22FF:FE33:4488/64
IPv6 Gateway: 2001:DB8:0:2::1
```

---

## 5. Field-Specific Verification Steps

**Proof obligation:** Device identity must be verifiable via cryptographic derivation of IPv6 address from MAC address. A device's IPv6 address is proof that the device's MAC is authentic.

### Scenario 1: Manual EUI-64 Derivation and Cryptographic Verification

```text
Step 1: Manually derive EUI-64 from PC1's MAC address (AA:11:22:33:44:55)
  
  Transformation process:
  1. Take the first 3 octets (manufacturer OUI): AA:11:22
  2. Flip the 7th bit (least significant bit of first octet): AA → A8 (binary: 10101010 → 10101000)
  3. Insert FF:FE after the first 3 octets: A8:11:22:FF:FE
  4. Append the remaining 3 octets: A8:11:22:FF:FE:33:44:55
  5. Result: EUI-64 = A811:22FF:FE33:4455

Step 2: Combine prefix + derived EUI-64
  Prefix: 2001:DB8:0:1::/64
  EUI-64: A811:22FF:FE33:4455
  Full IPv6 address: 2001:DB8:0:1:A811:22FF:FE33:4455

Step 3: Verify PC1 is configured with this address
  PC1#ipconfig
  Expected output: IPv6 Address = 2001:DB8:0:1:A811:22FF:FE33:4455/64
  CRYPTOGRAPHIC PROOF: PC1's IPv6 address matches the derived EUI-64

Step 4: Repeat for PC2 (MAC: AA:11:22:33:44:66)
  Derived EUI-64: A811:22FF:FE33:4466
  Expected IPv6: 2001:DB8:0:1:A811:22FF:FE33:4466/64
  Verify: PC2#ipconfig

Step 5: Repeat for SRV1 (MAC: BB:11:22:33:44:77)
  Derived EUI-64: B911:22FF:FE33:4477
  Expected IPv6: 2001:DB8:0:2:B911:22FF:FE33:4477/64
  Verify: SRV1#ipconfig

PROOF OBJECTIVE MET: All devices' IPv6 addresses are cryptographically verifiable via EUI-64 derivation from MAC.
```

### Scenario 2: Attestation - Proving Device Identity via IPv6

```text
Step 1: Query device's IPv6 address and MAC address
  PC1#ipconfig
  Expected: IPv6 Address = 2001:DB8:0:1:A811:22FF:FE33:4455
  Expected: MAC Address = AA:11:22:33:44:55

Step 2: Independently derive EUI-64 from reported MAC
  Given MAC: AA:11:22:33:44:55
  Derived: A811:22FF:FE33:4455

Step 3: Verify derived EUI-64 matches IPv6 address's host ID
  IPv6 host ID: A811:22FF:FE33:4455
  Derived host ID: A811:22FF:FE33:4455
  MATCH: Yes
  ATTESTATION RESULT: Device PC1 proven authentic (MAC↔IPv6 binding verified)

Step 4: Repeat for all devices (PC2, SRV1, SRV2)
  All expected to match; any mismatch indicates tampering or misconfiguration

PROOF OBJECTIVE MET: Device identity is proven by cryptographic derivation of IPv6 from MAC.
```

### Scenario 3: Tamper Detection - MAC Spoofing Attempt

```text
Step 1: Attempt to change PC1's MAC address (simulated tamper)
  ! In Packet Tracer, modify PC1's physical MAC to AA:11:22:33:44:99 (different from original AA:11:22:33:44:55)

Step 2: Query PC1's IPv6 address
  PC1#ipconfig
  Expected (if manually maintained): IPv6 = 2001:DB8:0:1:A811:22FF:FE33:4455 (old value)
  Actual MAC: AA:11:22:33:44:99 (changed)

Step 3: Verify cryptographic mismatch
  IPv6 address (2001:DB8:0:1:A811:22FF:FE33:4455) no longer matches changed MAC (AA:11:22:33:44:99)
  Derived from new MAC: A811:22FF:FE33:4499
  
  Comparison:
  IPv6 host ID: A811:22FF:FE33:4455 (original)
  Derived from current MAC: A811:22FF:FE33:4499 (current)
  MISMATCH: Yes
  TAMPER DETECTED: Device identity cannot be verified

Step 4: Correct action: reconfigure PC1 with new IPv6 derived from new MAC
  IPv6 Address: 2001:DB8:0:1:A811:22FF:FE33:4499/64 (matches new MAC)

PROOF OBJECTIVE MET: Tamper detection works; any change to MAC breaks IPv6 verification until address is re-derived.
```

### Scenario 4: Cross-Device Validation (Proving No Forgery)

```text
Step 1: Attempt to configure PC2 with PC1's IPv6 address (spoofing)
  ! In Packet Tracer, set PC2's IPv6 = 2001:DB8:0:1:A811:22FF:FE33:4455 (PC1's address)
  ! PC2's MAC remains: AA:11:22:33:44:66

Step 2: Query PC2's configuration
  PC2#ipconfig
  IPv6 Address: 2001:DB8:0:1:A811:22FF:FE33:4455 (spoofed)
  MAC Address: AA:11:22:33:44:66 (actual)

Step 3: Attempt cryptographic verification
  Derive EUI-64 from PC2's MAC (AA:11:22:33:44:66): A811:22FF:FE33:4466
  Compare to IPv6 host ID: A811:22FF:FE33:4455 (from spoofed address)
  MISMATCH: Derived (A811:22FF:FE33:4466) ≠ IPv6 (A811:22FF:FE33:4455)
  SPOOFING DETECTED: PC2 cannot prove it holds PC1's identity

Step 4: Verify cross-device communication reflects identity
  PC2#ping 2001:DB8:0:1:A811:22FF:FE33:4455 (attempting to reach spoofed PC1 address via PC2)
  ! Routing may succeed (R1 will forward to wherever that IPv6 is), but the cryptographic proof fails
  ! A security system reading both IPv6 address + MAC would detect: "IPv6 says PC1, but MAC says PC2" → rejection

PROOF OBJECTIVE MET: Spoofing is detectable; cryptographic identity is not forgeable via IPv6 alone.
```

---

## 6. Expected Output Gallery (Field-Specific Scenarios)

### 6.1 Manual EUI-64 Derivation (Proof of Identity)

```text
[Student Exercise: Derive EUI-64 from MAC]

Input MAC: AA:11:22:33:44:55
Output EUI-64: A811:22FF:FE33:4455

Derivation Steps:
1. OUI (first 3 octets): AA:11:22
2. Flip 7th bit of AA: A8
3. Insert FF:FE: A8:11:22:FF:FE
4. Append remaining: A8:11:22:FF:FE:33:44:55
5. Format as IPv6: A811:22FF:FE33:4455

Verification: PC1#ipconfig
IPv6 Address: 2001:DB8:0:1:A811:22FF:FE33:4455/64 ✓ MATCHES
```

### 6.2 IPv6 Address Listing with Cryptographic Verification

```text
R1#show ipv6 interface brief

Interface                          IPv6 Address                         Status
GigabitEthernet0/0                 2001:DB8:0:1::1                      up
GigabitEthernet0/0                 FE80::1                              up [link-local]
GigabitEthernet0/1                 2001:DB8:0:2::1                      up
GigabitEthernet0/1                 FE80::2                              up [link-local]
GigabitEthernet0/2                 2001:DB8:0:3::1                      up
GigabitEthernet0/2                 FE80::3                              up [link-local]

PC1#ipconfig

IPv4 Address: 192.168.1.10
IPv4 Subnet: 255.255.255.0
IPv6 Address: 2001:DB8:0:1:A811:22FF:FE33:4455/64
IPv6 Gateway: 2001:DB8:0:1::1
MAC Address: AA:11:22:33:44:55

[CRYPTOGRAPHIC VERIFICATION]
MAC → EUI-64: A811:22FF:FE33:4455
IPv6 host ID: A811:22FF:FE33:4455
MATCH: ✓ Device identity verified
```

### 6.3 Cross-LAN Connectivity with IPv6

```text
PC1#ping 2001:DB8:0:2:B911:22FF:FE33:4477

Pinging 2001:DB8:0:2:B911:22FF:FE33:4477 with 32 bytes of data:

Reply from 2001:DB8:0:2:B911:22FF:FE33:4477: bytes=32 time=10ms TTL=62
Reply from 2001:DB8:0:2:B911:22FF:FE33:4477: bytes=32 time=8ms TTL=62
Reply from 2001:DB8:0:2:B911:22FF:FE33:4477: bytes=32 time=9ms TTL=62
Reply from 2001:DB8:0:2:B911:22FF:FE33:4477: bytes=32 time=10ms TTL=62

Ping statistics for 2001:DB8:0:2:B911:22FF:FE33:4477:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)
    Approximate round trip times in ms:
    Minimum = 8ms, Maximum = 10ms, Average = 9ms

[IDENTITY VERIFICATION]
Source: PC1 (MAC AA:11:22:33:44:55, IPv6 A811:22FF:FE33:4455) ✓ Verified
Destination: SRV1 (MAC BB:11:22:33:44:77, IPv6 B911:22FF:FE33:4477) ✓ Verified
Communication: Authenticated via cryptographic identity
```

### 6.4 Neighbor Discovery Cache with IPv6 Identities

```text
PC1#show ipv6 neighbors

IPv6 Address                    Age Link-layer Address
2001:DB8:0:1::1                 10 AA.BB.CC.00.00.01 (R1)
2001:DB8:0:1:A811:22FF:FE33:4466  15 AA.11.22.33.44.66 (PC2)
FE80::1                          10 AA.BB.CC.00.00.01 (R1's link-local)

[CRYPTOGRAPHIC VERIFICATION AGAINST CACHE]
Entry: 2001:DB8:0:1:A811:22FF:FE33:4466
Link-layer (MAC): AA.11.22.33.44.66
Derived EUI-64: A811:22FF:FE33:4466
MATCH: ✓ Neighbor identity verified
```

---

## 7. Common Field-Specific Mistakes

### Mistake 1: Incorrect Bit-Flip in EUI-64 Derivation

**What breaks:**
```text
Input MAC: AA:11:22:33:44:55
WRONG derivation: A811:22FF:FE33:4455 (forgot to flip bit; took AA as-is)
CORRECT derivation: A811:22FF:FE33:4455 (flipped AA→A8)
```

**Why:** The 7th bit flip is a cryptographic requirement; skipping it violates the EUI-64 standard and breaks identity verification. A device configured with the wrong EUI-64 will not match its actual MAC.

**Fix:** Follow the EUI-64 derivation algorithm exactly:
1. Flip bit 7 of the first octet (AA → A8)
2. Insert FF:FE after octet 3
3. Append remaining octets

### Mistake 2: Forgetting FF:FE Insertion

**What breaks:**
```text
MAC: AA:11:22:33:44:55
WRONG: A811:2233:4455 (missing FF:FE entirely)
CORRECT: A811:22FF:FE33:4455 (FF:FE inserted)
```

**Why:** The FF:FE marker is required by RFC 4291 to distinguish EUI-64-derived interface identifiers from other sources. Omitting it breaks the cryptographic proof that the address came from the MAC.

**Fix:** Always insert FF:FE between octets 3 and 4.

### Mistake 3: Configuring Static IPv6 Without Verifying EUI-64 Derivation

**What breaks:**
```text
PC1 is configured with IPv6: 2001:DB8:0:1::10 (well-known, non-derived address)
PC1's MAC: AA:11:22:33:44:55
Derived EUI-64: A811:22FF:FE33:4455

Security check:
IPv6 host ID: 0000:0000:0000:0010 (from ::10)
Derived from MAC: A811:22FF:FE33:4455
MISMATCH: Cannot prove PC1's identity via IPv6 address
```

**Why:** If the IPv6 address is not derived from the MAC, cryptographic identity verification is impossible. An attacker could claim to be PC1 by spoofing the ::10 address.

**Fix:** Configure all host devices with IPv6 addresses derived from their MACs (via EUI-64 derivation). Router addresses can remain well-known (::1 for R1, etc.).

### Mistake 4: Not Enabling IPv6 Unicast Routing Globally

**What breaks:**
```text
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ipv6 address 2001:DB8:0:1::1/64
! Interface has an IPv6 address, but...
! ipv6 unicast-routing is NOT enabled globally

PC1#ping 2001:DB8:0:2:B911:22FF:FE33:4477 (SRV1 on LAN2)
! TIMEOUT: Request unreachable
! Reason: R1 does not forward IPv6 packets between LANs
```

**Why:** IPv6 routing must be enabled globally for the router to forward IPv6 traffic. Configuring IPv6 addresses on interfaces is necessary but not sufficient.

**Fix:** Add `ipv6 unicast-routing` to the global config and save.

### Mistake 5: Mixing Manual and Auto-Generated IPv6 Addresses Inconsistently

**What breaks:**
```text
R1 is configured with both:
  ipv6 address 2001:DB8:0:1::1/64 (manual, well-known)
  ipv6 address 2001:DB8:0:1::/64 eui-64 (auto-generated from R1's MAC)

Devices on LAN1 receive RA (Router Advertisement) with both prefixes
PC1 might derive its identity from ::1 prefix (trusting R1's manual address) or from EUI-64 prefix
Inconsistency: PC1's identity derivation depends on which RA it received first
```

**Why:** Dual IPv6 addresses on the same interface can confuse devices about which prefix to use for identity derivation. If PC1 uses the wrong prefix, its identity will not match expectations.

**Fix:** On interface, configure either a manual address (like ::1 for routers) OR enable EUI-64, not both. Use manual for router well-known addresses; use EUI-64 for device identity derivation.

---

## 8. Troubleshooting by Field (Diagnostic Method)

### Problem: "IPv6 address doesn't match derived EUI-64 from MAC"

```text
Step 1: Retrieve device's current IPv6 address
  PC1#ipconfig
  Expected: IPv6 = 2001:DB8:0:1:A811:22FF:FE33:4455/64
  Actual: [Record what's shown]

Step 2: Retrieve device's current MAC address
  PC1#ipconfig
  Expected: MAC = AA:11:22:33:44:55
  Actual: [Record what's shown]

Step 3: Manually derive EUI-64 from actual MAC
  Given MAC: [from step 2]
  Derivation: [follow RFC 4291 algorithm]
  Expected EUI-64: [calculated value]

Step 4: Extract host ID from IPv6 address
  IPv6 address: [from step 1]
  Prefix: 2001:DB8:0:1::/64 (first 64 bits)
  Host ID: [last 64 bits]

Step 5: Compare
  If Host ID == Derived EUI-64: MATCH ✓ Identity verified
  If Host ID ≠ Derived EUI-64: MISMATCH → Reconfigure IPv6 address
  
  To fix: Set IPv6 = 2001:DB8:0:1:[Derived EUI-64]/64

Step 6: Verify connectivity after reconfiguration
  PC1#ping 2001:DB8:0:2::1 (R1's IPv6 on LAN2)
  Expected: Reply received
```

### Problem: "IPv6 routing not working between LANs"

```text
Step 1: Verify global IPv6 routing is enabled on R1
  R1#show ipv6 route
  Expected: Output shows connected routes (C) for all LANs
  If no routes shown: IPv6 routing is disabled
  
Step 2: Enable IPv6 unicast routing if needed
  R1#configure terminal
  R1(config)#ipv6 unicast-routing
  R1(config)#exit
  R1#copy running-config startup-config

Step 3: Verify IPv6 addresses on all R1 interfaces
  R1#show ipv6 interface brief
  Expected: All interfaces (Gi0/0, Gi0/1, Gi0/2) show IPv6 addresses and status "up"
  If any "down": Check interface status (no shutdown)

Step 4: Test reachability from PC1 to LAN2
  PC1#ping 2001:DB8:0:2::1 (R1's IPv6 address on LAN2)
  Expected: Reply received
  If timeout: Check PC1's IPv6 gateway (should be 2001:DB8:0:1::1)

Step 5: Test full cross-LAN connectivity
  PC1#ping 2001:DB8:0:2:B911:22FF:FE33:4477 (SRV1)
  Expected: Reply received (proves end-to-end routing)
```

### Problem: "Cryptographic verification fails; MAC and IPv6 don't match"

```text
Step 1: Verify MAC address hasn't changed
  PC1#ipconfig
  Record: MAC = [value]
  Expected: MAC = AA:11:22:33:44:55
  If different: Device may have been swapped or tampered

Step 2: Verify IPv6 address hasn't been changed
  PC1#ipconfig
  Record: IPv6 = [value]
  Expected: IPv6 = 2001:DB8:0:1:A811:22FF:FE33:4455/64
  If different: IPv6 was manually modified (or device was replaced)

Step 3: Re-derive EUI-64 from current MAC
  MAC = [from step 1]
  Derived EUI-64 = [calculation]

Step 4: Compare IPv6 host ID to derived EUI-64
  If MATCH: Identity verified; no action needed
  If MISMATCH: Identity verification failed
    → Either MAC was changed (tamper detected) or IPv6 was misconfigured
    → Reconfigure IPv6 = 2001:DB8:0:1:[Derived EUI-64]/64

Step 5: Alert if mismatch indicates tampering
  "Device PC1 (MAC AA:11:22:33:44:55) cannot prove its IPv6 identity.
   Either the device's MAC changed without updating IPv6, or the device
   was replaced. Manual intervention required to re-establish identity."
```

---

## 9. Design Analysis: Field-Specific Reasoning

**Why does this variant matter for Security (Field 4)?**

Traditional networks treat IPv6 addresses and MAC addresses as independent identifiers. A device has a MAC (fixed hardware identity) and an IPv6 address (network-assigned), and there is no cryptographic relationship between them. An attacker can spoof an IPv6 address without affecting the MAC; the network cannot prove who really holds an address.

This variant proves the hypothesis: **IPv6 addresses can be cryptographically derived from MAC addresses, enabling proof-of-identity verification.**

Key architectural insights:

1. **Cryptographic Proof of Identity**: By tying each device's IPv6 address to its MAC via EUI-64, we create a cryptographic proof that a specific hardware device holds a specific network address. Spoofing the IPv6 address alone is insufficient — an attacker would also need to spoof the MAC, which is harder to do transparently across a network.

2. **Tamper Detection**: If a device's MAC is changed (via tampering, replacement, or compromise), the derived IPv6 address will no longer match the device's claimed identity. This makes tampering detectable at the network level.

3. **Attestation Foundation**: For dcentral-core's DID issuance, this is critical. A device's decentralized identifier can be anchored to its MAC-derived IPv6 address, proving that the DID holder is the owner of the hardware. Without this, DIDs would be forgeable.

4. **P38 Pilot Security**: Haiti's early mesh will include devices in field locations where physical security is limited (outdoor sites, remote clinics). Cryptographic device identity tied to MAC/IPv6 allows mesh nodes to identify each other reliably even when physical inspection is not feasible.

Together, these design choices prove that IPv6 addressing can provide strong device identity proofs, validating the security assumption underlying dcentral-core's identity layer and unblocking P34–P38 deployment.

---

## 10. Real-World Parallel: Haiti Deployment Phase

**D-Central Module:** `dcentral-core` (node identity, DID issuance, cryptographic identity)

**Haiti Phase:** P34 (security foundational) onwards; P38 pilot (50–100 node mesh)

**Linkage:**

In dcentral-core's architecture, every mesh node must prove its identity to join the network. Identity proofs are based on hardware: a node's MAC address, signed with a key derived from hardware entropy, proves that the node is authentic.

This lab proves that IPv6 addresses can encode hardware identity via EUI-64 derivation. In P34–P38 deployment:

- A new node boots with only its hardware MAC address known
- The node derives its IPv6 address via EUI-64 from its MAC
- A trust anchor (e.g., a bootstrapping service) queries the node's MAC and verifies its IPv6 address
- The trust anchor issues a DID anchored to MAC→IPv6 derivation: "This DID belongs to the device whose MAC derives this IPv6"
- Future cryptographic operations on this DID are verified against the stored MAC→IPv6 binding

Without this proof (that IPv6 addresses are cryptographically tied to MAC), DIDs would not be anchored to hardware identity, and nodes could impersonate each other trivially.

With it, Haiti's P38 pilot can establish a chain of trust from hardware (MAC) → network identity (IPv6) → cryptographic identity (DID).

---

## 11. Stretch Goals: Advanced Proof Obligations

### Goal 1: Formal Verification of EUI-64 Derivation

Prove using symbolic execution or model checking that the EUI-64 transformation is a cryptographic one-way function: given an IPv6 address in EUI-64 format, an adversary cannot efficiently recover the original MAC address.

**Relevant properties to verify:**
- Bit-flip property is necessary and non-invertible
- FF:FE marker is tamper-proof (cannot be forged from legitimate MAC)
- Address space collision is impossible (2^48 MACs → 2^48 EUI-64s, injective mapping)

### Goal 2: Byzantine-Resistant Identity Attestation

Layer this lab with Field 3 (DePIN, Byzantine resilience):
- Deploy a multi-node identity verification system where a quorum of nodes must agree that a device's MAC→IPv6 derivation is correct
- Test Byzantine scenarios: one node claims a different MAC→IPv6 binding; quorum detects the lie

### Goal 3: Post-Quantum Cryptography Integration

Extend IPv6 to encode post-quantum-resistant identity proofs. Instead of deriving the address from MAC alone, derive it from a hash of (MAC + quantum-resistant public key). Verify that this prevents both classical and quantum-computer-based forgery.

### Goal 4: Hardware Attestation Chain

Anchor the MAC→IPv6 proof to a hardware attestation (e.g., TPM-signed MAC). Prove that a device whose TPM signs its MAC as authentic can then prove its IPv6 address is cryptographically tied to that MAC.

---

## 12. Self-Assessment (Field-Specific BSL)

Evaluate yourself on this field-specific lab using this BSL scale:

```
BSL-0 AWARENESS
  You've read this lab once. You couldn't replicate it from memory.
  
BSL-1 LAB CAPABLE
  You completed this lab with the manual open. You can manually derive
  EUI-64 from a MAC address and verify it matches a configured IPv6 address.
  
BSL-2 OFFLINE
  You could repeat this lab with the manual, no internet. You can derive
  EUI-64 for any given MAC and configure IPv6 addresses correctly.
  
BSL-3 RECOVERABLE
  You could rebuild this lab from the topology diagram only. Given a device's
  MAC address, you can derive its IPv6 address; given an IPv6 address, you
  can extract its EUI-64 and compare to the expected MAC. You can detect
  tampering by verifying MAC↔IPv6 consistency.
  
BSL-4 MAINTAINABLE
  You could modify this lab's topology (add more devices, different prefixes,
  multiple routers) and still maintain cryptographic identity verification
  for all devices. You can troubleshoot identity mismatches.
  
BSL-5 TEACHABLE
  You could teach this lab to someone else, correctly explaining why IPv6's
  EUI-64 cryptographic derivation matters for device identity, how to manually
  derive it, how to verify it, and how to detect tampering. You could design
  similar identity-verification systems for other protocols.

Target BSL for this lab: BSL-3 to BSL-4
  (You should be able to rebuild the topology and verify cryptographic
   identities with the diagram; bonus for modifications to the addressing
   scheme and verification procedures.)
```

---

*Day 31 — Field 4 (Security) Lab — Completed August 2026. IPv6 cryptographic device identity is foundational for Haiti deployment (P34 security, P38+ pilot). This lab proves that network addressing can encode and verify hardware identity via EUI-64 cryptographic derivation.*
