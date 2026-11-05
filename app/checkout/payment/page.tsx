"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { Smartphone, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function PaymentScreen() {
  const router = useRouter();
  const { items, orderType, checkoutDetails, getSubtotal, getTotal, clearCart, selectedBranch } = useCartStore();
  const [phoneNumber, setPhoneNumber] = useState('254');
  const [status, setStatus] = useState<'idle' | 'push_sent' | 'paid' | 'failed'>('idle');
  const [orderTrackingId, setOrderTrackingId] = useState('');
  const [loading, setLoading] = useState(false);

  const total = getTotal();
  const subtotal = getSubtotal();

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const generatedId = 'SL' + Math.floor(1000000000 + Math.random() * 9000000000);
    setOrderTrackingId(generatedId);

    try {
      const { error: orderError } = await supabase.from('orders').insert({
        id: generatedId,
        branch_id: selectedBranch?.id || null,
        customer_name: checkoutDetails?.customerName || 'Starlight Customer',
        customer_phone: checkoutDetails?.customerPhone || phoneNumber,
        order_type: orderType,
        search_estate: checkoutDetails?.estate || null,
        specific_landmark: checkoutDetails?.landmark || null,
        building_name: checkoutDetails?.building || null,
        delivery_latitude: orderType === 'delivery' ? checkoutDetails?.deliveryLatitude ?? null : null,
        delivery_longitude: orderType === 'delivery' ? checkoutDetails?.deliveryLongitude ?? null : null,
        total_amount: total,
        subtotal,
        delivery_fee: total - subtotal,
        payment_status: 'pending',
        preferred_date: checkoutDetails?.preferredDate || new Date().toISOString().split('T')[0],
        preferred_time: checkoutDetails?.preferredTime || 'Immediate',
      });
      if (orderError) throw orderError;

      if (items.length > 0) {
        const { error: itemError } = await supabase.from('order_items').insert(items.map((item) => ({
          order_id: generatedId,
          item_name: item.name,
          variant_name: item.variantName || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.unitPrice * item.quantity,
          kitchen_dept: item.kitchenDept,
        })));
        if (itemError) throw itemError;
      }

      const res = await fetch('/api/mpesa/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: generatedId,
          phone: checkoutDetails?.customerPhone || phoneNumber,
          amount: total,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus('push_sent');
        listenForRealtimePayment(generatedId);
      } else {
        alert(data.error || 'Failed to trigger M-Pesa prompt.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const listenForRealtimePayment = (orderId: string) => {
    supabase
      .channel(`order-payment-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload: any) => {
          if (payload.new.payment_status === 'paid') {
            setStatus('paid');
            clearCart();
            setTimeout(() => {
              router.push(`/track/${orderId}`);
            }, 1500);
          } else if (payload.new.payment_status === 'failed') {
            setStatus('failed');
          }
        }
      )
      .subscribe();
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink p-4 max-w-md mx-auto flex flex-col justify-center">
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-[0_1px_2px_rgba(59,26,107,.08),0_4px_14px_rgba(59,26,107,.06)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-brand-primary/10 rounded-xl">
            <Smartphone className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black">M-Pesa Express</h1>
            <p className="text-xs text-brand-textMuted uppercase font-semibold tracking-wider">Instant STK Push</p>
          </div>
        </div>

        {status === 'idle' && (
          <form onSubmit={handleInitiatePayment} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-brand-textMuted">M-Pesa Mobile Number</label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full mt-1 bg-brand-bg border border-brand-border rounded-xl p-3.5 text-brand-ink font-mono text-lg focus:outline-none focus:border-brand-accent"
                placeholder="2547XXXXXXXX"
              />
            </div>

            <div className="bg-brand-bg border border-brand-border rounded-xl p-4 text-xs space-y-2 text-brand-textMuted">
              <p>• You will receive a prompt on your Safaricom mobile line.</p>
              <p>• Enter your M-Pesa PIN to authorize payment of <strong className="text-brand-purple">KES {total.toLocaleString()}</strong>.</p>
              <p>• Once approved, your order pipeline transitions automatically.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-primary hover:bg-brand-primaryHover text-brand-bg font-black rounded-xl transition mt-2 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : `Initiate Payment (KES ${total.toLocaleString()})`}
            </button>
          </form>
        )}

        {status === 'push_sent' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 border-2 border-brand-primary border-t-transparent animate-spin mx-auto" />
            <h2 className="text-xl font-black text-brand-ink">Push Sent</h2>
            <p className="text-sm text-brand-textMuted">Please check your handset for the M-Pesa PIN prompt.</p>
            <div className="bg-brand-bg border border-brand-border rounded-xl p-4 mt-4">
              <span className="text-[10px] uppercase font-bold text-brand-textMuted">Order Reference</span>
              <p className="font-mono text-brand-purple font-bold">{orderTrackingId}</p>
            </div>
          </div>
        )}

        {status === 'paid' && (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
            <h2 className="text-xl font-black text-brand-ink">Payment Confirmed</h2>
            <p className="text-sm text-brand-textMuted">Routing directly to live branch kitchen...</p>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center py-6 space-y-3">
            <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
            <h2 className="text-xl font-black text-brand-ink">Payment Failed</h2>
            <p className="text-sm text-brand-textMuted">Transaction was declined or cancelled.</p>
            <button
              onClick={() => setStatus('idle')}
              className="py-2.5 px-6 bg-brand-primary text-brand-bg font-bold rounded-xl mt-3 text-sm"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
