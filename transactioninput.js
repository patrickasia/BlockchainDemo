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
