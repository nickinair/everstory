import { useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Edit2, List, Trash2, RefreshCw, Star, AlertCircle, Plus, Minus, Download, Printer, MoreVertical, Video, Mic, GripVertical, AlertTriangle, BookOpen } from 'lucide-react';
import { Story } from '../types';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { databaseService } from '../services/databaseService';

type Step = 'cover' | 'review' | 'preview' | 'addons' | 'order' | 'complete';

interface StoryListItemProps {
  key?: string | number;
  story: Story;
  idx: number;
  isExcluded: boolean;
  isLowRes: boolean;
  itemNumber: string;
  onToggleExclude: (id: string) => void;
  includedStories: Story[];
}

function StoryListItem({ story, idx, isExcluded, isLowRes, itemNumber, onToggleExclude, includedStories }: StoryListItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      key={story.id}
      value={story}
      dragListener={false}
      dragControls={dragControls}
      className={`group flex gap-4 p-4 rounded-xl transition-colors duration-200 items-center ${isExcluded ? 'opacity-40 bg-gray-50' : 'hover:bg-white border border-transparent hover:border-gray-100 shadow-sm hover:shadow-md'
        }`}
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1"
      >
        <GripVertical className="w-5 h-5 pointer-events-none" />
      </div>
      <div className="text-gray-300 text-2xl font-light w-10 text-right">
        {itemNumber}
      </div>

      <div className="h-16 w-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative border border-gray-200">
        {story.type === 'video' ? (
          <>
            {story.imageUrl ? (
              <img src={story.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
            ) : (
              <video src={`${story.videoUrl}#t=0.001`} className="w-full h-full object-cover" muted />
            )}
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
              <Video className="w-4 h-4 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full relative">
            <img
              src={story.imageUrl || (story.type === 'audio' ? '/audio_cover.png' : '')}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              alt=""
            />
            {story.type === 'audio' && (
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center">
                <Mic className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        )}

        {isLowRes && !isExcluded && (
          <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm">
            <AlertTriangle className="w-3 h-3" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm lg:text-base font-semibold text-gray-900 truncate">{story.title}</h3>
          {isLowRes && !isExcluded && (
            <span className="text-[10px] text-red-500 font-medium bg-red-50 px-1.5 py-0.5 rounded flex items-center">
              <AlertTriangle className="w-2.5 h-2.5 mr-1" /> 分辨率过低
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">{story.pages || 1} 页 · 录制于 {story.date}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onToggleExclude(story.id)}
          className={`p-2 transition-colors rounded-lg ${isExcluded ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
          title={isExcluded ? "重新包含" : "从书中排除"}
        >
          {isExcluded ? <Plus className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
        </button>
      </div>
    </Reorder.Item>
  );
}

export default function OrderBookView({ projectId, stories, hasOrder, onShowUpgrade, onComplete, onBack }: { projectId: string; stories: Story[]; hasOrder?: boolean; onShowUpgrade?: (type: 'order-required') => void; onComplete?: () => void, onBack?: () => void }) {
  const [step, setStep] = useState<Step>('cover');
  const [bookTitle, setBookTitle] = useState('我的一生故事');
  const [bookSubtitle, setBookSubtitle] = useState(''); // Optional subtitle
  const [bookAuthor, setBookAuthor] = useState('克劳黛特 • 格林');
  const [coverImageUrl, setCoverImageUrl] = useState('https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY');
  const [coverColor, setCoverColor] = useState('#e8dcdc');
  const [includeEbook, setIncludeEbook] = useState(true);
  const [includeExtraHardcover, setIncludeExtraHardcover] = useState(false);
  const [hardcoverQuantity, setHardcoverQuantity] = useState(1);
  const [isConfirmBackModalOpen, setIsConfirmBackModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);

  const colors = [
    { id: 'slate', value: '#374e50', name: '石板青', contrast: 'light' },
    { id: 'navy', value: '#1e2373', name: '深海蓝', contrast: 'light' },
    { id: 'blue', value: '#a7c0de', name: '浅天蓝', contrast: 'dark' },
    { id: 'rose', value: '#e8dcdc', name: '腮红粉', contrast: 'dark' },
    { id: 'cream', value: '#fcf8d9', name: '奶油黄', contrast: 'dark' },
  ];

  const currentColor = colors.find(c => c.value === coverColor) || colors[3];
  const textColor = currentColor.contrast === 'light' ? 'text-white' : 'text-gray-800';
  const mutedTextColor = currentColor.contrast === 'light' ? 'text-gray-300' : 'text-gray-600';
  const spineTextColor = currentColor.contrast === 'light' ? 'text-white' : 'text-gray-800';

  const [orderedStories, setOrderedStories] = useState<Story[]>(stories);
  const [excludedStoryIds, setExcludedStoryIds] = useState<Set<string>>(new Set());
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const includedStories = orderedStories.filter(s => !excludedStoryIds.has(s.id));

  // Mock resolution check - in a real app this would check metadata or image specs
  const hasLowResIssue = includedStories.some(s => s.metadata?.lowRes || (s.title.length > 50 && Math.random() > 0.8));

  const basePrice = 399;
  const ebookPrice = includeEbook ? 59 : 0;
  const hardcoverUnitPrice = 79;
  const extraHardcoverPrice = includeExtraHardcover ? hardcoverQuantity * hardcoverUnitPrice : 0;
  const totalPrice = basePrice + ebookPrice + extraHardcoverPrice;

  const handleBackClick = () => {
    setIsConfirmBackModalOpen(true);
  };

  const confirmBack = () => {
    setIsConfirmBackModalOpen(false);
    onBack?.();
  };

  const steps = [
    { id: 'cover', label: '1. 设计封面' },
    { id: 'review', label: '2. 审核故事' },
    { id: 'preview', label: '3. 预览书籍' },
    { id: 'addons', label: '4. 更多定制' },
    { id: 'order', label: '5. 订单详情' },
    { id: 'complete', label: '6. 完成' },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 lg:px-8 pt-4 lg:pt-8 pb-4 bg-background-light shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center">
            {onBack && (
              <button
                onClick={handleBackClick}
                className="mr-6 p-2 hover:bg-gray-200 rounded-full transition-colors group"
                title="返回"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
              </button>
            )}
            <h1 className="text-2xl lg:text-3xl font-light text-gray-800 whitespace-nowrap">我的订单</h1>
          </div>

          <div className="hidden lg:flex items-center space-x-12 text-sm ml-auto">
            {steps.map((s, idx) => (
              <div
                key={s.id}
                onClick={() => {
                  if (!hasOrder && idx >= 3 && onShowUpgrade) {
                    onShowUpgrade('order-required');
                    return;
                  }
                  setStep(s.id as Step);
                }}
                className={`flex flex-col relative group cursor-pointer transition-colors ${step === s.id ? 'text-gray-800 font-medium' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                <span className="mb-3 whitespace-nowrap">{s.label}</span>
                <div className={`h-1.5 w-[140%] -left-[20%] rounded-full absolute -bottom-1 transition-colors ${step === s.id ? 'bg-primary' : 'bg-gray-200 group-hover:bg-gray-300'
                  }`}></div>
              </div>
            ))}
          </div>

          <div className="lg:hidden flex items-center justify-between w-full">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500 font-medium mb-1">步骤 {steps.findIndex(s => s.id === step) + 1} / {steps.length}</span>
              <span className="text-sm font-bold text-gray-800">{steps.find(s => s.id === step)?.label.split('. ')[1]}</span>
            </div>
            <div className="flex space-x-1.5">
              {steps.map((s) => (
                <div
                  key={s.id}
                  className={`h-1.5 w-6 rounded-full transition-colors ${step === s.id ? 'bg-primary' : 'bg-gray-200'
                    }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 lg:p-8 pt-6 lg:pt-10 max-w-7xl mx-auto w-full">
        {step === 'cover' && (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            <div className="w-full lg:w-1/3 space-y-6 lg:space-y-8">
              <div>
                <h2 className="text-2xl lg:text-3xl font-light text-gray-800 mb-2 lg:mb-4">定制您的书封</h2>
                <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
                  打造一个像您收集的故事一样独一无二的封面，挑选一种颜色，添加一张特别的照片，并赋予它一个引起共鸣的标题。
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">封面照片</label>
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden border border-gray-200">
                      {coverImageUrl ? (
                        <img
                          src={coverImageUrl}
                          alt="Cover"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50 uppercase text-[10px] text-gray-400 font-bold">
                          无照片
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => setCoverImageUrl(e.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="flex items-center text-sm text-gray-700 hover:text-primary transition-colors"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> 更换照片
                      </button>
                      <button className="flex items-center text-sm text-gray-700 hover:text-primary transition-colors">
                        <Edit2 className="w-3 h-3 mr-1" /> 裁剪照片
                      </button>
                    </div>
                  </div>
                  {coverImageUrl && (
                    <button
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">颜色: <span className="text-gray-500 font-normal">{currentColor.name}</span></label>
                <div className="flex items-center space-x-4">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCoverColor(c.value)}
                      className={`w-10 h-10 rounded-full transition-all ${coverColor === c.value ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:ring-2 hover:ring-offset-2 ring-gray-300'
                        }`}
                      style={{ backgroundColor: c.value }}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">标题</label>
                <div className="relative">
                  <textarea
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    maxLength={12}
                    placeholder="为您的书籍添加一个主标题"
                    className="w-full rounded-xl border-gray-200 text-gray-900 focus:border-primary focus:ring-primary text-lg resize-none p-4 shadow-sm font-serif"
                    rows={2}
                  />
                  <Edit2 className="absolute bottom-3 right-3 text-gray-400 w-4 h-4" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">副标题 <span className="text-gray-400 font-normal ml-1">(可选)</span></label>
                <input
                  type="text"
                  placeholder="为您的书籍添加一个副标题，如：XX的自传"
                  value={bookSubtitle}
                  onChange={(e) => setBookSubtitle(e.target.value)}
                  maxLength={30}
                  className="w-full rounded-xl border-gray-200 text-gray-900 focus:border-primary focus:ring-primary p-4 shadow-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">作者</label>
                <input
                  type="text"
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  className="w-full rounded-xl border-gray-200 text-gray-900 focus:border-primary focus:ring-primary p-4 shadow-sm"
                />
              </div>

              <div className="pt-4 flex gap-4">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="px-8 py-3 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    返回
                  </button>
                )}
                <button
                  onClick={() => setStep('review')}
                  className="flex-1 bg-accent hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-accent/20 transition-all transform active:scale-95 cursor-pointer"
                >
                  下一步
                </button>
              </div>
            </div>

            <div className="w-full lg:w-2/3">
              <h3 className="text-lg lg:text-xl font-light text-gray-800 mb-4">预览</h3>
              <div className="bg-[#f0ede6] rounded-2xl lg:rounded-3xl p-4 lg:p-12 flex items-center justify-center min-h-[400px] lg:min-h-[600px] shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none"></div>
                <div className="relative flex shadow-2xl transform scale-75 sm:scale-90 lg:scale-100 transition-transform duration-500 hover:scale-[1.01]">
                  {/* Spine (now on the left) */}
                  <div
                    className="w-10 relative flex flex-col justify-between items-center py-8 shadow-md rounded-l-sm border-r border-black/5 z-20"
                    style={{ backgroundColor: coverColor, filter: 'brightness(0.9)' }}
                  >
                    <span className={`text-[10px] ${spineTextColor} font-mono rotate-90 whitespace-nowrap opacity-60 text-center`}>2026</span>
                    <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                      <span className={`text-[10px] font-bold ${spineTextColor} [writing-mode:vertical-rl] whitespace-nowrap`}>{bookTitle}</span>
                      <div className="w-px h-6 bg-current opacity-20"></div>
                      <span className={`text-[10px] font-bold ${spineTextColor} [writing-mode:vertical-rl] whitespace-nowrap opacity-80`}>{bookAuthor}</span>
                    </div>
                    <div className="w-3 h-3 rounded-full bg-black/10"></div>
                  </div>

                  {/* Front Cover */}
                  <div
                    className="w-[450px] aspect-[3/4] relative p-12 flex flex-col items-center text-center shadow-lg rounded-r-sm overflow-hidden"
                    style={{ backgroundColor: coverColor }}
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/canvas-orange.png')] opacity-10 mix-blend-multiply pointer-events-none"></div>
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-10"></div>

                    {/* Title Area - Fixed Height to prevent shifting */}
                    <div className="h-40 flex flex-col items-center justify-center w-full z-10 px-4">
                      <h1 className={`${bookTitle.length > 12
                        ? 'text-2xl lg:text-3xl'
                        : bookTitle.length > 8
                          ? 'text-3xl lg:text-4xl'
                          : 'text-4xl lg:text-5xl'
                        } font-serif ${textColor} tracking-wide leading-tight whitespace-nowrap`}>
                        {bookTitle}
                      </h1>

                      {bookSubtitle ? (
                        <p className={`text-sm lg:text-base font-serif ${mutedTextColor} italic mt-4 whitespace-nowrap`}>
                          {bookSubtitle}
                        </p>
                      ) : (
                        <div className="h-6"></div> // Spacer to keep vertical balance
                      )}
                    </div>

                    <div className={`w - 12 h - px bg - current opacity - 30 ${textColor} mb - 8`}></div>

                    {/* Photo Container */}
                    <div className="w-64 h-64 bg-white p-3 shadow-sm z-10 mb-auto relative">
                      <div className="w-full h-full bg-gray-50 overflow-hidden relative flex items-center justify-center">
                        {coverImageUrl ? (
                          <img
                            src={coverImageUrl}
                            alt="Cover"
                            className="w-full h-full object-cover grayscale opacity-90"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-gray-300 font-serif italic text-sm">暂无照片</div>
                        )}
                        <div className="absolute inset-0 border-4 border-white/50 pointer-events-none"></div>
                      </div>
                    </div>

                    {/* Author */}
                    <p className={`text-sm font-medium ${textColor} tracking-widest mt-12 z-10 uppercase`}>
                      {bookAuthor} <span className="text-xs opacity-60 ml-px">著</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            <div className="lg:w-1/3 flex-shrink-0 space-y-4 lg:space-y-6">
              <h2 className="text-2xl lg:text-3xl font-light text-gray-800">查看并排序您的故事</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                上下拖动故事以更改顺序，或排除您不想放入书中的任何内容。
              </p>
              <p className="text-sm text-gray-700 font-medium">
                已包含 {stories.length} 个故事中的 {includedStories.length} 个
              </p>
              {hasLowResIssue && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="text-orange-600 w-5 h-5 flex-shrink-0" />
                    <div className="text-sm text-orange-800 space-y-2">
                      <p className="font-bold">我们发现了潜在的打印问题</p>
                      <p>部分故事中的图片分辨率过低，可能会影响印刷质量。请检查标记有警告图标的故事。</p>
                      <p>请参阅我们的 <a className="underline hover:text-orange-900" href="#">常见问题解答</a> 以获取更多信息。</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep('cover')} className="flex-1 px-6 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition font-bold text-sm cursor-pointer border-solid">
                  上一步
                </button>
                <button onClick={() => setStep('preview')} className="flex-2 px-6 py-3 bg-accent hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-accent/20 transition font-bold text-sm cursor-pointer">
                  下一步
                </button>
              </div>
            </div>

            {orderedStories.length > 0 ? (
              <Reorder.Group axis="y" values={orderedStories} onReorder={setOrderedStories} className="lg:w-2/3 flex-1 space-y-4">
                {orderedStories.map((story, idx) => {
                  const isExcluded = excludedStoryIds.has(story.id);
                  const isLowRes = story.metadata?.lowRes || (story.title.length > 50 && idx === 1);
                  const itemNumber = isExcluded ? '--' : (includedStories.findIndex(s => s.id === story.id) + 1).toString().padStart(2, '0');

                  return (
                    <StoryListItem
                      key={story.id}
                      story={story}
                      idx={idx}
                      isExcluded={isExcluded}
                      isLowRes={isLowRes}
                      itemNumber={itemNumber}
                      onToggleExclude={(id) => {
                        const next = new Set(excludedStoryIds);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        setExcludedStoryIds(next);
                      }}
                      includedStories={includedStories}
                    />
                  );
                })}
              </Reorder.Group>
            ) : (
              <div className="lg:w-2/3 flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <BookOpen className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">暂无故事内容</h3>
                <p className="text-gray-400 text-center max-w-sm leading-relaxed">
                  您还没有添加任何故事。快去记录您的第一篇回忆，开启您的传记之旅吧。
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && (() => {
          // Build virtual pages: split story content across fixed-height pages
          const CHARS_FIRST_PAGE = 200;
          const CHARS_PER_PAGE = 500;
          const defaultText = "这是在那年夏天发生的一个难忘的故事。那天阳光明媚，微风徐徐，我们聚集在老家的庭院里。爷爷正坐在那一如既往地摇椅上，那是他最喜欢的位置。他清了清嗓子，开始缓缓地诉说着那些尘封已久的往事。回想起那个场景，每一个细节都如此清晰。那是关于勇气、爱和传承的故事。尽管时光流转，但这些记忆通过声音和文字被永久地镌刻在了这本书的篇章之中。那些年月里发生的事，如今想来依然让人感慨万千。";

          type PreviewPage =
            | { type: 'title' }
            | { type: 'chapter-start'; story: Story; chapterNum: number; textSlice: string }
            | { type: 'chapter-cont'; story: Story; chapterNum: number; textSlice: string };

          const pages: PreviewPage[] = [{ type: 'title' }];
          includedStories.forEach((story, idx) => {
            const fullText = story.content || defaultText;
            const chapterNum = idx + 1;
            pages.push({ type: 'chapter-start', story, chapterNum, textSlice: fullText.slice(0, CHARS_FIRST_PAGE) });
            let offset = CHARS_FIRST_PAGE;
            while (offset < fullText.length) {
              pages.push({ type: 'chapter-cont', story, chapterNum, textSlice: fullText.slice(offset, offset + CHARS_PER_PAGE) });
              offset += CHARS_PER_PAGE;
            }
          });

          const totalPages = pages.length;
          const safeIdx = Math.min(previewPageIndex, totalPages - 1);
          const currentPage = pages[safeIdx];

          return (
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
              <div className="w-full lg:w-1/3 lg:max-w-md flex flex-col pt-4">
                <h2 className="text-2xl lg:text-3xl font-light text-gray-800 mb-4 lg:mb-6">预览您的书</h2>
                <div className="bg-white/50 border border-gray-100 rounded-2xl p-6 mb-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-end pb-2 border-b border-gray-50">
                    <span className="text-sm text-gray-400">总计页数</span>
                    <span className="text-xl font-bold text-gray-800">{totalPages} 页</span>
                  </div>
                  <div className="flex justify-between items-end pb-2 border-b border-gray-50">
                    <span className="text-sm text-gray-400">故事数量</span>
                    <span className="text-xl font-bold text-gray-800">{includedStories.length} 个故事</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed italic pt-2">
                    "请检查您的书籍内容以确认故事和顺序。您的书内容已自动根据您选择的故事生成排版。"
                  </p>
                </div>
                <a className="text-gray-500 hover:text-gray-700 underline text-sm mb-10 block w-fit" href="#">
                  了解更多关于打印和扫码逻辑
                </a>
                <div className="flex gap-4 mt-auto mb-12">
                  <button onClick={() => setStep('review')} className="flex-1 px-8 py-3 bg-white border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors font-bold text-sm cursor-pointer">
                    上一步
                  </button>
                  <button
                    onClick={() => {
                      if (!hasOrder && onShowUpgrade) {
                        onShowUpgrade('order-required');
                      } else {
                        setStep('addons');
                      }
                    }}
                    className="flex-2 px-8 py-3 bg-accent hover:bg-teal-700 text-white rounded-xl shadow-lg shadow-accent/20 transition-colors font-bold text-sm cursor-pointer"
                  >
                    下一步
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-[#2d2d2d] rounded-lg shadow-xl overflow-hidden flex flex-col h-[600px] lg:h-[750px]">
                {/* PDF Header Controls */}
                <div className="h-auto lg:h-12 bg-[#333] flex flex-col lg:flex-row items-center p-2 lg:px-4 justify-between text-gray-300 border-b border-[#444] space-y-2 lg:space-y-0 shrink-0">
                  <div className="flex items-center gap-4 w-full lg:w-auto">
                    <List className="w-4 h-4 cursor-pointer hover:text-white" />
                    <span className="font-medium text-xs lg:text-sm text-white truncate">{bookTitle}_preview.pdf</span>
                  </div>
                  <div className="flex items-center justify-between w-full lg:w-auto gap-4">
                    <div className="flex items-center gap-2 bg-[#222] rounded px-2 py-1">
                      <button
                        onClick={() => setPreviewPageIndex(prev => Math.max(0, prev - 1))}
                        disabled={previewPageIndex === 0}
                        className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <span className="bg-[#444] text-white text-xs px-2 py-0.5 rounded leading-none flex items-center justify-center min-w-[20px]">{safeIdx + 1}</span>
                      <button
                        onClick={() => setPreviewPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                        disabled={safeIdx === totalPages - 1}
                        className="text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowLeft className="w-3 h-3 rotate-180" />
                      </button>
                      <span className="text-xs text-gray-400">/ {totalPages}</span>
                    </div>
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="hidden sm:flex items-center gap-2 border-r border-[#444] pr-4">
                        <Minus className="w-4 h-4 cursor-pointer hover:text-white" />
                        <span className="text-xs bg-[#222] px-2 py-0.5 rounded">100%</span>
                        <Plus className="w-4 h-4 cursor-pointer hover:text-white" />
                      </div>
                      <Download className="w-4 h-4 cursor-pointer hover:text-white" />
                      <Printer className="hidden sm:block w-4 h-4 cursor-pointer hover:text-white" />
                    </div>
                  </div>
                </div>

                {/* PDF Inner Workspace */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Thumbnails Sidebar */}
                  <div className="hidden sm:flex w-48 bg-[#333] border-r border-[#444] overflow-y-auto py-4 px-4 flex-col gap-4">
                    {pages.map((page, pageIdx) => (
                      <div key={pageIdx} onClick={() => setPreviewPageIndex(pageIdx)} className="flex flex-col items-center gap-2 cursor-pointer group">
                        <div className={`w-full aspect-[3/4] bg-white shadow-lg transition-all relative overflow-hidden flex flex-col ${safeIdx === pageIdx ? 'ring-2 ring-blue-500' : 'opacity-60 group-hover:opacity-100'}`}>
                          {page.type === 'title' ? (
                            <div className="w-full h-full border border-gray-100 flex flex-col items-center justify-center p-1 text-center">
                              <div className="w-full h-1 bg-gray-100 mb-1"></div>
                              <span className="text-[6px] text-gray-400 line-clamp-2 uppercase font-bold">{bookTitle}</span>
                              <div className="flex-1"></div>
                              <span className="text-[4px] text-gray-300 italic">{bookAuthor}</span>
                            </div>
                          ) : page.type === 'chapter-start' ? (
                            <>
                              <div className="h-1/3 w-full bg-gray-50 flex items-center justify-center border-b border-gray-50 overflow-hidden">
                                {page.story.imageUrl || page.story.videoUrl ? (
                                  <img src={page.story.imageUrl || (page.story.type === 'video' ? `${page.story.videoUrl}#t=0.001` : '')} className="w-full h-full object-cover grayscale opacity-50" alt="" />
                                ) : (<div className="w-full h-full bg-gray-100"></div>)}
                              </div>
                              <div className="p-1 px-2 flex flex-col gap-0.5">
                                <div className="w-2/3 h-1 bg-gray-200"></div>
                                <div className="w-full h-[2px] bg-gray-100"></div>
                                <div className="w-full h-[2px] bg-gray-100"></div>
                                <div className="w-5/6 h-[2px] bg-gray-100"></div>
                              </div>
                            </>
                          ) : (
                            <div className="p-2 flex flex-col gap-1">
                              <div className="w-full h-[2px] bg-gray-100"></div>
                              <div className="w-full h-[2px] bg-gray-100"></div>
                              <div className="w-5/6 h-[2px] bg-gray-100"></div>
                              <div className="w-full h-[2px] bg-gray-100"></div>
                              <div className="w-4/5 h-[2px] bg-gray-100"></div>
                              <div className="w-full h-[2px] bg-gray-100"></div>
                              <div className="w-3/4 h-[2px] bg-gray-100"></div>
                            </div>
                          )}
                        </div>
                        <span className={`text-xs ${safeIdx === pageIdx ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>{pageIdx + 1}</span>
                      </div>
                    ))}
                  </div>

                  {/* Main Page Viewer */}
                  <div className="flex-1 bg-[#525659] overflow-y-auto py-8 px-4 sm:px-8">
                    <div className="bg-white w-full max-w-[550px] mx-auto shadow-2xl relative select-none flex flex-col p-12 lg:p-16" style={{ minHeight: '750px' }}>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg]">
                        <span className="text-8xl font-bold">PREVIEW</span>
                      </div>

                      {currentPage.type === 'title' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-px bg-gray-300 mb-12"></div>
                          <h1 className="font-serif text-3xl lg:text-5xl text-gray-800 mb-4 tracking-tight leading-tight uppercase font-light">
                            {bookTitle || '我的一生故事'}
                          </h1>
                          {bookSubtitle ? (
                            <p className="font-serif text-base lg:text-xl text-gray-500 italic mb-12">{bookSubtitle}</p>
                          ) : (
                            <div className="h-12"></div>
                          )}
                          <div className="flex-1"></div>
                          <div className="w-8 h-px bg-gray-200 mb-8"></div>
                          <p className="font-serif text-lg text-gray-600 tracking-widest uppercase mb-1">{bookAuthor}</p>
                          <p className="font-serif text-[10px] text-gray-400 uppercase tracking-widest italic opacity-60 mt-1">
                            Everstory 长生記 · 2026
                          </p>
                        </div>
                      ) : currentPage.type === 'chapter-start' ? (
                        <div className="flex-1 flex flex-col">
                          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
                            <span className="font-serif text-sm tracking-widest text-gray-400 italic">第 {currentPage.chapterNum} 章</span>
                            <span className="font-serif text-xs text-gray-300 italic">Everstory · {currentPage.story.date}</span>
                          </div>
                          <h2 className="font-serif text-2xl lg:text-3xl text-gray-800 mb-6 leading-snug font-light">{currentPage.story.title}</h2>
                          <div className="w-full aspect-[16/10] bg-gray-50 overflow-hidden mb-8 shadow-sm border border-gray-50 relative">
                            {currentPage.story.imageUrl || currentPage.story.videoUrl ? (
                              <img src={currentPage.story.imageUrl || (currentPage.story.type === 'video' ? `${currentPage.story.videoUrl}#t=0.001` : '')} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 italic text-gray-400">暂无照片</div>
                            )}
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center gap-0.5">
                              <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                <Edit2 className="w-5 h-5 text-gray-300" />
                              </div>
                              <span className="text-[7px] text-gray-500 uppercase tracking-wider font-bold">扫码播放</span>
                            </div>
                          </div>
                          <div className="font-serif text-sm lg:text-base text-gray-700 leading-[1.9] text-justify">
                            <p className="first-letter:text-4xl first-letter:font-serif first-letter:font-light first-letter:mr-2 first-letter:float-left first-letter:text-gray-900 first-letter:leading-none">
                              {currentPage.textSlice}
                            </p>
                          </div>
                          <div className="mt-auto pt-6 flex justify-center border-t border-gray-50">
                            <span className="font-serif text-xs text-gray-400 italic">— {safeIdx + 1} —</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col">
                          <div className="flex justify-between items-center mb-8 pb-3 border-b border-gray-50">
                            <span className="font-serif text-xs tracking-widest text-gray-300 italic">第 {currentPage.chapterNum} 章（续）</span>
                            <span className="font-serif text-xs text-gray-300 italic">{currentPage.story.title}</span>
                          </div>
                          <div className="flex-1 font-serif text-sm lg:text-base text-gray-700 leading-[1.9] text-justify">
                            <p>{currentPage.textSlice}</p>
                          </div>
                          <div className="mt-auto pt-6 flex justify-center border-t border-gray-50">
                            <span className="font-serif text-xs text-gray-400 italic">— {safeIdx + 1} —</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}


        {step === 'addons' && (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 max-w-6xl mx-auto py-4 lg:py-8">
            {/* Left Column: Add-ons */}
            <div className="flex-1 space-y-6 lg:space-y-8">
              <h2 className="text-2xl lg:text-4xl font-light text-gray-800 mb-6 lg:mb-10">更多定制</h2>

              {/* E-book Card */}
              <div className={`p-4 lg:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 lg:gap-6 items-center ${includeEbook ? 'border-accent bg-accent/5' : 'border-gray-100 bg-white hover:border-gray-200'}`} onClick={() => setIncludeEbook(!includeEbook)}>
                <div className="flex items-center w-full sm:w-auto">
                  <input
                    type="checkbox"
                    checked={includeEbook}
                    onChange={() => { }}
                    className="h-5 w-5 text-accent border-gray-300 rounded focus:ring-accent cursor-pointer"
                  />
                  <span className="sm:hidden ml-3 font-bold text-gray-800">添加电子书</span>
                </div>
                <div className="w-24 lg:w-32 h-32 lg:h-40 bg-gray-100 rounded-lg overflow-hidden shadow-md flex-shrink-0">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY"
                    alt="E-book"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800">添加电子书</h3>
                    <div className="text-right">
                      <span className="text-xl font-bold text-gray-900">¥59.00</span>
                      <span className="block text-xs text-gray-400 line-through">¥79.00</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    电子书立减 50%。在任何设备（Kindle、Epub 等）上以数字方式访问您的故事。
                  </p>
                </div>
              </div>

              {/* Hardcover Card */}
              <div className={`p-4 lg:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 lg:gap-6 items-center ${includeExtraHardcover ? 'border-accent bg-accent/5' : 'border-gray-100 bg-white hover:border-gray-200'}`} onClick={() => setIncludeExtraHardcover(!includeExtraHardcover)}>
                <div className="flex items-center w-full sm:w-auto">
                  <input
                    type="checkbox"
                    checked={includeExtraHardcover}
                    onChange={() => { }}
                    className="h-5 w-5 text-accent border-gray-300 rounded focus:ring-accent cursor-pointer"
                  />
                  <span className="sm:hidden ml-3 font-bold text-gray-800">添加精装书</span>
                </div>
                <div className="w-24 lg:w-32 h-32 lg:h-40 flex-shrink-0 relative">
                  <div className="absolute inset-0 bg-gray-200 rounded-lg shadow-md transform rotate-3"></div>
                  <div className="absolute inset-0 bg-gray-100 rounded-lg shadow-md transform -rotate-3"></div>
                  <div className="absolute inset-0 bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY"
                      alt="Hardcover"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1 w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg lg:text-xl font-bold text-gray-800">添加精装书</h3>
                    <div className="text-right">
                      <span className="text-xl font-bold text-gray-900">¥79.00<span className="text-sm font-normal text-gray-500">/本</span></span>
                      <span className="block text-xs text-gray-400 line-through">¥99.00/本</span>
                    </div>
                  </div>
                  <p className="text-xs lg:text-sm text-gray-500 mb-4 leading-relaxed">
                    额外购买精装书立享 8 折优惠。您的订阅中已包含 1 本书。
                  </p>
                  <div className="relative">
                    <select
                      value={hardcoverQuantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setHardcoverQuantity(val);
                        setIncludeExtraHardcover(val > 0);
                      }}
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-accent outline-none cursor-pointer"
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n} 本（额外购买，¥{(n * hardcoverUnitPrice).toFixed(0)}）</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {includeExtraHardcover && (
                    <p className="text-xs text-accent font-medium mt-2">已选 {hardcoverQuantity} 本，小计 ¥{extraHardcoverPrice.toFixed(2)}</p>
                  )}
                </div>
              </div>

              {/* Partnership Section */}
              <div className="pt-8 border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-2 py-1 rounded">新合作伙伴</span>
                  <button className="text-xs text-gray-500 hover:text-gray-800 flex items-center">
                    了解更多 <AlertCircle className="w-3 h-3 ml-1" />
                  </button>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Printer className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">专业设计服务</h4>
                    <p className="text-xs text-gray-500">让我们的专家为您排版和校对，打造完美纪念册。</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex gap-4">
                <button
                  onClick={() => setStep('preview')}
                  className="flex-1 px-8 py-4 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all cursor-pointer"
                >
                  上一步
                </button>
                <button
                  onClick={() => setStep('order')}
                  className="flex-2 px-12 py-4 bg-accent hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-accent/20 transition-all transform active:scale-95 cursor-pointer"
                >
                  下一步
                </button>
              </div>
            </div>

            {/* Right Column: Summary (Reused) */}
            <div className="w-full lg:w-[400px] space-y-8">
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16"></div>

                <div className="relative mb-8 flex justify-center">
                  <div className="relative">
                    <div
                      className="w-48 aspect-[3/4] rounded-sm shadow-2xl transform -rotate-6 relative z-10 overflow-hidden"
                      style={{ backgroundColor: coverColor }}
                    >
                      <div className={`absolute inset-0 bg-black/5 pointer-events-none ${currentColor.contrast === 'light' ? 'bg-white/5' : ''}`}></div>
                      <div className={`p-4 flex flex-col items-center text-center h-full ${textColor}`}>
                        <div className={`w-4 h-px bg-current opacity-30 mb-2 mt-4`}></div>
                        <span className="text-[10px] font-serif leading-tight mb-2 line-clamp-2">{bookTitle}</span>
                        {bookSubtitle && (
                          <span className="text-[6px] font-serif italic opacity-70 mb-2 line-clamp-1">{bookSubtitle}</span>
                        )}
                        <div className="w-20 h-24 bg-white/10 shadow-inner mb-auto overflow-hidden flex items-center justify-center border border-white/10">
                          {coverImageUrl ? (
                            <img
                              src={coverImageUrl}
                              alt=""
                              className="w-full h-full object-cover grayscale opacity-80"
                            />
                          ) : (
                            <span className="text-[8px] opacity-40 italic">No Photo</span>
                          )}
                        </div>
                        <span className="text-[6px] uppercase tracking-widest mb-4 opacity-80">{bookAuthor}</span>
                      </div>
                    </div>
                    <div className="absolute top-4 -right-12 w-24 aspect-[9/19.5] bg-black rounded-2xl shadow-2xl border-2 border-gray-800 overflow-hidden z-20 transform rotate-6">
                      <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY"
                        alt=""
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                        <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                          <div className="w-1/3 h-full bg-white"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-3xl font-light text-gray-800">长生記纪念册</h3>
                  <p className="text-2xl font-bold text-gray-900">总计: ¥{totalPrice.toFixed(2)}</p>

                  <div className="pt-6 space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">包含项目</p>
                    <ul className="space-y-3">
                      {[
                        '1 年无限次提示',
                        `${includeExtraHardcover ? 1 + hardcoverQuantity : 1} 本精装彩色印刷书籍`,
                        '30 天退款保证',
                        includeEbook ? '包含电子书' : null,
                        '全国免费包邮',
                        '永久访问音视频'
                      ].filter(Boolean).map((item) => (
                        <li key={item} className="flex items-center text-sm text-gray-700">
                          <Check className="w-4 h-4 text-accent mr-3 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'order' && (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 max-w-6xl mx-auto py-4 lg:py-8">
            {/* Left Column: Details */}
            <div className="flex-1 space-y-8 lg:space-y-12">
              <div>
                <h2 className="text-2xl lg:text-4xl font-light text-gray-800 mb-6 lg:mb-10">确认您的订单</h2>

                <section className="space-y-4 lg:space-y-6">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <h3 className="text-xl lg:text-2xl font-light text-gray-800">礼品递送详情</h3>
                    <button className="flex items-center text-xs lg:text-sm font-medium text-gray-500 hover:text-primary transition-colors">
                      <span className="mr-1 underline">编辑</span>
                      <Edit2 className="w-3 lg:w-4 h-3 lg:h-4" />
                    </button>
                  </div>
                  <div className="space-y-3 text-gray-700">
                    <p><span className="text-gray-500">讲述人姓名:</span> <span className="font-bold">Kai Ni</span></p>
                    <p><span className="text-gray-500">讲述人邮箱:</span> <span className="font-bold">nk.nickinair@gmail.com</span></p>
                    <p><span className="text-gray-500">讲述人电话:</span> <span className="font-bold">+86 138 3450 8899</span></p>
                    <p><span className="text-gray-500">发送礼品日期:</span> <span className="font-bold">2026年6月1日</span></p>
                    <p><span className="text-gray-500">来自:</span> <span className="font-bold">Kai</span></p>
                    <div className="pt-2">
                      <p className="text-gray-500 mb-2">礼品留言:</p>
                      <p className="bg-gray-50 p-4 rounded-xl text-sm leading-relaxed italic border border-gray-100">
                        "我送你这份长生記，是为了让我们能记录下你最精彩的故事。只需开口分享你的回忆——无需动笔！我们将共同创造一本捕捉你声音和记忆的生命之书，代代相传。"
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-6 mt-12">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                    <h2 className="text-3xl font-light text-gray-800 mb-4">我的订单摘要</h2>
                    <button className="flex items-center text-sm font-medium text-gray-500 hover:text-primary transition-colors">
                      <span className="mr-1 underline">编辑</span>
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3 text-gray-700">
                    <p><span className="text-gray-500">您的姓名:</span> <span className="font-bold">Kai Ni</span></p>
                    <p><span className="text-gray-500">您的邮箱:</span> <span className="font-bold">nk.nickinair@gmail.com</span></p>
                    <p><span className="text-gray-500">您的电话:</span> <span className="font-bold">+86 138 3450 8899</span></p>
                    <p><span className="text-gray-500">订购数量:</span> <span className="font-bold">1 本</span></p>
                    <p><span className="text-gray-500">包含电子书:</span> <span className="font-bold">是</span></p>
                  </div>
                </section>

                <div className="pt-12 flex gap-4 w-full">
                  <button
                    onClick={() => setStep('addons')}
                    className="flex-1 py-4 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    上一步
                  </button>
                  <button
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        await databaseService.createOrder(projectId, {
                          bookTitle,
                          bookSubtitle,
                          bookAuthor,
                          coverColor,
                          imageUrl: coverImageUrl || '',
                          price: totalPrice.toFixed(2),
                          status: 'processing'
                        });
                        setStep('complete');
                      } catch (error) {
                        console.error('Error creating order:', error);
                        alert('支付失败，请稍后重试。');
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    className="flex-2 py-4 bg-accent hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-accent/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isProcessing && <RefreshCw className="w-5 h-5 animate-spin" />}
                    <span>{isProcessing ? '处理中...' : '继续支付'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Summary */}
            <div className="w-full lg:w-[400px] space-y-8">
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16"></div>

                <div className="relative mb-8 flex justify-center">
                  <div className="relative">
                    <div
                      className="w-48 aspect-[3/4] rounded-sm shadow-2xl transform -rotate-6 relative z-10 overflow-hidden"
                      style={{ backgroundColor: coverColor }}
                    >
                      <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
                      <div className="p-4 flex flex-col items-center text-center h-full">
                        <div className="w-4 h-px bg-gray-600 mb-2 mt-4"></div>
                        <span className="text-[10px] font-serif text-gray-800 leading-tight mb-4">{bookTitle}</span>
                        <div className="w-20 h-24 bg-gray-200 shadow-inner mb-auto">
                          <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY"
                            alt=""
                            className="w-full h-full object-cover grayscale opacity-80"
                          />
                        </div>
                        <span className="text-[6px] text-gray-600 uppercase tracking-widest mb-4">{bookSubtitle}</span>
                      </div>
                    </div>
                    <div className="absolute top-4 -right-12 w-24 aspect-[9/19.5] bg-black rounded-2xl shadow-2xl border-2 border-gray-800 overflow-hidden z-20 transform rotate-6">
                      <img
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY"
                        alt=""
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2">
                        <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                          <div className="w-1/3 h-full bg-white"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-3xl font-light text-gray-800">长生記纪念册</h3>
                  <p className="text-2xl font-bold text-gray-900">总计: ¥{totalPrice.toFixed(2)}</p>

                  <div className="pt-6 space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">包含项目</p>
                    <ul className="space-y-3">
                      {[
                        '1 年无限次提示',
                        `${includeExtraHardcover ? 1 + hardcoverQuantity : 1} 本精装彩色印刷书籍`,
                        '30 天退款保证',
                        includeEbook ? '包含电子书' : null,
                        '全国免费包邮',
                        '永久访问音视频'
                      ].filter(Boolean).map((item) => (
                        <li key={item} className="flex items-center text-sm text-gray-700">
                          <Check className="w-4 h-4 text-accent mr-3 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h4 className="text-sm font-bold text-gray-800 mb-2">为什么选择长生記？</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  一年后续订您的订阅以继续记录新故事。您可以随时取消。您的故事将永远安全保存。
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="flex flex-col items-center justify-center h-[400px] lg:h-[600px] text-center space-y-4 lg:space-y-6 px-4">
            <div className="w-16 lg:w-20 h-16 lg:h-20 bg-green-100 rounded-full flex items-center justify-center mb-2 lg:mb-4">
              <Check className="w-8 lg:w-10 h-8 lg:h-10 text-green-600" />
            </div>
            <h2 className="text-3xl lg:text-4xl font-light text-gray-800">订单已提交！</h2>
            <p className="text-sm lg:text-base text-gray-600 max-w-md">
              感谢您的订购。我们已向您的邮箱发送了一封确认邮件。您的长生記纪念册即将开始制作。
            </p>
            <button
              onClick={() => onComplete?.()}
              className="px-8 py-3 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary-hover transition-colors"
            >
              查看订单状态
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isConfirmBackModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">确定要离开吗？</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                您的订购进度尚未保存，离开后当前输入的内容将会丢失。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsConfirmBackModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  继续订购
                </button>
                <button
                  onClick={confirmBack}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-md"
                >
                  确认离开
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">确认删除照片？</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                删除后，该照片将从封面中移除。您之后可以随时更换新的照片。
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setCoverImageUrl('');
                    setIsDeleteConfirmOpen(false);
                  }}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-md"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
