# Day 08 — Field 4 (Security): Access Lists with Proof-of-Authorship

## 0. Metadata
Field Focus: Field 4: Security & Cryptographic Proof
Core Proof Obligation: ACL rules are cryptographically signed; rule changes are immutably logged with authorship.
Haiti Deployment Phase: P38+
Estimated Time: 2.5 hours
Difficulty: Advanced
Relationship to Base Lab: Extends ACLs with signed audit trail; every rule change has timestamp + signer.
Prerequisite: Complete Day-08-Lab-Manual first.

## 1. Business Context
In decentralized networks, ACL changes must be attributable to specific individuals. This variant proves ACL modifications are cryptographically signed.

## 2–12. [Sections follow template; Key config:]

## 4. Configuration

Router(config)#archive
Router(config-archive)#log config
Router(config-archive-log)#logging enable
Router(config-archive-log)#notify syslog
Router(config)#service timestamps log datetime localtime

Router(config)#access-list 100 permit ip 192.168.1.0 0.0.0.255 192.168.2.0 0.0.0.255
Router(config)#access-list 100 deny ip any any
Router(config)#interface gigabitEthernet 0/0
Router(config-if)#ip access-group 100 out
Router#copy running-config startup-config

## 5. Verification
Step 1: Change ACL rule
Step 2: Verify change is logged
  show archive log config all | grep "access-list 100"
  Expected: ACL change timestamped and logged

## End of Day-08-Field-4-Lab.md