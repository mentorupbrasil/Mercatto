"use client";

import { ChevronDown, LogOut, MapPin, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  userName: string;
  branches?: { id: string; name: string }[];
  currentBranchId?: string;
}

const defaultBranches = [
  { id: "1", name: "Matriz - Centro" },
  { id: "2", name: "Filial - Shopping" },
  { id: "3", name: "Filial - Bairro" },
];

export function Header({
  userName,
  branches = defaultBranches,
  currentBranchId = "1",
}: HeaderProps) {
  const router = useRouter();
  const [branchOpen, setBranchOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(
    branches.find((b) => b.id === currentBranchId) ?? branches[0]
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-16 items-center justify-between px-4 pl-16 lg:pl-6">
        <div className="hidden sm:block">
          <h1 className="text-sm font-medium text-gray-500">Bem-vindo de volta</h1>
          <p className="text-lg font-semibold text-gray-900">{userName}</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setBranchOpen(!branchOpen);
                setUserOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <MapPin className="h-4 w-4 text-mercatto-600" />
              <span className="hidden max-w-[140px] truncate sm:inline">
                {selectedBranch.name}
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-gray-400 transition-transform", branchOpen && "rotate-180")}
              />
            </button>

            {branchOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setBranchOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Filiais
                  </p>
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        setSelectedBranch(branch);
                        setBranchOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50",
                        selectedBranch.id === branch.id
                          ? "font-medium text-mercatto-700"
                          : "text-gray-700"
                      )}
                    >
                      <MapPin className="h-4 w-4 shrink-0" />
                      {branch.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setUserOpen(!userOpen);
                setBranchOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mercatto-100">
                <User className="h-4 w-4 text-mercatto-700" />
              </div>
              <span className="hidden text-sm font-medium text-gray-700 md:inline">
                {userName.split(" ")[0]}
              </span>
              <ChevronDown
                className={cn("hidden h-4 w-4 text-gray-400 md:block", userOpen && "rotate-180")}
              />
            </button>

            {userOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-gray-100 px-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500">Conta ativa</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-start gap-2 rounded-none px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
