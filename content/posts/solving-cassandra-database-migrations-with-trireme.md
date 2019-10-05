+++ 
draft = false
date = 2015-02-16T10:27:03-04:00
title = "Solving Cassandra Database Migrations with Trireme"
slug = "" 
tags = []
categories = []
thumbnail = "images/tn.png"
description = ""
external_url = "https://opensourceconnections.com/blog/2015/02/16/solr-cassandra-database-migrations-with-trireme/"
+++

Recently we have been working on a project with a distributed team of developers. Each developer had a local [DataStax Enterprise cluster running via Vagrant](https://opensourceconnections.com/blog/2015/02/06/a-vagrant-conversation/). Over time we kept running into problems with various developers’ clusters being out of sync with the latest schema. One early solution involved tearing down and rebuilding the keyspace after every pull. This worked, but lead to delays between building the keyspace, loading data, and having indexed content to work with. This led to problems during deployments as certain changes were looking for columns that no longer existed. Communication was flowing, but there were disjoints in the schema conversation.

In response to this we developed a framework for managing our Solr and Cassandra schemas. For Cassandra, changes to the schema are in migration files within the repo. A tool is used execute new changes against the cluster. The Solr structure has a single schema file for each core. This file is synced to the cluster with a reload and reindex command to update the underlying indexes.

Today we are releasing [Trireme](https://github.com/o19s/trireme), a polished version of the tool and framework born from the project. Trireme is a migration framework targetting Apache Cassandra and DataStax Enterprise Cassandra & Solr. It handles setting up your project’s Cassandra keyspace and Solr cores and keeps them in sync over time. Trireme exposes tasks for developers that automate the generation new Solr core configuration files and Cassandra migrations.

## How does Trireme work?

Trireme keeps a collection of Cassandra migrations that have run against the cluster in a table that it creates along with the keyspace. Upon running the migrate command this table is compared with the list of migrations on disk. Any missing migrations are run and after successful execution, recorded in the migrations table.

Solr support is similar. All Solr core configuration files are stored within a named directory. The files are uploaded to Solr along with a reload command for the core. This keeps the schema in sync over time as it develops. Each command for Solr may run for all cores or optionally against a particular core.

## Trireme workflow integration

Adding the Invoke commands to your workflow is simple. Did you just pull in your colleagues changes? Run the `migrate` commands to update your cluster. Have you cloned the repo and need to get your cluster up to speed quicky? Run the `load_schema` command to load the latest schema instead of all the migration files. Have you made changes to the Solr schema and want to test them out? Push the updated schema.xml file with the Solr migration command and watch as the new structure is pushed to the cluster. Trireme exposes a collection of tasks to satisfy these needs and more.

## Onward to the future!

All core features are in and the package is available via PyPI. The project is fully functioning and stable. There are multiple features planned. If you would like to see a new feature or are having a problem add an [issue on GitHub](https://github.com/o19s/trireme/issues).
