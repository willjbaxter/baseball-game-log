import GamesTable from "@/components/GamesTable";

export const metadata = {
  title: "Games | Baseball Game Log",
};

export default function GamesPage() {
  return (
    <main className="container mx-auto p-6 text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Attended Games</h1>
      <GamesTable games={[]} />
    </main>
  );
} 