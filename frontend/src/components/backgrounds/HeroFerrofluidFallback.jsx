/** CSS + static image when WebGL is unavailable (software GPU, privacy mode, etc.). */
export default function HeroFerrofluidFallback({ isDark }) {
  return (
    <div
      className={`hero-ferrofluid-fallback ${isDark ? 'hero-ferrofluid-fallback--dark' : 'hero-ferrofluid-fallback--light'}`}
      aria-hidden
    />
  )
}
