import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, X, CheckCircle2, User, Shield, Info, Loader2 } from 'lucide-react';
import { databaseService } from '../services/databaseService';

interface JoinConfirmationModalProps {
    projectId: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function JoinConfirmationModal({ projectId, onConfirm, onCancel }: JoinConfirmationModalProps) {
    const [project, setProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const data = await databaseService.getProjectById(projectId);
                setProject(data);
            } catch (error) {
                console.error('Error fetching project for confirmation:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [projectId]);

    const handleJoin = async () => {
        setJoining(true);
        try {
            onConfirm();
        } catch (error) {
            console.error('Error joining project:', error);
        } finally {
            setJoining(false);
        }
    };

    if (loading) return null;
    if (!project) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="relative h-32 bg-accent/10 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path d="M0 100 C 20 0 30 100 50 20 C 70 80 80 0 100 100 Z" fill="currentColor" className="text-accent" />
                        </svg>
                    </div>
                    <div className="relative z-10 w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-accent">
                        <UserPlus size={32} />
                    </div>
                </div>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">加入项目邀请</h2>
                        <p className="text-gray-500 text-sm">在这里一起记录珍贵的人生故事</p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5 mb-8 border border-gray-100">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold mr-3">
                                {project.name[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 leading-tight">{project.name}</h3>
                                <p className="text-xs text-gray-500">创建于 {project.createdAt}</p>
                            </div>
                        </div>

                        <div className="flex items-center text-sm text-gray-600 space-x-4">
                            <div className="flex items-center">
                                <Shield className="w-3.5 h-3.5 mr-1.5 text-accent/60" />
                                <span>所有者: {project.ownerName}</span>
                            </div>
                            <div className="flex items-center">
                                <Users className="w-3.5 h-3.5 mr-1.5 text-accent/60" />
                                <span>共同协作</span>
                            </div>
                        </div>

                        {project.description && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-500 italic">"{project.description}"</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col space-y-3">
                        <button
                            onClick={handleJoin}
                            disabled={joining}
                            className="w-full bg-accent hover:bg-accent-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
                        >
                            {joining ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5 mr-2" />
                            )}
                            立即加入该项目
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={joining}
                            className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                            暂时不加入
                        </button>
                    </div>

                    <div className="mt-6 flex items-start p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                        <Info className="w-4 h-4 text-blue-400 mr-2 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-600 leading-relaxed font-light">
                            接受邀请后，您将可以与项目成员一起通过语音或文字记录故事，并参与书籍的定制。
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

import { UserPlus } from 'lucide-react';
