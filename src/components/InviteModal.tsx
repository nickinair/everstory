import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, CheckCheck, MessageCircle, Mail, ChevronDown, Link2, User, UserPlus } from 'lucide-react';
import { getAvatarUrl } from '../lib/avatar';
import { ProjectMember } from '../types';
import { databaseService } from '../services/databaseService';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    members: ProjectMember[];
    onMembersUpdate?: () => void;
}

export default function InviteModal({ isOpen, onClose, projectId, members, onMembersUpdate }: InviteModalProps) {
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [showEmailInput, setShowEmailInput] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [invitations, setInvitations] = useState<{ phone?: string; email?: string }[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadInvitations();
        }
    }, [isOpen, projectId]);

    const loadInvitations = async () => {
        try {
            const data = await databaseService.getProjectInvitations(projectId);
            setInvitations(data);
        } catch (error) {
            console.error('Error loading invitations:', error);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invitePhone) return;
        try {
            await databaseService.sendInvitation(projectId, invitePhone);
            alert(`已通过短信向手机号 ${invitePhone} 发送项目邀请`);
            setInvitePhone('');
            loadInvitations();
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
            setIsEmailSent(true);
            setTimeout(() => {
                setIsEmailSent(false);
                setShowEmailInput(false);
            }, 2000);
            setInviteEmail('');
            loadInvitations();
        } catch (error) {
            console.error('Error sending email invitation:', error);
            alert('发送邀请失败，请稍后重试');
        }
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            await databaseService.updateMemberRole(projectId, memberId, newRole);
            if (onMembersUpdate) onMembersUpdate();
        } catch (error) {
            console.error('Error updating role:', error);
            alert('更新角色失败');
        }
    };

    const joinedMembers = members;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-xl font-bold text-gray-900">邀请亲友加入项目</h2>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-400"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 mb-6">
                            邀请亲友加入此项目，他们可以查看故事、添加提示并贡献照片。
                        </p>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">通过手机号邀请</label>
                                <form onSubmit={handleInvite} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="tel"
                                            value={invitePhone}
                                            onChange={(e) => setInvitePhone(e.target.value)}
                                            placeholder="输入手机号"
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-sm"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition-all active:scale-95 cursor-pointer text-sm"
                                    >
                                        邀请
                                    </button>
                                </form>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">项目成员</h4>
                                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {(invitations.length === 0 && joinedMembers.length === 0) ? (
                                        <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-sm text-gray-400">暂无邀请或加入记录</p>
                                        </div>
                                    ) : (
                                        <>
                                            {invitations.map((inv, idx) => (
                                                <div key={`inv-${inv.phone || inv.email}-${idx}`} className="flex items-center justify-between group">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 shrink-0 border border-gray-100">
                                                            <UserPlus className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 truncate">{inv.phone || inv.email}</p>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                                                <span className="text-xs text-gray-500">未加入</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {joinedMembers.map(member => (
                                                <div key={member.id} className="flex items-center justify-between group">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0 border border-gray-100 uppercase overflow-hidden">
                                                            <img
                                                                src={getAvatarUrl(member.user)}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-gray-800 truncate">{member.user?.full_name || member.user?.phone || '未知用户'}</p>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                <span className="text-xs text-emerald-600">已加入</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {member.projectRole === 'owner' ? (
                                                            <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded-md">所有者</span>
                                                        ) : (
                                                            <div className="relative group/select">
                                                                <select
                                                                    value={member.projectRole}
                                                                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                                    className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-md px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                                                                >
                                                                    <option value="storyteller">讲述人</option>
                                                                    <option value="collaborator">协作者</option>
                                                                </select>
                                                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-100"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-3 text-gray-400">或者</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">分享项目邀请链接</p>

                                <div className="flex justify-center gap-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(`${window.location.origin}?inviteProjectId=${projectId}`);
                                                setLinkCopied(true);
                                                setTimeout(() => setLinkCopied(false), 3000);
                                            }}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${linkCopied ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'
                                                }`}
                                        >
                                            {linkCopied ? <CheckCheck className="w-5 h-5" /> : <Link2 className="w-5 h-5 text-[#BEF264]" />}
                                        </button>
                                        <span className="text-[10px] font-medium text-gray-500">复制链接</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={async () => {
                                                const link = `${window.location.origin}?inviteProjectId=${projectId}`;
                                                await navigator.clipboard.writeText(link);
                                                window.location.href = `weixin://dl/chat`;
                                                alert('链接已复制，请在微信中粘贴发送给亲友');
                                            }}
                                            className="w-12 h-12 rounded-full bg-[#07C160] text-white flex items-center justify-center hover:opacity-90 transition-all cursor-pointer shadow-sm"
                                        >
                                            <MessageCircle className="w-6 h-6 fill-current" />
                                        </button>
                                        <span className="text-[10px] font-medium text-gray-500">微信</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-2">
                                        <button
                                            onClick={() => setShowEmailInput(!showEmailInput)}
                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${showEmailInput ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                }`}
                                        >
                                            <Mail className="w-5 h-5" />
                                        </button>
                                        <span className="text-[10px] font-medium text-gray-500">邮件</span>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {showEmailInput && (
                                        <motion.form
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            onSubmit={handleEmailInvite}
                                            className="pt-2"
                                        >
                                            <div className="flex gap-2">
                                                <input
                                                    type="email"
                                                    value={inviteEmail}
                                                    onChange={(e) => setInviteEmail(e.target.value)}
                                                    placeholder="输入邮箱地址"
                                                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    required
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isEmailSent}
                                                    className={`px-4 py-2 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center min-w-[64px] ${isEmailSent ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
                                                        }`}
                                                >
                                                    {isEmailSent ? <CheckCheck className="w-4 h-4" /> : '发送'}
                                                </button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
