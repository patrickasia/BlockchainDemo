const http = require('http')
const qs = require('querystring')
const request = require('request')

class DynamicDNS {
	constructor() {
		var self = this
		this.port = 9999
		this.nodes = []
		
		this.startServer = () => {
			this.requestHandler = (request, response) => {
				if(request.method === "GET") {
					var result = []
					if (self.nodes.length > 0) {
						for (var i=0; i<3; i++) {
							var index = Math.floor(Math.random() * self.nodes.length)  
							if (index<self.nodes.length && !result.includes(self.nodes[index]) && self.nodes[index].address != undefined) {
								result.push(self.nodes[index])
							}
						}
					}
					response.end(JSON.stringify(result))
				} else if(request.method === "POST") {
					var requestBody = ''
				    request.on('data', function(data) {
				    	requestBody += data	
				    })
				    
				    request.on('end', function() {
				        var body = qs.parse(requestBody)
				        self.nodes.push({address:body.address,port:body.port})
				        response.end()
				    })
				}
		    }
		    
		    this.server = http.createServer(this.requestHandler)
		    
		    this.server.listen(this.port, (err) => {
		    	if (err) {
		    	    return console.log('error', err)
		    	}
		
		    	console.log(`DNS server started, listening on port ${this.port}`)
		    })
		}
		
		this.postEndPoint = (address,port) => {
	    	request.post('http://localhost:9999', {
	    		form: {
	    			address:"localhost",
	    			port:port
	    		},
	    		json: true
	    	})
	    }
		
		this.getPeers = (handler) => {
			var peers = []
			request('http://localhost:9999', (error, response, body) => {
				peers = JSON.parse(body)
				handler(peers)
			})						
		}
  	}
}

module.exports = DynamicDNS
