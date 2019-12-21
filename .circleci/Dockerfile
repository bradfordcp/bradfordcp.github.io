FROM registry.fedoraproject.org/fedora-minimal:31

RUN microdnf update && microdnf clean all

RUN microdnf install git tar hugo && microdnf clean all

COPY google-cloud-sdk.repo /etc/yum.repos.d/google-cloud-sdk.repo

RUN microdnf install -y google-cloud-sdk && microdnf clean all
