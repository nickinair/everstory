import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Users, UserPlus, Trash2, Shield, User as UserIcon, MoreVertical, Phone, AlertTriangle, X } from 'lucide-react';
import { getAvatarUrl } from '../lib/avatar';
import { Project, ProjectMember, User } from '../types';
import { databaseService } from '../services/databaseService';
import InviteModal from './InviteModal';

interface ProjectDetailViewProps {
  project: Project;
  currentUser: User | null;
  onBack: () => void;
  onUpdate: () => void;
}

export default function ProjectDetailView({ project, currentUser, onBack, onUpdate }: ProjectDetailViewProps) {
  const isOwner = project.ownerId === currentUser?.id || (project as any).owner_id === currentUser?.id;
  const [members, setMembers] = useState<ProjectMember[]>(project.members);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(project.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [projectDescription, setProjectDescription] = useState(project.description);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveInfo = async (field: 'name' | 'description') => {
    const isName = field === 'name';
    const currentValue = isName ? projectName : projectDescription;
    const originalValue = isName ? project.name : project.description;

    if (!currentValue.trim() || currentValue === originalValue) {
      if (isName) setProjectName(project.name);
      else setProjectDescription(project.description);

      if (isName) setIsEditingName(false);
      else setIsEditingDescription(false);
      return;
    }

    try {
      await databaseService.updateProject(project.id, { [field]: currentValue });
      if (isName) setIsEditingName(false);
      else setIsEditingDescription(false);
      onUpdate();
    } catch (error) {
      console.error(`Error updating project ${field}:`, error);
      alert('更新失败，请重试');
      if (isName) {
        setProjectName(project.name);
        setIsEditingName(false);
      } else {
        setProjectDescription(project.description);
        setIsEditingDescription(false);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (confirmName !== project.name) return;
    setIsDeleting(true);
    try {
      await databaseService.deleteProject(project.id);
      setIsDeleteModalOpen(false);
      onUpdate();
      onBack();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteMember = (memberId: string) => {
    if (!isOwner) return;
    if (memberId === currentUser?.id) {
      alert('您不能删除自己');
      return;
    }
    if (confirm('确定要移除该成员吗？')) {
      setMembers(members.filter(m => m.id !== memberId));
    }
  };

  const handleRoleChange = (memberId: string, newRole: 'owner' | 'collaborator' | 'storyteller') => {
    if (!isOwner) return;
    setMembers(members.map(m => m.id === memberId ? { ...m, projectRole: newRole } : m));
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
          <h1 className="text-xl font-light text-gray-800">项目详情</h1>
        </div>
        {isOwner && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-accent hover:bg-teal-700 text-white rounded-full font-medium transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">邀请成员</span>
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Project Info */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 mr-4">
                {isEditingName ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      onBlur={() => handleSaveInfo('name')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveInfo('name')}
                      autoFocus
                      className="text-2xl font-bold text-gray-800 border-b border-accent outline-none bg-transparent w-full"
                    />
                  </div>
                ) : (
                  <div className="flex items-center group">
                    <h2
                      onClick={() => isOwner && setIsEditingName(true)}
                      className={`text-2xl font-bold text-gray-800 mb-1 ${isOwner ? 'cursor-pointer hover:text-accent transition-colors' : ''}`}
                    >
                      {projectName}
                    </h2>
                    {isOwner && (
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="ml-2 p-1 text-gray-300 hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {isEditingDescription ? (
                  <div className="mt-2">
                    <textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      onBlur={() => handleSaveInfo('description')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveInfo('description');
                        }
                      }}
                      autoFocus
                      rows={2}
                      className="text-sm text-gray-600 border border-gray-100 rounded-lg p-2 outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-accent w-full resize-none"
                    />
                  </div>
                ) : (
                  <p
                    onClick={() => isOwner && setIsEditingDescription(true)}
                    className={`text-sm text-gray-500 leading-relaxed ${isOwner ? 'cursor-pointer hover:text-gray-700 transition-colors' : ''}`}
                  >
                    {projectDescription || '暂无项目描述，点击添加'}
                  </p>
                )}
              </div>
              <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-wider h-fit">
                创建于 {project.createdAt}
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-2" />
                  {members.length} 位成员
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Shield className="w-4 h-4 mr-2" />
                  您的角色: <span className={`ml-1 font-medium ${isOwner ? 'text-accent' : 'text-gray-600'}`}>{isOwner ? '所有者' : '协作者'}</span>
                </div>
              </div>

              {isOwner && (
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"
                  title="删除项目"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </section>

          {/* Members List */}
          <section className="space-y-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest px-4">项目成员</h3>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                      <img
                        src={getAvatarUrl({ id: member.userId, full_name: member.name, avatar_url: member.avatar } as any)}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.phone || member.email || '无联系方式'}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {isOwner && member.id !== currentUser?.id ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={member.projectRole}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                          className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-accent"
                        >
                          <option value="owner">所有者</option>
                          <option value="collaborator">协作者</option>
                          <option value="storyteller">讲述人</option>
                        </select>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${member.projectRole === 'owner' ? 'text-accent bg-accent/10' : 'text-blue-500 bg-blue-50'
                        }`}>
                        {member.projectRole === 'owner' ? '所有者' :
                          member.projectRole === 'collaborator' ? '协作者' : '讲述人'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Delete Project Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="bg-red-600 p-6 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-800 text-center mb-4">确定要删除该项目吗？</h3>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-sm text-red-700 leading-relaxed shadow-inner">
                  <p className="font-bold flex items-center gap-2 mb-2">
                    <Trash2 className="w-4 h-4" />
                    此操作极其危险且不可逆：
                  </p>
                  <ul className="list-disc list-inside space-y-1 opacity-90 font-medium">
                    <li>永久删除该项目及其所有设置</li>
                    <li>永久删除该项目下的所有故事和录音</li>
                    <li>永久删除所有已发送的提示条目</li>
                    <li>立即移除所有项目成员的访问权限</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest px-1">
                      输入项目名称以确认删除
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={project.name}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-red-500 focus:bg-white outline-none transition-all font-bold text-gray-800"
                        autoFocus
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400 text-center">
                      请精确输入: <span className="text-gray-600 font-bold select-all">{project.name}</span>
                    </p>
                  </div>

                  <div className="flex flex-col space-y-3 pt-4">
                    <button
                      disabled={confirmName !== project.name || isDeleting}
                      onClick={handleDeleteProject}
                      className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${confirmName === project.name && !isDeleting
                        ? 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                        }`}
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          正在永久删除...
                        </>
                      ) : (
                        '我已了解风险，确定永久删除'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsDeleteModalOpen(false);
                        setConfirmName('');
                      }}
                      className="w-full py-3 bg-gray-50 text-gray-600 rounded-2xl font-bold hover:bg-gray-100 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        projectId={project.id}
        members={members}
        onMembersUpdate={onUpdate}
      />
    </div>
  );
}
