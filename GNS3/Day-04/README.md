# GNS3 Lab Build: Day 04 — Device Security

**Focus:** SSH configuration, enable secret passwords, VTY access control

**Base Topology:** Same as Day 02–03 (3 branches, 3 routers, 3 switches, firewalls, end devices)

## 1. Configuration Overview

### Routers (R1-NY, R2-TKY, R3-SGP, ISP-RTR)

**VyOS SSH Setup:**
```
configure
set service ssh port 22
set system login user admin level admin
set system login user admin authentication plaintext-password "SecureP@ssw0rd!"
commit
```

### Switches (SW1, SW2, SW3)

**Cisco SSH Setup:**
```
username admin privilege 15 password 0 SecureP@ssw0rd!
enable secret 0 EnableP@ssw0rd!
ip ssh version 2
crypto key generate rsa modulus 2048
line vty 0 4
 login local
 transport input ssh
 exec-timeout 10 0
```

---

## 2. Field Variants

### Field-1: RADIUS Authentication
- Centralized user management
- Requires RADIUS server node
- All devices authenticate against RADIUS

### Field-2: SSH Key-Based Authentication
- Disable password auth
- Require SSH private keys for login
- More secure than passwords

### Field-3: TACACS+ Authorization
- Network-wide privilege management
- Requires TACACS+ server
- Granular command authorization

### Field-4: VTY Access ACL
- Restrict SSH to specific subnets
- Example: Only admin network (192.168.1.0/24) can SSH
- Prevents unauthorized remote access

### Field-5: Console Port Security
- Require password on console (physical access control)
- Configure `line console 0` with authentication

### Field-6: Banner Warnings
- Display warning banner before login
- Example: "Authorized Users Only"

### Field-7: Session Timeout
- Auto-logout after inactivity
- Prevents credential theft from abandoned terminals

---

## 3. Build Steps

1. Import Day-02/03 topology
2. Configure SSH on all routers (VyOS)
3. Configure SSH on all switches (Cisco)
4. Test SSH connections from PC0, SRV1, SGP1
5. Verify telnet is disabled
6. Export as day04-base.gns3

---

## 4. Verification

```bash
# From PC0, test SSH to R1
ssh admin@192.168.10.1
# Expected: Prompt for password, then shell access

# Verify telnet fails
telnet 192.168.10.1 23
# Expected: Timeout/connection refused

# Check enable secret on SW1
ssh admin@192.168.10.2
# After login: enable
# Prompt for enable secret password
```

---

## 5. Next: Day 05

**Port Security & Storm Control:** MAC address limiting, broadcast storm prevention

**README Version:** 1.0
