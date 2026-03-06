import axios from 'axios';

async function test() {
    try {
        const res = await axios.post('http://127.0.0.1:3005/api/ai/process', {
            action: 'transcribe',
            payload: {
                // Short valid WAV header
                base64Data: "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
                mimeType: "audio/wav"
            }
        });
        console.log("Result:", res.data);
    } catch (err) {
        console.log("Caught Error status:", err.response?.status);
        console.log("Caught Error data:", JSON.stringify(err.response?.data, null, 2));
    }
}
test();
