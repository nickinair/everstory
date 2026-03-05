import { useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Edit2, RefreshCw, AlertCircle, Printer, MoreVertical, Ticket, Wallet } from 'lucide-react';
import { Story } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { databaseService } from '../services/databaseService';

type BuyStep = 'addons' | 'order' | 'complete';

export default function BuyNowView({ projectId, stories, onComplete, onBack }: {
    projectId: string;
    stories: Story[];
    onComplete?: () => void;
    onBack?: () => void;
}) {
    const [step, setStep] = useState<BuyStep>('addons');
    const [bookTitle] = useState('我的一生故事');
    const [bookSubtitle] = useState('');
    const [bookAuthor] = useState('克劳黛特 • 格林');
    const [coverImageUrl] = useState('https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY');
    const [coverColor] = useState('#e8dcdc');
    const [includeEbook, setIncludeEbook] = useState(false);
    const [includeExtraHardcover, setIncludeExtraHardcover] = useState(false);
    const [hardcoverQuantity, setHardcoverQuantity] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recipientName, setRecipientName] = useState('测试用户');
    const [contactPhone, setContactPhone] = useState('+86 138 0000 0000');
    const [shippingAddress, setShippingAddress] = useState('上海市 浦东新区 某某路 888号');
    const [isEditingShipping, setIsEditingShipping] = useState(false);
    const [tempShipping, setTempShipping] = useState({ name: '', phone: '', address: '' });

    const [usePoints, setUsePoints] = useState(false);
    const [userPoints, setUserPoints] = useState(0);

    const basePrice = 399;
    const ebookPrice = includeEbook ? 59 : 0;
    const hardcoverUnitPrice = 79;
    const extraHardcoverPrice = includeExtraHardcover ? hardcoverQuantity * hardcoverUnitPrice : 0;
    const subtotal = basePrice + ebookPrice + extraHardcoverPrice;

    const pointsDeduction = usePoints ? Math.min(userPoints, subtotal) : 0;
    const totalPrice = subtotal - pointsDeduction;

    useState(() => {
        databaseService.getPoints().then(setUserPoints);
    });

    const steps = [
        { id: 'addons', label: '1. 订单详情' },
        { id: 'order', label: '2. 订单确认' },
        { id: 'complete', label: '3. 完成' },
    ];

    return (
        <div className="flex flex-col h-full bg-background-light overflow-y-auto">
            <header className="px-4 lg:px-8 pt-4 lg:pt-8 pb-4 shrink-0">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center">
                        <button
                            onClick={onBack}
                            className="mr-6 p-2 hover:bg-gray-200 rounded-full transition-colors group"
                            title="返回"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                        </button>
                        <h1 className="text-2xl lg:text-3xl font-light text-gray-800 whitespace-nowrap">立即订购</h1>
                    </div>

                    <div className="hidden lg:flex items-center space-x-12 text-sm ml-auto">
                        {steps.map((s) => (
                            <div
                                key={s.id}
                                className={`flex flex-col relative group transition-colors ${step === s.id ? 'text-gray-800 font-medium' : 'text-gray-400'
                                    }`}
                            >
                                <span className="mb-3 whitespace-nowrap">{s.label}</span>
                                <div className={`h-1.5 w-[140%] -left-[20%] rounded-full absolute -bottom-1 transition-colors ${step === s.id ? 'bg-primary' : 'bg-gray-200'
                                    }`}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex-1 p-4 lg:p-8 pt-6 lg:pt-10 max-w-7xl mx-auto w-full">
                {step === 'addons' && (
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 max-w-6xl mx-auto py-4 lg:py-8">
                        <div className="flex-1 space-y-6 lg:space-y-8">

                            {/* Base Hardcover Book Card (Mandatory) */}
                            <div className="p-4 lg:p-6 rounded-2xl border-2 border-accent bg-accent/5 flex flex-col sm:flex-row gap-4 lg:gap-6 items-center cursor-default">
                                <div className="flex items-center w-full sm:w-auto">
                                    <div className="h-5 w-5 bg-accent rounded flex items-center justify-center">
                                        <Check className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="sm:hidden ml-3 font-bold text-gray-800">1本精装书</span>
                                </div>
                                <div className="w-24 lg:w-32 h-32 lg:h-40 bg-gray-100 rounded-lg overflow-hidden shadow-md flex-shrink-0">
                                    <img
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY"
                                        alt="Hardcover Book"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-gray-800">高级会员套餐</h3>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-gray-900">¥399.00/年</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                                        一年内无限量故事录制，每一个故事生成唯一二维码，扫描永久收听。
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                                        {[
                                            '1 本精装彩色印刷书籍',
                                            '1 年无限次提示',
                                            '智能 AI 写作助手',
                                            '30 天退款保证',
                                            '全国免费包邮',
                                            '永久访问音视频'
                                        ].map((item) => (
                                            <div key={item} className="flex items-center text-xs text-gray-600">
                                                <Check className="w-3.5 h-3.5 text-accent mr-2 shrink-0" />
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* E-book Card */}
                            <div className={`p-4 lg:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 lg:gap-6 items-center ${includeEbook ? 'border-accent bg-accent/5' : 'border-gray-100 bg-white hover:border-gray-200'}`} onClick={() => setIncludeEbook(!includeEbook)}>
                                <div className="flex items-center w-full sm:w-auto">
                                    <input
                                        type="checkbox"
                                        checked={includeEbook}
                                        readOnly
                                        className="h-5 w-5 text-accent border-gray-300 rounded focus:ring-accent cursor-pointer"
                                    />
                                    <span className="sm:hidden ml-3 font-bold text-gray-800">添加电子书</span>
                                </div>
                                <div className="w-24 lg:w-32 h-32 lg:h-40 bg-gray-100 rounded-lg overflow-hidden shadow-md flex-shrink-0">
                                    <img
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY"
                                        alt="E-book"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-bold text-gray-800">添加电子书</h3>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-gray-900">¥59.00</span>
                                            <span className="block text-xs text-gray-400 line-through">¥119.00</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        电子书（无水印）立减 50%，在任何设备（手机、Pad、Kindle 等）上以数字方式访问您的故事。
                                    </p>
                                </div>
                            </div>

                            {/* Hardcover Card */}
                            <div className={`p-4 lg:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 lg:gap-6 items-center ${includeExtraHardcover ? 'border-accent bg-accent/5' : 'border-gray-100 bg-white hover:border-gray-200'}`} onClick={() => setIncludeExtraHardcover(!includeExtraHardcover)}>
                                <div className="flex items-center w-full sm:w-auto">
                                    <input
                                        type="checkbox"
                                        checked={includeExtraHardcover}
                                        readOnly
                                        className="h-5 w-5 text-accent border-gray-300 rounded focus:ring-accent cursor-pointer"
                                    />
                                    <span className="sm:hidden ml-3 font-bold text-gray-800">添加精装书</span>
                                </div>
                                <div className="w-24 lg:w-32 h-32 lg:h-40 flex-shrink-0 relative">
                                    <div className="absolute inset-0 bg-gray-200 rounded-lg shadow-md transform rotate-3"></div>
                                    <div className="absolute inset-0 bg-gray-100 rounded-lg shadow-md transform -rotate-3"></div>
                                    <div className="absolute inset-0 bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                                        <img
                                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY"
                                            alt="Hardcover"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 w-full" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg lg:text-xl font-bold text-gray-800">添加精装书</h3>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-gray-900">¥79.00<span className="text-sm font-normal text-gray-500">/本</span></span>
                                            <span className="block text-xs text-gray-400 line-through">¥99.00/本</span>
                                        </div>
                                    </div>
                                    <p className="text-xs lg:text-sm text-gray-500 mb-4 leading-relaxed">
                                        额外购买精装书立享 8 折优惠，您的订阅中已包含 1 本书。
                                    </p>
                                    <div className="relative">
                                        <select
                                            value={hardcoverQuantity}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setHardcoverQuantity(val);
                                                setIncludeExtraHardcover(val > 0);
                                            }}
                                            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-accent outline-none cursor-pointer"
                                        >
                                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                                                <option key={n} value={n}>{n} 本（额外购买，¥{(n * hardcoverUnitPrice).toFixed(0)}）</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Points Deduction Card */}
                            <div
                                className={`p-4 lg:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 lg:gap-6 items-center ${usePoints ? 'border-accent bg-accent/5' : 'border-gray-100 bg-white hover:border-gray-200'} ${userPoints <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                                onClick={() => userPoints > 0 && setUsePoints(!usePoints)}
                            >
                                <div className="flex items-center w-full sm:w-auto">
                                    <input
                                        type="checkbox"
                                        checked={usePoints}
                                        disabled={userPoints <= 0}
                                        readOnly
                                        className="h-5 w-5 text-accent border-gray-300 rounded focus:ring-accent cursor-pointer"
                                    />
                                    <span className="sm:hidden ml-3 font-bold text-gray-800">使用积分抵扣</span>
                                </div>
                                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-accent/10 rounded-xl flex items-center justify-center text-accent shrink-0 transition-transform">
                                    <Wallet className="w-6 h-6 lg:w-8 lg:h-8" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-lg lg:text-xl font-bold text-gray-800">使用积分抵扣</h3>
                                        <div className="text-right">
                                            <span className="text-sm font-medium text-gray-500">可用：{userPoints} 积分</span>
                                        </div>
                                    </div>
                                    <p className="text-xs lg:text-sm text-gray-500 leading-relaxed">
                                        1 积分可抵扣 1 元。您当前最高可抵扣 <span className="text-accent font-bold">¥{Math.min(userPoints, subtotal).toFixed(2)}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="pt-8 flex gap-4 hidden lg:flex">
                                <button
                                    onClick={onBack}
                                    className="flex-1 px-8 py-4 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all cursor-pointer"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => setStep('order')}
                                    className="flex-2 px-12 py-4 bg-accent hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-accent/20 transition-all transform active:scale-95 cursor-pointer"
                                >
                                    下一步
                                </button>
                            </div>

                            {/* Mobile Fixed Bottom Bar */}
                            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex gap-3 z-50">
                                <button
                                    onClick={onBack}
                                    className="flex-1 py-4 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold active:bg-gray-50 transition-all cursor-pointer"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => setStep('order')}
                                    className="flex-[2] py-4 bg-accent text-white rounded-xl font-bold shadow-lg shadow-accent/20 active:scale-95 transition-all cursor-pointer"
                                >
                                    下一步
                                </button>
                            </div>
                        </div>

                        <div className="w-full lg:w-[400px] space-y-8">
                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16"></div>

                                <div className="relative mb-8 flex justify-center">
                                    <div className="relative">
                                        <div
                                            className="w-48 aspect-[3/4] rounded-sm shadow-2xl transform -rotate-6 relative z-10 overflow-hidden"
                                            style={{ backgroundColor: coverColor }}
                                        >
                                            <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
                                            <div className="p-4 flex flex-col items-center text-center h-full text-gray-800">
                                                <div className="w-4 h-px bg-current opacity-30 mb-2 mt-4"></div>
                                                <span className="text-[10px] font-serif leading-tight mb-2 line-clamp-2">{bookTitle}</span>
                                                <div className="w-20 h-24 bg-white/10 shadow-inner mb-auto overflow-hidden flex items-center justify-center border border-white/10">
                                                    <img
                                                        src={coverImageUrl}
                                                        alt=""
                                                        className="w-full h-full object-cover grayscale opacity-80"
                                                    />
                                                </div>
                                                <span className="text-[6px] uppercase tracking-widest mb-4 opacity-80">{bookAuthor}</span>
                                            </div>
                                        </div>
                                        {/* Phone Image Mockup used in original */}
                                        <div className="absolute top-4 -right-12 w-24 aspect-[9/19.5] bg-black rounded-2xl shadow-2xl border-2 border-gray-800 overflow-hidden z-20 transform rotate-6">
                                            <img
                                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtPW8FRM5OO0_uXCSzPqNVuxJjMzs6PYU3CARbtjBU_R54BK0gh_b5gsOmaM5XK2Nfq2J8UFcoZfFNqSvLLYJWiTBxHzmVAo695mUmo37LdGBc1bbc-3me5oSJS-dLyBjktkom00esJdfx4eQzSr5fqODQr5eRmAbkY-eDtFfV5topMuqf48m7bHlzW2rkQsHl2ObjS4XcNrMaouB8JZPkQXfwxzA4VeGE74Fse25HIcMovX2PkfTpU7d4TCUZTYLqq0R-uK8w4YY"
                                                alt=""
                                                className="w-full h-full object-cover opacity-90"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-3xl font-light text-gray-800">长生記纪念册</h3>
                                    <p className="text-2xl font-bold text-gray-900">总计: ¥{totalPrice.toFixed(2)}</p>

                                    <div className="pt-6 space-y-4">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">包含项目</p>
                                        <ul className="space-y-3">
                                            {[
                                                `${includeExtraHardcover ? 1 + hardcoverQuantity : 1} 本精装彩色印刷书籍`,
                                                '1 年无限次提示智能 ',
                                                '智能 AI 写作助手',
                                                '30 天退款保证',
                                                includeEbook ? '包含电子书（无水印）' : null,
                                                '全国免费包邮',
                                                '永久访问音视频'
                                            ].filter(Boolean).map((item) => (
                                                <li key={item} className="flex items-center text-sm text-gray-700">
                                                    <Check className="w-4 h-4 text-accent mr-3 shrink-0" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'order' && (
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 max-w-6xl mx-auto py-4 lg:py-8">
                        <div className="flex-1 space-y-8 lg:space-y-12">
                            <div>
                                <h2 className="text-2xl lg:text-4xl font-light text-gray-800 mb-6 lg:mb-10">确认您的订单</h2>

                                <section className="space-y-4 lg:space-y-6">
                                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                                        <h3 className="text-xl lg:text-2xl font-light text-gray-800">邮寄信息</h3>
                                        {!isEditingShipping && (
                                            <button
                                                onClick={() => {
                                                    setTempShipping({ name: recipientName, phone: contactPhone, address: shippingAddress });
                                                    setIsEditingShipping(true);
                                                }}
                                                className="flex items-center text-xs lg:text-sm font-medium text-gray-500 hover:text-primary transition-colors cursor-pointer"
                                            >
                                                <span className="mr-1 underline">编辑</span>
                                                <Edit2 className="w-3 lg:w-4 h-3 lg:h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {isEditingShipping ? (
                                        <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">收件人</label>
                                                    <input
                                                        type="text"
                                                        value={tempShipping.name}
                                                        onChange={(e) => setTempShipping({ ...tempShipping, name: e.target.value })}
                                                        placeholder="请输入姓名"
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">联系电话</label>
                                                    <input
                                                        type="tel"
                                                        value={tempShipping.phone}
                                                        onChange={(e) => setTempShipping({ ...tempShipping, phone: e.target.value })}
                                                        placeholder="请输入电话"
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent outline-none transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">配送地址</label>
                                                    <textarea
                                                        value={tempShipping.address}
                                                        onChange={(e) => setTempShipping({ ...tempShipping, address: e.target.value })}
                                                        placeholder="请输入详细地址"
                                                        rows={2}
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent outline-none transition-all resize-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    onClick={() => setIsEditingShipping(false)}
                                                    className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all cursor-pointer"
                                                >
                                                    取消
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setRecipientName(tempShipping.name);
                                                        setContactPhone(tempShipping.phone);
                                                        setShippingAddress(tempShipping.address);
                                                        setIsEditingShipping(false);
                                                    }}
                                                    className="flex-1 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-all cursor-pointer"
                                                >
                                                    保存
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 text-gray-700 ml-1">
                                            <p><span className="text-gray-500 mr-2">收件人:</span> <span className="font-bold">{recipientName}</span></p>
                                            <p><span className="text-gray-500 mr-2">联系电话:</span> <span className="font-bold">{contactPhone}</span></p>
                                            <p><span className="text-gray-500 mr-2">配送地址:</span> <span className="font-bold leading-relaxed">{shippingAddress}</span></p>
                                        </div>
                                    )}
                                </section>

                                <div className="pt-12 flex gap-4 w-full hidden lg:flex">
                                    <button
                                        onClick={() => setStep('addons')}
                                        className="flex-1 py-4 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all cursor-pointer"
                                    >
                                        上一步
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (isProcessing) return;
                                            setIsProcessing(true);
                                            try {
                                                // 1. Spend points if requested
                                                if (usePoints && pointsDeduction > 0) {
                                                    await databaseService.spendPoints(
                                                        Math.round(pointsDeduction),
                                                        `支付订单: ${bookTitle}`
                                                    );
                                                }

                                                // 2. Create order
                                                await databaseService.createOrder(projectId, {
                                                    bookTitle,
                                                    bookSubtitle,
                                                    bookAuthor,
                                                    coverColor,
                                                    imageUrl: coverImageUrl || '',
                                                    price: totalPrice.toFixed(2),
                                                    status: 'processing',
                                                    recipientName,
                                                    contactPhone,
                                                    shippingAddress: shippingAddress
                                                });
                                                setStep('complete');
                                            } catch (error) {
                                                console.error('Error creating order:', error);
                                                alert('支付失败，请稍后重试。');
                                            } finally {
                                                setIsProcessing(false);
                                            }
                                        }}
                                        disabled={isProcessing}
                                        className="flex-2 py-4 bg-accent hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-accent/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                                    >
                                        {isProcessing && <RefreshCw className="w-5 h-5 animate-spin" />}
                                        <span>{isProcessing ? '处理中...' : (totalPrice <= 0 ? '确认支付' : '继续支付')}</span>
                                    </button>
                                </div>

                                {/* Mobile Fixed Bottom Bar for Order Confirmation */}
                                <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex gap-3 z-50">
                                    <button
                                        onClick={() => setStep('addons')}
                                        className="flex-1 py-4 bg-white border border-gray-300 text-gray-600 rounded-xl font-bold active:bg-gray-50 transition-all cursor-pointer"
                                    >
                                        上一步
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (isProcessing) return;
                                            setIsProcessing(true);
                                            try {
                                                // 1. Spend points if requested
                                                if (usePoints && pointsDeduction > 0) {
                                                    await databaseService.spendPoints(
                                                        Math.round(pointsDeduction),
                                                        `支付订单: ${bookTitle}`
                                                    );
                                                }

                                                // 2. Create order
                                                await databaseService.createOrder(projectId, {
                                                    bookTitle,
                                                    bookSubtitle,
                                                    bookAuthor,
                                                    coverColor,
                                                    imageUrl: coverImageUrl || '',
                                                    price: totalPrice.toFixed(2),
                                                    status: 'processing',
                                                    recipientName,
                                                    contactPhone,
                                                    shippingAddress
                                                });
                                                setStep('complete');
                                            } catch (error) {
                                                console.error('Error creating order:', error);
                                                alert('支付失败，请稍后重试。');
                                            } finally {
                                                setIsProcessing(false);
                                            }
                                        }}
                                        disabled={isProcessing}
                                        className="flex-[2] py-4 bg-accent text-white rounded-xl font-bold shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                                    >
                                        {isProcessing && <RefreshCw className="w-5 h-5 animate-spin" />}
                                        <span>{isProcessing ? '处理中...' : (totalPrice <= 0 ? '确认支付' : '继续支付')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-[400px] space-y-8">
                            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-light text-gray-800">订单摘要</h3>
                                    <div className="space-y-2 pt-4 border-t border-gray-50">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">基础版纪念册 × 1</span>
                                            <span className="text-gray-900 font-medium">¥399.00</span>
                                        </div>
                                        {includeEbook && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">电子书版本</span>
                                                <span className="text-gray-900 font-medium">¥59.00</span>
                                            </div>
                                        )}
                                        {includeExtraHardcover && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">额外精装书 × {hardcoverQuantity}</span>
                                                <span className="text-gray-900 font-medium">¥{(hardcoverQuantity * hardcoverUnitPrice).toFixed(2)}</span>
                                            </div>
                                        )}
                                        {usePoints && pointsDeduction > 0 && (
                                            <div className="flex justify-between text-sm text-accent font-medium">
                                                <span className="flex items-center">
                                                    <Ticket className="w-3.5 h-3.5 mr-1" />
                                                    积分抵扣
                                                </span>
                                                <span>- ¥{pointsDeduction.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm pt-4 border-t border-gray-100">
                                            <span className="text-gray-900 font-bold">应付金额</span>
                                            <span className="text-2xl font-bold text-accent">¥{totalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 'complete' && (
                    <div className="flex flex-col items-center justify-center h-[400px] lg:h-[600px] text-center space-y-4 lg:space-y-6 px-4">
                        <div className="w-16 lg:w-20 h-16 lg:h-20 bg-green-100 rounded-full flex items-center justify-center mb-2 lg:mb-4">
                            <Check className="w-8 lg:w-10 h-8 lg:h-10 text-green-600" />
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-light text-gray-800">订单支付成功！</h2>
                        <p className="text-sm lg:text-base text-gray-600 max-w-md">
                            感谢您的订购。我们已向您的邮箱发送了一封确认邮件。您的长生記纪念册即将开始制作。
                        </p>
                        <button
                            onClick={() => onComplete?.()}
                            className="px-8 py-3 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary-hover transition-colors"
                        >
                            查看我的订单
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
