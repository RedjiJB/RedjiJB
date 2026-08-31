# Day 04 — Device Security

## Practice Lab: SSH Configuration and Privilege Escalation

---

## 1. Hands-On Configuration

### 1.1 Configure R1-NY (VyOS) for SSH

```bash
vyos@vyos:~$ configure
[edit]
vyos@vyos# set service ssh port 22
vyos@vyos# set system login user admin level admin
vyos@vyos# set system login user admin authentication plaintext-password "Secure123!"
vyos@vyos# commit
vyos@vyos# exit

! Verify SSH is running
vyos@vyos:~$ show service ssh
SSH service is enabled, listening on 0.0.0.0:22
```

### 1.2 Configure SW1 (Cisco Switch) for SSH

```
Switch> enable
Switch# configure terminal
Switch(config)# username admin privilege 15 password 0 AdminPass123!
Switch(config)# enable secret 0 EnablePass123!
Switch(config)# ip ssh version 2
Switch(config)# crypto key generate rsa modulus 2048
! When prompted: yes
Switch(config)# line vty 0 4
Switch(config-line)# login local
Switch(config-line)# transport input ssh
Switch(config-line)# exec-timeout 10 0
Switch(config-line)# exit
Switch(config)# exit
Switch# write memory

! Verify
Switch# show running-config | include username
Switch# show running-config | include enable secret
```

### 1.3 Test SSH Connection

**From PC0:**
```
PC0# ssh -u admin admin@192.168.10.1
admin@192.168.10.1's password: Secure123!
R1-NY>

R1-NY> enable
Password: EnablePass123!
R1-NY#
```

### 1.4 Verify Telnet is Blocked

```
PC0# telnet 192.168.10.1 23
! Timeout (expected; telnet not listening)
! Ctrl+C to exit
```

---

## 2. Verification Checklist

- [ ] SSH enabled on R1-NY, R2-TKY, R3-SGP, ISP-RTR
- [ ] SSH enabled on SW1, SW2, SW3
- [ ] Telnet disabled on all devices
- [ ] Enable secret password set on all devices
- [ ] SSH connection from PC0 to R1-NY succeeds
- [ ] SSH connection from SRV1 to SW1 succeeds
- [ ] Privilege escalation (`enable` command) works
- [ ] Passwords are encrypted in `show run`

---

**Practice Lab Version:** 1.0  
**Time to Complete:** 1–2 hours
