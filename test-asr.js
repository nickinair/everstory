import axios from 'axios';
import crypto from 'crypto';

const VOLC_ASR_APP_ID = "4913475888";
const VOLC_ASR_ACCESS_TOKEN = "_dP8O_d0V2jW-imybWKh71sbO0lMSn82";
const url = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash';

async function testASR() {
    try {
        const res = await axios.post(
            url,
            {
                user: { uid: 'everstory_user' },
                audio: {
                    format: 'wav',
                    data: Buffer.from('RIFF$   WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00', 'binary').toString('base64')
                },
                request: {
                    model_name: 'built-in-model'
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-App-Key': VOLC_ASR_APP_ID,
                    'X-Api-Access-Key': VOLC_ASR_ACCESS_TOKEN,
                    'X-Api-Resource-Id': 'volc.bigasr.auc',
                    'X-Api-Connect-Id': crypto.randomUUID(),
                    'X-Api-Request-Id': crypto.randomUUID(),
                    'X-Api-Sequence': -1
                }
            }
        );
        console.log("Success:", res.data);
    } catch (error) {
        console.log("Error status:", error.response?.status);
        console.log("Error headers:", error.response?.headers);
        console.log("Error data:", error.response?.data || error.message);
    }
}

testASR();
