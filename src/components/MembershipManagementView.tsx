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
import PremiumBanner from './PremiumBanner';
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
            color: 'text-red-500',
            bg: 'bg-red-50'
        },
        {
            title: '隐私保护承诺',
            description: '采用端到端加密技术，保障通信内容全程加密，防范数据泄露风险。',
            icon: ShieldCheck,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50'
        }
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <PremiumBanner
                title="订阅计划"
                subtitle="Subscription Plan"
                icon={Star}
                onBack={onBack}
                gradientClass="from-amber-100 via-amber-50 to-white"
                iconBgClass="bg-amber-500"
            />

            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="max-w-4xl mx-auto pb-12">
                    {/* Membership Comparison or Card */}
                    {!isPremium ? (
                        <div className="grid grid-cols-2 gap-3 md:gap-6 mb-12 relative items-stretch">
                            {/* Free Plan Box */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 border-2 border-gray-100 shadow-sm relative overflow-hidden group hover:border-teal-500/20 transition-colors flex flex-col"
                            >
                                <div className="relative z-10 flex-1 flex flex-col">
                                    <div className="flex flex-col md:flex-row md:items-center items-start md:space-x-3 mb-4 md:mb-6 space-y-2 md:space-y-0">
                                        <div className="p-1.5 md:p-2 rounded-xl bg-teal-50 text-teal-600 self-start">
                                            <Star className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                                        </div>
                                        <div>
                                            <h2 className="text-base md:text-xl font-bold text-gray-800 leading-tight">免费版</h2>
                                            <p className="text-gray-400 text-[10px] md:text-xs mt-0.5">当前版本</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t border-gray-50 flex-1">
                                        <div className="flex items-start space-x-2 md:space-x-3 text-gray-600">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                                            <span className="text-[10px] md:text-sm leading-tight">10 个故事录制上限</span>
                                        </div>
                                        <div className="flex items-start space-x-2 md:space-x-3 text-gray-600">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                                            <span className="text-[10px] md:text-sm leading-tight">基础 AI 辅助体验</span>
                                        </div>
                                        <div className="flex items-start space-x-2 md:space-x-3 text-gray-600">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-teal-400 mt-1.5 shrink-0" />
                                            <span className="text-[10px] md:text-sm leading-tight">仅电子书（带水印）</span>
                                        </div>
                                        <div className="flex items-start space-x-2 md:space-x-3 text-gray-400 opacity-50">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                                            <span className="text-[10px] md:text-sm leading-tight line-through">定制精装传记</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 p-2 md:p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                    <Star className="w-16 h-16 md:w-24 md:h-24 text-teal-600 rotate-12" />
                                </div>
                            </motion.div>

                            {/* Arrow / Connection Badge */}
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
                                <div className="text-amber-500 w-12 md:w-16 flex items-center justify-center translate-y-2">
                                    <svg viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-md">
                                        <defs>
                                            <linearGradient id="arcArrow" x1="0%" y1="100%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                                                <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M4 24 C 20 4, 44 4, 56 16" stroke="url(#arcArrow)" strokeWidth="3" strokeLinecap="round" />
                                        <path d="M48 8 L 58 17 L 45 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>

                            {/* Premium Plan Box */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl md:rounded-3xl p-4 md:p-6 text-white shadow-xl shadow-amber-200 relative overflow-hidden group cursor-pointer flex flex-col"
                                onClick={onRenew}
                            >
                                <div className="relative z-10 flex-1 flex flex-col">
                                    <div className="flex flex-col md:flex-row md:items-center items-start justify-between mb-4 md:mb-6 gap-2 md:gap-0">
                                        <div className="flex items-start md:items-center md:space-x-3 space-x-2">
                                            <div className="p-1.5 md:p-2 rounded-xl bg-white/20 self-start">
                                                <Star className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                                            </div>
                                            <div>
                                                <h2 className="text-base md:text-xl font-bold leading-tight">尊享版</h2>
                                                <p className="text-white/70 text-[10px] md:text-xs mt-0.5">强烈推荐</p>
                                            </div>
                                        </div>
                                        <div className="bg-white/20 md:px-3 px-2 md:py-1 py-0.5 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-wider self-start md:self-auto shrink-0 hidden md:block">Premium</div>
                                    </div>
                                    <div className="space-y-3 md:space-y-4 pt-3 md:pt-4 border-t border-white/10 flex-1">
                                        <div className="flex items-start space-x-2 md:space-x-3">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                            <span className="text-[10px] md:text-sm leading-tight">无限次数故事录制</span>
                                        </div>
                                        <div className="flex items-start space-x-2 md:space-x-3 font-medium">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                            <span className="text-[10px] md:text-sm leading-tight">定制精装传记</span>
                                        </div>
                                        <div className="flex items-start space-x-2 md:space-x-3">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white mt-1.5 shrink-0" />
                                            <span className="text-[10px] md:text-sm leading-tight">专业级 AI 深度写作</span>
                                        </div>
                                        <div className="flex items-start space-x-2 md:space-x-3">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white/80 mt-1.5 shrink-0" />
                                            <span className="text-[10px] md:text-sm leading-tight text-white/90">永久云端音视频存储</span>
                                        </div>
                                        <div className="relative flex items-start space-x-2 md:space-x-3">
                                            <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_rgba(251,191,36,0.6)] mt-1.5 shrink-0" />
                                            <span className="text-[10px] md:text-sm leading-tight text-amber-100">30天无忧退款保证</span>
                                        </div>
                                    </div>
                                    <button className="mt-4 md:mt-8 w-full py-2.5 md:py-3 bg-white text-amber-600 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center space-x-1.5 md:space-x-2">
                                        <span>立即升级</span>
                                        <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                                    </button>
                                </div>
                                {/* Shimmer Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
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
                                            <p className="text-lg font-bold">尊享版（含定制精装传记）</p>
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
                    <div className="grid grid-cols-2 gap-3 md:gap-6 mb-12">
                        {benefits.map((benefit, idx) => (
                            <motion.div
                                key={benefit.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * idx }}
                                className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-start"
                            >
                                <div className={`w-8 h-8 md:w-12 md:h-12 ${benefit.bg} ${benefit.color} rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4`}>
                                    <benefit.icon className="w-4 h-4 md:w-6 md:h-6" />
                                </div>
                                <h4 className="font-bold text-gray-800 text-[13px] md:text-base mb-1.5 md:mb-2 leading-tight">{benefit.title}</h4>
                                <p className="text-[10px] md:text-sm text-gray-500 leading-snug md:leading-relaxed">{benefit.description}</p>
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
            </div>
        </div>
    );
}
