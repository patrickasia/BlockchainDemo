const common = require('./common')
const crypto = require('crypto')
const TransactionInput = require('./transactioninput')
const TransactionOutput = require('./transactionoutput')
const Transaction = require('./transaction')
const Block = require('./block')
const Wallet = require('./wallet')

class Miner extends Wallet {
	constructor(logName, addressToPay = "", genesis = false) {
		super(logName, addressToPay)
		var self = this			
		
		function waitForPeersReceived() {
			if (self.peers.length == 0) {
				setTimeout(waitForPeersReceived,1000)
			} else {
				if (genesis) {
					//add the genesis block
                	var input = new TransactionInput("0", 0, "")
                	var output = new TransactionOutput(0, "return true;")
                	var tx = new Transaction([input], [output])
                	var genesisBlock = new Block("0", [tx], Date.now(), 0, self.difficulty)
                	console.log(logName + ": Starts to mine the genesis block")
                	genesisBlock.mine()               		
					console.log(logName + ": Genesis block mined with hash = " + genesisBlock.header.hash) 
					self.blockchain.add(genesisBlock)
                	self.broadcastBlock(genesisBlock)
            	} else {
				
					function mine() {
						
						self.getBlocks(() => {
							
							self.getUnconfirmedTransactions(() => {
								
								if (self.blockchain.blocks.length !=0) {
									//coinbase transaction
									var input = new TransactionInput("0", 0, "")
									var reward = self.blockchain.subsidy
									var pubKeyScript = 	common.getPubkeyScript(self.address)

									var output = new TransactionOutput(reward, pubKeyScript)
									var tx = new Transaction([input], [output])
									var lastBlockHash = self.blockchain.getLastBlock().header.hash
									
									var transactions = [tx]
									//collect unconfirmed transactions into the block and claim the transaction fee
									if (self.blockchain.unconfirmedTransactions.size > 0) {
										//collect only one transaction for now
										var keys = self.blockchain.unconfirmedTransactions.keys();
										
										var kv = keys.next()
										var key = kv.value;
										var t = self.blockchain.unconfirmedTransactions.get(key)
										
										while (!kv.done && !t.isValid(self.blockchain)) {
											kv = keys.next()
											if (!kv.done) {
												key = kv.value;
												var t = self.blockchain.unconfirmedTransactions.get(key)
											}
										}
																														
										if (t.isValid(self.blockchain)) {
											console.log(logName + ": Collecting valid unconfirmed transaction " + t.transactionId)
											
											//claim the transaction fee
											var fee = t.fee(self.blockchain)
											console.log(logName + ": Claiming the transaction fee: " + fee)
											var feeOutput = new TransactionOutput(fee, common.getPubkeyScript(self.address))
											
											//build new outputs
											var newTransactionOutputs = []
											t.outputs.forEach(to => {
												newTransactionOutputs.push(to)
											})
											newTransactionOutputs.push(feeOutput)
											
											var newTransaction = new Transaction(t.inputs, newTransactionOutputs)
											transactions.push(newTransaction)											
										} else {
											//console.log(logName + ": Not collecting invalid unconfirmed transaction " + t.transactionId)
										}
									}
									
									var block = new Block(lastBlockHash, transactions, Date.now(), 0, self.difficulty)
									console.log(logName + ": Starts to mine a block following " + lastBlockHash)
									block.mine()									
									console.log(logName + ": Block mined: " + block.header.hash + " (height=" + self.blockchain.height(block) + ") following " + block.header.previousBlockHeaderHash)
									self.broadcastBlock(block)
								}
								
								setTimeout(mine,1000)
							})						
						})
					}
					
					mine()
            	}
			}
	    }

		waitForPeersReceived()		
	}
}

module.exports = Miner
