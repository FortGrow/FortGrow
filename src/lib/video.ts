/**
 * Converte URLs do YouTube/Vimeo em URLs de embed canônicas (sem query, para
 * o player poder anexar ?autoplay=1 com segurança); null se não reconhecer.
 */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");

    if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch" && u.searchParams.get("v")) {
        return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
      }
      const seg = u.pathname.split("/").filter(Boolean); // ["embed","<id>"] | ["shorts","<id>"] | ["live","<id>"]
      if (["embed", "shorts", "live"].includes(seg[0]) && seg[1]) {
        return `https://www.youtube.com/embed/${seg[1]}`;
      }
    }
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "player.vimeo.com") {
      const seg = u.pathname.split("/").filter(Boolean); // ["video","<id>"]
      if (seg[0] === "video" && seg[1]) return `https://player.vimeo.com/video/${seg[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

/** Thumbnail automática do YouTube quando o admin não informa uma. */
export function autoThumbnail(videoUrl: string): string | null {
  try {
    const u = new URL(videoUrl);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if ((host === "youtube.com" || host === "music.youtube.com") && u.searchParams.get("v")) {
      id = u.searchParams.get("v");
    } else if (host === "youtu.be") {
      id = u.pathname.split("/").filter(Boolean)[0] ?? null;
    } else {
      const seg = u.pathname.split("/").filter(Boolean);
      if ((host === "youtube.com" || host === "youtube-nocookie.com") && ["embed", "shorts", "live"].includes(seg[0]) && seg[1]) {
        id = seg[1];
      }
    }
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}
