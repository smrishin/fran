import { cookies } from "next/headers";
import { AccessGate } from "../components/AccessGate";
import { TripDashboard } from "../components/TripDashboard";
import { ACCESS_COOKIE_NAME, verifyAccessToken } from "../lib/access";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const unlocked = await verifyAccessToken(cookieStore.get(ACCESS_COOKIE_NAME)?.value);
  return unlocked ? <TripDashboard /> : <AccessGate />;
}
