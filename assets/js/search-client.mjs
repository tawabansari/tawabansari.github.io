export class SearchClient {
  constructor(lang, {fetcher=globalThis.fetch.bind(globalThis), workerFactory=url=>new Worker(url,{type:'module'}), timeout=30000} = {}) {
    Object.assign(this,{lang,fetcher,workerFactory,timeout});
    this.pending = new Map();
    this.nextId = 0;
  }
  async json(url) {
    const response = await this.fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(this.timeout)});
    if (!response.ok) throw Error('Search data could not load');
    return response.json();
  }
  reset() {
    this.worker?.terminate();
    this.worker = null;
    this.version = null;
    for (const task of this.pending.values()) {clearTimeout(task.timer);task.reject(Error('Search restarted'));}
    this.pending.clear();
  }
  request(method,args) {
    return new Promise((resolve,reject)=>{
      const id = ++this.nextId;
      const timer = setTimeout(()=>{this.pending.delete(id);reject(Error('Search timed out'));},this.timeout);
      this.pending.set(id,{resolve,reject,timer});
      this.worker.postMessage({id,method,args});
    });
  }
  async refresh(force=false) {
    // A long-lived tab must check again after a deployment, not just at startup.
    const version = await this.json('/assets/data/search-version.json?t='+Date.now());
    if (!force && this.worker && this.version === version.version) return;
    this.reset();
    const catalog = await this.json(version.catalogs[this.lang]);
    if (catalog.version !== version.version) throw Error('Search versions do not match');
    this.catalog = catalog;
    const url = new URL('./search-worker.js',import.meta.url);
    url.searchParams.set('v',version.version);
    this.worker = this.workerFactory(url);
    this.worker.onmessage = ({data}) => {
      const task = this.pending.get(data.id);if (!task) return;
      clearTimeout(task.timer);this.pending.delete(data.id);
      if (data.error) task.reject(Error(data.error));else task.resolve(data.value);
    };
    this.worker.onerror = () => this.reset();
    await this.request('init',{lang:this.lang,entry:catalog.entry});
    this.version = version.version;
  }
  search(query,options={}) {
    this.queue = (this.queue || Promise.resolve()).catch(()=>{}).then(()=>this.runSearch(query,options));
    return this.queue;
  }
  async runSearch(query,options={}) {
    // One fresh worker retry also clears failures cached inside Pagefind.
    for (let attempt=0;attempt<2;attempt++) {
      try {await this.refresh(Boolean(attempt));return await this.request('search',{query,options});}
      catch(error) {this.reset();if (attempt) throw error;}
    }
  }
  records(ids) {return this.request('records',ids);}
}
