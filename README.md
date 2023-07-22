# Parity API

Parity API is an interface to interact with the XMTP network for EVM based wallets. It's designed to provide easy-to-use endpoints for various functionalities related to the XMTP network such as generating wallet addresses, starting conversations, sending messages, and more.

# Viewing QR Code
- https://www.site24x7.com/tools/datauri-to-image.html

## Installation

1. Clone the repository:
    ```bash
    git clone <repository_url>
    ```
2. Navigate to the project directory:
    ```bash
    cd parity-api
    ```
3. Install the dependencies:
    ```bash
    npm install
    ```
4. Start the server:
    ```bash
    npm start
    ```

## Usage

### Send Message
curl -X POST http://localhost:3000/send-message