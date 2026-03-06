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
import { Story, Prompt, ProjectMember, StoryInteraction } from '../types';
import { databaseService } from '../services/databaseService';
import { transcribeMedia, optimizeStoryContent } from '../services/aiService';
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

  const [interactions, setInteractions] = useState<StoryInteraction[]>([]);
  const [projectInteractionsCount, setProjectInteractionsCount] = useState(0);
  const [isInteractionPopoverOpen, setIsInteractionPopoverOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [interactionHistory, setInteractionHistory] = useState<(StoryInteraction & { storyTitle: string })[]>([]);
  const [selectedReactions, setSelectedReactions] = useState<string[]>([]);
  const [isSubmittingInteraction, setIsSubmittingInteraction] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

  useEffect(() => {
    const isTranscribingNow = editedContent.includes('AI 正在记录你的心声');
    setIsTranscribing(isTranscribingNow);

    const isChanged = editedTitle !== story.title || (editedContent.trim() !== (story.content || '').trim() && !isTranscribingNow);
    setHasChanges(isChanged);
  }, [editedTitle, editedContent, story.title, story.content]);

  useEffect(() => {
    setIsEditing(false);
    setHasManuallySaved(false);
    setVideoBlobUrl(null);
    setEditedTitle(story.title);
    setEditedContent(story.content || '');
    setIsTranscribing((story.content || '').includes('AI 正在记录你的心声'));
    setAdditionalImages(story.additionalImages || []);
  }, [story.id]);

  useEffect(() => {
    if (!isEditing && !isGenerating && !isSaving && !hasManuallySaved) {
      setEditedTitle(story.title);
      setEditedContent(story.content || '');
    }
  }, [story.title, story.content, isEditing, isGenerating, isSaving, hasManuallySaved]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (isTranscribing) {
      pollInterval = setInterval(async () => {
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

  useEffect(() => {
    if (mediaRef.current && story.videoUrl) {
      mediaRef.current.load();
    }
  }, [story.videoUrl]);

  // Fetch interactions
  useEffect(() => {
    const fetchInteractions = async () => {
      try {
        const [storyData, projectData] = await Promise.all([
          databaseService.getStoryInteractions(story.id),
          databaseService.getProjectInteractionHistory(story.projectId)
        ]);
        setInteractions(storyData);
        setProjectInteractionsCount(projectData.length);
      } catch (err) {
        console.error('Failed to fetch interactions:', err);
      }
    };
    fetchInteractions();
  }, [story.id, story.projectId]);

  const fetchHistory = async () => {
    try {
      const data = await databaseService.getProjectInteractionHistory(story.projectId);
      setInteractionHistory(data as any);
      setIsHistoryDrawerOpen(true);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const handleInteractionSubmit = async () => {
    if (isSubmittingInteraction) return;

    setIsSubmittingInteraction(true);
    try {
      // If user hasn't liked yet, treat this submission as including a like
      const currentHasUserLiked = interactions.some(i => i.type === 'like');
      if (!currentHasUserLiked) {
        await databaseService.addStoryInteraction(story.id, 'like');
      }

      // Submit any selected reactions
      for (const reaction of selectedReactions) {
        await databaseService.addStoryInteraction(story.id, 'reaction', reaction);
      }

      // Refresh interactions
      const [updatedStory, updatedProject] = await Promise.all([
        databaseService.getStoryInteractions(story.id),
        databaseService.getProjectInteractionHistory(story.projectId)
      ]);
      setInteractions(updatedStory);
      setProjectInteractionsCount(updatedProject.length);

      // Animation and feedback
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 2000);

      setSelectedReactions([]);
      setIsInteractionPopoverOpen(false);
    } catch (err) {
      console.error('Failed to submit interaction:', err);
    } finally {
      setIsSubmittingInteraction(false);
    }
  };

  const handleLike = async () => {
    try {
      await databaseService.addStoryInteraction(story.id, 'like');
      const updated = await databaseService.getStoryInteractions(story.id);
      setInteractions(updated);

      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    } catch (err) {
      console.error('Failed to like:', err);
    }
  };

  const reactionOptions = [
    '故事好感人~🥹',
    '哈哈太有趣了😄',
    '值得借鉴学习🤔',
    'YYDS! 太厉害了😎',
    'Love you❤️',
    '原来如此😯'
  ];

  const hasUserLiked = interactions.some(i => i.type === 'like'); // Simplified check

  const togglePlay = async () => {
    if (!mediaRef.current) return;

    try {
      if (isPlaying) {
        mediaRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = mediaRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
          }).catch(error => {
            console.error("Playback failed:", error);
          });
        }
      }
    } catch (err) {
      console.error('Toggle play error:', err);
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

  const formatMediaTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mediaRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    mediaRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await databaseService.updateStory(story.id, {
        title: editedTitle,
        content: editedContent
      });
      setIsEditing(false);
      setHasManuallySaved(true);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Save failed:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseClick = () => {
    if (hasChanges) {
      setIsConfirmCloseModalOpen(true);
    } else {
      onClose();
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const uploadPromises = Array.from(files).map((file: File) => {
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `stories/${story.id}/${fileName}`;
        return databaseService.uploadMedia(file, filePath);
      });
      const urls = await Promise.all(uploadPromises);

      const newImages = [...additionalImages, ...urls];
      await databaseService.updateStory(story.id, {
        additionalImages: newImages
      });

      setAdditionalImages(newImages);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('上传失败，请重试');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getShareLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/story/${story.id}`;
  };

  const handleReTranscribe = async () => {
    setIsGenerating(true);
    setIsReTranscribing(true);
    setTranscriptionError(null);
    setAssistantStep('none');

    try {
      const blob = await databaseService.downloadMedia(story.videoUrl!);
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(blob);
      const base64Data = await base64Promise;

      const transcriptionText = await transcribeMedia(base64Data, blob.type);

      await databaseService.updateStory(story.id, {
        content: transcriptionText
      });

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
      setIsReTranscribing(false);
    }
  };

  const handleRetryASR = () => {
    handleReTranscribe();
  };

  const isASRFailure = (editedContent || '').includes('语音识别未成功');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[60] flex items-center justify-center p-0"
    >
      <div className="w-full h-full bg-stone-950 shadow-2xl flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Video/Media Display */}
        <div className="basis-auto lg:basis-[60%] shrink-0 bg-black relative overflow-hidden group">
          <div className="w-full aspect-video lg:h-full lg:aspect-auto flex items-center justify-center bg-black">
            <div className="absolute top-4 lg:top-6 left-4 lg:left-8 z-10">
              <p className="text-white/60 text-[10px] lg:text-xs font-medium uppercase tracking-widest">录制于 {story.date}</p>
            </div>

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
                  onError={async (e) => {
                    const error = (e.target as any).error;
                    if (error?.code === 4 && !videoBlobUrl && story.videoUrl) {
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
                    src={(story.imageUrl || (story.additionalImages && story.additionalImages.length > 0 ? story.additionalImages[0] : '')) || (story.type === 'audio' ? '/audio_cover.png' : '')}
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
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-20">
                      <audio
                        key={story.videoUrl}
                        ref={mediaRef as React.RefObject<HTMLAudioElement>}
                        src={story.videoUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                        controls
                        className="w-full opacity-60 hover:opacity-100 transition-opacity rounded-full bg-white/20 backdrop-blur-md"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

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
        <div className="w-full lg:basis-[40%] bg-white flex flex-col flex-1 lg:h-full shadow-2xl relative">
          <div className="px-4 py-2 lg:px-6 lg:py-4 flex justify-between items-center border-b border-gray-100 shrink-0">
            <div className="flex-1 flex items-center overflow-x-auto scrollbar-hide space-x-2 mr-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-md border-2 border-accent/20 overflow-hidden shrink-0 shadow-sm cursor-pointer">
                {story.imageUrl || story.type === 'audio' ? (
                  <img
                    src={story.imageUrl || '/audio_cover.png'}
                    alt="主图"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
                    <Play className="w-3 h-3" />
                  </div>
                )}
              </div>

              {additionalImages.map((url, idx) => (
                <div
                  key={idx}
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-md border border-gray-100 hover:border-accent transition-all overflow-hidden shrink-0 cursor-pointer"
                >
                  <img src={url} alt={`图片 ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-md bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
              </button>
            </div>

            <div className="flex items-center space-x-1 lg:space-x-2">
              {!isEditing && (
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                  >
                    <MoreHorizontal className="w-5 h-5 text-gray-400" />
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
                          className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2 overflow-hidden"
                        >
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              fetchHistory();
                            }}
                            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer"
                          >
                            <Heart className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                            <span>互动记录</span>
                          </button>

                          <div className="h-px bg-gray-100 my-1" />

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
              <button
                onClick={handleCloseClick}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className={`flex-1 ${isEditing ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'} px-6 py-4 lg:p-10 space-y-4 lg:space-y-8 relative`}>
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

            {!isEditing && !isGenerating && !isSaving && (
              <div className="absolute top-4 right-4 lg:top-8 lg:right-10 z-20 flex items-center space-x-1">
                {/* Redundant history button removed here as per user request */}
              </div>
            )}

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
                      {transcriptionError && (
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
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="p-4 lg:p-8 border-t border-gray-100 grid grid-cols-4 gap-3 shrink-0 bg-gray-50/50">
            {isEditing ? (
              <>
                <div className="col-span-2" />
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex flex-col items-center justify-center p-2 lg:p-3 border border-gray-200 text-gray-500 rounded-xl hover:bg-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5 lg:w-6 lg:h-6 mb-1 lg:mb-1.5" />
                  <span className="text-[11px] lg:text-[12px] font-bold uppercase tracking-wider">取消</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex flex-col items-center justify-center p-2 lg:p-3 bg-accent text-white rounded-xl shadow-md hover:bg-teal-700 transition-all group cursor-pointer"
                >
                  <Save className="w-5 h-5 lg:w-6 lg:h-6 mb-1 lg:mb-1.5" />
                  <span className="text-[11px] lg:text-[12px] font-bold uppercase tracking-wider">保存</span>
                </button>
              </>
            ) : (
              <>
                <div className="relative">
                  <button
                    onClick={() => setIsInteractionPopoverOpen(!isInteractionPopoverOpen)}
                    className="flex flex-col items-center justify-center p-2 lg:p-3 hover:bg-white rounded-xl transition-all group cursor-pointer w-full"
                  >
                    <Heart className={`w-5 h-5 lg:w-6 lg:h-6 ${hasUserLiked ? 'text-red-400 fill-red-400' : 'text-gray-400 group-hover:text-red-500'} mb-1 lg:mb-1.5`} />
                    <span className="text-[11px] lg:text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                      互动 {projectInteractionsCount > 0 && `(${projectInteractionsCount})`}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isInteractionPopoverOpen && (
                      <>
                        <div className="fixed inset-0 z-[80]" onClick={() => setIsInteractionPopoverOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute bottom-full left-0 mb-4 w-64 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.16)] z-[90] p-4 border border-gray-100"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-800">发送互动</h3>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {reactionOptions.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => {
                                  setSelectedReactions(prev =>
                                    prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt]
                                  );
                                }}
                                className={`px-4 py-2.5 rounded-xl text-left text-sm transition-all border ${selectedReactions.includes(opt)
                                  ? 'bg-accent/10 border-accent text-accent font-medium'
                                  : 'bg-white border-gray-100 text-gray-600 hover:border-accent hover:bg-accent/5'
                                  }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={handleInteractionSubmit}
                            disabled={isSubmittingInteraction || (selectedReactions.length === 0 && hasUserLiked)}
                            className={`w-full mt-4 py-3 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center space-x-2 border ${hasUserLiked
                              ? 'bg-gray-100 border-transparent text-gray-500 cursor-default'
                              : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
                              }`}
                          >
                            {isSubmittingInteraction ? (
                              <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }}
                              >
                                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                              </motion.div>
                            ) : (
                              <>
                                <div className="flex items-center space-x-2">
                                  <Heart className={`w-4 h-4 ${hasUserLiked ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
                                  <span className={hasUserLiked ? 'text-gray-500' : 'text-black'}>点赞</span>
                                </div>
                                {showHeartAnimation && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: [0, 1.5, 0], y: -20 }}
                                    className="text-red-500"
                                  >
                                    ❤️
                                  </motion.div>
                                )}
                              </>
                            )}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex flex-col items-center justify-center p-2 lg:p-3 hover:bg-white rounded-xl transition-all group cursor-pointer"
                >
                  <Share2 className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400 group-hover:text-primary mb-1 lg:mb-1.5" />
                  <span className="text-[11px] lg:text-[12px] font-bold text-gray-500 uppercase tracking-wider">分享</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="flex flex-col items-center justify-center p-2 lg:p-3 hover:bg-white rounded-xl transition-all group disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingPhoto ? (
                    <RefreshCw className="w-5 h-5 lg:w-6 lg:h-6 text-accent animate-spin mb-1 lg:mb-1.5" />
                  ) : (
                    <Plus className="w-5 h-5 lg:w-6 lg:h-6 text-gray-400 group-hover:text-primary mb-1 lg:mb-1.5" />
                  )}
                  <span className="text-[11px] lg:text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                    {isUploadingPhoto ? '上传中' : '相册'}
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
                  className={`flex flex-col items-center justify-center p-2 lg:p-3 rounded-xl transition-all group cursor-pointer ${isEditing ? 'bg-accent/10 text-accent' : 'hover:bg-white text-gray-400'}`}
                >
                  <Sparkles className={`w-5 h-5 lg:w-6 lg:h-6 mb-1 lg:mb-1.5 ${isEditing ? 'text-accent' : 'group-hover:text-primary'}`} />
                  <span className={`text-[11px] lg:text-[12px] font-bold uppercase tracking-wider ${isEditing ? 'text-accent' : 'text-gray-500'}`}>
                    编辑
                  </span>
                </button>
              </>
            )}
          </div>

          <AnimatePresence>
            {assistantStep !== 'none' && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed lg:absolute bottom-0 right-0 w-full bg-white shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-[70] flex flex-col rounded-t-3xl overflow-hidden"
                style={{ height: '69%' }}
              >
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
                          className={`py-3 px-1 rounded-xl border-2 transition-all text-xs font-bold cursor-pointer ${assistantMode === m ? 'border-accent bg-accent/5 text-accent' : 'border-gray-50 text-gray-400 hover:border-gray-100'}`}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">分享故事</h3>
                <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 truncate">
                  {getShareLink()}
                </div>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(getShareLink());
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 3000);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 cursor-pointer"
                >
                  {linkCopied ? '已复制' : '复制链接'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHistoryDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[110] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="bg-accent/10 p-1.5 rounded-lg">
                    <History className="w-4 h-4 text-accent" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">互动记录</h2>
                </div>
                <button
                  onClick={() => setIsHistoryDrawerOpen(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                {interactionHistory.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Users className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-gray-400 text-sm">暂无互动记录，邀请家人一起参与吧</p>
                  </div>
                ) : (
                  interactionHistory.map((item) => (
                    <div key={item.id} className="flex space-x-4">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center text-accent font-bold">
                        {item.userAvatar ? (
                          <img src={item.userAvatar} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          item.userName.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex justify-between items-baseline">
                          <h4 className="font-bold text-gray-800 flex items-center space-x-2">
                            <span>{item.userName}</span>
                            <span className="text-[10px] font-normal px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </h4>
                        </div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100">
                          {item.type === 'like' ? (
                            <div className="flex items-center space-x-2 text-red-500">
                              <Heart className="w-4 h-4 fill-red-500" />
                              <span className="text-sm font-medium">点亮了红心</span>
                            </div>
                          ) : (
                            <p className="text-gray-600 text-sm leading-relaxed">{item.content}</p>
                          )}
                          <p className="text-[10px] text-gray-300 mt-2">互动于: {item.storyTitle}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div >
  );
}
