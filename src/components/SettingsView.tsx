import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, Bell, Shield, LogOut, ChevronRight, Folder, Users, Plus, Loader2, Settings } from 'lucide-react';
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
}

export default function SettingsView({ projects, currentUser, onProjectClick, onViewDetails, onProjectCreated, hasOrder, onShowUpgrade }: SettingsViewProps) {
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
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 lg:mb-10"
      >
        <h1 className="text-2xl lg:text-3xl font-light text-gray-800 mb-2">项目设置</h1>
        <p className="text-sm lg:text-base text-gray-500">管理您的账户偏好和长生記项目设置。</p>
      </motion.div>

      <div className="space-y-10">
        {/* Projects Section */}
        <section>
          <div className="flex items-center justify-between mb-4 px-4">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest">
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
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center hover:bg-gray-50 transition text-left group"
              >
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent mr-4">
                  <Folder className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-bold text-gray-800">{project.name}</p>
                    <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">所有者</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    {project.members.length + 1} 位成员 • 创建于 {project.createdAt}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(project.id);
                    }}
                    className="p-2 text-gray-400 hover:text-accent transition-colors"
                    title="项目详情"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                </div>
              </button>
            ))}
            {myProjects.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400 mb-4">您还没有创建任何项目</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-6 py-2 bg-accent text-white rounded-full text-sm font-bold hover:bg-teal-700 transition shadow-sm"
                >
                  立即创建
                </button>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4 px-4">
            我加入的项目
          </h2>
          <div className="space-y-4">
            {joinedProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => onProjectClick(project.id)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center hover:bg-gray-50 transition text-left group"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mr-4">
                  <Folder className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">{project.name}</p>
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    {project.members.length + 1} 位成员 • 创建于 {project.createdAt}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails(project.id);
                    }}
                    className="p-2 text-gray-400 hover:text-accent transition-colors"
                    title="项目详情"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${(project.ownerId || (project as any).owner_id) === currentUser?.id ? 'text-accent bg-accent/10' : 'text-blue-500 bg-blue-50'}`}>
                    {(project.ownerId || (project as any).owner_id) === currentUser?.id ? '所有者' : '协作者'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                </div>
              </button>
            ))}
            {joinedProjects.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-400">暂未加入项目</p>
              </div>
            )}
          </div>
        </section>

      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">新建项目</h2>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">项目名称</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="例如：我的家族史"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">项目描述</label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="简单介绍一下这个项目..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent outline-none transition resize-none"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 bg-accent text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{isCreating ? '创建中...' : '创建项目'}</span>
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
