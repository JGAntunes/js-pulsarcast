/* eslint-env mocha */
/* eslint no-unused-expressions: 0 */
'use strict'

const chai = require('chai')
const expect = chai.expect
const { parallel } = require('async')

const Pulsarcast = require('../../src')
const TopicNode = require('../../src/dag/topic-node')
const { createNodes } = require('../utils')

describe('2 nodes', () => {
  let nodes
  let topic
  let topicCID

  before((done) => {
    createNodes(2, (err, p2pNodes) => {
      expect(err).not.to.exist
      nodes = p2pNodes.map((node) => new Pulsarcast(node))
      done()
    })
  })

  it('starts both nodes', (done) => {
    parallel([
      nodes[0].start.bind(nodes[0]),
      nodes[1].start.bind(nodes[1])
    ], (err) => {
      expect(err).to.not.exist
      expect(nodes[0].started).to.be.true
      expect(nodes[1].started).to.be.true
      done()
    })
  })

  it('creates a topic', (done) => {
    nodes[0].createTopic('test', (err, topicNode) => {
      expect(err).to.not.exist
      expect(topicNode).to.be.an.instanceof(TopicNode)
      topicNode.getCID((err, cid) => {
        expect(err).to.not.exist
        const topicB58Str = cid.toBaseEncodedString()
        expect(nodes[0].subscriptions.size).to.equal(1)
        expect(nodes[0].subscriptions.has(topicB58Str)).to.be.true
        topic = topicNode
        topicCID = cid
        done()
      })
    })
  })

  it('subscribes to the previously created topic', (done) => {
    nodes[1].subscribe(topicCID.toBaseEncodedString(), (err, topicNode) => {
      expect(err).to.not.exist
      expect(nodes[1].subscriptions.size).to.equal(1)
      expect(nodes[1].subscriptions.has(topicCID.toBaseEncodedString())).to.be.true
      expect(topicNode.serialize()).to.deep.equal(topic.serialize())
      done()
    })
  })
})
