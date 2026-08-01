"use client";

type WordCardProps = {
  word: string;
  pos: string | null;
  phoneticBangla: string | null;
  banglaMeaning: string;
  exampleEn: string | null;
  exampleBn: string | null;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
};

export default function WordCard({
  word,
  pos,
  phoneticBangla,
  banglaMeaning,
  exampleEn,
  exampleBn,
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

      {exampleEn && (
        <div className="text-sm text-muted mt-2 leading-relaxed">
          <p className="text-ink">{exampleEn}</p>
          <p>{exampleBn}</p>
        </div>
      )}
    </div>
  );
}
