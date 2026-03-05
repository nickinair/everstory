import React from 'react';
import { motion } from 'motion/react';
import {
    ShieldCheck,
    ChevronLeft,
    Star,
    Zap,
    BookOpen,
    Clock,
    CreditCard,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import { User as UserType, Order } from '../types';

interface MembershipManagementViewProps {
    currentUser: UserType | null;
    orders: Order[];
    onBack: () => void;
    onRenew: () => void;
}

export default function MembershipManagementView({
    currentUser,
    orders,
    onBack,
    onRenew
}: MembershipManagementViewProps) {
    const isPremium = currentUser?.is_premium;

    // Filter membership related orders (orders with price and processing/completed status)
    const membershipOrders = orders.filter(o => parseFloat(o.price) > 0);

    const benefits = [
        {
            icon: Zap,
            title: '无限次数故事录制',
            description: '享受无限次的录入和AI润色辅助服务，让人生回忆更完整。',
            color: 'text-amber-500',
            bg: 'bg-amber-50'
        },
        {
            icon: BookOpen,
            title: '定制精装传记',
            description: '包含一份尊享定制的线下精装纸质传记，支持个性化排版，全国包邮。',
            color: 'text-blue-500',
            bg: 'bg-blue-50'
        },
        {
            icon: ShieldCheck,
            title: '永久云端音视频存储',
            description: '您的家庭故事、录音和高清视频资料将获得永久加密云端存储空间。',
            color: 'text-green-500',
            bg: 'bg-green-50'
        },
        {
            icon: Star,
            title: '专业级 AI 深度写作',
            description: '基于深度学习的AI模型，为您提供文学级的传记内容润色与结构建议。',
            color: 'text-purple-500',
            bg: 'bg-purple-50'
        },
        {
            icon: ShieldCheck,
            title: '30天无忧退款保证',
            description: '我们对服务充满信心。如果您在30天内不满意，我们将无条件全额退款。',
            color: 'text-rose-500',
            bg: 'bg-rose-50'
        }
    ];

    return (
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center text-gray-500 hover:text-gray-800 transition cursor-pointer"
                >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    <span>返回</span>
                </button>
                <h1 className="text-xl font-medium text-gray-800">订阅计划</h1>
                <div className="w-20" /> {/* Spacer for centering */}
            </div>

            {/* Membership Comparison or Card */}
            {!isPremium ? (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-12 relative">
                    {/* Free Plan Box */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full md:w-[45%] bg-white rounded-3xl p-6 border-2 border-gray-100 shadow-sm relative overflow-hidden group hover:border-teal-500/20 transition-colors"
                    >
                        <div className="relative z-10">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
                                    <Star className="w-5 h-5 fill-current" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">免费版</h2>
                                    <p className="text-gray-400 text-xs">当前版本</p>
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-gray-50">
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                    <span className="text-sm">2 个故事录制上限</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                    <span className="text-sm">基础 AI 辅助体验</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                    <span className="text-sm">仅电子书（带水印）</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-400 opacity-50">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                    <span className="text-sm line-through">定制精装传记</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Star className="w-24 h-24 text-teal-600 rotate-12" />
                        </div>
                    </motion.div>

                    {/* Arrow / Connection */}
                    <div className="hidden md:flex flex-col items-center justify-center space-y-2 text-amber-500 z-10">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: [0, -6, 0],
                            }}
                            transition={{
                                y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
                                opacity: { duration: 0.5 }
                            }}
                            className="relative"
                        >
                            <svg width="48" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
                                    </linearGradient>
                                </defs>
                                <path d="M4 28C12 28 20 24 32 8" stroke="url(#arrowGradient)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 6" />
                                <path d="M26 8H34V16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="34" cy="8" r="2" fill="currentColor" />
                            </svg>
                        </motion.div>
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-600/50 bg-white/40 px-2 py-0.5 rounded-lg backdrop-blur-[2px] border border-amber-50/50">Upgrade</span>
                    </div>

                    <div className="md:hidden py-2 text-amber-500">
                        <ArrowRight className="w-6 h-6 rotate-90" />
                    </div>

                    {/* Premium Plan Box */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full md:w-[45%] bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl p-6 text-white shadow-xl shadow-amber-200 relative overflow-hidden group cursor-pointer"
                        onClick={onRenew}
                    >
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-xl bg-white/20">
                                        <Star className="w-5 h-5 fill-current" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">尊享版</h2>
                                        <p className="text-white/70 text-xs">强烈推荐</p>
                                    </div>
                                </div>
                                <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Premium</div>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-white/10">
                                <div className="flex items-center space-x-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    <span className="text-sm">无限次数故事录制</span>
                                </div>
                                <div className="flex items-center space-x-3 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    <span className="text-sm">定制精装传记</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    <span className="text-sm">专业级 AI 深度写作</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                    <span className="text-sm text-white/90">永久云端音视频存储</span>
                                </div>
                                <div className="relative flex items-center space-x-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                                    <span className="text-sm text-amber-100">30天无忧退款保证</span>
                                </div>
                            </div>
                            <button className="mt-8 w-full py-3 bg-white text-amber-600 rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-2">
                                <span>立即升级</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </motion.div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl p-8 mb-12 shadow-xl bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 text-amber-950 ring-1 ring-amber-400/50"
                >
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-xl scale-110 shadow-sm bg-white/40 text-amber-900">
                                    <Star className="w-6 h-6 fill-current" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">尊享会员 · 已激活</h2>
                                    <p className="text-amber-800 text-sm mt-1">感谢您支持长生记 Everstory</p>
                                </div>
                            </div>
                            <div className="bg-amber-900/10 border border-amber-900/20 px-4 py-1.5 rounded-full text-amber-900 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                Premium
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 p-6 rounded-2xl border bg-white/30 border-amber-900/10">
                            <div className="flex items-center space-x-4">
                                <Clock className="w-5 h-5 text-amber-900/40" />
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-amber-900/50">有效期至</p>
                                    <p className="text-lg font-bold">2026年03月05日</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <CreditCard className="w-5 h-5 text-amber-900/40" />
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-amber-900/50">当前套餐</p>
                                    <p className="text-lg font-bold">定制精装传记尊享版</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onRenew}
                            className="mt-8 w-full py-4 rounded-2xl font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 bg-amber-950 text-white hover:bg-black hover:scale-[1.01] active:scale-[0.99]"
                        >
                            <span>提前续费</span>
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Decorative background elements */}
                    <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-white/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-[-10%] left-[-5%] w-72 h-72 bg-amber-500/20 rounded-full blur-3xl" />
                </motion.div>
            )}

            {/* Benefits Section */}
            <h3 className="text-lg font-bold text-gray-800 mb-6 px-2">尊享版核心权益</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {benefits.map((benefit, idx) => (
                    <motion.div
                        key={benefit.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * idx }}
                        className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className={`w-12 h-12 ${benefit.bg} ${benefit.color} rounded-2xl flex items-center justify-center mb-4`}>
                            <benefit.icon className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-gray-800 mb-2">{benefit.title}</h4>
                        <p className="text-sm text-gray-500 leading-relaxed">{benefit.description}</p>
                    </motion.div>
                ))}
            </div>

            {/* History */}
            <h3 className="text-lg font-bold text-gray-800 mb-6 px-2">账单记录</h3>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {membershipOrders.length > 0 ? (
                    membershipOrders.map((order, idx) => (
                        <div
                            key={order.id}
                            className={`p-6 flex items-center justify-between ${idx !== membershipOrders.length - 1 ? 'border-b border-gray-50' : ''
                                }`}
                        >
                            <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800">{order.bookTitle || '会员订阅项目'}</p>
                                    <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at || Date.now()).toLocaleDateString('zh-CN')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-gray-800">¥{order.price}</p>
                                <div className="flex items-center justify-end mt-1 text-[10px] text-green-500 font-bold uppercase">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    <span>已完成</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <p className="text-gray-400">暂无订阅相关的账单记录</p>
                    </div>
                )}
            </div>
        </div>
    );
}
