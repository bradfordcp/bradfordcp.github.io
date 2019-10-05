+++ 
draft = false
date = 2015-10-21T15:55:09-04:00
title = "Recap of Cassandra Summit 2015"
slug = "" 
tags = []
categories = []
thumbnail = "images/tn.png"
description = ""
external_url = "https://opensourceconnections.com/blog/2015/10/21/recap-cassandra-summit-2015/"
+++

This year OpenSource Connections rolled into Cassandra Summit with 4 attendees. Eric Pugh, Matt Overstreet, and John Woodell attended some of the 137 sessions offered. Matt walked away from day 1 as a Certified Cassandra Developer. On day 3 I delivered a talk outlining some of our work with Cassandra and Spark at the US Patent and Trademark Office. This year was packed with attendees, over 6k people were on site with 5k streaming.

## Keynote

[Patrick McFadin](https://twitter.com/patrickmcfadin) & [Rachel Pedreschi](https://twitter.com/rachelpedreschi) kicked off the [keynote](https://www.youtube.com/watch?v=QfyRyIW4rYo) with a live demo. Cassandra nodes were subjected to tornado forces (a blender), chaos monkeys with wire cutters, and Patrick with a fire axe. It was an awesome way to illustrate Cassandra’s ability to deal with node loss and keeping applications online.

Next up [Jon Hadaad](https://twitter.com/rustyrazorblade) and [Luke Tillman](https://twitter.com/luketillman) demoed their [KillrVideo](http://www.killrvideo.com/) application. This video sharing site is built with DataStax Enterprise 4.8 and runs on Microsoft Azure. It leverages multiple features of DSE including C*, Solr search, and Spark for analytics. All of the code that powers the application is available up on [GitHub](https://github.com/LukeTillman/killrvideo-csharp). Check it out!

Following their quick walkthrough of the site’s features and associated DSE capabilities Microsoft took the stage to demo Cassandra deployment on Azure. With just a few clicks a 90 node C* cluster was up and running in China. Azure provides an excellent wizard for setting up multi-datacenter deployments with automated site-to-site VPN connections keeping data safe while being replicated. Speaking of datacenters, Microsoft has over 100 across [20 regions](https://azure.microsoft.com/en-us/regions/). C* tooling like OpsCenter is available to monitor the health of the cluster. Overall it seems like Microsoft Azure is a pretty solid platform for deploying C* in the cloud.

Now the keynote took a turn toward the more technical side. [Jonathan Ellis](https://twitter.com/spyced) started with a hat-tip towards the C* drivers. Next he moved on to various types of databases and how they respond to failures. Examples included MongoDB and its behavior with network partitions (multiple elected masters stepping on each other). Then performance numbers showing operations per second on write, read, and balanced workloads. Cassandra clearly comes out ahead in distributed environments.

Jonathan then discussed the roadmap of C*. There was supposed to be a large jump from v2.1 into v3.0. Instead this was changed to two releases, 2.2 (released in July) and 3.0 which is coming out this month. Features that rely on the new storage engine have been pushed out to v3.0, but everything else has been realized in v2.2. This includes [JSON support](http://docs.datastax.com/en/cql/3.3/cql/cql_using/useInsertJSON.html), compatability with Microsoft Windows, DTCS, UDF and more.

The JSON support is very simple and can make interactions with C* easier. It even works with User Defined Types! For example an insert statement may now look like this:

```
INSERT INTO phone_numbers JSON
'{"id": 1,
  "phone": {"mobile": "123-456-7890"}
  }';
```

Attributes nested within a UDT are entered as child objects. Collection types are fully supported as well. This lowers the barrier to entry when getting started talking with C*.

User-Defined Functions were explained a bit and given a demo. Functions may be written in languages supporting Java and the Java Scripting API. Interestingly enough by dropping the JRuby JAR on your classpath it is possible to write UDFs in Ruby as well.

One of the killer new features in C* 3.0 is Materialized Views. They work a bit different than the secondary indexes in C* v2.2 and below. Instead of maintaining a local index for the data in a given table the data is distributed across the cluster. C* handles partitioning the data in accordance with the data model specified for the view. Materialized views are not free! Stress tests show that Materialized Views will cost 10% of operations per second on the cluster.

Finally the keynote wrapped up with an outline of the new “Tick-Tock” release cycle for C*. With new features being developed in one cycle and a focus on bugfixes and improvements in the other.

## Sessions

At this point the sessions began! There were so many great talks (some of which overlapped), I’m only going to outline a few here interspersed with tweets during the sessions.

{{< tweet 646792581808939008 >}}

Russ provided an excellent talk focusing on the Spark Cassandra Connector. There were great examples of methods exposed by the connector to leverage the underlying Cassandra datastore when processing through Spark.

{{< tweet 647094886777397248 >}}

{{< tweet 647095618393870336 >}}


PagerDuty intentionally performs synchronous writes across data centers in their application. The data needs to be extremely durable and may accomadate a little bit of delay to achieve this. They have also implemented their own transaction system within their application to confirm successful writes. Their talk now has me thinking about data in a few more dimensions when implementing distributed systems like C*.

{{< tweet 647109400105197568 >}}

Macy’s moved their ecommerce platform to C* from DB2. Their team showed many aspects of the move from changing systems on an operational level and data modeling challenges.

{{< tweet 647116244232085506 >}}

[Sony Computer Entertainment America](https://twitter.com/playstation) discusses the PSN. This included current features and some that have just been released. How these features work and their effects on end users. They presented an interesting approach to balancing load on production clusters. In one instance there was a query access pattern which was hitting the cluster more heavily than others. Instead of just increasing the number of nodes on this cluster they split it off into its own that could be independently scaled.

{{< tweet 647152804444938240 >}}

{{< tweet 647157140680011777 >}}

My talk Cassandra & Spark at the USPTO came next. It covered spinning up team members across the enterprise on C* and it’s ins and outs along with a use case for Spark as an ETL pipeline. The demo code is available out on GitHub, along with slides on SlideShare.

{{< tweet 647164326474747904 >}}

DataStax’s [Brian Hess](https://github.com/brianmhess) had an excellent talk on loading data into C*. He really broke down all the various ways to load data starting with cqlsh and ending with custom code to write out SSTables that could then be piped into `sstableloader`. He also developed a tool, [cassandra-loader](https://github.com/brianmhess/cassandra-loader), which was measured and benchmarked as well. The room was packed and everyone took away some valuable data loading tips.

{{< tweet 647182585534091264 >}}

To wrap things up [Chris Batey](https://twitter.com/chbatey) delivered and excellent talk on testing interactions with Cassandra. He covered various methods to test failure scenarios in your application. How can you force a ReadTimeout? His tool [scassandra](http://www.scassandra.org/) stubs out a Cassandra server. With this tool in place the tests connect with the stubbed server which will provide any type of response desired. This can include valid data, timeout exceptions, or not at all (letting the driver detect the issue). `scassandra` looks to be an effective tool for writing resilient client applications. It’s worth noting that the Java Driver is now using scassandra to test itself!

It is amazing to see how much the community has grown since my first Summit back in 2013. This year the community chose me as a [MVP for Apache Cassandra](http://www.planetcassandra.org/mvps/). I am honored by this award and will continue to engage with the community at large. 2015 has been a great year for Cassandra, I’m looking forward to v3.0 and 2016.

If you’re interested in evaluating Apache Cassandra for your business or are looking for some help with an existing application / cluster, don’t hesitate to get in touch to chat about how we can help you with your distributed data problems!
