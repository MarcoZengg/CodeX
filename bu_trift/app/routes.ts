import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("items/:id", "routes/items.$id.tsx"),
  route("items", "routes/items.tsx"),
  route("sell", "routes/sell.tsx"),
  route("messages", "routes/messages.tsx"),
  route("profile", "routes/profile.tsx"),
  route("register", "routes/register.tsx"),
  route("login", "routes/login.tsx"),
] satisfies RouteConfig;
