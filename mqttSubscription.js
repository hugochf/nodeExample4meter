// An example of subscripting MQTT meter downlink topic and perform payload decryption
const crypto = require('crypto');
const mqtt = require('mqtt');

// Define the key and IV (Gobal)
const key = '69aF7&3KY0_kk89@'; // Default key
const iv = '420#abA%,ZfE79@M'; // Vector
// Convert the key and IV to buffers
const keyBuffer = Buffer.from(key, 'utf8');
const ivBuffer = Buffer.from(iv, 'utf8');

// MQTT Subscription Parameter ////////////////////////////////////////////
const brokerUrl = 'mqtt://34.96.156.219:1883'; // IIL MQTT address
const meterList = ['J200002335', 'J220004619', 'J230008549', 'J230008542']; // Meter ID list
const topics = meterList.map((meterId) => meterId + 'C2S'); // Product incoming message MQTT topic for each meter.

// Define Decryption function
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
  // Update the data key for decryption
  const key = '000000'+topic.slice(0, 10); // fix key is used for Data Key
  const keyBuffer = Buffer.from(key, 'utf8');
  // Process the incoming data here
  console.log(`Received data from topic: ${topic}`);
  const buffer = Buffer.from(message, 'hex');
  const hexMessage = buffer.toString('hex');
  console.log('Hex String: ' + hexMessage);
  if (hexMessage !== '50') { // Filter out keep alive message
    // Decrypt the incoming message
    console.log('Decrypted Message: ', msgDecrypt(buffer, keyBuffer, ivBuffer));
  }
});

client.on('error', (error) => {
  console.error('MQTT error:', error);
});

client.on('close', () => {
  console.log('Disconnected from MQTT broker');
});