import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export default function AILoader() {
    return (
        <div className="flex flex-col items-center justify-center space-y-8 py-8">
            <div className="relative">
                {/* Main Glowing Circle */}
                <motion.div
                    className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent/20 to-primary/20 blur-xl absolute -inset-1"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Core Icon Container */}
                <div className="relative w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-accent/10 overflow-hidden">
                    {/* Animated Background Gradient */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-accent/5 via-white to-primary/5"
                        animate={{
                            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />

                    <Sparkles className="w-10 h-10 text-accent relative z-10" />

                    {/* Scanning Line Effect */}
                    <motion.div
                        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent z-20"
                        animate={{
                            top: ['-10%', '110%'],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                </div>

                {/* Orbiting Sparkles */}
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-accent rounded-full blur-[1px]"
                        initial={{
                            x: 0,
                            y: 0,
                            scale: 0
                        }}
                        animate={{
                            x: [
                                Math.cos(i * 120 * (Math.PI / 180)) * 60,
                                Math.cos((i * 120 + 360) * (Math.PI / 180)) * 60
                            ],
                            y: [
                                Math.sin(i * 120 * (Math.PI / 180)) * 60,
                                Math.sin((i * 120 + 360) * (Math.PI / 180)) * 60
                            ],
                            scale: [0, 1, 0],
                            opacity: [0, 0.8, 0],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "linear",
                            delay: i * 0.5,
                        }}
                    />
                ))}
            </div>

            <motion.div
                className="flex flex-col items-center space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex items-center space-x-2">
                    <motion.span
                        className="text-xs font-bold text-accent uppercase tracking-[0.3em]"
                        animate={{
                            letterSpacing: ['0.2em', '0.4em', '0.2em'],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                        AI Engine
                    </motion.span>
                </div>
            </motion.div>
        </div>
    );
}
