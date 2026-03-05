import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, LucideIcon, Sparkles } from 'lucide-react';

interface PremiumBannerProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    onBack?: () => void;
    gradientClass?: string;
    iconBgClass?: string;
    iconColorClass?: string;
}

export default function PremiumBanner({
    title,
    subtitle = "Premium Access",
    icon: Icon = Sparkles,
    onBack,
    gradientClass = "from-amber-100 via-amber-50 to-white",
    iconBgClass = "bg-amber-500",
    iconColorClass = "text-white"
}: PremiumBannerProps) {
    return (
        <div className={`h-28 lg:h-32 bg-gradient-to-br ${gradientClass} relative flex items-center justify-center overflow-hidden shrink-0`}>
            {/* Decorative background elements matching UpgradeModal style */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full -ml-12 -mb-12 blur-xl"></div>

            {/* Back Button */}
            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute top-1/2 -translate-y-1/2 left-4 lg:left-8 p-1.5 lg:p-2 hover:bg-black/5 rounded-full transition-colors group cursor-pointer"
                    aria-label="返回"
                >
                    <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500 group-hover:text-gray-800" />
                </button>
            )}

            {/* Glassmorphism Title Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative p-3 lg:p-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-amber-100/50 flex items-center space-x-3"
            >
                <div className={`w-9 h-9 lg:w-10 lg:h-10 ${iconBgClass} rounded-xl flex items-center justify-center shadow-lg shadow-black/10`}>
                    <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${iconColorClass}`} />
                </div>
                <div>
                    <div className="text-sm lg:text-base font-bold text-amber-900 leading-none">{title}</div>
                    <div className="text-[9px] lg:text-[10px] text-amber-700/60 font-medium tracking-widest mt-1 uppercase">{subtitle}</div>
                </div>
            </motion.div>
        </div>
    );
}
