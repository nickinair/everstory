import React, { useState } from 'react';
import { Plus, Users, Wand2, Send, Mic, ArrowLeft, ArrowRight, Check, Edit3, Image, RefreshCcw, ChevronDown, ChevronUp, X, AlertCircle, Share2, Copy, CheckCheck, Phone, MessageSquareCode, Mail, MessageCircle, Link2, Clock, Baby, Compass, Briefcase, Heart, Sparkles, Coffee, Milestone, Sunrise, Trash2 } from 'lucide-react';
import { getAvatarUrl } from '../lib/avatar';
import { QUESTION_TEMPLATES, CATEGORY_COLORS, getCategoryColor } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { Prompt, ProjectMember } from '../types';
import { databaseService } from '../services/databaseService';
import InviteModal from './InviteModal';
import { MagicWandModal } from './MagicWandModal';

interface PromptsViewProps {
  projectId: string;
  prompts: Prompt[];
  members: ProjectMember[];
  onPromptClick: (prompt: Prompt) => void;
  onPromptSaved: () => void;
  currentUserRole?: string;
  hasOrder: boolean;
  onShowUpgrade: () => void;
}

export default function PromptsView({
  projectId,
  prompts,
  members,
  onPromptClick,
  onPromptSaved,
  currentUserRole,
  hasOrder,
  onShowUpgrade
}: PromptsViewProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQuestionSelectOpen, setIsQuestionSelectOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMagicWandOpen, setIsMagicWandOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [confirmPrompt, setConfirmPrompt] = useState<Prompt | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<Prompt | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showCustomInputField, setShowCustomInputField] = useState(false);
  const [customPromptValue, setCustomPromptValue] = useState('');
  const [isSavingCustomPrompt, setIsSavingCustomPrompt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleAddAIPrompt = async (question: string) => {
    if (!hasOrder && prompts.length >= 10) {
      onShowUpgrade();
      return;
    }
    try {
      await databaseService.createPrompt(projectId, question);
      onPromptSaved();
    } catch (error) {
      console.error('Failed to add AI prompt:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    if (!hasOrder && prompts.length >= 10) {
      onShowUpgrade();
      return;
    }

    setIsUploadingPhoto(true);
    try {
      // 1. Upload photo to Supabase
      const imageUrl = await databaseService.uploadPhoto(projectId, file);

      // 2. Create prompt with default question and image
      await databaseService.createPrompt(
        projectId,
        '请分享关于这张图片的故事吧',
        '自定义',
        imageUrl
      );

      // 3. Refresh and close
      onPromptSaved();
      setIsAddModalOpen(false);
      setIsQuestionSelectOpen(false);
      alert('已成功上传照片并创建提示');
    } catch (error) {
      console.error('Failed to upload photo prompt:', error);
      alert('上传照片失败，请重试');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ... (keeping other states)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePhone) return;
    try {
      await databaseService.sendInvitation(projectId, invitePhone);
      alert(`已通过短信向手机号 ${invitePhone} 发送项目邀请`);
      setInvitePhone('');
      // setIsInviteModalOpen(false); // Keep open to show success or other actions
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('发送邀请失败，请稍后重试');
    }
  };

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      // For now, using same invitation logic but could be specialized
      await databaseService.sendInvitation(projectId, inviteEmail);
      alert(`已向邮箱 ${inviteEmail} 发送项目邀请`);
      setInviteEmail('');
      setShowEmailInput(false);
    } catch (error) {
      console.error('Error sending email invitation:', error);
      alert('发送邀请失败，请稍后重试');
    }
  };

  const [sharePrompt, setSharePrompt] = useState<Prompt | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showWeChatModal, setShowWeChatModal] = useState(false);

  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectionStep, setSelectionStep] = useState<'main' | 'select' | 'review'>('main');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryListExpanded, setIsCategoryListExpanded] = useState(true);

  const categories = [
    { id: 'c1', name: '童年与成长', Icon: Baby, color: 'bg-orange-50', iconColor: 'text-orange-200' },
    { id: 'c2', name: '青春与自我发现', Icon: Compass, color: 'bg-blue-50', iconColor: 'text-blue-200' },
    { id: 'c3', name: '职场与社会角色', Icon: Briefcase, color: 'bg-teal-50', iconColor: 'text-teal-200' },
    { id: 'c4', name: '爱、关系与家庭', Icon: Heart, color: 'bg-pink-50', iconColor: 'text-pink-200' },
    { id: 'c5', name: '内在自我与精神世界', Icon: Sparkles, color: 'bg-purple-50', iconColor: 'text-purple-200' },
    { id: 'c6', name: '习惯、偏好与生活点滴', Icon: Coffee, color: 'bg-emerald-50', iconColor: 'text-emerald-200' },
    { id: 'c7', name: '转折点与抉择', Icon: Milestone, color: 'bg-indigo-50', iconColor: 'text-indigo-200' },
    { id: 'c8', name: '反思、展望与遗憾', Icon: Sunrise, color: 'bg-amber-50', iconColor: 'text-amber-200' },
    { id: 'c9', name: '建议', Icon: Wand2, color: 'bg-gray-50', iconColor: 'text-gray-300' },
    { id: 'c10', name: '自定义', Icon: Edit3, color: 'bg-stone-50', iconColor: 'text-stone-300' },
  ];

  const getCategoryTheme = (categoryName?: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category || { Icon: MessageCircle, color: 'bg-gray-50', iconColor: 'text-gray-400' };
  };

  const [suggestedQuestions, setSuggestedQuestions] = useState<{ id: string, text: string, category: string }[]>([]);

  const refreshSuggestedQuestions = () => {
    const currentIds = new Set(suggestedQuestions.map(q => q.id));
    const available = QUESTION_TEMPLATES.filter(q => !currentIds.has(q.id));
    const pool = available.length >= 3 ? available : QUESTION_TEMPLATES;
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3).map(q => ({
      id: q.id,
      text: q.text,
      category: q.category
    }));
    setSuggestedQuestions(selected);
  };

  React.useEffect(() => {
    refreshSuggestedQuestions();
  }, []);

  const handleToggleQuestion = (id: string) => {
    setSelectedQuestionIds(prev => {
      const isSelecting = !prev.includes(id);
      if (!hasOrder && isSelecting && (prompts.length + prev.length) >= 10) {
        onShowUpgrade();
        return prev;
      }
      return isSelecting ? [...prev, id] : prev.filter(i => i !== id);
    });
  };

  const handleCloseModal = () => {
    setIsQuestionSelectOpen(false);
    setSelectedQuestionIds([]);
    setSelectionStep('main');
    setSelectedCategory(null);
  };

  const handleSubmit = async () => {
    if (!projectId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Use a Map to deduplicate by ID, ensuring each question is only added once
      const questionMap = new Map<string, { id: string, text: string, category: string }>();

      // First, check template questions
      QUESTION_TEMPLATES.forEach(q => {
        if (selectedQuestionIds.includes(q.id)) {
          questionMap.set(q.id, { id: q.id, text: q.text, category: q.category });
        }
      });

      // Then, check suggested questions (which may have been mapped to '建议')
      suggestedQuestions.forEach(q => {
        if (selectedQuestionIds.includes(q.id)) {
          // If already in map, we keep the original template metadata (or we could overwrite)
          if (!questionMap.has(q.id)) {
            questionMap.set(q.id, q);
          }
        }
      });

      const selectedQuestions = Array.from(questionMap.values());

      if (!hasOrder && (prompts.length + selectedQuestions.length) > 10) {
        onShowUpgrade();
        setIsSubmitting(false);
        return;
      }

      if (selectedQuestions.length === 0) {
        setIsSubmitting(false);
        return;
      }

      for (const q of selectedQuestions) {
        await databaseService.createPrompt(projectId, q.text, q.category);
      }

      onPromptSaved();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving prompts:', error);
      alert('保存提示失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async (prompt: Prompt) => {
    setLinkCopied(false);
    setSharePrompt(prompt);
  };

  const handleDeletePrompt = async () => {
    if (!deletePrompt) return;
    setIsDeleting(true);
    try {
      await databaseService.deletePrompt(deletePrompt.id);
      setDeletePrompt(null);
      onPromptSaved();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      alert('删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const getShareLink = (prompt: Prompt) =>
    `${window.location.origin}/record?promptId=${prompt.id}&projectId=${projectId}`;

  const [activeTab, setActiveTab] = useState<'sent' | 'recorded'>('sent');

  const sentPrompts = prompts.filter(p => !p.isRecorded);
  const recordedPrompts = prompts.filter(p => p.isRecorded);
  const displayedPrompts = activeTab === 'sent' ? sentPrompts : recordedPrompts;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        accept="image/*"
        className="hidden"
      />
      <header className="flex items-center justify-between mb-6 lg:mb-10">
        <h1 className="text-2xl lg:text-3xl font-light text-gray-800 shrink-0">提示</h1>
        <div className="flex-1 flex flex-wrap items-center justify-end gap-2 sm:gap-4 overflow-hidden">
          <div className="flex -space-x-2 mr-1 sm:mr-3">
            {members.slice(0, 7).map((member) => (
              <div
                key={member.id}
                className="h-7 w-7 lg:h-9 lg:w-9 rounded-full ring-2 ring-background-light bg-gray-100 flex items-center justify-center overflow-hidden shrink-0 relative"
                style={{ zIndex: 10 }}
              >
                <img
                  src={getAvatarUrl(member.user)}
                  alt={member.user?.full_name || 'User'}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
            {members.length > 7 && (
              <div className="h-7 w-7 lg:h-9 lg:w-9 rounded-full ring-2 ring-background-light bg-gray-800 flex items-center justify-center text-[9px] lg:text-xs font-bold text-white shrink-0 relative z-20">
                +{members.length - 7}
              </div>
            )}
          </div>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2 bg-white border border-gray-100 rounded-lg text-sm text-gray-700 shadow-sm hover:bg-stone-50 transition-colors cursor-pointer"
          >
            邀请亲友
          </button>
          <button
            onClick={() => {
              if (!hasOrder && prompts.length >= 10) {
                onShowUpgrade();
              } else {
                setIsMagicWandOpen(true);
              }
            }}
            className="w-9 h-9 flex items-center justify-center bg-white border border-gray-100 rounded-lg text-stone-600 shadow-sm hover:bg-stone-50 transition-all cursor-pointer font-medium relative overflow-hidden group"
          >
            <motion.div
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                repeatDelay: 3
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
            />
            <Wand2 className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform" />
          </button>
          <button
            onClick={() => {
              if (!hasOrder && prompts.length >= 10) {
                onShowUpgrade();
              } else {
                setIsAddModalOpen(true);
              }
            }}
            className="px-4 py-2 bg-accent hover:bg-teal-700 text-white rounded-lg shadow-sm text-sm font-medium flex items-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" /> 添加提示
          </button>
        </div>
      </header>

      {/* Tabs */}

      {/* Tabs */}
      <div className="flex items-center space-x-8 mb-6 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('sent')}
          className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'sent' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span>已添加 ({sentPrompts.length})</span>
          {activeTab === 'sent' && (
            <motion.div
              layoutId="activePromptTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('recorded')}
          className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'recorded' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span>已录制 ({recordedPrompts.length})</span>
          {activeTab === 'recorded' && (
            <motion.div
              layoutId="activePromptTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"
            />
          )}
        </button>
      </div>

      <div className="space-y-4">
        {displayedPrompts.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 px-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4 text-stone-300 relative">
              <Wand2 className="w-8 h-8" />
              <Sparkles className="absolute top-0 right-0 w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {activeTab === 'sent' ? '获取录制灵感' : '开始记录故事'}
            </h3>
            <p className="text-sm text-gray-400 max-w-none mb-6 px-4">
              {activeTab === 'sent'
                ? '试试由 AI 驱动的“灵感魔棒”，或从建议库中寻找话题。'
                : '通过录制建议的问题，为后代留下珍贵的数字回忆。'}
            </p>
            <button
              onClick={() => {
                if (activeTab === 'sent') {
                  setIsMagicWandOpen(true);
                } else {
                  setActiveTab('sent');
                }
              }}
              className="px-6 py-2 border-2 border-stone-100 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition cursor-pointer flex items-center shadow-sm"
            >
              {activeTab === 'sent' ? '查看灵感建议' : '前往添加提示'} <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        ) : (
          displayedPrompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => {
                if (prompt.isRecorded) {
                  setConfirmPrompt(prompt);
                } else {
                  onPromptClick(prompt);
                }
              }}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center space-x-4">
                {(() => {
                  const theme = getCategoryTheme(prompt.category);
                  const Icon = theme.Icon;
                  const isDefaultImage = prompt.imageUrl?.includes('unsplash.com/photo-1516627145497-ae6968895b74');

                  return (
                    <div className={`w-14 sm:w-16 h-14 sm:h-16 ${theme.color} rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                      {prompt.imageUrl && !isDefaultImage && (prompt.imageUrl.startsWith('http') || prompt.imageUrl.startsWith('/')) ? (
                        <img
                          src={prompt.imageUrl}
                          alt="Prompt"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${theme.iconColor}`} />
                      )}
                    </div>
                  );
                })()}
                <div>
                  <div className="flex items-center flex-wrap gap-1.5 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getCategoryColor(prompt.category)}`}>
                      {prompt.category || '自定义'}
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-medium text-gray-800 mb-1">{prompt.question}</h4>
                  <div className="flex items-center text-gray-500 text-[10px] sm:text-sm space-x-1">
                    <Send className="w-3 h-3 rotate-45" />
                    {prompt.isRecorded && prompt.recordedDate ? (
                      <span>{prompt.recordedDate}录制完成</span>
                    ) : (
                      <span>创建时间：{prompt.sentDate}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {currentUserRole === 'owner' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletePrompt(prompt);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                    title="删除提示"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {!prompt.isRecorded && (
                  <div className="relative group/share">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(prompt);
                      }}
                      className="p-1.5 sm:p-2 border border-blue-200 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    {/* Fast Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] font-medium rounded opacity-0 group-hover/share:opacity-100 pointer-events-none transition-all duration-75 whitespace-nowrap z-20 shadow-xl">
                      分享给讲述人
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                    </div>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (prompt.isRecorded) {
                      setConfirmPrompt(prompt);
                    } else {
                      onPromptClick(prompt);
                    }
                  }}
                  className={`px-3 sm:px-6 py-1 sm:py-1.5 border rounded text-xs sm:text-sm font-medium transition-colors cursor-pointer ${prompt.isRecorded
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {prompt.isRecorded ? '已完成录制' : '录制'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Magic Wand Modal */}
      <MagicWandModal
        isOpen={isMagicWandOpen}
        onClose={() => setIsMagicWandOpen(false)}
        onAddPrompt={handleAddAIPrompt}
      />

      {/* Share Modal */}
      <AnimatePresence>
        {sharePrompt && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">分享给讲述人</h3>
                  </div>
                  <button
                    onClick={() => setSharePrompt(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  将以下链接发送给讲述人，他们在手机端用已加入该项目的账号登录后，即可直接开始录制这个问题。
                </p>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">问题</p>
                  <p className="text-sm text-gray-800 leading-snug">{sharePrompt.question}</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-500 break-all font-mono mb-4 leading-relaxed max-h-24 overflow-y-auto">
                  {getShareLink(sharePrompt)}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(getShareLink(sharePrompt!));
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 3000);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${linkCopied
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-md'
                      }`}
                  >
                    {linkCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {linkCopied ? '已复制链接' : '复制链接'}
                  </button>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(getShareLink(sharePrompt!));
                      setShowWeChatModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#07C160]/10 hover:bg-[#07C160]/20 text-[#07C160] rounded-xl text-sm font-bold transition-all cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M8.5 13.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm7 0c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm-3.5-6c-4.418 0-8 3.134-8 7 0 2.054 1.028 3.9 2.68 5.234l-.68 1.766 2.375-1.188c1.135.438 2.385.688 3.625.688 4.418 0 8-3.134 8-7s-3.582-7-8-7z" stroke="none" />
                    </svg>
                    发到微信
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WeChat Share Modal */}
      <AnimatePresence>
        {showWeChatModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden text-center p-8 relative"
            >
              <button
                onClick={() => setShowWeChatModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-[#07C160]/10 text-[#07C160] rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCheck className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">链接已复制成功</h3>
              <p className="text-gray-500 mb-8 text-sm">
                现在您可以打开微信，将链接粘贴发送给您的亲友或讲述人啦。
              </p>

              <button
                onClick={() => {
                  setShowWeChatModal(false);
                  window.location.href = 'weixin://';
                }}
                className="w-full py-3.5 bg-[#07C160] text-white rounded-xl font-bold hover:bg-[#06ad56] transition-all shadow-lg shadow-[#07C160]/30"
              >
                打开微信
              </button>
              <button
                onClick={() => setShowWeChatModal(false)}
                className="w-full py-3.5 mt-3 text-gray-500 hover:text-gray-800 rounded-xl font-medium transition-all"
              >
                稍后自己打开
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Re-record Confirmation Modal */}
      <AnimatePresence>
        {confirmPrompt && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">重新录制故事？</h3>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  该提示已有录制内容。重新录制将会<strong className="text-red-600">覆盖并永久删除</strong>之前的视频和语音文字。此操作无法撤销。
                </p>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => {
                      onPromptClick(confirmPrompt);
                      setConfirmPrompt(null);
                    }}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg"
                  >
                    确定重新录制
                  </button>
                  <button
                    onClick={() => setConfirmPrompt(null)}
                    className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Prompt Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 pb-2 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">添加提示</h2>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setShowCustomInputField(false);
                    setCustomPromptValue('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-[#fdfaf5]">
                <motion.div
                  onClick={() => fileInputRef.current?.click()}
                  whileHover="hover"
                  initial="initial"
                  className="group cursor-pointer flex sm:flex-col items-center sm:items-stretch gap-4 sm:gap-0 p-4 sm:p-0 border border-gray-100 sm:border-0 rounded-2xl sm:rounded-none bg-white sm:bg-transparent shadow-sm sm:shadow-none hover:bg-gray-50/50 sm:hover:bg-transparent transition-all"
                >
                  <div className="bg-[#f5efe6] rounded-2xl p-4 sm:p-8 h-24 w-24 sm:h-56 sm:w-full flex items-center justify-center sm:mb-4 relative overflow-hidden group-hover:bg-[#efe7d9] transition-colors duration-300">
                    <div className="relative w-16 h-12 sm:w-44 sm:h-36">
                      {/* Photo stack - Polaroid style */}
                      <motion.div
                        variants={{
                          initial: { rotate: -12, x: -15, y: -5 },
                          hover: { rotate: -25, x: -40, y: -15 }
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute inset-0 bg-white rounded-sm shadow-md p-1 sm:p-2 border border-gray-100"
                      >
                        <div className="w-full h-[75%] bg-[#004d40] rounded-sm overflow-hidden relative">
                          {/* Back photo silhouette matching screenshot */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-30">
                            <Image className="w-6 h-6 sm:w-12 sm:h-12 text-white" />
                          </div>
                        </div>
                        <div className="h-[25%] flex items-center justify-center">
                          <div className="w-1/2 h-0.5 sm:h-1 bg-gray-100 rounded-full"></div>
                        </div>
                      </motion.div>

                      <motion.div
                        variants={{
                          initial: { rotate: 2, x: 2, y: 5 },
                          hover: { rotate: 6, x: 15, y: 10 }
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute inset-0 bg-white rounded-sm shadow-xl p-1 sm:p-2 border border-gray-100 z-10"
                      >
                        <div className="w-full h-[78%] bg-stone-100 rounded-sm overflow-hidden border border-gray-50">
                          <img
                            src="/images/nostalgic_baby.png"
                            alt="Nostalgic Moment"
                            className="w-full h-full object-cover grayscale-[0.1] sepia-[0.05]"
                          />
                        </div>
                        <div className="h-[22%] flex items-center justify-center">
                          <div className="w-3/4 h-1 sm:h-1.5 bg-[#fdfaf5] rounded-sm"></div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:mt-2">
                    <h3 className="text-base font-bold text-gray-800 mb-1">
                      {isUploadingPhoto ? '正在上传...' : '从照片获取灵感'}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 sm:px-4 leading-relaxed">
                      {isUploadingPhoto ? '请稍候，正在为您创建提示' : '上传一张照片，为一段故事开启引言'}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsQuestionSelectOpen(true);
                  }}
                  whileHover="hover"
                  initial="initial"
                  className="group cursor-pointer flex sm:flex-col items-center sm:items-stretch gap-4 sm:gap-0 p-4 sm:p-0 border border-gray-100 sm:border-0 rounded-2xl sm:rounded-none bg-white sm:bg-transparent shadow-sm sm:shadow-none hover:bg-gray-50/50 sm:hover:bg-transparent transition-all"
                >
                  <div className="bg-[#f5efe6] rounded-2xl p-4 sm:p-8 h-24 w-24 sm:h-56 sm:w-full flex items-center justify-center sm:mb-4 relative overflow-hidden group-hover:bg-[#efe7d9] transition-colors duration-300">
                    <div className="relative w-16 h-12 sm:w-44 sm:h-36">
                      {/* Question card stack */}
                      <motion.div
                        variants={{
                          initial: { rotate: -12, x: -10, y: -15 },
                          hover: { rotate: -20, x: -25, y: -30 }
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute inset-0 bg-white rounded-xl shadow-sm border border-gray-100/50 p-2 sm:p-4 opacity-40 scale-95"
                      >
                        <span className="text-[4px] sm:text-[8px] text-[#00695c] font-bold tracking-widest">恋爱关系</span>
                      </motion.div>

                      <motion.div
                        variants={{
                          initial: { rotate: -6, x: -5, y: -8 },
                          hover: { rotate: -10, x: -12, y: -15 }
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute inset-0 bg-white rounded-xl shadow-md border border-gray-100/80 p-2 sm:p-4 opacity-70 scale-98"
                      >
                        <span className="text-[4px] sm:text-[8px] text-[#00695c] font-bold tracking-widest">职场生涯</span>
                      </motion.div>

                      <motion.div
                        variants={{
                          initial: { rotate: 0, x: 0, y: 0 },
                          hover: { rotate: 2, x: 5, y: 5 }
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="absolute inset-0 bg-white rounded-xl shadow-xl border border-gray-100 p-3 sm:p-6 flex flex-col items-start justify-center text-left z-10"
                      >
                        <span className="text-[5px] sm:text-[10px] text-[#00695c] font-bold mb-1 sm:mb-2 tracking-wider">童年往事</span>
                        <p className="text-[6px] sm:text-[11px] text-gray-700 font-medium leading-tight">你小时候最喜欢的食物是什么？</p>
                      </motion.div>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:mt-2">
                    <h3 className="text-base font-bold text-gray-800 mb-1">添加问题</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 sm:px-4 leading-relaxed">随机推荐问题，或从分类中选择</p>
                  </div>
                </motion.div>
              </div>

              {/* Custom Prompt Input Section */}
              <div className="px-4 sm:px-8 pb-8 bg-[#fdfaf5]">
                {!showCustomInputField ? (
                  <button
                    onClick={() => setShowCustomInputField(true)}
                    className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    写下自定义提示
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <textarea
                      autoFocus
                      value={customPromptValue}
                      onChange={(e) => setCustomPromptValue(e.target.value)}
                      placeholder="在这里输入您想问的问题..."
                      className="w-full p-4 border border-stone-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-stone-100 focus:border-stone-300 outline-none resize-none h-24"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowCustomInputField(false);
                          setCustomPromptValue('');
                        }}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                      >
                        取消
                      </button>
                      <button
                        disabled={!customPromptValue.trim() || isSavingCustomPrompt}
                        onClick={async () => {
                          if (!customPromptValue.trim()) return;
                          setIsSavingCustomPrompt(true);
                          try {
                            await databaseService.createPrompt(projectId, customPromptValue.trim());
                            onPromptSaved();
                            setIsAddModalOpen(false);
                            setCustomPromptValue('');
                            setShowCustomInputField(false);
                          } catch (error) {
                            console.error('Failed to save custom prompt:', error);
                            alert('保存失败，请重试');
                          } finally {
                            setIsSavingCustomPrompt(false);
                          }
                        }}
                        className="px-6 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSavingCustomPrompt ? '正在保存...' : (
                          <>
                            <Check className="w-4 h-4" />
                            保存并添加
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Question Selection Modal */}
      <AnimatePresence>
        {isQuestionSelectOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                <button
                  onClick={() => {
                    if (selectionStep === 'review') {
                      setSelectionStep('select');
                    } else if (selectionStep === 'select') {
                      setSelectionStep('main');
                      setSelectedCategory(null);
                    } else {
                      setIsQuestionSelectOpen(false);
                      setIsAddModalOpen(true);
                    }
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">
                  {selectionStep === 'main' ? '添加问题' : selectionStep === 'select' ? '选择问题' : '回顾提示'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {selectionStep === 'main' && (
                  <div className="p-6 space-y-8">

                    {/* Suggested Questions */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">从推荐的问题中选择</h3>
                        <button
                          onClick={refreshSuggestedQuestions}
                          className="flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                        >
                          <RefreshCcw className="w-3 h-3 mr-1" />
                          查看新问题
                        </button>
                      </div>
                      <div className="space-y-4">
                        {suggestedQuestions.map((q) => (
                          <label key={q.id} className="flex items-start p-4 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={selectedQuestionIds.includes(q.id)}
                              onChange={() => handleToggleQuestion(q.id)}
                              className="mt-1 h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                            <div className="ml-4">
                              <p className="text-sm text-gray-800 leading-relaxed mb-1">{q.text}</p>
                              <div className="flex items-center text-[10px] text-gray-400 font-medium">
                                <Wand2 className="w-3 h-3 mr-1" />
                                {q.category}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </section>

                    {/* Browse by Category */}
                    <section>
                      <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">按类别浏览问题</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {categories.filter(cat => !['建议', '自定义'].includes(cat.name)).map((cat) => (
                          <div
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.name);
                              setSelectionStep('select');
                            }}
                            className={`${cat.color} p-4 rounded-2xl flex flex-col justify-between h-32 hover:shadow-md transition cursor-pointer relative overflow-hidden group`}
                          >
                            <span className="font-bold text-gray-800 text-base z-10">{cat.name}</span>
                            <div className={`absolute right-[-10%] bottom-[-10%] opacity-20 group-hover:scale-110 transition-transform ${cat.iconColor}`}>
                              <cat.Icon className="w-24 h-24" strokeWidth={1.5} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}

                {selectionStep === 'select' && (
                  <div className="flex flex-col h-full">
                    {/* Category Header Card */}
                    <div className="p-4 sm:p-6">
                      {(() => {
                        const cat = categories.find(c => c.name === selectedCategory);
                        return (
                          <div className={`${cat?.color || 'bg-stone-100'} rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex items-center justify-between relative overflow-hidden h-32 sm:h-40`}>
                            <div className="relative z-10">
                              <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 sm:mb-2">关于一生的问题</div>
                              <div className="text-2xl sm:text-4xl font-serif text-gray-800">{selectedCategory}</div>
                            </div>
                            <div className={`absolute right-[-10%] bottom-[-10%] opacity-20 ${cat?.iconColor}`}>
                              {cat && <cat.Icon className="w-24 h-24 sm:w-40 sm:h-40" strokeWidth={1.5} />}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Questions List */}
                    <div className="flex-1 px-6">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button
                          onClick={() => setIsCategoryListExpanded(!isCategoryListExpanded)}
                          className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-50"
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-sm font-bold text-emerald-800">准备添加 ({selectedQuestionIds.length})</span>
                            <span className="text-xs text-gray-500 mt-0.5">选择问题添加到队列</span>
                          </div>
                          {isCategoryListExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>

                        <AnimatePresence>
                          {isCategoryListExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="divide-y divide-gray-50">
                                {QUESTION_TEMPLATES.filter(q => q.category === selectedCategory || !selectedCategory).map((q) => (
                                  <label
                                    key={q.id}
                                    className="flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedQuestionIds.includes(q.id)}
                                      onChange={() => handleToggleQuestion(q.id)}
                                      className="h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary"
                                    />
                                    <span className="ml-4 text-sm text-gray-700 leading-relaxed">{q.text}</span>
                                  </label>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="h-8 shrink-0"></div>
                  </div>
                )}

                {selectionStep === 'review' && (
                  <div className="p-6 space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <p className="text-sm text-blue-700">
                        您已选择 <strong>{selectedQuestionIds.length}</strong> 个问题。{!hasOrder && (prompts.length + selectedQuestionIds.length) > 10 && <span className="text-red-500 ml-2 font-bold">(超过10个限制)</span>}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {/* Show both suggested and template questions in review */}
                      {selectedQuestionIds.map((id) => {
                        const q = suggestedQuestions.find(sq => sq.id === id) || QUESTION_TEMPLATES.find(qt => qt.id === id);
                        if (!q) return null;
                        return (
                          <div key={q.id} className="flex items-start justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm group">
                            <div className="flex items-start space-x-3">
                              <div className="mt-1 bg-primary/10 p-1 rounded">
                                <Check className="w-3 h-3 text-primary" />
                              </div>
                              <p className="text-sm text-gray-800">{q.text}</p>
                            </div>
                            <button
                              onClick={() => handleToggleQuestion(q.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              {selectedQuestionIds.length > 0 && (
                <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      已勾选 <span className="font-bold text-primary">{selectedQuestionIds.length}</span> 个问题
                    </div>
                    {selectionStep !== 'review' ? (
                      <button
                        onClick={() => setSelectionStep('review')}
                        className="bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded-lg text-sm font-medium transition shadow-sm"
                      >
                        下一步
                      </button>
                    ) : (
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-primary hover:bg-primary-hover text-white px-8 py-2 rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
                      >
                        {isSubmitting ? '正在提交...' : '提交'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={projectId}
        members={members}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletePrompt && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">删除提示？</h3>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  确定要删除这个提示吗？此操作将永久移除该提示，不会影响已录制内容。
                </p>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={handleDeletePrompt}
                    disabled={isDeleting}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? '正在删除...' : '确定删除'}
                  </button>
                  <button
                    onClick={() => setDeletePrompt(null)}
                    disabled={isDeleting}
                    className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
