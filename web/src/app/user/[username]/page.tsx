import UserClientPage from "./UserClientPage";

// Implement generateStaticParams to satisfy Next.js static export compilation
// Returns a default fallback slug during the static build, while letting client-side 
// dynamic route resolving handle any loaded profiles inside the Capacitor web app.
export async function generateStaticParams() {
  return [
    { username: "user" }
  ];
}

export default function Page() {
  return <UserClientPage />;
}
