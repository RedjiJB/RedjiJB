# Day 06 — Access Control Lists

## Practice Lab: ACL Configuration & Testing

---

## 1. Standard ACL Configuration

**Block PC0 from accessing Tokyo (on R1-NY):**
```
R1-NY(config)# access-list 1 deny host 192.168.10.50
R1-NY(config)# access-list 1 permit any
R1-NY(config)# interface GigabitEthernet0/1
R1-NY(config-if)# ip access-group 1 out
R1-NY(config-if)# exit

! Verify
R1-NY# show access-lists
R1-NY# show ip interface Gi0/1 | include access
```

---

## 2. Extended ACL Configuration

**Allow HTTP/HTTPS only (on R1-NY):**
```
R1-NY(config)# ip access-list extended Allow-Web
R1-NY(config-ext-acl)# permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 80
R1-NY(config-ext-acl)# permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 443
R1-NY(config-ext-acl)# deny ip any any
R1-NY(config-ext-acl)# exit

R1-NY(config)# interface GigabitEthernet0/1
R1-NY(config-if)# ip access-group Allow-Web out
```

---

## 3. Testing

**Test HTTP (should succeed):**
```
PC0# curl http://192.168.20.10
! Connects (port 80 allowed)
```

**Test SSH (should fail):**
```
PC0# ssh admin@192.168.20.10
! Timeout (port 22 denied by ACL)
```

**Test ping (should fail):**
```
PC0# ping 192.168.20.10
! Timeout (ICMP denied by "deny ip any any")
```

---

## 4. Verification

```
R1-NY# show access-lists Allow-Web

Extended IP access list Allow-Web
    10 permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 80 (matches)
    20 permit tcp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255 eq 443 (0 matches)
    30 deny ip any any (matches)
```

---

**Practice Lab Version:** 1.0
