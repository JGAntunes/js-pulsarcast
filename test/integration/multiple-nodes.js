/* eslint-env mocha */
/* eslint no-unused-expressions: 0 */
'use strict'

const chai = require('chai')
const expect = chai.expect
const { each } = require('async')
const Pulsarcast = require('../../src')
const TopicNode = require('../../src/dag/topic-node')
const EventNode = require('../../src/dag/event-node')
const { eventually, createNodes } = require('../utils')

describe('multiple nodes', function () {
  this.timeout(50000)
  let nodes
  let topic
  let topicCID

  // Parameters
  const nodeNumber = 100
  const publisher = 1
  const subscriber = 80
  const subscriberNum = 5

  before((done) => {
    createNodes(nodeNumber, (err, p2pNodes) => {
      expect(err).not.to.exist
      nodes = p2pNodes.map((node) => new Pulsarcast(node))
      done()
    })
  })

  it(`starts ${nodeNumber} nodes`, (done) => {
    each(nodes, (node, cb) => node.start(cb), (err) => {
      expect(err).to.not.exist
      nodes.forEach(node => {
        expect(node.started).to.be.true
      })
      done()
    })
  })

  it('creates a topic', (done) => {
    nodes[publisher].createTopic('test', (err, savedCID, topicNode) => {
      expect(err).to.not.exist
      expect(topicNode).to.be.an.instanceof(TopicNode)
      topicNode.getCID((err, cid) => {
        expect(err).to.not.exist
        const topicB58Str = cid.toBaseEncodedString()
        expect(cid.equals(savedCID)).to.be.true
        expect(nodes[publisher].subscriptions.size).to.equal(1)
        expect(nodes[publisher].subscriptions.has(topicB58Str)).to.be.true
        topic = topicNode
        topicCID = cid
        done()
      })
    })
  })

  it(`subscribes ${subscriberNum} nodes to the created topic`, (done) => {
    const topicB58Str = topicCID.toBaseEncodedString()
    const subscriberNodes = nodes.slice(subscriber, subscriberNum + subscriber)

    each(subscriberNodes, (node, cb) => {
      node.subscribe(topicB58Str, (err, topicNode) => {
        expect(err).to.not.exist
        expect(topicNode).to.be.an.instanceof(TopicNode)
        expect(node.subscriptions.size).to.equal(1)
        expect(node.subscriptions.has(topicCID.toBaseEncodedString())).to.be.true
        expect(topicNode.serialize()).to.deep.equal(topic.serialize())

        // Check tree
        const {parents} = node.me.trees.get(topicB58Str)
        expect(parents).to.have.lengthOf.above(0)
        expect(parents[0].trees.get(topicB58Str).children).to.include(node.me)
        cb()
      })
    }, done)
  })

  it('publishes a message from the non author node', (done) => {
    const topicB58Str = topicCID.toBaseEncodedString()
    const message = 'foobar'
    // Helper func to run all the expects
    let doneCount = 0
    const checkAllDone = () => {
      doneCount++
      if (doneCount === 3) done()
    }
    let firstEventNode
    // Event listener
    const listener = (eventNode) => {
      // Compare serializes of both events
      if (!firstEventNode) {
        firstEventNode = eventNode
      } else {
        expect(eventNode.serialize()).to.deep.equal(firstEventNode.serialize())
      }

      // Must have publisher
      expect(eventNode.isPublished).to.be.true
      expect(eventNode.topicCID.equals(topicCID)).to.be.true
      expect(eventNode.payload.toString()).to.be.equal(message)
      // Should match subscribed author
      expect(eventNode.author.isEqual(nodes[subscriber].me.info.id)).to.be.true
      // Should match topic author
      expect(eventNode.publisher.isEqual(nodes[publisher].me.info.id)).to.be.true

      checkAllDone()
    }
    // Setup event listeners
    nodes[subscriber].once(topicB58Str, listener)
    nodes[publisher].once(topicB58Str, listener)

    nodes[subscriber].publish(topicB58Str, message, (err, eventCID, topicNode, eventNode) => {
      expect(err).to.not.exist
      expect(eventNode).to.be.an.instanceof(EventNode)
      expect(topicNode).to.be.an.instanceof(TopicNode)
      expect(eventNode.topicCID.equals(topicCID)).to.be.true
      expect(eventNode.payload.toString()).to.be.equal(message)
      expect(eventNode.author.isEqual(nodes[subscriber].me.info.id)).to.be.true
      // Should be a request to publish
      expect(eventCID).to.be.null
      expect(eventNode.isPublished).to.be.false

      checkAllDone()
    })
  })

  it('unsubscribe from the topic', (done) => {
    const topicB58Str = topicCID.toBaseEncodedString()
    nodes[subscriber].unsubscribe(topicB58Str, (err) => {
      expect(err).to.not.exist

      expect(nodes[subscriber].subscriptions.size).to.equal(0)

      eventually(() => {
        const topicChildren = nodes[publisher].me.trees.get(topicB58Str).children
        expect(topicChildren.find(peer => peer.info.id.isEqual(nodes[1].me.info.id))).to.not.exist
      }, done)
    })
  })

  it('dissemination tress are cleaned up on connection close', (done) => {
    const topicB58Str = topicCID.toBaseEncodedString()
    const droppingNode = nodes[subscriber + 1]
    const droppingNodeId = droppingNode.me.info.id.toB58String()
    const { parents, children } = droppingNode.me.trees.get(topicB58Str)

    // Get the actual nodes
    const parentNodes = nodes.filter(node => {
      return parents.find(peer => node.me.info.id.isEqual(peer.info.id))
    })

    const childrenNodes = nodes.filter(node => {
      return children.find(peer => node.me.info.id.isEqual(peer.info.id))
    })

    droppingNode.stop(err => {
      expect(err).to.not.exist

      eventually(() => {
        debugger
        // Check dropping node is not present in any tree
        childrenNodes.forEach(child => {
          expect(child.me.trees.get(topicB58Str).parents).to.not.include(child.peers.get(droppingNodeId))
        })
        parentNodes.forEach(parent => {
          expect(parent.me.trees.get(topicB58Str).children).to.not.include(parent.peers.get(droppingNodeId))
        })
      }, done)
    })
  })
})
