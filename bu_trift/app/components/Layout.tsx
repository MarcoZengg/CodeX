import { Link, useLocation } from "react-router";
import { createPageUrl } from "@/utils";
import { Home, Search, Plus, User, MessageCircle } from "lucide-react";

const navigationItems = [
  {
    title: "Marketplace",
    url: createPageUrl("Home"),
    icon: Home,
  },
  {
    title: "Browse",
    url: createPageUrl("Browse"),
    icon: Search,
  },
  {
    title: "Sell Item",
    url: createPageUrl("Sell"),
    icon: Plus,
  },
  {
    title: "Messages",
    url: createPageUrl("Messages"),
    icon: MessageCircle,
  },
  {
    title: "My Profile",
    url: createPageUrl("Profile"),
    icon: User,
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-neutral-50 to-white">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-neutral-200/60 bg-white/80 backdrop-blur-md flex-col">
        <div className="border-b border-neutral-200/60 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">BU</span>
            </div>
            <div>
              <h2 className="font-bold text-xl text-neutral-900 tracking-tight">BUTrift</h2>
              <p className="text-sm text-neutral-600 font-medium">Campus Marketplace</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center gap-3 rounded-xl py-3 px-4 transition-all duration-300 ${
                  location.pathname === item.url
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
                    : 'text-neutral-700 hover:bg-red-50 hover:text-red-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-semibold">{item.title}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t border-neutral-200/60 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center border-2 border-red-300/20">
              <User className="w-5 h-5 text-red-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900 text-sm truncate">BU Student</p>
              <p className="text-xs text-neutral-600 truncate">Verified @bu.edu</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="bg-white/90 backdrop-blur-md border-b border-neutral-200/60 px-6 py-4 md:hidden">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BU</span>
              </div>
              <h1 className="text-lg font-bold text-neutral-900">BUTrift</h1>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

