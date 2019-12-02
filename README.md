# BlockchainDemo
A blockchain demo for Node.js, with a set of peers, miners and wallets. 

## Prerequisites

* [Node.js](https://nodejs.org)

## Installing

In the root directory:

```
npm install
```
## Example

The commands can be started as background processes in the same console, or in different consoles 

### start a network of 10 peers, 2 wallets (Alice and Bob), and the genesis miner

Each peer send its address and port to, and get its peers from, a "dynamic dns server" 

The network is randomly generated so there can be some isolated peers that won't participate to the network

```
node startnetwork
```
Wait for the genesis miner to mine and broadcast the genesis block to the network of peers... (the mining's difficulty is set by this.difficulty in peersclient.js)

...Go to Alice's wallet web page: [http://localhost:4001/](http://localhost:4001/) and copy her address to the clipboard to be able to paste it in the next command

(The status of peer 1's blockchain can be seen at [http://localhost:13001/](http://localhost:13001/) ...)

### start Miner1

```
node startminer Miner1 <Alice's wallet address>
```
When Miner1's balance is more than 10 she will send 4 coins to Alice (coded in wallet.js)

### start Miner2

```
node startminer Miner2
```
You can check Alice's balance at [http://localhost:4001/](http://localhost:4001/) and Bob's balance at [http://localhost:4002/](http://localhost:4002/)

Once Alice got her 4 coins from Miner1, she can send coins to Bob from her web page

And you can see how the network reacts with the logs...

## Author

Patrick

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Logs Example

![BlockchainDemo Logs Example](https://patrickasia.github.io/BlockchainDemo/img/logs.png)

