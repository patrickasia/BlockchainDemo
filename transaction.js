/**
 * MIT License
 * Copyright (c) 2018 Patrick (p@trick.asia)
 * https://github.com/patrickasia/BlockchainDemo/blob/master/LICENSE
 */

const crypto = require('crypto')
const TransactionInput = require('./transactioninput')
const TransactionOutput = require('./transactionoutput')

class Transaction {
	constructor(inputs, outputs, date=null) {//date is set to have different transaction ids for identical transactions
		this.inputs = inputs
		this.outputs = outputs	
		
		if (date == null) {
			this.date = Date.now()
		} else {
			this.date = date
		}
		this.rawData = () => {
			var result = ""
			this.inputs.forEach( (i) => {
				var input = new TransactionInput(i.outputToSpendTXID, i.outputIndex, i.signatureScript)
				result += input.rawData()
			})
			this.outputs.forEach( (o) => {
				var output = new TransactionOutput(o.amount, o.pubkeyScript)
				result += output.rawData()
			})
			
			result += date
			
			return result
		}
		
		this.hash = () => {
			var hash = crypto.createHash('sha256');
			hash.update(this.rawData())
			return hash.digest('hex')
		}

		this.transactionId = this.hash()
		
		this.isValid = (blockchain, coinbase = false) => {
			
			if (this.transactionId != this.hash()) {
				//console.log("Transaction " + this.transactionId + " has a wrong hash")
				return false
			}
			
			var outputAmount = 0
			this.outputs.forEach( (o) => {
				outputAmount += parseFloat(o.amount)
			})

			if (coinbase) {
				if (outputAmount > blockchain.subsidy) {
					//console.log("Coinbase transaction " + this.transactionId + " claims more than the subsidy")
					return false
				}
			} else {
				//check that all the inputs point to unspent outputs 
				//and rightly claim them
				var inputAmount = 0
				for (var index = 0; index < this.inputs.length; index++) {
					var i = this.inputs[index] 
					
					if (!blockchain.unspentTransactionOuputs.has(i.outputToSpendTXID)) {
						//console.log("Transaction " + this.transactionId + ": previous transaction missing: " + i.outputToSpendTXID)
						return false					
					}
					if (!blockchain.unspentTransactionOuputs.get(i.outputToSpendTXID).has(i.outputIndex)) {
						//console.log("Transaction " + this.transactionId + ": input doesn't spend previous output")
						return false			
					}
						
					if (i.outputToSpendTXID != "0") {
						var previousTransaction = blockchain.getTransactionFromId(i.outputToSpendTXID)
								
						var previousOutput =  previousTransaction.outputs[i.outputIndex]
						inputAmount += parseFloat(previousOutput.amount)
						var pubkeyScript = previousOutput.pubkeyScript
								
						var signatureScript = i.signatureScript
						var data = previousOutput.amount + previousOutput.pubkeyScript + i.outputToSpendTXID + i.outputIndex
												
						var script = signatureScript + pubkeyScript
						var f = new Function('data', 'crypto', script);
						if (!f(data, crypto)) {	
							//console.log("Transaction " + this.transactionId + ": the script doesn't check in")
							return false
						}
					}
				}
					
				if (outputAmount > inputAmount) {
					//console.log("Transaction " + this.transactionId + " claims too much (" + outputAmount + " > " + inputAmount + ")")
					return false
				}
			}
						
			
			return true
        }
		
		this.fee = (blockchain) => {
			var outputAmount = 0
			this.outputs.forEach( (o) => {
				outputAmount += parseFloat(o.amount)
			})
			
			var inputAmount = 0
			this.inputs.forEach( (i) => {
				var previousTransaction = blockchain.getTransactionFromId(i.outputToSpendTXID)				
				var previousOutput =  previousTransaction.outputs[i.outputIndex]
				inputAmount += parseFloat(previousOutput.amount)
			})
			
			return inputAmount - outputAmount - 0.000000001//to avoid overspending with rounding
		}
	}
}

module.exports = Transaction
