/**
 * MIT License
 * Copyright (c) 2018 Patrick (p@trick.asia)
 * https://github.com/patrickasia/BlockchainDemo/blob/master/LICENSE
 */

module.exports = {
		getPubkeyScript: (address) => {
			return 	"var address = '" + address + "';"	 +								
					"var publicKey = Buffer.from(base64EncodedPublicKey, 'base64').toString('ascii');" +
					"var result;" +
				  	"const hash = crypto.createHash('sha256');" +
				  	"const verify = crypto.createVerify('sha256');" +
				  	"hash.update(publicKey);" +
				  	"if (hash.digest('hex') != address) {" +
				  	"	result = false;" +
					"	console.log(\"Coinbase Transaction: wrong address\");" +
				  	"} else {" +
				  	"	verify.write(data);" +
				  	"	verify.end();" +
				  	"	result = verify.verify(publicKey, signature, 'hex');" +
					"	if (!result) console.log(\"Coinbase Transaction: wrong signature\");" +
				  	"}" +
					"return result;"
		},
		
		getAddress: (pubkeyScript) => {//just to display!
			var commaPos = pubkeyScript.indexOf(";")
			var address = pubkeyScript.substring(15,commaPos-1)
			if (address.length > 10) {
				return address
			} else {
				return ""
			}
		}
}