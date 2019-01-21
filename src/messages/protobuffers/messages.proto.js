'use strict'

module.exports = `

package pulsarcast;

message Link {
  optional bytes / = 1;
}

message TopicDescriptor {

  optional string name = 1;
  optional bytes author = 2;
  optional Link parent = 2;
  map<string, Link> # = 3;
  optional MetaData metadata = 4;

  message MetaData {

    enum EventLinking {
      LAST_SEEN = 0;
      CUSTOM = 1;
    }

    message PublishersList {
      optional bool enabled = 1;
      optional repeated bytes publishers = 2;
    }

    optional string created = 1;
    optional string protocolVersion = 2;
    optional PublishersList allowedPublishers = 3;
    optional PublishersList requestToPublish = 4;
    optional EventLinking eventLinking = 5;
  }
}

message EventDescriptor {

  message MetaData {
    optional string created = 1;
    optional string protocolVersion = 2;
  }

  optional bytes publisher = 1;
  optional bytes author = 2;
  optional Link topic = 3;
  optional bytes payload = 4;
  optional Link parent = 5;
  optional MetaData metadata = 6;
}

message PeerTree {
  optional bytes topic = 1;
  repeated bytes parents = 2;
  repeated bytes children = 3;
}

message RPC {
  enum Operation {
    PING = 0;
    UPDATE = 1;
    PUBLISH_EVENT = 2;
    JOIN_TOPIC = 3;
    LEAVE_TOPIC = 4;
    NEW_TOPIC = 5;
    REQUEST_TO_PUBLISH = 6;
  }

  message Message {
    optional Operation op = 1;
    oneof payload {
      TopicDescriptor topic = 2;
      EventDescriptor event = 3;
      PeerTree peerTree = 4;
      bytes topicId = 5;
    }
    optional MetaData metadata = 6;
  }

  message MetaData {
    optional string created = 1;
    optional string protocolVersion = 2;
  }

  repeated Message msgs = 1;
}`
