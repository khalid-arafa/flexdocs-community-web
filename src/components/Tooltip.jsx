export default function Tooltip({ text, children, className }) {
  return (
    <span className={`group relative inline-block ${className}`}>
      {children}
      <span className="pointer-events-none absolute hidden group-hover:block bg-black text-white text-xs px-2 py-1 rounded -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
        {text}
      </span>
    </span>
  )
}