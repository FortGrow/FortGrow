/** Converte URLs do YouTube/Vimeo em URLs de embed; retorna null se não reconhecer. */
export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch" && u.searchParams.get("v")) {
        return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
      }
      if (u.pathname.startsWith("/embed/")) return url;
      if (u.pathname.startsWith("/shorts/")) {
        return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
      }
    }
    if (host === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    if (host === "player.vimeo.com") return url;
    return null;
  } catch {
    return null;
  }
}

/** Thumbnail automática do YouTube quando o admin não informa uma. */
export function autoThumbnail(videoUrl: string): string | null {
  try {
    const u = new URL(videoUrl);
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtube.com" && u.searchParams.get("v")) id = u.searchParams.get("v");
    if (host === "youtu.be") id = u.pathname.slice(1);
    if (host === "youtube.com" && u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}
