const Miner = require('./miner')

setTimeout(() => {
	if (process.argv.length > 1) {
		new Miner(process.argv[2], process.argv[3])
	} else {
		new Miner(process.argv[2])
	}
},2000)

