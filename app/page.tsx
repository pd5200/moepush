
import { auth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";

export const runtime = "edge";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-indigo-50">
      <SiteHeader user={session?.user} variant="home" />
    </div>
  );
}
