export default {
  async fetch(request, env) {
    const upstream = env.UPSTREAM_ORIGIN;
    if (!upstream) {
      return new Response("Missing UPSTREAM_ORIGIN", { status: 500 });
    }

    const upstreamUrl = new URL(upstream);
    const url = new URL(request.url);
    url.protocol = upstreamUrl.protocol;
    url.host = upstreamUrl.host;

    // Proxy the request to the upstream PHP app
    const proxiedRequest = new Request(url.toString(), request);
    const response = await fetch(proxiedRequest);
    return response;
  },
};
