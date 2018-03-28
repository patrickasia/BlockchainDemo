/**
 * MIT License
 * Copyright (c) 2018 Patrick (p@trick.asia)
 * https://github.com/patrickasia/BlockchainDemo/blob/master/LICENSE
 */

class TransactionInput {
	constructor(outputToSpendTXID, outputIndex, signatureScript) {
		this.outputToSpendTXID = outputToSpendTXID
		this.outputIndex = outputIndex
		this.signatureScript = signatureScript
		
		this.rawData = () => {
			return this.outputToSpendTXID + this.outputIndex + this.signatureScript
		}
	}
}

module.exports = TransactionInput