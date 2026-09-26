// The Say It Once logo from the original app: a speech bubble with an orange
// dot. `colour` is the bubble's outline: white on the navy header, navy on
// light backgrounds. It is decoration; the name beside it is the text.
export function Logo({ colour = '#ffffff', className }: { colour?: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 240" aria-hidden="true" focusable="false">
      <path
        d="M20 16 h176 a28 28 0 0 1 28 28 v92 a28 28 0 0 1 -28 28 h-92 l-40 40 v-40 h-36 a28 28 0 0 1 -28 -28 v-92 a28 28 0 0 1 28 -28 z"
        fill="none"
        stroke={colour}
        strokeWidth="20"
        strokeLinejoin="round"
      />
      <circle cx="108" cy="86" r="16" fill="#e8714a" />
    </svg>
  );
}
