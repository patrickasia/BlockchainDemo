const Block = require('./block')
const http = require('http')
const PeersClient = require('./peersclient')
const qs = require('querystring')
const Transaction = require('./transaction')

class Peer extends PeersClient {
	constructor(port) {
		super("Peer " + port, 10000 + port)
		var self = this	
		this.postEndPoint("localhost",port)		
		
		this.port = port
		this.address = "localhost"
			
		this.requestHandler = (request, response) => {
			if(request.method == "GET") {
				if (request.url == '/transactions') {					
					var result = []
					self.blockchain.unconfirmedTransactions.forEach( (utx) => {
						result.push(utx)
					})
					
					response.end(JSON.stringify(result))
				} else if (request.url == '/blocks') {
					response.end(JSON.stringify(self.blockchain.blocks))
				}
			} else if (request.method == "POST") {
				var requestBody = ''
				request.on('data', (data) => {
				    requestBody += data	
				})
				    
				request.on('error', () => {
					response.end()
				})
				
				request.on('end', () => {
					var body = qs.parse(requestBody)
				  	if (request.url == '/transaction') {
				  		var jTransaction = JSON.parse(body.transaction)
				  		var transaction = new Transaction(jTransaction.inputs, jTransaction.outputs, jTransaction.date)
				  			
				  		if (transaction.isValid(self.blockchain)) {
				  			if (!self.blockchain.unconfirmedTransactions.has(transaction.transactionId)) {
					  			console.log("Peer " + self.port + ": Received valid unconfirmed transaction " + transaction.transactionId)
					  			self.blockchain.unconfirmedTransactions.set(transaction.transactionId, transaction)
					  			self.broadcastTransaction(transaction)
				  			}
				  		} else {
				  			//get the new blocks before checking validity again
				  			self.getBlocks( () => {
				  				if (transaction.isValid(self.blockchain)) {
						  			if (!self.blockchain.unconfirmedTransactions.has(transaction.transactionId)) {
							  			console.log("Peer " + self.port + ": Received valid unconfirmed transaction " + transaction.transactionId)
							  			self.blockchain.unconfirmedTransactions.set(transaction.transactionId, transaction)
							  			self.broadcastTransaction(transaction)
						  			}
						  		} else {
						  			console.log("Peer " + self.port + ": Received invalid unconfirmed transaction " + transaction.transactionId)
						  			//we delete it in case we already had it
						  			self.blockchain.unconfirmedTransactions.delete(transaction.transactionId)
						  		}
				  			})					  		
				  		}				  		
                    } else if (request.url == '/block') {
						var jBlock = JSON.parse(body.block)
						var block = new Block(jBlock.header.previousBlockHeaderHash, jBlock.transactions, jBlock.header.time, jBlock.header.nonce, jBlock.header.difficulty, jBlock.header.merkelRootHash, jBlock.header.hash)
						
						if (block.isValid(self.blockchain)) {
																					
							if (!self.blockchain.has(block)) {
								var lastBlock = self.blockchain.getLastBlock()
								if (lastBlock == null) {
									if (block.header.previousBlockHeaderHash == "0") {									
			                            self.blockchain.add(block)
			                            console.log("Peer " + self.port + ": Genesis block accepted: " + block.header.hash + " (height=" + self.blockchain.height(block) + ")")
										//propagate the block
										self.broadcastBlock(block)
									} else {
										//console.log("Peer " + self.port + ": Block already here")
									}
								} else {
								
									if (!block.isOrphan(self.blockchain)) { //if (self.blockchain.blocksMap.has(block.header.previousBlockHeaderHash)){									
			                            self.blockchain.add(block)
			                            console.log("Peer " + self.port + ": Block accepted: " + block.header.hash + " (height=" + self.blockchain.height(block) + ")")
										//propagate the block if it was not deleted as stale
										if (self.blockchain.blocksMap.has(block.header.hash)){
											self.broadcastBlock(block)											
										}
									} else {
										console.log("Peer " + self.port + ": Block " + block.header.hash + " is an orphan(not following the last one). Updating the blockchain")
											
										self.getBlocks(() => {
																							
											if (block.isValid(self.blockchain)) {
													
												if (!self.blockchain.has(block)) {
													var lastBlock = self.blockchain.getLastBlock()
													if (self.blockchain.blocksMap.has(block.header.previousBlockHeaderHash)){
														console.log("Peer " + self.port + ": Block accepted: " + block.header.hash + " (height=" + self.blockchain.height(block) + ")")
							                            self.blockchain.add(block)
							                            //propagate the block if it was not deleted as stale
														if (self.blockchain.blocksMap.has(block.header.hash)){
															self.broadcastBlock(block)
														}
													} else {
														//console.log("Peer " + self.port + " Could not get the missing blocks. Block rejected: " + block.header.hash)													
													}
						                        } else {
						                        	//console.log("Peer " + self.port + ": Block already here")
						                        }
													
											} else {
												//console.log("Peer " + self.port + ": Invalid block rejected: " + block.header.hash)
											}
										})
									}
								}
	                        } else {
	                        	//console.log("Peer " + self.port + ": Block already here")
	                        }
							
						} else {
							//console.log("Peer " + self.port + ": Invalid block rejected: " + block.header.hash)
						}
                   	}
					response.end()
				})
			}				    	
	    }
	    
	    this.server = http.createServer(this.requestHandler)
	    
	    this.server.listen(port, (err) => {
	    	if (err) {
	    	    return console.log('error', err)
	    	}	        	
	    })	 
	    
	}
}

module.exports = Peer
