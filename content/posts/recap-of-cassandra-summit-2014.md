+++ 
draft = false
date = 2014-09-17T17:00:00Z
title = "Recap of Cassandra Summit 2014 "
slug = "" 
tags = []
categories = []
thumbnail = "images/tn.png"
description = ""
external_url = "https://opensourceconnections.com/blog/2014/09/17/cassandra-summit-2014/"
+++

OpenSource Connections was well represented in San Francisco at this years Cassandra Summit 2014. We had Chris Bradford, Eric Pugh, and Matt Overstreet in attendance for the training, sessions, and networking events. John Berryman represented OSC with a presentation discussing CQL 3 and maps to the Cassandra internal data structure.

The [Opening Keynote](http://new.livestream.com/datastax/Cassandra?mkt_tok=3RkMMJWWfF9wsRoiuKXBZKXonjHpfsX66ugsWKCxlMI%2F0ER3fOvrPUfGjI4FTctmI%2BSLDwEYGJlv6SgFSrXMMblswLgIXBY%3D) covered the release of Cassandra 2.1 with a [wonderful set](https://git-wip-us.apache.org/repos/asf?p=cassandra.git;a=blob_plain;f=CHANGES.txt;hb=refs/tags/cassandra-2.1.0) of features and fixes. Aaron Morton from The Last Pickle held a talk in the Grand Ballroom outlining specific features and changes (with their associated JIRA numbers) between 2.0 and 2.1. This helped underscore many of the improvements discussed throughout the keynote.

## Cassandra and User Authentication
Two back to back talks centered on Cassandra’s use within authentication systems. First up Disney discussed their new C* powered OAuth system. This service is used internally across many properties and applications. The calling system requests a token and provides a expiration time along with it. Once generated, the token is set in Cassandra with a TTL equal to the requested expiration. Tokens are automatically expired the token after the appropriate period. Disney also took the time to predict the read and write paths across the cluster. This guarantees that for every read at least one node in the cluster will have the most recent data.

Next [Stormpath](https://stormpath.com/) presented a method for clustered session storage with Cassandra and Apache Shiro. [Apache Shiro](http://shiro.apache.org/) is a java security framework which encompasses authentication, authorization, cryptography, and session storage. In Stormpath’s [sample implementation](https://github.com/lhazlewood/shiro-cassandra-sample) TTLs are used to expire sessions in a similar manner to the Disney talk, although less OAuth focused. One method specifically called out was [`touch()`](https://shiro.apache.org/static/1.2.3/apidocs/org/apache/shiro/session/Session.html#touch()) which could be used by rich client side applications to reach out and let the server side know the session is still active.

In both cases Cassandra’s cross datacenter replication was mentioned as an additional benefit when working with authentication and session data. It was worth noting that using TTLs in this way requires examining the gc_grace period on the session related column families. Once a TTL is tripped a tombstone is generated in the system. These are not removed until after gc_grace period. Lowering this value on those tables will keep the SSTable’s smaller as compaction is run.

## Cassandra at Scale

Apple dropped some massive scale numbers on the summit this year. They are currently running over 75,000 Cassandra nodes. With a single cluster spanning over 1,000 nodes. Cassandra is running in the million of operations per second range. The talk that followed these impressive digits delved into specific JIRA issues discovered while running these sized clusters. Each issue discussed would not appear to have a significant impact, but from the perspective of a large cluster had far reaching implications.

Hardware and network partition repairs can be costly depending on the number of nodes and amount of data. Node repairs with extremely large datasets may cause unnecessary duplication of data across the cluster (far exceeding the required replication factor). This lead to the ability to perform partial repairs where token ranges may be specified to prevent excess data from being copied. In turn this reduces both repair time and the amount of data needed to perform said repair.

Features like Lightweight Transactions can incur serious performance penalties when run across a larger cluster. Cassandra’s implementation of paxos requires four round trips. Apple’s teams worked to reduce the time needed to perform these transactions by cutting down on the number of locks during the paxos determination.

## CQL3 & Cassandra Internals
https://shiro.apache.org/static/1.2.3/apidocs/org/apache/shiro/session/Session.html#touch()
John Berryman had an enlightening presentation exposing the format of the internal Cassandra data store. He began with visualizing the Cassandra data model. This lead in to the a discussion of the read and write paths along with their related caches. A comparison of simple rows and SQL to CQL followed. Next he approached how composite keys, sets, lists, maps and how they translate to wide rows. Wrapping up the presentation John demonstrated how to use the Cassandra CLI. This tool may be used to show how Cassandra maps the CQL statements to it’s storage engine.

## Sponsor Hall

* [Instaclustr](), who recently received funding from Datastax, is a managed hosting service of C* in AWS with a dedicated ops team and monitoring. They handle provisioning, scaling, and maintaining your C* cluster in an Amazon VPC environment.
* [Databricks]() / [Spark]() - Provided an awesome USB key to attendees containing multiple spark tutorials and a sample dataset. Spark has been making waves in the big data community. It has been integrated with DataStax Enterprise 4.5 for analytics workloads.

