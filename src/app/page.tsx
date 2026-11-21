import { cookies } from "next/headers";
import AccessGate from "@/components/AccessGate";
import Footer from "@/components/Footer";
import Workspace from "@/components/Workspace";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex-1">
        {session ? <Workspace initialEmail={session.email} /> : <AccessGate />}
      </div>
      <Footer />
    </div>
  );
}
