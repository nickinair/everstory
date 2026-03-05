import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Bell, Shield, LogOut, ChevronRight, Folder, Users, Plus, Loader2, Settings as SettingsIcon } from 'lucide-react';
import PremiumBanner from './PremiumBanner';
import { databaseService } from '../services/databaseService';
import { Project, User } from '../types';

interface SettingsViewProps {
  projects: Project[];
  currentUser: User | null;
  onProjectClick: (id: string) => void;
  onViewDetails: (id: string) => void;
  onProjectCreated: () => void;
  hasOrder: boolean;
  onShowUpgrade: () => void;
  onBack?: () => void;
}

export default function SettingsView({ projects, currentUser, onProjectClick, onViewDetails, onProjectCreated, hasOrder, onShowUpgrade, onBack }: SettingsViewProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);


  const myProjects = projects.filter(p => (p.ownerId || (p as any).owner_id) === currentUser?.id);
  const joinedProjects = projects.filter(p => (p.ownerId || (p as any).owner_id) !== currentUser?.id);
  const MAX_PROJECTS = 5;

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasOrder && myProjects.length >= 2) {
      onShowUpgrade();
      return;
    }
    if (myProjects.length >= MAX_PROJECTS) {
      alert(`已达到项目最大上限（${MAX_PROJECTS}个）`);
      return;
    }
    if (!newProjectName.trim()) return;

    if (projects.some(p => p.name.trim() === newProjectName.trim())) {
      alert('已存在同名项目，请使用其他名称');
      return;
    }

    setIsCreating(true);
    try {
      await databaseService.createProject(newProjectName, newProjectDesc);
      alert('项目创建成功！');
      setIsCreateModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      onProjectCreated();
    } catch (error) {
      console.error('Error creating project:', error);
      alert('创建失败，请稍后重试。');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      <PremiumBanner
        title="项目设置"
        subtitle="Project Settings"
        icon={SettingsIcon}
        onBack={onBack}
        gradientClass="from-slate-100 via-slate-50 to-white"
        iconBgClass="bg-slate-600"
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-10 pb-12">
          {/* Projects Section */}
          <section>
            <div className="flex items-center justify-between mb-4 px-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                我创建的项目 ({myProjects.length}/{hasOrder ? MAX_PROJECTS : 2})
              </h2>
              {myProjects.length < MAX_PROJECTS && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center space-x-1 text-xs font-bold text-accent hover:text-teal-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>新建项目</span>
                </button>
              )}
            </div>
            <div className="space-y-4">
              {myProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onProjectClick(project.id)}
                  className="w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-center hover:bg-gray-50/80 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mr-4 group-hover:bg-accent/20 transition-colors">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-base font-bold text-gray-800">{project.name}</p>
                      <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0 border border-accent/20">所有者</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center font-medium">
                      <Users className="w-3 h-3 mr-1 opacity-60" />
                      {project.members.length} 位成员 • 创建于 {project.createdAt}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(project.id);
                      }}
                      className="p-2.5 text-gray-400 hover:text-accent hover:bg-black/5 rounded-xl transition-all"
                      title="项目详情"
                    >
                      <SettingsIcon className="w-5 h-5" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
              {myProjects.length === 0 && (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <Folder className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-gray-400 mb-6 font-medium">您还没有创建任何项目</p>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-8 py-3 bg-accent text-white rounded-2xl text-sm font-bold hover:bg-teal-700 transition-all shadow-lg shadow-accent/20"
                  >
                    立即创建
                  </button>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-4">
              我加入的项目
            </h2>
            <div className="space-y-4">
              {joinedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onProjectClick(project.id)}
                  className="w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex items-center hover:bg-gray-50/80 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mr-4 group-hover:bg-blue-100 transition-colors">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold text-gray-800">{project.name}</p>
                    <p className="text-xs text-gray-500 mt-2 flex items-center font-medium">
                      <Users className="w-3 h-3 mr-1 opacity-60" />
                      {project.members.length} 位成员 • 创建于 {project.createdAt}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(project.id);
                      }}
                      className="p-2.5 text-gray-400 hover:text-accent hover:bg-black/5 rounded-xl transition-all"
                      title="项目详情"
                    >
                      <SettingsIcon className="w-5 h-5" />
                    </button>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider border border-transparent ${(project.ownerId || (project as any).owner_id) === currentUser?.id ? 'text-accent bg-accent/10 border-accent/20' : 'text-blue-500 bg-blue-50 border-blue-100'}`}>
                      {(project.ownerId || (project as any).owner_id) === currentUser?.id ? '所有者' : '协作者'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
              {joinedProjects.length === 0 && (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <Users className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">暂未加入项目</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-2">新建项目</h2>
              <p className="text-sm text-gray-500 mb-8">开始记录一段新的人物传奇故事。</p>

              <form onSubmit={handleCreateProject} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest px-1">项目名称</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="例如：我的家族史"
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-accent focus:bg-white outline-none transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest px-1">项目描述</label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="简单介绍一下这个项目..."
                    rows={3}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-accent focus:bg-white outline-none transition-all resize-none font-medium"
                  />
                </div>
                <div className="flex flex-col space-y-3 pt-4">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full bg-accent text-white py-4 rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-accent/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isCreating && <Loader2 className="w-5 h-5 animate-spin" />}
                    <span>{isCreating ? '创建中...' : '创建项目'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="w-full py-3 rounded-2xl font-bold text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
