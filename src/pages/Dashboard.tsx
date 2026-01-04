

export default function Dashboard() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Festival Plans</h1>
        <p className="text-slate-400">Manage your upcoming trips and schedules.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placeholder for My Trips */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-purple-500/30 transition-colors">
            <h2 className="text-xl font-semibold mb-4 text-white">Upcoming Trips</h2>
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                <p>No trips planned yet.</p>
                <button className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-purple-400 rounded-lg text-sm font-medium transition-colors">
                    + Create new Trip
                </button>
            </div>
        </div>

        {/* Placeholder for Festivals */}
         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-purple-500/30 transition-colors">
            <h2 className="text-xl font-semibold mb-4 text-white">Popular Festivals</h2>
             <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-950/50">
                        <div className="w-12 h-12 bg-slate-800 rounded-lg"></div>
                        <div>
                            <div className="h-4 w-32 bg-slate-800 rounded mb-2"></div>
                             <div className="h-3 w-20 bg-slate-800 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
