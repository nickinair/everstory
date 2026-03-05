import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Mic,
  Square,
  Play,
  Pause,
  RefreshCw,
  ChevronLeft,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wand2,
  ArrowLeft,
  Share2,
  Sparkles,
  Volume2,
  History,
  FileText,
  Star,
  Users,
  MoreHorizontal,
  Heart,
  Maximize2,
  Download,
  Check,
  Copy,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Story, Prompt, ProjectMember } from '../types';
import { databaseService } from '../services/databaseService';
import { transcribeMedia, optimizeStoryContent } from '../services/geminiService';
import BookLoader from './BookLoader';

interface StoryDetailViewProps {
  story: Story;
  onClose: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  currentUserRole?: string;
}

export default function StoryDetailView({ story, onClose, onUpdate, onDelete, currentUserRole }: StoryDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasManuallySaved, setHasManuallySaved] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [assistantStep, setAssistantStep] = useState<'none' | 'settings'>('none');
  const [assistantMode, setAssistantMode] = useState<'first' | 'third' | 'cleaned'>('cleaned');
  const [editedTitle, setEditedTitle] = useState(story.title);
  const [editedContent, setEditedContent] = useState(story.content || '');
  const [isTranscribing, setIsTranscribing] = useState((story.content || '').includes('AI 正在记录你的心声'));
  const [additionalImages, setAdditionalImages] = useState<string[]>(story.additionalImages || []);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isReTranscribing, setIsReTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<{ type: 'busy' | 'failed', message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isConfirmCloseModalOpen, setIsConfirmCloseModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  useEffect(() => {
    const isTranscribingNow = editedContent.includes('AI 正在记录你的心声');
    setIsTranscribing(isTranscribingNow);

    // Check for changes excluding the placeholder
    const isChanged = editedTitle !== story.title || (editedContent.trim() !== (story.content || '').trim() && !isTranscribingNow);
    setHasChanges(isChanged);
  }, [editedTitle, editedContent, story.title, story.content]);

  // Reset state when story changes
  useEffect(() => {
    setIsEditing(false);
    setHasManuallySaved(false);
    setVideoBlobUrl(null);
    setEditedTitle(story.title);
    setEditedContent(story.content || '');
    setIsTranscribing((story.content || '').includes('AI 正在记录你的心声'));
  }, [story.id]);

  // Sync state with story props when not editing and not recently saved
  useEffect(() => {
    if (!isEditing && !isGenerating && !isSaving && !hasManuallySaved) {
      setEditedTitle(story.title);
      setEditedContent(story.content || '');
    }
  }, [story.title, story.content, isEditing, isGenerating, isSaving, hasManuallySaved]);

  // Polling for transcription completion
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isTranscribing) {
      pollInterval = setInterval(async () => {
        // Don't update if user is editing, saving, or has already manually saved
        if (isEditing || isSaving || hasManuallySaved) return;

        try {
          const updatedStory = await databaseService.getStory(story.id);
          if (updatedStory && updatedStory.content && !updatedStory.content.includes('AI 正在记录你的心声')) {
            setEditedContent(updatedStory.content);
            setEditedTitle(updatedStory.title || story.title);
            setIsTranscribing(false);
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isTranscribing, story.id, isEditing]);

  // Force load media when URL changes
  useEffect(() => {
    if (mediaRef.current && story.videoUrl) {
      console.log('Story URL changed, calling load()...');
      mediaRef.current.load();
    }
  }, [story.videoUrl]);

  const togglePlay = async () => {
    if (!mediaRef.current) return;

    try {
      if (isPlaying) {
        mediaRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = mediaRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Playback error:', err.name, err.message);
        // Fallback: try one load() and play()
        try {
          if (mediaRef.current) {
            mediaRef.current.load();
            await mediaRef.current.play();
            setIsPlaying(true);
            return;
          }
        } catch (retryErr) {
          console.error('Retry play failed:', retryErr);
        }
      }
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  };

  // Log video URL for debugging
  useEffect(() => {
    console.log('StoryDetailView videoUrl:', story.videoUrl);
  }, [story.videoUrl]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mediaRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    mediaRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatMediaTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

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
          } catch (err) {
            console.error('Thumbnail capture error:', err);
            URL.revokeObjectURL(url);
            resolve(null);
          }
        };

        video.onerror = (err) => {
          console.error('Video error during thumbnail capture:', err);
          URL.revokeObjectURL(url);
          resolve(null);
        };
      } catch (err) {
        console.error('Failed to setup thumbnail capture:', err);
        resolve(null);
      }
    });
  };

  const handleReTranscribe = async () => {
    if (!story.videoUrl) {
      alert('未找到视频资源，无法重新识别');
      return;
    }

    setIsGenerating(true);
    setIsReTranscribing(true);
    setAssistantStep('none');
    setTranscriptionError(null);
    try {
      const blob = await databaseService.downloadMedia(story.videoUrl);
      if (!blob) throw new Error('Failed to download media');

      const base64Data = await blobToBase64(blob);
      const contentType = blob.type || (story.type === 'video' ? 'video/mp4' : 'audio/mp4');
      const transcriptionText = await transcribeMedia(base64Data, contentType);

      if (transcriptionText) {
        setEditedContent(transcriptionText);
        setIsEditing(true);
        setHasChanges(true);
      }
    } catch (err: any) {
      console.error('Re-transcription failed:', err);
      const isBusy = err.status === 503 || err.message?.includes('503') || err.message?.includes('currently experiencing high demand');
      setTranscriptionError({
        type: isBusy ? 'busy' : 'failed',
        message: isBusy ? 'AI 服务目前繁忙，请几秒后重试' : '语音识别失败，请检查网络后重试'
      });
    } finally {
      setIsGenerating(false);
      setIsReTranscribing(false);
    }
  };

  const handleCloseClick = () => {
    // Only show confirmation if we are in active editing mode AND have unsaved changes
    if (isEditing && hasChanges) {
      setIsConfirmCloseModalOpen(true);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setHasManuallySaved(true); // Lock it immediately
    setIsTranscribing(false); // Stop any polling updates
    try {
      await databaseService.updateStory(story.id, {
        title: editedTitle,
        content: editedContent
      });
      setIsEditing(false);
      setHasChanges(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to save story:', error);
      alert('保存失败，请重试');
      setHasManuallySaved(false); // Unlock on failure so user can try again
    } finally {
      setIsSaving(false);
    }
  };

  const getShareLink = () => {
    return `${window.location.origin}/story/${story.id}`;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const newUrls: string[] = [];
      let updatedImageUrl = story.imageUrl;

      for (const file of Array.from(files) as File[]) {
        const isVideo = file.type.startsWith('video/');
        const timestamp = Date.now();
        const path = `stories/${story.id}/${timestamp}-${file.name}`;
        const url = await databaseService.uploadMedia(file, path);

        if (isVideo) {
          // If it's a video, try to capture a thumbnail
          try {
            const thumbnailBlob = await captureVideoThumbnail(file);
            if (thumbnailBlob) {
              const thumbPath = `stories/${story.id}/cover_${Date.now()}.jpg`;
              const thumbUrl = await databaseService.uploadMedia(new File([thumbnailBlob], 'cover.jpg', { type: 'image/jpeg' }), thumbPath);

              // Only update cover if the story doesn't have one
              if (!updatedImageUrl || updatedImageUrl === '') {
                updatedImageUrl = thumbUrl;
              }
            }
          } catch (thumbErr) {
            console.error('Failed to generate thumbnail for uploaded video:', thumbErr);
          }
        }

        newUrls.push(url);
      }

      const updatedAdditionalImages = [...additionalImages, ...newUrls];

      // If the story has no cover image yet, and we didn't just set a video thumbnail,
      // use the first uploaded item as cover (if it's an image)
      const shouldUpdateCover = !updatedImageUrl || updatedImageUrl === '';
      if (shouldUpdateCover && newUrls.length > 0 && files[0].type.startsWith('image/')) {
        updatedImageUrl = newUrls[0];
      }

      // Update database metadata
      await databaseService.updateStory(story.id, {
        imageUrl: updatedImageUrl,
        metadata: {
          ...(story.metadata || {}),
          additionalImages: updatedAdditionalImages
        }
      });

      setAdditionalImages(updatedAdditionalImages);
      // We don't necessarily need setHasChanges(true) here as we've already saved to DB
      // but let's keep it if you want to trigger a refresh of the parent
      setHasChanges(true);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to upload photos:', error);
      alert('上传照片失败，请重试');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRetryASR = async () => {
    if (!story.videoUrl) return;

    setIsGenerating(true);
    setTranscriptionError(null);
    console.log('Retry ASR: Starting download from', story.videoUrl);
    try {
      // 1. Download the media file using databaseService
      const blob = await databaseService.downloadMedia(story.videoUrl);
      console.log('Retry ASR: Downloaded blob', blob.type, blob.size);

      // 2. Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const resultString = reader.result as string;
          if (resultString.includes('base64,')) {
            resolve(resultString.split('base64,')[1]);
          } else {
            reject(new Error("Invalid data URI format"));
          }
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      // 3. Re-transcribe
      console.log('Retry ASR: Sending to Gemini with type', blob.type);
      const transcriptionText = await transcribeMedia(base64Data, blob.type || (story.type === 'video' ? 'video/mp4' : 'audio/mp4'));
      console.log('Retry ASR: Received transcription:', transcriptionText);
      await databaseService.updateStory(story.id, { content: transcriptionText });
      setEditedContent(transcriptionText);
      setHasChanges(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Retry ASR error:', error);
      const isBusy = error.status === 503 || error.message?.includes('503') || error.message?.includes('currently experiencing high demand');
      setTranscriptionError({
        type: isBusy ? 'busy' : 'failed',
        message: isBusy ? 'AI 服务目前繁忙，请几秒后重试' : '重新识别失败，请稍后重试'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isASRFailure = (editedContent || '').includes('语音识别未成功');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[60] flex flex-col lg:flex-row overflow-hidden"
    >
      {/* Left Side: Media Player */}
      <div className="flex-1 relative bg-black flex flex-col min-h-0">
        <div className="absolute top-4 lg:top-6 left-4 lg:left-8 z-10">
          <p className="text-white/60 text-[10px] lg:text-xs font-medium uppercase tracking-widest">录制于 {story.date}</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-2 lg:p-12">
          <div className="relative w-full max-w-5xl aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl group">
            {story.type === 'video' ? (
              <video
                key={videoBlobUrl || story.videoUrl}
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={videoBlobUrl || story.videoUrl || undefined}
                poster={story.imageUrl}
                className="w-full h-full object-contain bg-black"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
                onError={async (e) => {
                  const error = (e.target as any).error;
                  console.error('Video error details:', {
                    code: error?.code,
                    message: error?.message,
                    src: videoBlobUrl || story.videoUrl
                  });

                  // If it's a "Source Not Supported" error (4) and we haven't tried Blob yet
                  if (error?.code === 4 && !videoBlobUrl && story.videoUrl) {
                    console.log('Attempting Blob fallback for video...');
                    try {
                      const blob = await databaseService.downloadMedia(story.videoUrl);
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        setVideoBlobUrl(url);
                        return;
                      }
                    } catch (err) {
                      console.error('Blob fallback failed:', err);
                    }
                  }
                  if (isPlaying) setIsPlaying(false);
                }}
                controls
                playsInline
                preload="auto"
              />
            ) : (
              <div className="w-full h-full relative bg-stone-900 flex items-center justify-center overflow-hidden">
                <img
                  src={story.type === 'audio' ? '/audio_cover.png' : (story.imageUrl || (story.additionalImages && story.additionalImages.length > 0 ? story.additionalImages[0] : ''))}
                  alt={story.title}
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    if (story.type === 'audio') {
                      (e.target as HTMLImageElement).src = '/audio_cover.png';
                    }
                  }}
                />
                {story.type === 'audio' && (
                  <audio
                    key={story.videoUrl}
                    ref={mediaRef as React.RefObject<HTMLAudioElement>}
                    src={story.videoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                  />
                )}
              </div>
            )}

            {/* Media Controls Overlay */}
            {story.type !== 'image' && (
              <div className="absolute inset-0 flex flex-col justify-end p-4 lg:p-6 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center space-x-4 mb-2 lg:mb-4">
                  <div
                    className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden cursor-pointer group/progress"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-white relative"
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform" />
                    </div>
                  </div>
                  <span className="text-white text-[10px] lg:text-xs font-mono">
                    {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 lg:space-x-6">
                    <button
                      onClick={togglePlay}
                      className="text-white hover:scale-110 transition-transform cursor-pointer"
                    >
                      {isPlaying ? (
                        <div className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center space-x-1">
                          <div className="w-1.5 h-full bg-current rounded-full" />
                          <div className="w-1.5 h-full bg-current rounded-full" />
                        </div>
                      ) : (
                        <Play className="w-5 h-5 lg:w-6 lg:h-6 fill-current" />
                      )}
                    </button>
                    <button className="text-white hover:scale-110 transition-transform cursor-pointer">
                      <Volume2 className="w-5 h-5 lg:w-6 lg:h-6" />
                    </button>

                    <div className="flex items-center space-x-3 border-l border-white/20 pl-4 lg:pl-6">
                      {currentUserRole === 'storyteller' && (
                        <button className="text-white/80 hover:text-white flex items-center space-x-1 transition-colors group cursor-pointer">
                          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">重新录制</span>
                        </button>
                      )}
                      <a
                        href={story.videoUrl || story.imageUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/80 hover:text-white flex items-center space-x-1 transition-colors group cursor-pointer"
                      >
                        <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">下载</span>
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 lg:space-x-6">
                    <span className="text-white text-[10px] lg:text-xs font-medium tracking-tight truncate max-w-[100px] lg:max-w-none">• {story.title}</span>
                    <button className="text-white hover:scale-110 transition-transform cursor-pointer">
                      <Maximize2 className="w-4 h-4 lg:w-5 lg:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Play Button Center (only show if not playing and NOT an image) */}
            <AnimatePresence>
              {!isPlaying && story.type !== 'image' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="w-16 h-16 lg:w-20 lg:h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all transform hover:scale-110 pointer-events-auto"
                  >
                    <Play className="w-8 h-8 lg:w-10 lg:h-10 fill-current ml-1" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Thumbnails */}
        <div className="p-4 lg:p-8 flex space-x-4 overflow-x-auto shrink-0 scrollbar-hide">
          {/* Main Thumbnail (Image or Video Placeholder) */}
          <div className="w-16 lg:w-24 aspect-square rounded-lg border-2 border-white overflow-hidden shrink-0 shadow-lg cursor-pointer">
            {story.imageUrl ? (
              <img
                src={story.imageUrl}
                alt="主图"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (story.type === 'audio') {
                    (e.target as HTMLImageElement).src = '/audio_cover.png';
                  }
                }}
              />
            ) : story.type === 'video' ? (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <Play className="w-4 h-4 text-white/40" />
              </div>
            ) : (
              <div className="w-full h-full bg-stone-900 flex items-center justify-center">
                <img src="/audio_cover.png" className="w-full h-full object-cover opacity-60" />
              </div>
            )}
          </div>

          {/* Additional Images */}
          {additionalImages.map((url, idx) => (
            <div
              key={idx}
              className="w-16 lg:w-24 aspect-square rounded-lg border-2 border-transparent hover:border-white transition-all overflow-hidden shrink-0 shadow-md cursor-pointer"
              onClick={() => {
                // Future: Switch main view to this image
              }}
            >
              <img src={url} alt={`照片 ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ))}

          {/* Add Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingPhoto}
            className="w-16 lg:w-24 aspect-square rounded-lg bg-white/10 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {isUploadingPhoto ? (
              <RefreshCw className="w-5 h-5 lg:w-6 lg:h-6 text-white/40 animate-spin" />
            ) : (
              <Plus className="w-5 h-5 lg:w-6 lg:h-6 text-white/40" />
            )}
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoUpload}
          className="hidden"
          accept="image/*,video/*"
          multiple
        />
      </div>

      {/* Right Side: Content & Transcript */}
      <div className="w-full lg:w-[38%] bg-white flex flex-col h-[65%] lg:h-full shadow-2xl relative">
        <div className="p-4 lg:p-6 flex justify-between items-center border-b border-gray-100 shrink-0">
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <div className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>删除故事</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
          <button
            onClick={handleCloseClick}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className={`flex-1 ${isEditing ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'} p-6 lg:p-10 space-y-6 lg:space-y-8 relative`}>
          {/* Overlay to dim content when assistant settings are open */}
          <AnimatePresence>
            {assistantStep === 'settings' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black z-10 pointer-events-none"
              />
            )}
          </AnimatePresence>

          {(isGenerating || isSaving) ? (
            <div className="h-full flex flex-col items-center justify-center space-y-6 py-20">
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {isSaving ? <Save className="w-6 h-6 text-accent" /> : <Sparkles className="w-6 h-6 text-accent" />}
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-serif text-gray-800">{isSaving ? '正在保存' : '故事生成中'}</h3>
                <p className="text-sm text-gray-400">
                  {isSaving
                    ? '正在同步您的修改...'
                    : (isReTranscribing ? 'AI 语音识别中...' : 'AI 正在为您润色文字...')
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full text-xl lg:text-3xl font-serif text-gray-900 leading-tight border-b border-accent outline-none bg-transparent"
                />
              ) : (
                <h1 className="text-xl lg:text-3xl font-serif text-gray-900 leading-tight">
                  {editedTitle}
                </h1>
              )}

              <div className={`flex-1 flex flex-col ${isEditing ? 'mt-6' : 'space-y-4 lg:space-y-6'} text-gray-700 leading-relaxed font-serif text-sm lg:text-lg min-h-0`}>
                {isEditing ? (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full flex-1 p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-accent transition-all resize-none font-serif text-sm lg:text-lg"
                  />
                ) : (
                  <>
                    {isTranscribing ? (
                      <div className="py-12 flex flex-col items-center justify-center bg-accent/5 rounded-3xl border border-dashed border-accent/20">
                        <BookLoader />
                        <div className="text-center space-y-2 mt-8">
                          <h3 className="text-lg font-bold text-gray-800">AI 正在为您转换语音...</h3>
                          <p className="text-sm text-gray-400 px-8">完成后文字将自动显示在这里</p>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {editedContent}
                      </div>
                    )}
                    {transcriptionError ? (
                      <div className="mt-8 p-6 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col items-center text-center space-y-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-orange-900 font-bold">{transcriptionError.type === 'busy' ? 'AI 目前太忙了' : '识别未成功'}</p>
                          <p className="text-sm text-orange-600/80">{transcriptionError.message}</p>
                        </div>
                        <button
                          onClick={handleRetryASR}
                          className="px-6 py-2.5 bg-orange-600 text-white rounded-full text-sm font-bold shadow-sm hover:bg-orange-700 transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>再次识别</span>
                        </button>
                      </div>
                    ) : isASRFailure && !isGenerating && !isTranscribing && (
                      <div className="mt-8 p-6 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col items-center text-center space-y-4">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-orange-900 font-bold">语音识别未成功</p>
                          <p className="text-sm text-orange-600/80">我们可以尝试再次为您进行语音转换</p>
                        </div>
                        <button
                          onClick={handleRetryASR}
                          className="px-6 py-2.5 bg-orange-600 text-white rounded-full text-sm font-bold shadow-sm hover:bg-orange-700 transition-colors flex items-center space-x-2 cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>再次识别</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons Bottom */}
        <div className="p-6 border-t border-gray-100 grid grid-cols-4 gap-2 shrink-0 bg-gray-50/50">
          {isEditing ? (
            <>
              <div className="col-span-2" />
              <button
                onClick={() => setIsEditing(false)}
                className="flex flex-col items-center justify-center p-2 border border-gray-200 text-gray-500 rounded-xl hover:bg-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">取消</span>
              </button>
              <button
                onClick={handleSave}
                className="flex flex-col items-center justify-center p-2 bg-accent text-white rounded-xl shadow-md hover:bg-teal-700 transition-all group cursor-pointer"
              >
                <Save className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-wider">保存</span>
              </button>
            </>
          ) : (
            <>
              <button className="flex flex-col items-center justify-center p-2 hover:bg-white rounded-xl transition-all group cursor-pointer">
                <Heart className="w-5 h-5 text-gray-400 group-hover:text-red-500 mb-1" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">互动</span>
              </button>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="flex flex-col items-center justify-center p-2 hover:bg-white rounded-xl transition-all group cursor-pointer"
              >
                <Share2 className="w-5 h-5 text-gray-400 group-hover:text-primary mb-1" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">分享</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="flex flex-col items-center justify-center p-2 hover:bg-white rounded-xl transition-all group disabled:opacity-50 cursor-pointer"
              >
                {isUploadingPhoto ? (
                  <RefreshCw className="w-5 h-5 text-accent animate-spin mb-1" />
                ) : (
                  <Plus className="w-5 h-5 text-gray-400 group-hover:text-primary mb-1" />
                )}
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {isUploadingPhoto ? '上传中...' : '添加照片'}
                </span>
              </button>
              <button
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    setAssistantStep('settings');
                  }
                }}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all group cursor-pointer ${isEditing ? 'bg-accent/10 text-accent' : 'hover:bg-white text-gray-400'}`}
              >
                <Sparkles className={`w-5 h-5 mb-1 ${isEditing ? 'text-accent' : 'group-hover:text-primary'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isEditing ? 'text-accent' : 'text-gray-500'}`}>
                  {isEditing ? '取消编辑' : '编辑'}
                </span>
              </button>
            </>
          )}
        </div>

        {/* Writing Assistant Modal (Inside Right side for width alignment) */}
        <AnimatePresence>
          {assistantStep !== 'none' && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed lg:absolute bottom-0 right-0 w-full bg-white shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-[70] flex flex-col rounded-t-3xl overflow-hidden"
              style={{ height: '61.8%' }}
            >
              {assistantStep === 'settings' && (
                <>
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <h2 className="text-base font-bold text-gray-900">写作助手</h2>
                    </div>
                    <button onClick={() => setAssistantStep('none')} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <p className="text-sm text-gray-500 leading-relaxed">
                      调整下方设置以优化故事内容
                    </p>

                    <div className="space-y-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">故事视角</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {(['first', 'third', 'cleaned'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setAssistantMode(m)}
                            className={`py-3 px-1 rounded-xl border-2 transition-all text-xs font-bold cursor-pointer ${assistantMode === m ? 'border-accent bg-accent/5 text-accent' : 'border-gray-50 text-gray-400 hover:border-gray-100'
                              }`}
                          >
                            {m === 'first' ? '第一人称' : m === 'third' ? '第三人称' : '整理后的转录稿'}
                          </button>
                        ))}
                      </div>

                      <div className="p-5 bg-accent/5 rounded-xl border border-accent/10 space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-accent uppercase">说明</h4>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {assistantMode === 'first' && "以您的口吻重新叙述故事，增强代入感。"}
                            {assistantMode === 'third' && "以旁观者的视角客观叙述，适合作为传记记录。"}
                            {assistantMode === 'cleaned' && "保留您的原始表达，仅修正语法并移除口头禅。"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-accent uppercase">示例</h4>
                          <p className="text-xs text-gray-500 italic leading-relaxed">
                            {assistantMode === 'first' && "“那天我站在教堂门口，心里充满了喜悦...”"}
                            {assistantMode === 'third' && "“克劳黛特站在教堂门口，她的脸上洋溢着幸福...”"}
                            {assistantMode === 'cleaned' && "“修改前：额...就是...这张照片呢...拍摄于我结婚的那天，修改后：这张照片拍摄于我结婚的那天”"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 space-y-2 shrink-0">
                    <button
                      onClick={async () => {
                        setAssistantStep('none');
                        setIsGenerating(true);
                        try {
                          // Real AI optimization!
                          const result = await optimizeStoryContent(editedContent, assistantMode);
                          if (result.title) setEditedTitle(result.title);
                          setEditedContent(result.content);
                          setIsEditing(true);
                          setHasChanges(true);
                        } catch (err) {
                          console.error('AI optimization failed:', err);
                          alert('AI 润色失败，请稍后重试');
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      className="w-full py-3 bg-[#4a7c7c] text-white rounded-xl font-bold text-sm hover:bg-[#3d6666] transition shadow-md cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>生成预览</span>
                    </button>
                    <button
                      onClick={handleReTranscribe}
                      className="w-full py-3 bg-white border border-[#4a7c7c] text-[#4a7c7c] rounded-xl font-bold text-sm hover:bg-accent/5 transition shadow-sm cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>AI 语音识别（重新生成）</span>
                    </button>
                    <div className="flex items-center justify-center py-1">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="px-3 text-[8px] font-bold text-gray-400 uppercase tracking-widest">或</span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    <button
                      onClick={() => {
                        setAssistantStep('none');
                        setIsEditing(true);
                      }}
                      className="w-full py-3 border border-gray-200 bg-white text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition cursor-pointer"
                    >
                      手动编辑故事
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isConfirmCloseModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">未保存的更改</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                您对故事进行了修改，但尚未保存。确定要离开吗？
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsConfirmCloseModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  继续编辑
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-md cursor-pointer"
                >
                  放弃更改
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">删除故事</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                确定要删除这个故事吗？此操作无法撤销。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    try {
                      await databaseService.deleteStory(story.id);
                      setIsDeleteConfirmOpen(false);
                      if (onDelete) onDelete();
                      onClose();
                    } catch (error) {
                      console.error('Delete failed:', error);
                      alert('删除失败，请重试');
                    }
                  }}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-md cursor-pointer"
                >
                  确定删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">分享故事</h3>
                  </div>
                  <button
                    onClick={() => setIsShareModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  将这个故事分享给其他人，让他们也来感受这份珍贵的回忆。
                </p>

                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">故事标题</span>
                  </div>
                  <p className="text-sm font-serif text-gray-800">{story.title}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-500 truncate font-mono">
                    {getShareLink()}
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(getShareLink());
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 3000);
                    }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm cursor-pointer ${linkCopied
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-primary text-white hover:bg-primary/90 active:scale-95'
                      }`}
                  >
                    {linkCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {linkCopied ? '已复制' : '复制链接'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
