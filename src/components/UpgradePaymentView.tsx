import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ChevronLeft,
    Star,
    Zap,
    BookOpen,
    ShieldCheck,
    Check,
    CreditCard,
    Ticket,
    ChevronRight,
    RefreshCw,
    Sparkles
} from 'lucide-react';
import { User as UserType } from '../types';
import { databaseService } from '../services/databaseService';

interface UpgradePaymentViewProps {
    currentUser: UserType | null;
    projectId: string;
    onBack: () => void;
    onSuccess: () => void;
}

export default function UpgradePaymentView({
    currentUser,
    projectId,
    onBack,
    onSuccess
}: UpgradePaymentViewProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'checkout' | 'complete'>('checkout');
    const [usePoints, setUsePoints] = useState(false);

    const originalPrice = 599;
    const availablePoints = currentUser?.points || 0;
    const pointsDeduction = usePoints ? Math.min(availablePoints, originalPrice) : 0;
    const totalPrice = originalPrice - pointsDeduction;

    const benefits = [
        { icon: Zap, text: '无限AI故事创作与润色' },
        { icon: BookOpen, text: '包含1本价值¥599的精装传记' },
        { icon: ShieldCheck, text: '永久云端加密存储' },
        { icon: Star, text: '尊贵高级会员标识' }
    ];

    const handlePayment = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            // 1. Spend points if requested
            if (usePoints && pointsDeduction > 0) {
                await databaseService.spendPoints(
                    Math.round(pointsDeduction),
                    `升级高级会员: 精装传记套餐`
                );
            }

            // 2. Create order (membership is granted via createOrder logic)
            await databaseService.createOrder(projectId, {
                bookTitle: '高级会员精装传记套装',
                bookSubtitle: '',
                bookAuthor: currentUser?.full_name || '',
                coverColor: '#F59E0B',
                imageUrl: '',
                price: totalPrice.toFixed(2),
                status: 'processing',
                recipientName: currentUser?.full_name || '',
                contactPhone: currentUser?.phone || '',
                shippingAddress: ''
            });

            setStep('complete');
        } catch (error) {
            console.error('Error upgrading:', error);
            alert('处理失败，请稍后重试。');
        } finally {
            setIsProcessing(false);
        }
    };

    if (step === 'complete') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-gray-100"
                >
                    <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-10 h-10 fill-current" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">欢迎加入高级会员</h2>
                    <p className="text-gray-500 mb-8">
                        您的账户已成功升级。现在您可以享受无限AI创作和精选权益。
                    </p>
                    <button
                        onClick={onSuccess}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all cursor-pointer"
                    >
                        开启奇妙旅程
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-full cursor-pointer transition-colors">
                        <ChevronLeft className="w-6 h-6 text-gray-500" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">升级高级会员</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Benefits & Package */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl p-8 text-white shadow-lg shadow-amber-200">
                        <h2 className="text-2xl font-bold mb-2">精装传记尊享版</h2>
                        <p className="text-white/80 text-sm mb-6">一次性开启所有专业功能与定制服务</p>
                        <div className="text-4xl font-bold mb-8">¥599<span className="text-sm font-normal opacity-70 ml-2">一次性付费</span></div>

                        <div className="space-y-4">
                            {benefits.map((b, i) => (
                                <div key={i} className="flex items-center space-x-3">
                                    <div className="bg-white/20 p-1 rounded-full">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium">{b.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                            <Star className="w-5 h-5 text-amber-500 mr-2" />
                            为什么选择高级版？
                        </h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            您的故事值得被精美记录。高级会员不仅能大幅提升AI创作体验，
                            更包含了一本线下高品质印刷的纸质传记，让回忆真正能够拿在手里，传给后代。
                        </p>
                    </div>
                </div>

                {/* Right: Payment Details */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4">支付详情</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between text-gray-600">
                                <span>套餐总计</span>
                                <span>¥{originalPrice.toFixed(2)}</span>
                            </div>

                            <div className="pt-4 border-t border-dashed border-gray-100">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <Ticket className="w-5 h-5 text-emerald-500" />
                                        <span className="text-sm font-medium">使用积分抵扣</span>
                                    </div>
                                    <button
                                        onClick={() => setUsePoints(!usePoints)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${usePoints ? 'bg-emerald-500' : 'bg-gray-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${usePoints ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                                {usePoints && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className="bg-emerald-50 p-3 rounded-xl mt-2 flex justify-between items-center"
                                    >
                                        <div className="text-xs text-emerald-700">
                                            可用积分: {availablePoints} (抵扣 ¥{pointsDeduction})
                                        </div>
                                        <div className="text-sm font-bold text-emerald-700">-¥{pointsDeduction}</div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="font-bold text-gray-900">实付金额</span>
                                <span className="text-3xl font-bold text-amber-600">¥{totalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-4">支付方式</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 border-2 border-primary bg-teal-50 rounded-2xl">
                                <div className="flex items-center space-x-3">
                                    <CreditCard className="w-5 h-5 text-primary" />
                                    <span className="font-medium text-gray-800">在线支付</span>
                                </div>
                                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            <div className="text-xs text-center text-gray-400 py-2">
                                点击“确认并支付”即表示您同意《付费协议》
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar for Mobile */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-20 lg:p-6 shadow-2xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="hidden lg:block text-left">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">总计</p>
                        <p className="text-2xl font-bold text-amber-600">¥{totalPrice.toFixed(2)}</p>
                    </div>
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full lg:w-64 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-lg hover:bg-black transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                        {isProcessing && <RefreshCw className="w-5 h-5 animate-spin" />}
                        <span>{isProcessing ? '正在处理...' : '确认并支付'}</span>
                        {!isProcessing && <ChevronRight className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
