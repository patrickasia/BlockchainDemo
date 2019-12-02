const Block = require('./block')
const Blockchain = require('./blockchain')
const common = require('./common')
const DynamicDNS = require('./dynamicdns')
const http = require('http')
const request = require('request')
const Transaction = require('./transaction')

class PeersClient {
	constructor(logName, port) {
		var self = this
		this.dns = new DynamicDNS()
		this.blockchain = new Blockchain(logName)		
		
		this.difficulty = 6
		
		
		//Blockchain status server
		if (port != null) {
			this.requestHandler = (request, response) => {
				if(request.method == "GET") {
					if (request.url == '/') {
						var content = ""
						
						content += "Unconfirmed Transactions:<br/>"
						self.blockchain.unconfirmedTransactions.forEach( (ut) => {
							content += "&nbsp;&nbsp;" + ut.transactionId + "<br/>"
						})
						
						content += "<br/>"
						content += "Blocks:<br/>"
						for (var b = self.blockchain.blocks.length-1; b>=0; b--) {
							var hash = self.blockchain.blocks[b].header.hash
							var block = self.blockchain.blocksMap.get(hash)
							
							content += block.header.hash + ", previousHash=" + block.header.previousBlockHeaderHash + ", height=" + self.blockchain.height(block) + "<br/>"
							
							for (var t=0; t<block.transactions.length; t++) {
								var transaction = block.transactions[t]
								content += "&nbsp;&nbsp;Transaction" + t + ": txid=" + transaction.transactionId + "<br/>"
								
								for (var i=0; i<transaction.inputs.length; i++) {
									var input = transaction.inputs[i]
									content += "&nbsp;&nbsp;&nbsp;&nbsp;Input" + i + ": txid=" + input.outputToSpendTXID +", index=" + input.outputIndex + "<br/>"
								}

								for (var o=0; o<transaction.outputs.length; o++) {
									var output = transaction.outputs[o]
									content += "&nbsp;&nbsp;&nbsp;&nbsp;Output" + o + ": amount=" + output.amount + " => " + common.getAddress(output.pubkeyScript) + "<br/>"
								}

							}
							
							content += "<br/>"
						}
						var body =	"<!DOCTYPE html>" +
									"<html>" +
									"<head>" +
									"<meta charset='UTF-8'>" +
									"<title>Blockchain</title>" +
									"</head>" +
									
									"<body>" +
									content +
									"</body>" +
									
									"</html>"
						response.end(body)
					}
				}
			}
			this.server = http.createServer(this.requestHandler)
		    this.server.listen(port, (err) => {
		    	if (err) {
		    	    return console.log('error', err)
		    	}	    		    	
		    })
		}
	    
		
		self.peers = []			
		function getPeers() {
			self.dns.getPeers((peers) => {
				self.peers = peers				

				if (self.peers.length ==0) {
					setTimeout(getPeers,1000)
				} else {
					if (self.port != undefined) {//Peer
						//remove myself from the peers
					    for (var i=0; i<self.peers.length; i++) {
					    	if (self.peers[i].port == self.port) {
					    		self.peers.splice(i,1)
					    		break
					   	  	} 
					    }
					   	
						if (self.peers.length ==0) {
							setTimeout(getPeers,1000)
						} else { 
					    	console.log(logName + " got his peers: " + JSON.stringify(self.peers))
						}
					} else {//Wallet,
						console.log(logName + " got his peers: " + JSON.stringify(self.peers))
					}
				}
			})
		}
		
		setTimeout(getPeers,1000)//wait for the peers to be registered and get them

		this.postEndPoint = (address, port) => {
			self.dns.postEndPoint(address, port)
		}
		
		this.broadcastTransaction = (transaction) => {
			self.peers.forEach((peer, index)=>{
				setTimeout(() => {
					request.post('http://' + peer.address + ':' + peer.port + '/transaction', {
	                	form: {
	                		transaction:JSON.stringify(transaction)	
	                	},
	                	json: true
	                }, (err, response, body) => {
	                	//
	                })
				},(index+1)*1000)//simulate "network distance"
			})													
		}

		this.broadcastBlock = (block) => {
			self.peers.forEach((peer, index)=>{
				setTimeout(() => {
					request.post('http://' + peer.address + ':' + peer.port + '/block', {
	                	form: {
	                   		block:JSON.stringify(block)	
	                	},
	                	json: true
	                }, (err, response, body) => {
	                	//
	                })				
				},(index+1)*1000)//simulate "network distance"
			})				
		}
		
		this.getUnconfirmedTransactions = (handler) => {
			var finished = []
			self.peers.forEach((peer,index) => {
				finished[index] = false
				request('http://' + peer.address + ':' + peer.port + '/transactions', (error, response, body) => {
					if (error) {
						console.log(logName + ": Got an error trying to get the unconfirmed transactions from peer " + peer.port)
					} else {
						var utxs = JSON.parse(body)
						utxs.forEach((utx) => {
							//make it a transaction object
							var oTransaction = new Transaction(utx.inputs, utx.outputs, utx.date)
							
							if (!self.blockchain.unconfirmedTransactions.has(oTransaction.transactionId)) {
								console.log(logName + ": Got a new unconfirmed transaction from peer " + peer.port + ": " + oTransaction.transactionId)
								self.blockchain.unconfirmedTransactions.set(oTransaction.transactionId, oTransaction)
							}
						})
					}
					finished[index] = true
				})				
			})
			
			function checkFinished() {
				var result = true
				finished.forEach((f) => {
					if (!f) result = false
				})
				if (result) {
					handler()
				} else {
					setTimeout(checkFinished,1000)
				}
			}
			
			checkFinished()
		}
		
		this.getBlocks = (handler) => {
			var finished = []
			self.peers.forEach((peer,index) => {
				finished[index] = false
				request('http://' + peer.address + ':' + peer.port + '/blocks', (error, response, body) => {
					if (error) {
						console.log(logName + ": Got an error trying to get the blocks from peer " + peer.port)
					} else {
						var blocks = JSON.parse(body)
						blocks.forEach((jBlock) => {						
							if (!self.blockchain.has(jBlock)) {
								var block = new Block(jBlock.header.previousBlockHeaderHash, jBlock.transactions, jBlock.header.time, jBlock.header.nonce, jBlock.header.difficulty, jBlock.header.merkelRootHash, jBlock.header.hash)
								if (block.isValid(self.blockchain)) {
									self.blockchain.add(block)
								} else {
									console.log(logName + ": Got an invalid block from peer " + peer.port + ": " + block.header.hash)
								}
							}
						})
						
					}
					finished[index] = true
				})				
			})
			
			function checkFinished() {
				var result = true
				finished.forEach((f) => {
					if (!f) result = false
				})
				if (result) {
					handler()
				} else {
					setTimeout(checkFinished,1000)
				}
			}
			
			checkFinished()
		}
	}
}

module.exports = PeersClient
