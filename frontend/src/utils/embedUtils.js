/** Resolve external URLs into iframe embeds or in-box launch panels. */

function normalize(url) {
  const v = (url || '').trim()
  if (!v) return ''
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

/** Pull src from pasted iframe HTML if the admin pasted the full embed snippet. */
function unwrapIframeSrc(raw) {
  const m = raw.match(/<iframe[^>]+src=["']([^"']+)["']/i)
  return m ? m[1] : raw
}

/** Official Tinkercad embed: https://www.tinkercad.com/embed/{id}?editbtn=1 */
function tinkercadEmbedSrc(id) {
  return `https://www.tinkercad.com/embed/${id}?editbtn=1`
}

function ensureTinkercadEmbedQuery(src) {
  try {
    const u = new URL(src)
    if (!u.hostname.includes('tinkercad.com') || !u.pathname.includes('/embed/')) {
      return src
    }
    if (!u.searchParams.has('editbtn')) {
      u.searchParams.set('editbtn', '1')
    }
    return u.toString()
  } catch {
    return src
  }
}

function wokwiFromUrl(raw) {
  const project = raw.match(/wokwi\.com\/projects\/([a-zA-Z0-9_-]+)/i)
  if (project) {
    const id = project[1]
    return {
      embedSrc: `https://wokwi.com/projects/${id}/embed`,
      openUrl: `https://wokwi.com/projects/${id}`,
    }
  }

  const legacy = raw.match(/wokwi\.com\/embed\/([a-zA-Z0-9_-]+)/i)
  if (legacy) {
    const id = legacy[1]
    return {
      embedSrc: `https://wokwi.com/projects/${id}/embed`,
      openUrl: `https://wokwi.com/projects/${id}`,
    }
  }

  return null
}

function tinkercadFromUrl(raw) {
  const embed = raw.match(/tinkercad\.com\/embed\/([a-zA-Z0-9_-]+)/i)
  if (embed) {
    const id = embed[1]
    return {
      id,
      embedSrc: ensureTinkercadEmbedQuery(tinkercadEmbedSrc(id)),
      openUrl: `https://www.tinkercad.com/things/${id}`,
    }
  }

  const things = raw.match(/tinkercad\.com\/things\/([a-zA-Z0-9_-]+)/i)
  if (things) {
    const id = things[1]
    return {
      id,
      embedSrc: tinkercadEmbedSrc(id),
      openUrl: `https://www.tinkercad.com/things/${id}`,
    }
  }

  return null
}

export function resolveVideoEmbed(url) {
  const raw = normalize(url)
  if (!raw) return null

  const ytLong = raw.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  )
  if (ytLong) {
    return { mode: 'iframe', src: `https://www.youtube.com/embed/${ytLong[1]}`, openUrl: raw }
  }

  const ytShort = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (ytShort) {
    return { mode: 'iframe', src: `https://www.youtube.com/embed/${ytShort[1]}`, openUrl: raw }
  }

  const vimeo = raw.match(/vimeo\.com\/(\d+)/)
  if (vimeo) {
    return { mode: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}`, openUrl: raw }
  }

  return { mode: 'launch', openUrl: raw, label: 'Open video' }
}

export function resolveSimulationEmbed(url) {
  const raw = normalize(unwrapIframeSrc(url))
  if (!raw) return null

  const wokwi = wokwiFromUrl(raw)
  if (wokwi) {
    return {
      mode: 'iframe',
      src: wokwi.embedSrc,
      openUrl: wokwi.openUrl,
      label: 'Wokwi simulation',
      tryFallback: true,
    }
  }

  const tinkercad = tinkercadFromUrl(raw)
  if (tinkercad) {
    return {
      mode: 'iframe',
      src: ensureTinkercadEmbedQuery(tinkercad.embedSrc),
      openUrl: tinkercad.openUrl,
      label: 'Tinkercad simulation',
      clickToLoad: true,
      hint: 'Click to load. Circuit must be Public in Tinkercad (gear → Properties).',
    }
  }

  if (raw.includes('cirkitdesigner.com')) {
    return {
      mode: 'iframe',
      src: raw,
      openUrl: raw,
      label: 'Cirkit Designer',
      tryFallback: true,
    }
  }

  if (raw.includes('tinkercad.com')) {
    return {
      mode: 'iframe',
      src: ensureTinkercadEmbedQuery(raw),
      openUrl: raw,
      label: 'Tinkercad simulation',
      clickToLoad: true,
      tryFallback: true,
      hint: 'Click to load. Circuit must be Public in Tinkercad.',
    }
  }

  return { mode: 'iframe', src: raw, openUrl: raw, label: 'Simulation', tryFallback: true }
}
