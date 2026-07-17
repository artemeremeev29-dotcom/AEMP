import { PlayerProvider } from './context/PlayerContext';
import { SpectrumAnalyzer } from './components/SpectrumAnalyzer';
import { Equalizer } from './components/Equalizer';
import { Playlist } from './components/Playlist';
import { TransportControls } from './components/TransportControls';

function AppContent() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-6 shrink-0 bg-card z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-accent text-background flex items-center justify-center font-bold text-xl leading-none">
            V
          </div>
          <h1 className="font-bold tracking-widest text-lg uppercase text-foreground">
            Volt<span className="text-muted-foreground font-light">Player</span>
          </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Visualizer Zone */}
        <div className="shrink-0 h-48 w-full relative z-0">
          <SpectrumAnalyzer />
        </div>

        {/* Panels Layout */}
        <div className="flex-1 flex gap-6 p-6 min-h-0 bg-background/50">
          {/* Left: Playlist */}
          <div className="w-2/3 flex flex-col">
            <Playlist />
          </div>

          {/* Right: Equalizer */}
          <div className="w-1/3 flex flex-col">
            <Equalizer />
          </div>
        </div>
      </main>

      {/* Transport Controls Zone */}
      <footer className="shrink-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <TransportControls />
      </footer>
    </div>
  );
}

function App() {
  return (
    <PlayerProvider>
      <AppContent />
    </PlayerProvider>
  );
}

export default App;
