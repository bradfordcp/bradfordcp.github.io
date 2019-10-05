+++ 
draft = false
date = 2015-03-26T11:58:42-04:00
title = "Going Cross-Origin with Solr"
slug = "" 
tags = []
categories = []
thumbnail = "images/tn.png"
description = ""
external_url = "https://opensourceconnections.com/blog/2015/03/26/going-cross-origin-with-solr/"
+++

It is becoming more common to connect directly with a Solr cluster from rich client side applications. Performing a search directly against the cluster will require either [JSONP](http://en.wikipedia.org/wiki/JSONP) or [Cross-origin Resource Sharing(http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) (CORS). Here we discuss a few methods for connecting with a search resource with CORS.

Let’s assume we have an angular app running on `app.o19s.com` and a Solr cluster available at `search.o19s.com`. We attempt to use Angular’s `$http` service to perform a query against the `http://search.o19s.com/solr/core/select` endpoint. No results are displaying in the application. When we test the Solr URL in another tab the results are displayed. The web inspector displays an XMLHttpRequest error

{{< figure src="CORS-denied.png" title="ACCESS DENIED" >}}

What’s going on?

In this case our browser performed some checks prior to the request being sent and decided it needed to verify our application has permission to access the `search.o19s.com` resource. It then sends a separate “preflight” request first asking if we have access. At this point our Solr cluster doesn’t know how to handle the request and doesn’t respond appropriately. This signals the browser that we do not have permission and the original request is never sent.

## How does CORS work?

When an `XMLHttpRequest` is performed our browser checks the protocol, domain, and port of the request verifying they match that of our current page. In our example the protocol and port match, but not the domain. This triggers the cross-origin preflight check.

The preflight request is sent by the browser to the resource being accessed. This request is sent with the `OPTIONS` HTTP method and an `Origin` header. The `Origin` header provides the origin that is attempting to access the resource, in our case the header will read `Origin: http://app.o19s.com/`.

At this point the server should respond with a pair of headers, `Access-Control-Allow-Origin` and `Access-Control-Allow-Methods`. The `Access-Control-Allow-Origin` header indicates which origins are permitted access. The browser will take this list and match the origin domain, protocol, and port to see if it is permitted access. The second header, `Access-Control-Allow-Methods`, lists all supported HTTP methods. Now the browser checks the XMLHttpRequest’s method verifying that it matches the `Access-Control-Allow-Methods`.

## Enabling CORS at the reverse proxy

When running Solr publicly it is recommended to place Solr behind a reverse proxy. We have talked about this previously with [IIS](https://opensourceconnections.com/blog/2013/06/17/lockdown-solr-with-iis-as-a-reverse-proxy/), but other web servers like Apache and [nginx](https://github.com/o19s/solr_nginx) also offer similar functionality. If your configuration includes a reverse proxy CORS support may be enabled on this level. [Enable CORS](http://enable-cors.org/server.html) has a list of configuration entries for many common web servers.

* [Apache](https://github.com/o19s/solr_nginx)
* [nginx](https://github.com/o19s/solr_nginx)
* [IIS7](https://github.com/o19s/solr_nginx)

_Note this list is not complete, check out [Enable CORS](http://enable-cors.org/server.html) if your server is not in this list or continue reading for another approach._

## Enabling CORS within the Solr application server

In some environments enabling CORS at the reverse proxy level is not possible. This can be for a variety of reasons, in this case we can move the CORS configuration to the app server level. Solr ships with the Jetty servlet engine. Jetty hosts the Solr WAR and handles requests to the application. We will configure Jetty to serve the appropriate CORS headers when requested, this requires no change to the reverse proxy.

1. Verify the `server/webapps/solr.war` file is extracted to `server/solr-webapp/webapp`. If not this may be accomplished with the following commands
    
    ```bash
    # Server is the directory where Solr resides
    cd server
    unzip webapps/solr.war -d solr-webapp/webapp
    ```
 
2. Download the appropriate libraries (links below direct to search.maven.org’s mirrors)

    * [jetty-servlets-8.1.14.v20131031.jar](http://search.maven.org/remotecontent?filepath=org/eclipse/jetty/jetty-servlets/8.1.14.v20131031/jetty-servlets-8.1.14.v20131031.jar)
    * [jetty-util-8.1.14.v20131031.jar](http://search.maven.org/remotecontent?filepath=org/eclipse/jetty/jetty-util/8.1.14.v20131031/jetty-util-8.1.14.v20131031.jar)

3. Copy the downloaded JAR files to the ``server/solr-webapp/webapp/WEB-INF/lib` directory

4. Edit the `server/solr-webapp/webapp/WEB-INF/web.xml` file to include the following filter right after the `<web-app>` line. On a clean Solr 5.0.0 download this entry will start at line 24.

    ```xml
    <filter>
      <filter-name>cross-origin</filter-name>
      <filter-class>org.eclipse.jetty.servlets.CrossOriginFilter</filter-class>
      <init-param>
        <param-name>allowedOrigins</param-name>
        <param-value>*</param-value>
      </init-param>
      <init-param>
        <param-name>allowedMethods</param-name>
        <param-value>GET,POST,OPTIONS,DELETE,PUT,HEAD</param-value>
      </init-param>
      <init-param>
        <param-name>allowedHeaders</param-name>
        <param-value>origin, content-type, accept</param-value>
      </init-param>
    </filter>

    <filter-mapping>
      <filter-name>cross-origin</filter-name>
      <url-pattern>/*</url-pattern>
    </filter-mapping>
    ```

    Note that the allowedOrigins value here is * which permits access from all origins. Consider setting this value to the domain where your application is hosted (ex: app.o19s.com). The allowedMethods param may also be trimmed to just the methods needed by your application (ex: GET,POST).

5. Restart Solr

6. Test the CORS changes have been applied with cURL

    ```bash
    curl -I -X "OPTIONS" "http://search.o19s.com/" -H "Origin: http://app.o19s.com"
    HTTP/1.1 200 OK
    ...
    Access-Control-Allow-Origin: http://app.o19s.com
    ```

With the correct value in the responses’s Access-Control-Allow-Origin header XMLHttpRequests will no longer be blocked by the browser. If you’re stuck on a problematic Solr deployment problem, be sure to get in touch! Don’t hesitate to get in touch to let us know if you have any thoughts, feedback or criticisms of this article!
