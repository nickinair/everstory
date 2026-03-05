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
            title: '无限AI故事创作',
            description: '享受无限次的AI辅助录入和润色服务，让回忆更精彩。',
            color: 'text-amber-500',
            bg: 'bg-amber-50'
        },
        {
            icon: BookOpen,
            title: '精装传记书籍',
            description: '包含一本价值¥599的线下精装纸质传记，全国包邮。',
            color: 'text-blue-500',
            bg: 'bg-blue-50'
        },
        {
            icon: ShieldCheck,
            title: '永久云端存储',
            description: '您的家庭故事和多媒体资料将获得永久加密存储空间。',
            color: 'text-green-500',
            bg: 'bg-green-50'
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
                    <span>返回设置</span>
                </button>
                <h1 className="text-xl font-medium text-gray-800">订阅计划</h1>
                <div className="w-20" /> {/* Spacer for centering */}
            </div>

            {/* Membership Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden rounded-3xl p-8 mb-8 shadow-xl transition-all ${isPremium
                    ? 'bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 text-amber-950 ring-1 ring-amber-400/50'
                    : 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-teal-900/10'
                    }`}
            >
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-xl scale-110 shadow-sm ${isPremium ? 'bg-white/40 text-amber-900' : 'bg-white/20 text-white'}`}>
                                <Star className="w-6 h-6 fill-current" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">
                                    {isPremium ? '尊享会员 · 已激活' : '免费版用户'}
                                </h2>
                                <p className={`${isPremium ? 'text-amber-800' : 'text-white/70'} text-sm mt-1`}>
                                    {isPremium ? '感谢您支持长生记 Everstory' : '升级以解锁更多专业功能'}
                                </p>
                            </div>
                        </div>
                        {isPremium && (
                            <div className="bg-amber-900/10 border border-amber-900/20 px-4 py-1.5 rounded-full text-amber-900 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                Premium
                            </div>
                        )}
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 p-6 rounded-2xl border ${isPremium
                        ? 'bg-white/30 border-amber-900/10'
                        : 'bg-white/5 border-white/10 backdrop-blur-sm'
                        }`}>
                        <div className="flex items-center space-x-4">
                            <Clock className={`w-5 h-5 ${isPremium ? 'text-amber-900/40' : 'text-white/50'}`} />
                            <div>
                                <p className={`text-xs font-medium uppercase tracking-wider ${isPremium ? 'text-amber-900/50' : 'text-white/50'}`}>有效期至</p>
                                <p className="text-lg font-bold">{isPremium ? '2026年03月05日' : '----'}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <CreditCard className={`w-5 h-5 ${isPremium ? 'text-amber-900/40' : 'text-white/50'}`} />
                            <div>
                                <p className={`text-xs font-medium uppercase tracking-wider ${isPremium ? 'text-amber-900/50' : 'text-white/50'}`}>当前套餐</p>
                                <p className="text-lg font-bold">{isPremium ? '精装传记尊享版' : '基础体验版'}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onRenew}
                        className={`mt-8 w-full py-4 rounded-2xl font-bold shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 ${isPremium
                            ? 'bg-amber-950 text-white hover:bg-black hover:scale-[1.01] active:scale-[0.99]'
                            : 'bg-white text-gray-900 hover:shadow-white/20 hover:scale-[1.01] active:scale-[0.99]'
                            }`}
                    >
                        <span>{isPremium ? '提前续费' : '立即升级'}</span>
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Decorative background elements */}
                {isPremium ? (
                    <>
                        <div className="absolute top-[-10%] right-[-5%] w-72 h-72 bg-white/20 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute bottom-[-10%] left-[-5%] w-72 h-72 bg-amber-500/20 rounded-full blur-3xl" />
                    </>
                ) : (
                    <>
                        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-amber-400/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-teal-400/10 rounded-full blur-3xl shadow-[0_0_100px_rgba(255,255,255,0.1)]" />
                    </>
                )}
            </motion.div>

            {/* Benefits Section */}
            <h3 className="text-lg font-bold text-gray-800 mb-6 px-2">尊享版核心权益</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
