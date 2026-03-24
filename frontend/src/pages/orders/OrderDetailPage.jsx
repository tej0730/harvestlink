import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOrderById, acceptOrder, declineOrder,
  markReady, completeOrder, cancelOrder,
  disputeOrder, confirmPayment
} from '../../api/orders.api';
import OrderStatusBadge from '../../components/OrderStatusBadge';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function OrderDetailPage() {
  const { id }     = useParams();
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const qc         = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn:  () => getOrderById(id).then(r => r.data)
  });

  function mutation(fn, successMsg) {
    return useMutation({
      mutationFn: fn,
      onSuccess: () => {
        toast.success(successMsg);
        qc.invalidateQueries(['order', id]);
        qc.invalidateQueries(['orders']);
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Action failed')
    });
  }

  const acceptMutation   = mutation(() => acceptOrder(id),   'Order accepted!');
  const readyMutation    = mutation(() => markReady(id),     'Marked as ready!');
  const completeMutation = mutation(() => completeOrder(id), 'Order completed! Please leave a review.');
  const payMutation      = mutation(() => confirmPayment(id),'Payment confirmed!');

  const declineMutation  = useMutation({
    mutationFn: (reason) => declineOrder(id, { reason }),
    onSuccess:  () => { toast.success('Order declined'); qc.invalidateQueries(['order', id]); },
    onError:    (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const cancelMutation = useMutation({
    mutationFn: (reason) => cancelOrder(id, { reason }),
    onSuccess:  () => { toast.success('Order cancelled'); qc.invalidateQueries(['order', id]); },
    onError:    (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  const disputeMutation = useMutation({
    mutationFn: (reason) => disputeOrder(id, { reason }),
    onSuccess:  () => { toast.success('Dispute raised. Admin notified.'); qc.invalidateQueries(['order', id]); },
    onError:    (err) => toast.error(err.response?.data?.message || 'Failed')
  });

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-green-600 text-xl animate-pulse">Loading order...</div>
    </div>
  );

  if (!order) return null;

  const isGrower = user?.id === order.growerId;
  const isBuyer  = user?.id === order.buyerId;

  // ── Order lifecycle steps ──────────────────────────────────────────────────
  const steps = ['pending','accepted','ready','picked_up','completed'];
  const currentStep = steps.indexOf(order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Back */}
        <button onClick={() => navigate('/orders')}
                className="text-gray-500 hover:text-gray-700 text-sm">
          ← Back to orders
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {order.listing?.title}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isGrower ? `Buyer: ${order.buyer?.name}` : `Grower: ${order.grower?.name}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Ordered {format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="text-center">
              <p className="text-xs text-gray-400">Quantity</p>
              <p className="font-semibold text-gray-800">{order.quantity} {order.listing?.unitLabel}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Total</p>
              <p className="font-semibold text-green-700">₹{order.totalAmount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Payment</p>
              <p className={`font-semibold text-sm ${
                order.payment?.status === 'paid' ? 'text-green-600' : 'text-orange-500'
              }`}>
                {order.payment?.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
              </p>
            </div>
          </div>
        </div>

        {/* Progress tracker */}
        {!['cancelled','disputed'].includes(order.status) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-4">Order Progress</h3>
            <div className="flex items-center">
              {steps.map((step, i) => (
                <div key={step} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                   text-sm font-bold border-2 transition-colors
                    ${i <= currentStep
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-200 text-gray-400'}`}>
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 rounded
                      ${i < currentStep ? 'bg-green-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {steps.map(s => (
                <p key={s} className="text-xs text-gray-400 capitalize text-center flex-1">
                  {s.replace('_', ' ')}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Actions</h3>

          <div className="space-y-2">
            {/* GROWER actions */}
            {isGrower && order.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-xl
                             font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  ✅ Accept Order
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Reason for declining (optional):');
                    declineMutation.mutate(reason || 'Declined by grower');
                  }}
                  className="flex-1 border border-red-300 text-red-600 py-2.5
                             rounded-xl font-medium hover:bg-red-50"
                >
                  ❌ Decline
                </button>
              </div>
            )}

            {isGrower && order.status === 'accepted' && (
              <button
                onClick={() => readyMutation.mutate()}
                disabled={readyMutation.isPending}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl
                           font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                🎉 Mark as Ready for Pickup
              </button>
            )}

            {isGrower && order.status === 'completed' &&
             order.payment?.status === 'pending' && (
              <button
                onClick={() => payMutation.mutate()}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl
                           font-medium hover:bg-green-700"
              >
                💰 Confirm Cash Received
              </button>
            )}

            {/* BUYER actions */}
            {isBuyer && order.status === 'ready' && (
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="w-full bg-green-600 text-white py-2.5 rounded-xl
                           font-medium hover:bg-green-700 disabled:opacity-50"
              >
                📦 Confirm Pickup — I Got It!
              </button>
            )}

            {/* Chat button */}
            {['accepted','ready','picked_up'].includes(order.status) && (
              <button
                onClick={() => navigate(`/chat/${order.id}`)}
                className="w-full border border-gray-300 text-gray-700 py-2.5
                           rounded-xl font-medium hover:bg-gray-50"
              >
                💬 Message {isGrower ? 'Buyer' : 'Grower'}
              </button>
            )}

            {/* Cancel */}
            {['pending','accepted'].includes(order.status) && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for cancellation:');
                  if (reason !== null) cancelMutation.mutate(reason);
                }}
                className="w-full border border-red-200 text-red-500 py-2 rounded-xl
                           text-sm hover:bg-red-50"
              >
                Cancel Order
              </button>
            )}

            {/* Dispute */}
            {['accepted','ready'].includes(order.status) && (
              <button
                onClick={() => {
                  const reason = prompt('Describe the issue:');
                  if (reason) disputeMutation.mutate(reason);
                }}
                className="w-full border border-orange-200 text-orange-500 py-2
                           rounded-xl text-sm hover:bg-orange-50"
              >
                ⚠️ Raise Dispute
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
