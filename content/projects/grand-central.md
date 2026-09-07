---
draft: false
title: "Grand Central"
description: "On-demand dev/test environments with preloaded data for Quepid. Docker and Kubernetes deployment that spins up review environments from a git hash in the hostname, proxies traffic to the matching container, and reaps idle environments."
role: "Search & Big Data Architect"
organization: "OpenSource Connections"
external_url: "https://github.com/o19s/grand_central"
technologies:
  - Java
  - Docker
  - Kubernetes
weight: 4
---

Dynamic review environments: parse `*.review.quepid.com`, deploy that git version if it is not already running, then proxy.

Each environment ships with preloaded data (app, database, and data-dump loader in the pod). Idle cleanup and a cap on concurrent environments keep the cluster from running unbounded.
