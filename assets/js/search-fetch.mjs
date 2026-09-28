// Pagefind 1.5 catches some chunk failures internally. Keep a separate failure
// signal so an incomplete index can never be reported as a successful search.
export function guardedFetch(fetcher, entry, baseURL) {
  let failure;
  const fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url, baseURL);
    if (url.pathname.endsWith('/pagefind-entry.json')) {
      return new Response(JSON.stringify(entry), {headers:{'Content-Type':'application/json'}});
    }
    try {
      const response = await fetcher(input, options);
      if (!response.ok) throw Error(`Search download failed (${response.status}): ${url.pathname}`);
      return response;
    } catch (error) {
      failure = error;
      throw error;
    }
  };
  return {fetch, assertHealthy() {if (failure) throw failure;}};
}
