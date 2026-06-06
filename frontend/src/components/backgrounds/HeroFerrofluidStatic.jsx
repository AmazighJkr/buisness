/** Static hero background when WebGL is unavailable (e.g. Edge with GPU blocked). */
export default function HeroFerrofluidStatic({ isDark }) {
  return (
    <div
      className={`hero-ferrofluid hero-ferrofluid-static ${isDark ? 'hero-ferrofluid-static--dark' : 'hero-ferrofluid-static--light'}`}
      aria-hidden
    />
  )
}
