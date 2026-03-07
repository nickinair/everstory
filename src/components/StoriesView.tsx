import React, { useState } from 'react';
import { Video, Mic, Plus } from 'lucide-react';
import { getAvatarUrl } from '../lib/avatar';
import { Story, ProjectMember } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { databaseService } from '../services/databaseService';
import InviteModal from './InviteModal';

interface StoriesViewProps {
  projectId: string;
  stories: Story[];
  members: ProjectMember[];
  onStoryClick: (id: string) => void;
  onAddStory: () => void;
  onQuickRecord: () => void;
  hasOrder: boolean;
  onShowUpgrade: () => void;
}

export default function StoriesView({
  projectId,
  stories,
  members,
  onStoryClick,
  onAddStory,
  onQuickRecord,
  hasOrder,
  onShowUpgrade
}: StoriesViewProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePhone) return;
    try {
      await databaseService.sendInvitation(projectId, invitePhone);
      alert(`已通过短信向手机号 ${invitePhone} 发送项目邀请`);
      setInvitePhone('');
      // setIsInviteModalOpen(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('发送邀请失败，请稍后重试');
    }
  };

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      await databaseService.sendInvitation(projectId, inviteEmail);
      alert(`已向邮箱 ${inviteEmail} 发送项目邀请`);
      setInviteEmail('');
      setShowEmailInput(false);
    } catch (error) {
      console.error('Error sending email invitation:', error);
      alert('发送邀请失败，请稍后重试');
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6 lg:mb-10">
        <h1 className="text-2xl lg:text-3xl font-light text-gray-800 shrink-0">故事</h1>
        <div className="flex items-center justify-end space-x-2 sm:space-x-4 overflow-hidden">
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
            onClick={onQuickRecord}
            className="px-4 py-2 bg-accent hover:bg-teal-700 text-white rounded-lg shadow-sm text-sm font-medium flex items-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1" /> 立即录制
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 lg:gap-8">
        {stories.map((story) => (
          <div
            key={story.id}
            onClick={() => onStoryClick(story.id)}
            className="group relative aspect-[16/11] rounded-2xl lg:rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all bg-white border border-stone-100 cursor-pointer"
          >
            {story.type === 'video' ? (
              <div className="w-full h-full relative">
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
              </div>
            ) : (
              story.imageUrl && (story.imageUrl.startsWith('http') || story.imageUrl.startsWith('/')) ? (
                <img
                  src={story.imageUrl}
                  alt={story.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    if (story.type === 'audio') {
                      (e.target as HTMLImageElement).src = '/audio_cover.png';
                    } else {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-stone-400" />
                </div>
              )
            )}

            {/* Play/Mic Indicator */}
            <div className="absolute top-4 left-4 h-8 w-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm z-10">
              {story.type === 'video' ? (
                <Video className="w-4 h-4 text-stone-800" />
              ) : (
                <Mic className="w-4 h-4 text-stone-800" />
              )}
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
              <p className="text-white text-base font-semibold truncate w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                {story.title}
              </p>
            </div>
          </div>
        ))}

        {/* Placeholder for more stories */}
        <div
          onClick={() => {
            if (!hasOrder && stories.length >= 10) {
              onShowUpgrade();
            } else {
              onAddStory();
            }
          }}
          className="aspect-[16/11] rounded-2xl lg:rounded-3xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-all cursor-pointer bg-stone-50/50 hover:bg-stone-50 group"
        >
          <div className="w-10 h-10 mb-3 border-2 border-current rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-base font-medium">添加新故事</span>
          <span className="text-xs text-stone-400 mt-2 text-center px-8">讲述人可以通过手动输入完成故事编辑</span>
        </div>
      </div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={projectId}
        members={members}
      />
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
  );
}
