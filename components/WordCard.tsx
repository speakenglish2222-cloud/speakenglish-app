"use client";

type Example = {
  example_en: string;
  example_bn: string;
};

type WordCardProps = {
  word: string;
  pos: string | null;
  phoneticBangla: string | null;
  banglaMeaning: string;
  examples: Example[];
  isBookmarked: boolean;
  onToggleBookmark: () => void;
};

export default function WordCard({
  word,
  pos,
  phoneticBangla,
  banglaMeaning,
  examples,
  isBookmarked,
  onToggleBookmark,
}: WordCardProps) {
  function speak(text: string) {
    if (typeof window === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="bg-white rounded-card p-5 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-lg font-bold text-brand">{word}</span>
          {pos && <span className="text-xs text-muted ml-2">{pos}</span>}
          <button
            onClick={() => speak(word)}
            className="block text-sm text-muted mt-1"
          >
            🔊 {phoneticBangla}
          </button>
        </div>
        <button onClick={onToggleBookmark} className="text-xl">
          {isBookmarked ? "🔖" : "📑"}
        </button>
      </div>

      <p className="font-semibold mt-3">{banglaMeaning}</p>

      {examples.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {examples.map((ex, i) => (
            <div key={i} className="flex items-start gap-2">
              <button
                onClick={() => speak(ex.example_en)}
                className="text-brand text-sm mt-0.5"
              >
                🔊
              </button>
              <div className="text-sm">
                <p className="text-ink">{ex.example_en}</p>
                <p className="text-muted">{ex.example_bn}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
