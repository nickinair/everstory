import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Ticket,
    History,
    TrendingUp,
    TrendingDown,
    Gift,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Wallet
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { PointTransaction } from '../types';

interface RedemptionViewProps {
    onBack: () => void;
    onUpdate: () => void;
}

export default function RedemptionView({ onBack, onUpdate }: RedemptionViewProps) {
    const [points, setPoints] = useState<number>(0);
    const [transactions, setTransactions] = useState<PointTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [p, tx] = await Promise.all([
                databaseService.getPoints(),
                databaseService.getPointTransactions()
            ]);
            setPoints(p);
            setTransactions(tx);
        } catch (error) {
            console.error('Error fetching redemption data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async () => {
        if (!couponCode.trim()) return;

        setIsRedeeming(true);
        setToast(null);
        try {
            const result = await databaseService.redeemCoupon(couponCode);
            setToast({
                type: 'success',
                message: `兑换成功！获得了 ${result.amount} 积分`
            });
            setCouponCode('');
            await fetchData();
            onUpdate();

            // Close modal soon after success
            setTimeout(() => {
                setIsRedeemModalOpen(false);
            }, 1000);

            // Clear toast after 3 seconds
            setTimeout(() => {
                setToast(null);
            }, 3000);
        } catch (error: any) {
            setToast({
                type: 'error',
                message: error.message || '兑换失败，请检查兑换码'
            });
            // Clear toast after 3 seconds
            setTimeout(() => {
                setToast(null);
            }, 3000);
        } finally {
            setIsRedeeming(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-gray-50 items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                <p className="text-gray-500 font-medium">加载中...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <header className="px-4 lg:px-8 py-4 bg-white border-b border-gray-200 flex items-center shrink-0">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-4"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-light text-gray-800">积分中心</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Points Balance Card */}
                    <section className="relative overflow-hidden bg-[#1a3a3a] rounded-3xl p-8 text-white shadow-xl">
                        <div className="relative z-10">
                            <div className="flex items-center space-x-2 text-white/70 mb-2">
                                <Wallet className="w-4 h-4" />
                                <span className="text-sm font-medium uppercase tracking-wider">我的积分余额</span>
                            </div>
                            <div className="flex items-baseline space-x-2">
                                <span className="text-5xl font-bold tracking-tight">{points}</span>
                                <span className="text-xl text-white/60 font-medium">积分</span>
                            </div>
                            <p className="mt-4 text-white/50 text-xs">
                                积分可实时抵扣订单金额，1 积分 = 1 元
                            </p>
                        </div>
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                    </section>

                    {/* Action Button */}
                    <button
                        onClick={() => setIsRedeemModalOpen(true)}
                        className="w-full flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition group"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent group-hover:scale-110 transition">
                                <Ticket className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-gray-800">输入兑换券码</h3>
                                <p className="text-xs text-gray-400">输入您的礼品码或活动兑换码</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition" />
                    </button>

                    {/* Transaction History */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 flex items-center">
                            <History className="w-3 h-3 mr-2" />
                            积分变动记录
                        </h3>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {transactions.length > 0 ? (
                                transactions.map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition">
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'earn' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
                                                }`}>
                                                {tx.type === 'earn' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{tx.description}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{tx.createdAt}</p>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-bold ${tx.type === 'earn' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Gift className="w-8 h-8 text-gray-200" />
                                    </div>
                                    <p className="text-sm text-gray-400">目前还没有积分记录</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Redemption Modal */}
            <AnimatePresence>
                {isRedeemModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent mx-auto mb-6">
                                    <Ticket className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 text-center mb-2">兑换积分</h3>
                                <p className="text-sm text-gray-500 text-center mb-8">请输入您的兑换券代码完成积分获取</p>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="输入 11 位兑换码"
                                            className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-accent focus:bg-white outline-none transition-all text-center font-bold tracking-widest"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex flex-col space-y-3 pt-2">
                                        <button
                                            disabled={!couponCode.trim() || isRedeeming}
                                            onClick={handleRedeem}
                                            className="w-full py-4 bg-accent text-white rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-accent/20 flex items-center justify-center disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {isRedeeming ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    正在兑换...
                                                </>
                                            ) : '确认兑换'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsRedeemModalOpen(false);
                                                setToast(null);
                                                setCouponCode('');
                                            }}
                                            className="w-full py-3 text-gray-400 font-medium hover:text-gray-600 transition-colors"
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

            {/* Global Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 20, x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.95, x: '-50%' }}
                        className="fixed top-0 left-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 min-w-[280px] justify-center border"
                        style={{
                            backgroundColor: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                            borderColor: toast.type === 'success' ? '#10B981' : '#EF4444',
                            color: toast.type === 'success' ? '#065F46' : '#991B1B'
                        }}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className="font-bold text-sm tracking-wide">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
