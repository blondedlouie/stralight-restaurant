"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { Truck, Store, Navigation, ArrowRight } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { orderType, setOrderType, setSelectedBranch, setCheckoutDetails } = useCartStore();
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00 PM',
    estate: '',
    landmark: '',
    building: '',
  });

  useEffect(() => {
    const area = new URLSearchParams(window.location.search).get('area');
    if (area) setFormData((current) => ({ ...current, estate: area }));
  }, []);

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('/api/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          const data = await res.json();
          if (data.branch) {
            setGpsCoordinates({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
            setSelectedBranch({
              id: data.branch.id,
              name: data.branch.name,
              phonePrimary: data.branch.phone_primary,
              phoneChicken: data.branch.phone_chicken,
              phonePizza: data.branch.phone_pizza,
              isDeliverable: data.is_deliverable,
            });

            if (!data.is_deliverable) {
              setOrderType('pickup');
              alert(`Outside our direct delivery radius. Assigned to ${data.branch.name} for pickup.`);
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingGeo(false);
        }
      },
      () => {
        alert('Permission denied or location unavailable');
        setLoadingGeo(false);
      }
    );
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutDetails({
      customerName: formData.name.trim(),
      customerPhone: formData.phone.trim(),
      preferredDate: formData.date,
      preferredTime: formData.time,
      estate: formData.estate.trim(),
      landmark: formData.landmark.trim(),
      building: formData.building.trim(),
      deliveryLatitude: gpsCoordinates?.latitude ?? null,
      deliveryLongitude: gpsCoordinates?.longitude ?? null,
    });
    router.push('/checkout/payment');
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink px-4 py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl text-brand-purple mb-6 tracking-tight text-center">Delivery Details</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          onClick={() => setOrderType('delivery')}
          className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition ${
            orderType === 'delivery'
              ? 'border-brand-purple bg-brand-purple text-brand-primary'
              : 'border-brand-border bg-brand-surface text-brand-textMuted'
          }`}
        >
          <Truck className="w-6 h-6" />
          <span className="font-bold text-sm">Delivery</span>
        </button>
        <button
          type="button"
          onClick={() => setOrderType('pickup')}
          className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition ${
            orderType === 'pickup'
              ? 'border-brand-purple bg-brand-purple text-brand-primary'
              : 'border-brand-border bg-brand-surface text-brand-textMuted'
          }`}
        >
          <Store className="w-6 h-6" />
          <span className="font-bold text-sm">Pickup</span>
        </button>
      </div>

      <form onSubmit={handleProceedToPayment} className="space-y-4">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4">
          <h2 className="font-bold text-lg border-b border-brand-border pb-2">Customer Info</h2>
          <div>
            <label className="text-xs uppercase text-brand-textMuted font-bold">Full Name</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 bg-white border border-brand-border rounded-lg p-3 text-brand-ink focus:outline-none focus:border-brand-accent"
              placeholder="e.g. John Kamau"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-brand-textMuted font-bold">Contact Phone Number</label>
            <input
              required
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full mt-1 bg-white border border-brand-border rounded-lg p-3 text-brand-ink focus:outline-none focus:border-brand-accent"
              placeholder="07XX XXX XXX"
            />
          </div>
        </div>

        {orderType === 'delivery' && (
          <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-brand-border pb-2">
              <h2 className="font-bold text-lg">Address Information</h2>
              <button
                type="button"
                onClick={handleUseGPS}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-accent hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                {loadingGeo ? 'Locating...' : 'Use My GPS'}
              </button>
            </div>

            <div>
              <label className="text-xs uppercase text-brand-textMuted font-bold">Search Area / Estate</label>
              <input
                required
                type="text"
                value={formData.estate}
                onChange={(e) => setFormData({ ...formData, estate: e.target.value })}
                className="w-full mt-1 bg-white border border-brand-border rounded-lg p-3 text-brand-ink focus:outline-none focus:border-brand-accent"
                placeholder="e.g. Eastleigh Section 3 or South C"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-brand-textMuted font-bold">Specific Landmark</label>
              <input
                required
                type="text"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                className="w-full mt-1 bg-white border border-brand-border rounded-lg p-3 text-brand-ink focus:outline-none focus:border-brand-accent"
                placeholder="e.g. Near Shell Station or Jamia Mosque"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-brand-textMuted font-bold">Building & Floor / Apartment</label>
              <input
                required
                type="text"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                className="w-full mt-1 bg-white border border-brand-border rounded-lg p-3 text-brand-ink focus:outline-none focus:border-brand-accent"
                placeholder="e.g. Al-Noor Plaza, 3rd Floor"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-4 bg-brand-primary text-brand-bg font-black rounded-xl hover:bg-brand-primaryHover transition flex items-center justify-center gap-2 mt-6"
        >
          <span>Continue to Payment</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
