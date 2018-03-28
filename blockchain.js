/**
 * MIT License
 * Copyright (c) 2018 Patrick (p@trick.asia)
 * https://github.com/patrickasia/BlockchainDemo/blob/master/LICENSE
 */

const Block = require('./block')
const Transaction = require('./transaction')

class Blockchain {
	constructor(logName) {
		
		this.staleThreshold = 5 //if there is a fork with heights < this threshold under the blockchain length, the blocks are considered as stale 
		
		this.blocksMap = new Map()
		this.blocks = []//to export JSON array. Get rid of that later
		
		this.unspentTransactionOuputs= new Map()//transactionID => Set of output indexes
		this.transactionId2BlockHash = new Map()
		
		this.unconfirmedTransactions = new Map()//unconfirmedTransactionID => unconfirmedTransaction

		this.subsidy = 10//fixed
		
		this.add = (block) => {//always check if it's valid before
			this.blocksMap.set(block.header.hash, block)
			this.blocks.push(block)
			
			block.transactions.forEach( (tx) => {
				this.transactionId2BlockHash.set(tx.transactionId, block.header.hash)
			})
						
			this.updateUnspentTransactionOuputs(block, true);
			
			//remove stale blocks and update unspentTransactionOuputOutpoints
			this.removeStaleBlocks()	
		}

		this.clear = () => {
			this.blocksMap.clear()
			this.blocks=[]
		}
		
		this.getTransactionFromId = (txId) => {
			if (this.transactionId2BlockHash.has(txId)) {
				
				if (this.blocksMap.has(this.transactionId2BlockHash.get(txId))) {
									
					var transactionBlock = this.blocksMap.get(this.transactionId2BlockHash.get(txId))
					var i = 0
					var found = false
					var transaction
					while ( i < transactionBlock.transactions.length && !found) {
						transaction = new Transaction(transactionBlock.transactions[i].inputs, transactionBlock.transactions[i].outputs, transactionBlock.transactions[i].date)						
						found = transaction.transactionId == txId						
						i++
					}
					if (found) {
						return transaction
					} else {
						return false
					}
				} else {
					return false
				}
			} else {
				return false
			}
		}

		this.updateUnspentTransactionOuputs = (block, addedOrDeleted) => {

			if (addedOrDeleted) {//added				
				//add this block's output
				block.transactions.forEach((tx) => {
					if (!this.transactionId2BlockHash.has(tx.transactionId)) {
						this.transactionId2BlockHash.set(tx.transactionId,block.header.hash)
					}
					if (!this.unspentTransactionOuputs.has(tx.transactionId)) {
						this.unspentTransactionOuputs.set(tx.transactionId, new Set())
					}
					tx.outputs.forEach((o,index) => {
						//console.log(logName + ": Adds UTXO " + tx.transactionId + " index = "+ index)
						this.unspentTransactionOuputs.get(tx.transactionId).add(index)
					})
				})
				//remove the outputs that this block spends
				block.transactions.forEach((tx) => {
					tx.inputs.forEach((i,index) => {
						if (i.outputToSpendTXID != "0" && this.unspentTransactionOuputs.has(i.outputToSpendTXID)) {
							//console.log(logName + ": Deletes UTXO " + i.outputToSpendTXID + " index = "+ index)
							this.unspentTransactionOuputs.get(i.outputToSpendTXID).delete(i.outputIndex)
							if (this.unspentTransactionOuputs.get(i.outputToSpendTXID).size == 0) {
								this.unspentTransactionOuputs.delete(i.outputToSpendTXID)
							}							
						}
					})
				})
			} else {//deleted
				//add the outputs that this block spent
				block.transactions.forEach((tx) => {					
					tx.inputs.forEach((i,index) => {
						if (!this.transactionId2BlockHash.has(i.outputToSpendTXID)) {
							this.transactionId2BlockHash.set(i.outputToSpendTXID,block.header.previousBlockHeaderHash)
						}

						if (!this.unspentTransactionOuputs.has(i.outputToSpendTXID)) {
							this.unspentTransactionOuputs.set(i.outputToSpendTXID, new Set())
						}

						//console.log(logName + ": Adds UTXO " + i.outputToSpendTXID + " index = "+ i.outputIndex)
						this.unspentTransactionOuputs.get(i.outputToSpendTXID).add(i.outputIndex)
					})
				})
				
				//remove this block's outputs
				block.transactions.forEach((tx) => {
					//console.log(logName + ": Deletes UTXO " + tx.transactionId)
					this.unspentTransactionOuputs.delete(tx.transactionId)
				})
			}				
		}
		
		this.length = () => {
			var result = 0
			//not optimized...
			this.blocksMap.forEach( (block) => {
				var height = this.height(block)
				if (height > result) {
					result = height
				}
			})
			
			return result
		}
		
		this.has = (block) => {			
			return this.blocksMap.has(block.header.hash)
		}
		
		this.getLastBlock = () => {
			var result
			var length = this.length()
			
			this.blocksMap.forEach( (block) => {
				if (this.height(block) == length) {
					result = block
				}
			})
			
			return result
		}
		
		this.getLeaves = () => {//blocks with no followers
			var bMap = new Map(this.blocksMap)			
			
			var iterator = this.blocksMap.entries()
			for (let b of iterator) { //delete all previous
				//console.log(JSON.stringify(b))
				bMap.delete(b[1].header.previousBlockHeaderHash)
			}
			
			var result = []
			iterator = bMap.entries()
			for (let b of iterator) {
				result.push(b[1])
			}
			
			return result
		}
		
		
		this.removeStaleBlocks = () => {
			var bMap = new Map(this.blocksMap)
			var leaves = this.getLeaves()
			var length = this.length()
			var doRemove = false
			for (var i=0; i<leaves.length; i++) {
				var b = leaves[i]
				
				if (length - this.staleThreshold > 0 && this.height(b) > length - this.staleThreshold) {
					doRemove = true
					while (b.header.previousBlockHeaderHash != "0") {	
						var hash = b.header.hash
						b = this.blocksMap.get(b.header.previousBlockHeaderHash)
						bMap.delete(hash)
					}										
				}					
			}
			
			if (doRemove) {
				var iterator = bMap.entries()
				for (let b of iterator) {
					if (b[1].header.previousBlockHeaderHash != "0") {//because it's still here
						console.log(logName + ": Deleting stale block " + b[1].header.hash)
						this.blocksMap.delete(b[1].header.hash)
						this.updateUnspentTransactionOuputs(b[1], false);						
					}
				}
				
				//rebuilding the array
				this.blocks = []
				this.blocksMap.forEach((block) => {				
					this.blocks.push(block)
				})
			}

		}
		
		this.height = (block) => {
			if (block.header.previousBlockHeaderHash == "0") return 0
			
			var b = block
			var count = 0
			
			while(b.header.previousBlockHeaderHash != "0" && this.blocksMap.has(b.header.previousBlockHeaderHash)) {
				count++;
				b = this.blocksMap.get(b.header.previousBlockHeaderHash)
			}

			if (b.header.previousBlockHeaderHash == "0") {
				return count
			} else {
				return null//the chain is broken. orphan 
			}
		}
	}
}

module.exports = Blockchain
