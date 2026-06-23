import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:pl-64">
        <Header userName={session.name} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
