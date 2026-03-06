import axios from 'axios';
import crypto from 'crypto';
const ACCESS_TOKEN = "_dP8O_d0V2jW-imybWKh71sbO0lMSn82";
const APP_ID = "4913475888";
async function test() {
    console.log("Testing V3...");
    try {
        const submitRes = await axios.post('https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit', {
            user: { uid: 'everstory_user' },
            audio: { format: 'wav', data: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" },
            request: { model_name: 'bigmodel' }
        }, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Api-App-Key': APP_ID,
                'X-Api-Resource-Id': 'volc.bigasr.auc',
                'X-Api-Request-Id': crypto.randomUUID()
            },
        });
        console.log("V3 Success:", submitRes.data);
    } catch (err) { console.log(err.response?.data); }
}
test();
