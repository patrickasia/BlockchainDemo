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
