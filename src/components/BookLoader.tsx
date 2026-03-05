import React from 'react';
import { motion } from 'motion/react';

export default function BookLoader() {
    return (
        <div className="flex flex-col items-center justify-center space-y-12 h-full w-full">
            <div
                className="relative w-28 h-20"
                style={{ perspective: '1000px' }}
            >
                {/* Premium Hardcover (Back) */}
                <div className="absolute inset-x-0 -bottom-2 top-0 bg-[#134E4A] rounded-md shadow-2xl border-b-[6px] border-[#0F3D3A] flex justify-center items-center">
                    {/* Golden Spine detailing */}
                    <div className="w-1.5 h-full bg-[#1e756f] border-x border-[#0f3d3a]/50 flex flex-col justify-between py-1">
                        <div className="w-full h-0.5 bg-amber-400/50" />
                        <div className="w-full h-0.5 bg-amber-400/50" />
                    </div>
                </div>

                {/* Left static page group */}
                <div className="absolute left-1.5 top-1.5 bottom-1.5 w-[calc(50%-1.5px)] bg-[#FDFBF7] rounded-l-sm border-r border-[#E6E2DD] border-l-4 border-l-amber-200/40 flex flex-col justify-center px-3 py-2 overflow-hidden shadow-[inset_4px_0_10px_rgba(0,0,0,0.03)]" style={{ transformOrigin: 'right center' }}>
                    <div className="w-3/4 h-1.5 bg-[#EAE6E0] rounded-full mb-2" />
                    <div className="w-full h-1.5 bg-[#EAE6E0] rounded-full mb-2" />
                    <div className="w-5/6 h-1.5 bg-[#EAE6E0] rounded-full" />
                </div>

                {/* Right static page group */}
                <div className="absolute right-1.5 top-1.5 bottom-1.5 w-[calc(50%-1.5px)] bg-[#FDFBF7] rounded-r-sm border-l border-[#E6E2DD] border-r-4 border-r-amber-200/40 flex flex-col justify-center px-3 py-2 overflow-hidden shadow-[inset_-4px_0_10px_rgba(0,0,0,0.03)]" style={{ transformOrigin: 'left center' }}>
                    <div className="w-full h-1.5 bg-[#EAE6E0] rounded-full mb-2" />
                    <div className="w-4/5 h-1.5 bg-[#EAE6E0] rounded-full mb-2" />
                    <div className="w-full h-1.5 bg-[#EAE6E0] rounded-full" />
                </div>

                {/* Flipping pages */}
                {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={`front-${i}`}
                        className="absolute right-1.5 top-1.5 bottom-1.5 w-[calc(50%-1.5px)] bg-gradient-to-l from-[#FDFBF7] to-[#F4F1EA] rounded-r-sm origin-left border-l border-[#E6E2DD] border-r-2 border-r-amber-200/50 flex flex-col justify-center px-3 py-2 shadow-[-2px_0_5px_rgba(0,0,0,0.08)]"
                        initial={{ rotateY: 0, zIndex: 10 - i }}
                        animate={{
                            rotateY: [0, -180, -180],
                            zIndex: [10 - i, 10 - i, 10 - i]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.35,
                            times: [0, 0.45, 1]
                        }}
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <div className="w-full h-1.5 bg-[#D5D0C6]/50 rounded-full mb-2" />
                        <div className="w-full h-1.5 bg-[#D5D0C6]/50 rounded-full mb-2" />
                        <div className="w-2/3 h-1.5 bg-[#D5D0C6]/50 rounded-full" />
                    </motion.div>
                ))}

                {/* Backside of flipping pages */}
                {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={`back-${i}`}
                        className="absolute left-1.5 top-1.5 bottom-1.5 w-[calc(50%-1.5px)] bg-gradient-to-r from-[#FDFBF7] to-[#F4F1EA] rounded-l-sm origin-right border-r border-[#E6E2DD] border-l-2 border-l-amber-200/50 flex flex-col justify-center items-end px-3 py-2 shadow-[2px_0_5px_rgba(0,0,0,0.08)]"
                        initial={{ rotateY: 180, zIndex: 10 - i }}
                        animate={{
                            rotateY: [180, 0, 0],
                            zIndex: [10 - i, 10 - i, 10 - i]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.35,
                            times: [0, 0.45, 1]
                        }}
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <div className="w-3/4 h-1.5 bg-[#D5D0C6]/50 rounded-full mb-2" />
                        <div className="w-full h-1.5 bg-[#D5D0C6]/50 rounded-full mb-2" />
                        <div className="w-5/6 h-1.5 bg-[#D5D0C6]/50 rounded-full" />
                    </motion.div>
                ))}
            </div>

            <motion.div
                className="flex items-center space-x-3 text-[#134E4A]"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                <span className="font-medium tracking-[0.2em] text-sm uppercase">翻开新的一页</span>
                <div className="w-1 h-1 rounded-full bg-amber-500" />
            </motion.div>
        </div>
    );
}
