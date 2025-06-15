// Restore the original redirect to default locale
import { redirect } from "next/navigation"

export default function RootPage() {
  // Redirect to the default locale
  redirect("/zh")
}
