import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Nav } from "./Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const location = await prisma.location.findUnique({
    where: { id: user.locationId },
    select: { name: true },
  });

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Nav
        user={{
          name: user.name,
          role: user.role,
          locationName: location?.name ?? "-",
        }}
      />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
