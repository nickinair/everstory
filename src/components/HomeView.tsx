import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Plus, MessageSquare, Users, ArrowRight, Star, Send, Video, Mic, Baby, Compass, Briefcase, Heart, Sparkles, Coffee, Milestone, Sunrise, Wand2, Edit3, MessageCircle, UserPlus } from 'lucide-react';
import { ViewType, Prompt, Story, User } from '../types';
import { getCategoryColor } from '../constants';

interface HomeViewProps {
  currentUser: User | null;
  stories: Story[];
  prompts: Prompt[];
  membersCount: number;
  onNavigate: (view: ViewType, initialStep?: any) => void;
  onUpgrade: () => void;
  hasOrder: boolean;
  onInvite: () => void;
  onStoryClick: (id: string) => void;
  onPromptClick: (prompt: Prompt) => void;
  orders: any[];
}

export default function HomeView({
  currentUser,
  stories,
  prompts,
  membersCount,
  onNavigate,
  onUpgrade,
  hasOrder,
  onInvite,
  onStoryClick,
  onPromptClick,
  orders
}: HomeViewProps) {
  const categoryThemes: Record<string, { Icon: React.ElementType; color: string; iconColor: string }> = {
    '童年与成长': { Icon: Baby, color: 'bg-orange-50', iconColor: 'text-orange-300' },
    '青春与自我发现': { Icon: Compass, color: 'bg-blue-50', iconColor: 'text-blue-300' },
    '职场与社会角色': { Icon: Briefcase, color: 'bg-teal-50', iconColor: 'text-teal-300' },
    '爱、关系与家庭': { Icon: Heart, color: 'bg-pink-50', iconColor: 'text-pink-300' },
    '内在自我与精神世界': { Icon: Sparkles, color: 'bg-purple-50', iconColor: 'text-purple-300' },
    '习惯、偏好与生活点滴': { Icon: Coffee, color: 'bg-emerald-50', iconColor: 'text-emerald-300' },
    '转折点与抉择': { Icon: Milestone, color: 'bg-indigo-50', iconColor: 'text-indigo-300' },
    '反思、展望与遗憾': { Icon: Sunrise, color: 'bg-amber-50', iconColor: 'text-amber-300' },
    '建议': { Icon: Wand2, color: 'bg-gray-50', iconColor: 'text-gray-400' },
    '自定义': { Icon: Edit3, color: 'bg-stone-50', iconColor: 'text-stone-400' },
  };
  const getTheme = (cat?: string) => categoryThemes[cat || ''] || { Icon: MessageCircle, color: 'bg-gray-50', iconColor: 'text-gray-400' };

  const premiumStatus = currentUser?.is_premium;
  const purchasedBooksCount = orders.length;

  const flowSteps = [
    {
      id: 'upgrade',
      title: premiumStatus ? '尊享会员' : '立即订购',
      desc: premiumStatus
        ? `尊敬的尊享会员，您已购 ${purchasedBooksCount} 本精装传记`
        : '为至亲写下一生传记',
      icon: premiumStatus ? Star : Heart,
      color: premiumStatus ? 'text-amber-700' : 'text-amber-600',
      bg: premiumStatus ? 'bg-amber-100' : 'bg-amber-50',
      action: () => onNavigate(premiumStatus ? 'order' : 'buy-now')
    },
    {
      id: 'invite',
      title: '邀请亲友',
      desc: '新建项目邀请亲友',
      icon: UserPlus,
      color: 'text-green-600',
      bg: 'bg-green-50',
      action: onInvite
    },
    {
      id: 'record',
      title: '记录故事',
      desc: '提示引导记录故事',
      icon: Mic,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      action: () => onNavigate('prompts')
    },
    {
      id: 'book',
      title: '定制传记',
      desc: '完成定制邮寄到家',
      icon: BookOpen,
      color: 'text-primary',
      bg: 'bg-teal-50',
      action: () => onNavigate('order')
    }
  ];

  const getDisplayName = (user: User | null) => {
    if (!user) return '探索者';
    const name = user.full_name || user.name || '';
    if (name.includes('@')) {
      return name.split('@')[0];
    }
    return name || '探索者';
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 lg:mb-12"
      >
        <h1 className="text-2xl lg:text-4xl font-light text-gray-800 mb-2 lg:mb-4">
          欢迎回来，{getDisplayName(currentUser)}
        </h1>
        <p className="text-base lg:text-lg text-gray-600 max-w-2xl">
          继续记录您的家庭故事，每一个回忆都是送给未来的珍贵礼物。
        </p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-16">
        {flowSteps.map((step, index) => (
          <React.Fragment key={step.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={step.action}
              className={`w-full p-4 lg:p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between                ${step.id === 'upgrade'
                ? 'bg-[linear-gradient(180deg,#FDF6D0_0%,#F5D100_40%,#C09D00_100%)] border-[#8B4513]/20 shadow-[0_10px_25px_-5px_rgba(184,134,11,0.5),inset_0_1px_1px_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(0,0,0,0.3)]'
                : 'bg-white border-gray-100 shadow-sm'
                }`}
            >
              {/* Gold Bar Inner Rim Highlight */}
              {step.id === 'upgrade' && (
                <div className="absolute inset-[3px] rounded-[21px] border border-white/30 pointer-events-none z-0 shadow-[inset_0_1px_1px_rgba(0,0,0,0.1)]" />
              )}

              {/* Step Number Background */}
              <div className={`absolute -top-4 text-7xl lg:text-8xl font-black italic select-none pointer-events-none opacity-[0.07] ${index === 0 ? 'right-2 lg:right-3' : index === 3 ? 'right-0 lg:right-1' : 'right-1 lg:right-2'
                } ${step.id === 'upgrade' ? 'text-[#3E2723]' : step.color
                }`}>
                {index + 1}
              </div>

              <div className="flex items-center space-x-3 lg:space-x-4 relative z-10">
                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform ${step.id === 'upgrade'
                  ? 'bg-white/30 text-[#3E2723] shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]'
                  : `${step.bg} ${step.color}`
                  }`}>
                  <step.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${step.id === 'upgrade' ? 'drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]' : ''}`} />
                </div>
                <div className={step.id === 'upgrade' ? 'drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]' : ''}>
                  <div className={`text-base lg:text-lg font-black mb-0.5 ${step.id === 'upgrade' ? 'text-[#3E2723]' : 'text-gray-800'
                    }`}>{step.title}</div>
                  <div className={`text-[10px] lg:text-xs font-bold ${step.id === 'upgrade' ? 'text-[#5D4037]/80' : 'text-gray-500'
                    }`}>{step.desc}</div>
                </div>
              </div>

              {/* Surface Sheen */}
              {step.id === 'upgrade' && (
                <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,1)_50%,transparent_75%)] bg-[length:250%_250%] group-hover:animate-shimmer" />
              )}

              <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block z-10">
                <ArrowRight className={`w-5 h-5 ${step.id === 'upgrade' ? 'text-amber-950' : step.color}`} />
              </div>
            </motion.div>
          </React.Fragment>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 lg:p-8 rounded-3xl border border-gray-100 shadow-sm mb-12"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">最近的故事</h2>
          <div className="flex items-center space-x-3">
            <span className="text-gray-400 text-sm font-normal">共 {stories.length} 个</span>
            <span className="text-gray-200">|</span>
            <button
              onClick={() => onNavigate('stories')}
              className="text-gray-400 text-sm font-medium hover:text-gray-600 flex items-center transition-colors"
            >
              查看全部 <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
          {stories.length > 0 ? (
            stories.slice(0, 4).map((story) => (
              <div
                key={story.id}
                onClick={() => onStoryClick(story.id)}
                className="group relative aspect-[16/11] rounded-2xl lg:rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all bg-white border border-stone-100 cursor-pointer"
              >
                <div className="w-full h-full relative">
                  {story.type === 'video' ? (
                    <>
                      {story.imageUrl && story.imageUrl !== '' ? (
                        <img
                          src={story.imageUrl}
                          alt={story.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <video
                          src={`${story.videoUrl}#t=0.001`}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    </>
                  ) : (
                    <img
                      src={story.imageUrl || (story.type === 'audio' ? '/audio_cover.png' : '')}
                      alt={story.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        if (story.type === 'audio') {
                          (e.target as HTMLImageElement).src = '/audio_cover.png';
                        }
                      }}
                    />
                  )}
                </div>

                {/* Play/Mic Indicator */}
                <div className="absolute top-3 left-3 h-7 w-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm z-10">
                  {story.type === 'video' ? (
                    <Video className="w-3.5 h-3.5 text-stone-800" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-stone-800" />
                  )}
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <p className="text-white text-sm font-semibold truncate w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    {story.title}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4 relative">
                <BookOpen className="w-8 h-8 text-stone-300" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center shadow-sm">
                  <Plus className="w-2.5 h-2.5 text-amber-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">还开启第一个故事</h3>
              <p className="text-sm text-gray-400 max-w-none mb-6 px-4">每一个珍贵的回忆都值得被认真记录并流传下去。</p>
              <button
                onClick={() => onNavigate('prompts')}
                className="px-6 py-2 bg-stone-800 text-white rounded-full text-sm font-medium hover:bg-stone-700 transition shadow-sm cursor-pointer"
              >
                去开启故事记录
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">待录制故事</h2>
          <div className="flex items-center space-x-3">
            <span className="text-gray-400 text-sm font-normal">共 {prompts.filter(p => !p.isRecorded).length} 个</span>
            <span className="text-gray-200">|</span>
            <button
              onClick={() => onNavigate('prompts')}
              className="text-gray-400 text-sm font-medium hover:text-gray-600 flex items-center transition-colors"
            >
              查看全部 <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {prompts.filter(p => !p.isRecorded).length > 0 ? (
            prompts.filter(p => !p.isRecorded).slice(0, 5).map((prompt) => (
              <div
                key={prompt.id}
                onClick={() => onPromptClick(prompt)}
                className="flex items-center p-4 rounded-xl hover:bg-gray-50 transition cursor-pointer border border-transparent hover:border-gray-100"
              >
                {(() => {
                  const theme = getTheme(prompt.category);
                  const Icon = theme.Icon;
                  return (
                    <div className={`w-12 h-12 ${theme.color} rounded-lg flex items-center justify-center mr-4 flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${theme.iconColor}`} />
                    </div>
                  );
                })()}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getCategoryColor(prompt.category)}`}>
                      {prompt.category || '自定义'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-1">{prompt.question}</p>
                  <div className="flex items-center text-gray-500 text-[10px] mt-1 space-x-1">
                    <Send className="w-3 h-3 rotate-45" />
                    {prompt.isRecorded && prompt.recordedDate ? (
                      <span>{prompt.recordedDate}录制完成</span>
                    ) : (
                      <span>{prompt.sentDate}发送</span>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  {prompt.isRecorded ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">已录制</span>
                  ) : (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">待录制</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4 text-stone-300 relative">
                <Wand2 className="w-8 h-8" />
                <Sparkles className="absolute top-0 right-0 w-5 h-5 text-amber-200 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">获取录制灵感</h3>
              <p className="text-sm text-gray-400 max-w-none mb-6 px-4">试试由 AI 驱动的“灵感魔棒”，或从建议库中寻找话题。</p>
              <button
                onClick={() => onNavigate('prompts')}
                className="px-6 py-2 border-2 border-stone-100 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition cursor-pointer flex items-center"
              >
                查看灵感建议 <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
