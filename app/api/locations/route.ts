import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const branches = [
  { id: "eastleigh-jam", name: "Eastleigh Jam", region: "Eastleigh", address_description: "Jam Street, Eastleigh", latitude: -1.2758, longitude: 36.8524, phone_chicken: "0726744444", phone_pizza: "0720456789", delivery_radius_km: 3, covered_estates: ["Eastleigh", "Pangani", "California", "Majengo"] },
  { id: "eastleigh-4th-street", name: "Eastleigh 4th Street", region: "Eastleigh", address_description: "4th Street, Eastleigh", latitude: -1.2742, longitude: 36.8501, phone_chicken: "0720411111", phone_pizza: null, delivery_radius_km: 3, covered_estates: ["Eastleigh", "Pangani", "California", "Majengo"] },
  { id: "eastleigh-donbosco", name: "Eastleigh Donbosco", region: "Eastleigh", address_description: "Near Don Bosco Centre, Eastleigh", latitude: -1.273, longitude: 36.855, phone_chicken: "0717666622", phone_pizza: null, delivery_radius_km: 3, covered_estates: ["Eastleigh", "Pangani", "California", "Majengo"] },
  { id: "eastleigh-juja-b", name: "Eastleigh Juja B", region: "Eastleigh", address_description: "Juja B Road, Eastleigh", latitude: -1.271, longitude: 36.858, phone_chicken: "0728333366", phone_pizza: "0728999977", delivery_radius_km: 3, covered_estates: ["Eastleigh", "Pangani", "California", "Majengo"] },
  { id: "eastleigh-nova", name: "Eastleigh Nova", region: "Eastleigh", address_description: "Nova Area, Eastleigh", latitude: -1.277, longitude: 36.8533, phone_chicken: "0728999966", phone_pizza: null, delivery_radius_km: 3, covered_estates: ["Eastleigh", "Pangani", "California", "Majengo"] },
  { id: "eastleigh-section-3", name: "Eastleigh Section 3", region: "Eastleigh", address_description: "Section 3, Eastleigh", latitude: -1.279, longitude: 36.856, phone_chicken: "0728333355", phone_pizza: "0116999922", delivery_radius_km: 3, covered_estates: ["Eastleigh", "Pangani", "California", "Majengo"] },
  { id: "eastleigh-6th-street", name: "Eastleigh 6th Street", region: "Eastleigh", address_description: "6th Street, Eastleigh", latitude: -1.2755, longitude: 36.8488, phone_chicken: "0116999933", phone_pizza: null, delivery_radius_km: 3, covered_estates: ["Eastleigh", "Pangani", "California", "Majengo"] },
  { id: "eastleigh-5th", name: "Eastleigh 5th", region: "Eastleigh", address_description: "5th Street, Eastleigh", latitude: -1.276, longitude: 36.8495, phone_chicken: "0142343434", phone_pizza: "0718222277", delivery_radius_km: 3, covered_estates: ["Eastleigh", "Pangani", "California", "Majengo"] },
  { id: "south-c", name: "South C", region: "South C", address_description: "Near Muhoho Avenue, South C", latitude: -1.3204, longitude: 36.8315, phone_chicken: "0704878787", phone_pizza: null, delivery_radius_km: 5, covered_estates: ["South C", "Bellevue", "Popo Road", "Akiba"] },
  { id: "james-gichuru", name: "James Gichuru", region: "Lavington", address_description: "James Gichuru Road, Lavington", latitude: -1.2721, longitude: 36.7712, phone_chicken: "0728449999", phone_pizza: "0717994444", delivery_radius_km: 5, covered_estates: ["Lavington", "Kileleshwa", "Kangemi", "Gitanga Road"] },
  { id: "hurlingham", name: "Hurlingham", region: "Hurlingham", address_description: "Argwings Kodhek Road, Hurlingham", latitude: -1.2952, longitude: 36.7924, phone_chicken: "0142353535", phone_pizza: null, delivery_radius_km: 5, covered_estates: ["Hurlingham", "Kilimani", "Nairobi CBD", "Upper Hill"] },
  { id: "muthangari", name: "Muthangari", region: "Muthangari", address_description: "Muthangari Drive, Nairobi", latitude: -1.2638, longitude: 36.7663, phone_chicken: "0728666663", phone_pizza: "0718244444", delivery_radius_km: 5, covered_estates: ["Muthangari", "Lavington", "Kileleshwa", "Riverside"] },
  { id: "bamburi", name: "Bamburi", region: "Mombasa", address_description: "Bamburi Main Road, Mombasa", latitude: -4.0152, longitude: 39.7145, phone_chicken: "0117000044", phone_pizza: null, delivery_radius_km: 5, covered_estates: ["Bamburi", "Mtwapa", "Shanzu", "Nyali"] },
] as const;

function getIsOpenNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  return hour >= 10 || hour < 2;
}

export async function GET() {
  const isOpen = getIsOpenNow();
  const data = branches.map((branch) => ({
    ...branch,
    isOpen,
    operating_hours: "10:00 AM - 2:00 AM (Africa/Nairobi)",
  }));

  return NextResponse.json(
    { data, count: data.length, timezone: "Africa/Nairobi", operating_hours: "10:00 AM - 2:00 AM" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
