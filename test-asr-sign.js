import crypto from 'crypto';
import axios from 'axios';

// User credentials map exactly to AK and SK for V4 signing
const ACCESS_KEY = "_dP8O_d0V2jW-imybWKh71sbO0lMSn82";
const SECRET_KEY = "Smn1LgfRocO-fojdMoo1L7kVnP8flGBB";
const APP_ID = "4913475888";

const REGION = "cn-north-1";
const SERVICE = "volc_bigasr";
const HOST = "openspeech.bytedance.com";
const PATH = "/api/v3/auc/bigmodel/submit";

function hashSHA256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function hmacSHA256(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest();
}

async function testSignedSubmit() {
    const method = 'POST';
    const requestDate = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStr = requestDate.substring(0, 8);

    // User JSON payload exactly as provided
    const bodyObj = {
        user: { uid: 'everstory_user' },
        audio: {
            format: 'wav',
            data: Buffer.from('RIFF$   WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00', 'binary').toString('base64')
        },
        request: {
            model_name: 'bigmodel'
        }
    };
    const bodyStr = JSON.stringify(bodyObj);
    const bodyHash = hashSHA256(bodyStr);

    // Auth logic based on Bytedance V4 signature standard
    const credentialScope = `${dateStr}/${REGION}/${SERVICE}/request`;
    const signedHeaders = "content-type;host;x-date";
    const canonicalRequest = `${method}\n${PATH}\n\ncontent-type:application/json\nhost:${HOST}\nx-date:${requestDate}\n\n${signedHeaders}\n${bodyHash}`;

    const hashedCanonicalRequest = hashSHA256(canonicalRequest);
    const stringToSign = `HMAC-SHA256\n${requestDate}\n${credentialScope}\n${hashedCanonicalRequest}`;

    const kDate = hmacSHA256(Buffer.from(SECRET_KEY, 'utf-8'), dateStr);
    const kRegion = hmacSHA256(kDate, REGION);
    const kService = hmacSHA256(kRegion, SERVICE);
    const kSigning = hmacSHA256(kService, 'request');
    const signature = hmacSHA256(kSigning, stringToSign).toString('hex');

    const authorization = `HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    try {
        console.log("Submitting with auth:", authorization);
        const res = await axios.post(
            `https://${HOST}${PATH}`,
            bodyStr,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Host': HOST,
                    'X-Date': requestDate,
                    'Authorization': authorization,
                    'X-Api-App-Key': APP_ID,
                    'X-Api-Resource-Id': 'volc.seedasr.auc',
                    'X-Api-Connect-Id': crypto.randomUUID(),
                    'X-Api-Request-Id': crypto.randomUUID(),
                }
            }
        );
        console.log("Success:", res.data);
    } catch (e) {
        console.log("Submit Error Status:", e.response?.status);
        console.log("Submit Error:", e.response?.data || e.message);
    }
}

testSignedSubmit();
