<a name="Pulsarcast"></a>

## Pulsarcast
A Javascript implementation of Pulsarcast

See design and specs at https://github.com/JGAntunes/pulsarcast

**Kind**: global class  

* [Pulsarcast](#Pulsarcast)
    * [new Pulsarcast(libp2p, options)](#new_Pulsarcast_new)
    * [.libp2p](#Pulsarcast+libp2p) : <code>Libp2p</code>
    * [.started](#Pulsarcast+started) : <code>boolean</code>
    * [.peers](#Pulsarcast+peers) : <code>Map.&lt;string, Peer&gt;</code>
    * [.topics](#Pulsarcast+topics) : <code>Map.&lt;string, TopicNode&gt;</code>
    * [.subscriptions](#Pulsarcast+subscriptions) : <code>Set.&lt;string&gt;</code>
    * [.eventTrees](#Pulsarcast+eventTrees) : <code>Map.&lt;string, EventTree&gt;</code>
    * [.me](#Pulsarcast+me) : <code>Peer</code>
    * [.start(callback)](#Pulsarcast+start) ⇒
    * [.stop(callback)](#Pulsarcast+stop) ⇒
    * [.publish(topicB58Str, message, callback)](#Pulsarcast+publish) ⇒
    * [.subscribe(topicB58Str, callback)](#Pulsarcast+subscribe) ⇒
    * [.unsubscribe(topicB58Str, callback)](#Pulsarcast+unsubscribe)
    * [.createTopic(topicName, options, callback)](#Pulsarcast+createTopic) ⇒

<a name="new_Pulsarcast_new"></a>

### new Pulsarcast(libp2p, options)
Create a new PulsarCast node.


| Param | Type | Description |
| --- | --- | --- |
| libp2p | <code>Libp2pNode</code> |  |
| options | <code>object</code> | PulsarCast options |

<a name="Pulsarcast+libp2p"></a>

### pulsarcast.libp2p : <code>Libp2p</code>
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
Our peer object.

**Kind**: instance property of [<code>Pulsarcast</code>](#Pulsarcast)  
<a name="Pulsarcast+start"></a>

### pulsarcast.start(callback) ⇒
Start the PulsarCast node

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  
**Returns**: void  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="Pulsarcast+stop"></a>

### pulsarcast.stop(callback) ⇒
Stop the PulsarCast node

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  
**Returns**: void  

| Param | Type |
| --- | --- |
| callback | <code>function</code> | 

<a name="Pulsarcast+publish"></a>

### pulsarcast.publish(topicB58Str, message, callback) ⇒
Publish a message in the specified topic

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  
**Returns**: void  

| Param | Type | Description |
| --- | --- | --- |
| topicB58Str | <code>string</code> | topic base58 string |
| message | <code>Buffer</code> | message to publish |
| callback | <code>function</code> |  |

<a name="Pulsarcast+subscribe"></a>

### pulsarcast.subscribe(topicB58Str, callback) ⇒
Subscribe to a specific topic

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  
**Returns**: void  

| Param | Type | Description |
| --- | --- | --- |
| topicB58Str | <code>string</code> | topic base58 string |
| callback | <code>function</code> |  |

<a name="Pulsarcast+unsubscribe"></a>

### pulsarcast.unsubscribe(topicB58Str, callback)
Unsubscribe from a specific topic

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  

| Param | Type | Description |
| --- | --- | --- |
| topicB58Str | <code>string</code> | topic base58 string |
| callback | <code>function</code> |  |

<a name="Pulsarcast+createTopic"></a>

### pulsarcast.createTopic(topicName, options, callback) ⇒
Create a topic

**Kind**: instance method of [<code>Pulsarcast</code>](#Pulsarcast)  
**Returns**: void  

| Param | Type | Description |
| --- | --- | --- |
| topicName | <code>string</code> | topic name |
| options | <code>object</code> | Topic creation options |
| options.parent | <code>string</code> | Parent topic base58 string |
| options.subTopics | <code>object.&lt;string, string&gt;</code> | Sub topics map, with names as keys and base58 strings as values |
| options.metadata | <code>object</code> | Metadata options |
| options.metadata.allowedPublishers | <code>array.&lt;string&gt;</code> | Allowed publishers (defaults to only this node) |
| options.metadata.requestToPublish | <code>boolean</code> | Allow other nodes to request to publish (defaults to true) |
| options.metadata.eventLinking | <code>string</code> | Method used for linking events (defaults to LAST_SEEN) |
| callback | <code>function</code> |  |

