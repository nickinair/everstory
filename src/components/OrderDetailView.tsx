import { ArrowLeft, Package, Truck, CheckCircle2, MapPin, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { Order } from '../types';

interface OrderDetailViewProps {
  order: Order;
  onBack: () => void;
}

export default function OrderDetailView({ order, onBack }: OrderDetailViewProps) {
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <button 
        onClick={onBack}
        className="flex items-center text-gray-500 hover:text-gray-800 mb-6 lg:mb-8 transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        返回订单列表
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left: Order Info & Logistics */}
        <div className="lg:col-span-2 space-y-6 lg:space-y-8">
          <section className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-6 lg:mb-8 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-xl lg:text-2xl font-serif text-gray-900 mb-1 lg:mb-2">订单详情</h2>
                <p className="text-sm text-gray-500">订单号: {order.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] lg:text-xs font-bold uppercase tracking-wider ${
                order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {order.status === 'delivered' ? '已送达' :
                 order.status === 'shipped' ? '已发货' : '制作中'}
              </span>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-accent" />
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-gray-900 mb-1">物流信息</h4>
                  <p className="text-sm text-gray-600 mb-2">快递公司: 顺丰速运</p>
                  <div className="flex flex-wrap items-center text-sm text-gray-600">
                    运单号: <span className="font-mono font-medium ml-2">{order.trackingNumber}</span>
                    <button className="ml-3 text-accent hover:underline flex items-center">
                      复制 <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Logistics Timeline */}
              <div className="mt-8 relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                {order.logistics?.map((item, idx) => (
                  <div key={idx} className="relative">
                    <div className={`absolute -left-[25px] w-3 h-3 rounded-full border-2 border-white z-10 ${
                      idx === 0 ? 'bg-accent scale-125 shadow-[0_0_0_4px_rgba(74,107,109,0.1)]' : 'bg-gray-300'
                    }`}></div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${idx === 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                        {item.description}
                      </span>
                      <span className="text-xs text-gray-400 mt-1">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">收货信息</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
              <div className="space-y-4">
                <div className="flex items-center text-gray-500 text-sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  收货地址
                </div>
                <div className="text-sm text-gray-800">
                  <p className="font-bold">Kai Ni</p>
                  <p>+86 138 3450 8899</p>
                  <p className="mt-1">浙江省杭州市西湖区文三路 123 号</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center text-gray-500 text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  预计送达
                </div>
                <div className="text-sm text-gray-800">
                  <p className="font-bold">2024年5月19日</p>
                  <p className="text-gray-500">下午 18:00 前</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Book Summary */}
        <div className="space-y-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky top-8">
            <div className="flex justify-center mb-6">
              <div 
                className="w-32 aspect-[3/4] shadow-xl rounded-sm overflow-hidden relative"
                style={{ backgroundColor: order.coverColor }}
              >
                <div className="absolute inset-0 bg-black/5"></div>
                <img 
                  src={order.imageUrl} 
                  alt="" 
                  className="w-full h-full object-cover grayscale opacity-80"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-xl font-serif text-gray-900 mb-1">{order.bookTitle}</h3>
              <p className="text-sm text-gray-500">{order.bookSubtitle}</p>
            </div>
            <div className="space-y-3 pt-6 border-t border-gray-50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">商品总价</span>
                <span className="text-gray-900">¥888.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">运费</span>
                <span className="text-gray-900">¥0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">电子书加购</span>
                <span className="text-gray-900">¥168.00</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-50 font-bold text-lg">
                <span>实付款</span>
                <span className="text-accent">{order.price}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
