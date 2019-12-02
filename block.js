const crypto = require('crypto')
const Transaction = require('./transaction')
const TransactionInput = require('./transactioninput')
const TransactionOutput = require('./transactionoutput')

class Block {
	constructor(previousBlockHeaderHash, transactions, time, nonce, difficulty, merkelRootHash="", hash="") {
		this.header = {}
		this.header.previousBlockHeaderHash = previousBlockHeaderHash
		this.header.merkelRootHash = merkelRootHash
		this.header.time = time 
		this.header.nonce = nonce 
		this.header.difficulty = difficulty 
		this.header.hash = hash				
		
		this.transactions = []		
		transactions.forEach((tx) => {
			var inputs = []
			tx.inputs.forEach((i) => {
				var input = new TransactionInput(i.outputToSpendTXID, i.outputIndex, i.signatureScript)
				inputs.push(input)
			})
			var outputs = []
			tx.outputs.forEach((o) => {
				var output = new TransactionOutput(o.amount, o.pubkeyScript)
				outputs.push(output)
            })
			var t = new Transaction(inputs, outputs, tx.date)
			this.transactions.push(t)
		}) 
			
        this.getMerkelRootHash = () => {
        	if (this.transactions.length == 1) {
            	return this.transactions[0].hash()
            } else {
            	var previousLayer = this.transactions
                while (previousLayer.length > 1) {
                	if (previousLayer.length % 2 == 1) previousLayer.push(previousLayer[previousLayer.length - 1])
                 	var nextLayer = []
                    for (var i=0; i< previousLayer.length/2; i++) {
                    	var hash = crypto.createHash('sha256')
                    	hash.update(previousLayer[2*i].hash() + previousLayer[2*i+1].hash())
                        nextLayer.push(hash.digest('hex'))
                    }
                    previousLayer = nextLayer
                }
                return previousLayer[0]
            }
        }
	
        this.data = () => {
        	return this.header.previousBlockHeaderHash + this.header.merkelRootHash + this.header.time + this.header.nonce + this.header.difficulty
        }
        
		this.mine = () => {
			this.setMerkelRootHash()
			
			var target = "0".repeat(this.header.difficulty)
			var blockHash = "not good enough"	
			
			while (blockHash.substr(0,this.header.difficulty) != target) {
				this.header.nonce++
				var hash = crypto.createHash('sha256')
				hash.update(this.data())
				blockHash = hash.digest('hex')
			}
			this.header.hash = blockHash  
		}

		this.isValid = (blockchain) => {
			//accept the genesis block
			if (this.header.previousBlockHeaderHash == "0" && blockchain.blocksMap.size == 0) return true
			
			//check that the hashes are correct
			if (this.header.merkelRootHash != this.getMerkelRootHash()) {
				console.log("Block " + this.header.hash + ": Wrong Merkel root hash")
				return false
			}
			
			var hash = crypto.createHash('sha256')
        	hash.update(this.data())
            if (hash.digest('hex') != this.header.hash) {
            	console.log("Block" + this.header.hash + ": Wrong hash")
            	return false
            }
            
            //check that the outputs are not already spent
            for (var t=0; t<this.transactions.length; t++) {
            	var tx = this.transactions[t]

            	for (var inp=0; inp<tx.inputs.length; inp++) {
            		var i = tx.inputs[inp]
            		
            		if (i.outputToSpendTXID != "0") {//check it's not the coinbase input
            			var previousTransaction = blockchain.getTransactionFromId(i.outputToSpendTXID)
            		
	            		if (blockchain.unspentTransactionOuputs.has(previousTransaction.transactionId)) {
	            			if (!blockchain.unspentTransactionOuputs.get(previousTransaction.transactionId).has(i.outputIndex)) {
	            				//console.log("Block " + this.header.hash + " UTXO: " + previousTransaction.transactionId + " with index=" + i.outputIndex + " is missing")
	            				return false
	            			}
	            		} else {
	            			//console.log("Block " + this.header.hash + " UTXO: " + previousTransaction.transactionId + " is missing")
	            			return false
	            		}
            			
            		}
                }
    		}
    		
    		//if it's an orphan it's refused
    		if (this.isOrphan(blockchain)) {
    			//console.log("Block " + this.header.hash + ": Orphan")
    			return false
    		}
    		
    		//check that all the transactions are valid
    		if (this.header.previousBlockHeaderHash != "0") {//not for the genesis block
    			
    			for (var t=0; t<this.transactions.length; t++) {

    				var tx = this.transactions[t]
    			
    				if (!tx.isValid(blockchain, t==0)) {
    					console.log("Block " + this.header.hash + ": Invalid transaction")
    					return false
    				}
    			}
    		}
			
			return true
		}

		this.isOrphan = (blockchain) => {
			return !blockchain.blocksMap.has(this.header.previousBlockHeaderHash)
		}
		
		this.setMerkelRootHash = () => {
			this.header.merkelRootHash = this.getMerkelRootHash()
		}

	}
}

module.exports = Block
