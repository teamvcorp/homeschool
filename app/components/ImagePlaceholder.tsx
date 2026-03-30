interface ImagePlaceholderProps {
  alt: string;
  src?: string;
  className?: string;
  aspectRatio?: string;
}

export default function ImagePlaceholder({
  alt,
  src,
  className = "",
  aspectRatio = "aspect-video",
}: ImagePlaceholderProps) {
  if (src) {
    return (
      <div className={`${aspectRatio} relative overflow-hidden rounded-2xl ${className}`}>
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${aspectRatio} bg-gradient-to-br from-indigo-100 to-sky-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-indigo-200 ${className}`}
    >
      <div className="text-center px-4">
        <svg
          className="w-10 h-10 mx-auto text-indigo-300 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
          />
        </svg>
        <p className="text-xs text-indigo-400 font-medium leading-snug">
          {alt}
        </p>
      </div>
    </div>
  );
}
