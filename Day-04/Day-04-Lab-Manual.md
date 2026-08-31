# Day 04 — Device Security

## Lab Manual: Enable Secret, SSH, and Basic Authentication

---

## 0. Metadata

| Field | Value |
|---|---|
| **Lab Title** | Device Security: Authentication & Remote Access |
| **Day** | Day 04 (Security Foundation) |
| **Topic Focus** | Enable secret password, SSH configuration, console/vty access control, telnet vs. SSH |
| **Estimated Time** | 2–3 hours |
| **Difficulty** | Beginner to Intermediate |
| **Prerequisites** | Day 01–03 completed |
| **Lab Scope** | Secure remote access to all routers and switches; replace telnet with SSH; configure enable passwords |
| **Standards Referenced** | RFC 4251 (SSH Protocol), RFC 5425 (NETCONF over SSH) |
| **Expected Outcome** | All devices have SSH enabled, telnet disabled, enable secret configured, and remote access secured |

---

## 1. Overview

**Problem:** By default, routers/switches use:
- **Telnet** for remote access (unencrypted; password visible in packet capture)
- **No enable password** (anyone can type `enable` and access privileged mode)

**Solution:** This lab secures devices by:
- Configuring **enable secret** (encrypted password for privileged mode)
- Enabling **SSH** (encrypted remote access; RFC 4251)
- Disabling **telnet** (unencrypted and insecure)
- Configuring VTY (virtual terminal) access control

By the end, accessing any device requires:
1. SSH login (encrypted username/password)
2. `enable` command + enable secret password (encrypted)

---

## 2. Security Concept: Authentication Layers

**Two-Factor Security Model:**
1. **User Authentication:** Who are you? (login username/password)
2. **Privilege Escalation:** What can you do? (enable secret for privileged commands)

**Example:** At Cisco router:
```
Router> enable
Password: ******* (enable secret)
Router#
! Now in privileged mode; can configure device
```

---

## 3. Configuration by Device

### 3.1 R1-NY (VyOS Router) - SSH Configuration

**Step 1: Generate SSH Key Pair**
```
vyos@vyos:~$ configure
[edit]
vyos@vyos# set service ssh port 22
vyos@vyos# set service ssh disable-password-authentication false
vyos@vyos# commit
```

**Explanation:**
- SSH service enabled on port 22 (standard)
- Password authentication enabled (alternative: key-based auth)

**Step 2: Create User Account**
```
[edit]
vyos@vyos# set system login user admin level admin
vyos@vyos# set system login user admin authentication plaintext-password "SecureP@ssw0rd!"
vyos@vyos# commit
```

**Explanation:**
- Creates user "admin" with admin privileges
- Sets plaintext password (will be hashed on commit)

**Step 3: Verify SSH**
```
vyos@vyos# exit
vyos@vyos:~$ show service ssh
SSH service is enabled
Listening on port 22
Users: admin
```

**Repeat for R2-TKY, R3-SGP, ISP-RTR**

---

### 3.2 SW1 (Cisco Switch) - SSH Configuration

**Step 1: Console Access**
```
Switch> enable
Switch# configure terminal
```

**Step 2: Create Local User Database**
```
Switch(config)# username admin privilege 15 password 0 SecureP@ssw0rd!
! "privilege 15" = highest privilege level (equivalent to "enable")
! "password 0" = plaintext (Cisco will encrypt on save)
```

**Step 3: Configure SSH**
```
Switch(config)# ip ssh version 2
! Use SSH version 2 (more secure than version 1)

Switch(config)# crypto key generate rsa modulus 2048
! Generate 2048-bit RSA key (industry standard)

! You'll see a prompt asking if you want to generate keys
Do you really want to replace them? [yes/no]: yes
! This takes a few seconds...
```

**Step 4: Configure VTY (Virtual Terminal) Lines**
```
Switch(config)# line vty 0 4
Switch(config-line)# login local
! "login local" = use local username/password database (not RADIUS/TACACS+)

Switch(config-line)# transport input ssh
! Only SSH is allowed; telnet is blocked

Switch(config-line)# exec-timeout 10 0
! Auto-logout after 10 minutes of inactivity
```

**Step 5: Configure Enable Password**
```
Switch(config)# enable secret 0 EnableP@ssw0rd!
! "enable secret" = encrypted password for privileged mode
! "password 0" = plaintext (will be encrypted)
```

**Step 6: Save and Verify**
```
Switch(config)# exit
Switch# write memory
! Save running-config to startup-config (NVRAM)

Switch# show run | include username
username admin privilege 15 password 7 14141B1F0A1B16
! "password 7" = encrypted (Cisco's proprietary encryption)

Switch# show run | include enable
enable secret 7 080F465D0A0C06
```

**Repeat for SW2, SW3**

---

## 4. Testing SSH Access

### 4.1 From a Host (e.g., PC0)

**Step 1: Install SSH Client**
```
PC0# apt-get install openssh-client
! If using Alpine: apk add openssh-client
```

**Step 2: Connect via SSH**
```
PC0# ssh admin@192.168.10.1
The authenticity of host '192.168.10.1 (192.168.10.1)' can't be established.
RSA key fingerprint is 82:12:34:56:78:9a:bc:de:f0:12:34:56:78:9a:bc:de.
Are you sure you want to continue connecting (yes/no)? yes
Warning: Permanently added '192.168.10.1' (RSA) to /etc/ssh/known_hosts.
admin@192.168.10.1's password: SecureP@ssw0rd!

R1-NY>
! Successfully connected via SSH!
```

**Step 3: Escalate to Privileged Mode**
```
R1-NY> enable
Password: EnableP@ssw0rd!
R1-NY#
! Privileged mode accessed
```

### 4.2 Verify Telnet is Disabled

**From PC0:**
```
PC0# telnet 192.168.10.1 23
Trying 192.168.10.1...
! Hangs; no response (telnet not listening)
! Expected: Port 23 is closed or telnet service is disabled
```

---

## 5. Security Configuration Summary

### 5.1 R1-NY (VyOS) - Summary

```
set service ssh port 22
set service ssh disable-password-authentication false
set system login user admin level admin
set system login user admin authentication plaintext-password "SecureP@ssw0rd!"
```

### 5.2 SW1 (Cisco) - Summary

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

## 6. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| **Forgot to generate RSA key** | SSH doesn't work; "no key" error | `crypto key generate rsa modulus 2048` |
| **VTY not configured** | SSH connects but immediately disconnects | Configure `line vty 0 4` with `login local` |
| **Telnet still enabled** | Telnet connects (security risk) | `line vty 0 4 > transport input ssh` (remove telnet) |
| **Wrong privilege level** | User can't enter privileged mode | Ensure `enable secret` is set and username has `privilege 15` |
| **Password in plaintext** | Password visible in `show run` | Use `password 0` (Cisco encrypts); VyOS encrypts on commit |

---

## 7. Verification Checklist

After securing all devices:

- [ ] SSH enabled on all routers (R1, R2, R3, ISP-RTR)
- [ ] SSH enabled on all switches (SW1, SW2, SW3)
- [ ] Telnet disabled on all devices
- [ ] Enable secret configured on all devices
- [ ] Local user database created (username + privilege 15)
- [ ] VTY lines configured with `login local` and `transport input ssh`
- [ ] SSH connection succeeds from PC0/SRV1/SGP1 to all devices
- [ ] Telnet connection fails (port 23 closed)
- [ ] Privilege escalation works (enable command + password)
- [ ] Passwords are encrypted in `show run` output

---

## 8. Advanced Security (Stretch Goals)

1. **RADIUS Authentication:** Centralized user management (requires RADIUS server)
2. **Key-Based SSH:** Use SSH key pairs instead of passwords
3. **TACACS+ Authorization:** Network-wide privilege management
4. **ACLs on VTY:** Restrict SSH access to specific subnets (e.g., only admin network)

---

## 9. Conclusion

Day 04 hardened all devices against unauthorized access:
- **Enable Secret:** Only privileged users can configure devices
- **SSH:** Encrypted remote access (replaces telnet)
- **User Accounts:** Authentication required for console and remote access

**Next:** Day 05 covers **Port Security** (limiting MAC addresses per port) and **Storm Control** (preventing broadcast storms).

---

**Lab Documentation Version:** 1.0  
**Last Updated:** 2026-08-30  
**Status:** Complete
