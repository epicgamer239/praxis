// src/app/api/civic/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CivicPulse } from "@/lib/fieldConditions";

export const runtime = "edge";

type RepRow = {
  name?: string;
  party?: string;
  state?: string;
  district?: string;
  phone?: string;
  link?: string;
};

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat/lon required" }, { status: 400 });
  }

  const placeUrl =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

  const placeRes = await fetch(placeUrl, { next: { revalidate: 3600 } });
  if (!placeRes.ok) {
    return NextResponse.json(null);
  }

  const geo = (await placeRes.json()) as {
    postcode?: string;
    city?: string;
    locality?: string;
  };
  const zip = (geo.postcode || "").replace(/\D/g, "").slice(0, 5);
  if (zip.length !== 5) {
    return NextResponse.json(null);
  }

  const repUrl = `https://whoismyrepresentative.com/getall_mems.php?zip=${zip}&output=json`;
  const repRes = await fetch(repUrl, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!repRes.ok) {
    return NextResponse.json(null);
  }

  const text = await repRes.text();
  let rows: RepRow[] = [];
  try {
    const parsed = JSON.parse(text) as { results?: RepRow[] };
    rows = parsed.results || [];
  } catch {
    return NextResponse.json(null);
  }

  // Prefer a House member (district present) for CAC / district story.
  const house =
    rows.find((r) => r.district && r.district !== "Senate") || rows[0];
  if (!house?.name) {
    return NextResponse.json(null);
  }

  const pulse: CivicPulse = {
    name: house.name,
    party: house.party || null,
    state: house.state || null,
    district: house.district || null,
    phone: house.phone || null,
    link: house.link || null,
  };

  return NextResponse.json(pulse);
}
