/**
 * MIT License
 * Copyright (c) 2018 Patrick (p@trick.asia)
 * https://github.com/patrickasia/BlockchainDemo/blob/master/LICENSE
 */

const DynamicDNS = require('./dynamicdns')
const Peer = require('./peer')
const Miner = require('./miner')
const Wallet = require('./wallet')

var dns = new DynamicDNS()
dns.startServer()
for (var port=3001; port<=3010; port++) {
	new Peer(port)
}

new Wallet("Alice", "", 4001)
new Wallet("Bob", "", 4002)

new Miner("Genesis Miner", "", true)

