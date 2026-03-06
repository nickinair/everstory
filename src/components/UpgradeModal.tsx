import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Check, ArrowRight, Lock } from 'lucide-react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
    type: 'prompts' | 'stories' | 'projects' | 'order-required';
    isOwner?: boolean;
}

export default function UpgradeModal({ isOpen, onClose, onUpgrade, type, isOwner = true }: UpgradeModalProps) {
    const title = type === 'order-required' ? '立即订购解锁更多' : type === 'prompts' ? '提示数量已达上限' : type === 'stories' ? '故事数量已达上限' : '项目数量已达上限';

    let description = '';
    if (!isOwner) {
        description = '项目所有者为免费版，目前仅支持创建 10 个故事。立即升级即可解锁无限篇幅记录，永久保存您的珍贵人生。';
    } else {
        description = type === 'order-required' ? '您已完成书籍预览。立即订购即可继续定制您的定制精装传记，永久保存这份珍贵记忆。' :
            type === 'prompts' ? '免费版目前仅支持创建 10 个提示。立即升级即可解锁无限次提示引导，为您开启深度回忆之旅。' :
                type === 'stories' ? '免费版目前仅支持手动创建 10 个故事。立即升级即可解锁无限篇幅记录，永久保存您的珍贵人生。' :
                    '免费版目前仅支持创建 2 个项目。立即升级即可开启更多家人的传记项目，记录完整家族记忆。';
    }

    const benefits = [
        '无限次数故事录制',
        '定制精装传记',
        '专业级AI深度写作',
        '永久云端音视频存储',
        '30天无忧退款保证'
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden"
                    >
                        {/* Header / Banner */}
                        <div className="h-32 bg-gradient-to-br from-amber-100 via-amber-50 to-white relative flex items-center justify-center overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full -ml-12 -mb-12 blur-xl"></div>
                            <div className="relative p-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-amber-100 flex items-center space-x-3">
                                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-amber-900 leading-none">尊享会员特权</div>
                                    <div className="text-[10px] text-amber-700/60 font-medium tracking-widest mt-1 uppercase">Premium Access</div>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 hover:bg-black/5 rounded-full transition-colors group cursor-pointer"
                            >
                                <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                            </button>
                        </div>

                        <div className="p-8 lg:p-10 pt-6">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
                                <p className="text-gray-500 leading-relaxed">
                                    {description}
                                </p>
                            </div>

                            <div className="space-y-4 mb-10 bg-gray-50/50 p-6 rounded-2xl border border-gray-100/50">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">订购即可获得</p>
                                <div className="grid grid-cols-1 gap-3">
                                    {benefits.map((benefit, idx) => (
                                        <div key={idx} className="flex items-center text-sm text-gray-700">
                                            <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mr-3 shrink-0">
                                                <Check className="w-3 h-3 text-primary" />
                                            </div>
                                            <span className="font-medium">{benefit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col space-y-3">
                                {isOwner ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                onUpgrade();
                                                onClose();
                                            }}
                                            className="w-full py-4 bg-accent hover:bg-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-accent/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2 group cursor-pointer"
                                        >
                                            <span>立即订购解锁</span>
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="w-full py-4 bg-white text-gray-500 rounded-2xl font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            稍后再说
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={onClose}
                                        className="w-full py-4 bg-accent hover:bg-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-accent/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                                    >
                                        知道了
                                    </button>
                                )}
                            </div>

                            <div className="mt-8 flex items-center justify-center space-x-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-widest opacity-60">
                                <Lock className="w-3 h-3" />
                                <span>Secure payment powered by everstory</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
