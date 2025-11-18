import { useEffect, useState } from "react";
import type { Route } from "./+types/profile";
import { User, Item } from "@/entities";
import type { User as UserType } from "@/entities/User";
import type { Item as ItemType } from "@/entities/Item";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - BUTrift" },
    { name: "description", content: "View your profile and listings" },
  ];
}

export default function Profile() {
  const [user, setUser] = useState<UserType | null>(null);
  const [items, setItems] = useState<ItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const u = await User.me();
        setUser(u);

        const myItems = await Item.filter(
          { seller_id: u.id! },
          "-created_date"
        );
        setItems(myItems ?? []);
      } catch (e) {
        console.error("Error loading profile:", e);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-40 w-full bg-neutral-100 rounded-xl animate-pulse" />
          <div className="h-64 w-full bg-neutral-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-neutral-50">
        <p className="text-neutral-700">Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile header */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/60 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-red-600 to-red-700" />
          <div className="px-6 pb-6 -mt-10 flex items-end gap-4">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-md">
              <span className="text-2xl font-bold text-red-600">
                {user.display_name?.[0]?.toUpperCase() ||
                  user.email?.[0]?.toUpperCase() ||
                  "B"}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="relative -top-4 text-2xl font-bold text-neutral-900 leading-snug mb-0.5">
                {user.display_name || "BU Student"}
              </h1>
              <p className="relative -top-4 text-sm text-neutral-600 mt-0">
                {user.email || "Verified @bu.edu"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats + listings */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/60 p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="border border-neutral-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-neutral-900">
                {items.length}
              </div>
              <div className="text-sm text-neutral-600 mt-1">
                Items listed
              </div>
            </div>
            <div className="border border-neutral-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-neutral-900">
                {
                  items.filter(
                    (item) => item.status === "available"
                  ).length
                }
              </div>
              <div className="text-sm text-neutral-600 mt-1">
                Active listings
              </div>
            </div>
            <div className="border border-neutral-200 rounded-xl p-4 text-center hidden md:block">
              <div className="text-2xl font-bold text-neutral-900">
                {
                  items.filter((item) => item.status === "sold")
                    .length
                }
              </div>
              <div className="text-sm text-neutral-600 mt-1">
                Sold items
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Your listings
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-neutral-600">
                You have not listed any items yet.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-neutral-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow bg-white"
                  >
                    <div className="h-36 bg-neutral-100 overflow-hidden">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-neutral-900 line-clamp-1">
                          {item.title}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-neutral-200 text-neutral-600">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 line-clamp-2">
                        {item.description}
                      </p>
                      <p className="text-base font-bold text-red-600 mt-1">
                        ${item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reviews placeholder (UI only, no backend calls yet) */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200/60 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">
            Reviews
          </h2>
          <p className="text-sm text-neutral-600">
            Reviews feature coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
