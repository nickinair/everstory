import axios from 'axios';

const VOLC_ASR_APP_ID = "4913475888";
const VOLC_ASR_ACCESS_TOKEN = "_dP8O_d0V2jW-imybWKh71sbO0lMSn82";
const submitUrl = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit';

async function testASRStandard() {
    try {
        const res = await axios.post(
            submitUrl,
            {
                user: { uid: 'everstory_user' },
                audio: {
                    format: 'wav',
                    data: Buffer.from('RIFF$   WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00', 'binary').toString('base64')
                },
                request: {
                    model_name: 'bigmodel'
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VOLC_ASR_ACCESS_TOKEN}`,
                }
            });
        console.log("Submit Success:", res.data);
    } catch (error) {
        console.log("Submit Error Status:", error.response?.status);
        console.log("Submit Error:", error.response?.data || error.message);
    }
}

testASRStandard();
