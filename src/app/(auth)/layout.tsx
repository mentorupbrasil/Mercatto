export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-mercatto-50/30 px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
