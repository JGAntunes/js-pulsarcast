## Classes

<dl>
<dt><a href="#Pulsarcast">Pulsarcast</a></dt>
<dd><p>A Javascript implementation of Pulsarcast</p>
<p>See design and specs at <a href="https://github.com/JGAntunes/pulsarcast">https://github.com/JGAntunes/pulsarcast</a></p>
</dd>
<dt><a href="#EventNode">EventNode</a></dt>
<dd><p>A DAG node representing an Event descriptor</p>
</dd>
<dt><a href="#EventTree">EventTree</a></dt>
<dd><p>A representation of an event tree for a given topic</p>
</dd>
<dt><a href="#TopicNode">TopicNode</a></dt>
<dd><p>A DAG node representing a Topic descriptor</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#SerializedEvent">SerializedEvent</a> : <code>Object</code></dt>
<dd><p>Serialized event representation</p>
</dd>
<dt><a href="#ReadableEvent">ReadableEvent</a> : <code>Object</code></dt>
<dd><p>Human readable event representation</p>
</dd>
<dt><a href="#SerializedTopic">SerializedTopic</a> : <code>Object</code></dt>
<dd><p>Serialized topic representation</p>
</dd>
<dt><a href="#ReadableTopic">ReadableTopic</a> : <code>Object</code></dt>
<dd><p>Human readable topic representation</p>
</dd>
</dl>

## External

<dl>
<dt><a href="#external_CID">CID</a></dt>
<dd><p>CID (Content Identifier)</p>
</dd>
<dt><a href="#external_Libp2pNode">Libp2pNode</a></dt>
<dd><p>Libp2p node</p>
</dd>
<dt><a href="#external_PeerId">PeerId</a></dt>
<dd><p>Peer identifier object</p>
</dd>
</dl>

<a name="Pulsarcast"></a>

## Pulsarcast
A Javascript implementation of Pulsarcast

See design and specs at https://github.com/JGAntunes/pulsarcast

**Kind**: global class  

* [Pulsarcast](#Pulsarcast)
    * [new Pulsarcast(libp2p, [options])](#new_Pulsarcast_new)
    * [.libp2p](#Pulsarcast+libp2p) : [<code>Libp2pNode</code>](#external_Libp2pNode)
    * [.started](#Pulsarcast+started) : <code>boolean</code>
    * [.peers](#Pulsarcast+peers) : <code>Map.&lt;string, Peer&gt;</code>
    * [.topics](#Pulsarcast+topics) : <code>Map.&lt;string, TopicNode&gt;</code>
    * [.subscriptions](#Pulsarcast+subscriptions) : <code>Set.&lt;string&gt;</code>
    * [.eventTrees](#Pulsarcast+eventTrees) : <code>Map.&lt;string, EventTree&gt;</code>
    * [.me](#Pulsarcast+me) : <code>Peer</code>
    * [.start(callback)](#Pulsarcast+start) ⇒ <code>void</code>
    * [.stop(callback)](#Pulsarcast+stop) ⇒ <code>void</code>
    * [.publish(topicB58Str, message, callback)](#Pulsarcast+publish) ⇒ <code>void</code>
    * [.subscribe(topicB58Str, [options], callback)](#Pulsarcast+subscribe) ⇒ <code>void</code>
    * [.unsubscribe(topicB58Str, callback)](#Pulsarcast+unsubscribe)
    * [.createTopic(topicName, [options], callback)](#Pulsarcast+createTopic) ⇒ <code>void</code>

<a name="new_Pulsarcast_new"></a>

### new Pulsarcast(libp2p, [options])
Create a new PulsarCast node.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| libp2p | [<code>Libp2pNode</code>](#external_Libp2pNode) |  |  |
| [options] | <code>object</code> | <code>{}</code> | PulsarCast options |

<a name="Pulsarcast+libp2p"></a>

### pulsarcast.libp2p : [<code>Libp2pNode</code>](#external_Libp2pNode)
Local ref to the libp2p node.

**Kind**: instance property of [<code>Pulsarcast</code>](#Pulsarcast)  
<a name="Pulsarcast+started"></a>

### pulsarcast.started : <code>boolean</code>
Node current status info.

**Kind**: instance property of [<code>Pulsarcast</code>](#Pulsarcast)  
<a name="Pulsarcast+peers"></a>

### pulsarcast.peers : <code>Map.&lt;string, Peer&gt;</code>
Map of peers.

**Kind**: instance property of [<code>Pulsarcast</code>](#Pulsarcast)  
<a name="Pulsarcast+topics"></a>

### pulsarcast.topics : <code>Map.&lt;string, TopicNode&gt;</code>
Map of topics.

**Kind**: instance property of [<code>Pulsarcast</code>](#Pulsarcast)  
<a name="Pulsarcast+subscriptions"></a>

### pulsarcast.subscriptions : <code>Set.&lt;string&gt;</code>
List of our subscriptions

**Kind**: instance property of [<code>Pulsarcast</code>](#Pulsarcast)  
<a name="Pulsarcast+eventTrees"></a>

### pulsarcast.eventTrees : <code>Map.&lt;string, EventTree&gt;</code>
Map of the event dissemination trees.

**Kind**: instance property of [<code>Pulsarcast</code>](#Pulsarcast)  
<a name="Pulsarcast+me"></a>

### pulsarcast.me : <code>Peer</code>
This node peer object.

**Kind**: instance property of [<code>Pulsarcast</code>](#Pulsarcast)  
<a name="Pulsarcast+start"></a>

### pulsarcast.start(callback) ⇒ <code>void</code>
Start the PulsarCast node

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="Pulsarcast+stop"></a>

### pulsarcast.stop(callback) ⇒ <code>void</code>
Stop the PulsarCast node

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="Pulsarcast+publish"></a>

### pulsarcast.publish(topicB58Str, message, callback) ⇒ <code>void</code>
Publish a message in the specified topic

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  

| Param | Type | Description |
| --- | --- | --- |
| topicB58Str | <code>string</code> | topic base58 string |
| message | <code>Buffer</code> | message to publish |
| callback | <code>function</code> |  |

<a name="Pulsarcast+subscribe"></a>

### pulsarcast.subscribe(topicB58Str, [options], callback) ⇒ <code>void</code>
Subscribe to a specific topic

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| topicB58Str | <code>string</code> |  | topic base58 string |
| [options] | <code>object</code> | <code>{}</code> |  |
| [options.subscribeToMeta] | <code>object</code> | <code>true</code> | optionally subscribe to this topic meta updates (updates to the topic descriptor) |
| callback | <code>function</code> |  |  |

<a name="Pulsarcast+unsubscribe"></a>

### pulsarcast.unsubscribe(topicB58Str, callback)
Unsubscribe from a specific topic

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| topicB58Str | <code>string</code> |  | topic base58 string |
| [options.unsubscribeFromMeta] | <code>object</code> | <code>true</code> | optionally unsubscribe from this topic meta updates (updates to the topic descriptor) |
| callback | <code>function</code> |  |  |

<a name="Pulsarcast+createTopic"></a>

### pulsarcast.createTopic(topicName, [options], callback) ⇒ <code>void</code>
Create a topic

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| topicName | <code>string</code> |  | topic name |
| [options] | <code>object</code> | <code>{}</code> | Topic creation options |
| [options.parent] | <code>string</code> | <code>null</code> | Parent topic base58 string |
| [options.subTopics] | <code>object.&lt;string, string&gt;</code> | <code>{}</code> | Sub topics map, with names as keys and base58 strings as values |
| [options.metadata] | <code>object</code> | <code>{}</code> | Metadata options |
| [options.metadata.allowedPublishers] | <code>array.&lt;string&gt;</code> |  | Allowed publishers (defaults to only this node) |
| [options.metadata.requestToPublish] | <code>boolean</code> | <code>true</code> | Allow other nodes to request to publish |
| [options.metadata.eventLinking] | <code>string</code> | <code>&quot;LAST_SEEN&quot;</code> | Method used for linking events |
| callback | <code>function</code> |  |  |

<a name="EventNode"></a>

## EventNode
A DAG node representing an Event descriptor

**Kind**: global class  

* [EventNode](#EventNode)
    * [new EventNode(topicCID, author, payload, [options])](#new_EventNode_new)
    * _instance_
        * [.topicCID](#EventNode+topicCID) : <code>CID</code>
        * [.author](#EventNode+author) : [<code>PeerId</code>](#external_PeerId)
        * [.payload](#EventNode+payload) : <code>Buffer</code>
        * [.publisher](#EventNode+publisher) : [<code>PeerId</code>](#external_PeerId)
        * [.parent](#EventNode+parent) : <code>CID</code>
        * [.metadata](#EventNode+metadata) : <code>object</code>
        * [.isPublished](#EventNode+isPublished) : <code>boolean</code>
        * [.getReadableFormat()](#EventNode+getReadableFormat) ⇒ [<code>ReadableEvent</code>](#ReadableEvent)
        * [.getCID(callback)](#EventNode+getCID) ⇒ <code>void</code>
        * [.serialize()](#EventNode+serialize) ⇒ [<code>SerializedEvent</code>](#SerializedEvent)
        * [.serializeCBOR(callback)](#EventNode+serializeCBOR) ⇒ <code>void</code>
    * _static_
        * [.deserialize(event)](#EventNode.deserialize) ⇒ [<code>EventNode</code>](#EventNode)
        * [.deserializeCBOR(event, callback)](#EventNode.deserializeCBOR) ⇒ <code>void</code>

<a name="new_EventNode_new"></a>

### new EventNode(topicCID, author, payload, [options])
Create a new EventNode.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| topicCID | <code>string</code> \| <code>CID</code> |  | Topic CID or base58 string for this event |
| author | [<code>PeerId</code>](#external_PeerId) |  |  |
| payload | <code>Buffer</code> |  | Message to publish |
| [options] | <code>object</code> | <code>{}</code> |  |
| [options.parent] | <code>string</code> |  | Parent event base58 string |
| [options.publisher] | <code>string</code> |  | Base58 string id of the publisher node |
| [options.metadata] | <code>object</code> | <code>{}</code> | Metadata options |

<a name="EventNode+topicCID"></a>

### eventNode.topicCID : <code>CID</code>
Topic CID

**Kind**: instance property of [<code>EventNode</code>](#EventNode)  
<a name="EventNode+author"></a>

### eventNode.author : [<code>PeerId</code>](#external_PeerId)
Author PeerId

**Kind**: instance property of [<code>EventNode</code>](#EventNode)  
<a name="EventNode+payload"></a>

### eventNode.payload : <code>Buffer</code>
The payload of the event

**Kind**: instance property of [<code>EventNode</code>](#EventNode)  
<a name="EventNode+publisher"></a>

### eventNode.publisher : [<code>PeerId</code>](#external_PeerId)
Publisher PeerId

**Kind**: instance property of [<code>EventNode</code>](#EventNode)  
<a name="EventNode+parent"></a>

### eventNode.parent : <code>CID</code>
Parent event

**Kind**: instance property of [<code>EventNode</code>](#EventNode)  
<a name="EventNode+metadata"></a>

### eventNode.metadata : <code>object</code>
Event metadata

**Kind**: instance property of [<code>EventNode</code>](#EventNode)  
**Properties**

| Name | Type |
| --- | --- |
| created | <code>Date</code> | 
| protocolVersion | <code>string</code> | 

<a name="EventNode+isPublished"></a>

### eventNode.isPublished : <code>boolean</code>
Is the event published

**Kind**: instance property of [<code>EventNode</code>](#EventNode)  
<a name="EventNode+getReadableFormat"></a>

### eventNode.getReadableFormat() ⇒ [<code>ReadableEvent</code>](#ReadableEvent)
Return an object representing en event in readable format
with string representations of the buffers

**Kind**: instance method of [<code>EventNode</code>](#EventNode)  
<a name="EventNode+getCID"></a>

### eventNode.getCID(callback) ⇒ <code>void</code>
Get the event CID

**Kind**: instance method of [<code>EventNode</code>](#EventNode)  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="EventNode+serialize"></a>

### eventNode.serialize() ⇒ [<code>SerializedEvent</code>](#SerializedEvent)
Serialize this event

**Kind**: instance method of [<code>EventNode</code>](#EventNode)  
<a name="EventNode+serializeCBOR"></a>

### eventNode.serializeCBOR(callback) ⇒ <code>void</code>
Serialize this event to a CBOR buffer representation

**Kind**: instance method of [<code>EventNode</code>](#EventNode)  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="EventNode.deserialize"></a>

### EventNode.deserialize(event) ⇒ [<code>EventNode</code>](#EventNode)
Deserialize a given event and create an EventNode

**Kind**: static method of [<code>EventNode</code>](#EventNode)  

| Param | Type |
| --- | --- |
| event | [<code>SerializedEvent</code>](#SerializedEvent) | 

<a name="EventNode.deserializeCBOR"></a>

### EventNode.deserializeCBOR(event, callback) ⇒ <code>void</code>
Deserialize a given CBOR buffer representing an event and create an EventNode

**Kind**: static method of [<code>EventNode</code>](#EventNode)  

| Param | Type |
| --- | --- |
| event | [<code>SerializedEvent</code>](#SerializedEvent) | 
| callback | <code>function</code> | 

<a name="EventTree"></a>

## EventTree
A representation of an event tree for a given topic

**Kind**: global class  

* [EventTree](#EventTree)
    * [new EventTree(topicNode)](#new_EventTree_new)
    * [.topicNode](#EventTree+topicNode) : [<code>TopicNode</code>](#TopicNode)
    * [.eventMap](#EventTree+eventMap) : <code>Map.&lt;string, EventNode&gt;</code>
    * [.mostRecent](#EventTree+mostRecent) : [<code>EventNode</code>](#EventNode)
    * [.addNew(eventNode, [options], callback)](#EventTree+addNew) ⇒ <code>void</code>
    * [.add(eventNode, callback)](#EventTree+add) ⇒ <code>void</code>
    * [.get(eventCID)](#EventTree+get) ⇒ [<code>EventNode</code>](#EventNode)

<a name="new_EventTree_new"></a>

### new EventTree(topicNode)
Create a new EventTree.


| Param | Type |
| --- | --- |
| topicNode | [<code>TopicNode</code>](#TopicNode) | 

<a name="EventTree+topicNode"></a>

### eventTree.topicNode : [<code>TopicNode</code>](#TopicNode)
Topic node

**Kind**: instance property of [<code>EventTree</code>](#EventTree)  
<a name="EventTree+eventMap"></a>

### eventTree.eventMap : <code>Map.&lt;string, EventNode&gt;</code>
Event map used to keep track of events for a given topic. Indexed by CID
base58 string

**Kind**: instance property of [<code>EventTree</code>](#EventTree)  
<a name="EventTree+mostRecent"></a>

### eventTree.mostRecent : [<code>EventNode</code>](#EventNode)
The most recent event for this topic

**Kind**: instance property of [<code>EventTree</code>](#EventTree)  
<a name="EventTree+addNew"></a>

### eventTree.addNew(eventNode, [options], callback) ⇒ <code>void</code>
Adds a newly created event to the event tree and links it correctly

**Kind**: instance method of [<code>EventTree</code>](#EventTree)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| eventNode | [<code>EventNode</code>](#EventNode) |  |  |
| [options] | <code>object</code> | <code>{}</code> |  |
| [options.parent] | <code>string</code> | <code>null</code> | Parent  base58 string to link the event to, if the topic allows custom linking |
| callback | <code>function</code> |  | Returns the updated event node |

<a name="EventTree+add"></a>

### eventTree.add(eventNode, callback) ⇒ <code>void</code>
Adds an event to the topic tree, updating the most recent event ref

**Kind**: instance method of [<code>EventTree</code>](#EventTree)  

| Param | Type | Description |
| --- | --- | --- |
| eventNode | [<code>EventNode</code>](#EventNode) |  |
| callback | <code>function</code> | Returns the event node |

<a name="EventTree+get"></a>

### eventTree.get(eventCID) ⇒ [<code>EventNode</code>](#EventNode)
Get an event from this tree

**Kind**: instance method of [<code>EventTree</code>](#EventTree)  

| Param | Type |
| --- | --- |
| eventCID | <code>CID</code> | 

<a name="TopicNode"></a>

## TopicNode
A DAG node representing a Topic descriptor

**Kind**: global class  

* [TopicNode](#TopicNode)
    * [new TopicNode(name, author, [options])](#new_TopicNode_new)
    * _instance_
        * [.name](#TopicNode+name) : <code>string</code>
        * [.author](#TopicNode+author) : [<code>PeerId</code>](#external_PeerId)
        * [.subTopics](#TopicNode+subTopics) : <code>object.&lt;string, CID&gt;</code>
        * [.parent](#TopicNode+parent) : <code>CID</code>
        * [.subTopics](#TopicNode+subTopics) : <code>object.&lt;string, CID&gt;</code>
        * [.metadata](#TopicNode+metadata) : <code>object</code>
        * [.getReadableFormat()](#TopicNode+getReadableFormat) ⇒ [<code>ReadableTopic</code>](#ReadableTopic)
        * [.getCID(callback)](#TopicNode+getCID) ⇒ <code>void</code>
        * [.serialize()](#TopicNode+serialize) ⇒ [<code>SerializedTopic</code>](#SerializedTopic)
        * [.serializeCBOR(callback)](#TopicNode+serializeCBOR) ⇒ <code>void</code>
    * _static_
        * [.deserialize(topic)](#TopicNode.deserialize) ⇒ [<code>TopicNode</code>](#TopicNode)
        * [.deserializeCBOR(topic, callback)](#TopicNode.deserializeCBOR) ⇒ <code>void</code>

<a name="new_TopicNode_new"></a>

### new TopicNode(name, author, [options])
Create a new TopicNode.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  |  |
| author | [<code>PeerId</code>](#external_PeerId) |  |  |
| [options] | <code>object</code> | <code>{}</code> |  |
| [options.parent] | <code>string</code> | <code>null</code> | Parent topic base58 string |
| [options.subTopics] | <code>object.&lt;string, string&gt;</code> | <code>{}</code> | Sub topics map, with names as keys and base58 strings as values |
| [options.metadata] | <code>object</code> | <code>{}</code> | Metadata options |
| [options.metadata.allowedPublishers] | <code>array.&lt;string&gt;</code> |  | Allowed publishers (defaults to only this node) |
| [options.metadata.requestToPublish] | <code>boolean</code> | <code>true</code> | Allow other nodes to request to publish |
| [options.metadata.eventLinking] | <code>string</code> | <code>&quot;LAST_SEEN&quot;</code> | Method used for linking events |

<a name="TopicNode+name"></a>

### topicNode.name : <code>string</code>
Topic human readable name.

**Kind**: instance property of [<code>TopicNode</code>](#TopicNode)  
<a name="TopicNode+author"></a>

### topicNode.author : [<code>PeerId</code>](#external_PeerId)
Author PeerId

**Kind**: instance property of [<code>TopicNode</code>](#TopicNode)  
<a name="TopicNode+subTopics"></a>

### topicNode.subTopics : <code>object.&lt;string, CID&gt;</code>
Sub topics

**Kind**: instance property of [<code>TopicNode</code>](#TopicNode)  
<a name="TopicNode+parent"></a>

### topicNode.parent : <code>CID</code>
Parent topic

**Kind**: instance property of [<code>TopicNode</code>](#TopicNode)  
<a name="TopicNode+subTopics"></a>

### topicNode.subTopics : <code>object.&lt;string, CID&gt;</code>
Sub topics

**Kind**: instance property of [<code>TopicNode</code>](#TopicNode)  
<a name="TopicNode+metadata"></a>

### topicNode.metadata : <code>object</code>
Topic metadata

**Kind**: instance property of [<code>TopicNode</code>](#TopicNode)  
**Properties**

| Name | Type |
| --- | --- |
| allowedPublishers | <code>boolean</code> | 
| requestToPublish | <code>boolean</code> | 
| eventLinking | <code>string</code> | 
| created | <code>Date</code> | 
| protocolVersion | <code>string</code> | 

<a name="TopicNode+getReadableFormat"></a>

### topicNode.getReadableFormat() ⇒ [<code>ReadableTopic</code>](#ReadableTopic)
Return an object representing a topic in readable format
with string representations of the buffers

**Kind**: instance method of [<code>TopicNode</code>](#TopicNode)  
<a name="TopicNode+getCID"></a>

### topicNode.getCID(callback) ⇒ <code>void</code>
Get the topic CID

**Kind**: instance method of [<code>TopicNode</code>](#TopicNode)  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="TopicNode+serialize"></a>

### topicNode.serialize() ⇒ [<code>SerializedTopic</code>](#SerializedTopic)
Serialize this topic

**Kind**: instance method of [<code>TopicNode</code>](#TopicNode)  
<a name="TopicNode+serializeCBOR"></a>

### topicNode.serializeCBOR(callback) ⇒ <code>void</code>
Serialize this topic to a CBOR buffer representation

**Kind**: instance method of [<code>TopicNode</code>](#TopicNode)  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="TopicNode.deserialize"></a>

### TopicNode.deserialize(topic) ⇒ [<code>TopicNode</code>](#TopicNode)
Deserialize a given topic and create a TopicNode

**Kind**: static method of [<code>TopicNode</code>](#TopicNode)  

| Param | Type |
| --- | --- |
| topic | [<code>SerializedTopic</code>](#SerializedTopic) | 

<a name="TopicNode.deserializeCBOR"></a>

### TopicNode.deserializeCBOR(topic, callback) ⇒ <code>void</code>
Deserialize a given CBOR buffer representing a topic and create a TopicNode

**Kind**: static method of [<code>TopicNode</code>](#TopicNode)  

| Param | Type |
| --- | --- |
| topic | [<code>SerializedTopic</code>](#SerializedTopic) | 
| callback | <code>function</code> | 

<a name="SerializedEvent"></a>

## SerializedEvent : <code>Object</code>
Serialized event representation

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| topic | <code>Object</code> | The topic DAG link |
| author | <code>Buffer</code> | The event author |
| payload | <code>Buffer</code> | Event payload |
| publisher | <code>Buffer</code> | The event publisher |
| parent | <code>Object</code> | The event parent DAG link |
| metadata | <code>object</code> | Event metadata object |
| metadata.version | <code>string</code> | Pulsarcast protocol version used for this event |
| metadata.created | <code>string</code> | Date in ISO string format |

<a name="ReadableEvent"></a>

## ReadableEvent : <code>Object</code>
Human readable event representation

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| topicCID | <code>string</code> |  |
| author | <code>string</code> | The event author base58 id |
| payload | <code>Buffer</code> | Event payload |
| publisher | <code>string</code> | The event publisher base58 id |
| parent | <code>string</code> | The event parent base58 id |
| isPublished | <code>boolean</code> |  |
| metadata | <code>object</code> | Event metadata object |
| metadata.version | <code>string</code> | Pulsarcast protocol version used for this event |
| metadata.created | <code>string</code> | Date in ISO string format |

<a name="SerializedTopic"></a>

## SerializedTopic : <code>Object</code>
Serialized topic representation

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The topic name |
| author | <code>Buffer</code> | The topic author |
| parent | <code>Object</code> | The topic parent DAG link |
| # | <code>object.&lt;string, {&#x27;/&#x27;: Buffer}&gt;</code> | The topic sub topics, were the keys are names and the values DAG links |
| metadata | <code>object</code> | Topic metadata object |
| metadata.created | <code>string</code> | Date in ISO string format |
| metadata.allowedPublishers | <code>Array.&lt;Buffer&gt;</code> | Array of peer ids allowed to publish |
| metadata.requestToPublish | <code>Array.&lt;Buffer&gt;</code> | Array of peer ids allowed to request to publish |
| metadata.version | <code>string</code> | Pulsarcast protocol version used for this topic |
| metadata.eventLinking | <code>string</code> | Event linking method used for this topic |

<a name="ReadableTopic"></a>

## ReadableTopic : <code>Object</code>
Human readable topic representation

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | The topic name |
| author | <code>string</code> | The topic author base58 id |
| parent | <code>string</code> | The topic parent base58 id |
| # | <code>object.&lt;string, string&gt;</code> | The topic sub topics, were the keys are names and the values base58 representations of the topic |
| metadata | <code>object</code> | Topic metadata object |
| metadata.created | <code>string</code> | Date in ISO string format |
| metadata.allowedPublishers | <code>Array.&lt;string&gt;</code> | Array of base58 peer ids allowed to publish |
| metadata.requestToPublish | <code>Array.&lt;string&gt;</code> | Array of base58 peer ids allowed to request to publish |
| metadata.version | <code>string</code> | Pulsarcast protocol version used for this topic |
| metadata.eventLinking | <code>string</code> | Event linking method used for this topic |

<a name="external_CID"></a>

## CID
CID (Content Identifier)

**Kind**: global external  
**See**: [https://github.com/multiformats/js-cid#api](https://github.com/multiformats/js-cid#api)  
<a name="external_Libp2pNode"></a>

## Libp2pNode
Libp2p node

**Kind**: global external  
**See**: [https://github.com/libp2p/js-libp2p#api](https://github.com/libp2p/js-libp2p#api)  
<a name="external_PeerId"></a>

## PeerId
Peer identifier object

**Kind**: global external  
**See**: [https://github.com/libp2p/js-libp2p#ap://github.com/libp2p/js-peer-id#api](https://github.com/libp2p/js-libp2p#ap://github.com/libp2p/js-peer-id#api)  
