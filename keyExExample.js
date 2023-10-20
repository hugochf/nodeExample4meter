// An example of complete key exchange process with IIL Sub Meter over MQTT 
const crypto = require('crypto');
const mqtt = require('mqtt');

// MQTT Subscription Parameter ////////////////////////////////////////////
const brokerUrl = 'mqtt://34.96.156.219:1883'; // IIL MQTT address
const meterList = ['J200002335']; // Meter ID list // Keep one meter ID for demonstration
const topics = meterList.map((meterId) => meterId + 'C2S'); // Product incoming message MQTT topic for each meter.

// Define the key and IV (Gobal)
const defaultKey = '69aF7&3KY0_kk89@'; // Default key, initial key for new meters
const iv = '420#abA%,ZfE79@M'; // Vector
const dataKey = '000000' + meterList[0]; // Key to be stored in the DB
const masterKey = '000000' + meterList[0]; // Key to be stored in the DB
// Convert the key and IV to buffers
const ivBuffer = Buffer.from(iv, 'utf8');
let currentKey = defaultKey; // 

// Define Decryption function, refer to AES example
function msgDecrypt(encryptedMessageHex, key, iv) {
  // Create a decipher object with AES-128 CBC algorithm and 'NoPadding'
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  decipher.setAutoPadding(false); // Disable automatic padding //From Default PKCS7 set to NONE
  try {
    // Decrypt the message
    let decryptedMessageHex = decipher.update(encryptedMessageHex, null, 'hex'); // Specify 'null' for input encoding and 'hex' for output encoding
    decryptedMessageHex += decipher.final('hex');
    return decryptedMessageHex;
  } catch (error) {
      console.error('Decryption error:', error.message);
  }
}

// Define Encryption function, refer to AES example
function msgEncrypt(hexMessageBuffer, key, iv) {
  // Create an AES-128-CBC cipher object with the key and IV
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  cipher.setAutoPadding(false); // Disable automatic padding //From Default PKCS7 set to NONE
  try{
    // Encrypt the hex-encoded message
    let encryptedMessageHex = cipher.update(hexMessageBuffer, null, 'hex'); // Specify 'null' for input encoding and 'hex' for output encoding
    encryptedMessageHex += cipher.final('hex');
    return encryptedMessageHex;
  } catch (error) {
      console.error('Encryption error:', error.message);
  }
}

// MQTT start connection
const client = mqtt.connect(brokerUrl);
client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe(topics, (err) => {
    if (!err) {
      console.log(`Subscribed to topics: ${topics.join(', ')}`);
    }
  });
});

// When received message from MQTT topics
client.on('message', (topic, message) => {
  // Process the incoming data here
  console.log(`Received data from topic: ${topic}`);
  let buffer = Buffer.from(message, 'hex');
  const hexMessage = buffer.toString('hex'); // Convert to String for checking the message contents
  let cmd = ''; // Store the outgoing message to MQTT
  // console.log('Hex String: ' + hexMessage);
  if (hexMessage !== '50') { // Filter out keep alive message
    // Decrypt the incoming message
    const currentKeyBuffer = Buffer.from(currentKey, 'utf8'); // Convert updated key
    const decryptedMsg = msgDecrypt(buffer, currentKeyBuffer, ivBuffer).toString('hex');
    console.log('Decrypted Message: ', decryptedMsg);
    
    // Part I - Initial KeyEx
    // Ex. Respose to KeyEx C2S: 2a004a200002335f0000000000000000 -> S2C: 204a200002335f01203030303030304a3230303030323333353030303030304a32303030303233333500000000000000
    decryptedMsg.slice(0, 2) === '2a' && decryptedMsg.slice(16, 18) == '00' ?
      cmd = '204a' + topic.slice(1, 10) + 'f0120' + Buffer.from(masterKey, 'utf-8').toString('hex') + Buffer.from(dataKey, 'utf-8').toString('hex')+ '00000000000000':
        decryptedMsg.slice(0, 2) === '2a' && decryptedMsg.slice(16, 18) == '02' ?
          currentKey = dataKey: // Change the curretKey from default key to data key and continue the second part of the key exchange
            // Part II - Disconnect KeyEx
            // Ex. Respose to KeyEx C2S: 2a004a200002335f0100000000000000 -> S2C: 204a200002335f003030303030304a3230303030323333350000000000000000
            decryptedMsg.slice(0, 2) === '2a' && decryptedMsg.slice(16, 18) == '01' ?
              cmd = '204a' + topic.slice(1, 10) + 'f00' + Buffer.from(dataKey, 'utf-8').toString('hex') + '0000000000000000':
                // Ex. Confirm KeyEx C2S: 2a004a200002335f0200000000000000 -> S2C: 204a200002335f020000000000000000
                decryptedMsg.slice(0, 2) === '2a' && decryptedMsg.slice(16, 18) == '02' ?
                  cmd = '204a' + topic.slice(1, 10) + 'f02' + '0000000000000000': cmd = '';

    if (cmd !== '') { // Publish the encrypted commmand to MQTT if the cmd is not empty
      // Encrypt the cmd message
      buffer = Buffer.from(cmd, 'hex');
      const topicS2C = topic.slice(0, 10) + 'S2C'; //Extract the meter id from C2S topic and change to S2C topic
      client.publish(topicS2C, Buffer.from(msgEncrypt(buffer, currentKeyBuffer, ivBuffer), 'hex')); // Publish the cmd message to S2C topic
      console.log(`Published message to ${topicS2C}: ${cmd}`);
    }
  }
});

client.on('error', (error) => {
  console.error('MQTT error:', error);
});

client.on('close', () => {
  console.log('Disconnected from MQTT broker');
});