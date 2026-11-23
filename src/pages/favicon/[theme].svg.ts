import type { APIRoute, GetStaticPaths } from "astro";
import { faviconSvg } from "../../lib/favicon";
import { themes } from "../../lib/themes";

export const getStaticPaths: GetStaticPaths = () =>
  themes.map((theme) => ({ params: { theme: theme.id }, props: { theme } }));

export const GET: APIRoute = ({ props }) =>
  new Response(faviconSvg(props.theme), { headers: { "Content-Type": "image/svg+xml" } });
