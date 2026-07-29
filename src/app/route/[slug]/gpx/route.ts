import { NextResponse } from "next/server";
import { getRouteBySlug } from "@/lib/routes";
import { buildGpxXml } from "@/lib/gpx";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const route = await getRouteBySlug(slug);
  if (!route) {
    return new NextResponse("Route not found", { status: 404 });
  }

  const xml = buildGpxXml(route.name, route.track);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/gpx+xml",
      "Content-Disposition": `attachment; filename="${route.id}.gpx"`,
    },
  });
}
