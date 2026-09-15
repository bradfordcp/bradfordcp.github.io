---
draft: false
title: "Grand Central"
description: "A cloud-native tool for performing just-in-time deployment of containers as HTTP requests are received. These deployments spin up and have their own copy of seed data for rapid dev / test environments."
role: "Search & Big Data Architect"
organization: "OpenSource Connections"
external_url: "https://github.com/o19s/grand_central"
technologies:
  - Java
  - Docker
  - Kubernetes
weight: 4
---

Dynamic review environments: parse the domain name looking for containers matching the hash, deploy that version if it is not already running, then proxy. Already running instances are directly proxied with a specific number of versions staying running. When resource constrained the oldest environment is automatically reaped. Each environment ships with preloaded data (app, database, and data-dump loader in the pod).
