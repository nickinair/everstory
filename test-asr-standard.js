import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import { stat } from 'fs/promises';
import wavefile from 'wavefile'; // 用于解析WAV时长，需安装：npm install wavefile

// 火山引擎配置
const VOLC_CONFIG = {
    // We update this script to completely rely on the V3 BigModel API configs as per your new dashboard.
    // Replace with environment variables eventually if needed.
    API_KEY: "b2b0f9e5-657d-441d-9a73-7907d470cda4",
    RESOURCE_ID_FLASH: "volc.bigasr.auc_turbo", // 极速版 (短音频) resource
    RESOURCE_ID_SUBMIT: "volc.seedasr.auc",     // 标准版 (长音频提交) resource

    // 极速接口（短音频）
    FLASH_API: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash',
    // 异步接口（长音频）
    ASYNC_SUBMIT_API: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit',
    ASYNC_QUERY_API: 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/query',
    // 时长阈值（5分钟=300秒）
    LONG_AUDIO_THRESHOLD: 300
};

/**
 * 工具函数：获取音频文件时长（仅支持WAV/MP3/MP4）
 * @param filePath 音频/视频文件路径
 * @returns 时长（秒）
 */
async function getAudioDuration(filePath) {
    try {
        // 简易判断：WAV文件解析头部获取时长
        if (filePath.endsWith('.wav')) {
            const buffer = fs.readFileSync(filePath);
            const wav = new wavefile.WaveFile(buffer);
            return wav.getDuration();
        }
        // 其他格式（MP3/MP4）：推荐用ffprobe（需安装ffmpeg）
        // 这里先返回一个兜底值，生产环境建议替换为ffprobe
        const fileStats = await stat(filePath);
        const fileSizeMB = fileStats.size / (1024 * 1024);
        // 经验值：1MB WAV≈1分钟，1MB MP3≈4分钟
        return filePath.endsWith('.mp3') ? fileSizeMB * 4 : fileSizeMB * 1;
    } catch (error) {
        console.warn("获取时长失败，默认按长音频处理：", error.message);
        return VOLC_CONFIG.LONG_AUDIO_THRESHOLD + 1; // 兜底为长音频
    }
}

/**
 * 同步识别短音频
 * @param filePath 音频文件路径
 * @param format 音频格式（wav/mp3/mp4）
 */
async function syncRecognize(filePath, format) {
    const audioBuffer = fs.readFileSync(filePath);
    const base64Audio = audioBuffer.toString('base64');

    const payload = {
        user: { uid: `user_${Date.now()}` },
        audio: {
            data: base64Audio,
            format: format,
        },
        request: {
            model_name: "bigmodel",
            enable_itn: true
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': VOLC_CONFIG.API_KEY,
        'X-Api-Resource-Id': VOLC_CONFIG.RESOURCE_ID_FLASH,
        'X-Api-Request-Id': crypto.randomUUID(),
        'X-Api-Sequence': '-1'
    };

    const res = await axios.post(VOLC_CONFIG.FLASH_API, payload, { headers });

    // Status codes >= 40000000 generally mean failure in this Bytedance API style, but checking empty body or x-api header might be needed.
    // However, successful results populate "result" and "text".
    if (res.data && res.data.result) {
        return res.data.result;
    }

    // Attempt to extract Bytedance API header error if present.
    const statusCode = res.headers['x-api-status-code'];
    const msg = res.headers['x-api-message'];

    if (statusCode && !statusCode.startsWith('2')) {
        throw new Error(`同步极速识别失败：[${statusCode}] ${msg}`);
    }

    if (!res.data.result) {
        throw new Error(`同步极速识别失败，无返回文本。Response: ${JSON.stringify(res.data)}`);
    }

    return res.data.result;
}

/**
 * 异步识别长音频（提交+轮询）
 * @param filePath 音频文件路径
 * @param format 音频格式（wav/mp3/mp4）
 */
async function asyncRecognize(filePath, format) {
    // 1. 提交任务
    const audioBuffer = fs.readFileSync(filePath);
    const base64Audio = audioBuffer.toString('base64');

    const payload = {
        user: { uid: `user_${Date.now()}` },
        audio: {
            data: base64Audio,
            format: format,
        },
        request: {
            model_name: "bigmodel",
            enable_itn: true
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'X-Api-Key': VOLC_CONFIG.API_KEY,
        'X-Api-Resource-Id': VOLC_CONFIG.RESOURCE_ID_SUBMIT, // Standard Edition Resource
        'X-Api-Request-Id': crypto.randomUUID(),
        'X-Api-Sequence': '-1'
    };

    const submitRes = await axios.post(VOLC_CONFIG.ASYNC_SUBMIT_API, payload, { headers });

    // Handle initial submission error
    if (!submitRes.data.resp) {
        const statusCode = submitRes.headers['x-api-status-code'];
        const msg = submitRes.headers['x-api-message'];
        if (statusCode && !statusCode.startsWith('2')) {
            throw new Error(`提交长音频任务失败：[${statusCode}] ${msg}`);
        }
        throw new Error(`提交任务无返回值`);
    }

    const taskId = submitRes.data.resp.task_id;
    console.log(`✅ 长音频任务提交成功，ID：${taskId}`);

    // 2. 轮询结果（最多轮询60次，每次间隔3秒）
    let retryCount = 0;
    const maxRetries = 60;
    while (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const queryHeaders = {
            'Content-Type': 'application/json',
            'X-Api-Key': VOLC_CONFIG.API_KEY,
            'X-Api-Resource-Id': VOLC_CONFIG.RESOURCE_ID_SUBMIT,
            'X-Api-Request-Id': crypto.randomUUID(),
            'X-Api-Sequence': '-1'
        };

        const queryRes = await axios.post(
            VOLC_CONFIG.ASYNC_QUERY_API,
            { task_id: taskId },
            { headers: queryHeaders }
        );

        const { task_status, result, error_msg } = queryRes.data.resp || {};
        const state = task_status || queryRes.data.status;

        if (state === 'success') return result;
        if (state === 'failed' || state === 'error') throw new Error(`识别失败：${error_msg}`);

        console.log(`⏳ 任务处理中（${retryCount + 1}/${maxRetries}），状态：${status}`);
        retryCount++;
    }

    throw new Error("❌ 长音频识别超时（180秒），请稍后重试");
}

/**
 * 统一ASR入口：自动适配长短音频
 * @param filePath 音频/视频文件路径
 * @returns 识别结果文本
 */
export async function autoASR(filePath) {
    try {
        // 1. 校验文件是否存在
        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在：${filePath}`);
        }

        // 2. 获取文件格式和时长
        const format = filePath.split('.').pop() || 'wav';
        const duration = await getAudioDuration(filePath);
        console.log(`📄 文件信息：格式=${format}，时长=${(duration / 60).toFixed(1)}分钟`);

        // 3. 自动选择接口
        let result;
        if (duration <= VOLC_CONFIG.LONG_AUDIO_THRESHOLD) {
            console.log("🔹 检测到短音频，使用同步接口");
            result = await syncRecognize(filePath, format);
        } else {
            console.log("🔹 检测到长音频，使用异步接口");
            result = await asyncRecognize(filePath, format);
        }

        // 4. 提取最终文本
        const finalText = result?.text || result?.sentences?.map((s) => s.text).join('') || '';
        console.log(`✅ 识别完成，文本长度：${finalText.length}字`);
        return finalText;

    } catch (error) {
        console.error("❌ ASR识别失败：", error.message);
        throw error;
    }
}

// ============== 测试使用 ==============
// autoASR('./short-audio.wav'); // 短音频（同步）
// autoASR('./long-audio.mp4');  // 长音频（异步）