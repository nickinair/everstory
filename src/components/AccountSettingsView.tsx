import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAvatarUrl } from '../lib/avatar';
import { User, Mail, Phone, Lock, LogOut, ChevronRight, Bell, Shield, CreditCard, HelpCircle, Edit2, Star } from 'lucide-react';
import { User as UserType } from '../types';
import { supabase } from '../lib/supabaseClient';
import { databaseService } from '../services/databaseService';

interface AccountSettingsViewProps {
  currentUser: UserType | null;
  onNavigate?: (view: string) => void;
}

export default function AccountSettingsView({ currentUser, onNavigate }: AccountSettingsViewProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const accountSections = [
    {
      title: '账户安全',
      items: [
        { icon: Phone, label: '手机号码', value: currentUser?.phone || '未设置' },
        { icon: Mail, label: '电子邮箱', value: currentUser?.email || '未设置' },
        { icon: Lock, label: '登录密码', value: '已设置' },
      ]
    },
    {
      title: '偏好设置',
      items: [
        { icon: Bell, label: '通知设置', description: '管理提示提醒和家庭动态通知' },
        { icon: Shield, label: '隐私设置', description: '管理您的数据可见性和隐私选项' },
      ]
    },
    {
      title: '订阅管理',
      items: [
        { icon: CreditCard, label: '订阅计划', description: '查看当前方案和账单历史' },
        { icon: HelpCircle, label: '帮助中心', description: '常见问题、教程和联系支持' },
      ]
    }
  ];

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState(currentUser?.full_name || '');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleUpdateName = async () => {
    if (!currentUser || !editedName.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await databaseService.syncProfile(currentUser.id, { full_name: editedName.trim() });
      setIsEditingName(false);
      // Trigger a reload or state update in parent if needed - for now window.location.reload() is simplest for sync
      window.location.reload();
    } catch (error) {
      console.error('Error updating name:', error);
      alert('更新失败，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 lg:mb-10"
      >
        <h1 className="text-2xl lg:text-3xl font-light text-gray-800 mb-2">账户设置</h1>
        <p className="text-sm lg:text-base text-gray-500">管理您的个人资料、安全和偏好设置。</p>
      </motion.div>

      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
            <div className="relative">
              <img
                src={getAvatarUrl(currentUser)}
                alt="Profile"
                className="w-20 h-24 lg:w-24 lg:h-24 rounded-full border-4 border-gray-50 object-cover shadow-sm"
                referrerPolicy="no-referrer"
              />
              <button className="absolute bottom-0 right-0 bg-white p-1.5 rounded-full shadow-md border border-gray-100 text-gray-500 hover:text-primary transition cursor-pointer">
                <User className="w-3 h-3 lg:w-4 lg:h-4" />
              </button>
            </div>
            <div className="pt-2 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-3">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-lg lg:text-xl font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-primary w-full max-w-[200px]"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateName}
                      disabled={isSaving}
                      className="p-1 px-3 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition disabled:opacity-50"
                    >
                      {isSaving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setEditedName(currentUser?.full_name || '');
                      }}
                      className="p-1 px-3 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg hover:bg-gray-200 transition"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg lg:text-xl font-medium text-gray-800">{currentUser?.full_name || '用户'}</h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 text-gray-400 hover:text-primary transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs lg:text-sm text-gray-500">{currentUser?.full_name} 的故事 • 成员自 2024</p>
            </div>
          </div>
        </motion.div>

        {accountSections.map((section, sIdx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + (sIdx * 0.1) }}
          >
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4 px-4">
              {section.title}
            </h2>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {section.items.map((item, iIdx) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.label === '订阅计划' && onNavigate) {
                      onNavigate('membership');
                    }
                  }}
                  className={`w-full flex items-center p-4 hover:bg-gray-50 transition text-left cursor-pointer border-l-2 border-transparent focus:outline-none focus:border-primary active:bg-gray-100 ${iIdx !== section.items.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                >
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 mr-4">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    {'description' in item ? (
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-0.5">{item.value}</p>
                    )}
                  </div>
                  {item.label === '订阅计划' && (
                    <div className={`mr-1 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center shadow-sm ${currentUser?.is_premium
                      ? 'bg-amber-100 text-amber-600 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                      {currentUser?.is_premium && <Star className="w-2.5 h-2.5 mr-1 fill-amber-600" />}
                      {currentUser?.is_premium ? '尊享版' : '免费版'}
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-4 bg-red-50 hover:bg-red-100 transition rounded-2xl text-red-600 font-medium cursor-pointer"
          >
            <LogOut className="w-5 h-5 mr-4" />
            <span>退出登录</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
