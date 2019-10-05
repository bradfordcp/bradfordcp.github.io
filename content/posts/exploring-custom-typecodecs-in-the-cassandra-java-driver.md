+++ 
draft = false
date = 2015-12-22T16:21:57-04:00
title = "Exploring Custom TypeCodecs in the Cassandra Java Driver"
slug = "" 
tags = []
categories = []
thumbnail = "images/tn.png"
description = ""
external_url = "https://opensourceconnections.com/blog/2015/12/22/exploring-custom-typecodecs-in-the-cassandra-java-driver/"
+++

**TL;DR check out the source on [GitHub](https://github.com/o19s/JodaTimeCodecs). For more information dig in to the explanation below.**

While working with the C* Java Driver I keep running into error messages when writing to timestamp fields. This issue usually pops up when I bind a value in my insert statement to a Joda DateTime object. The driver accept this variable and throws an exception while serializing it for execution. Here’s some sample code to illustrate the behavior:

```java
session.execute("INSERT INTO my_table (partition_key, some_timestamp) VALUES (?, ?)", "bar", DateTime.now());

// Exception in thread "main" com.datastax.driver.core.exceptions.InvalidTypeException: Value 1 of type class org.joda.time.DateTime does not correspond to any CQL3 type
```

This is understandable, the Java driver doesn’t know how to take my object and serialize it. I could convert all of my `DateTime` objects into Java `Date` objects with `dateTime.toDate()`, but this feels a bit clunky:

```java
session.execute("INSERT INTO my_table (partition_key, some_timestamp) VALUES (?, ?)", "bar", DateTime.now().toDate());
// YAY THIS WORKS, but ALL dates need to be converted.
```

Today the Java driver has a new version in release candidate 2.2.0. Among other things this release features a new system for serializing / deserializing custom objects into native CQL types. Finally I can insert my DateTime objects! Let’s take a look at how the new `TypeCodec` system works and implement a simple `DateTimeCodec`.

First change the version of the Java driver to at least `2.2.0-rc3`.

```xml
<dependency>
  <groupId>com.datastax.cassandra</groupId>
  <artifactId>cassandra-driver-core</artifactId>
  <version>2.2.0-rc3</version>
</dependency>
```

Now let’s try our sample query again.

```java
session.execute("INSERT INTO my_table (partition_key, some_timestamp) VALUES (?, ?)", "bar", DateTime.now());

// Exception in thread "main" com.datastax.driver.core.exceptions.InvalidTypeException: Value 1 of type class org.joda.time.DateTime does not correspond to any CQL3 type
// Caused by: com.datastax.driver.core.exceptions.CodecNotFoundException: Codec not found for requested operation: [ANY <-> org.joda.time.DateTime]
```

There’s some new output in our exception indicating a Codec could not be found. Let’s implement one! A `TypeCodec` has four methods that must be implemented `parse()`, `format()`, `serialize()`, and `deserialize()`. In the [`TypeCodec.java`](https://github.com/datastax/java-driver/blob/2.2/driver-core/src/main/java/com/datastax/driver/core/TypeCodec.java) file there is a [`TimestampCodec`](https://github.com/datastax/java-driver/blob/2.2/driver-core/src/main/java/com/datastax/driver/core/TypeCodec.java#L1116-L1208) defined which shows how the driver expects a timestamp returned. We can base our class on a few of the methods here, but much more simplified.

First up is our constructor it calls the super class indicating the CQL DataType and Object class our codec handles. _Note in our examples the class is `DateTimeCodec`._

```java
public DateTimeCodec() {
  super(DataType.timestamp(), DateTime.class);
}
```

There are other `TypeCodec` classes that may be extended, like `TypeCodec.StringParsingCodec<T>`. In our case we are extending `TypeCodec<T>` with `T` specified as `DateTime` from the Joda Time library. Now that we have signaled the CQL and Java data types our code handles it is time to get to work.

The first method to implement parses a `String` value and returns a `DateTime` object. Naturally this would be the `parse()` method. Looking at the [`TimestampCodec`](https://github.com/datastax/java-driver/blob/2.2/driver-core/src/main/java/com/datastax/driver/core/TypeCodec.java#L1169) implementation and JavaDocs for [`TypeCodec`](http://docs.datastax.com/en/drivers/java/2.2/com/datastax/driver/core/TypeCodec.html#parse-java.lang.String-) we can see the expected input values. Our method should handle valid data from CQL along with `null` and `"NULL"`. Instead of doing a bunch of parsing like the `TimestampCodec` we will just delegate to the `DateTime.parse()` method instead.

```java
@Override
public DateTime parse(String value) {
  if (value == null || value.equals("NULL"))
    return null;

  try {
    return DateTime.parse(value);
  } catch (IllegalArgumentException iae) {
    throw new InvalidTypeException("Could not parse format: " + value, iae);
  }
}
```

With `parse()` implemented it is time to explore the `format()` method. `format()` takes an instance of `DateTime` and converts it to a CQL literal value. `null` values should return the String `"NULL"`. In our case the timestamp is internally stored as a `long` since [epoch](https://en.wikipedia.org/wiki/Unix_time). On a `DateTime` object we may retrieve this value with a call to `getMillis()`. This in turn gets converted to a String and returned.

```java
@Override
public String format(DateTime value) {
  if (value == null)
    return "NULL";

  return Long.toString(value.getMillis());
}
```

So far our methods have been pretty simple. Let’s get into the really interesting parts of `TypeCodec`, the `serialize()` and `deserialize()` methods! First up we have `serialize()` method. This takes the Java value and serializes it into the appropriate value for the given CQL type. A `protocolVersion` is also supplied to help inform us of how to pack this value. In our case there isn’t any complex logic here. If the value is null return that, otherwise convert the value to a long or `BIGINT` in CQL. Fortunately the encoding of `BIGINT` values is handled elsewhere in the driver and we can reuse that code. Check out the implementation below.

```java
 @Override
 public ByteBuffer serialize(DateTime value, ProtocolVersion protocolVersion) {
   return value == null ? null : BigintCodec.instance.serializeNoBoxing(value.getMillis(), protocolVersion);
 }
```

Deserializing the data is just as simple with the following code:

```java
@Override
public DateTime deserialize(ByteBuffer bytes, ProtocolVersion protocolVersion) {
  return bytes == null || bytes.remaining() == 0 ? null: new DateTime(BigintCodec.instance.deserializeNoBoxing(bytes, protocolVersion));
}
```

Now with all the methods in our custom codec implemented it’s time to take it for a spin. In our application we get an instance of the `Cluster` and register our custom codec.

```java
// Setup the cluster connection
Cluster cluster = Cluster.builder().addContactPoint("127.0.0.1").build();

// Configure our DateTimeCodec
CodecRegistry codecRegistry = cluster.getConfiguration().getCodecRegistry();
codecRegistry.register(new DateTimeCodec());
```

Now whenever we pass a `DateTime` object in for a `TIMESTAMP` field the driver knows how to convert it. Our code from earlier now inserts without exceptions!

```java
session.execute("INSERT INTO my_table (partition_key, some_timestamp) VALUES (?, ?)", "bar", DateTime.now());
// SUCCESS
```

This is awesome for insert statements, but what about reads? What if we want to read a timestamp from Cassandra and have a DateTime returned instead of a `java.util.Date`? That’s easy! Since we have already registered a codec for parsing values and converting them to / from the native CQL type the driver knows what to do. We just need to let it know that we’re interested in that particular type. This can be accomplished with the `get()` method on a `Row`. Our first argument is the name of the column to retrieve (or index), then we specify the class we would like returned.

```java
ResultSet results = session.execute("SELECT * FROM my_table WHERE partition_key = 'foo'");
for (Row row : results) {
  DateTime value = row.get("some_timestamp", DateTime.class);

  System.out.println(value);
  System.out.println(value.toLocalDate());
}

// 2015-12-21T12:11:40.723-05:00
// 2015-12-21
// ANOTHER SUCCESS!
```

We have successfully implemented a `TypeCodec` for converting CQL timestamp objects into Joda Time `DateTimes`. This could be extended out to cover other types as well. Some examples from the driver’s [feature description](https://github.com/datastax/java-driver/tree/2.2/features/custom_codecs) include serializing and deserializing JSON from a String field or parsing a UDT value into a custom POJO. `TypeCodecs` appear to be very powerful with quite a bit of flexibility. I’m looking forward to seeing how other in the community leverage this feature to expand on Cassandra’s already powerful capabilities.

If you are looking for help with a tough Cassandra or Spark problem, let us know!
