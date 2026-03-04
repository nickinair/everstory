import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Upload, Image as ImageIcon, Video, X, Wand2, Save, Loader2 } from 'lucide-react';
import { generateStoryFromMedia, transcribeMedia } from '../services/geminiService';
import { databaseService } from '../services/databaseService';

interface AddStoryViewProps {
  projectId: string;
  onBack: () => void;
  onSave: (story: any) => void;
}

export default function AddStoryView({ projectId, onBack, onSave }: AddStoryViewProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    }
  };

  const handleGenerateAI = async () => {
    if (!mediaPreview || !mediaFile) return;

    setIsGenerating(true);
    setContent('AI 正在由视频生成文字...');
    try {
      const base64Data = mediaPreview.split(',')[1];

      if (mediaType === 'video') {
        const text = await transcribeMedia(base64Data, mediaFile.type);
        if (text) setContent(text);
      } else {
        const result = await generateStoryFromMedia(base64Data, mediaFile.type);
        if (result) {
          if (result.title) setTitle(result.title);
          if (result.content) setContent(result.content);
        }
      }
    } catch (error) {
      console.error('AI Recognition error:', error);
      alert('AI 识别失败，请重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !mediaFile) {
      alert('请填写标题并上传媒体文件');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = '';
      let videoUrl = '';

      if (mediaType === 'video') {
        const timestamp = Date.now();
        // 1. Upload Video
        videoUrl = await databaseService.uploadMedia(mediaFile, `projects/${projectId}/stories/video_${timestamp}_${mediaFile.name}`);

        // 2. Capture and Upload Thumbnail
        try {
          const thumbnailBlob = await captureVideoThumbnail(mediaFile);
          if (thumbnailBlob) {
            const thumbFile = new File([thumbnailBlob], `thumb_${timestamp}.jpg`, { type: 'image/jpeg' });
            finalImageUrl = await databaseService.uploadMedia(thumbFile, `projects/${projectId}/stories/thumbs/thumb_${timestamp}.jpg`);
          }
        } catch (thumbError) {
          console.error('Failed to capture video thumbnail:', thumbError);
        }

        // Fallback: if thumbnail failed, use video URL as placeholder (though not ideal)
        if (!finalImageUrl) finalImageUrl = videoUrl;
      } else {
        // Just upload image
        finalImageUrl = await databaseService.uploadMedia(mediaFile, `projects/${projectId}/stories`);
      }

      // 3. Create Story
      const newStory = await databaseService.createStory(projectId, {
        title,
        content: content,
        imageUrl: finalImageUrl,
        videoUrl: videoUrl || undefined,
        type: mediaType === 'video' ? 'video' : 'audio',
      });

      alert('故事保存成功！');
      onSave(newStory);
    } catch (error: any) {
      console.error('Error saving story:', error);
      alert(`保存失败: ${error.message || '请稍后重试'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="px-4 lg:px-8 py-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">添加新故事</h1>
            <p className="text-xs text-gray-500 mt-1">讲述人可以通过手动输入完成故事编辑</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center space-x-2 px-6 py-2 bg-accent hover:bg-teal-700 text-white rounded-full font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{loading ? '保存中...' : '保存故事'}</span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Media Upload */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">上传媒体</h2>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-[4/3] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${mediaPreview ? 'border-accent' : 'border-gray-200 hover:border-accent hover:bg-accent/5'
                  }`}
              >
                {mediaPreview ? (
                  <>
                    {mediaType === 'video' ? (
                      <video
                        src={mediaPreview}
                        className="w-full h-full object-cover"
                        controls={false}
                      />
                    ) : (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMediaFile(null);
                        setMediaPreview(null);
                        setMediaType(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium mb-1">点击或拖拽上传</p>
                    <p className="text-xs text-gray-400">支持图片或视频文件</p>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
              </div>

              <div className="mt-6">
                <button
                  onClick={handleGenerateAI}
                  disabled={!mediaPreview || isGenerating}
                  className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all ${mediaPreview
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-md'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Wand2 className="w-5 h-5" />
                  )}
                  <span>{isGenerating ? 'AI 识别中...' : 'AI 语音识别'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Story Details */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">故事标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="给您的故事起个名字..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">故事内容</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="在这里记录您的回忆..."
                  rows={12}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-accent outline-none transition-all resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
