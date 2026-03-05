import { Package, ChevronRight, Clock, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { ORDERS } from '../constants';
import { Order } from '../types';

interface OrderTrackingViewProps {
  onOrderClick: (id: string) => void;
  onNewOrder: () => void;
}

export default function OrderTrackingView({ onOrderClick, onNewOrder }: OrderTrackingViewProps) {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 lg:mb-8 space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl lg:text-3xl font-light text-gray-800">我的订单</h2>
          <p className="text-sm lg:text-base text-gray-500 mt-1 lg:mt-2">跟踪您的定制精装传记制作和物流进度</p>
        </div>
        <button
          onClick={onNewOrder}
          className="bg-accent hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto"
        >
          订购新书籍
        </button>
      </div>

      <div className="space-y-6">
        {ORDERS.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => !order.isExample && onOrderClick(order.id)}
            className={`bg-white rounded-2xl border border-gray-100 overflow-hidden group ${order.isExample ? 'cursor-default shadow-sm' : 'shadow-sm hover:shadow-md transition-all cursor-pointer'}`}
          >
            <div className="flex flex-col md:flex-row">
              {/* Book Preview */}
              <div className="w-full md:w-48 bg-gray-50 p-6 flex items-center justify-center border-r border-gray-100">
                <div
                  className="w-24 aspect-[3/4] shadow-lg rounded-sm overflow-hidden relative"
                  style={{ backgroundColor: order.coverColor }}
                >
                  <div className="absolute inset-0 bg-black/5 z-0"></div>
                  {/* Example Badge */}
                  {order.isExample && (
                    <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded shadow-sm bg-white/90 backdrop-blur-sm border border-stone-100">
                      <span className="text-[10px] font-bold text-stone-600 tracking-wider">示例</span>
                    </div>
                  )}
                  <img
                    src={order.imageUrl}
                    alt=""
                    className="w-full h-full object-cover grayscale opacity-80"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Order Info */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{order.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                        {order.status === 'delivered' ? '已送达' :
                          order.status === 'shipped' ? '已发货' : '制作中'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{order.bookTitle}</h3>
                    <p className="text-sm text-gray-500">{order.bookSubtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{order.price}</p>
                    <p className="text-xs text-gray-400">下单日期: {order.date}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center text-sm text-gray-600">
                    <Package className="w-4 h-4 mr-2 text-accent" />
                    <span>{order.logistics?.[0]?.description || '订单处理中'}</span>
                  </div>
                  {!order.isExample && (
                    <div className="flex items-center text-accent font-medium text-sm group-hover:translate-x-1 transition-transform">
                      查看详情 <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {ORDERS.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">暂无订单</h3>
          <p className="text-gray-500 mt-2">您还没有订购过任何定制精装传记</p>
          <button
            onClick={onNewOrder}
            className="mt-6 bg-accent text-white px-8 py-2 rounded-lg font-medium"
          >
            开始订购
          </button>
        </div>
      )}
    </div>
  );
}
