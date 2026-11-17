import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid YouTube video ID" }, { status: 400 });
  }

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, {
      next: { revalidate: 86400 }, // Cache server-side for 24h
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(
        {
          videoId,
          title: data.title || "YouTube Video",
          authorName: data.author_name || "YouTube",
          authorUrl: data.author_url || `https://www.youtube.com`,
          thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          providerName: data.provider_name || "YouTube",
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
          },
        }
      );
    }
  } catch (err) {
    console.warn("YouTube oEmbed fetch error for", videoId, err);
  }

  // Graceful fallback
  return NextResponse.json({
    videoId,
    title: "YouTube Video",
    authorName: "YouTube",
    authorUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    providerName: "YouTube",
  });
}
