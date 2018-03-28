/**
 * MIT License
 * Copyright (c) 2018 Patrick (p@trick.asia)
 * https://github.com/patrickasia/BlockchainDemo/blob/master/LICENSE
 */

const Miner = require('./miner')

setTimeout(() => {
	if (process.argv.length > 1) {
		new Miner(process.argv[2], process.argv[3])
	} else {
		new Miner(process.argv[2])
	}
},2000)

