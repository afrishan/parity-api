const express = require('express')
const { Wallet } = require("ethers");
const { Client } = require("@xmtp/xmtp-js");
const qrcode = require('qrcode');

const app = express();
const port = 3000;

let wallet= null;
let xmtp;
//Fabri wallet
//Message this XMTP message bot to get an immediate automated reply:
//gm.xmtp.eth (0x937C0d4a6294cdfa575de17382c7076b579DC176) env:production
const WALLET_TO = "0x93e2fc3e99dfb1238eb9e0ef2580efc5809c7204";
let conversation;

//Initialize the wallet
async function initialize_the_wallet() {
  // You'll want to replace this with a wallet from your application
  wallet = Wallet.createRandom();
  console.log(`Wallet address: ${wallet.address}`);
  return wallet;
}

// Create a client
async function create_a_client() {
  if (!wallet) {
    console.log("Wallet is not initialized");
    return
  }

  xmtp = await Client.create(wallet, { env: "production" });
  console.log("Client created", xmtp.address);
}

//Check if an address is on the network
async function check_if_an_address_is_on_the_network() {
  if (xmtp) {
    const isOnDevNetwork = await xmtp.canMessage(WALLET_TO);
    console.log(`Can message: ${isOnDevNetwork}`);
  }
}

//Start a new conversation
async function start_a_new_conversation() {
  if (xmtp) {
    conversation = await xmtp.conversations.newConversation(WALLET_TO);
    console.log(`Conversation created with ${conversation.peerAddress}`);
  }
}

//Send a message
async function send_a_message() {
  if (conversation) {
    const message = await conversation.send("gm");
    console.log(`Message sent: "${message.content}"`);
    return message;
  }
}

async function printQrCode() {
  return new Promise((resolve, reject) => {
    qrcode.toDataURL(`https://go.cb-w.com/messaging?address=${wallet?.address}`, (err, url) => {
      if (err) reject(err);
      else resolve(url);
    });
  });
}

app.post('/send-message', async (req, res) => {
  try {
    await initialize_the_wallet();
    await create_a_client();
    await check_if_an_address_is_on_the_network();
    await start_a_new_conversation();
    await send_a_message();

    return res.json({ success: true, qrCode: (await printQrCode()) });
  } catch (e) {
    console.log(e)
    return res.json({ success: false, error: JSON.stringify(e) });
  }
});

app.listen(port, () => {
    console.log(`Parity API listening on port ${port}`)
});
