// A demonstration of AES128 CBC encryption and decryption for IIL meter communication
const crypto = require('crypto');

// Define the key and IV
const key = '69aF7&3KY0_kk89@'; //Default key
const iv = '420#abA%,ZfE79@M'; //Vector
// Convert the key and IV to buffers
const keyBuffer = Buffer.from(key, 'utf8');
const ivBuffer = Buffer.from(iv, 'utf8');

// Decryption function Example///////////////////////////////////////////////
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

// Encryption Example///////////////////////////////////////////////////////
function msgEncrypt(hexMessageBuffer, key, iv) {
  // Create an AES-128-CBC cipher object with the key and IV
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  cipher.setAutoPadding(false); // Disable automatic padding //From Default PKCS7 set to NONE
  try{
    // Encrypt the hex-encoded message
    let encryptedMessageHex2 = cipher.update(hexMessageBuffer, null, 'hex'); // Specify 'null' for input encoding and 'hex' for output encoding
    encryptedMessageHex2 += cipher.final('hex');
    return encryptedMessageHex2;
  } catch (error) {
      console.error('Encryption error:', error.message);
  }
}

// Demo of Message Decryption function ///////////////////////////////////
const sampleMessage = '6d5c9d8bb016c12afc8bbaf8dd5fe7e1' //A typical sub-meter key-ex request message
// Define the hex-encoded encrypted message as a buffer
const encryptedMessageHex = Buffer.from(sampleMessage, 'hex'); // Incomming hex-encoded message
console.log('Origin Message (Hex):', sampleMessage);
console.log('Decrypted Message (Hex):', msgDecrypt(encryptedMessageHex, keyBuffer, ivBuffer));
console.log('');
// Demo of Message Encryption function ///////////////////////////////////
// Hex-encoded message to be encrypted
const hexMessage = '2a004a239000362f0200000000000000'; // decrypted message from the first part result
// Convert the hex-encoded message to a buffer
const hexMessageBuffer = Buffer.from(hexMessage, 'hex');
// the result should be same as the encrypted message in the first part (sampleMessage)
console.log('Origin Message (Hex):', hexMessage);
console.log('Encrypted Message (Hex):', msgEncrypt(hexMessageBuffer, keyBuffer, ivBuffer)); 