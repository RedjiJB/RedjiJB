# GNS3 Lab: Day 24 — Floating Static Routes

## Overview

Three-branch topology for floating static routes.

## Nodes

- R1-NY, R2-TKY, R3-SGP (VyOS routers)
- SW1, SW2, SW3 (Open vSwitch)
- End devices (Alpine Linux)
- 12 nodes, 11 links

## Build

1. Create project
2. Add nodes
3. Connect links
4. Configure per manual

## Verification

- Neighbors converge to FULL
- Routes populate all routing tables
- Ping between all branches succeeds

---

Status: Ready
