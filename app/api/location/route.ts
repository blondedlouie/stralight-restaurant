import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { lat, lng } = await req.json();
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return NextResponse.json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return NextResponse.json({ error: 'Location routing is not configured.' }, { status: 503 });
    const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data, error } = await supabase.rpc('route_customer_order', {
      lat: latitude,
      lng: longitude,
    });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: 'Failed to resolve location' }, { status: 500 });
    }

    const matched = data[0];

    const { data: branchData } = await supabase
      .from('branches')
      .select('id, name, slug, phone_primary, phone_chicken, phone_pizza, has_split_kitchen, address_description')
      .eq('id', matched.branch_id)
      .single();

    return NextResponse.json({
      branch: branchData,
      is_deliverable: matched.is_deliverable,
      distance_meters: matched.distance_meters,
    });
  } catch {
    return NextResponse.json({ error: 'Unable to resolve this delivery location.' }, { status: 500 });
  }
}
