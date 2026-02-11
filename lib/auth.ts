import { redirect } from "next/navigation";

export function requireUser(userId: string | null | undefined) {
  if (!userId) {
    redirect("/login");
  }
}
