/**
 * MIT License
 * Copyright (c) 2018 Patrick (p@trick.asia)
 * https://github.com/patrickasia/BlockchainDemo/blob/master/LICENSE
 */

class TransactionOutput {
	constructor(amount, pubkeyScript) {
		this.amount = amount
		this.pubkeyScript = pubkeyScript
		
		this.rawData = () => {
			return this.amount + this.pubkeyScript
		}
	}
}

module.exports = TransactionOutput