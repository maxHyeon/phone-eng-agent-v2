interface Props {
  onClick: () => void;
}

export default function VocabSaveButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
      title="표현 저장 (Cmd+Shift+S)"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
