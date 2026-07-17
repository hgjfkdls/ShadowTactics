import { l } from '@shared/i18n';

type Props = {
  progress: { loaded: number; total: number } | null;
};

export function LoadingScreen({ progress }: Props) {
  const pct = progress ? Math.round((progress.loaded / progress.total) * 100) : 0;
  const barW = progress ? Math.round((progress.loaded / progress.total) * 200) : 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        backgroundImage: `url(/icons/img/fondos/fondo1.webp)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 text-3xl font-bold text-white mb-8 drop-shadow-lg">
        Shadow Tactics
      </div>

      <div className="relative z-10 w-[200px] h-2 bg-white/30 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-300"
          style={{ width: `${barW}px` }}
        />
      </div>

      <div className="relative z-10 text-sm text-white/80 drop-shadow">
        {progress
          ? `${l('assets.loading')} ${progress.loaded}/${progress.total} (${pct}%)`
          : l('assets.preparing')}
      </div>
    </div>
  );
}
