const express = require('express');
const { Wallet } = require("ethers");
const { Client } = require("@xmtp/xmtp-js");
const qrcode = require('qrcode');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors')
const bodyParser = require('body-parser')
const {
  SismoConnect,
  AuthType,
  SismoConnectVerifiedResult,
  ClaimType,
  SismoConnectConfig,
  SignatureRequest,
  AuthRequest,
  ClaimRequest,
  SismoConnectResponse
} = require("@sismo-core/sismo-connect-server"); 

const app = express();
const port = 3000;
const wsPort = 3001; // Port for WebSocket server

let wallet = null;
let xmtp;
let conversation;

//Fabri wallet
//Message this XMTP message bot to get an immediate automated reply:
//gm.xmtp.eth (0x937C0d4a6294cdfa575de17382c7076b579DC176) env:production
const WALLET_TO = "0x93e2fc3e99dfb1238eb9e0ef2580efc5809c7204";

//  WebSocket server setup
const wss = new WebSocket.Server({ port: wsPort });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json())
app.use(cors())
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json({ type: 'application/*+json' }))

// Function to send a structured response to the client
function sendResponse(res, success, data = null, error = null) {
  res.json({
    success,
    data,
    error,
  });
}

let conversationStarted = false; // Flag to track if the conversation has been started

// Function to start the conversation
async function startConversation() {
  await initialize_the_wallet();
  await create_a_client();
  await check_if_an_address_is_on_the_network();
  await start_a_new_conversation();

  conversationStarted = true; // Set the flag to true once the conversation is started
}

wss.on('connection', (ws) => {
  // Send the wallet address when the WebSocket connection is established
  if (wallet) {
    ws.send(JSON.stringify({ success: true, data: { type: 'walletAddress', address: wallet.address } }));
  }

  ws.on('message', async (message) => {
    const content = message.toString();
    if (content === 'gm') {
      if (conversationStarted) {
        try {
          const sentMessage = await send_a_message();
          ws.send(JSON.stringify({ success: true, data: { type: 'messageSent', content: sentMessage.content } }));
        } catch (error) {
          console.error('Error sending message:', error);
          ws.send(JSON.stringify({ success: false, error: { type: 'messageError', error: JSON.stringify(error) } }));
        }
      } else {
        ws.send(JSON.stringify({ success: false, error: { type: 'messageError', error: 'Conversation not started' } }));
      }
    } else {
      ws.send(JSON.stringify({ success: false, error: { type: 'messageError', error: 'Unknown command' } }));
    }
  });
});

const config = {
  appId: "0xd7689d36e3813e9f11f8c3ddcc695737",
  vault: {
    impersonate: ["chaaam.eth", "twitter:iamchaam", "github:jflo"],
  },
}
const sismoConnect = SismoConnect({ config });

app.post('/verify-sismo-connect', async (req, res) => {
  try {
    console.log(req.body)
  
    const result = await sismoConnect.verify(
          req.body.sismo, // copied from the previous step or received from API call
          {
            auths: [{ authType: AuthType.VAULT }, { authType: AuthType.TWITTER }],
            claims: [{ groupId: "0xe9caa36df5e8c24f195cc7a9c475de08" }],
            signature: {message: "I confirm to work for this company", isSelectableByUser: true},
          }
        );
    
    console.log(result.getUserIds(AuthType.VAULT));
    // vault anonymous identifier = hash(vaultSecret, AppId)
    // ['0x225c5b67c39778b40ef2528707c9fbdfed96f31b9a50826b95c2ac40e15e4c6b']
    console.log(result.getUserIds(AuthType.GITHUB));
    // [ '35774097' ] GitHub id of @dhadrien
    console.log(result.getUserIds(AuthType.TWITTER));
    // [ '2390703980' ] Twitter id of @dhadrien_
    console.log(result.getUserIds(AuthType.EVM_ACCOUNT));
    // [
    //   '0x8ab1760889f26cbbf33a75fd2cf1696bfccdc9e6', // dhadrien.sismo.eth
    //   '0xa4c94a6091545e40fc9c3e0982aec8942e282f38' // requested wallet auth
    // ]
    console.log(result.getUserIds(AuthType.TELEGRAM));
    return sendResponse(res, true, { });
  } catch (e) {
    console.log(e);
    return sendResponse(res, false, null, JSON.stringify(e));
  }
});

app.post('/start-conversation', async (req, res) => {
  try {
    await startConversation();
    sendResponse(res, true, { qrCode: await printQrCode() });
  } catch (e) {
    console.log(e);
    sendResponse(res, false, null, JSON.stringify(e));
  }
});

app.get('/polygon-id-ld-json', async (req, res) => {
  try {
    sendResponse(res, true, {
      "@context": [
        {
          "@protected": true,
          "@version": 1.1,
          "id": "@id",
          "type": "@type",
          "Accessibility": {
            "@context": {
              "@propagate": true,
              "@protected": true,
              "polygon-vocab": "urn:uuid:1efff815-fdb9-4733-9078-9f247c8c88e8#",
              "xsd": "http://www.w3.org/2001/XMLSchema#",
              "UID": {
                "@id": "polygon-vocab:UID",
                "@type": "xsd:string"
              }
            },
            "@id": "urn:uuid:f0db490f-26e1-46e1-87d0-901bac1164e2"
          }
        }
      ]
    });
  } catch (e) {
    console.log(e);
    sendResponse(res, false, null, JSON.stringify(e));
  }
});

app.get('/polygon-id-json', async (req, res) => {
  try {
    sendResponse(res, true, {
      "$metadata": {
        "type": "Accessibility",
        "uris": {
          "jsonLdContext": "ipfs://QmcvSh2Qpqh917NtosTJw4PCJJ5zEBeMmvhhShrcjFrPTa"
        },
        "version": "2"
      },
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "description": "Credential that allows users to sign into Parity dApp via PolygonID Wallet",
      "title": "ParityID",
      "properties": {
        "@context": {
          "type": [
            "string",
            "array",
            "object"
          ]
        },
        "expirationDate": {
          "format": "date-time",
          "type": "string"
        },
        "id": {
          "type": "string"
        },
        "issuanceDate": {
          "format": "date-time",
          "type": "string"
        },
        "issuer": {
          "type": [
            "string",
            "object"
          ],
          "format": "uri",
          "properties": {
            "id": {
              "format": "uri",
              "type": "string"
            }
          },
          "required": [
            "id"
          ]
        },
        "type": {
          "type": [
            "string",
            "array"
          ],
          "items": {
            "type": "string"
          }
        },
        "credentialSubject": {
          "description": "Stores the data of the credential",
          "title": "Credential subject",
          "properties": {
            "UID": {
              "description": "ID used to sign into Parity dApp via PolygonID Wallet",
              "title": "SigninIdentifier",
              "type": "string"
            },
            "id": {
              "description": "Stores the DID of the subject that owns the credential",
              "title": "Credential subject ID",
              "format": "uri",
              "type": "string"
            }
          },
          "required": [],
          "type": "object"
        },
        "credentialSchema": {
          "properties": {
            "id": {
              "format": "uri",
              "type": "string"
            },
            "type": {
              "type": "string"
            }
          },
          "required": [
            "id",
            "type"
          ],
          "type": "object"
        }
      },
      "required": [
        "@context",
        "id",
        "issuanceDate",
        "issuer",
        "type",
        "credentialSubject",
        "credentialSchema"
      ],
      "type": "object"
    });
  } catch (e) {
    console.log(e);
    sendResponse(res, false, null, JSON.stringify(e));
  }
});




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


app.listen(port, () => {
  console.log(`Parity API listening on port ${port}`);
});
