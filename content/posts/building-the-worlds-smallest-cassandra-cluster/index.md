+++ 
draft = false
date = 2015-03-30T14:22:56-04:00
title = "Building the world's smallest Cassandra clusteer"
slug = "" 
tags = []
categories = []
thumbnail = "images/tn.png"
description = ""
external_url = "https://opensourceconnections.com/blog/2015/03/30/building-the-worlds-smallest-cassandra-cluster/"
+++

A few weeks ago I received my first Intel Edison in the mail. After a bit of tinkering I was able to bootstrap a small Cassandra cluster on this little SoC. I tweeted a picture showing it up and running with OpsCenter connected in the background.

{{< tweet 566786202184216576 >}}

I will ouline how to bootstrap the Intel Edison and install a functioning Cassandra cluster. _Note that even though you can run Cassandra on the Edison, that doesn’t necessarily mean you should._

## What is an Intel Edison?

{{< figure src="edison_quarter.jpg" title="Image via SparkFun" >}}

The Intel Edison is a development platform for embedded applications boasting impressive specs:

* Dual core Intel Atom SoC (500MHz)
* 1GB LPDDR3 RAM
* 802.11 a/b/g/n Wifi
* Bluetooth 4.0 LE

## Components

In this project we’re going to need to provide power, serial console access, and some additional storage capacity. These features can be stacked on to the Edison through blocks. If you’re framiliar with Arduino shields, the concept is the same.


* [Intel Edison](https://www.sparkfun.com/products/13024)
* [SparkFun Block for Intel® Edison - Console](https://www.sparkfun.com/products/13039)
* [SparkFun Block for Intel® Edison - microSD](https://www.sparkfun.com/products/13041)
* [Intel Edison Hardware Pack](https://www.sparkfun.com/products/13187)
* [SanDisk Ultra 32GB UHI-I/Class 10 Micro SDHC Memory Card](http://www.amazon.com/SanDisk-Memory-Adapter--SDSDQUAN-032G-G4A-Version/dp/B00M55C0NS/ref=sr_1_1)

At the time of publication a single node in our cluster costs approximately $119 USD.

## Node Assembly

After all of the components have arrived it is time to start assembling the node. Each node is comprised of 3 layers (Edison => Console Block => MicroSD Block) which are connected via 70-pin connectors on the top and bottom of the blocks. The order of the Console and MicroSD blocks are not important, but the Edison must be placed on the top. In our assembly we have placed the MicroSD block on the bottom as fewer components are exposed in this configuration.


1. Begin assembly by attaching two standoffs from the hardware pack onto the top of the console board with the small phillips head bolts. This will expose two posts that will support the Edison.
2. Attach 4 standoffs to the bottom of the board with nuts
3. Connect the Edison to the Console block and affix it to the standoffs with two nuts.
4. Next add the MicroSD block securing it with 4 additional standoffs.

## Bootstrap the Edison

With the node assembled it is time to start setting up the software side. Intel provides a step by step [getting started guide](https://software.intel.com/en-us/articles/getting-started-with-the-intel-edison-board-on-mac). For our setup we should configure the password and connect the device to our wifi network.

1. Connect to the Edison via the USB serial device. _Note that on your device the value A402YSYU may be different_

    ```bash
    screen /dev/tty.usbserial-A402YSYU 115200 –L
    ```

2. Press enter twice and a login prompt should appear

3. Type `root` and press _enter_

4. Run the `configure_edison` program. This will prompt you for a name for the device, a new root password and walkthrough the wifi setup process.

5. Prepare the MicroSD card. We first unmount the card (which is auto-mounted at /media/sdcard). Next we run fdisk and repartition the card. Finally we create the filesystem.
    
    ```bash
    umount /media/sdcard
    fdisk /dev/mmcblk1
    d                         # Delete the current partition (There is usually only 1 if any)
    n                         # Create a new partition
    p                         # Mark the partition as primary
    1                         # Assign it the number 1
    <enter>                   # Select the first block on the device
    <enter>                   # Select the last block on the device
    w                         # Write the change to the disk and exit
    mkfs.ext4 /dev/mmcblk1p1
    ```

6. Setup the Cassandra data directory

    ```bash
    mount /dev/mmcblk1p1 /media/sdcard
    mkdir /media/sdcard/cassandra
    ```

7. Type `exit` and press _enter_. Future setup will be performed over SSH.

## Install Java

Cassandra is written in java and requires the JRE to run. It is recommended that we use Oracle’s JRE version 7.

1. Download the `jre-7u75-linux-i586.tar.gz` from the [Oracle download page](http://www.oracle.com/technetwork/java/javase/downloads/jre7-downloads-1880261.html). This requires accepting a license agreement before downloading the file.

2. Copy the file to the Edison via SFTP
3. Extract the file

    ```bash
    tar xvzpf jre-7u75-linux-i586.tar.gz
    ```

4. Set the `JAVA_HOME` environment variable to point at the extracted directory

    ```
    export JAVA_HOME=/home/root/jre1.7.0_75
    ```

   It may be worthwhile to place this in your `.bash_profile` to prevent having to run this every time we start Cassandra.

## Install getopt

Cassandra’s start script utilizes the getopt command. The Yocto Linux distribution running on the Edison does not ship with this utility. This package may be found through Yocto’s [Recipe reporting system](http://recipes.yoctoproject.org/rrs/recipedetail/144/). From here there is a link to the source code which we will pull down and compile on the Edison.

1. Download the `util-linux` package from [kernel.org](http://kernel.org/pub/linux/utils/util-linux/v2.25/util-linux-2.25.2.tar.xz)

    ```bash
    wget http://kernel.org/pub/linux/utils/util-linux/v2.25/util-linux-2.25.2.tar.xz
    ```

2. Extract the package

    ```bash
    tar xvf util-linux-2.25.2.tar.xz
    ```

3. Build the source

    ```bash
    cd util-linux
    ./configure
    make getopt
    ```

4. Install the built binary

    ```bash
    mkdir -p /usr/local/bin
    cp getopt /usr/local/bin
    ```

## Install & Configure Apache Cassandra

1. Download Cassandra 2.1.3

    ```bash
    wget http://mirrors.gigenet.com/apache/cassandra/2.1.3/apache-cassandra-2.1.3-bin.tar.gz
    ```

2. Extract the package

    ```bash
    tar xvzpf apache-cassandra-2.1.3-bin.tar.gz
    ```

3. Configure Cassandra - be sure to edit the values listed below instead of replacing the file

    **`cassandra.yaml`**

    ```yaml
    cluster_name: "Edison Cluster"
    listen_address: <insert ip here>
    rpc_address: <insert ip here>
      
    seed_provider:
        - class_name: org.apache.cassandra.locator.SimpleSeedProvider
          parameters:
              - seeds: "<insert ip here>"
    data_file_directories:
        - /media/sdcard/cassandra/data
    commitlog_directory: /media/sdcard/cassandra/commitlog
    saved_caches_directory: /media/sdcard/cassandra/saved_caches
    ```

    **`cassandra-env.sh`**

    ```bash
    MAX_HEAP_SIZE="512M"
    HEAP_NEWSIZE="200M"
    ```

    **`logback.xml`**

    ```xml
    <!-- Comment out the following line to prevent spamming stdout -->
    <!--<appender-ref ref="STDOUT" />-->
    ```

    **`/etc/hosts`** - The hostname must be in `/etc/hosts` or DNS

    ```
    <insert ip here> <hostname>
    ```

4. Start Cassandra

    ```bash
    /home/root/apache-cassandra-2.1.3/bin/cassandra
    ```

## Intel Edison Micro-Cluster Benchmarks

Cluster Status

```
nodetool -h 192.168.1.50 status
Datacenter: datacenter1
=======================
Status=Up/Down
|/ State=Normal/Leaving/Joining/Moving
--  Address       Load       Tokens  Owns (effective)  Host ID                               Rack
UN  192.168.1.50  70.54 KB   256     100.0%            2395b793-2d8b-4c31-931c-64fa94097cc5  rack1
```

Cassandra Stress Writes

```
./cassandra-stress write n=100000 -node 192.168.1.50
Created keyspaces. Sleeping 1s for propagation.
Warming up WRITE with 50000 iterations...
INFO  18:36:16 Using data-center name 'datacenter1' for DCAwareRoundRobinPolicy (if this is incorrect, please provide the correct datacenter name with DCAwareRoundRobinPolicy constructor)
Connected to cluster: Edison Cluster
Datatacenter: datacenter1; Host: /192.168.1.50; Rack: rack1
INFO  18:36:16 New Cassandra host /192.168.1.50:9042 added
Sleeping 2s...
Running WRITE with 200 threads for 100000 iteration
...
Results:
op rate                   : 1922
partition rate            : 1922
row rate                  : 1922
latency mean              : 104.0
latency median            : 87.9
latency 95th percentile   : 176.9
latency 99th percentile   : 381.7
latency 99.9th percentile : 696.5
latency max               : 1855.3
total gc count            : 4
total gc mb               : 569
total gc time (s)         : 2
avg gc time(ms)           : 474
stdev gc time(ms)         : 19
Total operation time      : 00:00:52
END
```

Cassandra Stress Reads

```
./cassandra-stress read n=100000 -node 192.168.1.50
Warming up READ with 50000 iterations...
Failed to connect over JMX; not collecting these stats
INFO  18:41:53 Using data-center name 'datacenter1' for DCAwareRoundRobinPolicy (if this is incorrect, please provide the correct datacenter name with DCAwareRoundRobinPolicy constructor)
Connected to cluster: Edison Cluster
INFO  18:41:53 New Cassandra host /192.168.1.50:9042 added
Datatacenter: datacenter1; Host: /192.168.1.50; Rack: rack1
Sleeping 2s...
...
         id, total ops , adj row/s,    op/s,    pk/s,   row/s
  4 threads, 100000    ,       238,     238,     238,     238
  8 threads, 100000    ,        -0,     399,     399,     399
 16 threads, 100000    ,       588,     588,     588,     588
 24 threads, 100000    ,       725,     722,     722,     722
 36 threads, 100000    ,        -0,     873,     873,     873
 54 threads, 100000    ,        -0,    1096,    1096,    1096
 81 threads, 100000    ,        -0,    1247,    1247,    1247
121 threads, 100000    ,        -0,    1376,    1376,    1376
181 threads, 100000    ,        -0,    1444,    1444,    1444
271 threads, 99688     ,        -0,    1532,    1532,    1532
406 threads, 100000    ,        -0,    1515,    1515,    1515
609 threads, 100000    ,        -0,    1500,    1500,    1500
913 threads, 100000    ,      1509,    1501,    1501,    1501
END
```

{{< figure src="edison_rf.png" title="RF Performance" >}}

Overall we’re seeing ~1,900 writes per second and ~1,500 reads per second. That’s respectable for a tiny SoC storing the data on a MicroSD card and communicating over wifi. Bringing up our Access Point’s (AP) interface we can take a look at the wireless performance of our nodes. The node used in these stress tests was connected via 802.11 g/n from approximately 10 feet away from the AP. Looking at the graphs we see the node connected at 75mpbs and some issues with retried frames (both in and out). A second node was brought online which didn’t have these issues. It connected at 150mbps via 802.11 a/n and didn’t have as many retries in either direction.

The Edison is a quite capable SoC. It handled running Cassandra with no problem. The configuration may be futher tuned to match the hardware. Remember even though you can run Cassandra on the Edison, that doesn’t necessarily mean you should. If you’re stuck trying to tune and configure Cassandra, be sure to contact us! Don’t hesitate to get in touch to let us know if you have any thoughts, feedback or criticisms of this article!
