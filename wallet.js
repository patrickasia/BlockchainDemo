const common = require('./common')
const crypto = require('crypto')
const http = require('http')
const keypair = require('keypair');
const PeersClient = require('./peersclient')
const qs = require('querystring')
const Transaction = require('./transaction')
const TransactionInput = require('./transactioninput')
const TransactionOutput = require('./transactionoutput')

class Wallet extends PeersClient{
	constructor(logName, addressToPay = "", port = null) {
		super(logName, null)
				
		var pair = keypair(); 
		this.privateKey=pair.private;
		this.publicKey=pair.public
		var hash = crypto.createHash('sha256');
		hash.update(this.publicKey)
		this.address = hash.digest('hex')
		
		var self = this
		
		console.log(logName + ": Address = " + this.address)
		
		
		//Wallet status server
		if (port != null) {
			this.requestHandler = (request, response) => {
				if(request.method == "GET") {
					if (request.url == '/') {
						var content = ""
						
						content += logName + "<br/>"
						content += "<br/>"
						content += "Address: " + this.address + "<br/>"
						content += "<br/>"
						content += "Balance: " + this.getBalance() + "<br/>"
						content += "<br/>"
						content += "<br/>"
						content += '<form method="POST">'
						content += 'Amount: <input type="text" name="amount" value="0" size="4"><br/>'
						content += 'Address: <input type="text" name="address" size="100"><br/>'
						content += '<input type="submit" value="Pay">'					  
						content += "</form>"  
						
						var body =	"<!DOCTYPE html>" +
									"<html>" +
									"<head>" +
									"<meta charset='UTF-8'>" +
									"<title>" + logName + "'s wallet</title>" +
									"</head>" +
									
									"<body>" +
									content +
									"</body>" +
									
									"</html>"
						response.end(body)
					}
				}  else if (request.method == "POST") {
					var requestBody = ''
					request.on('data', (data) => {
					    requestBody += data	
					})
						    
					request.on('error', () => {
						response.end()
					})
						
					request.on('end', () => {
						var body = qs.parse(requestBody)
						
						this.pay(body.address, body.amount)
						
						response.writeHead(302, {'Location': '/'});
						response.end();
							
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

		
		
		this.getBalance = () => {
			var amount = 0
			var utxos = this.getUnspentTransactionOutputs()
			utxos.forEach(utxo => {
				amount += parseFloat(utxo.output.amount)
			})		
			return amount
		}
		
		this.getUnspentTransactionOutputs = () => {
			var result = []
			this.blockchain.unspentTransactionOuputs.forEach( (outputIndexes, txId) => {

				if (this.blockchain.transactionId2BlockHash.has(txId) && this.blockchain.blocksMap.has(this.blockchain.transactionId2BlockHash.get(txId))) {//so that we don't crash on an invalid blockchain

					var block = this.blockchain.blocksMap.get(this.blockchain.transactionId2BlockHash.get(txId))
	
					if (this.blockchain.height(block) < this.blockchain.length() - this.blockchain.staleThreshold) {//take the blocks that can not become stale anymore 
						
						var transaction = this.blockchain.getTransactionFromId(txId)
	
						if (transaction !== false) {
							outputIndexes.forEach( (outputIndex) => {
								var output = transaction.outputs[outputIndex]
																
								if (output.pubkeyScript.includes(this.address)) {
									result.push({blockHash:block.hash, transactionId:txId, outputIndex:outputIndex, output:output})
									//console.log(logName + ": pushing " + output.amount + " in the utxos result")
								}
							})
						}				
					}
				}
			})
			return result
		}
		
		this.displayBalance = () => {
			var lastAmount = 0
			setInterval(() => {
				this.getBlocks( () => {				
					var amount = this.getBalance()
					if (amount != lastAmount) {
						console.log(logName + ": Balance = " + amount)
						lastAmount = amount
					}
				})
			},1000)
		}
		
		this.pay = (address, amount) => {
			if (this.getBalance() >= amount) {
				//build transaction
				var utxos = this.getUnspentTransactionOutputs()
				
				var sum = 0
				var index = 0
				while (sum < amount) {
					sum += parseFloat(utxos[index].output.amount)
					index++
				}
				
				var inputs = []
				for (var i=0; i<index; i++) {
					var previousTransaction = this.blockchain.getTransactionFromId(utxos[i].transactionId)					
					var previousOutput = previousTransaction.outputs[utxos[i].outputIndex]
					var dataToSign = previousOutput.amount + previousOutput.pubkeyScript + utxos[i].transactionId + utxos[i].outputIndex  											
					var sign = crypto.createSign('sha256');
					sign.write(dataToSign);
					sign.end();
					var signature = sign.sign(this.privateKey, 'hex');
					var signatureScript = "var base64EncodedPublicKey=\"" + Buffer.from(this.publicKey, 'ascii').toString('base64') + "\"; var signature=\"" + signature + "\";"
					var input = new TransactionInput(utxos[i].transactionId, utxos[i].outputIndex, signatureScript)
					inputs.push(input)					
				}
				
				var outputs = []
				var output = new TransactionOutput(amount, common.getPubkeyScript(address))
				
				//I send 90% of the remaining to myself (it can be 0)
				//and so I give 10% of the remaining as transaction fee
				var remainingAmount = sum - amount				
				var outputBackToMe = new TransactionOutput(remainingAmount * 0.9, common.getPubkeyScript(this.address))
				console.log(logName + ": Paying " + amount + " + " + (remainingAmount * 0.9) + " back to me" )
				
				outputs.push(output)
				outputs.push(outputBackToMe)
				
				var transaction = new Transaction(inputs, outputs)
				this.broadcastTransaction(transaction)
			} else {
				console.log(logName + ": Attempt to overspend")
			}
		}	
		
		this.paid = false
		if (addressToPay != "") {
			setInterval( () => {
				if (!this.paid && this.getBalance() >= 10) {
					this.paid = true
					this.pay(addressToPay, 4)
				}
			},2000)
		}
		
		this.displayBalance()
	}
}

module.exports = Wallet
