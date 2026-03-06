import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const ACCESS_TOKEN = "_dP8O_d0V2jW-imybWKh71sbO0lMSn82";
const APP_ID = "4913475888";
const SYNC_API = 'https://openspeech.bytedance.com/api/v1/recognize';
const ASYNC_SUBMIT_API = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit';

async function testV3() {
    const filePath = 'test.wav';
    fs.writeFileSync(filePath, Buffer.from("UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=", "base64"));
    
    // Test V3 with FormData
    try {
        const submitForm = new FormData();
        submitForm.append('appid', APP_ID);
        submitForm.append('language', 'zh-CN');
        submitForm.append('format', 'wav');
        submitForm.append('audio', fs.createReadStream(filePath));

        console.log("Testing V3 with FormData...");
        const submitRes = await axios.post(ASYNC_SUBMIT_API, submitForm, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                ...submitForm.getHeaders(),
            },
        });
        console.log("V3 Success:", submitRes.data);
    } catch(err) {
        console.log("V3 Error status:", err.response?.status);
        console.log("V3 Error data:", JSON.stringify(err.response?.data, null, 2));
    }

    // Test V1 with FormData
    try {
        const formData = new FormData();
        formData.append('appid', APP_ID);
        formData.append('language', 'zh-CN');
        formData.append('format', 'wav');
        formData.append('audio', fs.createReadStream(filePath));

        console.log("\nTesting V1 with FormData...");
        const res = await axios.post(SYNC_API, formData, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                ...formData.getHeaders(),
            },
        });
        console.log("V1 Success:", res.data);
    } catch(err) {
        console.log("V1 Error status:", err.response?.status);
        console.log("V1 Error data:", JSON.stringify(err.response?.data, null, 2));
    }
}
testV3();
