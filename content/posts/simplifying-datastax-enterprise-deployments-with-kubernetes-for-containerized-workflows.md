---
title: "Simplifying Datastax Enterprise Deployments With Kubernetes for Containerized Workflows"
date: 2019-11-18T00:00:00-04:00
draft: false
external_url: https://www.datastax.com/blog/2019/11/simplifying-datastax-enterprise-deployments-kubernetes-containerized-workflows
---

Available today in [DataStax Labs](https://downloads.datastax.com/#labs), the DataStax Enterprise Kubernetes Operator simplifies the deployment and management of [DataStax Enterprise](https://www.datastax.com/products/datastax-enterprise) (DSE) clusters on the Kubernetes platform. Many enterprise IT organizations are implementing hybrid and multi-cloud solutions to leverage features and capabilities on disparate providers. Additionally, tooling has grown to be homogenous across providers—both on-premises and in the cloud. Kubernetes (also known as k8s) has come out as the dominant player in this space with distributions available on most cloud platforms. 

As Kubernetes has matured, so has the tooling surrounding it. In this shift, deployment tools are evolving as well with operators for the deployment of containerized workloads both within user-facing applications and the databases that back them. The DataStax Kubernetes Operator handles this role for DSE by simplifying the process of deploying and managing clusters within k8s namespaces. Instead of spinning up individual resources and configurations, and gluing them all together, a simple YAML file is sent to k8s defining the number of nodes and storage requirements. From here, the operator provisions pods, services, storage claims, and more. As the resources come online, the cluster is bootstrapped and becomes available at a predictable k8s service DNS address. For example, if your cluster is named `demo-cluster` with a data center named `dc1` the service would be named `demo-cluster-dc-1-service`.

If you're interested in diving into the details, check out the [documentation on GitHub](https://github.com/datastax/labs/tree/master/dse-k8s-operator). The rest of this blog post will cover setting up and running the operator on a local Red Hat OpenShift 4 installation.

## Getting Started Locally
In our environment, we are running OpenShift 4 via [CodeReady Containers](https://developers.redhat.com/blog/2019/09/05/red-hat-openshift-4-on-your-laptop-introducing-red-hat-codeready-containers/). The cluster may be instantiated with the following:

```bash
$ crc setup
$ crc start
INFO Starting OpenShift cluster ... [waiting 3m]
INFO
INFO To access the cluster, first set up your environment by following 'crc oc-env' instructions
INFO Then you can access it by running 'oc login -u developer -p developer https://api.crc.testing:6443'
INFO To login as an admin, username is 'kubeadmin' and password is REDACTED
INFO
INFO You can now run 'crc console' and use these credentials to access the OpenShift web console
$ crc oc-env
```

First, make sure you have the oc command available in your terminal and that it can communicate with the cluster.

```bash
$ oc login -u kubeadmin -p REDACTED https://api.crc.testing:6443
$ oc version
Client Version: v4.3.0
Server Version: 4.2.0-0.nightly-2019-09-26-192831
Kubernetes Version: v1.14.6+73b5d76

$ oc cluster-info
Kubernetes master is running at https://api.crc.testing:6443

To further debug and diagnose cluster problems, use 'kubectl cluster-info dump'.
```

Optionally, you may open the web interface with crc console and log in with the credentials returned by crc start.

Next, we download and submit a YAML file to the cluster containing the resources required to run our operator. This includes a service account, role binding, custom resource destination (CRD) representing DseDatacenter objects, and deployment for the operator.

```bash
$ curl -O https://raw.githubusercontent.com/datastax/labs/master/dse-k8s-operator/datastax-operator-manifests.yaml
$ oc apply -f datastax-operator-manifests.yaml
serviceaccount/dse-operator created role.rbac.authorization.k8s.io/dse-operator created rolebinding.rbac.authorization.k8s.io/dse-operator created customresourcedefinition.apiextensions.k8s.io/dsedatacenters.datastax.com created deployment.apps/dse-operator created
```

Verify that the operator is up and running:

```bash
$ oc get deployments
NAME           READY   UP-TO-DATE   AVAILABLE   AGE
dse-operator   1/1     1            1           6m48s
```

At this point we can describe the DSE cluster we wish to deploy. With the DSE Kubernetes Operator we describe clusters as logical DSE data centers. Each data center is defined as a number of nodes, DSE version number, storage requirements, rack identifiers, and any tweaks to the configuration files. Within our local environment, we're looking to leverage a single node with persistent storage. Note the version number below can not be edited at this time. We rely on APIs that are only available in the pre-release version of DSE 6.8.0.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: dse-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: datastax.com/v1alpha1
kind: DseDatacenter
metadata:
  name: dc-1
spec:
  dseClusterName: demo-cluster
  size: 1
  repository: datastaxlabs/dse-k8s-server
  version: 6.8.0-20190822
  storageclaim:
    storageclassname: dse-storage
    resources:
      requests:
        storage: 20Gi
  racks:
    - name: rack-1
  config:
    dse-yaml:
      authentication_options:
        enabled: False
    cassandra-yaml:
      num_tokens: 16
    # jvm-options:
    #  initial_heap_size: "4g"
    #  max_heap_size: "4g"
    10-write-prom-conf:
     enabled: True
```

With the data center defined within our YAML file we can now submit it to the Kubernetes cluster.

```bash
$ oc apply -f dse-datacenter.yaml
storageclass.storage.k8s.io/dse-storage created
dsedatacenter.datastax.com/dc-1 created
```

From here the operator is alerted to the new DseDatacenter resource. It inspects the current resources and starts to provision those that are missing (all of them at this point). For our cluster the following resources are created and managed for us:

* Services
* StatefulSets
* Pods

You can monitor the state of pods (and whether they are ready) with the following command:

```bash
$ oc get pods --selector com.datastax.dse.cluster=demo-cluster -w
NAME                             READY   STATUS            RESTARTS   AGE
demo-cluster-dc-1-rack-1-sts-0   0/1     PodInitializing   0          2m29s
```

When the pod comes online you now have a fully functioning DSE cluster. DSE-enabled applications may now be deployed within the cluster and connected via the exposed Kubernetes service `demo-cluster-dc-1-service`. 

For more information check out [DataStax Labs](https://downloads.datastax.com/#labs) and the [DataStax Enterprise Kubernetes Operator documentation](https://github.com/datastax/labs/tree/master/dse-k8s-operator). 

