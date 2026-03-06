import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  Video,
  Settings,
  ArrowLeft,
  ArrowRight,
  Play,
  Square,
  RefreshCw,
  Send,
  Check,
  X,
  Volume2,
  AlertCircle,
  Loader2,
  Pause,
  Circle
} from 'lucide-react';
import { Prompt } from '../types';
import { databaseService } from '../services/databaseService';
import { transcribeMedia } from '../services/aiService';

interface RecordingFlowProps {
  projectId: string;
  prompt: Prompt;
  prompts?: Prompt[];
  onSelectPrompt?: (prompt: Prompt) => void;
  onClose: () => void;
  onComplete: (storyData: any) => void;
  isQuickRecord?: boolean;
}

type RecordingStep =
  | 'welcome'
  | 'prompt'
  | 'mode'
  | 'test'
  | 'ready'
  | 'countdown'
  | 'recording'
  | 'review'
  | 'success'
  | 'summary';

export default function RecordingFlow({ projectId, prompt, prompts = [], onSelectPrompt, onClose, onComplete, isQuickRecord = false }: RecordingFlowProps) {
  const [step, setStep] = useState<RecordingStep>('welcome');
  const [isPromptSelectorOpen, setIsPromptSelectorOpen] = useState(false);
  const [mode, setMode] = useState<'audio' | 'video'>('video');
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [newStoryId, setNewStoryId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Media Recorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);

  // Audio Analysis Refs & State
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(4));

  // Callback refs to ensure stream is attached whenever the video element mounts
  const setVideoPreviewRef = React.useCallback((node: HTMLVideoElement | null) => {
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(e => {
        if (e.name !== 'AbortError') console.error("Error playing video preview:", e);
      });
    }
  }, [isStreamReady, step]);

  const setRecordingPreviewRef = React.useCallback((node: HTMLVideoElement | null) => {
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(e => {
        if (e.name !== 'AbortError') console.error("Error playing recording preview:", e);
      });
    }
  }, [isStreamReady, step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      resetRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startStream = async () => {
    // Stop any existing stream before starting a new one
    stopStream();

    try {
      const constraints = {
        video: mode === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsStreamReady(true);

      // Initialize Audio Analysis
      initAudioAnalysis(stream);
    } catch (err) {
      console.error('Error accessing media devices:', err);

      // Detect iOS but not Safari (e.g. Chrome, Firefox on iOS often have issues with getUserMedia)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      if (isIOS && !isSafari) {
        alert('在 iOS 上的 Chrome/Firefox 浏览器可能无法访问摄像头。如果遇到问题，请尝试使用 Safari 浏览器打开此链接。');
      } else {
        alert('无法访问摄像头或麦克风，请确保已授权并使用安全连接 (HTTPS)。');
      }
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Cleanup Audio Analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels(new Array(12).fill(4));

    setIsStreamReady(false);
  };

  const initAudioAnalysis = (stream: MediaStream) => {
    try {
      if (audioContextRef.current) audioContextRef.current.close();

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 256; // Higher resolution for more granular control
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateAnalysis = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Focusing on Vocal Frequencies (roughly bins 2 to 40 for fftSize 256)
        // We want 12 bars, so we'll take 6 frequency buckets and mirror them.
        const vocalBins = 42;
        const bucketSize = Math.floor(vocalBins / 6);
        const rawLevels = [];

        for (let i = 0; i < 6; i++) {
          let sum = 0;
          for (let j = 0; j < bucketSize; j++) {
            // Start from bin 2 to skip potential DC offset/static hum
            sum += dataArray[2 + (i * bucketSize) + j];
          }
          const avg = sum / bucketSize;
          // Scale to a height between 4 and 28 pixels (slightly more dramatic)
          rawLevels.push(4 + (avg / 255) * 24);
        }

        // Mirror the 6 bars to create a symmetrical 12-bar wave
        // Mapping: [HighFreq, MidFreq, LowFreq, CenterLow, CenterLow, LowFreq, MidFreq, HighFreq]
        // But reordered so strongest (LowFreq) is in the very center.
        // Array: [5, 4, 3, 1, 0, 2, 2, 0, 1, 3, 4, 5] (indices of rawLevels)
        const symmetricIndices = [5, 4, 3, 1, 0, 2, 2, 0, 1, 3, 4, 5];
        const newLevels = symmetricIndices.map(idx => rawLevels[idx]);

        setAudioLevels(newLevels);
        animationFrameRef.current = requestAnimationFrame(updateAnalysis);
      };

      updateAnalysis();
    } catch (err) {
      console.error('Error initializing audio analysis:', err);
    }
  };

  const resetRecording = () => {
    setRecordedUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setRecordedBlob(null);
    setRecordingTime(0);
    chunksRef.current = [];
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    resetRecording();

    // Determine the best supported MIME type prioritizing mp4 for iOS playback compatibility
    let options: MediaRecorderOptions = {};
    if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
      if (mode === 'video') {
        const types = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
        for (const t of types) {
          if (MediaRecorder.isTypeSupported(t)) {
            options.mimeType = t;
            break;
          }
        }
      } else {
        const types = ['audio/mp4', 'audio/webm'];
        for (const t of types) {
          if (MediaRecorder.isTypeSupported(t)) {
            options.mimeType = t;
            break;
          }
        }
      }
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, options);
    mediaRecorderRef.current = mediaRecorder;
    setIsPaused(false); // Reset pause state

    mediaRecorder.ondataavailable = (e) => {
      // Safari occasionally gives dataavailable with size 0, especially on first chunk.
      // Must check size to ensure we don't compile an empty/corrupted video.
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      // Use the exact MIME type generated by the browser. 
      // iOS Safari often fails to decode if we strip or modify the original type.
      let mimeType = mediaRecorderRef.current?.mimeType || '';
      if (!mimeType && chunksRef.current.length > 0) {
        mimeType = chunksRef.current[0].type || '';
      }
      if (!mimeType) {
        mimeType = mode === 'video' ? 'video/mp4' : 'audio/mp4';
      }

      // If we don't have any valid chunks, exit early instead of creating a broken blob
      if (chunksRef.current.length === 0) {
        console.error('No video chunks recorded. The chunk array is empty.');
        return;
      }

      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
    };

    // Request data every 1 second (1000ms).
    // This solves Safari's issue where it might only fire one large corrupted chunk at the end,
    // or sometimes fail to capture anything if it runs out of memory on iOS.
    mediaRecorder.start(1000);
  };

  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultString = reader.result as string;
        // The format is "data:[<mediatype>][;base64],<data>". 
        // We split by "base64," to reliably retrieve just the data part, 
        // as the mediatype part might contain commas (e.g. codecs=vp8,opus).
        if (resultString.includes('base64,')) {
          resolve(resultString.split('base64,')[1]);
        } else {
          reject(new Error("Invalid data URI format from FileReader"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Capture a thumbnail image from the first frame of a video blob
  const captureVideoThumbnail = (videoBlob: Blob): Promise<Blob | null> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';

        const url = URL.createObjectURL(videoBlob);
        video.src = url;

        video.onloadeddata = () => {
          // Seek to 0.5s to avoid a black first frame
          video.currentTime = 0.5;
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                resolve(blob);
              }, 'image/jpeg', 0.85);
            } else {
              URL.revokeObjectURL(url);
              resolve(null);
            }
          } catch {
            URL.revokeObjectURL(url);
            resolve(null);
          }
        };

        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };

        // Timeout fallback in case events never fire
        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve(null);
        }, 5000);
      } catch {
        resolve(null);
      }
    });
  };

  const stopRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        const originalOnStop = mediaRecorderRef.current.onstop;

        // Wait for one final dataavailable before resolving stop
        const safeStop = () => {
          mediaRecorderRef.current!.onstop = (e) => {
            if (originalOnStop) originalOnStop.call(mediaRecorderRef.current!, e);
            resolve();
          };
          mediaRecorderRef.current!.stop();
        };

        // Sometimes stopping immediately trims the end on iOS. 
        // Adding a tiny delay ensures the final frame is processed.
        setTimeout(safeStop, 300);
      } else {
        resolve();
      }
    });
  };

  // Step transition effect for stream management
  useEffect(() => {
    const needsStream = ['test', 'ready', 'countdown', 'recording'].includes(step);

    if (needsStream) {
      // Only start if not already active to avoid flickering/AbortErrors
      if (!streamRef.current) {
        startStream();
      }
    } else if (['review', 'success', 'summary'].includes(step)) {
      stopStream();
    }

    if (step === 'recording') {
      startRecording();
    }

    return () => {
      // If we are strictly unmounting or moving to a step that doesn't need stream
      if (!needsStream && !['review', 'success', 'summary'].includes(step)) stopStream();
    };
  }, [step, mode]);

  const playBeep = (freq: number, duration: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error('AudioContext error:', e);
    }
  };

  // Countdown effect
  useEffect(() => {
    if (step === 'countdown') {
      // Play tick sound for 3, 2, 1
      if (countdown > 0) {
        playBeep(440, 0.1);
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Play start sound for 0
        playBeep(880, 0.2);
        // Show "Begin" for 1 second then start recording
        const timer = setTimeout(() => setStep('recording'), 1000);
        return () => clearTimeout(timer);
      }
    } else if (step !== 'recording') {
      // Reset countdown when leaving the countdown step
      setCountdown(3);
    }
  }, [step, countdown]);

  // Recording timer effect
  useEffect(() => {
    if (step === 'recording' && !isPaused) {
      if (recordingTime >= 1800) { // 30 minutes auto-stop
        handleNext();
        return;
      }
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, isPaused, recordingTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = async () => {
    switch (step) {
      case 'welcome': setStep(isQuickRecord ? 'mode' : 'prompt'); break;
      case 'prompt': setStep('mode'); break;
      case 'mode': setStep('test'); break;
      case 'test': setStep('ready'); break;
      case 'ready': setStep('countdown'); break;
      case 'recording':
        await stopRecording();
        setStep('review');
        break;
      case 'review': await handleSubmit(); break;
      case 'success': setStep('summary'); break;
      default: break;
    }
  };

  const handleSubmit = async () => {
    if (!recordedBlob) {
      alert('没有录制内容，请重试');
      setStep('ready');
      return;
    }

    setIsSaving(true);
    setSavingStatus('正在准备上传...');
    try {
      // 1. Upload to Supabase Storage (Blocking)
      // Determine file extension from MIME type
      let extension = 'webm';
      if (recordedBlob.type.includes('mp4')) extension = 'mp4';
      else if (recordedBlob.type.includes('ogg')) extension = 'ogg';
      else if (recordedBlob.type.includes('wav')) extension = 'wav';
      else if (recordedBlob.type.includes('aac')) extension = 'aac';
      else if (recordedBlob.type.includes('mpeg')) extension = 'mp3';

      const fileName = `projects/${projectId}/stories/recording_${Date.now()}.${extension}`;
      setSavingStatus('正在上传录音...');
      const publicUrl = await databaseService.uploadMedia(recordedBlob, fileName, recordedBlob.type);

      // 1b. Generate and upload thumbnail cover
      let coverUrl = '';
      if (mode === 'video') {
        try {
          const thumbnailBlob = await captureVideoThumbnail(recordedBlob);
          if (thumbnailBlob) {
            setSavingStatus('正在生成封面图片...');
            const coverFileName = `projects/${projectId}/stories/cover_${Date.now()}.jpg`;
            coverUrl = await databaseService.uploadMedia(thumbnailBlob, coverFileName);
            console.log('Thumbnail cover uploaded:', coverUrl);
          }
        } catch (err) {
          console.warn('Failed to generate thumbnail, continuing without cover:', err);
        }
      } else if (mode === 'audio') {
        coverUrl = '/audio_cover.png';
      }

      // 2. Create Story Record (Blocking)
      // Use a placeholder message initially
      const initialContent = 'AI 正在记录你的心声...';
      setSavingStatus('正在创建故事记录...');
      const story = await databaseService.createStory(projectId, {
        title: isQuickRecord ? '正在生成标题...' : `故事 - ${prompt.question}`,
        content: initialContent,
        imageUrl: coverUrl,
        videoUrl: publicUrl,
        type: mode,
        promptId: isQuickRecord ? undefined : prompt.id
      });
      setNewStoryId(story.id);
      setTranscription(initialContent);

      // 3. Success Transition (Non-blocking transcription start)
      setStep('success');
      setIsSaving(false);

      // 4. Background Transcription (Non-blocking)
      (async () => {
        try {
          const base64Data = await blobToBase64(recordedBlob);
          const transcriptionText = await transcribeMedia(base64Data, recordedBlob.type || (mode === 'video' ? 'video/mp4' : 'audio/mp4'));

          // Update the story in the database
          const updates: any = { content: transcriptionText };

          if (isQuickRecord && transcriptionText && !transcriptionText.includes('未检测到语音')) {
            try {
              const { generateStoryFromMedia } = await import('../services/aiService');
              // We reuse generateStoryFromMedia just to get a title from the text we have now
              // Or even better, a simple title generation prompt
              const aiResult = await generateStoryFromMedia(base64Data, recordedBlob.type || (mode === 'video' ? 'video/mp4' : 'audio/mp4'));
              if (aiResult.title) {
                updates.title = aiResult.title;
              }
            } catch (aiErr) {
              console.error('Failed to generate AI title:', aiErr);
              updates.title = `新故事 - ${new Date().toLocaleDateString()}`;
            }
          }

          await databaseService.updateStory(story.id, updates);

          // Update local state for summary/review if they are still viewing it
          setTranscription(transcriptionText);
          console.log('Background transcription complete');
        } catch (sttError) {
          console.error('Background STT Error:', sttError);
          // If it fails, we keep the placeholder or update with error
          await databaseService.updateStory(story.id, { content: '（语音识别未成功，您可以稍后查看或重新编辑）' });
        }
      })();

    } catch (error) {
      console.error('Error saving recording:', error);
      alert('保存失败，请稍后重试。');
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'prompt': setStep('welcome'); break;
      case 'mode': setStep('prompt'); break;
      case 'test': setStep('mode'); break;
      case 'ready': setStep('test'); break;
      case 'review':
        resetRecording();
        setStep('ready');
        break;
      case 'summary': onClose(); break;
      default: onClose(); break;
    }
  };

  const renderReadyStep = (isCountdown = false) => (
    <div className={`flex flex-col h-full bg-[#f5f5f0] p-4 lg:p-12 overflow-y-auto lg:overflow-hidden ${isCountdown ? 'opacity-40' : ''}`}>
      <header className="flex items-center justify-between mb-2 lg:mb-8 shrink-0">
        <button onClick={handleBack} className="p-2 hover:bg-black/5 rounded-full transition-colors" disabled={isCountdown}>
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="text-lg lg:text-xl font-serif text-gray-800">准备就绪</h2>
        <div className="w-10" />
      </header>

      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full justify-center min-h-0">
        {isQuickRecord && (
          <div className="flex justify-center mb-4 shrink-0">
            <div className="flex space-x-1 items-center h-6">
              {audioLevels.map((level, i) => (
                <motion.div
                  key={i}
                  animate={{ height: level }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="w-1.5 bg-[#4a7c7c] rounded-full"
                />
              ))}
            </div>
          </div>
        )}

        <div className={`bg-gray-900 rounded-3xl overflow-hidden flex-1 mb-4 relative w-full lg:max-w-none mx-auto flex items-center justify-center shadow-2xl min-h-0 ${isQuickRecord ? 'aspect-[4/3]' : 'aspect-video lg:aspect-auto'}`}>
          {!isQuickRecord ? (
            <>
              <div className="relative flex-1 min-h-0 w-full">
                <img src={prompt.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="p-4 lg:p-6 bg-white shrink-0 w-full">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Charlie 提问储备</p>
                <h3 className="text-base lg:text-lg font-serif text-gray-800 leading-snug">{prompt.question}</h3>
              </div>
            </>
          ) : (
            <>
              <div className="relative flex-1 min-h-0 aspect-[4/3] flex items-center justify-center overflow-hidden">
                {mode === 'video' ? (
                  <video
                    ref={setVideoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#4a7c7c]/10">
                    <Mic className="w-24 lg:w-32 h-24 lg:h-32 text-[#4a7c7c]" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 border-8 border-white/20 pointer-events-none rounded-3xl"></div>
            </>
          )}
        </div>

        <div className="w-full shrink-0 pb-4 pt-2 lg:pt-8 flex items-center space-x-4">
          {!isQuickRecord && (
            <div className="w-32 lg:w-48 aspect-[4/3] rounded-3xl overflow-hidden border-4 border-white shadow-lg shrink-0 bg-black flex items-center justify-center">
              {mode === 'video' ? (
                <video
                  ref={setVideoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <Mic className="w-8 lg:w-12 h-8 lg:h-12 text-[#4a7c7c]" />
              )}
            </div>
          )}
          <div className="flex-1">
            <button
              onClick={handleNext}
              disabled={isCountdown}
              className="w-full py-4 lg:py-5 bg-[#2d6a4f] text-white rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 hover:bg-[#1b4332] transition shadow-xl cursor-pointer"
            >
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span>开始录制</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="flex flex-col h-full bg-[#0d1b1e] text-white p-8 lg:p-12 justify-center">
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.15,
                    delayChildren: 0.2
                  }
                }
              }}
              initial="hidden"
              animate="visible"
              className="max-w-xl mx-auto space-y-12"
            >
              <motion.h1
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                }}
                className="text-xl font-medium tracking-tight opacity-80"
              >
                长生記
              </motion.h1>

              <div className="space-y-6">
                <motion.h2
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                  }}
                  className="text-4xl lg:text-5xl font-serif leading-tight"
                >
                  欢迎来到长生記！
                </motion.h2>
                <motion.h2
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                  }}
                  className="text-4xl lg:text-5xl font-serif leading-tight"
                >
                  您的故事至关重要，我们将协助您记录它们。
                </motion.h2>
                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                  }}
                  className="text-2xl lg:text-3xl font-serif text-white/80"
                >
                  准备好开始了吗？
                </motion.p>
              </div>

              <motion.button
                variants={{
                  hidden: { opacity: 0, y: 40 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 1.0,
                      ease: [0.22, 1, 0.36, 1] // Custom quint ease-out for smoother float
                    }
                  }
                }}
                onClick={handleNext}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-5 bg-[#e2f36e] text-[#0d1b1e] rounded-2xl font-bold text-xl transition-shadow shadow-xl cursor-pointer"
              >
                立即开始
              </motion.button>
            </motion.div>
          </div>
        );

      case 'prompt':
        return (
          <div className="flex flex-col h-full bg-[#f5f5f0] p-6 lg:p-12 overflow-y-auto lg:overflow-hidden">
            <header className="flex items-center justify-between mb-4 lg:mb-8">
              <button onClick={handleBack} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-xl font-serif text-gray-800">您的提示</h2>
              <div className="w-10" />
            </header>

            <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-0">
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex-1 flex flex-col mb-4 min-h-0">
                <div className="relative flex-1 min-h-0 aspect-video lg:aspect-auto">
                  <img src={prompt.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="p-4 lg:p-6 bg-white shrink-0">
                  <p className="text-[10px] lg:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 lg:mb-2">Charlie 提议</p>
                  <h3 className="text-xl lg:text-2xl font-serif text-gray-800 leading-snug">{prompt.question}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 shrink-0 pb-4">
                <button
                  onClick={() => setIsPromptSelectorOpen(true)}
                  className="py-4 px-6 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-white transition shadow-sm"
                >
                  更换提示
                </button>
                <button
                  onClick={handleNext}
                  className="py-4 px-6 bg-[#4a7c7c] text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-[#3d6666] transition shadow-md"
                >
                  <span>下一步</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'mode':
        return (
          <div className="flex flex-col h-full bg-[#f5f5f0] p-6 lg:p-12 overflow-y-auto lg:overflow-hidden">
            <header className="flex items-center justify-between mb-4 lg:mb-8">
              <button onClick={handleBack} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-xl font-serif text-gray-800">选择录制模式</h2>
              <div className="w-10" />
            </header>

            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full space-y-4 lg:space-y-8 min-h-0">
              <div className="flex space-x-8 lg:space-x-12 shrink-0">
                <div className={`flex flex-col items-center space-y-2 lg:space-y-4 ${mode === 'audio' ? 'text-[#4a7c7c]' : 'text-gray-300'}`}>
                  <Mic className="w-12 h-12 lg:w-20 lg:h-20" />
                </div>
                <div className={`flex flex-col items-center space-y-2 lg:space-y-4 ${mode === 'video' ? 'text-[#4a7c7c]' : 'text-gray-300'}`}>
                  <Video className="w-12 h-12 lg:w-20 lg:h-20" />
                </div>
              </div>

              <p className="text-center text-gray-600 text-sm lg:text-lg max-w-xs shrink-0 px-4">
                您可以录制视频，也可以选择仅录制音频。
              </p>

              <div className="grid grid-cols-2 gap-4 w-full shrink-0">
                <button
                  onClick={() => setMode('audio')}
                  className={`py-3 px-6 border rounded-2xl font-bold transition flex items-center justify-center space-x-2 ${mode === 'audio' ? 'bg-white border-[#4a7c7c] text-[#4a7c7c] shadow-md' : 'border-gray-200 text-gray-500'
                    }`}
                >
                  <Mic className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span>音频</span>
                </button>
                <button
                  onClick={() => setMode('video')}
                  className={`py-3 px-6 border rounded-2xl font-bold transition flex items-center justify-center space-x-2 ${mode === 'video' ? 'bg-[#4a7c7c] border-[#4a7c7c] text-white shadow-md' : 'border-gray-200 text-gray-500'
                    }`}
                >
                  <Video className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span>视频</span>
                </button>
              </div>

              <div className="w-full shrink-0 pb-4 pt-4 lg:pt-8">
                <button
                  onClick={handleNext}
                  className="w-full py-4 bg-[#4a7c7c] text-white rounded-2xl font-bold hover:bg-[#3d6666] transition shadow-md"
                >
                  下一步
                </button>
              </div>
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="flex flex-col h-full bg-[#f5f5f0] p-4 lg:p-12 overflow-y-auto lg:overflow-hidden">
            <header className="flex items-center justify-between mb-4 lg:mb-8 shrink-0">
              <button onClick={handleBack} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-lg lg:text-xl font-serif text-gray-800">摄像头和声音测试</h2>
              <div className="w-10" />
            </header>

            <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full justify-center min-h-0">
              <div className="flex justify-center mb-4 shrink-0">
                <div className="flex space-x-1 items-center h-6">
                  {audioLevels.map((level, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: level }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="w-1.5 bg-[#4a7c7c] rounded-full"
                    />
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 rounded-3xl overflow-hidden flex-1 mb-4 relative w-full lg:max-w-none mx-auto flex items-center justify-center shadow-2xl min-h-0 aspect-[4/3]">
                {/* REC Indicator */}
                <div className="absolute top-4 left-4 flex items-center space-x-2 z-10 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  />
                  <span className="text-white text-[10px] font-bold tracking-widest uppercase">REC</span>
                </div>

                {/* Settings Button */}
                <button className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-sm border border-white/10">
                  <Settings className="w-5 h-5 text-white" />
                </button>

                {mode === 'video' ? (
                  <video
                    ref={setVideoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#4a7c7c]/10">
                    <Mic className="w-24 lg:w-32 h-24 lg:h-32 text-[#4a7c7c]" />
                  </div>
                )}
                <div className="absolute inset-0 border-8 border-white/20 pointer-events-none rounded-3xl"></div>
              </div>

              <p className="text-center text-gray-600 mb-4 shrink-0 text-xs lg:text-base px-4 leading-relaxed">
                {mode === 'video'
                  ? "请确认您能看到自己，且麦克风音量条随您的声音波动。"
                  : "请确认您能看到麦克风音量条随您的声音波动。"
                }
              </p>

              <div className="w-full shrink-0 pb-4 pt-4 lg:pt-8">
                <button
                  onClick={handleNext}
                  className="w-full py-4 bg-[#4a7c7c] text-white rounded-2xl font-bold hover:bg-[#3d6666] transition shadow-md"
                >
                  下一步
                </button>
              </div>
            </div>
          </div>
        );

      case 'ready':
        return renderReadyStep();

      case 'countdown':
        return (
          <div className="relative h-full w-full overflow-hidden">
            {renderReadyStep(true)}
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-colors duration-500 ${countdown === 0 ? 'bg-[#2d6a4f]/60' : 'bg-black/40'} text-white z-20 backdrop-blur-[2px]`}>
              <AnimatePresence mode="wait">
                {countdown > 0 ? (
                  <motion.div
                    key={countdown}
                    initial={{ scale: 2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="text-[12rem] font-bold drop-shadow-2xl"
                  >
                    {countdown}
                  </motion.div>
                ) : (
                  <motion.div
                    key="begin"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-6xl lg:text-8xl font-bold drop-shadow-2xl"
                  >
                    开始录制
                  </motion.div>
                )}
              </AnimatePresence>
              {countdown > 0 && (
                <button
                  onClick={() => setStep('recording')}
                  className="absolute bottom-12 text-white/80 hover:text-white transition-colors font-bold bg-black/20 px-6 py-2 rounded-full backdrop-blur-md"
                >
                  跳过
                </button>
              )}
            </div>
          </div>
        );

      case 'recording':
        return (
          <div className="flex flex-col h-full bg-[#f5f5f0] p-4 lg:p-12 overflow-y-auto lg:overflow-hidden">
            <header className="flex flex-col items-center mb-6 lg:mb-10 shrink-0">
              <div className="flex space-x-1 items-center h-10 px-4 mb-2">
                {audioLevels.map((level, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: level * 0.7 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className="w-1.5 bg-[#4a7c7c] rounded-full"
                  />
                ))}
              </div>

              <div className="flex items-center space-x-2 text-gray-500 font-mono text-sm lg:text-base tracking-widest tabular-nums">
                <motion.div
                  animate={isPaused ? { opacity: 0.5 } : { opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="w-2 h-2 bg-red-500 rounded-full"
                />
                <span>{formatTime(recordingTime)} / 30:00</span>
              </div>
            </header>

            <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full justify-center min-h-0 relative">
              {!isQuickRecord ? (
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 mb-4 flex flex-col min-h-0">
                  <div className="relative flex-1 min-h-0 aspect-video lg:aspect-auto">
                    <img src={prompt.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-4 lg:p-6 shrink-0">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Charlie 提问储备</p>
                    <h3 className="text-base lg:text-xl font-serif text-gray-800 leading-snug">{prompt.question}</h3>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl mb-4 relative flex-1 min-h-0 flex items-center justify-center aspect-[4/3]">
                  <div className="relative flex-1 min-h-0 aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {mode === 'video' ? (
                      <video
                        ref={setRecordingPreviewRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#4a7c7c]/10">
                        <Mic className="w-24 lg:w-32 h-24 lg:h-32 text-[#4a7c7c]" />
                      </div>
                    )}
                    {isPaused && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <Pause className="w-10 h-10 text-white opacity-80" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 border-8 border-white/20 pointer-events-none rounded-3xl"></div>
                </div>
              )}

              <div className={`flex items-end ${isQuickRecord ? 'justify-center' : 'justify-between'} w-full mt-4`}>
                {!isQuickRecord && (
                  <div className="w-32 lg:w-48 aspect-[4/3] rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-black relative shrink-0">
                    {mode === 'video' ? (
                      <video
                        ref={setRecordingPreviewRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#4a7c7c]/10">
                        <Mic className="w-8 lg:w-12 h-8 lg:h-12 text-[#4a7c7c]" />
                      </div>
                    )}
                    {isPaused && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <Pause className="w-10 h-10 text-white opacity-80" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex space-x-6 lg:space-x-8">
                  <div className="flex flex-col items-center space-y-2">
                    <button
                      onClick={togglePauseRecording}
                      className="w-16 h-16 lg:w-24 lg:h-24 bg-white border-4 border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:scale-105 transition-transform shadow-xl cursor-pointer"
                    >
                      {isPaused ? (
                        <Play className="w-6 h-6 lg:w-10 lg:h-10 fill-current" />
                      ) : (
                        <Pause className="w-6 h-6 lg:w-10 lg:h-10 fill-current" />
                      )}
                    </button>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                      {isPaused ? 'Resume' : 'Pause'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center space-y-2">
                    <button
                      onClick={() => handleNext()}
                      className="w-16 h-16 lg:w-24 lg:h-24 bg-white border-4 border-gray-200 rounded-full flex items-center justify-center text-red-500 hover:scale-105 transition-transform shadow-xl cursor-pointer"
                    >
                      <div className="w-6 h-6 lg:w-10 lg:h-10 bg-red-500 rounded-sm" />
                    </button>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Stop</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="flex flex-col h-full bg-[#f5f5f0] p-6 lg:p-12 overflow-y-auto lg:overflow-hidden">
            <header className="flex items-center justify-between mb-4 lg:mb-8">
              <button onClick={handleBack} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h2 className="text-xl font-serif text-gray-800">检查并提交</h2>
              <div className="w-10" />
            </header>

            <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full min-h-0">
              <div className="bg-gray-900 rounded-3xl overflow-hidden mb-4 relative shadow-xl flex-1 min-h-0 flex items-center justify-center aspect-[4/3] lg:aspect-auto">
                {mode === 'video' ? (
                  recordedUrl && (
                    <video
                      key={recordedUrl}
                      controls
                      playsInline
                      webkit-playsinline="true"
                      preload="metadata"
                      className="w-full h-full object-cover"
                    >
                      <source src={recordedUrl} type={recordedBlob?.type || 'video/mp4'} />
                    </video>
                  )
                ) : (
                  recordedUrl && (
                    <div className="w-full h-full flex flex-col items-center p-8">
                      <div className="flex-1 flex items-center justify-center">
                        <Mic className="w-16 h-16 text-[#4a7c7c]" />
                      </div>
                      <audio src={recordedUrl} controls className="w-full max-w-md" />
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 shrink-0 pb-4">
                <button
                  onClick={() => setStep('ready')}
                  className="py-4 px-6 border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-white transition shadow-sm flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>重新录制</span>
                </button>
                <button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="py-4 px-6 bg-[#4a7c7c] text-white rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-[#3d6666] transition shadow-md disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span>
                    {isTranscribing ? '正在转换语音...' : (isSaving ? (savingStatus || '提交中...') : '提交')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col h-full bg-[#f5f5f0] items-center justify-center p-12 text-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="space-y-8"
            >
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        x: (Math.random() - 0.5) * 400,
                        y: (Math.random() - 0.5) * 400,
                        rotate: Math.random() * 360
                      }}
                      transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
                      className={`absolute w-3 h-6 rounded-sm ${['bg-red-400', 'bg-blue-400', 'bg-yellow-400', 'bg-green-400'][Math.floor(Math.random() * 4)]}`}
                    />
                  ))}
                </div>
                <h2 className="text-5xl font-serif text-gray-800 relative z-10">太棒了！</h2>
              </div>
            </motion.div>
            <button
              onClick={handleNext}
              className="mt-24 text-gray-400 hover:text-gray-800 font-bold tracking-[0.2em] uppercase text-xl transition-all"
            >
              继续
            </button>
          </div>
        );

      case 'summary':
        return (
          <div className="flex flex-col h-full bg-[#0d1b1e] text-white p-8 lg:p-12 justify-center">
            <div className="max-w-xl mx-auto w-full space-y-12 text-center">
              <div className="flex justify-center">
                <div className="w-12 h-12 relative">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 border border-[#e2f36e] rotate-[30deg]"
                      style={{ transform: `rotate(${i * 30}deg)` }}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-3xl lg:text-4xl font-serif leading-tight">
                恭喜您又在长生記分享了一个故事！
              </h2>

              <div className="space-y-4">
                <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">总录制时长：</p>
                <div className="flex justify-center space-x-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-1">
                      {Math.floor(recordingTime / 3600).toString().padStart(2, '0')}
                    </div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">小时</div>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-1">
                      {Math.floor((recordingTime % 3600) / 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">分钟</div>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-1">
                      {(recordingTime % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">秒</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-8">
                <button
                  onClick={() => setStep('welcome')}
                  className="w-full py-5 bg-[#e2f36e] text-[#0d1b1e] rounded-2xl font-bold text-xl hover:scale-[1.02] transition-transform shadow-xl"
                >
                  录制另一个故事
                </button>
                <button
                  onClick={() => onComplete?.({ storyId: newStoryId })}
                  className="w-full py-4 text-[#e2f36e] font-bold hover:underline transition-all"
                >
                  查看我的故事
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col">
      {/* Global Close Button */}
      {step !== 'countdown' && step !== 'recording' && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-[110] p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors backdrop-blur-sm"
        >
          <X className={`w-6 h-6 ${['welcome', 'countdown', 'recording', 'summary'].includes(step) ? 'text-white' : 'text-gray-600'}`} />
        </button>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto lg:overflow-hidden"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Prompt Selector Modal */}
      <AnimatePresence>
        {isPromptSelectorOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-serif text-gray-800">选择待录制提示</h3>
                <button onClick={() => setIsPromptSelectorOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {prompts.filter(p => !p.isRecorded && p.id !== prompt.id).length === 0 ? (
                  <div className="py-20 text-center">
                    <p className="text-gray-400">暂无其他待录制的提示</p>
                  </div>
                ) : (
                  prompts
                    .filter(p => !p.isRecorded && p.id !== prompt.id)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          if (onSelectPrompt) {
                            onSelectPrompt(p);
                            setIsPromptSelectorOpen(false);
                            // We stay on the 'prompt' step but with the new prompt data
                          }
                        }}
                        className="w-full bg-gray-50 hover:bg-stone-100 border border-gray-100 rounded-2xl p-4 flex items-center space-x-4 transition-all text-left group"
                      >
                        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden shrink-0 shadow-sm">
                          <img src={p.imageUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{p.category || '自定义'}</p>
                          <h4 className="text-gray-800 font-medium truncate">{p.question}</h4>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary transition-colors" />
                      </button>
                    ))
                )}
              </div>

              <div className="p-6 bg-gray-50 shrink-0">
                <button
                  onClick={() => setIsPromptSelectorOpen(false)}
                  className="w-full py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition shadow-sm"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
